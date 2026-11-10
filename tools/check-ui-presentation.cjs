// Local sections must keep input/live updates visible and discard stale reveals.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const media=process.argv[2];
const ko=require(path.join(media,'ui/main/shared/js/thirdparty/knockout-3.5.1.debug.js'));
const folder=path.join(__dirname,'../ui/mods/dynastiya.panel_lifecycle');
const frames=new Map(),attrs=new Set(),events={};let serial=0,scans=0;
const img={complete:false,getAttribute:()=> 'unit.png'};
const element={offsetWidth:300,offsetHeight:100,querySelectorAll:s=>s==='img'?[img]:[],
 setAttribute:n=>attrs.add(n),removeAttribute:n=>attrs.delete(n),
 addEventListener:(n,f)=>events[n]=f,removeEventListener:n=>delete events[n]};
const api={Panel:{onBodyResize(){}}};
const window={requestAnimationFrame(fn){frames.set(++serial,fn);return serial;},cancelAnimationFrame:id=>frames.delete(id)};
const context={api,window,ko,document:{head:{appendChild(){}},createElement:()=>({})},
 getComputedStyle(){scans++;return {backgroundImage:'none',borderImageSource:'none'};},Image:class{}};
vm.runInNewContext(fs.readFileSync(path.join(folder,'surface.js'),'utf8'),context);
function frame(){const list=[...frames.values()];frames.clear();list.forEach(fn=>fn());}
const local=api.Panel.createPresentation(element);
local.present({},()=>{},0);frame();assert.equal(local.pending,true,'wait for visible image');
img.complete=true;events.load();frame();frame();assert.equal(local.pending,false);
const before=scans,revision=local.revision;
local.present({},()=>{},0);local.update({},()=>{});
assert.equal(local.revision,revision);assert.equal(scans,before,'live updates never scan CSS');assert.equal(attrs.size,0);
local.present({},()=>{},'');frame();local.present({},()=>{});frame();frame();
assert.equal(local.pending,false,'latest generation is revealed');
const mode=ko.observable('first');const dispose=api.Panel.watchPresentation(local,()=>mode());
mode('second');assert.equal(local.pending,true);const pending=local.revision;
mode('second');assert.equal(local.revision,pending);dispose();mode('third');assert.equal(local.revision,pending);
img.complete=false;local.present({},()=>{},'cancel');frame();
local.cancel();const closedScans=scans;img.complete=true;events.load();frame();frame();
assert.equal(local.pending,false);assert.equal(scans,closedScans,'late load cannot resume closed preparation');
assert.equal(attrs.size,0);assert.equal(frames.size,0);
local.present({},()=>{},'cancel');assert.equal(local.pending,true,'same key must prepare after cancellation');
frame();local.cancel();frame();assert.equal(attrs.size,0,'stale reveal frame is cancelled');
local.dispose();frame();assert.equal(attrs.size,0);assert.equal(frames.size,0);assert.deepEqual(Object.keys(events),[]);

// Every shipped HUD script has an explicit policy or a documented live/static
// classification. Execute each key reader against the stock initial state shape.
const policies=fs.readFileSync(path.join(folder,'policies.js'),'utf8');
for(const name of fs.readdirSync(path.join(media,'ui/main/game/live_game')).filter(n=>n.endsWith('.js'))){
 const scene=name.replace('.js','');let registered=false;
 const model={state:ko.observable(scene==='live_game_menu'?[]:{})};
 const ctx={api:{Panel:{dockPresentation:{},watchPresentation(p,read){read();return ()=>{};}}},ko,
  app:{registerWithCoherent(){registered=true;}},window:{location:{pathname:'/main/game/live_game/'+scene+'.html'}},
  $:()=>({on(){}})};
 vm.runInNewContext(policies,ctx);ctx.app.registerWithCoherent(model,{});
 assert.ok(registered,scene+' registers its message handlers');
 assert.ok(model.dynastiyaPresentationPolicy,scene+' has a policy');
}
console.log('Local presentation: keyed/forced rebuilds, images, live input, stale frames, watcher cleanup and HUD policy initialization passed');

