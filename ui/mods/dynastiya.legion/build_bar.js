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

    // Вкладки L_* создаются в конструкторе набора без подписи. Подпись и группа
    // задаются там же, до первой отрисовки. Горячая клавиша вычисляется: штатный
    // расчёт при каждой смене вкладки записывает '' для неизвестной ему группы
    // tab_L_*, и эта запись игнорируется.
    var BuildSet = model.BuildSet;
    model.BuildSet = function () {
        BuildSet.apply(this, arguments);
        var tabs = this.tabs();
        var labels = {};
        tabs.forEach(function (tab) { labels[tab.group()] = tab.label(); });
        tabs.forEach(function (tab) {
            var baseTab = tab.group().replace('L_', '');
            tab.buildGroup = ko.observable(baseTab);
            if (tab.group() === baseTab) return;
            if (!tab.label() && labels[baseTab]) tab.label(labels[baseTab]);
            tab.hotkey = ko.computed({
                read: function () { return model.hotkeys()['tab_' + baseTab] || ''; },
                write: function () {}
            });
        });
    };
    model.BuildSet.prototype = BuildSet.prototype;
    Object.keys(BuildSet).forEach(function (key) { model.BuildSet[key] = BuildSet[key]; });

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
