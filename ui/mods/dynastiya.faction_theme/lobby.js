/* Командиры фракций в лобби: класс рамки в выборе и в слотах игроков, подсказка
 * в чате. Цвет рамки задаёт CSS фракции. Привязки дописываются к исходным:
 * обработчики и visible остаются штатными. */
(function () {
    'use strict';
    if (model.dynastiyaFactionLobby) return;
    model.dynastiyaFactionLobby = true;
    var themes = dynastiyaFactionTheme;
    var factions = themes.factions.filter(function (faction) { return faction.lobby; });
    function owns(faction, commander) {
        return _.includes(faction.lobby.commanders, themes.specPath(commander));
    }

    ko.bindingHandlers.dynastiyaFactionCommander = {
        update: function (element, accessor) {
            var commander = ko.unwrap(accessor());
            factions.forEach(function (faction) {
                element.classList.toggle(faction.lobby.frame, owns(faction, commander));
            });
        }
    };
    function bind(selector, expression) {
        $(selector).each(function () {
            var original = this.getAttribute('data-bind') || '';
            this.setAttribute('data-bind', original + ', dynastiyaFactionCommander: ' + expression);
        });
    }
    bind('#commander-picker .div-commander-picker-item', '$data');
    bind('#ai-commander-picker .div-commander-picker-item', '$data');
    bind('.slot-player', "$data.isEmpty() ? '' : $data.commander()");

    // Подсказка нужна, только если сервер лобби предлагает командиров фракции.
    var hinted = {};
    function hint(commanders) {
        if (!model.localChatMessage) return;
        factions.forEach(function (faction) {
            if (hinted[faction.id] || !_.some(commanders, function (commander) { return owns(faction, commander); })) return;
            hinted[faction.id] = true;
            model.localChatMessage(loc(faction.lobby.title), loc(faction.lobby.hint));
        });
    }
    hint(model.commanders());
    model.commanders.subscribe(hint);
}());
