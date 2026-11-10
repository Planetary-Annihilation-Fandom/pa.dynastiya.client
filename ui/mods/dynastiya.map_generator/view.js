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
         * @param {string} options_id - The ID of the option group to update.
         * @param {string} value - The new value to set for the option group.
         * @param {object} event - Knockout binding context (unused).
         * @param {Event} data - Activation event containing the selected button.
         */
        self.select_option = function (options_id, value, event,data) {
            // UPDATE UI
            $().ready(function () {
                var options = $('#' + options_id);
                // Buttons are direct children; no wrapper is needed for selection or focus.
                options.find('.option-controls > button').each(function () {
                    var selected = this === data.currentTarget;
                    $(this).toggleClass('selected', selected);
                    $(this).children('img').toggleClass('selected', selected);
                });
                options.find('.description').text(value);

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
                var options_id_map = ["planet-size", "metal", "biome",]
                for (var i = 0; i < options_id_map.length; i++) {

                    var id = options_id_map[i];
                    var options_element = $('#' + id);
                    var value_for_id = _data.get_option(id);
                    options_element.find('.option-controls > button').each(function () {
                        if (this.id === value_for_id)
                            self.select_option(id, value_for_id, null, { currentTarget: this });
                    });
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
