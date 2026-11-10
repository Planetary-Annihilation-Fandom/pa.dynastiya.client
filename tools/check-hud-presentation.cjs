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
win.innerWidth=300;win.innerHeight=180;events.resize();frame();
assert.ok(panel.dockPresentation.pending,'wait for a complete frame at the applied viewport');
frame();assert.equal(panel.dockPresentation.pending,false);assert.equal(attrs.size,0);
const stale=begin(400,200),current=begin(500,240);frame();frame();
assert.equal(reported.at(-1).revision,current.revision,'only latest layout is reported');
panel.onDockApplied(stale);frame();assert.ok(panel.dockPresentation.pending);
win.innerWidth=500;win.innerHeight=240;thumbnail.complete=false;
panel.onDockApplied(current);frame();assert.ok(panel.dockPresentation.pending,'do not reveal partly loaded thumbnails');
thumbnail.complete=true;events.load();frame();frame();assert.equal(panel.dockPresentation.pending,false);
begin(600,300);unload();frame();assert.equal(frames.size,0,'unload cancels pending frames');
assert.deepEqual(Object.keys(events),[]);
console.log('HUD presentation: clear-before-resize, viewport acknowledgement, complete frames/images, stale revisions and cleanup passed');
