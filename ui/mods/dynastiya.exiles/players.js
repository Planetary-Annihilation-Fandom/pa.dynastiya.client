(function () {
    'use strict';
    ko.bindingHandlers.dynastiyaExilesArmy = {
        update: function (element, accessor) {
            var specs = _.values(ko.unwrap(accessor()) || {});
            element.classList.toggle('exilescom', specs.length > 0 && _.every(specs, exiles.isUnit));
        }
    };
    $('.player_masked').each(function () {
        this.setAttribute('data-bind', (this.getAttribute('data-bind') || '') + ', dynastiyaExilesArmy: $data.commanders || []');
    });
}());
