/* Источник темы — текущая управляемая армия, а не однажды открытая панель игроков. */
(function () {
    'use strict';
    if (model.dynastiyaLegionTheme) return;
    var theme = ko.computed(function () {
        var player = _.find(model.players() || [], function (player) { return player.id === model.armyId(); });
        return legion.faction(player ? player.commanders : []);
    });
    model.dynastiyaLegionTheme = function () { return theme(); };
    function publish(value) {
        ['players', 'selection', 'planets', 'control_group_bar', 'econ', 'options_bar',
            'build_hover', 'time_bar', 'menu'].forEach(function (name) {
            if (api.panels[name]) api.panels[name].message('dynastiya.legion.theme', value);
        });
    }
    theme.subscribe(publish);
    publish(theme());
    // Поздно открытые панели запрашивают это же состояние через panel.invoke.
}());
