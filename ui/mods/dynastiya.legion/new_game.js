(function () {
    'use strict';
    if (model.dynastiyaLegionLobby) return;
    model.dynastiyaLegionLobby = true;

    var COMMANDERS = [
        '/pa/units/commanders/l_overwatch/l_overwatch.json',
        '/pa/units/commanders/l_cyclops/l_cyclops.json',
        '/pa/units/commanders/l_cataphract/l_cataphract.json',
        '/pa/units/commanders/l_raptor/l_raptor.json',
        '/pa/units/commanders/l_quad/l_quad.json',
        '/pa/units/commanders/l_tank/l_tank.json'
    ];

    model.isLegion = function (commander) {
        return _.includes(COMMANDERS, commander);
    };

    // Привязки дописываются до применения ko к разметке лобби: командир Legion
    // и слот игрока за Legion получают класс, остальное поведение стандартное.
    $('#commander-picker .div-commander-picker-item').attr('data-bind',
        "css: { 'dyn-legion': model.isLegion($data) }, click: function () { model.setCommander($index()) }, click_sound: 'default', rollover_sound: 'default'");
    $('#ai-commander-picker .div-commander-picker-item').attr('data-bind',
        "css: { 'dyn-legion': model.isLegion($data) }, click: function () { model.setAICommander(model.selectedAI(), $data) }, click_sound: 'default', rollover_sound: 'default'");
    $('.slot-player').attr('data-bind',
        "css: { 'dyn-legion': !$data.isEmpty() && model.isLegion($data.commander()), ready: isReady, loading: isLoading }");

    // Подсказка нужна, только если сервер лобби предлагает командиров Legion.
    var hinted = false;
    function hint(commanders) {
        if (hinted || !model.localChatMessage || !_.some(commanders, model.isLegion)) return;
        hinted = true;
        model.localChatMessage(loc('!LOC:Legion'), loc('!LOC:To play as the Legion, choose a Commander with a red frame.'));
    }
    hint(model.commanders());
    model.commanders.subscribe(hint);
}());