// Visibility/hover changes must not invoke whole-view preparation. Actual row
// identity changes still do; the buildbar/selection adapters keep their own gate.
for(const scene of ['control_group_bar','build_hover','players','planets']) {
 let prepared=0;
 const model={hoverIndex:ko.observable(-1),name:ko.observable(''),desc:ko.observable(''),
  showPlayerListPanel:ko.observable(false),showCelestialViewModels:ko.observable(false),
  players:ko.observableArray([]),planets:ko.observableArray([])};
 const ctx={ko,api:{Panel:{dockPresentation:{present(){prepared++;}},watchPresentation:api.Panel.watchPresentation}},
  app:{registerWithCoherent(){}},window:{location:{pathname:'/live_game/live_game_'+scene+'.html'}},$:()=>({on(){}})};
 vm.runInNewContext(policies,ctx);ctx.app.registerWithCoherent(model,{});
 model.hoverIndex(1);model.name('Factory');model.desc('Long description');
 model.showPlayerListPanel(true);model.showCelestialViewModels(true);
 assert.equal(prepared,0,scene+' retains its view during hover/open');
 if(scene==='players'||scene==='planets') {
  model[scene]([{id:1,name:'New row'}]);
  assert.equal(prepared,1,scene+' still prepares actual row replacement');
 }
}

// Lobby server updates must never blank persistent sections. Exercise policy
// installation, not just the presentation primitive with an artificial key.
{
 const nodes=['.armies-wrapper','#system','#game_options','#mod_names','#cheat_info','.div-commander-picker-cont'].map(selector=>({
  selector,id:selector[0]==='#'?selector.slice(1):'',querySelectorAll:()=>[],
  classList:{contains:()=>false},matches(list){return list.split(',').includes(selector);}
 }));
 const attached=[];
 const fakeKo=Object.assign({},ko,{applyBindings(){},contextFor:()=>({}),
  bindingProvider:{instance:{getBindingAccessors:()=>({})}},
  utils:{domNodeDisposal:{addDisposeCallback(){}}}});
 const document={body:{},querySelectorAll:list=>nodes.filter(n=>n.matches(list))};
 const ctx={ko:fakeKo,document,api:{Panel:{
  createPresentation(node){attached.push(node.selector);return {present(){},dispose(){}};},
  watchPresentation:()=>()=>{}
 }},app:{registerWithCoherent(){}},
 window:{location:{pathname:'/main/game/new_game/new_game.html'}},
 MutationObserver:class{observe(){}disconnect(){}},$:()=>({on(){}})};
 vm.runInNewContext(policies,ctx);
 const model={};ctx.app.registerWithCoherent(model,{});fakeKo.applyBindings(model);
 assert.deepEqual(attached,['.div-commander-picker-cont'],'only the overlay receives conceal/reveal behavior');
 console.log('Lobby policy: roster, selected system, settings and mod status remain live; picker prepares locally');
}

// Closing an ancestor must cancel a picker even if its own open flag stays true.
{
 const ownerOpen=ko.observable(true),pickerOpen=ko.observable(false),calls=[];
 const parent={parentElement:null},node={parentElement:parent};
 const fakeKo=Object.assign({},ko,{applyBindings(){},contextFor:()=>({}),
  bindingProvider:{instance:{getBindingAccessors:e=>({visible:()=>e===node?pickerOpen:ownerOpen})}},
  utils:{domNodeDisposal:{addDisposeCallback(){}}}});
 const ctx={ko:fakeKo,document:{body:{},querySelectorAll:()=>[node]},api:{Panel:{
  createPresentation:()=>({present(){calls.push('open');},cancel(){calls.push('close');},dispose(){}})
 }},app:{registerWithCoherent(){}},window:{location:{pathname:'/main/game/new_game/new_game.html'}},
 MutationObserver:class{observe(){}disconnect(){}},$:()=>({on(){},off(){}})};
 vm.runInNewContext(policies,ctx);const model={};ctx.app.registerWithCoherent(model,{});fakeKo.applyBindings(model);
 assert.deepEqual(calls,['close']);pickerOpen(true);ownerOpen(false);ownerOpen(true);pickerOpen(false);
 assert.deepEqual(calls,['close','open','close','open','close']);
}
