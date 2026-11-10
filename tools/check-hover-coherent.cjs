// Run in an isolated live match with the pointer off units. Exercises the stock
// hover handler and real native dock; restores the hidden hover state afterwards.
const assert = require('node:assert/strict');
const path = require('node:path');
const cdp = require(path.resolve(__dirname, '../../../../docs/En/Modding/Debug/cdp.js'));
const port = Number(process.argv[2] || 9881);
const hover = 'live_game/live_game_world_popup.html';
const game = 'live_game/live_game.html';
async function read(target, body) {
    await cdp.sleep(100);
    const result = await cdp.evaluate(port, target, body);
    if (result.startsWith('THROW:')) throw Error(result);
    return JSON.parse(result);
}
function payload(health) {
    return JSON.stringify({entity:987654,spec_id:'/pa/units/land/vehicle_factory/vehicle_factory.json',
        display_name:'Vehicle Factory',health:{current:health,max:100}});
}
async function main() {
    assert.equal(await read(game, 'return model.hasWorldHoverTarget();'), false, 'Pointer must be off units during this check');
    assert.equal(await read(hover, 'return model.hasWorldHoverTarget();'), false);
    try {
        await read(hover, `handlers.hover(${payload(1)});return true;`);
        await read(game, 'model.hasWorldHoverTarget(true);return true;');
        await cdp.sleep(100);
        await cdp.waitFor(port, hover, 'return !api.Panel.dockPresentation.pending;', 10, 100);
        const baseline = await read(hover, 'return {revision:api.Panel.dockPresentation.revision,width:document.body.offsetWidth,height:document.body.offsetHeight};');
        for (const health of [9,10,11,19,55,88,89,99,100]) {
            const result = await read(hover, `handlers.hover(${payload(health)});return {
                revision:api.Panel.dockPresentation.revision,width:document.body.offsetWidth,height:document.body.offsetHeight,
                percent:model.worldHoverTarget().healthPercentString(),hidden:document.documentElement.hasAttribute('data-dynastiya-dock-pending')};`);
            assert.equal(result.percent, health+'%');
            assert.equal(result.revision, baseline.revision, 'Progress must not restart the presentation gate');
            assert.equal(result.hidden, false);
        }
        // Also exercise geometry changes (long names, extra production rows),
        // rather than relying on one percentage column retaining its width.
        const result = await read(hover, `var el=document.createElement('div');
            el.id='dynastiya-hover-resize-check';el.style.height='30px';
            document.body.appendChild(el);api.Panel.onBodyResize();
            return {revision:api.Panel.dockPresentation.revision,hidden:document.documentElement.hasAttribute('data-dynastiya-dock-pending')};`);
        assert.equal(result.revision,baseline.revision);
        assert.equal(result.hidden,false,'Actual geometry changes must not blank the hover panel');
        const switched = await read(hover, `var data=${payload(42)};data.entity=987655;
            handlers.hover(data);return {revision:api.Panel.dockPresentation.revision,
                entity:model.worldHoverTarget().entity(),percent:model.worldHoverTarget().healthPercentString(),
                hidden:document.documentElement.hasAttribute('data-dynastiya-dock-pending')};`);
        assert.ok(switched.revision>baseline.revision,'same-name entity change starts a new presentation');
        assert.equal(switched.entity,987655);
        assert.equal(switched.percent,'42%');
        assert.equal(switched.hidden,true,'old native texture stays concealed while new content is prepared');
        await cdp.waitFor(port,hover,'return !api.Panel.dockPresentation.pending;',10,100);
        console.log('Factory hover: continuous progress/geometry updates and concealed same-name entity replacement passed');
    } finally {
        await read(hover, "var el=document.getElementById('dynastiya-hover-resize-check');if(el)el.parentNode.removeChild(el);return true;");
        await read(hover, 'handlers.hover({});return true;');
        await read(game, 'model.hasWorldHoverTarget(false);return true;');
    }
}
main().catch(error => {console.error(error);process.exitCode=1;});
