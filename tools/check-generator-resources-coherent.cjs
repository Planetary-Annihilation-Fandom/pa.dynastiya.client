// Run in a fresh isolated host lobby before generating: node tools/check-generator-resources-coherent.cjs [port]
const assert = require('node:assert/strict');
const path = require('node:path');
const cdp = require(path.resolve(__dirname, '../../../../docs/En/Modding/Debug/cdp.js'));
const port = Number(process.argv[2] || 9881);
const target = 'new_game/new_game.html';
async function read(body) {
    await cdp.sleep(200);
    const result = await cdp.evaluate(port, target, body);
    if (result.startsWith('THROW:')) throw new Error(result);
    return JSON.parse(result);
}
async function main() {
    assert.ok(await read(`return !!document.querySelector('#frame-body') && !_math && !_planetnames && !_surface;`));
    await read(`window.generatorResourceCheck = {require:require_mod_modules, calls:0, rejected:0, invalidated:[], ready:false};
        require_mod_modules = function (ids, success, failure) {
            generatorResourceCheck.calls++;
            if (generatorResourceCheck.calls === 1) throw Error('test synchronous load failure');
            failure({message:'test resource load failure', requireModules:['math']});
        };
        require_mod_modules.undef = function (id) {
            generatorResourceCheck.invalidated.push(id);
            generatorResourceCheck.require.undef(id);
        };
        loadGenerationResources().fail(function () { generatorResourceCheck.rejected++; });
        loadGenerationResources().fail(function () { generatorResourceCheck.rejected++; });
        return true;`);
    try {
        assert.ok(await read(`return generatorResourceCheck.rejected === 2 && generationResources === null &&
            generatorResourceCheck.invalidated.join(',') === 'math';`));
        await read(`require_mod_modules = function (ids, success, failure) {
            generatorResourceCheck.calls++;
            return generatorResourceCheck.require(ids, success, failure);
        };
        require_mod_modules.undef = generatorResourceCheck.require.undef;
        generatorResourceCheck.first = loadGenerationResources();
        generatorResourceCheck.shared = generatorResourceCheck.first === loadGenerationResources();
        generatorResourceCheck.first.done(function () { generatorResourceCheck.ready = true; });
        return true;`);
        await cdp.sleep(200);
        await cdp.waitFor(port, target, 'return generatorResourceCheck.ready;', 20, 100);
        assert.ok(await read(`return generatorResourceCheck.shared && generatorResourceCheck.calls === 3 &&
            _math && _planetnames && _surface && loadGenerationResources() === generatorResourceCheck.first;`));
        console.log('Generator resources: controls before algorithms, sync/async failure and retry, shared first request, reuse after load');
    } finally {
        await read('require_mod_modules = generatorResourceCheck.require; delete window.generatorResourceCheck; return true;');
    }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
