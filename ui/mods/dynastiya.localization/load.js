(function () {
    'use strict';
    // Переводы строк «Династии». Ключ — английский текст из loc('!LOC:...'), как у строк игры;
    // для строки без перевода игра показывает английский текст. Файл языка (ru.js и т. п.)
    // загружается только при своей локали и дополняет словарь игры, не заменяя его.
    var LANGUAGES = ['ru'];
    if (typeof i18n === 'undefined' || !i18n.lng || !i18n.addResourceBundle) return;
    var lng = i18n.lng();
    var language = String(lng || '').split('-')[0];
    if (LANGUAGES.indexOf(language) === -1) return;
    api.dynastiyaTranslate = function (strings) {
        i18n.addResourceBundle(lng, 'translation', strings);
    };
    loadScript('coui://ui/mods/dynastiya.localization/' + language + '.js');
}());
