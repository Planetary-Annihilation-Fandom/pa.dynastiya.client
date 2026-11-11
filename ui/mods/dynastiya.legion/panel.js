/* Привязки и картинки Legion в панелях HUD. Тему армии и классы body ведёт
 * dynastiya.faction_theme/panel.js; здесь только то, что относится к Legion. */
(function () {
    'use strict';
    if (model.dynastiyaLegionPanel) return;
    var theme = dynastiyaFactionTheme.panel;
    model.dynastiyaLegionPanel = theme.army;
    var page = theme.page;
    var image = theme.image;

    // Привязки дописываются до ko.applyBindings сцены, сохраняя click/mousedown/visible
    // и устойчивые строки #22.
    ko.bindingHandlers.dynastiyaLegionUnit = {
        update: function (element, accessor) {
            element.classList.toggle('legion', legion.isUnit(ko.unwrap(accessor())));
        }
    };
    if (page === 'live_game_selection.html') {
        $('.div_unit_selection').each(function () {
            this.setAttribute('data-bind', (this.getAttribute('data-bind') || '') + ', dynastiyaLegionUnit: type');
        });
    }
    if (page === 'live_game_players.html') {
        ko.bindingHandlers.dynastiyaLegionArmy = {
            update: function (element, accessor) {
                var value = legion.faction(ko.unwrap(accessor()));
                element.classList.toggle('legcom', value === 'legion');
                element.classList.toggle('mixcom', value === 'mixed');
            }
        };
        $('.player_masked').each(function () {
            this.setAttribute('data-bind', (this.getAttribute('data-bind') || '') + ', dynastiyaLegionArmy: $data.commanders || []');
        });
        ko.bindingHandlers.dynastiyaLegionArmyIcon = {
            update: function (element, accessor) {
                var value = legion.faction(ko.unwrap(accessor()));
                element.src = value === 'vanilla' ? 'img/players_list_panel/icon_player_outline.png' :
                    'coui://ui/mods/dynastiya.legion/img/icon_player_outline_' + (value === 'legion' ? 'l' : 'm') + '.png';
            }
        };
        $('img[src="img/players_list_panel/icon_player_outline.png"]').attr('data-bind',
            'dynastiyaLegionArmyIcon: $data.commanders || []');
    }

    // Обёртки создаются один раз. Исходный getter продолжает выбирать картинку
    // по состоянию кнопки, а тема меняет только каталог уже существующего ресурса.
    function imageGetter(name, folder) {
        var original = model[name];
        if (!ko.isObservable(original)) return;
        model[name] = ko.pureComputed(function () { return image(original(), folder); });
    }
    if (page === 'live_game_players.html') {
        imageGetter('playerPanelToggleImage', 'controls');
        imageGetter('spectatorPanelToggleImage', 'controls');
    }
    if (page === 'live_game_planets.html') imageGetter('toggleImage', 'controls');
    if (page === 'live_game_options_bar.html') {
        imageGetter('pipImage', 'ingame_options_bar');
        imageGetter('uberBarImage', 'ingame_options_bar');
    }
    if (page === 'live_game_control_group_bar.html') {
        var originalSource = model.imageSourceForType;
        model.imageSourceForType = function (type) { return image(originalSource(type), 'control_group_bar'); };
    }
    if (page === 'live_game_selection.html') {
        var originalTypes = model.typeArray;
        model.typeArray = ko.pureComputed(function () {
            return originalTypes().map(function (row) {
                return _.assign({}, row, { source: image(row.source, 'control_group_bar') });
            });
        });
    }
    // Только статичные иконки. Динамические attr/src остаются у штатных getters.
    ko.bindingHandlers.dynastiyaLegionStaticIcon = {
        update: function (element, accessor) {
            var config = accessor();
            element.src = image(config.source, config.folder);
        }
    };
    var folder = page === 'live_game_options_bar.html' ? 'ingame_options_bar' :
        (page === 'live_game_control_group_bar.html' ? 'control_group_bar' : null);
    if (folder) {
        $('img[src*="' + folder + '/"]').each(function () {
            if (this.hasAttribute('data-bind')) return;
            var source = this.getAttribute('src');
            // В исходной теме нет варианта ping.png: эта иконка остаётся штатной.
            if (folder === 'ingame_options_bar' &&
                ['chronocam.png', 'game_menu.png', 'pov.png'].indexOf(source.split('/').pop()) < 0) return;
            this.setAttribute('data-bind', 'dynastiyaLegionStaticIcon: ' +
                JSON.stringify({source: source, folder: folder}));
        });
    }
}());
