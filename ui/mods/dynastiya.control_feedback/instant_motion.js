(function () {
    'use strict';
    if (window.dynastiyaInstantMotion) return;
    window.dynastiyaInstantMotion = true;

    // jQuery effects use JS timers, not CSS transitions. Keep their callbacks.
    if (window.jQuery && jQuery.fx) jQuery.fx.off = true;

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
