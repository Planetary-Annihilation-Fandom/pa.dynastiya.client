/* Тема армии в live_game: источник — командиры управляемой армии. */
(function () {
    'use strict';
    if (model.dynastiyaFactionTheme) return;
    var themes = dynastiyaFactionTheme;
    var theme = ko.computed(function () {
        var player = _.find(model.players() || [], function (player) { return player.id === model.armyId(); });
        return themes.of(player ? player.commanders : []);
    });
    // Панели, открытые позже, запрашивают состояние через panel.invoke.
    model.dynastiyaFactionTheme = function () { return theme(); };
    function publish(value) {
        // Начальное значение для новых окон: localStorage общий для всех панелей,
        // и панель применяет тему ещё до первого показа, без ответа на запрос.
        try { localStorage.dynastiya_faction_theme = value; } catch (e) {}
        _.forEach(api.panels, function (panel) {
            if (panel && panel.message) panel.message('dynastiya.faction.theme', value);
        });
    }
    theme.subscribe(publish);
    publish(theme());
}());
