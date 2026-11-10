// Русские строки «Династии». Ключ — английский текст из loc('!LOC:...').
api.dynastiyaTranslate({
    // Конфликтующие моды (dynastiya.mod_conflicts)
    'Conflicting mods': 'Конфликтующие моды',
    'Dynastiya already includes these mods. Enabling them alongside Dynastiya breaks its features.':
        'Эти моды уже встроены в «Династию». Если включить их вместе с ней, её функции перестанут работать правильно.',
    'The host has enabled conflicting server mods. Only the host can disable them:':
        'Хост включил конфликтующие серверные моды. Отключить их может только он:',
    'The changes take effect after you leave the lobby.': 'Изменения вступят в силу после выхода из лобби.',
    'Disable conflicting mods': 'Отключить конфликтующие моды'
    // Cancel и Close переводит словарь игры: его строки здесь не переопределяются.
});
