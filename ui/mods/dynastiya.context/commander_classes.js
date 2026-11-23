/** Запоминает начальные классы по серверному списку слотов каждой армии. */
(function () {
    'use strict';
    var models = window.DynastiyaMatchModels;
    var catalogue = window.DynastiyaCommanderClasses;
    var ready = false;

    /** Сохраняет по записи на слот, включая повторяющиеся и неизвестные классы. Ждёт загрузки справочника. */
    function capture() {
        if (!ready) return;
        (model.players() || []).forEach(function (army) {
            if (!army || army.id === undefined || army.id === null || !Array.isArray(army.commanders) || !army.commanders.length) return;
            var scope = { army: army.id };
            if (models.get('startingCommanderClasses', scope) !== null) return;
            models.set('startingCommanderClasses', scope, army.commanders.map(function (spec) {
                return { spec: spec || null, classId: catalogue.getClassId(spec) };
            }));
        });
    }

    catalogue.loaded.done(function () { ready = true; capture(); });
    model.players.subscribe(capture);
}());
