// Register the PA Legends units in free cells alongside the Second Wave units.
(function () {
    var grid = Build.HotkeyModel.SpecIdToGridMap;
    _.assign(grid, {
        '/pa/units/palegends/palegends_zeus/palegends_zeus.json':
            ['factory', 6, { row: 0, column: 6 }],
        '/pa/units/palegends/palegends_atlas/palegends_atlas.json':
            ['factory', 7, { row: 0, column: 7 }],
        '/pa/units/palegends/palegends_uran/palegends_uran.json':
            ['factory', 8, { row: 0, column: 8 }],
        '/pa/units/palegends/palegends_helios/palegends_helios.json':
            ['orbital_structure', 2, { row: 0, column: 2 }],
        '/pa/units/commanders/palegends_colonel/palegends_colonel.json':
            ['vehicle', 3, { row: 0, column: 3 }]
    });
})();
