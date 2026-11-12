(function () {
    'use strict';
    if (model.dynastiyaBuildBar) return;
    model.dynastiyaBuildBar = true;

    var BuildSet = model.BuildSet;
    model.BuildSet = function () {
        BuildSet.apply(this, arguments);
        // Очередь и число юнитов не меняют списки построек. Стандартный расчёт
        // и счётчики остаются, но плитки не пересоздаются на каждое изменение.
        this.selectedSpecs.equalityComparer = function (oldSpecs, newSpecs) {
            var keys = Object.keys(oldSpecs);
            return keys.length === Object.keys(newSpecs).length && keys.every(function (key) {
                return Object.prototype.hasOwnProperty.call(newSpecs, key) && oldSpecs[key] === newSpecs[key];
            });
        };
    };
    model.BuildSet.prototype = BuildSet.prototype;
    Object.keys(BuildSet).forEach(function (key) { model.BuildSet[key] = BuildSet[key]; });

    var waiting = false;
    var latestSelection;
    function contentKey(selection, group) {
        return JSON.stringify([Object.keys(selection.spec_ids || {}).sort(), group,
            window.dynastiyaResearch ? dynastiyaResearch.state() : null,
            model.dynastiyaBuildFaction ? model.dynastiyaBuildFaction() : null]);
    }
    // Выбранная фракция билдбара меняет набор вкладок, поэтому входит в ключ.
    model.dynastiyaBuildBarKey = function (group) {
        return latestSelection ? contentKey(latestSelection, group) : null;
    };
    // Переключение вкладки меняет сетку и при тех же строителях. Вкладка и
    // выделение используют общий ключ: у окна один владелец показа.
    if (ko.isObservable(model.activeBuildGroup)) model.activeBuildGroup.subscribe(function (group) {
        if (latestSelection && api.Panel.dockPresentation)
            api.Panel.dockPresentation.present(null, function () {}, contentKey(latestSelection, group));
    });
    handlers.selection = function (payload) {
        model.dynastiyaLatestSelection = payload;
        latestSelection = payload;
        if (waiting) return;
        waiting = true;
        // Пока загружаются описания юнитов, промежуточные выделения устарели.
        // После загрузки команды и очередь доходят до parseSelection сразу.
        $.when(model.unitSpecs, model.getSpecTag).then(function () {
            waiting = false;
            var selection = latestSelection;
            var presentation = api.Panel.dockPresentation;
            if (presentation) {
                // Счётчики и очередь обновляются на месте (тот же ключ). Другие
                // строители — это другая сетка построек, и прежний кадр показывать
                // нельзя, поэтому здесь present, а не replace.
                var key = contentKey(selection, ko.unwrap(model.activeBuildGroup));
                presentation.present(selection, function (value) {
                    model.parseSelection(value);
                }, key);
            } else model.parseSelection(selection);
        }, function () { waiting = false; });
    };
}());
