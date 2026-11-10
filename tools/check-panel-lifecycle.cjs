const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const media = process.argv[2];
if (!media) throw new Error('Pass the installed PA media directory');
const ko = require(path.join(media, 'ui/main/shared/js/thirdparty/knockout-3.5.1.debug.js'));
const _ = require(path.join(media, 'ui/main/shared/js/thirdparty/lodash-4.7.20.js'));
const root = path.resolve(__dirname, '../ui/mods/dynastiya.panel_lifecycle');
function fixture(scene) {
    const calls = [], pending = [], timers = new Map(), frames = new Map();
    let next = 0, reads = 0;
    const win = { innerWidth: 1000, innerHeight: 800, location: { pathname: scene || "/main/game/start/start.html" }, addEventListener() {}, removeEventListener() {} };
    function node() {
        return { visible: true, clientWidth: 400, clientHeight: 300, clientLeft: 0, clientTop: 0,
            hasAttribute() { return false; }, getBoundingClientRect() { reads++; return { left: 10, top: 20, width: 400, height: 300 }; } };
    }
    function $(element) {
        if (element && element.jquery) return element;
        if (typeof element === 'string' || !element) element = node();
        if (element.wrapper) return element.wrapper;
        const data = {}, events = {};
        const wrapper = { jquery: true, 0: element, length: 1,
            width(value) { element.clientWidth = value; }, height(value) { element.clientHeight = value; },
            attr() {}, zIndex: () => 0, children: () => [], append() {}, is: () => element.visible,
            data(key, value) { if (arguments.length > 1) data[key] = value; return data[key]; },
            removeData(key) { delete data[key]; },
            on(names, fn) { names.split(' ').forEach(name => (events[name] ||= []).push(fn)); return this; },
            off(names, fn) { names.split(' ').forEach(name => { events[name] = (events[name] || []).filter(f => f !== fn); }); return this; },
            fire(name, target = element) { (events[name] || []).slice().forEach(fn => fn({ target, preventDefault() {}, stopPropagation() {} })); },
            count(name) { return (events[name] || []).length; }
        };
        element.wrapper = wrapper;
        return wrapper;
    }
    $.extend = Object.assign;
    const set = fn => { timers.set(++next, fn); return next; };
    Object.assign(win, { setTimeout: set, clearTimeout: id => timers.delete(id),
        requestAnimationFrame: fn => { frames.set(++next, fn); return next; }, cancelAnimationFrame: id => frames.delete(id) });
    const api = { getWorldView: () => 0 };
    const globalHandlers = {};
    const ctx = vm.createContext({ window: win, $, ko, _, api, console,
        setTimeout: set, clearTimeout: win.clearTimeout, setInterval: set, clearInterval: win.clearTimeout,
        MutationObserver: class { observe() {} disconnect() {} },
        globalHandlers, handlers: {}, document: { documentElement: {}, addEventListener() {}, removeEventListener() {} }, engine: { call(name, ...args) {
            calls.push([name, ...args]);
            if (name === 'panel.create' || name === 'game.createHolodeck') return { then(fn) { pending.push(fn); } };
        } }
    });
    for (const name of ['panel', 'holodeck']) vm.runInContext(fs.readFileSync(path.join(root, name + '.js'), 'utf8'), ctx);
    return { api, $, node, calls, pending, timers, frames, win, globalHandlers, get reads() { return reads; } };
}
for (const [type, create, destroy, registry, data] of [
    ['Panel', 'panel.create', 'panel.destroy', 'panelsById', 'panel'],
    ['Holodeck', 'game.createHolodeck', 'holodeck.destroy', 'holodecks', 'holodeck']
]) {
    const f = fixture();
    const div = f.node();
    let ready = 0;
    const old = new f.api[type](div, {}, () => ready++);
    old.destroy(); old.destroy();
    f.pending.shift()(7);
    assert.equal(ready, 0, 'late creation must not notify the departed owner');
    assert.deepEqual(Object.keys(f.api[registry]), []);
    assert.equal(f.calls.filter(c => c[0] === destroy && c[1] === 7).length, 1);
    assert.equal(f.$(f.win).count('beforeunload'), 0);
    for (let id = 10; id < 13; id++) {
        const item = new f.api[type](div, {}, () => ready++);
        f.pending.shift()(id);
        assert.equal(f.$(div).data(data), item);
        f.$(div).fire('DOMNodeRemoved', f.node());
        assert.equal(item.id, id, 'removing a child must preserve its parent view');
        if (type === 'Holodeck') item.focus();
        for (const [timer, fn] of [...f.timers]) { f.timers.delete(timer); fn(); }
        assert.equal(f.frames.size, 1);
        item.update();
        assert.equal(f.frames.size, 0, 'explicit update replaces a queued frame');
        if (type === 'Holodeck') {
            div.visible = false; item.update();
            assert.equal(item.visible, false);
            assert.equal(f.timers.size, 0, 'hidden holodeck stops polling');
            div.visible = true; item.update();
            assert.equal(item.visible, true);
            assert.equal(f.timers.size, 1);
        } else {
            div.visible = false;
            const before = f.reads;
            item.update();
            assert.equal(f.reads, before, 'hidden panels must not read geometry');
            div.visible = true; item.update();
        }
        f.$(div).fire('DOMNodeRemoved');
        item.destroy();
        assert.equal(f.timers.size, 0);
        assert.equal(f.frames.size, 0);
        assert.equal(f.$(div).data(data), undefined);
        assert.equal(f.$(div).count('mouseenter'), 0);
        assert.equal(f.$(f.win).count('beforeunload'), 0, 'recreation must not retain old window handlers');
        assert.equal(f.api.Holodeck.focused, undefined);
        assert.equal(f.calls.filter(c => c[0] === destroy && c[1] === id).length, 1);
    }
    const failed = new f.api[type](div, {}, () => ready++);
    const count = ready;
    f.pending.shift()(-1);
    assert.equal(ready, count);
    assert.equal(failed._destroyed, true);
    assert.deepEqual(Object.keys(f.api[registry]), []);
    assert.equal(f.$(f.win).count('beforeunload'), 0);
}
// Showing a resized bottom-docked view must move its native region first.
{
    const f = fixture();
    const div = f.node();
    const item = new f.api.Panel(div);
    f.pending.shift()(91);
    div.visible = false; item.update();
    div.getBoundingClientRect = () => ({ left: 10, top: 500, width: 400, height: 280 });
    f.calls.length = 0;
    div.visible = true; item.update();
    const move = f.calls.findIndex(c => c[0] === 'panel.move');
    const show = f.calls.findIndex(c => c[0] === 'panel.visible' && c[2] === true);
    assert.ok(move >= 0 && show > move, 'native region must be current before reveal');
    item.destroy();
}
// A freshly created HUD dock remains hidden until content reports its size.
{
    const f = fixture('/main/game/live_game/live_game.html');
    const item = new f.api.Panel(f.node(), {
        src: 'coui://ui/main/game/live_game/live_game_selection.html', fit: 'dock-bottom-left'
    });
    const config = JSON.parse(f.calls.find(c => c[0] === 'panel.create')[1]);
    assert.equal(config.visible, false);
    f.pending.shift()(92);
    assert.equal(item.visible, false);
    f.api.Panel.ready(['selection']);
    assert.ok(f.calls.find(c => c[0] === 'panel.ready')[2].includes('panel.dock_applied'));
    f.globalHandlers['panel.resize']({ id: 92, width: 0, height: 0 });
    assert.equal(item.visible, false, 'an empty initial dock must not reveal the view');
    f.globalHandlers['panel.resize']({ id: 92, width: 307, height: 160, revision: 1 });
    const ack = f.calls.find(c => c[0] === 'panel.messageById' && c[2] === 'panel.dock_applied');
    assert.deepEqual(JSON.parse(ack[3]), { revision: 1, width: 400, height: 300 });
    assert.equal(item._awaitingDock, false);
    assert.equal(item.visible, true);
    assert.ok(f.api.Panel._layoutObserver, 'HUD observes layout changes between polling ticks');
    item.destroy();
}
// Scope is selected at boot, including child HUD panels, before any scene binds panels.
for (const [scene, expected] of [['/main/main.html', 2], ['/main/game/new_game/new_game.html', 2],
    ['/main/game/live_game/live_game_chat.html', 3], ['/main/game/settings/settings.html', 2],
    ['/main/game/start/start.html', 2], ['/main/game/server_browser/server_browser.html', 2],
    ['/main/game/galactic_war/gw_start/gw_start.html', 0], ['/main/game/armory/armory.html', 0],
    ['/main/game/system_editor/system_editor.html', 0], ['/main/game/guide/guide.html', 0]]) {
    const scripts = [];
    const ctx = vm.createContext({ api: {}, window: { location: { pathname: scene } }, loadScript: src => scripts.push(src) });
    const source = fs.readFileSync(path.join(root, 'load.js'), 'utf8');
    vm.runInContext(source, ctx); vm.runInContext(source, ctx);
    assert.equal(scripts.length, expected, scene);
}
console.log('Panel lifecycle checks passed: late creation, removal, cleanup, hide/reopen, geometry, move-before-show, initial HUD docking and scene scope');
