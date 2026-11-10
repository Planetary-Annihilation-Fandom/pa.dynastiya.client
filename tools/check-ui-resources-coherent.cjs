// node tools/check-ui-resources-coherent.cjs [Coherent port] [PA media directory]
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const cdp = require(path.resolve(__dirname, '../../../../docs/En/Modding/Debug/cdp.js'));
const port = Number(process.argv[2] || 9881);
const media = process.argv[3] || 'C:/workroot/software/steam/steamapps/common/Planetary Annihilation Titans/media';
const target = 'new_game/new_game.html';
async function read(body) {
    await cdp.sleep(200);
    const result = await cdp.evaluate(port, target, body);
    if (result.startsWith('THROW:')) throw new Error(result);
    return JSON.parse(result);
}
async function main() {
    const cases = [
        ['planets/desert.png', 'planets/desert_lite.png'],
        ['planets/small/unknown.png', 'planets/small/unknown.png'],
        ['commanders/profiles/profile_quad_commandonut.png', 'commanders/profiles/profile_quad_commandonut.png']
    ];
    try {
        for (const [source, destination] of cases) {
            const original = fs.readFileSync(path.join(media, 'ui/main/shared/img', source)).toString('base64');
            await read(`window.uiResourceCheck = {done:false, passes:0};
                var state = window.uiResourceCheck;
                var original = new Image();
                original.onerror = function () { state.error = 'Original failed to load'; state.done = true; };
                function pixels(image, size) {
                    var canvas = document.createElement('canvas');
                    canvas.width = canvas.height = size;
                    var ctx = canvas.getContext('2d');
                    ctx.drawImage(image, 0, 0, size, size);
                    return ctx.getImageData(0, 0, size, size).data;
                }
                function load() {
                    var image = new Image();
                    image.onerror = function () { state.error = 'Mounted PNG failed to load'; state.done = true; };
                    image.onload = function () {
                        try {
                            if (image.naturalWidth !== original.naturalWidth || image.naturalHeight !== original.naturalHeight)
                                throw Error('Dimensions differ');
                            [20, 40, 80].forEach(function (size) {
                                var a = pixels(original, size), b = pixels(image, size);
                                for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) throw Error('Pixels differ at ' + size);
                            });
                            state.passes++;
                            if (state.passes === 2) state.done = true;
                            else load();
                        } catch (error) { state.error = String(error); state.done = true; }
                    };
                    image.src = ${JSON.stringify('coui://ui/main/shared/img/' + destination)};
                }
                original.onload = load;
                original.src = ${JSON.stringify('data:image/png;base64,' + original)};
                return true;`);
            await cdp.sleep(200);
            await cdp.waitFor(port, target, 'return window.uiResourceCheck.done;', 15, 100);
            const result = await read('return window.uiResourceCheck;');
            assert.equal(result.error, undefined, result.error);
            assert.equal(result.passes, 2);
            console.log(`${destination}: mounted PNG matches original on first/repeat load at 20/40/80 px`);
        }
    } finally {
        await read('delete window.uiResourceCheck; return true;');
    }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
