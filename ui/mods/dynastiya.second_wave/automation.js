/* Башни-сборщики Second Wave после постройки патрулируют вокруг себя и помогают
 * строить. Один обход за раз; команда выдаётся готовой башне один раз и
 * сбрасывается при смене управляемой армии. */
(function () {
    'use strict';
    if (model.dynastiyaSecondWaveAutomation) return;
    model.dynastiyaSecondWaveAutomation = true;
    var towers = [
        '/pa/units/addon/fab_tower/fab_tower.json',
        '/pa/units/addon/adv_fab_tower/adv_fab_tower.json',
        '/pa/units/l_addon/fab_turret/fab_turret.json',
        '/pa/units/l_addon/adv_fab_turret/adv_fab_turret.json',
        '/pa/units/b_addon/fab_tower/fab_tower.json',
        '/pa/units/b_addon/adv_fab_tower/adv_fab_tower.json'
    ];
    var stopped = false;
    var timer;
    var army;
    var commanded = {};
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
                var ids = [];
                _.forOwn(units, function (list, spec) {
                    if (towers.indexOf(dynastiyaFactionTheme.specPath(spec)) < 0) return;
                    list.forEach(function (id) {
                        seen[id] = true;
                        if (!commanded[id]) ids.push(id);
                    });
                });
                if (!ids.length) return;
                return view.getUnitState(ids).then(function (states) {
                    if (stopped || army !== index) return;
                    if (!_.isArray(states)) states = [states];
                    return Promise.all(states.map(function (unit, i) {
                        if (!unit || (unit.built_frac !== undefined && unit.built_frac < 1)) return;
                        var id = ids[i];
                        return view.sendOrder({ units: [id], command: 'patrol',
                            location: { planet: unit.planet, pos: unit.pos }, queue: false }).then(function (accepted) {
                            if (accepted && !stopped && army === index) commanded[id] = true;
                        });
                    }));
                });
            });
        })).then(function () {
            Object.keys(commanded).forEach(function (id) { if (!seen[id]) delete commanded[id]; });
            schedule();
        }, function (error) { console.error('Second Wave automation', error); schedule(); });
    }
    scan();
}());
