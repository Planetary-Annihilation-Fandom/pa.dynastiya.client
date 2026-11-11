/* Тема меняет оформление на месте; данные и размеры ведёт штатная модель панели. */
(function () {
    'use strict';
    if (model.dynastiyaLegionPanel) return;
    var armyTheme = ko.observable('vanilla');
    model.dynastiyaLegionPanel = armyTheme;
    var page = location.pathname.split('/').pop();
    var selectionTheme = page === 'live_game_build_bar.html' || page === 'live_game_action_bar.html';
    var theme = ko.computed(function () {
        if (page === 'live_game_build_bar.html') {
            var set = model.buildSet();
            return legion.faction(set ? Object.keys(set.selectedSpecs()) : []);
        }
        if (page === 'live_game_action_bar.html') {
            var selection = model.selection();
            return legion.faction(Object.keys(selection && selection.spec_ids || {}));
        }
        return armyTheme();
    });
    function apply(value) {
        var body = document.body;
        body.classList.toggle('legion', selectionTheme && value === 'legion');
        body.classList.toggle('mixed', selectionTheme && value === 'mixed');
        body.classList.toggle('legionui', !selectionTheme && value === 'legion');
        body.classList.toggle('mixedui', !selectionTheme && value === 'mixed');
    }
    function update(value) {
        // update не прячет окно и не меняет ключ уже подготовленного содержимого.
        var presentation = api.Panel.dockPresentation;
        if (presentation) presentation.update(value, apply);
        else apply(value);
    }
    theme.subscribe(update);
    update(theme());
    var received = false;
    handlers['dynastiya.legion.theme'] = function (value) {
        received = true;
        armyTheme(value);
    };
    api.Panel.query(api.Panel.parentId, 'panel.invoke', ['dynastiyaLegionTheme']).then(function (value) {
        // Ответ на старый запрос не должен отменить более свежее сообщение.
        if (!received && ['vanilla', 'legion', 'mixed'].indexOf(value) >= 0) armyTheme(value);
    });

    // Дополняем привязки, сохраняя click/mousedown/visible и устойчивые строки #22.
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

    function image(source, folder) {
        var value = armyTheme();
        if (value === 'vanilla') return source;
        return 'coui://ui/mods/dynastiya.legion/img/' + folder + '/' +
            (value === 'legion' ? 'red' : 'purple') + '/' + source.split('/').pop();
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
