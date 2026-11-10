const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {stripShadow,styleRules}=require('./build-flat-effects.cjs');
assert.equal(stripShadow('drop-shadow(0 0 3px rgba(1, 2, 3, .5))'),'none');
assert.equal(stripShadow('grayscale(100%) drop-shadow(0 0 3px rgba(1, 2, 3, .5)) brightness(.6)'), 'grayscale(100%)  brightness(.6)');
assert.equal(stripShadow('grayscale(100%)'),'grayscale(100%)');
const parsed=[...styleRules('@media (max-width:600px) {.a {color:red;}} @keyframes pulse {0% {opacity:0;} 100% {opacity:1;}}')];
assert.equal(parsed.length,1);assert.deepEqual(parsed[0].wrappers,['@media (max-width:600px)']);
const folder=path.resolve(__dirname,'../ui/mods/dynastiya.flat_effects');
for(const file of fs.readdirSync(folder).filter(f=>f.endsWith('.css'))){
 const css=fs.readFileSync(path.join(folder,file),'utf8');
 assert(!/border-image|border-width|\b(?:width|height|margin|padding)\s*:/.test(css),file+' changes geometry or PNG frames');
 assert(!/drop-shadow\(/.test(css),file+' retains a drop shadow');
}
console.log('Flat effects: filter composition, media scope and unchanged geometry/PNG frames passed.');

// Loading styles must not wait on an inventory fetch, duplicate links on a
// repeated script load, or rescan all sheets when unrelated scripts are added.
const vm = require('node:vm');
const links = [{tagName:'LINK', href:'bundle://boot/boot.css'}];
const added = [];
let observe, scans = 0;
const head = {
 querySelectorAll() { scans++; return links.concat(added); },
 appendChild(node) { added.push(node); }
};
const ctx = vm.createContext({window:{}, document:{head, documentElement:{}, querySelectorAll:head.querySelectorAll, createElement:()=>({tagName:'LINK'})},
 MutationObserver:function(callback) { observe = callback; this.observe = () => {}; }
});
const loader = fs.readFileSync(path.join(folder,'main.js'),'utf8');
vm.runInContext(loader,ctx);
assert.equal(added.length,2,'boot bundle installs its two overrides immediately');
vm.runInContext(loader,ctx);
assert.equal(added.length,2,'loading the same script twice must be harmless');
observe([{type:'childList', addedNodes:[{tagName:'SCRIPT'}]}]);
assert.equal(scans,1,'unrelated head changes must not rescan the head');
const scene = {tagName:'LINK',href:'coui://ui/main/game/start/start.css?v=1#test'};
observe([{type:'childList',addedNodes:[scene]}]);
assert.equal(added.length,3,'late scene stylesheet gets its override');
observe([{type:'attributes',target:scene}]);
assert.equal(added.length,3,'href notification must not duplicate a loaded override');
const nested = {querySelectorAll:()=>[{tagName:'LINK',href:'coui://ui/mods/dynastiya.map_generator/map_generator.css'}]};
observe([{type:'childList',addedNodes:[nested]}]);
assert.equal(added.length,4,'styles inside an added subtree are handled');
console.log('Style resources: immediate boot, repeated load, late/nested/href links and incremental scanning passed.');
