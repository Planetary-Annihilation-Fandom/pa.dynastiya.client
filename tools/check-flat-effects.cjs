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
