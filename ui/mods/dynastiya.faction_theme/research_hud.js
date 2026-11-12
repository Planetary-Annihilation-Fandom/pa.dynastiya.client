/* Completed marker units drive research. Polling is scoped to a research faction;
 * one request at a time, with results discarded after army/match changes. */
(function () {
    'use strict';
    var research = dynastiyaResearch, stopped = false, timer, generation = 0;
    var match, army;
    var world = api.getWorldView(0);
    function publish() {
        var value = research.state();
        if (match && army >= 0 && !model.isSpectator() && !model.showTimeControls()) {
            try { localStorage[research.key] = JSON.stringify(value); } catch (e) {}
        }
        _.forEach(api.panels, function (panel) {
            if (panel && panel.id !== undefined && panel.id !== null && panel.message) panel.message('dynastiya.research', value);
        });
    }
    model.dynastiyaResearchState = function () { return research.state(); };
    research.state.subscribe(publish);
    function context() {
        var nextMatch = ko.unwrap(model.lobbyId) || localStorage.dynastiya_research_match || null;
        var nextArmy = model.armyIndex();
        if (nextMatch === match && nextArmy === army) return;
        match = nextMatch; army = nextArmy; generation++;
        if (match) localStorage.dynastiya_research_match = match;
        var saved = research.read();
        var restore = match && saved && saved.match === match && saved.army === army && !model.isSpectator() && !model.showTimeControls();
        research.accept({ match: match, army: army, completed: restore ? saved.completed : [] });
        publish();
    }
    function schedule() { if (!stopped) timer = setTimeout(scan, 1000); }
    function scan() {
        if (stopped) return;
        context();
        var player = _.find(model.players() || [], function (p) { return p.id === model.armyId(); });
        var hasResearch = player && _.some(player.commanders, function (spec) {
            var faction = dynastiyaFactionTheme.factionOf(spec);
            return faction && faction.research;
        });
        research.accept(_.extend({}, research.state(), { enabled: !!hasResearch }));
        if (!world || army === undefined || army < 0 || !hasResearch) return schedule();
        var current = generation;
        var planets = (model.planetListState() || {}).planets || [];
        Promise.all(planets.filter(function (p) { return p.id !== undefined; }).map(function (p) {
            return world.getArmyUnits(army, p.index);
        })).then(function (maps) {
            if (stopped || current !== generation) return;
            var ids = [], markers = [];
            research.definitions.forEach(function (definition) {
                definition.unlocks.forEach(function (pair) {
                    if (research.state().completed.indexOf(pair[0]) >= 0) return;
                    maps.forEach(function (map) {
                        Object.keys(map).forEach(function (spec) {
                            if (dynastiyaFactionTheme.specPath(spec) !== pair[0]) return;
                            map[spec].forEach(function (id) { ids.push(id); markers.push(pair[0]); });
                        });
                    });
                });
            });
            if (!ids.length) return;
            return world.getUnitState(ids).then(function (states) {
                if (stopped || current !== generation) return;
                var completed = research.state().completed.slice();
                (_.isArray(states) ? states : [states]).forEach(function (unit, i) {
                    if (unit && (unit.built_frac === undefined || unit.built_frac >= 1) && completed.indexOf(markers[i]) < 0)
                        completed.push(markers[i]);
                });
                research.accept({ match: match, army: army, completed: completed, enabled: !!hasResearch });
            });
        }).then(schedule, function (error) { console.error('Faction research', error); schedule(); });
    }
    // Both click builds and keyboard builds pass through these stock entry points.
    ['executeStartBuild', 'buildItemBySpec'].forEach(function (name) {
        var original = model[name];
        if (!original) return;
        model[name] = function (value) {
            var spec = name === 'executeStartBuild' ? value.item : value;
            var resolved = research.resolve(spec);
            if (!resolved) return;
            return original.call(model, name === 'executeStartBuild' ? _.extend({}, value, { item: resolved }) : resolved);
        };
    });
    window.addEventListener('unload', function () { stopped = true; generation++; clearTimeout(timer); });
    if (ko.isObservable(model.armyIndex)) model.armyIndex.subscribe(context);
    if (ko.isObservable(model.lobbyId)) model.lobbyId.subscribe(context);
    scan();
}());
