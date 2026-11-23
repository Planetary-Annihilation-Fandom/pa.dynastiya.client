/** Хранит модели в сцене матча; дочерние панели обращаются к ним через panel.invoke. */
(function () {
    'use strict';
    var values = Object.create(null);
    var match;

    /** Очищает модели и создаёт новый контекст, в том числе при перезапуске без смены сцены. */
    function reset() {
        values = Object.create(null);
        match = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
    }
    reset();
    model.restart.subscribe(function (restarting) { if (restarting) reset(); });

    /** Составляет ключ модели. Неполная область недопустима, чтобы не обратиться к данным другой области. */
    function key(name, scope) {
        if (typeof name !== 'string' || !name || !scope ||
            (scope.army !== undefined && scope.army !== null && typeof scope.army !== 'string' && typeof scope.army !== 'number') ||
            (scope.player !== undefined && scope.player !== null && typeof scope.player !== 'string' && typeof scope.player !== 'number') ||
            scope.army === null || scope.player === null || scope.army === '' || scope.player === '' ||
            (scope.player !== undefined && scope.army === undefined)) return null;
        return JSON.stringify([name, scope.army === undefined ? null : String(scope.army),
            scope.player === undefined ? null : String(scope.player)]);
    }

    /** Копирует JSON-значение, чтобы вызывающий код не менял хранимые данные по ссылке. */
    function copy(value) { return JSON.parse(JSON.stringify(value)); }

    window.DynastiyaMatchModels = {
        /** Возвращает токен текущего контекста для запросов дочерних панелей. */
        context: function () { return match; },
        /** Возвращает копию значения или null, если оно отсутствует либо область задана неверно. */
        get: function (name, scope) {
            var id = key(name, scope);
            return id && Object.prototype.hasOwnProperty.call(values, id) ? copy(values[id]) : null;
        },
        /** Сохраняет JSON-значение в указанной области; при ошибке возвращает false. */
        set: function (name, scope, value) {
            var id = key(name, scope);
            if (!id || value === undefined) return false;
            try { values[id] = copy(value); return true; } catch (e) { return false; }
        },
        /** Удаляет значение в указанной области, не затрагивая остальные области. */
        remove: function (name, scope) {
            var id = key(name, scope);
            if (!id) return false;
            delete values[id];
            return true;
        }
    };

    /** Обрабатывает запрос панели; старый токен защищает новый контекст от запоздавших запросов. */
    model.dynastiyaModels = function (token, operation, name, scope, value) {
        if (operation === 'context') return match;
        if (token !== match || ['get', 'set', 'remove'].indexOf(operation) === -1) return null;
        return window.DynastiyaMatchModels[operation](name, scope, value);
    };
}());
