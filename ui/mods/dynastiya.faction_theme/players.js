/* Фракция игрока в live_game_players: класс маски на .player_masked и контурный
 * значок. Классы и картинки задаёт регистрация фракции (player), правила маски —
 * CSS фракции. Привязки дописываются до ko.applyBindings сцены. */
(function () {
    'use strict';
    if (model.dynastiyaFactionPlayers) return;
    model.dynastiyaFactionPlayers = true;
    var themes = dynastiyaFactionTheme;
    var vanillaIcon = 'img/players_list_panel/icon_player_outline.png';
    var classes = _.compact(_.flatten(themes.factions.map(function (faction) {
        return faction.player ? faction.player.classes : [];
    })));
    function variant(specs, kind) {
        var player = themes.player(specs);
        return player ? player.faction.player[kind][player.mixed ? 1 : 0] : null;
    }

    ko.bindingHandlers.dynastiyaFactionPlayer = {
        update: function (element, accessor) {
            var active = variant(ko.unwrap(accessor()), 'classes');
            classes.forEach(function (name) { element.classList.toggle(name, name === active); });
        }
    };
    ko.bindingHandlers.dynastiyaFactionPlayerIcon = {
        update: function (element, accessor) {
            element.src = variant(ko.unwrap(accessor()), 'icons') || vanillaIcon;
        }
    };
    $('.player_masked').each(function () {
        this.setAttribute('data-bind', (this.getAttribute('data-bind') || '') + ', dynastiyaFactionPlayer: $data.commanders || []');
    });
    $('img[src="' + vanillaIcon + '"]').attr('data-bind', 'dynastiyaFactionPlayerIcon: $data.commanders || []');
}());
