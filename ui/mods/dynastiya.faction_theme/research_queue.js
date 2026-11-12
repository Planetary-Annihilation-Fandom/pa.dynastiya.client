/* Preserve the source queue upgrade mechanic using actual factory queues, not
 * an order-history estimate. Native unit.build targets the selection; suppress
 * those temporary selections in UI and restore the player's selection on exit.
 * This adapter can be disabled independently of research availability. */
(function () {
    'use strict';
    model.dynastiyaResearchQueueMigrationEnabled = true;
    var previous = {}, pending = {}, running = false, stopped = false;
    var synthetic = false, target, desired = [], interrupted = false;
    var selectionHandler = handlers.selection;
    function idsOf(selection) { return _.flatten(_.values(selection && selection.spec_ids || {})); }
    handlers.selection = function (selection) {
        if (synthetic) {
            var ids = idsOf(selection);
            if (!ids.length || (ids.length === 1 && ids[0] === target)) return;
            // A real selection made during migration takes priority.
            desired = ids; interrupted = true;
        }
        return selectionHandler(selection);
    };
    function scan() {
        if (running || stopped || !Object.keys(pending).length) return;
        var replacements = pending; pending = {};
        var index = model.armyIndex(), world = api.getWorldView(0);
        if (index < 0 || !world || !model.dynastiyaResearchQueueMigrationEnabled) return;
        running = true;
        var planets = (model.planetListState() || {}).planets || [];
        Promise.all(planets.filter(function (p) { return p.id !== undefined; }).map(function (p) {
            return world.getArmyUnits(index, p.index);
        })).then(function (maps) {
            var ids = [];
            maps.forEach(function (map) {
                Object.keys(map).forEach(function (spec) {
                    var unit = model.unitSpecs && model.unitSpecs[spec];
                    if (unit && (unit.types || []).indexOf('UNITTYPE_Factory') >= 0) ids = ids.concat(map[spec]);
                });
            });
            if (!ids.length || stopped || model.armyIndex() !== index) return;
            return world.getUnitState(ids).then(function (states) {
                var factories = [];
                states.forEach(function (state, i) {
                    if (state && (state.build || []).some(function (entry) {
                        return replacements[dynastiyaFactionTheme.specPath(entry.spec)] && entry.count > 0;
                    })) factories.push(ids[i]);
                });
                if (!factories.length) return;
                desired = idsOf(model.selection()); interrupted = false; synthetic = true;
                return factories.reduce(function (chain, id) {
                    return chain.then(function () {
                        if (stopped || interrupted || model.armyIndex() !== index) return;
                        target = id;
                        return api.select.unitsById([id]).then(function (selected) {
                            if (!selected || interrupted) return;
                            return world.getUnitState([id]).then(function (current) {
                                if (stopped || interrupted || model.armyIndex() !== index) return;
                                var entries = current[0] && current[0].build || [];
                                return entries.reduce(function (orders, entry) {
                                    return orders.then(function () {
                                        var base = dynastiyaFactionTheme.specPath(entry.spec);
                                        var replacement = replacements[base];
                                        if (!replacement || entry.count <= 0 || interrupted) return;
                                        replacement += entry.spec.slice(base.length);
                                        return api.unit.cancelBuild(entry.spec, entry.count, false).then(function () {
                                            return api.unit.build(replacement, entry.count, false);
                                        });
                                    });
                                }, Promise.resolve());
                            });
                        });
                    });
                }, Promise.resolve());
            });
        }).then(finish, function (error) { console.error('Research queue migration', error); finish(); });
    }
    function finish() {
        var restore = synthetic;
        synthetic = false;
        function done() { running = false; scan(); }
        if (restore && !stopped) api.select.unitsById(desired).then(done, done);
        else done();
    }
    function changed() {
        var replacements = dynastiyaResearch.availability().replacements;
        Object.keys(replacements).forEach(function (spec) {
            if (previous[spec] !== replacements[spec]) pending[spec] = replacements[spec];
        });
        previous = replacements;
        scan();
    }
    dynastiyaResearch.state.subscribe(changed);
    changed();
    window.addEventListener('unload', function () { stopped = true; });
}());
