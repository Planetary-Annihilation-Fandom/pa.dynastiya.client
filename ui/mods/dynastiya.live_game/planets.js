(function () {
    'use strict';
    if (model.dynastiyaPlanets) return;
    model.dynastiyaPlanets = true;

    var PlanetModel = model.PlanetModel;
    model.PlanetModel = function (parent) {
        PlanetModel.apply(this, arguments);
        this.canStart.dispose();
        var planet = this;
        // Stock rebuilds planet models on every state update. A sleeping computed
        // does not leave discarded models subscribed to the shared landing flag.
        this.canStart = ko.pureComputed(function () { return parent.landing() && planet.starting_planet; });
    };
    model.PlanetModel.prototype = PlanetModel.prototype;
}());
