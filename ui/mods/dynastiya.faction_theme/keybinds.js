/* Клавиши переключателя фракций билдбара. Описания клавиш нужны всем сценам:
 * настройки показывают их, главное меню освобождает Tab, живая игра выполняет.
 * Реестр фракций в глобальных сценах не загружается, поэтому список фракций
 * переключателя здесь задан явно; build_bar.js принимает только фракции,
 * присутствующие в выделении.
 *
 * Перебор по умолчанию на Tab. Штатно Tab открывает статистику матча, и
 * dynastiya.start/keybinds.js снимает эту клавишу, если оба действия остались
 * на Tab. */
(function () {
    'use strict';
    var keyboard = api.settings && api.settings.definitions && api.settings.definitions.keyboard;
    if (!keyboard || keyboard.settings.dynastiya_build_faction_next) return;

    var actions = {
        dynastiya_build_faction_next: ['!LOC:next build bar faction', 'tab', 'next'],
        dynastiya_build_faction_mla: ['!LOC:build bar faction MLA', '', 'mla'],
        dynastiya_build_faction_legion: ['!LOC:build bar faction Legion', '', 'legion'],
        dynastiya_build_faction_exiles: ['!LOC:build bar faction Exiles', '', 'exiles'],
        dynastiya_build_faction_bugs: ['!LOC:build bar faction Bugs', '', 'bugs']
    };
    _.forIn(actions, function (action, key) {
        keyboard.settings[key] = {
            title: action[0],
            type: 'keybind',
            set: 'gameplay',
            display_group: '!LOC:build',
            display_sub_group: '!LOC:build bar factions',
            default: action[1]
        };
    });

    // Клавиши обрабатывает страница с фокусом ввода, а билдбар — отдельная
    // панель: команда передаётся ей сообщением.
    if (typeof action_sets === 'undefined' || !action_sets.gameplay) return;
    _.forIn(actions, function (action, key) {
        action_sets.gameplay[key] = function () {
            if (api.panels && api.panels.build_bar) api.panels.build_bar.message('dynastiya.build_faction', action[2]);
        };
    });
    // Глобальные моды загружаются после того, как inputmap.js построил карты
    // клавиш; пересборка добавляет в них новые действия.
    if (window.globalHandlers && globalHandlers['inputmap.reload']) globalHandlers['inputmap.reload']();
}());
