(function () {
    'use strict';

    var confirmed = ko.observable(false);
    var receivedSettings = false;
    var ensureScheduled = false;
    var originalSettings = handlers.settings;
    var originalStartEnabled = model.startEnabled;
    var originalStartGame = model.startGame;

    // Match the server's actual defeat condition, including the higher-priority sudden death mode.
    function validOptions(options) {
        return !!options && !!options.eradication_mode && !options.eradication_mode_sub_commanders &&
            !options.eradication_mode_factories && !options.eradication_mode_fabricators &&
            !options.sudden_death_mode;
    }

    // Keep local controls consistent with the rules sent by the host.
    function localOptionsAreValid() {
        return model.eradicationMode() && !model.eradicationModeSubCommanders() &&
            !model.eradicationModeFactories() && !model.eradicationModeFabricators() &&
            !model.suddenDeathMode();
    }

    // Apply the rules only after receiving settings, so unrelated lobby settings are preserved.
    function ensureRules() {
        ensureScheduled = false;
        if (!receivedSettings || !model.isGameCreator() || (confirmed() && localOptionsAreValid())) return;
        model.eradicationMode(true);
        model.eradicationModeSubCommanders(false);
        model.eradicationModeFactories(false);
        model.eradicationModeFabricators(false);
        model.suddenDeathMode(false);
        model.changeSettings();
    }

    // Defer corrections until the stock handler has applied the entire settings message.
    function scheduleRules() {
        if (ensureScheduled) return;
        ensureScheduled = true;
        setTimeout(ensureRules, 0);
    }

    handlers.settings = function (payload) {
        originalSettings.apply(this, arguments);
        receivedSettings = !!(payload && payload.game_options);
        confirmed(receivedSettings && validOptions(payload.game_options));
        if (model.isGameCreator() && !confirmed()) scheduleRules();
    };

    // A new host inherits the lobby state and must correct it before starting.
    model.isGameCreator.subscribe(function (isHost) {
        if (isHost) scheduleRules();
    });

    model.startEnabled = ko.pureComputed(function () {
        return originalStartEnabled() && confirmed() && localOptionsAreValid();
    });
    // Guard direct calls as well as the start button and automatic countdown.
    model.startGame = function () {
        if (model.startEnabled()) return originalStartGame.apply(this, arguments);
    };
    confirmed.subscribe(function () {
        if (model.scheduleAutoStart) model.scheduleAutoStart();
    });

    // The labels are shared by host and guests; disabling the callbacks also blocks label clicks.
    ['toggleeradicationMode', 'toggleeradicationModeSubCommanders', 'toggleeradicationModeFactories',
        'toggleeradicationModeFabricators', 'toggleSuddenDeathMode'].forEach(function (name) {
        model[name] = function () {};
        var label = $('label[data-bind*="click: ' + name + '"]');
        label.addClass('label_disabled');
        label.find('input').each(function () {
            var binding = $(this).attr('data-bind');
            $(this).attr('data-bind', binding.replace(/enable:\s*(canChangeSettings|canChangeeradicationMode)/, 'enable: false'));
        });
    });

    var eradication = $('label[data-bind*="click: toggleeradicationMode,"]').parent();
    $('<div class="dynastiya-rules-label">').text(loc('!LOC:Dynastiya default game mode')).insertBefore(eradication);
    $('<div class="dynastiya-rules-warning">').text(loc('!LOC:Waiting for the host to enable Dynastiya game rules.'))
        .attr('data-bind', 'visible: !dynastiyaRulesConfirmed()').insertAfter(eradication);
    model.dynastiyaRulesConfirmed = confirmed;
    loadCSS('coui://ui/mods/dynastiya.rules/new_game.css');
})();
