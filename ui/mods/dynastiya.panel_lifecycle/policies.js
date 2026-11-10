/* Presentation policy for every stock HUD scene and the priority full pages. */
(function () {
    'use strict';
    if (api.Panel.presentationPolicies) return;
    api.Panel.presentationPolicies = true;
    var register = app.registerWithCoherent;
    app.registerWithCoherent = function (model, handlers) {
        var scene = window.location.pathname.split('/').pop().replace(/\.html$/, '').replace(/^live_game_pip_.+$/, 'live_game_pip');
        var dispose = [];
        function value(name) { return ko.isObservable(model[name]) ? model[name]() : undefined; }
        function fields(names) { return names.split(' ').map(value); }
        function ids(name) {
            return (value(name) || []).map(function (row) {
                return [ko.unwrap(row.id), ko.unwrap(row.index), ko.unwrap(row.name), ko.unwrap(row.spec_id),
                    ko.unwrap(row.entity), ko.unwrap(row.army_id), ko.unwrap(row.type)];
            });
        }
        function stateFields(names) {
            var state = value('state') || {};
            return names.split(' ').map(function (name) { return state[name]; });
        }
        function groupShape(group) { return [!!(group && group.total), Object.keys(group && group.breakdown || {})]; }
        // Each key contains identity/sections only. Resource totals, clocks,
        // progress bars, camera coordinates, order values and text input stay live.
        var keys = {
            live_game_action_bar: function () { return fields('showCommands showOrders allowMove allowAttack allowAssist allowRepair allowReclaim allowPatrol allowUse allowSpecialMove allowUnload allowLoad allowFireSecondaryWeapon allowMassTeleport allowStop allowFireOrders allowMoveOrders allowEnergyOrders allowBuildStanceOrders'); },
            live_game_celestial_control: function () { return stateFields('active findingTargetPlanet findingTargetSurfacePosition actionIndex'); },
            live_game_chat: function () { return fields('chatSelected teamChat spectatorChat'); },
            live_game_control_group_bar: function () { return [fields('hasSelection restart'),
                groupShape(value('currentFocusPlanetIdleFabberGroup')), groupShape(value('currentFocusPlanetIdleFactoryGroup')),
                (value('controlGroupList') || []).map(groupShape)]; },
            live_game_devmode: function () { return [fields('cheatAllowChangeVision cheatAllowChangeControl'), ids('players')]; },
            live_game_econ: function () { return fields('showResources showSharedResources'); },
            live_game_menu: function () { return [value('gwCampaignRole'), (value('state') || []).map(function (item) { return [item.action, item.label]; })]; },
            live_game_message: function () { return fields('message buttonLabel helper'); },
            live_game_options_bar: function () { return [stateFields('pip uber_bar custom_formations'), value('showServerRate')]; },
            live_game_paused_popup: function () { return fields('paused restart saving ranked'); },
            live_game_pip: function () { return fields('alertMode mirrorMode'); },
            live_game_planets: function () { return ids('planets'); },
            live_game_players: function () { return ids('players'); },
            live_game_popup: function () { return [value('visible'), value('params')]; },
            live_game_sandbox: function () { return [value('sandbox_expanded'), (value('sandbox_units') || []).length]; },
            live_game_time_bar: function () { return fields('visible isSpectator showPlayFromHere'); },
            live_game_time_bar_alerts: function () { return [value('visible'), (value('items') || []).map(function (item) { return [ko.unwrap(item.name), ko.unwrap(item.ready)]; })]; },
            live_game_unit_alert: function () { return [value('showingPreview'), ids('alerts'), ids('combatList'), ids('defeatedArmyAlerts'), ids('specialWeaponAlerts')]; }
        };
        // These readers do not own rendering or a prepared replacement to reveal.
        // Stock KO updates retained DOM. Only request measurement here;
        // concealing the whole native view here blanks unrelated controls too.
        // Explicit preparation in buildbar/world-hover adapters is independent.
        if (keys[scene] && api.Panel.dockPresentation)
            dispose.push(api.Panel.watchPresentation(api.Panel.dockPresentation, keys[scene], 'update'));
        model.dynastiyaPresentationPolicy = keys[scene] ? 'live-update' :
            (/live_game_(world_popup|selection|build_bar)/.test(scene) ? 'data-adapter' :
                (/^(start|new_game|live_game)$/.test(scene) ? 'local-sections' : 'live'));

        // Install after KO has associated each section with its binding context.
        // Local sections must never hide the full lobby, game world or main menu.
        var selectors = {
            start: '.top-nav-dropdown,.div_tutorial_popup,#events,#events-panel,#mod-highlights-panel,#news,#mini-board,#streams,#videos,#links-panel,#player-profile,#login,#connecting,#error,#reconnectDlg,.div_build_number_dialog',
            // Persistent lobby sections already share one native viewport. KO
            // updates them in place: never conceal a roster, system or options
            // block for changing server data. Only newly opened overlays prepare.
            new_game: '.div-system-picker-cont,.div-commander-picker-cont,.div-color-picker-cont,#error,#start-error',
            live_game: '.div_tutorial_bar,.div_game_over_popup_overlay,.div_gamestats_panel'
        };
        var applyBindings = ko.applyBindings;
        if (selectors[scene]) ko.applyBindings = function (boundModel, root) {
            var result = applyBindings.apply(this, arguments);
            if (boundModel !== model) return result;
            ko.applyBindings = applyBindings;
            function attach(element) {
                if (element.dynastiyaPresentationSurface) return;
                var releases = [];
                function release() {
                    releases.splice(0).forEach(function (fn) { fn(); });
                    delete element.dynastiyaPresentationSurface;
                    var index = dispose.indexOf(release);
                    if (index >= 0) dispose.splice(index, 1);
                }

                var context = ko.contextFor(element);
                if (!context) return;
                var bindings = ko.bindingProvider.instance.getBindingAccessors(element, context) || {};
                var read = bindings.visible || bindings['if'];
                var local = element.dynastiyaPresentationSurface = api.Panel.createPresentation(element);
                ko.utils.domNodeDisposal.addDisposeCallback(element, release);
                dispose.push(release);
                // KO owns actual visibility. Opening retained DOM is an update,
                // not a second preparation after it has already become visible.
                if (read) {
                    var owners = [read];
                    for (var parent = element.parentElement; parent; parent = parent.parentElement) {
                        var parentContext = ko.contextFor(parent);
                        if (!parentContext) continue;
                        var parentBindings = ko.bindingProvider.instance.getBindingAccessors(parent, parentContext) || {};
                        if (parentBindings.visible) owners.push(parentBindings.visible);
                    }
                    var visible = ko.computed(function () {
                        return owners.every(function (owner) { return !!ko.unwrap(owner()); });
                    });
                    var change = function (open) {
                        if (open) local.update(null, function () {});
                        else local.cancel();
                    };
                    var subscription = visible.subscribe(change);
                    change(visible());
                    releases.push(function () { subscription.dispose(); visible.dispose(); });
                } else {
                    // jQuery owns dialog visibility; never hide it again in the
                    // shown callback. Closing only cancels outstanding work.
                    var dialog = $(element);
                    dialog.on('dialogopen.dynastiyaPresentation shown.bs.modal.dynastiyaPresentation', function () {
                        local.update(null, function () {});
                    });
                    dialog.on('dialogclose.dynastiyaPresentation hidden.bs.modal.dynastiyaPresentation', local.cancel);
                    releases.push(function () { dialog.off('.dynastiyaPresentation'); });
                    if (element.offsetWidth || element.offsetHeight) local.update(null, function () {});
                }
                releases.push(local.dispose);
            }
            Array.prototype.forEach.call((root || document).querySelectorAll(selectors[scene]), attach);
            // KO creates colour pickers and other conditional sections later.
            // Ignore text replacements; only inspect newly inserted elements.
            var observer = new MutationObserver(function (records) {
                records.forEach(function (record) {
                    Array.prototype.forEach.call(record.addedNodes, function (node) {
                        if (node.nodeType !== 1) return;
                        if (node.matches(selectors[scene])) attach(node);
                        Array.prototype.forEach.call(node.querySelectorAll(selectors[scene]), attach);
                    });
                });
            });
            observer.observe(root || document.body, {childList:true,subtree:true});
            dispose.push(function () { observer.disconnect(); });
            return result;
        };
        $(window).on('beforeunload', function () {
            dispose.slice().forEach(function (release) { release(); });
            if (ko.applyBindings !== applyBindings && selectors[scene]) ko.applyBindings = applyBindings;
        });
        return register.apply(this, arguments);
    };
}());
