// Посмотреть premade_systems.js Там описаны все свойства планет, которые можно определить при генерации.
// ____________________________________________________________________
// We need to load the other modules (files) in the context of
// `dynastiya_map_generator` instead of `main` so that we can use relative
// paths to the other files.
//
// The context is automatically set to `main` when the game is loaded, and
// all scripts are loaded in the context of `main`.
//
// We need to load `math.js` in the context of `dynastiya_map_generator` so
// that we can use relative paths to load the other files.
var require_mod_modules = require.config({
    context: "dynastiya_map_generator",
    waitSeconds: 0,
    baseUrl: 'coui://ui/mods/dynastiya.map_generator',

    paths: {
        // The text module is used to load text files.
        // The path to the text module is thirdparty/requirejs-textplugin/text.
        text: 'thirdparty/requirejs-textplugin/text',
    }
});

// modules
var _view;
var _math;
var _data;
var _planetnames;
var _surface;

// Wait for the game (mostly the UI) to be loaded
$(function () {
    awake();
    return
})

function awake() {
    // loading modules first to ensure they are loaded
    require_mod_modules(
        ['./view', './math', './data', './scripts/planetnames', './surface'],
        function (view, math, data, planetnames, surface) {
            _view = view;
            _math = math;
            _data = data;
            _planetnames = planetnames;
            _surface = surface;

            $('#system').append(_view.html);
        })
}

// called from initialized html
function start() {
    _view.view_model.preselect_options();


}

/**
 * List of all default biomes.
 * @type {Array<string>}
 */
var biomes_id_list = [
    "earth_lite", // Earth
    "desert_lite", // Desert
    "lava_lite", // Lava
    "tropical_lite", // Tropical
    "moon_lite", // Moon
    "asteroid", // Asteroid
    // "sandbox", // Sandbox
    "metal"
];

var generationRequest = 0;

function generate() {
    var request = ++generationRequest;
    var previousSystem = model.system();

    // TODO: use biome generation option
    var biome = _data.get_option('biome');
    var biome_id;
    var temperature;

    switch (biome) {
        case 'moon':
            // Handle moon biome
            biome_id = 'moon_lite';
            break;
        case 'asteroid':
            // Handle asteroid biome
            biome_id = 'asteroid';
            break;
        case 'desert':
            // Handle desert biome
            biome_id = 'desert_lite';
            break;
        case 'forest':
            // Handle forest biome
            temperature = _math.random_integer(35, 65)
            if (temperature < 50) {
                biome_id = 'earth_lite';
            } else {
                biome_id = 'tropical_lite';
            }
            break;
        case 'lava':
            // Handle lava biome
            biome_id = 'lava_lite';
            break;
        case 'metallic':
            // Handle metallic biome
            biome_id = 'metal';
            break;
        case 'snow':
            // Handle snow biome
            biome_id = 'earth_lite';
            temperature = _math.random_integer(0, 0)
            break;
        case 'random':
            // Handle random biome
            biome_id = get_random_biome_id();
            break;
        default:
            // Handle unknown biome
            biome_id = get_random_biome_id();
            break;
    }

    console.log(biome);
    console.log(biome_id);

    get_random_system('Generated', get_generation_size(), biome_id, get_metal_density(),
        get_additional_surface_parameters(temperature, undefined, undefined)).then(function (system) {
            // A slow name response must not replace a newer generation or selection.
            if (request !== generationRequest || model.system() !== previousSystem || !model.isGameCreator()) return;
            model.system(system);
            model.updateSystem(model.system());
            model.changeSettings();
            model.requestUpdateCheatConfig();
        }, function (error) {
            if (request !== generationRequest || model.system() !== previousSystem || !model.isGameCreator()) return;
            console.error('Map generation failed', error);
            model.localChatMessage('Map Generator', 'Could not generate a system. Please try again.');
        })

    /**
     * Returns a random biome ID from the provided list of biomes or from the default list if none is provided.
     *
     * @param {Array<string>|undefined} biomes - Optional. An array of biome IDs to choose from. If undefined,
     *                                           the default list of all possible biomes is used.
     * @returns {string} - A randomly selected biome ID from the given or default list.
     */
    function get_random_biome_id(biomes) {
        if (biomes == undefined) {
            biomes = biomes_id_list;
            return biomes[_math.random_index(biomes.length)];
        } else if (biomes.constructor == Array) {
            return biomes[_math.random_index(biomes.length)];
        }
        return biomes;
    }
}


