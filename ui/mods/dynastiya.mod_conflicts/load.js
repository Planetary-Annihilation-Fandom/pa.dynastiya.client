(function () {
    'use strict';
    // Проверка конфликтующих модов в главном меню, лобби и на странице модов.
    // Скрипты загружаются после готовности сцены, чтобы не задерживать её показ.
    var scene = window.location.pathname;
    if (!/^\/(?:ui\/)?main\/game\/(start\/start|new_game\/new_game|community_mods\/community-mods)\.html$/.test(scene)) return;
    if (api.dynastiyaModConflicts) return;
    api.dynastiyaModConflicts = true;
    $(function () {
        // Обработчик зарегистрирован раньше обработчиков сцены; таймер выводит
        // проверку за них, когда модель сцены уже создана.
        setTimeout(function () {
            loadScript('coui://ui/mods/dynastiya.components/text.js');
            loadScript('coui://ui/mods/dynastiya.components/modal.js');
            loadScript('coui://ui/mods/dynastiya.mod_conflicts/conflicts.js');
        }, 0);
    });
}());
