// Run against the isolated profile, at the named scene: lobby, browser, or hud.
const assert = require('node:assert/strict');
const path = require('node:path');
const cdp = require(path.resolve(__dirname, '../../../../docs/En/Modding/Debug/cdp.js'));
const mode = process.argv[2];
const port = Number(process.argv[3] || 9881);
async function read(target, body) {
    await cdp.sleep(250);
    const value = await cdp.evaluate(port, target, body);
    if (value.startsWith('THROW:')) throw Error(value);
    return JSON.parse(value);
}
async function main() {
    if (mode === 'lobby') {
        const target = 'new_game/new_game.html';
        assert.equal(await read(target, 'return model.dynastiyaHiddenLobbyLists;'), true);
        assert.deepEqual(await read(target, `model.showSystemPicker(true);
            var a=document.querySelector('#default .div-system-picker-item');
            model.showSystemPicker(false);var writes=0;
            var sub=model.processedDefaultSystems.subscribe(function(){writes++;});
            model.premadeSystems.valueHasMutated();
            var asleep=writes===0;sub.dispose();
            model.showSystemPicker(true);
            var current=model.processedDefaultSystems().length===model.defaultSystems().length;
            model.showSystemPicker(false);model.showSystemPicker(true);
            var b=document.querySelector('#default .div-system-picker-item');
            model.showSystemPicker(false);
            var local=document.querySelector('.div-system-picker-cont').dynastiyaPresentationSurface;
            return [asleep,current,!!a,!!b,!local.pending];`), [true,true,true,true,true]);
        await read(target, 'model.showSystemPicker(true);return true;');
        await cdp.waitFor(port,target, `var e=document.querySelector('.div-system-picker-cont');return e.offsetWidth>0 && !e.dynastiyaPresentationSurface.pending;`,15,200);
        assert.equal(await read(target, `var node=document.querySelector('#default .div-system-picker-item');
            var parent=document.querySelector('.div-system-picker');var scroll=parent.scrollTop;
            model.showSystemPicker(false);model.showSystemPicker(true);
            return node===document.querySelector('#default .div-system-picker-item') && parent.scrollTop===scroll;`), true);
        await read(target, 'model.showSystemPicker(false);return true;');
        console.log('Live lobby: closed lists sleep, reopening catches up, unchanged rows/scroll persist, close cancels preparation');
    } else if (mode === 'browser') {
        const target = 'server_browser/server_browser.html';
        assert.deepEqual(await read(target, `var saved=model.autoRefresh(),requests=0,pending=$.Deferred();
            var original=api.net.requestCurrentGames;
            try {
                model.autoRefresh(false);
                api.net.requestCurrentGames=function(){requests++;return pending.promise();};
                model.updateServerData();model.updateServerData();
                var once=requests===1;
                pending.resolve({Games:[]});
                var modal=$('#getPassword');modal.modal('show');
                var shown=modal.is(':visible') && $('.modal-backdrop').length===1;
                modal.modal('hide');
                var closed=!modal.is(':visible') && $('.modal-backdrop').length===0;
                modal.modal('show');
                var reopened=modal.is(':visible') && $('.modal-backdrop').length===1;
                modal.modal('hide');
                return [once,shown,closed,reopened && !modal.is(':visible') && $('.modal-backdrop').length===0];
            } finally {api.net.requestCurrentGames=original;model.autoRefresh(saved);}`), [true,true,true,true]);
        console.log('Live browser: refresh interlock, paused polling and password modal/backdrop close/reopen');
    } else if (mode === 'hud') {
        const game='live_game/live_game.html',chat='live_game/live_game_chat.html';
        await read(game, 'model.showSettings(false);return true;');
        const settings='game/settings/settings.html';
        await cdp.waitFor(port, settings, 'return typeof model!=="undefined" && model.dynastiyaSettings;',15,200);
        await read(settings, `window.hiddenSettingsCheck={group:model.activeSettingsGroupIndex(),
            options:model.settingsItemMap()['audio.device'].sourceOptions,requests:[],calls:0};
            hiddenSettingsCheck.original=hiddenSettingsCheck.options.deferred;
            hiddenSettingsCheck.options.deferred=function(){var d=$.Deferred();hiddenSettingsCheck.requests.push(d);hiddenSettingsCheck.calls++;return d.promise();};
            model.activeSettingsGroupIndex(1);return true;`);
        try {
            assert.equal(await read(settings, `model.settingsItemMap()['audio.device'].reloadSelectOptions();return hiddenSettingsCheck.calls;`), 0);
            await read(game, 'model.showSettings(true);return true;');
            assert.equal(await read(settings, 'return hiddenSettingsCheck.calls;'),1);
            await read(game, 'model.showSettings(false);return true;');
            assert.equal(await read(settings, `hiddenSettingsCheck.requests.shift().resolve([]);
                var item=model.settingsItemMap()['audio.device'];item.reloadSelectOptions();
                return hiddenSettingsCheck.calls===1 && item.refreshTimeout===undefined;`),true);
            await read(game, 'model.showSettings(true);return true;');
            assert.equal(await read(settings, 'return hiddenSettingsCheck.calls;'),2);
            await read(settings,'hiddenSettingsCheck.requests.shift().resolve([]);return true;');
        } finally {
            await read(settings, `hiddenSettingsCheck.options.deferred=hiddenSettingsCheck.original;
                model.activeSettingsGroupIndex(hiddenSettingsCheck.group);delete window.hiddenSettingsCheck;return true;`);
            await read(game, 'model.showSettings(false);return true;');
        }
        assert.deepEqual(await read(chat, `var state=model.state();model.state({selected:false});
            var feed=document.querySelector('.div_chat_log_feed'),before=feed.children.length;
            handlers.chat_message({player_name:'Check',message:'Hidden history check'});
            var hidden=feed.children.length===before;model.state({selected:true});
            var current=feed.children.length===model.chatLog().length;
            var node=feed.firstElementChild;model.state({selected:false});model.state({selected:true});
            var retained=node===feed.firstElementChild;model.state(state);return [hidden,current,retained];`),[true,true,true]);
        console.log('Live HUD: parent-driven settings stop/reopen, late device response, retained chat history and deferred DOM updates');
    } else throw Error('Pass lobby, browser or hud');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