function get_generation_size(value) {
    if (value != undefined) {
        if (value.constructor == Array) {
            return _math.random_integer(value[0], value[1]);
        } else {
            return value
        }
    }

    var size = _data.get_option('planet-size');
    switch (size) {
        case "small":
            return _math.random_integer(400, 500);
        case "medium":
            return _math.random_integer(500, 650);
        case "large":
            return _math.random_integer(650, 900);
        case undefined:
            return 404;
        default:
            return 404
    }
}

/**
 * Determines the metal density based on the provided value or the current metal option setting.
 * If an array is provided, it returns a random integer between the specified range.
 * If a single value is provided, it returns that value.
 * If no value is provided, it retrieves the metal option setting and returns a corresponding random density value.
 *
 * @param {Array<number>|number|undefined} custom_value - Optional. An array specifying a range or a single number for metal density.
 * @returns {number} - The determined metal density.
 */
function get_metal_density(custom_value) {
    if (custom_value != undefined) {
        if (custom_value.constructor == Array) {
            return _math.random_integer(custom_value[0], custom_value[1]);
        } else {
            return custom_value
        }
    }

    var metal = _data.get_option('metal');
    switch (metal) {
        case 'poor':
            return _math.random_integer(15, 20);
        case 'normal':
            return _math.random_integer(20, 30);
        case 'rich':
            return _math.random_integer(30, 40);
        case undefined:
            return 0;
        default:
            return 0;
    }
}




var earthBiome = "earth_lite"
var desertBiome = "desert_lite"
var lavaBiome = "lava_lite"
var tropicalBiome = "tropical_lite"
var moonBiome = "moon_lite"

var metalBiome = "metal"
var asteroidBiome = "asteroid"
// Expansion biomes
//var greenhouseBiome = "greenhouse"

// api.mods.getMounted("client", true).then(function (mods) {
//     var modMounted = function (modIdentifier) {
//       return _.some(mods, { identifier: modIdentifier });
//     };
//     // Shared Systems for Galactic War
//     if (modMounted("com.wondible.pa.gw_shared_systems"))

/**
 * Gets one of the predefined water generation options.
 * @returns {number} Either 0 (no water), a random number between 20 and 40 (random amount of water) or a random number between 40 and 70 (much water).
 */
function get_random_water_percentage() {
    var types = ["random", "nowater", "muchwater"]

    // Test that the weights are correct
    // var i = 0;
    // var r = 0;
    // var n = 0;
    // var m = 0;
    // for (i = 0; i < 1000; i++) {
    //     var type = types[getRandomWeightedIndex([60, 20, 20])]

    //     switch (type) {
    //         case "random": r++; break;
    //         case "nowater": n++; break;
    //         case "muchwater": m++; break;
    //     }
    // }
    // console.log('rand-' + r + ' no-' + n + ' much-' + m)

    var type = types[_math.random_weighted_index([70, 10, 20])]
    switch (type) {
        case "random": return _math.random_integer(25, 40); break;
        case "nowater": return 0; break;
        case "muchwater": return _math.random_integer(40, 70); break;
    }

    return 0
}


/**
 * Returns an object with three properties: temperature, waterDepth, and height.
 * If any of the parameters are undefined, it will generate a random value for them.
 * @param {number} [temperature_0_100=Random] - The temperature of the planet, between 0 and 100.
 * @param {number} [waterDepth_0_70=Random] - The water depth of the planet, between 0 and 70.
 * @param {number} [height_20_60=Random] - The height of the planet, between 20 and 60.
 * @returns {Object} - An object with the temperature, waterDepth, and height properties.
 */
function get_additional_surface_parameters(temperature_0_100, waterDepth_0_70, height_20_60) {
    if (temperature_0_100 == undefined)
        temperature_0_100 = _math.random_integer(0, 100)
    if (waterDepth_0_70 == undefined)
        waterDepth_0_70 = get_random_water_percentage();
    if (height_20_60 == undefined)
        height_20_60 = _math.random_integer(20, 60);
    return { temperature: temperature_0_100, waterDepth: waterDepth_0_70, height: height_20_60 }
}

