// Run in an isolated live match. Exercise shared docking and actual HUD owners.
const assert = require('node:assert/strict');
const path = require('node:path');
const cdp = require(path.resolve(__dirname, '../../../../docs/En/Modding/Debug/cdp.js'));
const port = Number(process.argv[2] || 9881);
const scenes = {
    control_group_bar: `var saved=model.hoverIndex();model.hoverIndex(i%3);model.hoverIndex(saved);`,
    build_hover: `var saved=model.state();model.state({name:'Hover '+i,desc:'Description '+i});model.state(saved);`,
    players: `var saved=model.pinPlayerListPanel();model.togglePinPlayerListPanel();model.togglePinPlayerListPanel();model.pinPlayerListPanel(saved);`,
    planets: `var pin=model.pinCelestialViewModels(),ever=model.everToggledCelestialViewModels();
        model.togglePinCelestialViewModels();model.togglePinCelestialViewModels();
        model.pinCelestialViewModels(pin);model.everToggledCelestialViewModels(ever);`,
};
async function read(target, body) {
    await cdp.sleep(250);
    const result = await cdp.evaluate(port, target, body);
    if (result.startsWith('THROW:')) throw Error(result);
    return JSON.parse(result);
}
async function main() {
    for (const [scene, exercise] of Object.entries(scenes)) {
        const target = `live_game/live_game_${scene}.html`;
        await cdp.waitFor(port,target,'return api.Panel.dockPresentation && !api.Panel.dockPresentation.pending;',15,200);
        const result = await read(target, `var root=document.documentElement,p=api.Panel.dockPresentation;
            var hidden=0,applied=0,revision=p.revision;
            var observer=new MutationObserver(function(records){hidden+=records.length;});
            observer.observe(root,{attributes:true,attributeFilter:['data-dynastiya-dock-pending']});
            try {
                for(var i=0;i<20;i++) {
                    ${exercise}
                    applied++;
                    if(root.hasAttribute('data-dynastiya-dock-pending') || getComputedStyle(root).opacity==='0') hidden++;
                }
                hidden+=observer.takeRecords().length;
                return [hidden,applied,p.pending,p.revision===revision];
            } finally {observer.disconnect();}`);
        assert.deepEqual(result,[0,20,false,true],scene+' must never conceal a live view');
        console.log(scene+': repeated structural/owner changes stay visible without pending frames');
    }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
