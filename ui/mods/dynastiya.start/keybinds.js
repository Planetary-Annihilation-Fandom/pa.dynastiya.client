/* Tab по умолчанию перебирает фракции билдбара (dynastiya.faction_theme/keybinds.js),
 * а штатно открывает статистику матча. Если обе клавиши остались на Tab, главное
 * меню снимает её со статистики: клавиша, назначенная двум действиям, вызывала
 * бы одно из них непредсказуемо. Проверка идёт после каждой загрузки настроек
 * главным меню: загрузка из облака заменяет локальные значения, а сохранение до
 * неё отправило бы в облако устаревшие. */
(function () {
    'use strict';
    var settings = api.settings;
    if (!settings || !settings.isValid('keyboard', 'dynastiya_build_faction_next')) return;

    function freeTab() {
        if (settings.value('keyboard', 'dynastiya_build_faction_next') !== 'tab' ||
            settings.value('keyboard', 'toggle_gamestats') !== 'tab') return;
        settings.set('keyboard', 'toggle_gamestats', '');
        settings.save();
    }

    var load = settings.load;
    settings.load = function () {
        var result = load.apply(settings, arguments);
        result.then(freeTab);
        return result;
    };
}());
