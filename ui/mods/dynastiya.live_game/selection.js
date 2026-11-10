(function () {
    'use strict';
    if (model.dynastiyaSelection) return;
    model.dynastiyaSelection = true;

    // Install before bindings: retain the summary model and rows across updates.
    var selection = model.selectionModel();
    model.selectionList.dispose();
    selection.list.dispose();
    selection.list = ko.observableArray([]);
    model.selectionList = ko.computed(function () { return model.selectionModel().list(); });
    var rows = Object.create(null);

    model.parseSelection = handlers.selection = function (payload) {
        var specs = payload.spec_ids || {};
        var types = Object.keys(specs);
        var groups = payload.spec_groups || {};
        var nextRows = Object.create(null);
        var total = 0;
        var changed = false;
        var list = types.map(function (type) {
            var count = specs[type].length;
            var specGroups = groups[type] || [];
            var group = specGroups.length ? specGroups[0] : '';
            if (specGroups.length > 1) group = group + '+';
            var row = rows[type];
            if (!row) {
                row = { type: type, count: ko.observable(count), group: ko.observable(group),
                    hasGroup: ko.observable(group !== ''), icon: Build.iconForSpecId(type) };
                changed = true;
            } else {
                if (row.count() !== count || row.group() !== group) changed = true;
                row.count(count);
                row.group(group);
                row.hasGroup(group !== '');
            }
            total += count;
            nextRows[type] = row;
            return row;
        });
        var previous = selection.list();
        if (previous.length !== list.length || list.some(function (row, index) { return row !== previous[index]; })) {
            selection.list(list);
            changed = true;
        }
        rows = nextRows;
        selection.total(total);
        // Preserve the stock model's public fields for other scene mods.
        if (!_.isEqual(selection.types(), types)) selection.types(types);
        var counts = list.map(function (row) { return row.count(); });
        if (!_.isEqual(selection.counts(), counts)) selection.counts(counts);
        if (!_.isEqual(selection.groups(), groups)) selection.groups(groups);
        if (changed) {
            api.Panel.onBodyResize();
            _.delay(api.Panel.onBodyResize);
        }
    };
    var applySelection = handlers.selection;
    model.parseSelection = handlers.selection = function (payload) {
        var presentation = api.Panel.dockPresentation;
        if (!presentation) { applySelection(payload); return; }
        // The retained list commits synchronously; it has no asynchronous staged
        // replacement. Resize after applying rows, without blanking the selection.
        presentation.update(payload, applySelection);
    };
}());
