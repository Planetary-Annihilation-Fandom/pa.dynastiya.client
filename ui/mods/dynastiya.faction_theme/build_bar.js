/* Вкладки фракций в билдбаре. Вкладки идут после штатных в порядке регистрации;
 * раскладку юнитов по ним задаёт shared_build.js фракции.
 *
 * Если выделенные строители относятся к разным фракциям, билдбар показывает
 * вкладки одной фракции и переключатель фракций перед ними (по Build Bar Tabs,
 * Ferretmaster). Фракция вкладки берётся из реестра; незарегистрированные
 * вкладки — MLA. Выбор игрока сохраняется для следующих выделений.
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
    var owners = {};
    var template = [];
    var order = ['mla'];
    var titles = { mla: '!LOC:MLA' };
    dynastiyaFactionTheme.factions.forEach(function (faction) {
        if (faction.tabs && faction.tabs.length) {
            order.push(faction.id);
            titles[faction.id] = faction.lobby && faction.lobby.title || '!LOC:' + faction.id;
        }
        (faction.tabs || []).forEach(function (tab) {
            bases[tab[0]] = tab[1];
            owners[tab[0]] = faction.id;
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
        splitByFaction(this, tabs);
    };
    model.BuildSet.prototype = BuildSet.prototype;
    Object.keys(BuildSet).forEach(function (key) { model.BuildSet[key] = BuildSet[key]; });

    function ownerOf(tab) { return owners[tab.group()] || 'mla'; }
    model.dynastiyaBuildFaction = ko.observable('');

    // Подписка идёт после штатной: та уже отметила вкладки с постройками
    // выделения. Этот список сохраняется, и смена фракции скрывает лишние
    // вкладки из него без повторного разбора выделения.
    function splitByFaction(set, tabs) {
        var filled = [];
        var shown = '';
        set.dynastiyaFactions = ko.observableArray([]);
        set.dynastiyaFaction = ko.observable('');
        set.dynastiyaSplit = function () {
            var present = _.sortBy(_.uniq(filled.map(ownerOf)), function (id) { return order.indexOf(id); });
            var chosen = model.dynastiyaBuildFaction();
            var active = present.indexOf(chosen) >= 0 ? chosen : present[0] || '';
            filled.forEach(function (tab) { tab.visible(ownerOf(tab) === active); });
            set.dynastiyaFaction(active);
            var list = present.length > 1 ? present : [];
            // Тот же состав фракций не пересоздаёт кнопки переключателя.
            if (list.join() === shown) return;
            shown = list.join();
            set.dynastiyaFactions(list.map(function (id) { return { id: id, title: titles[id] }; }));
        };
        set.selectedSpecs.subscribe(function () {
            filled = tabs.filter(function (tab) { return tab.visible(); });
            set.dynastiyaSplit();
        });
    }

    // Другая фракция — другой ряд вкладок и сетка. Панель уже видна, поэтому
    // replace удерживает прежний кадр до готовности нового. Если открытая
    // вкладка скрывается, ключ сразу строится без неё: сброс вкладки внутри
    // apply тогда не запускает второй показ.
    model.dynastiyaSelectBuildFaction = function (id) {
        var set = model.buildSet();
        if (!set || !set.dynastiyaSplit || set.dynastiyaFaction() === id) return;
        var tab = model.activeTab();
        var keep = !!tab && ownerOf(tab) === id;
        model.dynastiyaBuildFaction(id);
        var apply = function () {
            set.dynastiyaSplit();
            if (tab && !keep) model.clearBuildSequence();
        };
        var presentation = api.Panel.dockPresentation;
        var key = model.dynastiyaBuildBarKey && model.dynastiyaBuildBarKey(keep ? model.activeBuildGroup() : null);
        if (presentation && key !== undefined && key !== null) presentation.replace(null, apply, key);
        else apply();
    };

    // Сцена подключает моды до ko.applyBindings, поэтому разметка
    // переключателя получает привязки вместе со штатной.
    $('.div_build_bar_tab_cont .tab_grp').prepend(
        '<!-- ko with: buildSet() --><!-- ko if: $data.dynastiyaFactions && dynastiyaFactions().length -->' +
        '<span class="tab_grp_body dyn-build-factions">' +
        '<!-- ko foreach: dynastiyaFactions -->' +
        '<span class="span_build_bar_tab dyn-build-faction" data-bind="' +
        'css: { span_build_bar_tab_active: $parent.dynastiyaFaction() === id },' +
        ' click: function () { $root.dynastiyaSelectBuildFaction(id); },' +
        ' click_sound: \'default\', rollover_sound: \'default\'">' +
        '<span class="span_build_bar_tab_label" data-bind="text: loc(title)"></span></span>' +
        '<!-- /ko --></span><!-- /ko --><!-- /ko -->');

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
