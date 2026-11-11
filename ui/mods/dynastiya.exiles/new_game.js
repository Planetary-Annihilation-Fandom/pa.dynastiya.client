(function () {
    'use strict';
    if (model.dynastiyaExilesLobby) return;
    model.dynastiyaExilesLobby = true;

    model.isExiles = function (commander) {
        return _.includes(exiles.commanders, exiles.specPath(commander));
    };

    // Дополняем исходные bindings выбора и слотов; обработчики и visible остаются штатными.
    ko.bindingHandlers.dynastiyaExilesCommander = {
        update: function (element, accessor) {
            element.classList.toggle('dyn-exiles', model.isExiles(ko.unwrap(accessor())));
        }
    };
    function bind(selector, expression) {
        $(selector).each(function () {
            var original = this.getAttribute('data-bind') || '';
            this.setAttribute('data-bind', original + ', dynastiyaExilesCommander: ' + expression);
        });
    }
    bind('#commander-picker .div-commander-picker-item', '$data');
    bind('#ai-commander-picker .div-commander-picker-item', '$data');
    bind('.slot-player', "$data.isEmpty() ? '' : $data.commander()");

    // Подсказка нужна, только если сервер лобби предлагает командиров Exiles.
    var hinted = false;
    function hint(commanders) {
        if (hinted || !model.localChatMessage || !_.some(commanders, model.isExiles)) return;
        hinted = true;
        model.localChatMessage(loc('!LOC:Exiles'), loc('!LOC:To play as the Exiles, choose a Commander with a blue frame.'));
    }
    hint(model.commanders());
    model.commanders.subscribe(hint);
}());
