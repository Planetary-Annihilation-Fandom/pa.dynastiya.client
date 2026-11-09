(function () {
    'use strict';

    // Only PA's informational KO tooltips. Popovers and manual scene panels
    // keep their own triggers, containers and lifetime.
    var binding = ko.bindingHandlers.tooltip;
    if (binding.dynastiyaLifecycle) return;
    binding.dynastiyaLifecycle = true;
    var originalInit = binding.init;
    var entries = [];

    binding.init = function (element) {
        var result = originalInit.apply(this, arguments);
        var $element = $(element);
        var tooltip = $element.data('bs.tooltip');
        if (!tooltip) return result;
        tooltip.options.delay = { show: 0, hide: 0 };
        tooltip.options.animation = false;
        var hovered = false;
        var focused = false;
        var disposed = false;

        function hide() {
            clearTimeout(tooltip.timeout);
            tooltip.hoverState = 'out';
            tooltip.hide();
        }
        function update() {
            if (hovered || focused) {
                clearTimeout(tooltip.timeout);
                tooltip.hoverState = 'in';
                if (!tooltip.$tip || !tooltip.$tip.hasClass('in')) tooltip.show();
            } else hide();
        }
        function reset() {
            hovered = focused = false;
            hide();
        }
        function dispose() {
            if (disposed) return;
            disposed = true;
            clearTimeout(tooltip.timeout);
            // destroy() in Bootstrap 3.0.3 neither clears timers nor forces
            // removal when a hide event is cancelled.
            tooltip.hoverState = 'out';
            tooltip.destroy();
            if (tooltip.$tip) tooltip.$tip.remove();
            $element.off('.dynastiyaTooltip');
            entries.splice(entries.indexOf(entry), 1);
        }
        var entry = { reset: reset, dispose: dispose };
        entries.push(entry);
        $element.off('mouseenter.tooltip mouseleave.tooltip focus.tooltip blur.tooltip');
        $element.on('mouseenter.dynastiyaTooltip', function () { hovered = true; update(); });
        $element.on('mouseleave.dynastiyaTooltip', function () { hovered = false; update(); });
        $element.on('focus.dynastiyaTooltip', function () { focused = true; update(); });
        $element.on('blur.dynastiyaTooltip', function () { focused = false; update(); });
        ko.utils.domNodeDisposal.addDisposeCallback(element, dispose);
        return result;
    };

    $(window).on('blur.dynastiyaTooltip', function (event) {
        if (event.target !== window) return;
        entries.slice().forEach(function (entry) { entry.reset(); });
    });
    $(window).on('pagehide.dynastiyaTooltip unload.dynastiyaTooltip', function () {
        entries.slice().forEach(function (entry) { entry.dispose(); });
    });
}());
