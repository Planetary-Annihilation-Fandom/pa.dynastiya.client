/* Подготовка локального блока внутри общей страницы: лобби, меню, настройки. */
(function () {
    'use strict';
    if (api.Panel.createPresentation) return;
    var sheet = document.createElement('style');
    sheet.textContent = '[data-dynastiya-content-pending], [data-dynastiya-content-pending] *' +
        '{visibility:hidden!important;pointer-events:none!important;}';
    document.head.appendChild(sheet);

    // У такого блока нет своего нативного окна: он делит страницу с соседними
    // разделами, и изменение его размера не задерживает показ. Поэтому почти
    // всё обновляется на месте, а скрытие нужно только для вновь открытого окна.
    //
    // var p = api.Panel.createPresentation(element);
    //
    // p.update(data, apply) или обычные привязки Knockout
    //     Постоянные списки и уже видимые данные: слоты лобби, выбранная
    //     система, параметры игры, вкладки настроек. Блок не скрывается даже
    //     при смене игроков, планет или числа строк. Скрытие на каждое
    //     изменение данных — это и есть мигание.
    //
    // p.present(data, apply, key)
    //     Открывается окно выбора командира или цвета, диалог, новый раздел,
    //     а его картинки ещё не загружены. Блок скрыт до загрузки. Ограничивайте
    //     подготовку самим открывающимся блоком, а не страницей или колонкой.
    //     При том же ключе present работает как update; без ключа — всегда
    //     заново.
    //
    // p.cancel()   — владелец закрыл блок во время подготовки; разметка остаётся.
    // p.dispose()  — перед окончательным удалением элемента.
    //
    // Режима replace здесь нет: удерживать прежний кадр нужно только у
    // нативного окна HUD (см. presentation.js).
    api.Panel.createPresentation = function (element) {
        var state = {pending: false, revision: 0};
        var keyed = false, key, frame, closed = false, resources = [], cache = {};
        function schedule() {
            if (closed || !state.pending || frame !== undefined) return;
            frame = window.requestAnimationFrame(settle);
        }
        function scan() {
            resources = [];
            var nodes = [element].concat(Array.prototype.slice.call(element.querySelectorAll('*')));
            nodes.forEach(function (node) {
                if (!node.offsetWidth || !node.offsetHeight) return;
                var style = getComputedStyle(node);
                var urls = (style.borderImageSource || style.webkitBorderImageSource || '') + ' ' + style.backgroundImage;
                var pattern = /url\(["']?([^"')]+)["']?\)/g, match;
                while ((match = pattern.exec(urls))) {
                    var src = match[1];
                    if (!cache[src]) {
                        var image = cache[src] = new Image();
                        image.onload = image.onerror = schedule;
                        image.src = src;
                    }
                    resources.push(cache[src]);
                }
            });
        }
        function settle() {
            frame = undefined;
            if (closed || !state.pending) return;
            scan();
            var images = resources.concat(Array.prototype.slice.call(element.querySelectorAll('img')));
            if (!images.every(function (img) { return !img.getAttribute || !img.getAttribute('src') || img.complete; })) return;
            var revision = state.revision;
            frame = window.requestAnimationFrame(function () {
                frame = undefined;
                if (closed || revision !== state.revision) return;
                state.pending = false;
                element.removeAttribute('data-dynastiya-content-pending');
                api.Panel.onBodyResize();
            });
        }
        state.update = function (data, apply) { if (!closed) { apply(data); api.Panel.onBodyResize(); } };
        // Закрытие владельцем отменяет подготовку, но не разметку. Поздняя
        // загрузка картинки не должна снова показать уже закрытый блок.
        state.cancel = function () {
            keyed = false;
            state.revision++;
            state.pending = false;
            if (frame !== undefined) window.cancelAnimationFrame(frame);
            frame = undefined;
            element.removeAttribute('data-dynastiya-content-pending');
        };
        state.present = function (data, apply, nextKey) {
            if (closed) return;
            if (arguments.length >= 3 && keyed && key === nextKey) { state.update(data, apply); return; }
            keyed = arguments.length >= 3;
            key = nextKey;
            state.revision++;
            state.pending = true;
            element.setAttribute('data-dynastiya-content-pending', '');
            if (frame !== undefined) window.cancelAnimationFrame(frame);
            frame = undefined;
            apply(data);
            schedule();
        };
        element.addEventListener('load', schedule, true);
        element.addEventListener('error', schedule, true);
        state.dispose = function () {
            closed = true;
            if (frame !== undefined) window.cancelAnimationFrame(frame);
            element.removeAttribute('data-dynastiya-content-pending');
            element.removeEventListener('load', schedule, true);
            element.removeEventListener('error', schedule, true);
            Object.keys(cache).forEach(function (src) { cache[src].onload = cache[src].onerror = null; });
        };
        return state;
    };

    // Подключает режим к ключу, который вычисляется из модели стандартной сцены.
    // Сравнивается сериализованный ключ, а не меняющийся объект модели.
    // var stop = api.Panel.watchPresentation(p, function () { return [model.visible(), model.pageId()]; }, 'replace');
    //
    // mode 'update'  — смена ключа только запрашивает замер размера.
    // mode 'replace' — только для dockPresentation: смена ключа удерживает
    //                  прежний кадр, пока окно не получит новый размер.
    // без mode       — present: блок скрывается до готовности.
    //
    // Создавайте наблюдение до ko.applyBindings. Тогда оно узнаёт о смене ключа
    // раньше привязок, и replace успевает сохранить прежний кадр до того, как
    // Knockout изменит разметку.
    api.Panel.watchPresentation = function (presentation, readKey, mode) {
        var key = ko.computed(function () { return JSON.stringify(readKey()); });
        var noop = function () {};
        var subscription = key.subscribe(function (value) {
            if (mode === 'update') presentation.update(null, noop);
            else if (mode === 'replace') presentation.replace(null, noop, value);
            else presentation.present(null, noop, value);
        });
        return function () { subscription.dispose(); key.dispose(); };
    };
}());
