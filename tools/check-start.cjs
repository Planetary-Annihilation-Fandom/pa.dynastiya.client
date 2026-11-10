// node tools/check-start.cjs <PA media directory>
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const media = process.argv[2];
if (!media) throw new Error('Pass the installed PA media directory');
const ko = require(path.join(media, 'ui/main/shared/js/thirdparty/knockout-3.5.1.debug.js'));
const _ = require(path.join(media, 'ui/main/shared/js/thirdparty/lodash-4.7.20.js'));
let now = 1000000, serial = 0, requests = 0, exit;
const timers = new Map();
let pending;
const $ = () => ({ on(name, callback) { exit = callback; } });
$.getJSON = () => {
    requests++;
    const callbacks = {};
    pending = {
        done(fn) { callbacks.done = fn; return this; },
        fail(fn) { callbacks.fail = fn; return this; },
        always(fn) { callbacks.always = fn; return this; },
        resolve(value) { callbacks.done(value); callbacks.always(); },
        reject() { if (callbacks.fail) callbacks.fail(); callbacks.always(); }
    };
    return pending;
};
const model = {
    activeEvents: ko.observableArray([]), events: ko.observable([]), uberNetRegions: ko.observableArray([]),
    canDirectReconnect: ko.computed(() => false),
    reconnectToGameInfo: ko.observable(), reconnectToGameInfoMaxAge: ko.observable(300000),
    allowUbernetActions: ko.observable(true), uberId: ko.observable('a'),
    liveStreams: ko.observableArray([]), liveStreamsReady: ko.observable(false)
};
const ctx = vm.createContext({ model, ko, _, $, window: {}, loc: value => value,
    SPLASH_DELAY_SECONDS: 2, engine: { asyncCall: $.getJSON },
    Date: { now: () => now },
    api: { content: { ownsTitans: () => true } },
    setTimeout(fn) { const id = ++serial; timers.set(id, fn); return id; },
    clearTimeout(id) { timers.delete(id); }
});
// Exercise the real installed event formatter, including its active overrides.
const stock = fs.readFileSync(path.join(media, 'ui/main/game/start/start.js'), 'utf8');
const start = stock.indexOf('self.updateActiveEvents = function');
const end = stock.indexOf('self.updateActiveEventsTimer', start);
assert.ok(start > 0 && end > start);
vm.runInContext('var self = model; ' + stock.slice(start, end), ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../ui/mods/dynastiya.start/start.js'), 'utf8'), ctx);
assert.equal(ctx.SPLASH_DELAY_SECONDS, 0);
let regionWrites = 0;
model.uberNetRegions.subscribe(() => regionWrites++);
model.requestRegions(); model.requestRegions();
assert.equal(requests, 1);
pending.resolve(JSON.stringify({ Regions: [{ name: 'EU' }, { name: 'US' }] }));
assert.equal(regionWrites, 1);
model.requestRegions(); pending.resolve(JSON.stringify({ Regions: [{ name: 'EU' }, { name: 'US' }] }));
assert.equal(regionWrites, 1);
model.requestRegions(); pending.reject();
assert.equal(model.uberNetRegions().length, 2);
requests = 0;
let listWrites = 0, infoWrites = 0;
model.activeEvents.subscribe(() => listWrites++);
model.reconnectToGameInfo.subscribe(() => infoWrites++);
model.events([{ text: 'Event', start: now + 10000, finish: now + 20000, startingSeconds: 0,
    showTitans: true, showStart: true, link: 'signup', active: { text: 'Live', link: 'watch' } }]);
model.updateActiveEvents();
const row = model.activeEvents()[0];
const countdown = row.timer();
now += 1000;
model.updateActiveEvents();
assert.equal(model.activeEvents()[0], row);
assert.notEqual(row.timer(), countdown);
assert.equal(listWrites, 1);
now += 10000;
model.updateActiveEvents();
assert.equal(model.activeEvents()[0].text, 'Live');
assert.equal(model.activeEvents()[0].link, 'signup'); // stock captures link before applying active overrides
now += 20000;
model.updateActiveEvents();
assert.equal(model.activeEvents().length, 0);
model.reconnectToGameInfo({ timestamp: now, uberId: 'a', type: 'uber' });
assert.equal(model.canDirectReconnect(), true);
for (let i = 0; i < 5; i++) model.reconnectToGameInfoMaxAge(300000 + i);
assert.equal(timers.size, 1);
const tick = [...timers.values()][0];
timers.clear(); tick();
assert.equal(infoWrites, 1, 'clock must not notify persistent reconnect data');
assert.equal(timers.size, 1);
model.allowUbernetActions(false);
assert.equal(model.canDirectReconnect(), false);
assert.equal(timers.size, 0);
model.allowUbernetActions(true);
now += 400000;
const expire = [...timers.values()][0]; timers.clear(); expire();
assert.equal(model.canDirectReconnect(), false);
assert.equal(model.reconnectToGameInfo(), undefined);
let streamWrites = 0;
model.liveStreams.subscribe(() => streamWrites++);
const stream = { user_name: 'Player', title: 'Game', stream_url: 'watch', thumbnail_url: '{width}/{height}' };
model.fetchLiveStreams(); model.fetchTwitchChannels();
assert.equal(requests, 1);
pending.resolve({ data: [{ ...stream }, null, {}] });
assert.equal(model.liveStreamsReady(), true);
assert.equal(model.liveStreams().length, 1);
assert.equal(model.liveStreams()[0].preview_url_large, '440/248');
model.fetchLiveStreams(); pending.resolve({ data: [{ ...stream }] });
assert.equal(streamWrites, 1);
model.fetchLiveStreams(); pending.reject();
assert.equal(model.liveStreams().length, 0);
model.fetchLiveStreams(); pending.resolve({ data: [{ ...stream }] });
assert.equal(model.liveStreams().length, 1, 'retry after failure');
model.reconnectToGameInfo({ timestamp: now, type: 'local' });
exit();
assert.equal(timers.size, 0);
console.log('Start: stable event rows, phase transitions, reconnect clock and stream requests passed');
