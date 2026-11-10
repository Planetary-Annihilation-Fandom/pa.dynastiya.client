// Regenerate audited, scene-scoped overrides from the installed PA 124685 UI.
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const stock = process.argv[2] || 'C:/workroot/software/steam/steamapps/common/Planetary Annihilation Titans/media/ui';
const output = path.join(root, 'ui/mods/dynastiya.flat_effects');
fs.mkdirSync(output, {recursive:true});
for (const file of fs.readdirSync(output).filter(f => f.endsWith('.css') && f !== 'global.css')) {
    if (fs.readFileSync(path.join(output,file),'utf8').startsWith('/* Generated from ')) fs.unlinkSync(path.join(output,file));
}
const inventory = [];
const boot = fs.readFileSync(path.join(stock,'boot.json'),'utf8');
const bundled = JSON.parse(boot.match(/"css"\s*:\s*(\[[\s\S]*?\])/)[1]).map(p => p.replace(/^\/ui\//,''));
function walk(dir) { return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e => e.isDirectory() ? walk(path.join(dir,e.name)) : [path.join(dir,e.name)]); }
function stripShadow(value) {
    // Balanced functions preserve adjacent grayscale/hue/brightness operations.
    return value.replace(/drop-shadow\(/gi, '\x01(').replace(/\x01\((?:[^()]|\([^()]*\))*\)/g, '').trim() || 'none';
}
function* styleRules(source, wrappers = []) {
    let cursor = 0;
    while (cursor < source.length) {
        const open = source.indexOf('{',cursor);
        if (open < 0) return;
        const selector = source.slice(cursor,open).trim();
        let depth = 1, close = open+1;
        for (;close < source.length && depth;close++) {
            if (source[close] === '{') depth++;
            if (source[close] === '}') depth--;
        }
        if (depth) throw Error('Unbalanced CSS');
        const body = source.slice(open+1,close-1);
        if (/^@(media|supports)\b/.test(selector)) yield* styleRules(body,wrappers.concat(selector));
        else if (!selector.startsWith('@')) yield {selector,body,wrappers};
        cursor = close;
    }
}
const modUi = path.join(root,'ui');
const files = walk(stock).concat(walk(path.join(modUi,'mods')).filter(f => !f.startsWith(output)));
for (const file of files.filter(f => f.endsWith('.css'))) {
    const source = fs.readFileSync(file,'utf8').replace(/\/\*[\s\S]*?\*\//g,'');
    const rules = [];
    for (const {selector,body,wrappers} of styleRules(source)) {
        const changes = [];
        for (const declaration of body.split(';')) {
            const colon = declaration.indexOf(':');
            if (colon < 0) continue;
            const prop = declaration.slice(0,colon).trim(), value = declaration.slice(colon+1).trim().replace(/\s*!important\s*$/,'');
            if (/^(?:-webkit-)?(?:box|text)-shadow$/.test(prop) && /!important/.test(declaration) && value !== 'none') changes.push(prop+': none !important');
            if (/^(?:-webkit-)?filter$/.test(prop) && /drop-shadow\(/.test(value)) changes.push(prop+': '+stripShadow(value)+' !important');
            if (/^background(?:-image)?$/.test(prop) && /radial-gradient/.test(value)) {
                const color = value.match(/rgba?\([^)]*\)|#[\da-f]+/i);
                if (prop === 'background-image') changes.push('background-image: none !important');
                else if (/background-clip\s*:\s*text/.test(body)) changes.push('background: none !important', '-webkit-text-fill-color: currentColor !important');
                else changes.push('background: '+(color ? color[0] : 'transparent')+' !important');
            }
        }
        if (/animation[^;]*:[^;]*infinite/.test(body) || /animation-name\s*:\s*(?:animated_flash|chat-alert|uberbar_notification)/.test(body)) {
            changes.push('-webkit-animation: none !important', 'animation: none !important');
            if (/opacity\s*:/.test(body)) changes.push('opacity: 1 !important');
        }
        if (changes.length) {
            let rule = selector+' {\n    '+[...new Set(changes)].join(';\n    ')+';\n}';
            for (const wrapper of wrappers.toReversed()) rule = wrapper+' {\n'+rule+'\n}';
            rules.push(rule);
        }
    }
    if (!rules.length) continue;
    const relative = path.relative(file.startsWith(modUi) ? modUi : stock,file).replaceAll('\\','/');
    const name = relative.replaceAll('/','__');
    fs.writeFileSync(path.join(output,name), '/* Generated from '+relative+'; run tools/build-flat-effects.cjs. */\n'+rules.join('\n\n')+'\n');
    inventory.push({source:relative, override:name, bundled:bundled.includes(relative), rules:rules.length});
}
fs.writeFileSync(path.join(output,'inventory.json'), JSON.stringify(inventory,null,2)+'\n');
const loader = path.join(output, 'main.js');
const source = fs.readFileSync(loader, 'utf8');
const marker = /\/\* resource-index:start \*\/[\s\S]*?\/\* resource-index:end \*\//;
if (!marker.test(source)) throw Error('Missing resource index marker in flat effects loader');
const runtimeInventory = inventory.map(entry => [entry.source, entry.override, entry.bundled ? 1 : 0]);
fs.writeFileSync(loader, source.replace(marker, '/* resource-index:start */\n    var inventory = '+JSON.stringify(runtimeInventory)+';\n    /* resource-index:end */'));
console.log(JSON.stringify(inventory,null,2));
module.exports = {stripShadow,styleRules};
