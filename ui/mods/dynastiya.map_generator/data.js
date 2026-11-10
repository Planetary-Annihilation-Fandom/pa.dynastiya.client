define(function () {
    var default_options = [
        {
            id: 'planet-size',
            value: 'small'
        },
        {
            id: 'metal',
            value: 'poor'
        },
        {
            id: 'biome',
            value: 'random'
        }
    ]

    var allowed_options = [
        {
            id: 'planet-size',
            values: ['small', 'medium', 'large']
        },
        {
            id: 'metal',
            values: ['poor', 'normal', 'rich']
        },
        {
            id: 'biome',
            values: ['moon', 'asteroid', 'desert', 'forest', 'lava', 'metallic', 'snow', 'random']
        }
    ]
    // planet-size: small, medium, large
    // metal: poor, normal, rich
    // biome: moon, asteroid, desert, forest, lava, metallic, snow, random
    return {
        test_data: function () {
            console.log("data.js testing called");
        },
        create_empty: function () {
            return {
                options: []
            }
        },
        create_default: function () {
            var data = this.create_empty();
            data.options = JSON.parse(JSON.stringify(default_options));
            return data;
        },

        clear: function () {
            localStorage.removeItem('map_generator_data');
        },

        /**
         * Saves the modification data to local storage. This data is used to select the previously selected options
         * @param {Object} data - The modification data to save. Should have a field "options" which is an array of objects.
         * The objects should have fields "group_id" and "option_value" for the group id and selected option value respectively.
         */
        save: function (data) {
            localStorage.setItem('map_generator_data', JSON.stringify(data));
        },

        /**
         * Loads the modification data from local storage and returns it. If the data does not exist in local storage, it returns undefined.
         * @returns {Object} The modification data or undefined if it does not exist in local storage.
         */
        load: function () {
            var data;
            try {
                data = JSON.parse(localStorage.getItem('map_generator_data'));
            } catch (error) {
                data = undefined;
            }
            data = this.check_data_consistency(data);
            return data;
        },

        /**
         * Ensures that all required options are present in the provided data object.
         * If any options are missing, it adds them with default values from the default_options array.
         *
         * @param {Object} data - The data object which contains an "options" array.
         * The function checks this array for missing options and updates it if necessary.
         */
        check_data_consistency: function (data) {
            if (!data || typeof data !== 'object' || Array.isArray(data)) {
                var new_data = this.create_default();
                this.save(new_data);
                return new_data;
            }

            if (!Array.isArray(data.options) || data.options.length == 0) {
                data.options = this.create_default().options;
                this.save(data);
                return data;
            }
            var original = JSON.stringify(data);
            // if some options are missing, add them with default values
            for (var i = 0; i < default_options.length; i++) {
                var option = _.find(data.options, { id: default_options[i].id });
                if (option == undefined) {
                    data.options.push(JSON.parse(JSON.stringify(default_options[i])));
                }
            }

            // remove any options that are not in the default_options array
            data.options = _.filter(data.options, function (option) {
                return _.find(default_options, { id: option.id }) != undefined;
            });

            // Check for options that are not allowed in the allowed_options array
            for (var i = 0; i < data.options.length; i++) {
                var check_option = data.options[i];
                var allowed_option = _.find(allowed_options, { id: check_option.id });
                if (allowed_option != undefined) {
                    if (!_.includes(allowed_option.values, check_option.value)) {
                        data.options[i].value = _.find(default_options, { id: check_option.id }).value;
                    }
                }
            }

            // Reading an option must not rewrite localStorage on every button.
            if (JSON.stringify(data) !== original) this.save(data);
            return data;
        },

        /**
         * Updates the value of an option in the modification data with the given id
         * @param {string} option_id - The id of the option to update
         * @param {number} value - The new value to set for the option
         */
        update: function (option_id, value) {
            var data = this.load();
            var option = _.find(data.options, { id: option_id });
            if (option == undefined) {
                option = { id: option_id, value: value };
                data.options.push(option);
            } else {
                if (option.value === value) return;
                option.value = value;
            }
            this.save(data);
        },

        /**
        * Retrieves the current modification options from local storage.
        * If no valid modification data is found, initializes and returns default options.
        *
        * @returns {Array} The list of option objects, either from modification data or default options.
        */
        get_options: function () {
            return this.load().options;
        },

        /**
         * Retrieves the current value of an option from local storage.
         * If the option does not exist in local storage, updates local storage with the default value for the option and returns that value.
         * @param {string} option_id - The id of the option to retrieve
         * @returns {object} The value of the specified option
         */
        get_option: function (option_id) {
            var data = this.load();

            var option = _.find(data.options, { id: option_id });
            if (option == undefined) {
                var default_option = _.find(default_options, { id: option_id });
                if (default_option == undefined) {
                    console.log("MAP_GENERATOR/DATA: No option found for id: " + option_id);
                    return undefined;
                } else {
                    this.update(option_id, default_option.value);
                    return default_option.value;
                }

            } else {
                // console.log("MAP_GENERATOR/DATA: option found for id (value): " + option_id + " (" + option.value + ")");
                return option.value;
            }
        },

        /**
         * Retrieves the default value for a given option
         * @param {string} option_id - The id of the option to retrieve
         * @returns {object} The default value of the specified option
         */
        get_default_option: function (option_id) {
            var option = _.find(default_options, { id: option_id });
            return JSON.parse(JSON.stringify(option.value));
        }
    }
});
