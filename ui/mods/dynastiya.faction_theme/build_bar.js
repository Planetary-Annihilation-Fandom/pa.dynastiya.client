/* Вкладки фракций в билдбаре до общего решения #33. Вкладки идут после штатных в
 * порядке регистрации; раскладку юнитов по ним задаёт shared_build.js фракции.
 *
 * Подпись и группа задаются в конструкторе набора, до первой отрисовки. Горячая
 * клавиша вычисляется по штатной вкладке того же типа: штатный расчёт при каждой
 * смене вкладки записывает '' для неизвестной ему группы, и эта запись
 * игнорируется. */
(function () {
    'use strict';
    if (model.dynastiyaFactionBuildBar) return;
    model.dynastiyaFactionBuildBar = true;

    var bases = {};
    var template = [];
    dynastiyaFactionTheme.factions.forEach(function (faction) {
        (faction.tabs || []).forEach(function (tab) {
            bases[tab[0]] = tab[1];
            template.push([tab[0], '!LOC:' + tab[1].replace(/_/g, ' '), !!tab[2]]);
        });
    });
    if (!template.length || !model.BuildSet) return;

    var BuildSet = model.BuildSet;
    BuildSet.tabsTemplate = BuildSet.tabsTemplate.concat(template);
    model.BuildSet = function () {
        if (model.dynastiyaResearchParams) arguments[0] = model.dynastiyaResearchParams(arguments[0]);
        BuildSet.apply(this, arguments);
        var tabs = this.tabs();
        var labels = {};
        tabs.forEach(function (tab) { labels[tab.group()] = tab.label(); });
        tabs.forEach(function (tab) {
            var base = bases[tab.group()];
            tab.buildGroup = base || tab.group();
            if (!base) return;
            if (labels[base]) tab.label(labels[base]);
            // pureComputed не держит подписку, пока вкладку не показывают, и
            // старые наборы не накапливают вычисления.
            tab.hotkey = ko.pureComputed({
                read: function () { return model.hotkeys()['tab_' + base] || ''; },
                write: function () {}
            });
        });
    };
    model.BuildSet.prototype = BuildSet.prototype;
    Object.keys(BuildSet).forEach(function (key) { model.BuildSet[key] = BuildSet[key]; });

    // Горячая клавиша вкладки открывает первую видимую вкладку своего типа:
    // у строителя Legion это L_bot, у строителя Exiles — t_bot, у MLA — bot.
    handlers.start_build_sequence = model.startBuildSequence = function (params) {
        var buildSet = model.buildSet();
        if (!buildSet) return;
        var tab = _.find(buildSet.tabs(), function (tab) {
            return tab.visible() && (tab.buildGroup || tab.group()) === params.group;
        });
        if (!tab) return;
        model.activeBuildGroup(tab.group());
        if (params.locked) model.activeBuildGroupLocked(params.locked);
    };
}());
