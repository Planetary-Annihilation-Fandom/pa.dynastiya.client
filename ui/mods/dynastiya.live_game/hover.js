(function () {
    'use strict';
    if (model.dynastiyaHoverPresentation) return;
    model.dynastiyaHoverPresentation = true;
    var presentation = api.Panel.dockPresentation;
    var HoverModel = model.worldHoverTarget().constructor;
    // Копируются только входные поля стандартной модели. В PA числовые
    // расширители оборачивают и входные, и вычисляемые поля в записываемые computed.
    var inputs = ('id entity isFeature name reclaimable isMetalSpot location operator status ' +
        'showHealth healthFraction showAmmo ammoFraction showShield shieldFraction isDead ' +
        'metalGain energyGain energyLoss metalLoss damage rateOfFire projectilesPerFire ' +
        'primaryColor secondaryColor actionIsAttacking actionIsBuilding actionIsReclaiming ' +
        'actionIsTransport target').split(' ');

    function keyFor(data) {
        if (!data || _.isEmpty(data)) return null;
        var tool = data.tool_details || {};
        return [data.entity, data.spec_id, data.display_name || data.name,
            !!data.is_feature, !!data.blip, !!data.ghost,
            data.ammo_fraction !== undefined, data.shield_fraction !== undefined,
            !!(data.health && data.health.current > 0), !!tool.build_target,
            !!tool.build_target_reclaiming, !!tool.weapon_target,
            keyFor(tool.target_details), keyFor(data.payload_details)];
    }
    function dispose(value) {
        Object.keys(value).forEach(function (key) {
            if (ko.isComputed(value[key])) value[key].dispose();
        });
        if (value.target && value.target()) dispose(value.target());
    }
    function copy(current, next) {
        inputs.forEach(function (key) {
            if (key === 'target') {
                if (current.target() && next.target()) copy(current.target(), next.target());
                else {
                    if (current.target()) dispose(current.target());
                    current.target(next.target());
                    // Цель теперь принадлежит основной модели, а не временной.
                    next.target(null);
                }
            } else current[key](next[key]());
        });
    }
    function apply(data) {
        var visible = !_.isEmpty(data);
        if (visible) {
            var next = new HoverModel(data);
            var current = model.worldHoverTarget();
            // Привязка with и её разметка сохраняются при изменении прогресса.
            // Карточка другого объекта скрыта через present ещё до этого места.
            copy(current, next);
            dispose(next);
        }
        model.hasWorldHoverTarget(visible);
    }
    // Карточка другого юнита — полная замена: прежняя карточка не должна
    // оставаться на экране даже на кадр, поэтому present.
    handlers.hover = function (data) {
        presentation.present(data, apply, JSON.stringify(keyFor(data)));
    };
}());
