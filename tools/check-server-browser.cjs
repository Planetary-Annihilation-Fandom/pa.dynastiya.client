// node tools/check-server-browser.cjs <PA media directory>
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const media = process.argv[2];
const ko = require(path.join(media, 'ui/main/shared/js/thirdparty/knockout-3.5.1.debug.js'));
const _ = require(path.join(media, 'ui/main/shared/js/thirdparty/lodash-4.7.20.js'));
_.contains = _.includes;
_.any = _.some;
ko.applyBindings = () => {};
function run(withCommunityMods) {
    let serial = 0;
    const timers = new Map(), remote = [], custom = [], filters = [], exits = [];
    function request(queue, url) {
        const callbacks = { done: [], fail: [], always: [] };
        let state = 'pending';
        const result = { url,
            done(fn) { callbacks.done.push(fn); return this; },
            fail(fn) { callbacks.fail.push(fn); return this; },
            always(fn) { callbacks.always.push(fn); return this; },
            state: () => state,
            resolve(data) { state = 'resolved'; callbacks.done.forEach(fn => fn(data)); callbacks.always.forEach(fn => fn()); },
            reject() { state = 'rejected'; callbacks.fail.forEach(fn => fn()); callbacks.always.forEach(fn => fn()); }
        };
        queue.push(result);
        return result;
    }
    const chain = { ready: fn => fn(), modal() { return this; }, on() { return this; },
        unload(fn) { exits.push(fn); return this; }, focus() { return this; }, select() { return this; },
        replaceWith() {}, remove() {} };
    const $ = target => target === ctx.window ? { on: (event, fn) => exits.push(fn), unload: fn => exits.push(fn) } : chain;
    $.trim = value => value.trim();
    $.getJSON = url => request(url.includes('api/filter') ? filters : custom, url);
    const api = { steam: { hasClient: () => true }, content: { usingTitans: () => true, unlocked: () => ['PAExpansion1'] },
        net: { requestCurrentGames: () => request(remote) }, Panel: { message() {} } };
    const ctx = vm.createContext({ ko, _, $, api, document: {}, window: { CommunityModsManager: true, location: {} },
        console, loc: value => value, gModsUrl: 'https://mods.invalid/',
        app: { registerWithCoherent() {} }, engine: { call() {} },
        setTimeout(fn, delay) { const id = ++serial; timers.set(id, { fn, delay }); return id; },
        clearTimeout(id) { timers.delete(id); },
        loadSceneMods(name) {
            assert.equal(name, 'server_browser');
            ctx.model.buildVersion('v');
            ctx.model.uberNetRegions([{ Name: 'EU' }]);
            ctx.model.customServersUrl('https://servers.invalid/a');
            vm.runInContext(fs.readFileSync(path.join(__dirname, '../ui/mods/dynastiya.server_browser/server_browser.js'), 'utf8'), ctx);
        }
    });
    if (withCommunityMods) {
        vm.runInContext(fs.readFileSync(path.join(media, 'ui/main/game/community_mods/states/server_browser.js'), 'utf8'), ctx);
        ctx.window.CommunityMods = ctx.CommunityMods;
    }
    vm.runInContext(fs.readFileSync(path.join(media, 'ui/main/game/server_browser/server_browser.js'), 'utf8'), ctx);
    const model = ctx.model;
    const beacon = (uuid, players = 1) => ({ uuid, creator: 'Host', tag: 'game', game: { name: uuid, system: { name: 'Map', planets: [] } },
        player_names: ['Alice'], spectator_names: [], blacklist: [], whitelist: [], required_content: ['PAExpansion1'],
        mod_names: [], mod_identifiers: [], players, max_players: 4, spectators: 0, max_spectators: 2, mode: 'FreeForAll' });
    const online = (id, players = 1) => ({ BuildVersion: 'v', TitleData: JSON.stringify(beacon(id, players)), Region: 'EU', LobbyID: id });
    const dedicated = id => ({ version: 'v', beacon: JSON.stringify(beacon(id)), id, ip: '10.0.0.1', port: 123 });
    assert.equal(remote.length, 1);
    assert.equal(custom.length, 1);
    model.manualRefresh(); model.manualRefresh();
    assert.equal(remote.length, 1);
    assert.equal(custom.length, 1);
    let writes = 0;
    model.gameList.subscribe(() => writes++);
    remote[0].resolve({ Games: [online('a'), online('b')] });
    custom[0].resolve([dedicated('custom')]);
    assert.ok([...timers.values()].some(timer => timer.delay === 1000));
    assert.ok([...timers.values()].some(timer => timer.delay === 5000));
    if (withCommunityMods) {
        model.gamesFilter({ b: 'b' });
        model.filterRetiredGames(true);
        assert.equal(model.filteredGameList().some(game => game.uuid === 'b'), false, 'Community Mods filter remains effective');
        model.gamesFilter({});
        model.filterRetiredGames(false);
    }
    const first = model.filteredGameList()[0];
    model.setSelected(first);
    model.manualRefresh();
    remote[1].resolve({ Games: [online('a'), online('b')] });
    custom[1].resolve([dedicated('custom')]);
    assert.equal(writes, 1, 'identical responses do not republish the list');
    assert.equal(model.filteredGameList()[0], first, 'unchanged DOM row retains its identity');
    assert.equal(model.currentSelectedGame().uuid, first.uuid);
    model.manualRefresh();
    remote[2].resolve({ Games: [online('a', 4), online('b')] });
    custom[2].reject();
    assert.ok([...timers.values()].some(timer => timer.delay === 30000), 'custom source keeps its retry interval');
    const full = model.filteredGameList().find(game => game.uuid === 'a');
    assert.equal(full.retired, true);
    assert.equal(model.currentSelectedGame().players, 4);
    assert.equal(model.canJoinGame(), false);
    model.gameStatusFilter('any');
    const available = model.filteredGameList().find(game => game.uuid === 'a');
    assert.equal(available.retired, false);
    assert.notEqual(available, full, 'changed plain retired field receives a new bound row');
    model.searchFilter('Alice');
    assert.equal(model.filteredGameList().length, 3);
    model.searchFilter('does not match');
    assert.equal(model.filteredGameList().length, 0, 'filter changes reset previously visible lobbies');
    model.searchFilter('');
    model.setSelected(model.filteredGameList().find(game => game.uuid === 'b'));
    model.manualRefresh();
    remote[3].resolve({ Games: [online('a')] });
    custom[3].resolve([]);
    assert.equal(model.currentSelectedGame(), null, 'disappeared selection is cleared');

    const lan = (host, port, id = host) => ({ host, port, version: 'v', beacon: beacon(id) });
    const payload = lan('host1', 1);
    const names = payload.beacon.player_names.slice();
    ctx.handlers.new_beacon(payload);
    const row = model.lanGameList()[0];
    let lanWrites = 0;
    model.lanGameList.subscribe(() => lanWrites++);
    ctx.handlers.update_beacon(payload);
    assert.equal(lanWrites, 0);
    assert.equal(model.lanGameList()[0], row);
    assert.deepEqual(payload.beacon.player_names, names, 'open slots do not mutate LAN payload');
    assert.equal(payload.beacon.spectator_names.length, 0);
    ctx.handlers.new_beacon(lan('host2', 2));
    ctx.handlers.new_beacon(lan('host3', 3));
    ctx.handlers.update_beacon({ ...lan('host2', 2), version: 'wrong' });
    assert.deepEqual(Array.from(model.lanGameList(), game => game.host), ['host1', 'host3']);
    ctx.handlers.new_beacon(lan('host1', 4, 'other-port'));
    ctx.handlers.lost_beacon({ host: 'host1', port: 1 });
    assert.deepEqual(Array.from(model.lanGameList(), game => game.port), [3, 4]);
    ctx.handlers.lost_beacon({ host: 'host1' });
    assert.deepEqual(Array.from(model.lanGameList(), game => game.host), ['host3']);
    ctx.handlers.lost_beacon({ host: 'absent' });
    assert.equal(model.lanGameList().length, 1);
    model.manualRefresh();
    model.autoRefresh(false);
    remote[4].resolve({ Games: [] });
    custom[4].resolve([]);
    assert.equal([...timers.values()].filter(timer => timer.delay !== 60000).length, 0, 'disabled polling does not restart after response');
    model.autoRefresh(true);
    remote[5].reject();
    assert.equal(model.failedToRetrieveGameList(), true);
    assert.equal(model.autoRefresh(), false);
    custom[5].reject();
    model.manualRefresh();
    remote[6].resolve({ Games: [online('recovered')] });
    assert.equal(model.failedToRetrieveGameList(), false);
    model.customServersUrl('https://servers.invalid/b');
    custom[6].resolve([dedicated('obsolete')]);
    assert.equal(model.customGameList().length, 0, 'old endpoint response is discarded');
    model.manualRefresh();
    custom[7].reject();
    assert.equal(model.customGameList().length, 0);
    if (withCommunityMods) {
        assert.equal(filters.length, 1, 'no additional filter request at injection');
        const timer = [...timers.entries()].find(([, value]) => value.delay === 60000);
        assert.equal(typeof timer[1].fn, 'function', 'Community Mods timer callback exists');
        timers.delete(timer[0]); timer[1].fn();
        assert.equal(filters.length, 2);
    }
    exits.forEach(fn => fn());
    assert.equal(timers.size, 0);
    remote[7].resolve({ Games: [online('after-exit')] });
    assert.equal(model.gameList()[0].uuid, 'recovered');
    assert.equal(timers.size, 0, 'late response does not restart timers after exit');
}
run(false);
run(true);
const info = JSON.parse(fs.readFileSync(path.join(__dirname, '../modinfo.json'), 'utf8'));
assert.ok(info.scenes.server_browser.includes('coui://ui/mods/dynastiya.server_browser/server_browser.js'));
console.log('Server browser: stock + Community Mods, stable rows/selection/filter state, single-flight refresh, failure/recovery, stale URL, LAN removal and unload passed');
