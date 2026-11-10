// node tools/check-lobby.cjs <PA media directory>
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const media = process.argv[2];
if (!media) throw new Error('Pass the installed PA media directory');
const thirdparty = path.join(media, 'ui/main/shared/js/thirdparty');
const ko = require(path.join(thirdparty, 'knockout-3.5.1.debug.js'));
const lodash = require(path.join(thirdparty, 'lodash-4.7.20.js'));
const root = path.resolve(__dirname, '../ui/mods');
function run(file, context) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
}
function storage(initial) {
    let writes = 0;
    const values = { ...initial };
    return {
        get writes() { return writes; },
        getItem(key) { return values[key] ?? null; },
        setItem(key, value) { writes++; values[key] = value; }
    };
}

function checkOptions() {
    let data;
    const localStorage = storage({ map_generator_data: '{broken' });
    const ctx = vm.createContext({ _: lodash, localStorage, define: factory => { data = factory(); } });
    run('dynastiya.map_generator/data.js', ctx);
    assert.equal(data.get_option('metal'), 'poor');
    const writes = localStorage.writes;
    for (let i = 0; i < 10; i++) data.get_option('metal');
    data.update('metal', 'poor');
    assert.equal(localStorage.writes, writes, 'reads and unchanged choices must not write');
    data.update('metal', 'rich');
    assert.equal(localStorage.writes, writes + 1);
    assert.equal(data.get_option('metal'), 'rich');
    localStorage.setItem('map_generator_data', '{"options":[{"id":"metal","value":"invalid"}]}');
    assert.equal(data.get_option('metal'), 'poor');
    assert.equal(data.get_option('biome'), 'random');
}

function checkHistory() {
    let clones = 0;
    let disposed = false;
    const localStorage = {};
    const model = {
        updateRecentSystems: { dispose() { disposed = true; } },
        isGameCreator: ko.observable(false), system: ko.observable({}),
        recentSystems: ko.observableArray([])
    };
    let notifications = 0;
    model.recentSystems.subscribe(() => notifications++);
    const ctx = vm.createContext({ model, ko, localStorage, _: {
        ...lodash, cloneDeep(value) { clones++; return lodash.cloneDeep(value); }
    } });
    run('dynastiya.lobby_preview/recent_systems.js', ctx);
    assert.ok(disposed);
    model.isGameCreator(true);
    const system = { name: 'A', planets: [{ planet: { biome: 'moon' } }] };
    model.system(system);
    const before = notifications;
    model.system(lodash.cloneDeep(system));
    assert.equal(clones, 1);
    assert.equal(notifications, before, 'server echo must not rebuild history');
    system.planets[0].planet.biome = 'lava';
    assert.equal(model.recentSystems()[0].planets[0].planet.biome, 'moon');
    for (let i = 0; i < 7; i++) model.system({ name: String(i), planets: [{}] });
    assert.equal(model.recentSystems().length, 5);
    assert.equal(model.recentSystems()[0].name, '6');
    localStorage.recentSystems = '{broken';
    model.system({});
    assert.equal(model.recentSystems().length, 0);
    model.isGameCreator(false);
    model.system(system);
    assert.equal(model.recentSystems().length, 0);
}

async function checkGenerator() {
    const names = [];
    const applied = [];
    const errors = [];
    const $ = () => {}; // DOM-ready initialization is outside this mechanism test.
    $.Deferred = () => {
        let resolve, reject;
        const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
        return { resolve, reject, then: promise.then.bind(promise) };
    };
    $.when = value => Promise.resolve(value);
    $.getJSON = () => { throw new Error('unused terrain request'); };
    const model = {
        system: ko.observable({}), isGameCreator: ko.observable(true),
        slots: () => 2, armies: () => [{ slots: () => [{ playerName: () => 'Host' }] }],
        updateSystem: value => applied.push(value), changeSettings() {}, requestUpdateCheatConfig() {},
        localChatMessage: (source, text) => errors.push(text)
    };
    const ctx = vm.createContext({ $, ko, model, _: lodash,
        console: { log() {}, error() {} }, require: { config: () => () => {} },
        api: { game: { getRandomPlanetName: () => {
            const pending = $.Deferred(); names.push(pending); return pending;
        } } }
    });
    run('dynastiya.map_generator/map_generator.js', ctx);
    ctx._data = { get_option: () => undefined };
    ctx._math = { random_integer: min => min, new_seed: () => 1, random_index: () => 0, random_weighted_index: () => 0 };
    ctx._planetnames = { generate_planet_name: () => 'Planet', generate_system_name: () => 'System' };
    ctx._surface = { generate_landing_zones: () => [] };
    const flush = () => new Promise(resolve => setImmediate(resolve));
    ctx.generate(); ctx.generate();
    names[1].resolve('New'); await flush();
    names[0].resolve('Old'); await flush();
    assert.equal(applied.length, 1);
    assert.equal(applied[0].planets[0].name, 'New');
    ctx.generate();
    model.system({ name: 'Selected elsewhere' });
    names[2].resolve('Stale'); await flush();
    assert.equal(applied.length, 1);
    ctx.generate(); model.isGameCreator(false);
    names[3].resolve('Demoted'); await flush();
    assert.equal(applied.length, 1);
    const rejected = ctx.get_random_system('test', 400, 'moon', 20);
    names[4].reject(new Error('name failed'));
    await assert.rejects(rejected, /name failed/);
    model.isGameCreator(true);
    ctx.generate(); names[5].reject(new Error('name failed')); await flush();
    assert.equal(errors.length, 1);
    assert.equal(applied.length, 1);
}

function checkPreview() {
    const timers = new Map();
    const ready = [];
    let focus = 0, destroyed = 0, nextTimer = 0;
    const $ = () => ({ length: 1, prepend() {}, append() {}, attr() {} });
    const model = {
        startingGameCountdown: ko.observable(-1), gameSystemReady: ko.observable(false),
        planetBiomes: () => ['moon'], localChatMessage() {}
    };
    const ctx = vm.createContext({ $, model, ko, console: { log() {}, error(e) { throw e; } },
        _: { defer() {}, delay(fn) { timers.set(++nextTimer, fn); return nextTimer; } },
        clearTimeout: id => timers.delete(id), api: {
            Holodeck: function (element, options, callback) {
                this.focus = () => focus++;
                this.destroy = () => destroyed++;
                ready.push(callback);
            }, camera: { focusPlanet() {}, setZoom() {}, alignToPole() {} }
        }
    });
    run('dynastiya.lobby_preview/new_game.js', ctx);
    model.gameSystemReady(true); ready[0]();
    assert.equal(timers.size, 1);
    model.gameSystemReady(false);
    assert.equal(timers.size, 0);
    model.gameSystemReady(true);
    ready[0](); // completion of the old holodeck must be ignored
    assert.equal(timers.size, 0);
    ready[1]();
    for (const fn of timers.values()) fn();
    timers.clear();
    assert.equal(focus, 1);
    model.startingGameCountdown(5);
    assert.equal(destroyed, 2);
    model.startingGameCountdown(-1);
    assert.equal(ready.length, 3);
}

(async () => {
    checkOptions(); checkHistory(); await checkGenerator(); checkPreview();
    console.log('Lobby checks passed: options, history, generation races, preview lifecycle');
})().catch(error => { console.error(error); process.exitCode = 1; });
