const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const frames = new Map(), events = {}, attrs = new Set();
let serial = 0, unload, reported = [];
const thumbnail = {offsetWidth:40,offsetHeight:40,complete:true,getAttribute:()=> 'unit.png'};
const body = {offsetWidth:300,offsetHeight:180,querySelectorAll: selector => selector==='img' ? [thumbnail] : []};
const win = {innerWidth:100,innerHeight:100,
    requestAnimationFrame(fn) {frames.set(++serial,fn);return serial;},
    cancelAnimationFrame(id) {frames.delete(id);},
    addEventListener(name,fn) {events[name]=fn;},removeEventListener(name) {delete events[name];}};
const root = {setAttribute: name=>attrs.add(name),removeAttribute:name=>attrs.delete(name)};
const document = {documentElement:root,body,head:{appendChild() {}},createElement:()=>({}),
    getElementsByTagName:()=>[body],addEventListener:(name,fn)=>{events[name]=fn;},removeEventListener:name=>{delete events[name];}};
const panel = {pageId:2,parentId:1,onBodyResize() {}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../ui/mods/dynastiya.panel_lifecycle/presentation.js'),'utf8'), {
    api:{Panel:panel},window:win,document,getComputedStyle:()=>({borderImageSource:'none',backgroundImage:'none'}),
    Image:class {},$:()=>({on:(name,fn)=>{unload=fn;}})
});
function frame() {const pending=[...frames];frames.clear();pending.forEach(([,fn])=>fn());}
function begin(width,height) {const payload={width,height};panel.prepareDock(payload,()=>reported.push(payload));return payload;}
assert.ok(attrs.size,'initial intermediate document is concealed');
const first=begin(300,180);
frame();assert.equal(reported.length,0,'clear frame commits before resize is sent');
frame();assert.equal(reported.length,1);
panel.flushDock();assert.equal(reported.length,2,'ready can recover a resize reported before filters were registered');
panel.onDockApplied({revision:0,width:100,height:100});frame();assert.ok(panel.dockPresentation.pending);
panel.onDockApplied({...first});frame();assert.ok(panel.dockPresentation.pending,'old viewport cannot reveal new layout');
const stale=begin(400,200),current=begin(500,240);frame();frame();
assert.equal(reported.at(-1).revision,current.revision,'only latest layout is reported');
panel.onDockApplied(stale);frame();assert.ok(panel.dockPresentation.pending);
win.innerWidth=500;win.innerHeight=240;thumbnail.complete=false;
panel.onDockApplied(current);frame();assert.ok(panel.dockPresentation.pending,'do not reveal partly loaded thumbnails');
thumbnail.complete=true;events.load();frame();frame();assert.equal(panel.dockPresentation.pending,false);
const revision=panel.dockPresentation.revision;
const count=reported.length;
thumbnail.complete=false;
begin(600,300);
assert.equal(reported.length,count+1,'live resize is reported synchronously');
assert.equal(panel.dockPresentation.revision,revision,'live resize does not restart presentation');
assert.equal(attrs.size,0,'live updates stay visible even while a new image loads');
assert.equal(frames.size,0,'live updates do not schedule presentation frames');
panel.onBodyResize = force => { if (force) begin(win.innerWidth,win.innerHeight); };
thumbnail.complete=true;
const presentation=panel.dockPresentation;
let applied=0;
function apply() { applied++; }
presentation.present({},apply,0);
assert.equal(applied,1);
assert.equal(attrs.size,1,'new key conceals even equal-size content');
const keyedRevision=presentation.revision;
presentation.present({},apply,0);
assert.equal(presentation.revision,keyedRevision,'same key updates pending content without restarting');
frame();frame();panel.onDockApplied(reported.at(-1));frame();frame();
assert.equal(presentation.pending,false);
presentation.present({},apply,'');
const newer=presentation.revision;
panel.onDockApplied({revision:keyedRevision,width:500,height:240});frame();
assert.equal(presentation.pending,true,'stale content acknowledgement cannot reveal the next key');
presentation.present({},apply);
assert.ok(presentation.revision>newer,'omitted key always rebuilds');
const unkeyed=presentation.revision;
presentation.present({},apply);
assert.ok(presentation.revision>unkeyed,'repeated omission still rebuilds');
assert.equal(attrs.size,1);
unload();frame();assert.equal(frames.size,0,'unload cancels pending frames');
assert.deepEqual(Object.keys(events),[]);
console.log('HUD presentation: initial viewport/resources handshake, stale revisions, immediate visible live updates and cleanup passed');
