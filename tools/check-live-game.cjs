// node tools/check-live-game.cjs <PA media directory>
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const media = process.argv[2];
const ko = require(path.join(media, 'ui/main/shared/js/thirdparty/knockout-3.5.1.debug.js'));
const koUtility = fs.readFileSync(path.join(media,'ui/main/shared/js/ko_utility.js'),'utf8');
vm.runInNewContext(koUtility.slice(koUtility.indexOf('    ko.extenders.numeric ='),
    koUtility.indexOf('    ko.extenders.positive =')), {ko});
const _ = require(path.join(media, 'ui/main/shared/js/thirdparty/lodash-4.7.20.js'));
_.contains = _.includes;
_.pluck = (items, key) => _.map(items, key);
const stock = name => fs.readFileSync(path.join(media, 'ui/main/game/live_game/live_game_' + name + '.js'), 'utf8');
const patch = name => fs.readFileSync(path.join(__dirname, '../ui/mods/dynastiya.live_game/' + name + '.js'), 'utf8');
ko.applyBindings = () => {};
function context() {
    let resizes = 0;
    const events = [];
    const timers = new Map();
    let serial = 0, unload;
    const $ = () => ({ ready: fn => fn(), focus() {}, blur() {}, keydown() {}, attr() {}, on(name, fn) { unload = fn; } });
    const api = { Panel: { onBodyResize() { resizes++; }, query: () => ({ then() {} }), message(...args) { events.push(args); } } };
    const ctx = vm.createContext({ ko, _: Object.assign({}, _, { delay() {} }), $, api,
        Build: { iconForSpecId: id => 'icon:' + id }, document: {}, window: {},
        UberUtility: { createTimeString: value => String(value) },
        app: { registerWithCoherent() {} }, scene_mod_list: {}, loc: text => text,
        console: { log() {} }, setInterval() { throw Error('idle interval is forbidden'); }, keyboard: {},
        setTimeout(fn, delay) { timers.set(++serial, { fn, delay }); return serial; },
        clearTimeout(id) { timers.delete(id); },
        Date: class extends Date { static now() { return 20000; } }
    });
    ctx.self = ctx;
    return { ctx, events, timers, unload: () => unload(), resizes: () => resizes };
}
function run(ctx, text) { vm.runInContext(text, ctx); }
function scene(ctx, name) {
    ctx.scene_mod_list['live_game_' + name] = true;
    ctx.loadMods = () => run(ctx, patch(name));
    run(ctx, stock(name));
}
function deferred() {
    let ready = false, value;
    const listeners = [];
    return {
        then(fn) { if (ready) fn(value); else listeners.push(fn); return this; },
        resolve(result) { ready = true; value = result; listeners.splice(0).forEach(fn => fn(value)); }
    };
}
function buildChecks() {
    const { ctx } = context();
    const source = stock('build_bar');
    run(ctx, source.slice(source.indexOf('    function BuildItem('), source.indexOf('    function BuildBarViewModel(')));
    ctx.model = { BuildItem: ctx.BuildItem, BuildTab: ctx.BuildTab, BuildSet: ctx.BuildSet,
        unitSpecs: deferred(), getSpecTag: deferred() };
    ctx.handlers = {};
    ctx.$.when = (...requests) => ({ then(fn) {
        let remaining = requests.length;
        requests.forEach(request => request.then(() => { if (!--remaining) fn(); }));
    } });
    run(ctx, patch('build_bar'));
    const model = ctx.model;
    const units = {
        '/tank.json.player': { id: '/tank.json.player', buildGroup: 'combat', buildRow: 0, buildColumn: 0 },
        '/bot.json.player': { id: '/bot.json.player', buildGroup: 'combat', buildRow: 0, buildColumn: 1 }
    };
    const tank = units['/tank.json.player'], bot = units['/bot.json.player'];
    const buildLists = { '/factory.json.player': [tank], '/fabber.json.player': [tank, bot] };
    const set = new model.BuildSet({ units, buildLists, grid: { '/tank.json': {}, '/bot.json': {} }, specTag: '.player' });
    let resets = 0, tileWrites = 0;
    set.selectedSpecs.subscribe(() => resets++);
    set.buildItems()[tank.id].visible.subscribe(() => tileWrites++);
    const payload = (builders, orders = {}) => ({ spec_ids: builders, build_orders: orders });
    set.parseSelection(payload({ '/factory.json': [1] }));
    assert.equal(resets, 1);
    tileWrites = 0;
    set.parseSelection(payload({ '/factory.json': [1, 2] }, { '/tank.json': 4 }));
    assert.equal(resets, 1);
    assert.equal(tileWrites, 0);
    assert.equal(set.buildItems()[tank.id].count(), 4);
    set.parseSelection(payload({ '/factory.json.player': [8] }));
    assert.equal(resets, 1, 'tag aliases resolve to the same build list');
    assert.equal(set.buildItems()[tank.id].count(), 0, 'queue cancellation still clears counts');
    set.parseSelection(payload({ '/fabber.json': [3], '/factory.json': [8] }));
    assert.equal(resets, 2);
    assert.equal(set.buildItems()[bot.id].empty(), false);
    set.parseSelection(payload({ '/factory.json': [8], '/fabber.json': [3] }));
    assert.equal(resets, 2, 'builder order does not change availability');
    set.parseSelection(payload({}));
    assert.equal(set.empty(), true);
    assert.equal(set.tabs().some(tab => tab.visible()), false);
    const received = [];
    model.parseSelection = value => received.push(value);
    ctx.handlers.selection('old');
    ctx.handlers.selection('latest');
    model.unitSpecs.resolve();
    assert.equal(received.length, 0);
    ctx.handlers.selection('newer');
    model.getSpecTag.resolve();
    assert.deepEqual(received, ['newer']);
    ctx.handlers.selection('queue');
    assert.deepEqual(received, ['newer', 'queue'], 'ready updates remain synchronous');
}
function selectionChecks() {
    const { ctx, resizes } = context();
    scene(ctx, 'selection');
    const model = ctx.model, summary = model.selectionModel();
    let listWrites = 0, totalWrites = 0;
    model.selectionList.subscribe(() => listWrites++);
    summary.total.subscribe(() => totalWrites++);
    const send = (spec_ids, spec_groups) => ctx.handlers.selection({ spec_ids, spec_groups });
    send({ tank: [1, 2], bot: [3] }, { tank: [1] });
    const tank = model.selectionList()[0], bot = model.selectionList()[1];
    assert.equal(tank.count(), 2);
    assert.equal(tank.group(), 1);
    assert.equal(summary.total(), 3);
    assert.equal(totalWrites, 1, 'publish the total once, not once per spec');
    const before = resizes();
    send({ tank: [4, 5], bot: [6] }, { tank: [1] });
    assert.equal(listWrites, 1);
    assert.equal(resizes(), before);
    send({ tank: [4, 5, 7], bot: [6] }, { tank: [2, 3] });
    assert.equal(model.selectionModel(), summary);
    assert.equal(model.selectionList()[0], tank);
    assert.equal(tank.group(), '2+');
    assert.equal(tank.count(), 3);
    assert.equal(summary.total(), 4);
    assert.equal(listWrites, 1);
    send({ bot: [6], tank: [4] });
    assert.equal(model.selectionList()[0], bot, 'row order follows parent click indices');
    assert.equal(model.selectionList()[1], tank);
    assert.equal(tank.hasGroup(), false);
    send({});
    assert.equal(summary.total(), 0);
    assert.equal(model.selectionList().length, 0);
    send({ bot: [9] });
    assert.notEqual(model.selectionList()[0], bot, 'removed rows are released');
    const keys=[];
    ctx.api.Panel.dockPresentation={present(data,apply,key){keys.push(key);apply(data);}};
    send({bot:[9]});send({bot:[9,10]});send({bot:[9],tank:[11]});
    assert.equal(keys[0],keys[1],'selection counts update within the same presentation');
    assert.notEqual(keys[1],keys[2],'adding rows requires a new presentation');
}
function hoverChecks() {
    const {ctx}=context();
    const calls=[];
    ctx.api.Panel.dockPresentation={present(data,apply,key) {calls.push(key);apply(data);}};
    ctx.scene_mod_list.live_game_hover=true;
    ctx.loadMods=()=>run(ctx,patch('hover'));
    run(ctx,stock('world_popup'));
    const send=(entity,health,extra={})=>ctx.handlers.hover(Object.assign({entity,
        spec_id:'/pa/units/land/vehicle_factory/vehicle_factory.json',display_name:'Factory',
        health:{current:health,max:100}},extra));
    send(1,10);
    const current=ctx.model.worldHoverTarget();
    send(1,88);
    assert.equal(ctx.model.worldHoverTarget(),current,'progress preserves the bound model');
    assert.equal(current.healthPercentString(),'88%');
    assert.equal(calls.at(-1),calls.at(-2),'progress keeps its content key');
    send(2,25);
    assert.notEqual(calls.at(-1),calls.at(-2),'same name on another entity needs presentation');
    assert.equal(current.entity(),2);
    const target={entity:3,spec_id:'/pa/units/land/tank/tank.json',health:{current:20,max:100}};
    send(2,25,{tool_details:{build_target:true,target_details:target}});
    const nested=current.target();
    assert.equal(nested.healthPercentString(),'20%','adopted target computeds remain alive');
    target.health.current=80;
    send(2,25,{tool_details:{build_target:true,target_details:target}});
    assert.equal(current.target(),nested);
    assert.equal(nested.healthPercentString(),'80%');
    ctx.handlers.hover({});
    assert.equal(ctx.model.hasWorldHoverTarget(),false);
}
function chatChecks() {
    const { ctx, timers, unload } = context();
    scene(ctx, 'chat');
    const model = ctx.model;
    const messages = [1, 1000, 4999, 5000, 8000].map(time_stamp => ({ time_stamp }));
    model.visibleChat(messages.slice());
    model.chatLog(messages.slice());
    let writes = 0;
    model.visibleChat.subscribe(() => writes++);
    model.removeOldChatMessages();
    assert.equal(writes, 1);
    assert.equal(model.visibleChat().length, 2);
    assert.equal(model.visibleChat()[0], messages[3], 'strict stock cutoff retained');
    assert.equal(model.chatLog().length, 5);
    model.removeOldChatMessages();
    assert.equal(writes, 1);
    assert.equal(timers.size, 1, 'one deadline for the next expiring message');
    let historyWrites = 0;
    const history = model.dynastiyaChatLog.subscribe(() => historyWrites++);
    assert.equal(model.dynastiyaChatLog().length, 0);
    model.state({ selected: true });
    assert.equal(model.dynastiyaChatLog().length, 5);
    assert.equal(timers.size, 0, 'hidden transient feed does not tick while history is open');
    model.state({ selected: false });
    const cached = model.dynastiyaChatLog();
    const before = historyWrites;
    model.chatLog.push({ time_stamp: 19000 });
    assert.equal(historyWrites, before, 'closed history does not append hidden DOM rows');
    assert.equal(model.dynastiyaChatLog(), cached);
    model.state({ selected: true });
    assert.equal(model.dynastiyaChatLog().length, 6);
    assert.equal(model.dynastiyaChatLog()[0], messages[0], 'history keeps model identity');
    model.state({ selected: false });
    model.visibleChat([]);
    assert.equal(timers.size, 0, 'empty chat has no timer');
    history.dispose(); unload();
}
function pauseChecks() {
    const { ctx, timers, unload } = context();
    ctx.scene_mod_list.live_game_paused_popup = true;
    ctx.loadMods = () => run(ctx, patch('paused'));
    run(ctx, stock('paused_popup'));
    ctx.handlers.ranked(true);
    ctx.handlers.control_state({ paused: true, restart: false, saving: false });
    assert.equal(timers.size, 1);
    const before = ctx.model.timer();
    ctx.handlers.control_state({ paused: true, restart: false, saving: false });
    assert.equal(timers.size, 1);
    assert.equal(ctx.model.timer(), before, 'duplicate state does not reset the countdown');
    ctx.handlers.control_state({ paused: false, restart: false, saving: false });
    assert.equal(timers.size, 0, 'closing pause cancels its deadline immediately');
    ctx.handlers.control_state({ paused: true, restart: false, saving: false });
    assert.equal(timers.size, 1);
    unload(); assert.equal(timers.size, 0);
}
function planetChecks() {
    const { ctx } = context();
    scene(ctx, 'planets');
    const model = ctx.model;
    const baseline = model.landing.getSubscriptionsCount();
    let old;
    for (let i = 0; i < 20; i++) {
        ctx.handlers.state({ planets: [{ index: 1, isSun: false, dead: false, starting_planet: true }], landing: true });
        const planet = model.planets()[0];
        assert.equal(planet.canStart(), true);
        const sub = planet.canStart.subscribe(() => {});
        assert.equal(model.landing.getSubscriptionsCount(), baseline + 1);
        sub.dispose();
        assert.equal(model.landing.getSubscriptionsCount(), baseline);
        old = planet;
    }
    ctx.handlers.state({ planets: [], landing: false });
    assert.equal(old.canStart(), false, 'sleeping computed stays current when read');
    assert.equal(model.landing.getSubscriptionsCount(), baseline);
}
function optionsChecks() {
    const { ctx } = context();
    scene(ctx, 'options_bar');
    const requests = [];
    ctx.api.Panel.query = (parent, method, args) => ({ then(resolve, reject) { requests.push({ resolve, reject, args }); } });
    ctx.model.toggleMenu();
    ctx.model.toggleMenu();
    assert.equal(requests.length, 1, 'duplicate in-flight toggles stay blocked');
    ctx.model.togglePips();
    assert.equal(requests.length, 2, 'unrelated toggles stay independent');
    requests[0].resolve();
    ctx.model.toggleMenu();
    assert.equal(requests.length, 3, 'acknowledged toggle accepts the next click immediately');
    requests[2].reject();
    ctx.model.toggleMenu();
    assert.equal(requests.length, 4, 'failure releases the interlock');
    assert.equal(requests[3].args[0], 'toggleMenu');
}
buildChecks();
hoverChecks();
selectionChecks();
chatChecks();
pauseChecks();
planetChecks();
optionsChecks();
const info = JSON.parse(fs.readFileSync(path.join(__dirname, '../modinfo.json'), 'utf8'));
for (const scene of ['build_bar', 'selection', 'chat', 'planets', 'options_bar']) {
    assert.ok(info.scenes['live_game_' + scene].includes('coui://ui/mods/dynastiya.live_game/' + scene + '.js'));
}
console.log('HUD: stock build resolution/queue updates, pending selection, stable rows/order/groups, batched chat expiry, planet subscriptions and immediate/retryable toggles passed');
