(function () {
    'use strict';
    if (model.dynastiyaPlanets) return;
    model.dynastiyaPlanets = true;

    // Стандартный список создаёт модели всех планет заново на каждое сообщение
    // state. Для foreach это новые объекты, и он пересоздаёт строки вместе с
    // картинками и значком высадки. На высадке state приходит при каждом
    // переходе камеры между планетами, потому что меняется isSelected, и
    // список мигает (#21).
    //
    // Поэтому планета сохраняет прежнюю модель, пока меняется только выбор:
    // isSelected стал observable, и привязка css переключает подсветку на
    // месте. Другие изменения данных планеты по-прежнему создают новую модель.
    var PlanetModel = model.PlanetModel;
    var known = {};
    function shape(config) {
        return JSON.stringify(config, function (key, value) { return key === 'isSelected' ? undefined : value; });
    }
    model.PlanetModel = function (parent, config) {
        var data = shape(config);
        var slot = config.isSun ? 'sun' : config.index;
        var previous = known[slot];
        if (previous && previous.data === data) {
            previous.planet.isSelected(!!config.isSelected);
            return previous.planet;
        }

        PlanetModel.apply(this, arguments);
        this.isSelected = ko.observable(!!config.isSelected);
        this.canStart.dispose();
        var planet = this;
        // Спящий computed не держит подписку на общий флаг высадки, когда
        // модель планеты заменена новой.
        this.canStart = ko.pureComputed(function () { return parent.landing() && planet.starting_planet; });
        known[slot] = { data: data, planet: this };
    };
    model.PlanetModel.prototype = PlanetModel.prototype;

    // with: sun в KO 3.3 перерисовывает блок при каждом уведомлении, а
    // computed с объектом уведомляет всегда. Солнце сообщает об изменении,
    // только если сменилась сама модель.
    model.sun.equalityComparer = function (a, b) { return a === b; };
}());
