(function () {
    'use strict';
    // Boot loads global mods before scene models and the stock panel ready callback.
    // Excluded scenes keep their stock APIs; child HUD panels use the same fixes.
    var scene = window.location.pathname;
    if (!/^\/(?:ui\/)?main\/(main\.html|uberbar\/|game\/(new_game|server_browser|settings|start|live_game)\/)/.test(scene)) return;
    if (api.dynastiyaPanelLifecycle) return;
    api.dynastiyaPanelLifecycle = true;
    loadScript('coui://ui/mods/dynastiya.panel_lifecycle/panel.js');
    loadScript('coui://ui/mods/dynastiya.panel_lifecycle/holodeck.js');
}());
