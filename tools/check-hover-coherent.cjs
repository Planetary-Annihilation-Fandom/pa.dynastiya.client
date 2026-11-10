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
            assert.equal(result.width, baseline.width, 'Progress must not resize the dock');
            assert.equal(result.height, baseline.height);
            assert.equal(result.percent, health+'%');
            assert.equal(result.revision, baseline.revision, 'Progress must not restart the presentation gate');
            assert.equal(result.hidden, false);
        }
        console.log('Factory hover: 1–100% updates preserve dock dimensions and do not conceal/reprepare the panel');
    } finally {
        await read(hover, 'handlers.hover({});return true;');
        await read(game, 'model.hasWorldHoverTarget(false);return true;');
    }
}
main().catch(error => {console.error(error);process.exitCode=1;});
