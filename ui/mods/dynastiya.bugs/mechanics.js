/* A completed charging portal fires its secondary weapon once. */
(function () {
    'use strict';
    var dialog;
    handlers['dynastiya.research.open'] = function () {
        if (!dialog) {
            dialog = document.createElement('panel');
            dialog.id = 'dynastiya_research_dialog';
            dialog.setAttribute('src', 'coui://ui/mods/dynastiya.bugs/research_dialog.html');
            dialog.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;z-index:10000;';
            document.body.appendChild(dialog);
            api.Panel.bindPanels();
        } else {
            dialog.style.display = 'block';
            api.panels.dynastiya_research_dialog.message('dynastiya.research.open');
        }
    };
    handlers['dynastiya.research.close'] = function () { if (dialog) dialog.style.display = 'none'; };
    var stopped = false, timer, commanded = {}, army;
    function scan() {
        var view = api.getWorldView(0), index = model.armyIndex();
        if (army !== index) { commanded = {}; army = index; }
        var planets = (model.planetListState() || {}).planets || [];
        if (stopped) return;
        Promise.all(planets.filter(function (p) { return p.id !== undefined && index >= 0; }).map(function (p) {
            return view.getArmyUnits(index, p.index).then(function (units) {
                var ids = [];
                Object.keys(units).forEach(function (spec) {
                    if (dynastiyaFactionTheme.specPath(spec) === '/pa/units/structure/control_node/portal/portal_charging.json')
                        ids = ids.concat(units[spec].filter(function (id) { return !commanded[id]; }));
                });
                if (!ids.length) return;
                return view.getUnitState(ids).then(function (states) {
                    if (stopped || army !== index) return;
                    states.forEach(function (unit, i) {
                        if (!unit || (unit.built_frac !== undefined && unit.built_frac < 1)) return;
                        commanded[ids[i]] = true;
                        var id = ids[i];
                        view.sendOrder({ units: [id], command: 'fire_secondary_weapon',
                            location: { planet: unit.planet, multi_pos: [unit.pos, unit.pos] }, queue: true }).then(function (accepted) {
                            if (!accepted) delete commanded[id];
                        });
                    });
                });
            });
        })).then(schedule, function (error) { console.error('Bugs portal', error); schedule(); });
    }
    function schedule() { if (!stopped) timer = setTimeout(scan, 1000); }
    window.addEventListener('unload', function () { stopped = true; clearTimeout(timer); });
    scan();
}());
