(function () {
    'use strict';
    if (model.dynastiyaPausedTimer) return;
    model.dynastiyaPausedTimer = true;
    var timer;
    function stop() { clearTimeout(timer); timer = undefined; }
    model.tickTimer = function () {
        stop();
        if (!model.ranked() || !model.paused()) return;
        if (model.timer() > 0) model.timer(model.timer() - 1);
        timer = setTimeout(model.tickTimer, 1000);
    };
    // Repeated control_state packets must not start parallel countdowns. The
    // countdown belongs to a pause, not to an acknowledgement of its state.
    handlers.control_state = function (payload) {
        model.paused(payload.paused);
        model.restart(payload.restart);
        model.saving(payload.saving);
    };
    var running = ko.computed(function () { return model.paused() && model.ranked(); });
    function change(active) {
        stop();
        model.resetTimer();
        if (active) model.tickTimer();
    }
    var subscription = running.subscribe(change);
    change(running());
    $(window).on('unload.dynastiyaPausedTimer', function () {
        stop(); subscription.dispose(); running.dispose();
    });
}());
