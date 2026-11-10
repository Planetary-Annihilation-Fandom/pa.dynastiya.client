(function () {
    'use strict';
    if (model.dynastiyaOptionsBar) return;
    model.dynastiyaOptionsBar = true;

    ['toggleStreaming', 'toggleMicrophone', 'toggleSounds', 'toggleCustomFormations',
        'togglePips', 'toggleTimeControls', 'toggleUberBar', 'toggleMenu', 'togglePrimaryPOV'].forEach(function (name) {
        var pending = false;
        model[name] = function () {
            if (pending) return;
            pending = true;
            function release() { pending = false; }
            try {
                // Keep the in-flight interlock, without the stock extra 750 ms
                // lockout after acknowledgement. A failed query must release it too.
                api.Panel.query(api.Panel.parentId, 'panel.invoke', [name]).then(release, release);
            } catch (error) {
                release();
                throw error;
            }
        };
    });
}());
