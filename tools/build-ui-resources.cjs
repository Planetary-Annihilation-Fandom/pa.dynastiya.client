// node tools/build-ui-resources.cjs [PA media directory] [--check]
// Originals remain in the PA installation; no image decoder or editor is needed.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const zlib = require('node:zlib');
const root = path.resolve(__dirname, '..');
const media = process.argv.slice(2).find(arg => arg !== '--check') ||
    'C:/workroot/software/steam/steamapps/common/Planetary Annihilation Titans/media';
const check = process.argv.includes('--check');
const signature = Buffer.from('89504e470d0a1a0a', 'hex');
// Fireworks previews and editable layer data are irrelevant to PNG rendering.
// Keep every other chunk verbatim, including IDAT, colour profiles and all text
// (which may contain attribution/licensing); do not blanket-strip metadata.
const editorChunks = new Set(['prVW', 'mkBF', 'mkTS', 'mkBS', 'mkBT']);
function stripEditorData(input) {
    assert.ok(input.subarray(0, 8).equals(signature), 'Expected PNG');
    const kept = [input.subarray(0, 8)];
    let ended = false;
    for (let offset = 8; offset < input.length;) {
        assert.ok(offset + 12 <= input.length, 'Truncated PNG chunk');
        const end = offset + 12 + input.readUInt32BE(offset);
        assert.ok(end <= input.length, 'Invalid PNG chunk length');
        const type = input.toString('ascii', offset + 4, offset + 8);
        if (!editorChunks.has(type)) kept.push(input.subarray(offset, end));
        offset = end;
        if (type === 'IEND') {
            assert.equal(offset, input.length, 'Unexpected data after IEND');
            ended = true;
        }
    }
    assert.ok(ended, 'Missing IEND');
    return Buffer.concat(kept);
}
function optimize(input) {
    const stripped = stripEditorData(input);
    const chunks = [];
    for (let offset = 8; offset < stripped.length;) {
        const end = offset + 12 + stripped.readUInt32BE(offset);
        chunks.push({ type: stripped.toString('ascii', offset + 4, offset + 8), bytes: stripped.subarray(offset, end) });
        offset = end;
    }
    const data = Buffer.concat(chunks.filter(c => c.type === 'IDAT').map(c => c.bytes.subarray(8, -4)));
    const raw = zlib.inflateSync(data, { maxOutputLength: 256 * 1024 * 1024 });
    const compressed = zlib.deflateSync(raw, { level: 9 });
    // Some shipped commander pictures use effectively uncompressed IDAT. Change
    // only its zlib encoding: filters, pixels, alpha and dimensions stay exact.
    if (data.length - compressed.length < 1024) return stripped;
    assert.ok(zlib.inflateSync(compressed).equals(raw), 'Lossless IDAT round trip');
    const idat = Buffer.alloc(compressed.length + 12);
    idat.writeUInt32BE(compressed.length);
    idat.write('IDAT', 4);
    compressed.copy(idat, 8);
    idat.writeUInt32BE(zlib.crc32(idat.subarray(4, -4)), idat.length - 4);
    let inserted = false;
    return Buffer.concat([signature, ...chunks.flatMap(chunk => {
        if (chunk.type !== 'IDAT') return [chunk.bytes];
        if (inserted) return [];
        inserted = true;
        return [idat];
    })]);
}
function resources() {
    const prefix = 'ui/main/shared/img/planets/';
    const pairs = [];
    // These Lite assets are exact copies of stock PA artwork. Use stock files
    // as the reproducible source instead of adding a second set of originals.
    for (const biome of ['desert', 'earth', 'ice', 'lava', 'moon', 'tropical'])
        pairs.push([prefix + biome + '.png', prefix + biome + '_lite.png']);
    // This is the stock fallback actually requested by lobby/browser/HUD rows.
    pairs.push([prefix + 'small/unknown.png', prefix + 'small/unknown.png']);
    for (const name of ['imperial_jt100010117', 'quad_commandonut', 'raptor_damubbster']) {
        const file = 'ui/main/shared/img/commanders/img_' + name + '.png';
        pairs.push([file, file]);
    }
    for (const name of ['imperial_jt100010117', 'quad_commandonut']) {
        const file = 'ui/main/shared/img/commanders/profiles/profile_' + name + '.png';
        pairs.push([file, file]);
    }
    pairs.push(['pa/ui/backgrounds/default.png', 'pa/ui/backgrounds/default.png']);
    pairs.push(['ui/main/shared/img/ice.png', 'ui/main/shared/img/ice_lite.png']);
    return pairs;
}
function main() {
    let saved = 0;
    for (const [source, destination] of resources()) {
        const original = fs.readFileSync(path.join(media, source));
        const output = optimize(original);
        assert.ok(output.length < original.length, 'Expected resource savings: ' + source);
        assert.ok(optimize(output).equals(output), 'Must be idempotent');
        const file = path.join(root, destination);
        if (check) assert.ok(fs.readFileSync(file).equals(output), 'Regenerate ' + destination);
        else {
            fs.mkdirSync(path.dirname(file), { recursive: true });
            fs.writeFileSync(file, output);
        }
        saved += original.length - output.length;
    }
    console.log(`${check ? 'Verified' : 'Prepared'} ${resources().length} PNGs; saved ${saved} bytes; image data losslessly preserved`);
}
module.exports = { stripEditorData, optimize, resources };
if (require.main === module) main();
