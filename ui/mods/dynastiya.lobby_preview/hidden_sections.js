(function () {
    'use strict';
    if (model.dynastiyaHiddenLobbyLists) return;
    model.dynastiyaHiddenLobbyLists = true;
    var dispose = [];
    function list(owner, name, source, format) {
        owner[name].dispose();
        var cached = [];
        var formatted = ko.pureComputed(function () { return _.map(source(), format); });
        // Preserve the picker DOM and scroll on close. Only presentation data
        // sleeps: recent history, generated systems and the roster remain current.
        owner[name] = ko.computed(function () {
            if (!model.showSystemPicker() || !model.canChangeSettings()) return cached;
            cached = formatted();
            return cached;
        });
        dispose.push(owner[name]);
        dispose.push(formatted);
    }
    list(model, 'processedRecentSystems', model.recentSystems, model.processRecentSystem);
    list(model, 'processedDefaultSystems', model.defaultSystems, model.processSystem);
    list(model.systemGenerator, 'processedRandomSystems', model.systemGenerator.createdRandomSystems, model.processSystem);
    $(window).on('unload.dynastiyaHiddenLobby', function () {
        dispose.forEach(function (value) { value.dispose(); });
    });
}());
