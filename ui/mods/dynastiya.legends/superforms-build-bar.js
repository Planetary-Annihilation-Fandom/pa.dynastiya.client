/** Показывает запрет строительства суперформ в штатной панели строительства. */
(function () {
    'use strict';
    var blocked = {};
    var style = document.createElement('style');
    style.textContent = '.dyn-superform-blocked img { filter: grayscale(1); opacity: .35; } .dyn-superform-blocked { cursor: not-allowed !important; }';
    document.head.appendChild(style);

    /** Сопоставляет визуальный элемент с его спецификацией, включая суффикс армии. */
    function refresh() {
        $('.div_build_item.receiveMouse').each(function () {
            var item = ko.dataFor(this);
            var match = item && typeof item.id === 'string' && /^(.*\.json)/.exec(item.id);
            $(this).toggleClass('dyn-superform-blocked', !!(match && blocked[match[1]]));
        });
    }

    /** Получает разрешения из основной сцены матча. */
    handlers.dynastiyaSuperformLocks = function (value) {
        blocked = value || {};
        refresh();
    };
    setInterval(refresh, 2000);
}());
