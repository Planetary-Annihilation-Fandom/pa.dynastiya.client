/* Filter build lists before BuildSet captures them. Rebuild from immutable source
 * parameters when research changes; selection and queue use the stock parser. */
(function () {
    'use strict';
    var research = dynastiyaResearch;
    var saved = research.read();
    if (saved && saved.match === localStorage.dynastiya_research_match) research.accept(saved);
    var original;
    model.dynastiyaResearchParams = function (params) {
        original = params;
        var units = _.extend({}, params.units), grid = {};
        Object.keys(params.grid).forEach(function (spec) {
            var resolved = research.resolve(spec);
            if (!resolved) return;
            grid[resolved] = params.grid[spec];
            if (resolved !== spec) {
                var from = params.units[spec + params.specTag];
                var to = params.units[resolved + params.specTag];
                if (from && to) units[resolved + params.specTag] = _.extend({}, to, {
                    buildGroup: from.buildGroup, buildIndex: from.buildIndex,
                    buildRow: from.buildRow, buildColumn: from.buildColumn
                });
            }
        });
        var lists = {};
        Object.keys(params.buildLists).forEach(function (spec) {
            lists[spec] = [];
            params.buildLists[spec].forEach(function (unit) {
                var id = research.resolve(unit.id);
                if (!id || !units[id]) return;
                lists[spec].push(units[id]);
            });
        });
        return _.extend({}, params, { units: units, buildLists: lists, grid: grid });
    };
    research.state.subscribe(function () {
        if (!original || !model.buildSet()) return;
        var selected = model.buildSet().selectedSpecs();
        var selection = { spec_ids: {}, build_orders: {} };
        Object.keys(selected).forEach(function (spec) { selection.spec_ids[spec] = 1; });
        // The latest real selection also preserves queue counters.
        if (model.dynastiyaLatestSelection) selection = model.dynastiyaLatestSelection;
        var previous = model.buildSet();
        var next = new model.BuildSet(original);
        var apply = function () { model.buildSet(next); model.parseSelection(selection); };
        var presentation = api.Panel.dockPresentation;
        if (presentation) presentation.present(selection, apply, JSON.stringify([Object.keys(selection.spec_ids), model.activeBuildGroup(), research.state()]));
        else apply();
        // BuildSet's computed observables otherwise retain old tab arrays.
        if (previous.tabsByGroup.dispose) previous.tabsByGroup.dispose();
        if (previous.empty.dispose) previous.empty.dispose();
    });
    var received = false;
    handlers['dynastiya.research'] = function (value) { received = true; research.accept(value); };
    api.Panel.query(api.Panel.parentId, 'panel.invoke', ['dynastiyaResearchState']).then(function (value) {
        if (!received) research.accept(value);
    });
}());
