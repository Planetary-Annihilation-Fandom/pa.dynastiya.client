// PA build 124685 API with lifecycle fixes for issue #9. Loaded only in priority scenes.
(function () {
function init_holodeck()
{
    var DEFAULT_UPDATE_PERIOD = 200;
    var ANIMATION_UPDATE_PERIOD = 5;
    var INVISIBLE_UPDATE_PERIOD = 1000;

    // Note: $div should be equivalent to $(div).  Passing them both individually
    // saves some performance, and this is called in a very performance-sensitive
    // function.
    var calcRegion = function($div, div) {
        var boundingRect = div.getBoundingClientRect();
        var docWidth = window.innerWidth;
        var docHeight = window.innerHeight;

        return {
            left: ((boundingRect.left + div.clientLeft) / docWidth),
            top: ((boundingRect.top + div.clientTop) / docHeight),
            width: (div.clientWidth / docWidth),
            height: (div.clientHeight / docHeight),
            zIndex: ($div.zIndex())
        };
    };

    var regionsAreDifferent = function (a, b) {
        return a.left !== b.left
            || a.top !== b.top
            || a.width !== b.width
            || a.height !== b.height
            || a.zIndex !== b.zIndex;
    };

    var hdeck = function(div, config, onReady) {
        var $div = $(div);
        if (!$div.length)
            $div = $("<div class='.holodeck' />");
        div = $div[0]

        config = $.extend({}, config || {});

        if (config.hasOwnProperty('visible'))
            config.visible = !!config.visible;
        else if (!$div.is(':visible'))
            config.visible = false;
        if (!config.hasOwnProperty('noFocus'))
            config.noFocus = div.hasAttribute('no-focus');

        var updatePeriod = DEFAULT_UPDATE_PERIOD;
        if (config.hasOwnProperty('updatePeriod')) {
            updatePeriod = config.updatePeriod;
            delete config.updatePeriod;
        }

        var result = this;
        result.view = api.getWorldView(config.view || 0);
        result.$div = $div;
        result.div = div;
        result.region = calcRegion($div, div);
        result.visible = config.hasOwnProperty('visible') ? !!config.visible : true;
        result.updatePeriod = updatePeriod;

        result.location = ko.observable({x: 0, y: 0, z: 0});
        result.cameraMode = ko.observable('planet');
        result.cameraTracking = ko.observable(false);
        result.cameraTrackedUnit = ko.observable(-1);
        result.cameraTrackedUnits = ko.observableArray([]);

        $.extend(config, result.region, { view: result.view });

        engine.call('game.createHolodeck', JSON.stringify(config)).then(function (id) {
            // Destroy late native results without registering or focusing them.
            if (this._destroyed || id < 0) {
                if (id >= 0) engine.call('holodeck.destroy', id);
                if (!this._destroyed) this.destroy();
                return;
            }
            this.id = id;
            api.holodecks[id] = this;
            if (!config.noFocus) {
                this._onMouseEnter = function(event) {
                    if (hdeck.focused != this)
                        this.focus();
                    event.preventDefault();
                    event.stopPropagation();
                }.bind(this);
                this.$div.on('mouseenter', this._onMouseEnter);
            }
            this.update();
            if (onReady)
                onReady.call(this, this);
        }.bind(result));

        result._onRemoved = function(event) {
            if (event.target === div) result.destroy();
        };
        result._onUnload = function() { result.destroy(); };
        $div.on('DOMNodeRemoved DOMNodeRemovedFromDocument', result._onRemoved);
        $(window).on('beforeunload', result._onUnload);

        $div.data('holodeck', result);
    };

    hdeck.prototype.destroy = function() {
        if (this._destroyed) return;
        this._destroyed = true;
        window.clearTimeout(this._updateTimeout);
        if (this._updateFrame !== undefined) window.cancelAnimationFrame(this._updateFrame);
        this.$div.off('DOMNodeRemoved DOMNodeRemovedFromDocument', this._onRemoved);
        if (this._onMouseEnter) this.$div.off('mouseenter', this._onMouseEnter);
        $(window).off('beforeunload', this._onUnload);
        if (this.$div.data('holodeck') === this) this.$div.removeData('holodeck');
        if (hdeck.focused === this) hdeck.focused = undefined;
        if (this.hasOwnProperty('_poll'))
        {
            clearInterval(this._poll);
            delete this._poll;
        }
        if (this.hasOwnProperty('id'))
        {
            delete api.holodecks[this.id];
            engine.call('holodeck.destroy', this.id);
            delete this.id;
        }
        delete this.view;

    };

    hdeck.prototype.update = function() {
        var self = this;

        if (!self.hasOwnProperty('id'))
            return;

        window.clearTimeout(self._updateTimeout);
        if (self._updateFrame !== undefined) window.cancelAnimationFrame(self._updateFrame);
        self._updateFrame = undefined;
        self.updateVisibility();
        if (!self.visible)
            return;

        var curRegion = calcRegion(self.$div, self.div);

        if (self.visible && regionsAreDifferent(curRegion, self.region))
        {
            self.region = curRegion;

            engine.call('holodeck.move', self.id, JSON.stringify(self.region));
        }

        var refreshPeriod = self.visible ? Math.min(self.updatePeriod, hdeck.updatePeriod) : INVISIBLE_UPDATE_PERIOD;
        this._updateTimeout = window.setTimeout(function() {
            self._updateTimeout = undefined;
            self._updateFrame = window.requestAnimationFrame(function() {
                self._updateFrame = undefined;
                self.update();
            });
        }, refreshPeriod);
    };
    hdeck.update = function() {
        _.each(api.holodecks, function(h) { h.update(); });
    };

    hdeck.prototype.updateVisibility = function() {
        if (!this.hasOwnProperty('id'))
            return false;

        var isVisible = this.$div.is(':visible');
        if (this.visible !== isVisible)
        {
            this.visible = isVisible;
            engine.call('holodeck.visible', this.id, isVisible);
            return true;
        }
        return false;
    };

    hdeck.prototype.selectAt = function(option, x,y, offset) {
        return engine.call('holodeck.selectAt', this.id, option, x, y, offset);
    };

    hdeck.prototype.selectMatchingUnits = function (option, units) {
        return engine.call('holodeck.selectMatchingUnits', this.id, option, units);
    };

    hdeck.prototype.selectMatchingTypes = function (option, types) {
        return engine.call('holodeck.selectMatchingTypes', this.id, option, types);
    };

    hdeck.prototype.beginDragSelect = function(x,y) {
        return engine.call('holodeck.beginDragSelect', this.id, x, y);
    };

    hdeck.prototype.endDragSelect = function(option, area) {
        return engine.call('holodeck.endDragSelect', this.id, option, JSON.stringify(_.isObject(area) ? area : {}), Mousetrap.isAltDown());
    };

    hdeck.prototype.beginControlCamera = function() {
        return engine.call('holodeck.beginControlCamera', this.id);
    };

    hdeck.prototype.endControlCamera = function() {
        return engine.call('holodeck.endControlCamera', this.id);
    };

    hdeck.prototype.unitBeginFab = function(anchorX, anchorY, snap) {
        return engine.call('holodeck.unitBeginFab', this.id, anchorX, anchorY, snap);
    };

    hdeck.prototype.unitEndFab = function(anchorX, anchorY, queue, snap) {
        return engine.call('holodeck.unitEndFab', this.id, anchorX, anchorY, !!queue, !!snap);
    };

    hdeck.prototype.unitCancelFab = function() {
        return engine.call('holodeck.unitCancelFab', this.id);
    };

    hdeck.prototype.unitBeginCommand = function(command, anchorX, anchorY) {
        return engine.call('holodeck.unitBeginCommand', this.id, command, anchorX, anchorY);
    };

    hdeck.prototype.unitEndCommand = function(command, anchorX, anchorY, queue) {
        return engine.call('holodeck.unitEndCommand', this.id, command, anchorX, anchorY, !!queue);
    };

    hdeck.prototype.unitChangeCommandState = function(command, anchorX, anchorY, queue) {
        return engine.call('holodeck.unitChangeCommandState', this.id, command, anchorX, anchorY, !!queue);
    };

    hdeck.prototype.unitCancelCommand = function() {
        return engine.call('holodeck.unitCancelCommand', this.id);
    };

    hdeck.prototype.unitBeginGo = function(anchorX, anchorY, allow_custom) {
        return engine.call('holodeck.unitBeginGo', this.id, anchorX, anchorY, allow_custom);
    };

    hdeck.prototype.unitGo = function(x, y, queue) {
        return engine.call('holodeck.unitGo', this.id, x, y, !!queue);
    };

    hdeck.prototype.unitCommand = function(command, x, y, queue) {
        return engine.call('holodeck.unitCommand', this.id, command, x, y, !!queue);
    };

    hdeck.prototype.showCommandConfirmation = function(command, x, y) {
        return engine.call('holodeck.showCommandConfirmation', this.id, command, x, y);
    };

    hdeck.prototype.focus = function() {
        hdeck.focused = this;

        if (handlers.holodeck_focus)
            handlers.holodeck_focus(this.id);
        return engine.call('holodeck.focus', this.id);
    };

    hdeck.prototype.swapCamera = function(other) {
        api.camera.swapCamera(this.id, other.id);
        return engine.call('holodeck.swapCamera', this.id, other.id);
    };

    hdeck.prototype.copyCamera = function(other) {
        return engine.call('holodeck.copyCamera', this.id, other.id);
    };

    hdeck.prototype.mirrorCamera = function(other) {
        return engine.call('holodeck.mirrorCamera', this.id, other.id);
    };

    hdeck.prototype.raycast = function(x, y) {
        var one = false;
        var list = x;
        if (!_.isArray(list)) {
            list = [[x,y]];
            one = true;
        }
        var config = {
            points: list,
            terrain: true,
            units: true,
            features: true
        };
        return engine.call('holodeck.raycast', this.id, JSON.stringify(config)).then(function(raw) {
            var result = raw ? JSON.parse(raw) : null;
            if (_.isObject(result)) {
                var hitResults = result.results || [];
                if (result.planet !== undefined) {
                    _.forEach(hitResults, function(hit) {
                        hit.planet = result.planet;
                    });
                }
                result = hitResults;
                if (one)
                    result = result[0];
            }
            return result;
        });
    };

    hdeck.prototype.raycastTerrain = function(x, y) {
        var one = false;
        var list = x;
        if (!_.isArray(list)) {
            list = [[x,y]];
            one = true;
        }
        var config = {
            points: list,
            terrain: true,
            units: false,
            features: false
        };
        return engine.call('holodeck.raycast', this.id, JSON.stringify(config)).then(function(raw) {
            var result = raw ? JSON.parse(raw) : null;
            if (_.isObject(result)) {
                var hitResults = result.results || [];
                if (result.planet) {
                    _.forEach(hitResults, function(hit) {
                        hit.planet = result.planet;
                    });
                }
                result = hitResults;
                if (one)
                    result = result[0];
            }
            return result;
        });
    };

    hdeck.prototype.focusedPlanet = function() {
        var config = {
            points: [],
            terrain: false,
            units: false,
            features: false
        };
        return engine.call('holodeck.raycast', this.id, JSON.stringify(config)).then(function(raw) {
            var result = raw ? JSON.parse(raw) : null;
            if (_.isObject(result)) {
                result = result.planet;
                if (_.isUndefined(result))
                    result = null;
            }
            return result;
        });
    };

    // "updatePeriod" controls how often the holodeck regions will be updated.
    // beginAnimation() can be called to change the update period, either on a
    // specific holodeck, or globally across all holodecks.  (Period is measured
    // in ms.  Lower numbers use up more CPU, but animate more smoothly.)
    // When animation is finished, call the function returned by beginAnimation
    // to reset the update period to its previous value.
    // eg:
    //  $("#preview_holodeck_container").animate({top:-100}, 500, "swing", api.holodecks.preview.beginAnimation())

    hdeck.updatePeriod = DEFAULT_UPDATE_PERIOD;
    hdeck.beginAnimation = function(newPeriod) {
        var self = this;
        var oldPeriod = self.updatePeriod;
        if (newPeriod === undefined)
            newPeriod = ANIMATION_UPDATE_PERIOD;
        self.updatePeriod = Math.max(newPeriod, ANIMATION_UPDATE_PERIOD);
        self.update();
        return function() {
            self.updatePeriod = oldPeriod;
            self.update();
        };
    };
    hdeck.prototype.beginAnimation = hdeck.beginAnimation;

    // Update the settings-dependent holodeck configuration.
    hdeck.refreshSettings = function() {
        _.forIn(api.holodecks, function(holodeck) {
            // Currently, toggling the visibility is the only way to perform
            // this operation.
            if (!holodeck.visible)
                return;
            holodeck.$div.hide();
            holodeck.updateVisibility();
            holodeck.$div.show();
            holodeck.updateVisibility();
        });
    };

    hdeck.get = function(div) {
        return $(div).data('holodeck');
    };

    api.Holodeck = hdeck;
    api.holodecks = {};
};

init_holodeck(api);

}());
