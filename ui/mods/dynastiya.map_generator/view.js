define(['require', './data', 'text!./map_generator.html'], function (require) {

    var ViewModel = function () {
        var self = this;
        var _data = require('./data');

        self.test_view_model = function () {
            console.log('test_view_model');
        }

        self.toogle_moons = function () {
            console.log('toogle_moons');
        }

        /**
         * Updates the option value for a specified option group in the modification data.
         * Also updates the UI to reflect the change.
         *
         * @param {HTMLElement} caller - The button that triggered this function. In knockout, this is the binding context (first argument implicitly passed).
         * @param {string} options_id - The ID of the option group to update.
         * @param {object} value - The new value to set for the option group.
         */
        self.select_option = function (options_id, value, event,data) {
            // console.log("MAP_GENERATOR/VIEW: :select_option: options_id: " + options_id + " value: " + value);
            // console.log(data);

            // UPDATE UI
            $().ready(function () {
                var options = $('#' + options_id);
                var controls = options.find("#controls");

                // CHANGE BUTTONS STATE (visualy)
                controls.children("#control").each(function (index, jquery_element) {
                    var button = $(jquery_element).find("button");
                    // im using button[0] because button is a jquery object and the first element is the vanilla button
                    if (button[0] === data.currentTarget) {
                        $(button).addClass('selected');
                        $(button).children('img').addClass('selected');
                    } else {
                        $(button).removeClass('selected');
                        $(button).children('img').removeClass('selected');
                    }
                });
                // change the description of the group
                $(options).find("#description").html(value);

            })

            // UPDATE DATA
            // Write option value to data
            _data.update(options_id, value);
        }

        /**
         * Preselects options for the map generator by iterating through a predefined list of option IDs.
         * For each option ID, it finds the corresponding controls and selects the button whose ID matches
         * the stored value for that option. This function ensures the UI reflects the previously selected
         * options upon loading.
         */
        self.preselect_options = function () {
            $().ready(function () {
                // console.log("MAP_GENERATOR/VIEW: preselecting options");
                var options_id_map = ["planet-size", "metal", "biome",]
                for (var i = 0; i < options_id_map.length; i++) {
                    // console.log("MAP_GENERATOR/VIEW: preselecting " + options_id_map[i]);

                    var id = options_id_map[i];
                    var options_element = $('#' + id);
                    var controls_element = $(options_element).find("#controls");
                    var value_for_id = _data.get_option(id);

                    controls_element.children("#control").each(function (index, jquery_element) {
                        // console.log("MAP_GENERATOR/VIEW: option control is")
                        // console.log(jquery_element)
                        if (value_for_id == undefined) {
                            // console.log("MAP_GENERATOR/VIEW: No option found for id: " + id);
                            return;
                        }

                        // console.log("MAP_GENERATOR/VIEW: value for id: " + value_for_id);
                        var button_element = $(jquery_element).find("button");
                        // console.log("MAP_GENERATOR/VIEW: button element is")
                        // console.log(button_element)
                        // console.log("MAP_GENERATOR/VIEW: button id is " + button_element.attr('id'));
                        // if button id is the same as option value, select it
                        if (button_element.attr('id') === value_for_id) {
                            // console.log("selecting " + id + " " + value_for_id);
                            self.select_option(id, value_for_id, null,{ currentTarget: button_element[0]});
                        }
                    })
                }
            })
        }
    };

    return {
        html: require('text!./map_generator.html'),
        // assign view model constructor that need to be instantiated by caller
        view_model: new ViewModel()
    };
});