function get_random_system(planet_title, planet_size, biomeName, base_metal_density,
    additional_surface_parameters) {

    var slots = model.slots() || 2;
    var slotFactor = 10 / slots;

    if (additional_surface_parameters == undefined)
        additional_surface_parameters = get_additional_surface_parameters(undefined, undefined, undefined)

    console.log(biomeName + ' passed to the generation')

    // Gameplay
    var seed = _math.new_seed();

    // Planet surface
    var temperature = additional_surface_parameters.temperature;
    var waterDepth = additional_surface_parameters.waterDepth;
    var height = additional_surface_parameters.height;

    // Orbit parameter, does nothing but need to initialize
    var mass = 10000;

    var metal_calculation = calculate_metal(base_metal_density);

    var landingZoneSize = planet_size / 10;

    console.log("making planet settings")
    var planet = {
        name: _planetnames.generate_planet_name(),
        mass: mass,
        intended_radius: planet_size,
        position_x: 50000,
        position_y: 0,
        velocity_x: 0,
        velocity_y: 100,
        starting_planet: true,
        required_thrust_to_move: 0,
        metalEstimate: 1,
        planet: {
            seed: seed,
            biome: biomeName,
            radius: planet_size,
            heightRange: height,
            waterHeight: waterDepth,
            waterDepth: 50,
            temperature: temperature,
            // i dont know what biomeScale does
            // biomeScale: _math.random_integer(50, 100),
            biomeScale: _math.random_integer(0, 0),
            metalDensity: metal_calculation.metalDensity,
            metalClusters: metal_calculation.metalClusters,
            landingZoneSize: landingZoneSize,
            landingZonesPerArmy: Math.floor(slotFactor),
            numArmies: slots,
            symmetricalMetal: true,
            symmetricalStarts: true,
            symmetryType: "none"
        }
    }

    // get_teams();
    create_landing_zones(planet);
    // create_height_adjustments(planet);

    console.log("MAP GENERATOR/MAIN: get_random_system: ");
    console.log(planet);

    var minplayers = slots, maxplayers = slots;
    var rSystem = {
        name: _planetnames.generate_system_name(),
        isRandomlyGenerated: true,
        players: [minplayers, maxplayers]
    };

    var planets = [planet];

    // Generate asteroids
    // var orbit_from_planet = _math.random_integer(4000, 7000)
    // planets = generate_asteroids(planets, orbit_from_planet)

    var pgen = _.map(planets, function (plnt, index) {
        var nameGet = $.Deferred();
        // No terrain data is consumed here; only the random name is needed.
        api.game.getRandomPlanetName().then(function (name) { nameGet.resolve(name); }, function (error) { nameGet.reject(error); });
        return nameGet.then(function (name) {
            plnt.name = name;
            return plnt;
        });
    });

    return $.when.apply($, pgen).then(function () {
        rSystem.planets = Array.prototype.slice.call(arguments, 0);
        return rSystem;
    });


    function calculate_metal(base_metal_density) {
        // Define base metal density and cluster values
        var baseMetalDensity = base_metal_density;
        var baseMetalClusters = base_metal_density;

        // Define the maximum metal density and cluster values
        var maxMetalDensity = 60;
        var maxMetalClusters = 60;

        // Define the rapid factor, which controls the rate at which the metal density and clusters increase
        // A smaller value will result in a more rapid increase, while a larger value will result in a more gradual increase
        // Reference values:
        //  - 2: Very rapid increase (e.g., 2 players: 15, 3 players: 30, 4 players: 45)
        //  - 5: Moderate increase (e.g., 2 players: 15, 3 players: 21, 4 players: 27)
        //  - 10: Gradual increase (e.g., 2 players: 15, 3 players: 16.5, 4 players: 18)
        var increaseFactor = 5;

        // Calculate the scaling factor based on the number of players
        var numPlayers = model.slots() || 2;
        // Formula: scalingFactor = 1 + (numPlayers - 2) / rapidFactor
        // This formula scales the metal density and clusters based on the number of players.
        // The rapidFactor variable controls the rate at which the scaling factor increases.
        var scalingFactor = Math.min(1 + (numPlayers - 2) / increaseFactor, 3); // scales from 1 to 3 as numPlayers increases from 2 to 7+

        // Calculate metal density and clusters, capping at the maximum values
        var metalDensity = Math.min(baseMetalDensity * scalingFactor, maxMetalDensity);
        var metalClusters = Math.min(baseMetalClusters * scalingFactor, maxMetalClusters);

        return {
            metalDensity: metalDensity,
            metalClusters: metalClusters
        };
    }

    // Функция для генерации астероидов и добавления их в массив планет
    function generate_asteroids(planets, orbit_from_planet) {
        // Константы для генерации астероидов
        // Генерация случайного количества астероидов (0–4)
        var asteroid_count = _math.random_integer(0, 4);
        var radius_min = 150;                // Минимальный радиус астероида
        var radius_max = 400;               // Максимальный радиус астероида
        var metalDensityMin = 2;          // Минимальная плотность металла
        var metalDensityMax = 10;          // Максимальная плотность металла
        var requiredThrustToMoveMin = 0;   // Минимальное значение required_thrust_to_move
        var requiredThrustToMoveMax = 2;   // Максимальное значение required_thrust_to_move
        var fixedMassAsteroid = 5000;      // Фиксированная масса астероида
        var G = 1;                         // Предполагаемая гравитационная постоянная

        var theta_derivation_degrees = 45;

        // Цикл для создания каждого астероида
        for (var i = 0; i < asteroid_count; i++) {

            /**
             * Calculate the angle theta for asteroid positioning.
             *
             * The angle is calculated based on the index of the asteroid,
             * the total count of asteroids, and a random deviation in degrees.
             * This ensures asteroids are evenly spaced with some variation.
             *
             * @param {number} i - The index of the current asteroid.
             * @param {number} asteroid_count - The total number of asteroids.
             * @param {number} theta_derivation_degrees - The degree deviation for randomness.
             * @returns {number} theta - The calculated angle in radians.
             */
            var theta =
                (i * 2 * Math.PI) / asteroid_count + // Base angle for even spacing
                (_math.random_integer(0, theta_derivation_degrees) * _math.random_sign() * Math.PI / 180); // Add random deviation

            console.log("theta: " + theta + " i*2*Math.PI: " + (i * 2 * Math.PI)
                + " asteroid_count: " + asteroid_count +
                " divide: " + (i * 2 * Math.PI) / asteroid_count);

            // Генерация радиуса с меньшей вероятностью больших значений (логарифмическое распределение)
            var radius = Math.exp(Math.random() * Math.log(radius_max / radius_min)) * radius_min;

            // Случайная плотность металла в диапазоне [15, 30]
            var metal_density = _math.random_integer(metalDensityMin, metalDensityMax);

            // Случайное значение required_thrust_to_move в диапазоне [0, 2]
            var requiredThrustToMove = _math.random_integer(requiredThrustToMoveMin, requiredThrustToMoveMax);

            // Расчет орбитальной скорости для круговой орбиты: v = sqrt(G * M / d)
            var orbitalSpeed = Math.sqrt(G * planets[0].mass / orbit_from_planet);

            // Компоненты скорости относительно центральной планеты
            var vxRel = -orbitalSpeed * Math.sin(theta);
            var vyRel = orbitalSpeed * Math.cos(theta);

            // Абсолютные скорости с учетом скорости центральной планеты
            var velocityX = planets[0].velocity_x + vxRel;
            var velocityY = planets[0].velocity_y + vyRel;

            // Позиция астероида на орбите
            var positionX = planets[0].position_x + orbit_from_planet * Math.cos(theta);
            var positionY = planets[0].position_y + orbit_from_planet * Math.sin(theta);

            console.log("Asteroid " + (i + 1) + " position: (" + positionX + ", " + positionY + ")");

            var additional_surface_parameters = get_additional_surface_parameters()
            // Создание объекта астероида
            var asteroid = {
                name: "Asteroid " + (i + 1),              // Уникальное имя астероида
                mass: fixedMassAsteroid,                // Фиксированная масса
                position_x: positionX,                  // Позиция по X
                position_y: positionY,                  // Позиция по Y
                velocity_x: velocityX,                  // Скорость по X
                velocity_y: velocityY,                  // Скорость по Y
                required_thrust_to_move: requiredThrustToMove, // Количество "трастеров"
                starting_planet: false,                 // Запрет спавна на астероиде
                planet: {
                    biome: "asteroid",                  // Биом астероида
                    seed: Math.floor(Math.random() * 100000), // Случайный seed
                    radius: radius,                     // Радиус астероида
                    heightRange: additional_surface_parameters.height,                     // Без высотных перепадов
                    waterHeight: additional_surface_parameters.waterDepth,                     // Без воды
                    temperature: additional_surface_parameters.temperature,                     // Температура (не используется)
                    metalDensity: metal_density,         // Плотность металла
                    metalClusters: metal_density,                  // Количество металлических кластеров
                    biomeScale: 100                     // Масштаб биома
                }
            };

            // Добавление астероида в массив планет
            planets.push(asteroid);
        }

        return planets; // Возвращаем обновленный массив планет (опционально)
    }

    function create_landing_zones(planet) {
        // var radius = planet.planet.radius;
        // planet.landing_zones = {
        //     list: [
        //         // x,y,z
        //         [
        //             radius,
        //             0,
        //             0
        //         ],
        //         [
        //             -radius,
        //             0,
        //             0
        //         ],
        //         [
        //             0,
        //             radius,
        //             0
        //         ],
        //         [
        //             0,
        //             -radius,
        //             0
        //         ]
        //     ],
        //     rules: [
        //         {
        //             min: 1,
        //             max: 10
        //         },
        //         {
        //             min: 1,
        //             max: 10
        //         },
        //         {
        //             min: 1,
        //             max: 10
        //         },
        //         {
        //             min: 1,
        //             max: 10
        //         }
        //     ]
        // }

        var teams = get_teams();

        var landing_zones = _surface.generate_landing_zones(planet, teams, true);
        planet.landing_zones = {
            list: _.map(landing_zones, function (zone) {
                return zone.position;
            })
        };

        console.log("planet.landing_zones: ", planet.landing_zones);
    }

    /**
     * Returns an array of teams, each containing an id and an array of player names.
     * @return {Array}
     */
    function get_teams(){
        var armies = model.armies();
        var teams = [];
        for (var i = 0; i < armies.length; i++) {
            var army = armies[i];
            var slots = army.slots();

            var players = _.map(slots, function (slot) {
                return slot.playerName();
            })

            var team = {
                id: i,
                players: players
            }
            console.log(team);

            teams.push(team);
        }

        return teams;
    }

    function create_height_adjustments(planet) {
        var landing_zones_positions = planet.landing_zones.list;

        // Create height adjustments for the landing zones
        planet.planet.heightAdjustments = _.map(landing_zones_positions, function (pos) {
            return create_adjustment(pos, 90, 100);
        });


        /**
         * Creates a height adjustment object.
         * @param {number[]} pos - The position vector [x, y, z] of the adjustment.
         * @param {number} radius - The radius of the adjustment.
         * @param {number} adjustment - The value of the adjustment. Can be positive or negative.
         * @returns {{pos: number[], radius: number, adjustment: number}} The created height adjustment object.
         */
        function create_adjustment(pos, radius, adjustment) {
            return {
                pos: pos,
                radius: radius,
                adjustment: adjustment,
                normalizedAdjustment: 1.5
            }
        }
    }
}

// DATA MANAGEMENT !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// DATA MANAGEMENT !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// DATA MANAGEMENT !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

//modification_data:
// [ structure
// {
//     id: 'planet-size',
//     value: 2
// },
// ...
//]

/**
 * Gets the current planet size option value from the stored modification data. If the stored modification data doesn't have this option, returns the default option value.
 * @returns {number} The planet size option value.
 */
function get_generation_size_option() {
    var size = _.find(_data.get_options(), { id: 'planet-size' });
    if (size == undefined)
        return _.find(default_generation_options, { id: 'planet-size' }).value;
    else
        return size.value;
}

// FIX
