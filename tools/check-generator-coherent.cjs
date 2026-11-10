// Run against the isolated host lobby: node tools/check-generator-coherent.cjs [port]
const assert = require('node:assert/strict');
const path = require('node:path');
const cdp = require(path.resolve(__dirname, '../../../../docs/En/Modding/Debug/cdp.js'));
const port = Number(process.argv[2] || 9881);
const target = 'new_game/new_game.html';
// Coherent releases the single debugger socket shortly after each call closes.
const read = async body => {
    await cdp.sleep(200);
    const result = await cdp.evaluate(port, target, body);
    if (result.startsWith('THROW:')) throw new Error(result);
    return JSON.parse(result);
};
const wait = async body => { await cdp.sleep(200); return cdp.waitFor(port, target, body, 10, 100); };
async function main() {
    const results = [];
    await read(`window.generatorCheck={build:generateSystem,update:model.updateSystem,
        settings:model.changeSettings,cheats:model.requestUpdateCheatConfig,
        system:model.system(),host:model.isGameCreator(),calls:0,applied:0};
        generateSystem=function(){generatorCheck.calls++;generatorCheck.deferred=$.Deferred();return generatorCheck.deferred;};
        model.updateSystem=function(){generatorCheck.applied++;};
        model.changeSettings=function(){};model.requestUpdateCheatConfig=function(){};return true;`);
    try {
        const pending = await read(`generate();generate();return {pending:generationPending(),
            disabled:document.querySelector('button.generate').disabled,
            busy:document.querySelector('button.generate').getAttribute('aria-busy'),
            label:document.querySelector('button.generate label').textContent};`);
        assert.equal(pending.pending, true);
        assert.equal(pending.disabled, true);
        assert.equal(pending.busy, 'true');
        await wait('return generatorCheck.calls===1;');
        await read('generatorCheck.deferred.reject(Error("test rejection"));return true;');
        assert.ok(await read('return !generationPending() && !!generationError() && !document.querySelector("button.generate").disabled;'));
        results.push('pending, duplicate activation, rejection');

        await read('generate();return true;');
        await wait('return generatorCheck.calls===2;');
        await read('generatorCheck.old=generatorCheck.deferred;model.system({name:"Other selection",planets:[]});generate();return true;');
        await wait('return generatorCheck.calls===3;');
        assert.ok(await read('generatorCheck.old.resolve({name:"Stale",planets:[]});return generationPending() && generatorCheck.applied===0;'));
        await read('generatorCheck.deferred.resolve({name:"Retry",planets:[]});return true;');
        assert.ok(await read('return !generationPending() && generationError()==="" && generatorCheck.applied===1;'));
        results.push('selection change, late response, retry');

        await read('generate();return true;');
        await wait('return generatorCheck.calls===4;');
        assert.ok(await read('model.isGameCreator(false);model.isGameCreator(true);generatorCheck.deferred.resolve({name:"Demoted",planets:[]});return !generationPending() && generatorCheck.applied===1;'));
        results.push('permission lost and regained');

        await read('generateSystem=function(){throw Error("synchronous failure");};generate();return true;');
        await wait('return !generationPending();');
        assert.ok(await read('return !!generationError();'));
        await read('generateSystem=function(){generatorCheck.calls++;generatorCheck.deferred=$.Deferred();return generatorCheck.deferred;};model.updateSystem=function(){throw Error("callback failure");};generate();return true;');
        await wait('return generatorCheck.calls===5;');
        assert.ok(await read('generatorCheck.deferred.resolve({name:"Callback failure",planets:[]});return !generationPending() && !!generationError();'));
        results.push('synchronous and callback exceptions on jQuery 2.1.4');

        // Real keyboard activation; selection must leave focus on the option.
        await read('document.querySelector("#small").focus();return true;');
        await cdp.sleep(200);
        await cdp.input(port, target, 'key', 'space');
        assert.ok(await read('return document.activeElement.id==="small" && document.querySelector("#small").classList.contains("selected");'));
        const point = await read('var r=document.querySelector("#medium").getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};');
        await cdp.sleep(200);
        await cdp.input(port, target, 'click', point.x, point.y);
        assert.ok(await read('return document.activeElement.id==="medium" && document.querySelector("#medium").classList.contains("selected");'));
        results.push('keyboard and mouse selection retain focus');
        console.log(JSON.stringify(results));
    } finally {
        await read(`cancelGeneration();generateSystem=generatorCheck.build;model.updateSystem=generatorCheck.update;
            model.changeSettings=generatorCheck.settings;model.requestUpdateCheatConfig=generatorCheck.cheats;
            model.isGameCreator(generatorCheck.host);model.system(generatorCheck.system);delete window.generatorCheck;return true;`);
    }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
