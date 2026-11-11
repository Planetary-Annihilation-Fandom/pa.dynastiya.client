(function () {
    'use strict';
    if (model.dynastiyaLegionBuildBar) return;
    model.dynastiyaLegionBuildBar = true;

    // Вкладки Legion идут после стандартных. Раскладку юнитов по ним задаёт
    // shared_build.js; подпись и горячая клавиша берутся у вкладки MLA того же типа.
    if (model.BuildSet && model.BuildSet.tabsTemplate) {
        model.BuildSet.tabsTemplate = model.BuildSet.tabsTemplate.concat([
            ['L_factory', '!LOC:factory', true],
            ['L_combat', '!LOC:combat', true],
            ['L_utility', '!LOC:utility', true],
            ['L_vehicle', '!LOC:vehicle'],
            ['L_bot', '!LOC:bot'],
            ['L_air', '!LOC:air'],
            ['L_sea', '!LOC:sea'],
            ['L_orbital', '!LOC:orbital', true],
            ['L_orbital_structure', '!LOC:orbital structure', true],
            ['L_ammo', '!LOC:ammo', true]
        ]);
    }

    var tabTimer;
    ko.computed(function () {
        var buildSet = model.buildSet();
        clearTimeout(tabTimer);
        if (!buildSet) return;
        var hotkeys = model.hotkeys();
        var groups = buildSet.tabsByGroup();
        tabTimer = setTimeout(function () {
            if (model.buildSet() !== buildSet) return;
            _.forEach(buildSet.tabs(), function (tab) {
                var baseTab = tab.group().replace('L_', '');
                if (!tab.label() && groups[baseTab]) tab.label(groups[baseTab].label());
                tab.hotkey(hotkeys['tab_' + baseTab] || '');
                tab.buildGroup = tab.buildGroup || ko.observable(baseTab);
                tab.buildGroup(baseTab);
            });
        }, 0);
    });

    // Горячая клавиша вкладки открывает видимую вкладку своего типа: у строителя
    // Legion это L_bot, у строителя MLA — bot.
    handlers.start_build_sequence = model.startBuildSequence = function (params) {
        var buildSet = model.buildSet();
        if (!buildSet) return;
        var tabs = _.filter(buildSet.tabs(), function (tab) {
            var group = tab.buildGroup ? tab.buildGroup() : tab.group().replace('L_', '');
            return tab.visible() && group === params.group;
        });
        if (!tabs.length) return;
        model.activeBuildGroup(tabs[0].group());
        if (params.locked) model.activeBuildGroupLocked(params.locked);
    };

}());
