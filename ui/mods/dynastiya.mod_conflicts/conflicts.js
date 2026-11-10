(function () {
    'use strict';
    // Моды, полностью интегрированные в «Династию» (см. Integrations.md). Исходный мод
    // подключается поверх интеграции и ломает её. Добавляя интеграцию, допиши сюда
    // identifier исходного мода.
    var CONFLICTS = {
        'com.pa.mod.map_generator': 'Godblessed Map Generator',
        'com.pa.biomes.lite.client': 'Biomes Lite Companion',
        'com.pa.biomes.lite.server': 'Biomes Lite',
        'com.pa.ferretmaster.ferret-visuals': 'Ferret\'s Better Biome Visuals',
        'com.pa.mikeyh.lobby-system-preview': 'Lobby System Preview'
    };
    // Отказ запоминается до перезапуска игры для конкретного набора конфликтов:
    // новый конфликтующий мод снова покажет окно.
    var DISMISSED = 'dynastiya_mod_conflicts_dismissed';

    var manager = window.CommunityModsManager;
    if (!manager || window.gNoMods) return;
    var lobby = /\/new_game\//.test(window.location.pathname);
    var modal = null;

    function isConflict(mod) {
        return !!(mod && CONFLICTS[mod.identifier]);
    }

    function nameOf(mod) {
        return mod.display_name || CONFLICTS[mod.identifier];
    }

    function dismissedKeys() {
        try {
            return JSON.parse(sessionStorage[DISMISSED] || '[]');
        } catch (e) {
            return [];
        }
    }

    function dismiss(key) {
        var keys = dismissedKeys();
        if (keys.indexOf(key) === -1) keys.push(key);
        sessionStorage[DISMISSED] = JSON.stringify(keys);
    }

    function keyOf(own, host) {
        return JSON.stringify([_.pluck(own, 'identifier').sort(), _.pluck(host, 'identifier').sort()]);
    }

    // own — моды игрока, которые он может отключить сам. В лобби гость управляет только
    // клиентскими модами; серверные моды лобби выбрал хост, их гость видит в списке host.
    function currentState() {
        var isHost = lobby && model.isGameCreator();
        var own = _.filter(manager.installedMods(), function (mod) {
            return mod.enabled && isConflict(mod) && (!lobby || isHost || mod.context === 'client');
        });
        var host = lobby && !isHost ? _.filter(model.serverMods(), isConflict) : [];
        return { own: own, host: host };
    }

    function list(body, mods) {
        var ul = document.createElement('ul');
        ul.className = 'dyn-modal__list dyn-scroll';
        _.forEach(mods, function (mod) {
            ul.appendChild(api.dynastiyaUi.text('text', nameOf(mod), { tag: 'li', expressive: true, strong: true }));
        });
        body.appendChild(ul);
    }

    function paragraph(body, text) {
        body.appendChild(api.dynastiyaUi.text('text', text, { expressive: true }));
    }

    function note(body, text) {
        body.appendChild(api.dynastiyaUi.text('helper', text, { tag: 'p', expressive: true }));
    }

    function disable(state, dialog) {
        dialog.busy(true);
        _.forEach(state.own, function (mod) {
            manager.disableModWithConsumers(mod);
        });
        if (lobby) {
            // Моды уже загружены в лобби. Стандартный переход из лобби перемонтирует моды по этому флагу.
            sessionStorage.community_mods_reset_required = true;
            dismiss(keyOf([], state.host));
            dialog.close();
            modal = null;
            return;
        }
        manager.resetMods(true, true).always(function () {
            window.location.reload();
        });
    }

    function options(state) {
        var key = keyOf(state.own, state.host);
        var actions = [{ label: state.own.length ? loc('!LOC:Cancel') : loc('!LOC:Close'), cancel: true }];
        if (state.own.length)
            actions.push({
                label: loc('!LOC:Disable conflicting mods'),
                primary: true,
                run: function (dialog) { disable(state, dialog); }
            });
        return {
            title: loc('!LOC:Conflicting mods'),
            content: function (body) {
                paragraph(body, loc('!LOC:Dynastiya already includes these mods. Enabling them alongside Dynastiya breaks its features.'));
                if (state.own.length) list(body, state.own);
                if (state.host.length) {
                    paragraph(body, loc('!LOC:The host has enabled conflicting server mods. Only the host can disable them:'));
                    list(body, state.host);
                }
                if (lobby && state.own.length)
                    note(body, loc('!LOC:The changes take effect after you leave the lobby.'));
            },
            actions: actions,
            onClose: function () {
                dismiss(key);
                modal = null;
            }
        };
    }

    function check() {
        var state = currentState();
        if (!state.own.length && !state.host.length) {
            if (modal) modal.close();
            modal = null;
            return;
        }
        if (dismissedKeys().indexOf(keyOf(state.own, state.host)) !== -1) return;
        if (modal && modal.isOpen()) modal.update(options(state));
        else modal = api.dynastiyaUi.modal(options(state));
    }

    $.when(manager.installedMods.ready).always(function () {
        check();
        if (!lobby) return;
        // Роль хоста и серверные моды лобби приходят от сервера позже показа сцены.
        var pending;
        function schedule() {
            clearTimeout(pending);
            pending = setTimeout(check, 250);
        }
        model.isGameCreator.subscribe(schedule);
        model.serverMods.subscribe(schedule);
    });
}());
