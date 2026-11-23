/** Проверяет доступность суперформ и выполняет переход для армии игрока. */
(function () {
    'use strict';
    var catalogue = window.DynastiyaCommanderClasses;
    var models = window.DynastiyaMatchModels;
    var rules = {};
    var blocked = {};
    var inFlight = false;
    var pending = {};
    var transitions = {};

    /** Убирает суффикс армии, добавляемый игрой после расширения спецификации. */
    function baseSpec(spec) {
        var match = typeof spec === 'string' && /^(.*\.json)/.exec(spec);
        return match ? match[1] : spec;
    }

    /** Передаёт панели и обработчикам команд единый набор запрещённых спецификаций. */
    function publish() {
        if (api.panels.build_bar) api.panels.build_bar.message('dynastiyaSuperformLocks', blocked);
    }

    /** При ошибке чтения не разрешает новое строительство по устаревшим данным. */
    function failClosed() {
        Object.keys(blocked).forEach(function (spec) { blocked[spec] = true; });
        inFlight = false;
        publish();
    }

    /** Обновляет запреты только после успешного чтения состояния всех нужных юнитов. */
    function applyState(starting, units, ids, states) {
        var limits = {};
        var bases = {};
        var forms = {};
        var completed = {};
        var stateById = {};
        var nextBlocked = {};
        starting.forEach(function (slot) {
            if (slot.classId && rules[slot.classId]) limits[slot.classId] = (limits[slot.classId] || 0) + 1;
        });
        states.forEach(function (state, index) { if (state) stateById[ids[index]] = state; });
        Object.keys(units).forEach(function (spec) {
            var path = baseSpec(spec);
            var classId = catalogue.getClassId(path);
            if (classId && rules[classId]) bases[classId] = (bases[classId] || []).concat(units[spec]);
            Object.keys(rules).forEach(function (id) {
                if (rules[id].forms.indexOf(path) < 0) return;
                forms[id] = (forms[id] || []).concat(units[spec]);
                units[spec].forEach(function (unitId) {
                    var state = stateById[unitId];
                    if (state && state.built_frac === undefined) (completed[id] || (completed[id] = [])).push(unitId);
                });
            });
        });
        Object.keys(rules).forEach(function (id) {
            var limit = limits[id] || 0;
            var formCount = (forms[id] || []).length;
            rules[id].forms.forEach(function (spec) { nextBlocked[spec] = formCount >= limit; });
            if (id === 'tank') return;
            var availableBases = (bases[id] || []).slice().sort(function (a, b) { return a - b; });
            var completedForms = (completed[id] || []).slice().sort(function (a, b) { return a - b; });
            var transition = transitions[id];
            if (!transition) {
                transition = transitions[id] = { handled: {}, targeted: {} };
                // After reconnect, treat missing starting bodies as already replaced before issuing new orders.
                completedForms.slice(0, Math.max(0, limit - availableBases.length)).forEach(function (unitId) {
                    transition.handled[unitId] = true;
                });
            }
            var unhandled = completedForms.filter(function (unitId) { return !transition.handled[unitId]; });
            var untargeted = availableBases.filter(function (unitId) { return !transition.targeted[unitId]; });
            var count = Math.min(unhandled.length, untargeted.length);
            if (count && !pending[id]) {
                pending[id] = true;
                var selected = unhandled.slice(0, count);
                var selectedBases = untargeted.slice(0, count);
                selected.forEach(function (unitId) { transition.handled[unitId] = true; });
                selectedBases.forEach(function (unitId) { transition.targeted[unitId] = true; });
                api.getWorldView(0).sendOrder({ units: selectedBases, command: 'self_destruct' })
                    .then(function (ok) {
                        if (!ok) {
                            selected.forEach(function (unitId) { delete transition.handled[unitId]; });
                            selectedBases.forEach(function (unitId) { delete transition.targeted[unitId]; });
                        }
                    }, function () {
                        selected.forEach(function (unitId) { delete transition.handled[unitId]; });
                        selectedBases.forEach(function (unitId) { delete transition.targeted[unitId]; });
                    }).always(function () { pending[id] = false; });
            }
        });
        blocked = nextBlocked;
        if (model.mode() === 'fab' && blockedSpec(model.currentBuildStructureId())) model.endFabMode();
        publish();
    }

    /** Раз в два секунды читает армию на всех планетах, не запуская параллельные проверки. */
    function check() {
        if (!inFlight && !model.isSpectator() && !model.showLanding() && model.armyIndex() >= 0) {
            var starting = models.get('startingCommanderClasses', { army: model.armyId() });
            if (starting) {
                inFlight = true;
                var world = api.getWorldView(0);
                var context = models.context();
                var planetState = model.planetListState();
                var planets = planetState && planetState.planets || [];
                var units = {};
                var queries = planets.filter(function (planet) { return typeof planet.index === 'number'; }).map(function (planet) {
                    var query = $.Deferred();
                    world.getArmyUnits(model.armyIndex(), planet.index).then(function (onPlanet) {
                        Object.keys(onPlanet).forEach(function (spec) {
                            units[spec] = (units[spec] || []).concat(onPlanet[spec]);
                        });
                        query.resolve();
                    }, function (error) { query.reject(error); });
                    return query.promise();
                });
                if (!queries.length) { failClosed(); setTimeout(check, 2000); return; }
                $.when.apply($, queries).then(function () {
                    if (models.context() !== context) { inFlight = false; return; }
                    var ids = [];
                    Object.keys(units).forEach(function (spec) {
                        var path = baseSpec(spec);
                        if (Object.keys(rules).some(function (id) { return rules[id].forms.indexOf(path) >= 0; })) {
                            ids = ids.concat(units[spec]);
                        }
                    });
                    if (!ids.length) { applyState(starting, units, [], []); inFlight = false; return; }
                    world.getUnitState(ids).then(function (states) {
                        if (models.context() !== context) return;
                        applyState(starting, units, ids, Array.isArray(states) ? states : [states]);
                    }, function () { failClosed(); }).always(function () { inFlight = false; });
                }).fail(failClosed);
            }
        }
        setTimeout(check, 2000);
    }

    /** Не позволяет начинать закрытую суперформу через кнопку, горячую клавишу или выбор по спецификации. */
    function blockedSpec(spec) { return !!blocked[baseSpec(spec)]; }
    var originalStart = model.executeStartBuild;
    model.executeStartBuild = function (params) {
        if (!params.cancel && blockedSpec(params.item)) return;
        return originalStart.apply(this, arguments);
    };
    var originalBySpec = model.buildItemBySpec;
    model.buildItemBySpec = function (spec) {
        if (blockedSpec(spec)) return;
        return originalBySpec.apply(this, arguments);
    };

    model.restart.subscribe(function (restarting) {
        if (!restarting) return;
        transitions = {};
        pending = {};
        Object.keys(blocked).forEach(function (spec) { blocked[spec] = true; });
        publish();
    });

    catalogue.loaded.done(function (data) {
        Object.keys(data.classes).forEach(function (id) {
            rules[id] = { forms: catalogue.getCombatSuperforms(id) };
            rules[id].forms.forEach(function (spec) { blocked[spec] = true; });
        });
        publish();
        check();
    });
}());
