(function () {
    'use strict';
    if (window.dynastiyaInstantMotion) return;
    window.dynastiyaInstantMotion = true;

    // jQuery effects use JS timers, not CSS transitions. Keep their callbacks.
    if (window.jQuery && jQuery.fx) jQuery.fx.off = true;

    // Bootstrap 3 waits on emulated transition timers even when CSS transitions
    // are disabled. Remove only its modal fade marker before show computes the
    // backdrop lifecycle; closed transparent backdrops must not retain input.
    if (/\/game\/(new_game|start|settings|server_browser|live_game)\//.test(window.location.pathname))
        $(document).on('show.bs.modal.dynastiyaInstantMotion', '.modal', function () {
            $(this).removeClass('fade');
        });

    // Keep the animation lifecycle for scene listeners, but finish
    // entrance/exit motion on the next UI update. Semantic display delays remain.
    var names = {
        fadein: true,
        window_appear: true, uifadein: true,
        labelopen: true, labelappear: true, labelclose: true,
        labeldisappear: true, containerdisappear: true,
        combatappear: true, deathalert: true, closedeathalert: true
    };
    function finishMotion(event) {
        if (!names[event.animationName]) return;
        var element = event.target;
        // These stock animations are single-track. Avoid changing unrelated
        // animation tracks from another mod on the same element.
        var style = getComputedStyle(element);
        if (style.webkitAnimationName !== event.animationName) return;
        element.style.setProperty('-webkit-animation-duration', '0.001s', 'important');
        element.style.setProperty('animation-duration', '0.001s', 'important');
    }
    document.addEventListener('webkitAnimationStart', finishMotion, true);
    document.addEventListener('animationstart', finishMotion, true);
}());
