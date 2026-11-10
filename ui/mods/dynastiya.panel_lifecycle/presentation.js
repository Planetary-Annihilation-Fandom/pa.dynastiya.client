/* Показ содержимого отдельного нативного окна HUD без промежуточных кадров. */
(function () {
    'use strict';
    var panel = api.Panel;
    if (panel.pageId === panel.parentId || panel.prepareDock) return;

    // Каждая панель HUD (выделение, планеты, билдбар и т. п.) — отдельное
    // нативное окно. Его размер задаёт родительская страница по сообщению
    // panel.resize, поэтому новое окно появляется с задержкой в несколько кадров.
    // В эти кадры движок показывает новое содержимое в окне старого размера:
    // рамка обрезана, а иконки ещё не загружены. Режимы ниже решают, что видно
    // пользователю, пока окно меняет размер.
    //
    // var p = api.Panel.dockPresentation;
    //
    // p.update(data, apply)
    //     Значения внутри той же структуры: здоровье, прогресс, счётчики,
    //     ресурсы, таймеры. Изменение применяется сразу, окно не скрывается.
    //
    // p.replace(data, apply, key)
    //     Изменилась структура видимой панели, и размер окна может стать
    //     другим: другой набор строк выделения, раскрытие или сворачивание
    //     списка планет. Пока окно не получит новый размер и не загрузит
    //     картинки, на экране остаётся неподвижная копия прежнего кадра.
    //     Панель не мигает и не показывает обрезанное содержимое.
    //
    // p.present(data, apply, key)
    //     Содержимое заменяется целиком, и прежний кадр показывать нельзя:
    //     карточка наведённого юнита для другого юнита, набор построек
    //     билдбара для других строителей. Окно прозрачно, пока новое
    //     содержимое не готово. На уже видимой панели это заметно как
    //     мигание, поэтому для обычной смены состава нужен replace.
    //
    // Ключ описывает структуру: состав строк, раскрытые разделы, тип объекта.
    // Прогресс, время, числа и введённый текст в ключ не входят. При том же
    // ключе replace и present работают как update. Без ключа каждый вызов
    // считается сменой структуры. 0, '' и null — допустимые ключи.
    //
    // apply(data) должен изменить модель синхронно. Если данные загружаются
    // асинхронно, вызывайте режим после загрузки и отбрасывайте устаревшие ответы:
    // var request = ++latest;
    // load(id).then(function (data) { if (request === latest) p.present(data, apply, id); });
    //
    // Для блока внутри общей страницы (лобби, меню, настройки) используйте
    // api.Panel.createPresentation из surface.js: там нет нативного окна.

    var root = document.documentElement;
    var sheet = document.createElement('style');
    sheet.textContent = 'html[data-dynastiya-dock-pending] { opacity: 0 !important; }' +
        'html[data-dynastiya-dock-pending], html[data-dynastiya-dock-pending] * { pointer-events: none !important; }' +
        '[data-dynastiya-dock-held], [data-dynastiya-dock-held] * { visibility: hidden !important; pointer-events: none !important; }' +
        '[data-dynastiya-dock-snapshot], [data-dynastiya-dock-snapshot] * { pointer-events: none !important; }';
    document.head.appendChild(sheet);
    // Последний загруженный src каждой картинки нужен копии кадра в replace.
    document.addEventListener('load', function (event) {
        var node = event.target;
        if (node.tagName === 'IMG' && !(snapshot && snapshot.contains(node))) node.dynastiyaLoadedSrc = node.src;
    }, true);
    function rememberImages() {
        Array.prototype.forEach.call(dock().getElementsByTagName('img'), function (img) {
            if (img.complete && img.getAttribute('src')) img.dynastiyaLoadedSrc = img.src;
        });
    }
    // Окно ещё ни разу не получило свой размер: до первого показа оно прозрачно.
    root.setAttribute('data-dynastiya-dock-pending', '');
    var state = panel.dockPresentation = { revision: 0, pending: true };
    var target;
    var reportFrame, settleFrame, holdTimer;
    var lastReport;
    var stableFrames = 0;
    var scannedRevision = -1;
    var resources = [];
    var cache = Object.create(null);
    var closed = false;
    var presented = false;
    var hasKey = false;
    var contentKey;
    // Копия последнего показанного кадра в режиме replace и данные о том,
    // где окно стояло на экране, когда этот кадр был показан.
    var snapshot;
    var shownRegion;
    var fit = '';
    // Если окно так и не получит размер (например, родитель скрыл панель),
    // replace не должен навсегда оставить неподвижную копию вместо панели.
    var HOLD_LIMIT = 500;

    function dock() { return document.getElementsByTagName('body-dock')[0] || document.body; }
    function sameKey(keyed, key) { return keyed && hasKey && key === contentKey; }

    state.update = function (data, apply) {
        apply(data);
        panel.onBodyResize();
    };

    state.present = function (data, apply, key) {
        var keyed = arguments.length >= 3;
        if (sameKey(keyed, key)) {
            state.update(data, apply);
            return;
        }
        hasKey = keyed;
        contentKey = key;
        presented = false;
        state.pending = true;
        target = undefined;
        // Скрываем прежний кадр до того, как Knockout заменит содержимое, даже
        // если новое содержимое окажется того же размера.
        root.setAttribute('data-dynastiya-dock-pending', '');
        apply(data);
        panel.onBodyResize(true);
    };

    state.replace = function (data, apply, key) {
        var keyed = arguments.length >= 3;
        if (sameKey(keyed, key)) {
            state.update(data, apply);
            return;
        }
        // Пока окно не показано, удерживать нечего: работает обычная подготовка.
        if (!presented && !snapshot) {
            if (keyed) state.present(data, apply, key);
            else state.present(data, apply);
            return;
        }
        var content = dock();
        // Без <body-dock> копию некуда поставить рядом с содержимым: скрытие
        // body скрыло бы и её. Такие панели обновляются без удержания кадра.
        if (content === document.body) {
            hasKey = keyed;
            contentKey = key;
            state.update(data, apply);
            return;
        }
        hasKey = keyed;
        contentKey = key;
        // Повторная смена во время удержания оставляет на экране всё ту же
        // копию: скрытое содержимое пользователь ещё не видел.
        if (!snapshot) holdFrame(content);
        presented = false;
        state.pending = true;
        target = undefined;
        apply(data);
        // Привязки Knockout стандартных сцен могут обновить разметку позже в
        // этом же обработчике. Измеряем после них, но до отрисовки кадра.
        Promise.resolve().then(function () {
            if (closed || !snapshot) return;
            if (sizeUnchanged() && resourcesReady()) reveal();
            else panel.onBodyResize(true);
        });
    };

    function holdFrame(content) {
        var rect = content.getBoundingClientRect();
        snapshot = content.cloneNode(true);
        // Вычисляемые поля модели, подписанные раньше ключа, успевают сменить
        // src картинки до копирования (стрелка списка планет). Копия показала
        // бы новую стрелку или, пока та не загружена, пустое место. Событие
        // load нового src ещё не пришло, поэтому последняя загруженная
        // картинка — именно та, что была на экране.
        var images = content.getElementsByTagName('img');
        var copies = snapshot.getElementsByTagName('img');
        for (var i = 0; i < images.length && i < copies.length; i++) {
            if (images[i].dynastiyaLoadedSrc) copies[i].src = images[i].dynastiyaLoadedSrc;
        }
        // id в копии сохраняем: от них зависят правила CSS. Без id копия
        // показала скрытую модом надпись за кнопкой START ANNIHILATION. Копия
        // стоит в DOM после настоящего блока, поэтому getElementById и $('#…')
        // по-прежнему находят оригинал.
        snapshot.setAttribute('data-dynastiya-dock-snapshot', '');
        var style = snapshot.style;
        style.position = 'fixed';
        style.margin = '0';
        style.width = rect.width + 'px';
        style.height = rect.height + 'px';
        snapshot.dynastiyaOffset = { left: rect.left, top: rect.top };
        // Окно растёт или сжимается от угла, к которому прижата панель.
        // Копию прижимаем к тому же углу, чтобы она осталась на месте.
        if (/right/.test(fit)) style.right = (window.innerWidth - rect.right) + 'px';
        else style.left = rect.left + 'px';
        if (/bottom/.test(fit)) style.bottom = (window.innerHeight - rect.bottom) + 'px';
        else style.top = rect.top + 'px';
        content.parentNode.appendChild(snapshot);
        content.setAttribute('data-dynastiya-dock-held', '');
        window.clearTimeout(holdTimer);
        holdTimer = window.setTimeout(function () {
            holdTimer = undefined;
            if (!closed && snapshot) reveal();
        }, HOLD_LIMIT);
    }
    function placeSnapshot(region) {
        // Родитель сообщил точное новое положение окна: ставим копию туда, где
        // прежний кадр был на экране, независимо от угла привязки.
        if (!snapshot || !shownRegion || typeof region.left !== 'number' || typeof shownRegion.left !== 'number') return;
        var style = snapshot.style;
        style.right = style.bottom = '';
        style.left = (snapshot.dynastiyaOffset.left + shownRegion.left - region.left) + 'px';
        style.top = (snapshot.dynastiyaOffset.top + shownRegion.top - region.top) + 'px';
    }
    function reveal() {
        state.pending = false;
        presented = true;
        if (target) shownRegion = target;
        window.clearTimeout(holdTimer);
        holdTimer = undefined;
        root.removeAttribute('data-dynastiya-dock-pending');
        dock().removeAttribute('data-dynastiya-dock-held');
        if (snapshot) {
            if (snapshot.parentNode) snapshot.parentNode.removeChild(snapshot);
            snapshot = undefined;
        }
        rememberImages();
    }

    function requestSettle() {
        if (closed || !state.pending || settleFrame !== undefined || !target) return;
        settleFrame = window.requestAnimationFrame(settle);
    }
    function imageFor(source) {
        if (!cache[source]) {
            var entry = cache[source] = { ready: false, image: new Image() };
            entry.image.onload = entry.image.onerror = function () {
                entry.ready = true;
                requestSettle();
            };
            entry.image.src = source;
            if (entry.image.complete) entry.ready = true;
        }
        return cache[source];
    }
    function scanResources() {
        resources = [];
        var nodes = [dock()];
        Array.prototype.push.apply(nodes, dock().querySelectorAll('*'));
        nodes.forEach(function (node) {
            if (!node.offsetWidth || !node.offsetHeight) return;
            var style = getComputedStyle(node);
            var urls = (style.borderImageSource || style.webkitBorderImageSource || '') + ' ' + style.backgroundImage;
            var pattern = /url\(["']?([^"')]+)["']?\)/g;
            var match;
            while ((match = pattern.exec(urls))) resources.push(imageFor(match[1]));
        });
        scannedRevision = state.revision;
    }
    function resourcesReady() {
        if (scannedRevision !== state.revision) scanResources();
        return resources.every(function (entry) { return entry.ready; }) &&
            Array.prototype.every.call(dock().querySelectorAll('img'), function (img) {
                return !img.offsetWidth || !img.offsetHeight || !img.getAttribute('src') || img.complete;
            });
    }
    function matches(actual, expected) {
        // Coherent не создаёт окно меньше 16 пикселей по стороне.
        return Math.abs(actual - expected) <= 1 || (expected < 16 && actual === 16);
    }
    function sizeUnchanged() {
        var content = dock();
        return matches(window.innerWidth, content.offsetWidth) && matches(window.innerHeight, content.offsetHeight);
    }
    function settle() {
        settleFrame = undefined;
        if (closed || !state.pending || !target) return;
        panel.onBodyResize();
        if (!target || target.revision !== state.revision) return;
        if (!matches(window.innerWidth, target.width) || !matches(window.innerHeight, target.height)) {
            stableFrames = 0;
            // Новую проверку запросит событие resize; опрашивать окно каждый
            // кадр, пока родитель его ещё не изменил, незачем.
            return;
        }
        if (!resourcesReady()) {
            stableFrames = 0;
            return; // проверку продолжат обработчики загрузки картинок
        }
        if (++stableFrames < 2) { requestSettle(); return; }
        reveal();
    }
    panel.prepareDock = function (payload, report) {
        // Показанная панель меняет размер и при обычных обновлениях. Скрывать
        // её и заново искать ресурсы на каждом таком изменении нельзя:
        // непрерывные обновления оставили бы её скрытой.
        if (presented) { report(); return; }
        lastReport = report;
        payload.revision = ++state.revision;
        state.pending = true;
        target = undefined;
        stableFrames = 0;
        // В режиме replace прежний кадр показывает копия, скрывать окно не нужно.
        if (!snapshot) root.setAttribute('data-dynastiya-dock-pending', '');
        if (reportFrame !== undefined) window.cancelAnimationFrame(reportFrame);
        if (settleFrame !== undefined) window.cancelAnimationFrame(settleFrame);
        settleFrame = undefined;
        // Сначала должен отрисоваться скрытый кадр (или копия), и только потом
        // родитель меняет размер окна.
        reportFrame = window.requestAnimationFrame(function () {
            reportFrame = window.requestAnimationFrame(function () {
                reportFrame = undefined;
                if (!closed && payload.revision === state.revision) report();
            });
        });
    };
    // Сцена может измерить себя до регистрации обработчиков сообщений.
    // После panel.ready запрос размера повторяется.
    panel.flushDock = function () {
        if (!closed && state.pending && reportFrame === undefined && lastReport) lastReport();
    };
    panel.onDockApplied = function (payload) {
        if (typeof payload.fit === 'string') fit = payload.fit;
        if (payload.revision !== state.revision || !state.pending) return;
        target = payload;
        placeSnapshot(payload);
        requestSettle();
    };
    function changed() { stableFrames = 0; requestSettle(); }
    window.addEventListener('resize', changed);
    document.addEventListener('load', changed, true);
    document.addEventListener('error', changed, true);
    $(window).on('beforeunload', function () {
        closed = true;
        if (reportFrame !== undefined) window.cancelAnimationFrame(reportFrame);
        if (settleFrame !== undefined) window.cancelAnimationFrame(settleFrame);
        window.clearTimeout(holdTimer);
        window.removeEventListener('resize', changed);
        document.removeEventListener('load', changed, true);
        document.removeEventListener('error', changed, true);
    });
}());
