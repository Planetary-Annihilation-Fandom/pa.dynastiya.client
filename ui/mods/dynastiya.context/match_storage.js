/* localStorage with the current match as its context. Reads see only values of
 * this match; the first write in another match replaces the previous match's
 * data, so callers never compare lobby ids and old matches leave nothing behind.
 *
 *   dynastiyaMatchStorage.set('research', completed, dynastiyaIds.army());
 *   dynastiyaMatchStorage.get('research', dynastiyaIds.army());
 *
 * An optional typed id scopes a value inside the match. A null scope (no army
 * for a spectator) or an unknown match makes reads return undefined and writes
 * do nothing. */
(function () {
    'use strict';
    if (window.dynastiyaMatchStorage) return;
    var key = 'dynastiya.match_storage';
    // Research kept its own match checks before this storage existed.
    try { localStorage.removeItem('dynastiya_research'); localStorage.removeItem('dynastiya_research_match'); } catch (e) {}

    function entry(scope) {
        if (scope === null) return null;
        var match = dynastiyaIds.match();
        if (!match) return null;
        var data;
        try { data = JSON.parse(localStorage[key] || 'null'); } catch (e) {}
        var values = data && data.match === match.key && data.values || {};
        return { match: match.key, values: values };
    }
    function name(value, scope) { return scope ? value + '@' + dynastiyaIds.key(scope) : value; }
    function save(current) {
        try { localStorage[key] = JSON.stringify(current); return true; } catch (e) { return false; }
    }

    window.dynastiyaMatchStorage = {
        match: function () { return dynastiyaIds.match(); },
        get: function (value, scope) {
            var current = entry(scope);
            return current ? current.values[name(value, scope)] : undefined;
        },
        set: function (value, data, scope) {
            var current = entry(scope);
            if (!current) return false;
            current.values[name(value, scope)] = data;
            return save(current);
        },
        remove: function (value, scope) {
            var current = entry(scope);
            if (!current) return false;
            delete current.values[name(value, scope)];
            return save(current);
        }
    };
}());
