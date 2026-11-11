/* Созревание добытчиков и автопомощь комплекса. Один обход за раз; команды
 * выдаются готовому юниту один раз и сбрасываются при смене управляемой армии. */
(function () {
    'use strict';
    if (model.dynastiyaExilesAutomation) return;
    model.dynastiyaExilesAutomation = true;
    var stopped = false;
    var timer;
    var army;
    var commanded = {};
    var extractors = [
        '/pa/units/land/t_metal_extractor_0/t_metal_extractor_0.json',
        '/pa/units/land/t_metal_extractor_01/t_metal_extractor_01.json'
    ];
    var complex = '/pa/units/structures/fab_complex/adv_fab_turret.json';
    window.addEventListener('unload', function () { stopped = true; clearTimeout(timer); });
    function schedule() { if (!stopped) timer = setTimeout(scan, 5000); }
    function scan() {
        if (stopped) return;
        var view = api.getWorldView(0);
        var index = model.armyIndex ? model.armyIndex() : model.armyId();
        if (!view || index === undefined || index < 0) return schedule();
        if (army !== index) { commanded = {}; army = index; }
        var state = model.planetListState();
        var planets = state && state.planets || [];
        var seen = {};
        Promise.all(planets.filter(function (planet) { return planet.id !== undefined; }).map(function (planet) {
            return view.getArmyUnits(index, planet.index).then(function (units) {
                var ids = [], specs = {};
                _.forOwn(units, function (list, spec) {
                    var path = exiles.specPath(spec);
                    if (path !== complex && extractors.indexOf(path) < 0) return;
                    list.forEach(function (id) {
                        seen[id] = true;
                        if (!commanded[id]) { ids.push(id); specs[id] = path; }
                    });
                });
                if (!ids.length) return;
                return view.getUnitState(ids).then(function (states) {
                    if (stopped || army !== index) return;
                    if (!_.isArray(states)) states = [states];
                    return Promise.all(states.map(function (unit, i) {
                        if (!unit || (unit.built_frac !== undefined && unit.built_frac < 1)) return;
                        var id = ids[i];
                        var extractor = specs[id] !== complex;
                        var location = { planet: unit.planet, pos: unit.pos };
                        if (extractor) location.multi_pos = [unit.pos, unit.pos];
                        return view.sendOrder({ units: [id], command: extractor ? 'fire_secondary_weapon' : 'patrol',
                            location: location, queue: extractor }).then(function (accepted) {
                            if (accepted && !stopped && army === index) commanded[id] = true;
                        });
                    }));
                });
            });
        })).then(function () {
            Object.keys(commanded).forEach(function (id) { if (!seen[id]) delete commanded[id]; });
            schedule();
        }, function (error) { console.error('Exiles automation', error); schedule(); });
    }
    scan();
}());
