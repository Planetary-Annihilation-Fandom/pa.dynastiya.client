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

    ko.computed(function () {
        var buildSet = model.buildSet();
        if (!buildSet) return;
        var hotkeys = model.hotkeys();
        var groups = buildSet.tabsByGroup();
        setTimeout(function () {
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
        var tabs = _.filter(model.buildSet().tabs(), function (tab) {
            return tab.visible() && tab.buildGroup() === params.group;
        });
        if (!tabs.length) return;
        model.activeBuildGroup(tabs[0].group());
        if (params.locked) model.activeBuildGroupLocked(params.locked);
    };

    // Фракционная тема панели: красная, если выбраны только строители Legion,
    // фиолетовая при смешанном выделении.
    loadCSS('coui://ui/mods/dynastiya.legion/css/legion_build_bar.css');
    loadScript('coui://ui/mods/dynastiya.legion/common.js');
    function faction(data) {
        var buildSet = data.buildSet();
        if (!buildSet) return null;
        var specs = _.keys(buildSet.selectedSpecs());
        var count = _.filter(specs, function (spec) {
            return _.includes(legion.builders, legion.specPath(spec));
        }).length;
        if (count && count === specs.length) return 'legion';
        return count ? 'mixed' : 'vanilla';
    }
    model.isLegion = function (data) { return faction(data) === 'legion'; };
    model.isMixed = function (data) { return faction(data) === 'mixed'; };
    $('.body_panel').attr('data-bind', 'css: { legion: model.isLegion($data), mixed: model.isMixed($data) }');
}());
