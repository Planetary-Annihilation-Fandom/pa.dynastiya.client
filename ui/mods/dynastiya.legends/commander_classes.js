// Load the server's class catalogue so the lobby and unit specs share one mapping.
(function (global) {
    var catalogue = null;
    var loaded = $.Deferred();

    $.get('spec://pa/dynastiya/commander_classes.json').then(function (data) {
        if (!data || !data.classes || !data.commanders) {
            loaded.reject('Invalid commander class catalogue');
            return;
        }
        catalogue = data;
        loaded.resolve(data);
    }, function () {
        loaded.reject('Commander class catalogue is unavailable');
    });

    // Return no class for unknown specs, including entries added by other mods.
    function getClassId(spec) {
        if (!catalogue || !Object.prototype.hasOwnProperty.call(catalogue.commanders, spec)) return null;
        var id = catalogue.commanders[spec];
        return Object.prototype.hasOwnProperty.call(catalogue.classes, id) ? id : null;
    }

    global.DynastiyaCommanderClasses = {
        loaded: loaded.promise(),
        getClassId: getClassId,
        // Resolve the catalogue entry without guessing a class from a file name.
        getClass: function (spec) {
            var id = getClassId(spec);
            return id ? catalogue.classes[id] : null;
        },
        // Return a copy so game rules cannot alter the shared catalogue.
        getCombatSuperforms: function (id) {
            var entry = catalogue && catalogue.classes[id];
            return entry && Array.isArray(entry.combatSuperforms) ? entry.combatSuperforms.slice() : [];
        },
        // The current picker identifies superform portraits by their catalogue icons.
        isSuperformIcon: function (url) {
            if (!catalogue || !url) return false;
            return _.some(catalogue.classes, function (entry) {
                return !!entry.icon && url.indexOf(entry.icon) !== -1;
            });
        },
        // Keep the original order and never add entries the game has not made available.
        classified: function (specs) {
            return _.filter(specs || [], function (spec) { return !!getClassId(spec); });
        }
    };
})(window);
