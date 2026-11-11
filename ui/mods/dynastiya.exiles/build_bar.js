(function () {
    'use strict';
    if (model.dynastiyaExilesBuildBar) return;
    model.dynastiyaExilesBuildBar = true;
    var groups = {"t_factory": "factory", "t_combat": "combat", "t_economy": "utility", "t_tank": "vehicle", "t_bot": "bot", "t_air": "air", "t_naval": "sea", "t_orbital": "orbital", "t_orbital_structure": "orbital_structure", "t_ammo": "ammo", "t_foundry": "vehicle"};
    var names = ["t_air", "t_ammo", "t_bot", "t_combat", "t_economy", "t_factory", "t_foundry", "t_naval", "t_tank"];
    var BuildSet = model.BuildSet;
    BuildSet.tabsTemplate = BuildSet.tabsTemplate.concat(names.map(function (group) {
        var base = groups[group];
        return [group, '!LOC:' + base.replace('_', ' '), ['factory', 'combat', 'utility', 'orbital', 'orbital_structure', 'ammo'].indexOf(base) >= 0];
    }));
    model.BuildSet = function () {
        BuildSet.apply(this, arguments);
        var labels = {};
        this.tabs().forEach(function (tab) { labels[tab.group()] = tab.label(); });
        this.tabs().forEach(function (tab) {
            var base = groups[tab.group()];
            if (!base) return;
            tab.buildGroup(base);
            tab.label(labels[base] || loc('!LOC:' + base.replace('_', ' ')));
            tab.hotkey = ko.computed({
                read: function () { return model.hotkeys()['tab_' + base] || ''; },
                write: function () {}
            });
        });
    };
    model.BuildSet.prototype = BuildSet.prototype;
    Object.keys(BuildSet).forEach(function (key) { model.BuildSet[key] = BuildSet[key]; });
}());
