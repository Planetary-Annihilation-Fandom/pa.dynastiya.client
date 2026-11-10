(function () {
    'use strict';
    if (model.dynastiyaHoverPresentation) return;
    model.dynastiyaHoverPresentation = true;
    var presentation = api.Panel.dockPresentation;
    var HoverModel = model.worldHoverTarget().constructor;
    // Copy stock model inputs only. Numeric extenders wrap both input fields
    // and read-only derived fields in writable computeds in the shipped PA UI.
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
                    // Ownership moved to the live model, not the temporary one.
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
            // Preserve the `with` binding and its DOM during progress ticks.
            // Structural changes are concealed by present before this runs.
            copy(current, next);
            dispose(next);
        }
        model.hasWorldHoverTarget(visible);
    }
    handlers.hover = function (data) {
        presentation.present(data, apply, JSON.stringify(keyFor(data)));
    };
}());
