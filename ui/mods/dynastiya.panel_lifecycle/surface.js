/* Local counterpart of dockPresentation: never conceal the whole menu/lobby. */
(function () {
    'use strict';
    if (api.Panel.createPresentation) return;
    var sheet = document.createElement('style');
    sheet.textContent = '[data-dynastiya-content-pending], [data-dynastiya-content-pending] *' +
        '{visibility:hidden!important;pointer-events:none!important;}';
    document.head.appendChild(sheet);

    // var p = api.Panel.createPresentation(document.querySelector('#details'));
    // p.update(packet, renderCounts);          // retain visible content
    // p.present(packet, renderPage, pageId);   // rebuild only for a new key
    // p.present(packet, renderPage);           // force a rebuild, even same data
    // p.dispose();                            // before permanently removing node
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

    // Observe a structural key already maintained by a stock view model. The
    // computed compares its serialized key, not the changing model object.
    // watch(p, function () { return [model.visible(), model.pageId()]; });
    api.Panel.watchPresentation = function (presentation, readKey) {
        var key = ko.computed(function () { return JSON.stringify(readKey()); });
        var subscription = key.subscribe(function (value) { presentation.present(null, function () {}, value); });
        return function () { subscription.dispose(); key.dispose(); };
    };
}());
