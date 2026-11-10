(function () {
    'use strict';
    if (model.dynastiyaSettings) return;
    model.dynastiyaSettings = true;
    var panelVisible = ko.observable(!model.inPanel());
    var visibilityRevision = 0;
    var ownerControlsVisibility = false;
    handlers['dynastiya.settingsVisible'] = function (open) {
        ownerControlsVisibility = true;
        visibilityRevision++;
        panelVisible(!!open);
    };
    if (model.inPanel()) {
        var requestedRevision = visibilityRevision;
        api.Panel.query(api.Panel.parentId, 'panel.invoke', ['showSettings']).then(function (open) {
            if (requestedRevision === visibilityRevision) panelVisible(!!open);
        });
    }

    ['restoreDefaults', 'restoreGroupDefaults'].forEach(function (name) {
        var original = model[name];
        model[name] = function () {
            var result = original.apply(model, arguments);
            // Stock resets rebuild every field, including keyboard fields when
            // another group was reset. Recalculate their lost conflict indicators.
            model.updateKeyConflicts();
            return result;
        };
    });

    var retireAudio;
    var refreshAudioVisibility;
    function installAudioRefresh() {
        if (retireAudio) retireAudio();
        var item = model.settingsItemMap()['audio.device'];
        if (!item) return;
        var retired = false;
        var pending = !!item.loadSelectOptionsDeferred;
        var options = item.sourceOptions;
        function visible() { return panelVisible() && model.activeSettingsGroup() === 'audio'; }
        function stop() { clearTimeout(item.refreshTimeout); item.refreshTimeout = undefined; }
        function schedule() {
            stop();
            if (!retired && visible() && options.refresh)
                item.refreshTimeout = setTimeout(item.reloadSelectOptions, Math.max(5000, options.refresh * 1000));
        }
        retireAudio = function () {
            retired = true;
            stop();
            // The stock initial request can finish after a reset replaced its model.
            if (item.loadSelectOptionsDeferred)
                item.loadSelectOptionsDeferred.then(stop, stop);
        };
        item.reloadSelectOptions = function () {
            if (retired || pending || !visible()) return;
            stop();
            pending = true;
            var selected = item.value.peek();
            function finish() {
                pending = false;
                schedule();
            }
            try {
                options.deferred(selected).then(function (values) {
                    // The device list embeds an unavailable entry for the selection
                    // at request time. Requery if the player selected another device.
                    if (!retired && selected !== item.value.peek()) {
                        pending = false;
                        item.reloadSelectOptions();
                        return;
                    }
                    if (!retired && visible()) {
                        if (options.empty) values.unshift({ text: options.empty, value: undefined });
                        // Keep the current choices during the request and retain unchanged DOM.
                        if (!_.isEqual(values, item.selectOptions())) item.selectOptions(values);
                    }
                    finish();
                }, finish);
            } catch (error) { finish(); }
        };
        refreshAudioVisibility = function () {
            stop();
            if (visible()) item.reloadSelectOptions();
        };
        // Stock initialization can finish after the tab closes and install a
        // timer of its own. Retain its choices, but replace that timer in both cases.
        if (item.loadSelectOptionsDeferred) {
            var initialized = function () { pending = false; schedule(); };
            item.loadSelectOptionsDeferred.then(initialized, initialized);
        }
        stop();
    }
    installAudioRefresh();
    var subscriptions = [model.activeSettingsGroupIndex.subscribe(function () {
        model.cancelCaptureKeyCombo();
        if (refreshAudioVisibility) refreshAudioVisibility();
    }), model.activeKeyboardGroupIndex.subscribe(model.cancelCaptureKeyCombo),
    model.active.subscribe(function (active) {
        // Other stock parents (outside this task) also embed settings. They do
        // not send owner messages; keep their reopen path through stock focus.
        if (model.inPanel() && !ownerControlsVisibility) {
            visibilityRevision++;
            panelVisible(!!active);
        }
    }),
    panelVisible.subscribe(function (open) {
        if (!open) model.cancelCaptureKeyCombo();
        if (refreshAudioVisibility) refreshAudioVisibility();
    }), model.settingsItemMap.subscribe(installAudioRefresh)];
    $(window).on('unload', function () {
        if (retireAudio) retireAudio();
        subscriptions.forEach(function (subscription) { subscription.dispose(); });
    });
}());
