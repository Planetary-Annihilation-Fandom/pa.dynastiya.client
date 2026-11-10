(function () {
    'use strict';
    if (model.dynastiyaBuildBar) return;
    model.dynastiyaBuildBar = true;

    var BuildSet = model.BuildSet;
    model.BuildSet = function () {
        BuildSet.apply(this, arguments);
        // Queue/count changes do not change the resolved builders' build lists.
        // Keep the stock resolver and count updates, without resetting every tile.
        this.selectedSpecs.equalityComparer = function (oldSpecs, newSpecs) {
            var keys = Object.keys(oldSpecs);
            return keys.length === Object.keys(newSpecs).length && keys.every(function (key) {
                return Object.prototype.hasOwnProperty.call(newSpecs, key) && oldSpecs[key] === newSpecs[key];
            });
        };
    };
    model.BuildSet.prototype = BuildSet.prototype;
    Object.keys(BuildSet).forEach(function (key) { model.BuildSet[key] = BuildSet[key]; });

    var waiting = false;
    var latestSelection;
    function contentKey(selection, group) {
        return JSON.stringify([Object.keys(selection.spec_ids || {}).sort(), group]);
    }
    // Switching tabs changes the grid even when the builder selection is fixed.
    // Share the same composite key with selection updates (one owner per dock).
    if (ko.isObservable(model.activeBuildGroup)) model.activeBuildGroup.subscribe(function (group) {
        if (latestSelection && api.Panel.dockPresentation)
            api.Panel.dockPresentation.present(null, function () {}, contentKey(latestSelection, group));
    });
    handlers.selection = function (payload) {
        latestSelection = payload;
        if (waiting) return;
        waiting = true;
        // While specs load, intermediate selections are obsolete. Once ready,
        // commands and queue changes still reach parseSelection synchronously.
        $.when(model.unitSpecs, model.getSpecTag).then(function () {
            waiting = false;
            var selection = latestSelection;
            var presentation = api.Panel.dockPresentation;
            if (presentation) {
                // Counts and queues update in place; a different set of builder
                // specs requires a new build grid, regardless of unit names.
                var key = contentKey(selection, ko.unwrap(model.activeBuildGroup));
                presentation.present(selection, function (value) {
                    model.parseSelection(value);
                }, key);
            } else model.parseSelection(selection);
        }, function () { waiting = false; });
    };
}());
