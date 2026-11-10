/* Keep a dock's intermediate layouts out of the native compositor. */
(function () {
    'use strict';
    var panel = api.Panel;
    if (panel.pageId === panel.parentId || panel.prepareDock) return;
    var root = document.documentElement;
    var sheet = document.createElement('style');
    sheet.textContent = 'html[data-dynastiya-dock-pending] { opacity: 0 !important; }' +
        'html[data-dynastiya-dock-pending], html[data-dynastiya-dock-pending] * { pointer-events: none !important; }';
    document.head.appendChild(sheet);
    root.setAttribute('data-dynastiya-dock-pending', '');
    var state = panel.dockPresentation = { revision: 0, pending: true };
    var target;
    var reportFrame, settleFrame;
    var lastReport;
    var stableFrames = 0;
    var scannedRevision = -1;
    var resources = [];
    var cache = Object.create(null);
    var closed = false;
    var presented = false;
    var hasKey = false;
    var contentKey;

    // Область применения: отдельные нативные окна HUD, где смена содержимого
    // требует согласовать размер и положение окна до его показа.
    // present: другой наведённый юнит, другой набор построек/вкладка билдбара,
    // изменение состава строк панели выделения. Ключ описывает эту смену.
    // update: здоровье, прогресс строительства, ресурсы, таймеры и счётчики.
    // Само изменение размера или входящий пакет не означают новую подготовку:
    // скрытие на каждом обновлении вызывает мигание и задерживает показ.
    // present без ключа — только явная полная замена содержимого, не каждый тик.
    // Usage (apply must commit synchronously; await resources before calling):
    // var p = api.Panel.dockPresentation;
    // p.update(packet, applyHealth);                 // live values, no conceal
    // p.present(packet, applyUnit, packet.entity);   // same key => update
    // p.present(packet, applyUnit);                 // always rebuild
    // Keys describe identity/structure, never progress, time or input text.
    // 0, '' and null are valid keys; omitting the argument forces a rebuild.
    // For an ordinary DOM section use api.Panel.createPresentation(element).
    // Async adapter pattern (discard obsolete results before touching the UI):
    // var request = ++latestRequest;
    // loadDetails(id).then(function (data) {
    //     if (request === latestRequest) p.present(data, applyUnit, id);
    // });
    // Keep this namespace separate from Panel.update, which moves native views.
    // apply(data) must synchronously commit the model; async callers invoke this
    // only after their resources resolve, using their latest requested data.
    state.update = function (data, apply) {
        apply(data);
        panel.onBodyResize();
    };
    state.present = function (data, apply, key) {
        var keyed = arguments.length >= 3;
        if (keyed && hasKey && key === contentKey) {
            state.update(data, apply);
            return;
        }
        hasKey = keyed;
        contentKey = key;
        presented = false;
        state.pending = true;
        target = undefined;
        // Conceal the previous content before Knockout replaces it, even when
        // the new content has exactly the same dimensions as the old content.
        root.setAttribute('data-dynastiya-dock-pending', '');
        apply(data);
        panel.onBodyResize(true);
    };

    function dock() { return document.getElementsByTagName('body-dock')[0] || document.body; }
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
        // Coherent clamps very small backing views to a minimum size.
        return Math.abs(actual - expected) <= 1 || (expected < 16 && actual === 16);
    }
    function settle() {
        settleFrame = undefined;
        if (closed || !state.pending || !target) return;
        panel.onBodyResize();
        if (!target || target.revision !== state.revision) return;
        if (!matches(window.innerWidth, target.width) || !matches(window.innerHeight, target.height)) {
            stableFrames = 0;
            // Native resize events request another pass; do not poll a hidden
            // view at frame rate while its parent is intentionally collapsed.
            return;
        }
        if (!resourcesReady()) {
            stableFrames = 0;
            return; // image load/error listeners resume the check
        }
        if (++stableFrames < 2) { requestSettle(); return; }
        state.pending = false;
        presented = true;
        root.removeAttribute('data-dynastiya-dock-pending');
    }
    panel.prepareDock = function (payload, report) {
        // A live HUD changes size during progress updates and Knockout rebinding.
        // Never blank an already presented view or rescan all its CSS resources:
        // continuous updates can otherwise keep it hidden indefinitely.
        if (presented) { report(); return; }
        lastReport = report;
        payload.revision = ++state.revision;
        state.pending = true;
        target = undefined;
        stableFrames = 0;
        root.setAttribute('data-dynastiya-dock-pending', '');
        if (reportFrame !== undefined) window.cancelAnimationFrame(reportFrame);
        if (settleFrame !== undefined) window.cancelAnimationFrame(settleFrame);
        settleFrame = undefined;
        // Commit one transparent frame before the parent resizes the backing
        // view. Otherwise the compositor can stretch its previous opaque image.
        reportFrame = window.requestAnimationFrame(function () {
            reportFrame = window.requestAnimationFrame(function () {
                reportFrame = undefined;
                if (!closed && payload.revision === state.revision) report();
            });
        });
    };
    // A scene can measure during initialization, before message filters are
    // registered. Request the acknowledgement again once panel.ready runs.
    panel.flushDock = function () {
        if (!closed && state.pending && reportFrame === undefined && lastReport) lastReport();
    };
    panel.onDockApplied = function (payload) {
        if (payload.revision !== state.revision || !state.pending) return;
        target = payload;
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
        window.removeEventListener('resize', changed);
        document.removeEventListener('load', changed, true);
        document.removeEventListener('error', changed, true);
    });
}());
