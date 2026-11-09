// math.js module
define(function () {
    return {
        test_math: function () {
            console.log("math.js testing called");
        },
        random_sign: function () {
            return Math.random() < 0.5 ? -1 : 1;
        }
        ,

        /**
         * Returns a random integer between min and max, inclusive.
         * If min and max are the same, returns max.
         * @param {number} min - The minimum value.
         * @param {number} max - The maximum value.
         * @returns {number}
         */
        random_integer: function (min, max) {
            if (min == undefined) min = 0;
            if (max == undefined) max = 1;
            if (min === max) {
                return max;
            }

            // Make the min and max values inclusive
            min = Math.ceil(min);
            max = Math.floor(max) + 1;
            // Generate a random number between min and max
            // The maximum is exclusive and the minimum is inclusive (stackoverflow)
            return Math.floor(Math.random() * (max - min) + min);
        },

        /**
         * Returns a random floating point number between min and max, inclusive.
         * If min and max are the same, returns max.
         * @param {number} min - The minimum value.
         * @param {number} max - The maximum value.
         * @returns {number} A random floating point number between min and max.
         */
        random_float: function (min, max) {
            if (min == undefined) min = 0;
            if (max == undefined) max = 1;
            return Math.random() * (max - min) + min;
        },


        new_seed: function () {
            return Math.floor(65536 * Math.random());
        },

        /**
         * Returns a random index within the given range [0, length-1).
         * The probability of each index being selected is equal.
         *
         * @param {number} length - The length of the range.
         * @returns {number} The randomly selected index.
         */
        random_index: function (length) {
            return Math.floor(Math.random() * length);
        },

        /**
         * Returns a random index based on the given weights.
         * The probability of each index being selected is proportional
         * to its corresponding weight in the array.
         *
         * @param {number[]} weights - An array of weights, where each weight
         * represents the likelihood of its index being chosen.
         * @returns {number} The randomly selected index.
         */
        random_weighted_index: function (weights) {
            var index;
            for (index = 0; index < weights.length; index++)
                weights[index] += weights[index - 1] || 0;

            var random = Math.random() * weights[weights.length - 1];

            for (index = 0; index < weights.length; index++)
                if (weights[index] > random)
                    break;

            // console.log('weighted random ' + index + ' : ' + random + ' : ' + weights)
            return index;
        }
    };
});
