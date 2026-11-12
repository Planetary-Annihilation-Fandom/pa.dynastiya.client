/* Source selection recordings; one sound per selected unit type, no UI timers. */
(function () {
    'use strict';
    var sounds = ko.observable({}), previous = '';
    $.getJSON('coui://ui/mods/bugs_faction/live_game/selection_list.json').then(sounds);
    var subscription = ko.computed(function () {
        var selection = model.selection();
        var specs = Object.keys(selection && selection.spec_ids || {}).sort();
        var key = specs.join('|');
        var map = sounds();
        if (key === previous) return;
        previous = key;
        var played = {};
        specs.forEach(function (spec) {
            var list = map[dynastiyaFactionTheme.specPath(spec)];
            if (list && list[0] && !played[list[0]]) { played[list[0]] = true; api.audio.playSoundFromFile(list[0]); }
        });
    });
    window.addEventListener('unload', function () { subscription.dispose(); });
}());
