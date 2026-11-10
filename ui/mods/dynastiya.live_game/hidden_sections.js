(function () {
    'use strict';
    if (model.dynastiyaHiddenSections) return;
    model.dynastiyaHiddenSections = true;
    // The settings scene is retained when its parent closes it. Focus is not
    // visibility (an open select can move focus), so send the owner's state.
    var subscription = model.showSettings.subscribe(function (open) {
        if (api.panels.settings) api.panels.settings.message('dynastiya.settingsVisible', open);
    });
    $(window).on('unload.dynastiyaHiddenSections', function () { subscription.dispose(); });
}());
