/* Тема фракции в панели HUD. Классы темы ставятся на body; данные и размеры ведёт
 * штатная модель панели.
 *
 * Тема армии меняется только после загрузки картинок новой темы (рамки из CSS
 * фракции и варианты значков), поэтому смена не показывает пустых рамок.
 * Тема выделения (билдбар, панель действий) меняется вместе с содержимым
 * в том же обработчике: его показ готовит dockPresentation панели.
 *
 * var panel = dynastiyaFactionTheme.panel;
 * panel.army()                 — тема армии ('vanilla', 'legion', 'legion-mixed')
 * panel.image(source, folder)  — вариант штатной картинки для темы армии
 */
(function () {
    'use strict';
    var themes = dynastiyaFactionTheme;
    if (themes.panel) return;
    var page = location.pathname.split('/').pop();
    var bySelection = page === 'live_game_build_bar.html' || page === 'live_game_action_bar.html';

    var stored;
    try { stored = localStorage.dynastiya_faction_theme; } catch (e) {}
    var army = ko.observable(themes.valid(stored) ? stored : 'vanilla');
    var images = [];   // пары {source, folder}, для которых запрашивался вариант
    var preloaded = []; // ссылки удерживают загруженные картинки в памяти

    function image(source, folder, value) {
        if (!source) return source;
        // Запоминаем и при штатной теме: при смене темы эти варианты загружаются заранее.
        if (value === undefined && !_.some(images, function (pair) { return pair.source === source && pair.folder === folder; }))
            images.push({ source: source, folder: folder });
        var theme = themes.parse(value === undefined ? army() : value);
        if (!theme.faction || !theme.faction.image) return source;
        return theme.faction.image(source, folder, theme.mixed);
    }

    function classes(kind) {
        return _.flatten(themes.factions.map(function (faction) {
            return (faction.classes && faction.classes[kind]) || [];
        }));
    }
    function classFor(kind, value) {
        var theme = themes.parse(value);
        var names = theme.faction && theme.faction.classes && theme.faction.classes[kind];
        return names ? names[theme.mixed ? 1 : 0] : '';
    }
    function apply(kind, value) {
        var active = classFor(kind, value);
        classes(kind).forEach(function (name) {
            document.body.classList.toggle(name, name === active);
        });
    }

    // Ресурсы правил CSS, включаемых классом темы, и варианты значков.
    function resources(value) {
        var name = classFor('army', value);
        var urls = images.map(function (pair) { return image(pair.source, pair.folder, value); });
        if (name) {
            var selector = new RegExp('\\.' + name + '(?![\\w-])');
            Array.prototype.forEach.call(document.styleSheets, function (sheet) {
                var rules;
                try { rules = sheet.cssRules; } catch (e) { return; }
                Array.prototype.forEach.call(rules || [], function (rule) {
                    if (!rule.selectorText || !selector.test(rule.selectorText)) return;
                    var pattern = /url\(["']?([^"')]+)["']?\)/g;
                    var match;
                    while ((match = pattern.exec(rule.style.cssText))) urls.push(match[1]);
                });
            });
        }
        return _.uniq(urls);
    }
    function preload(urls) {
        return Promise.all(urls.map(function (url) {
            return new Promise(function (resolve) {
                var img = new Image();
                img.onload = img.onerror = resolve;
                img.src = url;
                preloaded.push(img);
                if (img.complete) resolve();
            });
        }));
    }

    var latest = 0;
    function setArmy(value) {
        if (!themes.valid(value) || value === army()) return;
        var request = ++latest;
        preload(resources(value)).then(function () {
            if (request !== latest) return;
            var presentation = api.Panel.dockPresentation;
            // update не прячет окно и не меняет ключ подготовленного содержимого.
            if (presentation) presentation.update(value, army);
            else army(value);
        });
    }

    var theme = bySelection ? ko.computed(function () {
        if (page === 'live_game_build_bar.html') {
            var set = model.buildSet();
            return themes.of(set ? Object.keys(set.selectedSpecs()) : []);
        }
        var selection = model.selection();
        return themes.of(Object.keys(selection && selection.spec_ids || {}));
    }) : army;
    // Классы ставятся синхронно: до первого показа окна, а при смене выделения —
    // внутри present/replace, которые уже скрыли или удержали прежний кадр.
    theme.subscribe(function (value) { apply(bySelection ? 'selection' : 'army', value); });
    apply(bySelection ? 'selection' : 'army', theme());

    var received = false;
    handlers['dynastiya.faction.theme'] = function (value) {
        received = true;
        setArmy(value);
    };
    api.Panel.query(api.Panel.parentId, 'panel.invoke', ['dynastiyaFactionTheme']).then(function (value) {
        // Ответ на старый запрос не должен отменить более свежее сообщение.
        if (!received) setArmy(value);
    });

    themes.panel = { army: army, image: image, page: page };
}());
