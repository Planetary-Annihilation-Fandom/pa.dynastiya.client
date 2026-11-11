(function () {
    'use strict';
    if (model.dynastiyaLegionLobby) return;
    model.dynastiyaLegionLobby = true;

    model.isLegion = function (commander) {
        return _.includes(legion.commanders, legion.specPath(commander));
    };

    // Дополняем исходные bindings выбора и слотов; обработчики и visible остаются штатными.
    ko.bindingHandlers.dynastiyaLegionCommander = {
        update: function (element, accessor) {
            element.classList.toggle('dyn-legion', model.isLegion(ko.unwrap(accessor())));
        }
    };
    function bind(selector, expression) {
        $(selector).each(function () {
            var original = this.getAttribute('data-bind') || '';
            this.setAttribute('data-bind', original + ', dynastiyaLegionCommander: ' + expression);
        });
    }
    bind('#commander-picker .div-commander-picker-item', '$data');
    bind('#ai-commander-picker .div-commander-picker-item', '$data');
    bind('.slot-player', "$data.isEmpty() ? '' : $data.commander()");

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
