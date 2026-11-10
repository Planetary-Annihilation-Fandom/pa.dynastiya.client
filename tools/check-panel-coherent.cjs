// Run in the isolated host lobby with a ready system: node tools/check-panel-coherent.cjs [port]
const assert = require('node:assert/strict');
const path = require('node:path');
const cdp = require(path.resolve(__dirname, '../../../../docs/En/Modding/Debug/cdp.js'));
const port = Number(process.argv[2] || 9881);
const target = 'new_game/new_game.html';
async function read(body) {
    await cdp.sleep(200);
    const value = await cdp.evaluate(port, target, body);
    if (value.startsWith('THROW:')) throw new Error(value);
    return JSON.parse(value);
}
async function main() {
    assert.ok(await read('return api.dynastiyaPanelLifecycle && model.gameSystemReady();'));
    await read(`window.panelCheck={show:model.lobbySystemPreview_show(),opacity:model.lobbySystemPreview_opacity()};
        model.lobbySystemPreview_opacity(false);model.lobbySystemPreview_show(true);return true;`);
    try {
        await cdp.sleep(200);
        await cdp.waitFor(port, target, 'return model.lobbySystemPreview_available();', 10, 100);
        assert.ok(await read(`panelCheck.deck=model.holodeck;panelCheck.id=model.holodeck.id;
            panelCheck.region=JSON.stringify(model.holodeck.region);model.lobbySystemPreview_release();
            return model.holodeck.visible && api.Holodeck.focused===model.holodeck;`));
        assert.ok(await read(`model.lobbySystemPreview_show(false);
            return !model.holodeck.visible && !model.lobbySystemPreview_active();`));
        assert.ok(await read(`model.lobbySystemPreview_show(true);model.lobbySystemPreview_release();
            return model.holodeck===panelCheck.deck && model.holodeck.id===panelCheck.id && model.holodeck.visible &&
                JSON.stringify(model.holodeck.region)===panelCheck.region && api.Holodeck.focused===model.holodeck;`));
        assert.ok(await read(`model.lobbySystemPreview_show(false);model.lobbySystemPreview_opacity(true);
            return model.holodeck===panelCheck.deck && model.holodeck.visible;`));
        assert.ok(await read(`model.lobbySystemPreview_opacity(false);return !model.holodeck.visible;`));
        await read(`panelCheck.before=Object.keys(api.panelsById).length;panelCheck.callbacks=0;
            panelCheck.handlerCount=($._data(window,'events').beforeunload||[]).length;
            var div=document.createElement('div');div.style.display='none';document.body.appendChild(div);
            panelCheck.element=div;
            panelCheck.nativePanel=new api.Panel(div,{noInput:true},function(){panelCheck.callbacks++;});
            panelCheck.nativePanel.destroy();document.body.removeChild(div);return true;`);
        await cdp.sleep(500);
        assert.ok(await read(`return panelCheck.callbacks===0 && !panelCheck.nativePanel.hasOwnProperty('id') &&
            Object.keys(api.panelsById).length===panelCheck.before &&
            ($._data(window,'events').beforeunload||[]).length===panelCheck.handlerCount;`));
        console.log('Coherent lifecycle checks passed: hide/reopen, camera/input, opacity mode, late panel creation and handler cleanup');
    } finally {
        await read(`model.lobbySystemPreview_show(panelCheck.show);model.lobbySystemPreview_opacity(panelCheck.opacity);
            delete window.panelCheck;return true;`);
    }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
