(function () {
    'use strict';
    // Replace the stock rule: it clones the whole system and rebuilds the list
    // even when the server merely echoes a system already in recent history.
    model.updateRecentSystems.dispose();
    var lastStored;
    model.updateRecentSystems = ko.computed(function () {
        if (!model.isGameCreator()) return;
        var system = model.system();
        var stored = localStorage.recentSystems;
        if (stored !== lastStored) {
            var systems;
            try {
                systems = JSON.parse(stored).systems;
                if (!Array.isArray(systems)) throw new Error('Invalid recent systems');
            } catch (error) {
                systems = [];
                stored = localStorage.recentSystems = '{"systems":[]}';
            }
            lastStored = stored;
            model.recentSystems(systems);
        }

        // peek avoids subscribing a rule that also writes to this observable.
        var recent = model.recentSystems.peek();
        if (!system || _.isEmpty(system.planets) || _.some(recent, function (entry) {
            return entry.name === system.name;
        })) return;

        recent = [_.cloneDeep(system)].concat(recent).slice(0, 5);
        lastStored = localStorage.recentSystems = JSON.stringify({ systems: recent });
        model.recentSystems(recent);
    });
}());
