// node tools/check-settings.cjs <PA media directory>
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const media = process.argv[2];
const ko = require(path.join(media, 'ui/main/shared/js/thirdparty/knockout-3.5.1.debug.js'));
const _ = require(path.join(media, 'ui/main/shared/js/thirdparty/lodash-4.7.20.js'));
_.contains = _.includes;
const timers = new Map();
let serial = 0, requests = [], unload, initialVisibility;
const api = { Panel: { pageName: 'game', pageId: 1 }, settings: {
    isDirty: ko.observable(false), isDefault: ko.observable(true), data: {},
    getSynchronous(group, key) { return this.data[group + '.' + key] ?? this.definitions[group].settings[key].default; },
    get(group, key) { return { then: fn => fn(this.getSynchronous(group, key)) }; },
    set(group, key, value) { this.data[group + '.' + key] = value; this.observableMap[group][key](value); },
    restoreDefaults() { this.data = {}; },
    restoreGroupDefaults(group) { for (const key of Object.keys(this.data)) if (key.startsWith(group + '.')) delete this.data[key]; },
    definitions: {
        keyboard: { settings: Object.fromEntries(['a', 'b', 'c'].map(key => [key, {
            type: 'keybind', default: key, display_group: 'group', display_sub_group: 'sub'
        }])) },
        audio: { settings: { device: { type: 'select', default: '', empty: 'Default', refresh: 5,
            options: () => [], deferred: () => new Promise((resolve, reject) => requests.push({ resolve, reject }))
        } } }
    }
} };
const $ = () => ({ ready: fn => fn(), focus() {}, blur() {}, on: (name, fn) => { unload = fn; } });
const ctx = vm.createContext({ ko, _, $, api, document: {}, window: {}, console,
    loc: x => x, modify_keybinds() {}, scene_mod_list: {},
    app: { registerWithCoherent() {} }, engine: { call() {} },
    setTimeout(fn) { const id = ++serial; timers.set(id, fn); return id; },
    clearTimeout(id) { timers.delete(id); }
});
ko.applyBindings = () => {};
const settingsApi = fs.readFileSync(path.join(media, 'ui/main/shared/js/api/settings.js'), 'utf8');
vm.runInContext(settingsApi.slice(settingsApi.indexOf('ko.extenders.setting =')), ctx);
vm.runInContext(fs.readFileSync(path.join(media, 'ui/main/game/settings/settings.js'), 'utf8'), ctx);
const model = ctx.model;
model.inPanel(true);
api.Panel.query = () => ({ then(fn) { initialVisibility = fn; } });
let conflictPasses = 0;
const original = model.updateKeyConflicts;
model.updateKeyConflicts = () => { conflictPasses++; original(); };
vm.runInContext(fs.readFileSync(path.join(__dirname, '../ui/mods/dynastiya.settings/settings.js'), 'utf8'), ctx);
const flush = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };
const tick = () => { const [id, fn] = timers.entries().next().value; timers.delete(id); fn(); };
(async () => {
    model.active(false);model.active(true);
    initialVisibility(false); // old query response must not override a newer opening
    model.settingsItemMap()['keyboard.b'].value('a');
    assert.equal(model.settingsItemMap()['keyboard.a'].conflicts().length, 1);
    model.activeSettingsGroupIndex(1);
    model.restoreGroupDefaults();
    assert.equal(model.settingsItemMap()['keyboard.a'].conflicts().length, 1);
    model.activeSettingsGroupIndex(0);
    conflictPasses = 0;
    model.restoreGroupDefaults();
    assert.equal(conflictPasses, 1);
    assert.equal(model.settingsItemMap()['keyboard.a'].conflicts().length, 0);
    // Both old and replacement initial requests resolve; only the current model keeps a timer.
    requests.splice(0).forEach(request => request.resolve([{ text: 'A', value: 'A' }]));
    await flush();
    assert.equal(timers.size, 0, 'hidden audio tab must not poll after initial completion');
    model.activeSettingsGroupIndex(1);
    assert.equal(requests.length, 1, 'reopening refreshes available devices');
    requests.shift().resolve([{ text: 'A', value: 'A' }]); await flush();
    assert.equal(timers.size, 1);
    model.active(false);assert.equal(timers.size,0,'stock parents can suspend through focus');
    model.active(true);assert.equal(requests.length,1,'stock parents can reopen without owner messages');
    requests.shift().resolve([{text:'A',value:'A'}]);await flush();
    ctx.handlers['dynastiya.settingsVisible'](true);
    model.active(false);assert.equal(timers.size,1,'managed visibility is independent of focus');
    const audio = model.settingsItemMap()['audio.device'];
    let writes = 0;
    audio.selectOptions.subscribe(() => writes++);
    tick();
    audio.reloadSelectOptions();
    assert.equal(requests.length, 1);
    assert.equal(writes, 0);
    requests.shift().resolve([{ text: 'A', value: 'A' }]); await flush();
    assert.equal(writes, 0);
    tick(); requests.shift().reject(new Error('unavailable')); await flush();
    assert.equal(timers.size, 1);
    tick(); requests.shift().resolve([{ text: 'B', value: 'B' }]); await flush();
    assert.equal(writes, 1);
    tick();
    audio.value('C');
    requests.shift().resolve([{ text: 'B', value: 'B' }]); await flush();
    assert.equal(writes, 1);
    assert.equal(requests.length, 1);
    requests.shift().resolve([{ text: 'C', value: 'C' }]); await flush();
    assert.equal(writes, 2);
    tick();
    model.activeSettingsGroupIndex(0);
    requests.shift().resolve([{ text: 'C', value: 'C' }]); await flush();
    assert.equal(timers.size, 0, 'late response must not restart a hidden tab');
    model.activeSettingsGroupIndex(1);
    assert.equal(requests.length, 1);
    requests.shift().resolve([{ text: 'C', value: 'C' }]); await flush();
    assert.equal(timers.size, 1, 'reopening installs one refresh timer');
    ctx.handlers['dynastiya.settingsVisible'](false);
    assert.equal(timers.size, 0, 'whole settings panel can close on the audio tab');
    audio.reloadSelectOptions();assert.equal(requests.length,0);
    ctx.handlers['dynastiya.settingsVisible'](true);
    assert.equal(requests.length,1,'whole-panel reopening refreshes audio without changing tabs');
    requests.shift().resolve([{text:'C',value:'C'}]);await flush();
    model.settingsItemMap()['keyboard.a'].setAsActiveKey();
    assert.equal(model.settingsItemMap()['keyboard.a'].active(),true);
    ctx.handlers['dynastiya.settingsVisible'](false);
    assert.equal(model.settingsItemMap()['keyboard.a'].active(),false,'closing cancels retained key capture');
    ctx.handlers['dynastiya.settingsVisible'](true);
    requests.shift().resolve([{text:'C',value:'C'}]);await flush();
    tick();
    unload();
    requests.shift().resolve([{ text: 'C', value: 'C' }]); await flush();
    assert.equal(writes, 2);
    assert.equal(timers.size, 0);
    console.log('Settings: reset conflicts, stable audio choices, selection race, retry and retired-model cleanup passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
