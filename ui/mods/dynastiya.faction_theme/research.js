/* Declarative faction research. Only live_game owns completion; consumers derive
 * build availability from the same snapshot, including before their first frame. */
(function () {
    'use strict';
    if (window.dynastiyaResearch) return;
    var state = ko.observable({ completed: [] });
    var definitions = [];
    dynastiyaFactionTheme.factions.forEach(function (faction) {
        if (faction.research) definitions.push(faction.research);
    });
    var availability = ko.pureComputed(function () {
        var locked = {}, replacements = {};
        definitions.forEach(function (definition) {
            definition.locked.forEach(function (spec) { locked[spec] = true; });
            definition.unlocks.forEach(function (pair) {
                if (state().completed.indexOf(pair[0]) < 0) return;
                pair[1].forEach(function (spec) { delete locked[spec]; });
                pair[2].forEach(function (spec, i) {
                    if (pair[3] && pair[1][i] === spec) return;
                    locked[spec] = true;
                    if (pair[3] && pair[1][i]) replacements[spec] = pair[1][i];
                });
            });
        });
        return { locked: locked, replacements: replacements };
    });
    window.dynastiyaResearch = {
        state: state, definitions: definitions,
        availability: availability,
        accept: function (value) {
            if (!value || !_.isArray(value.completed)) return;
            if (JSON.stringify(value) !== JSON.stringify(state())) state(value);
        },
        resolve: function (spec) {
            var path = dynastiyaFactionTheme.specPath(spec), data = availability();
            var replacement = data.replacements[path];
            if (replacement) return replacement + spec.slice(path.length);
            return data.locked[path] ? null : spec;
        }
    };
}());
