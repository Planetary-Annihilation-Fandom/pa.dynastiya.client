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
