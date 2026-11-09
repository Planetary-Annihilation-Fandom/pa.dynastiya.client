define(function () {
    // Planet model defines planet parameters for system
    // FOR NOW IT IS ONLY A REFERENCE
    var PlanetModel = function () {
        this.name = 'Planet';
        // Im using 50k cause that is what uses to be common for planets (tatapstar)
        this.mass = 50000;

        // This property not used in game (tatapstar)
        // this.intended_radius = planet_size;

        // Position in system space
        this.position_x = 50000;
        this.position_y = 0;
        this.velocity_x = 0;
        this.velocity_y = 100;
        // Can be used as a starting planet
        this.starting_planet = true;

        // How many thrusters are needed to move to this planet
        this.required_thrust_to_move = 0;

        // A planet set to respawnable will respawn after a bit after it is destroyed (quildtide)
        this.respawn = false;

        this.start_destroyed = false;

        // Minimum and maximum spawn delay in seconds
        this.min_spawn_delay = 0;
        this.max_spawn_delay = 0;

        // This property not used in game (tatapstar)
        // this.metalEstimate = 1;

        // This property controls surface of the planet
        this.planet = {
            // Управляет генерацией терраина
            seed: Math.floor(65536 * Math.random()),
            // Название используемого биома
            biome: "sandbox",
            radius: 600,
            // How high and low the terrain can be
            heightRange: 40,
            // How deep the water can be
            waterHeight: waterDepth,
            waterDepth: 50,
            temperature: temperature,
            // i dont know what biomeScale does
            biomeScale: _math.random_integer(50, 100),

            // Defines how much metal will be in cluster
            metalDensity: metal_calculation.metalDensity,
            // Creates cluster across the planet
            metalClusters: metal_calculation.metalClusters,
            // Maximum amount of metal on the planet
            // -1 means no limit
            metalSpotLimit: -1,

            // Landing zones properties should be equal zero if you have custom landing zones
            landingZoneSize: 90,
            landingZonesPerArmy: Math.floor(slotFactor),
            numArmies: slots,

            // Symmetrical properties will only be used if symmetryType is something other than "none"
            symmetricalMetal: true,
            symmetricalStarts: true,
            symmetryType: "none",

            heightAdjustments: [
                {
                    pos:['x', 'y', 'z'],
                    radius: 200,
                    // Can be any sign, but negative numbers will be used as positive
                    adjustment: 100,
                    // Controls direction of height adjustment (-1.0 for down, 1.0 for up)
                    // (values between -1.0 and 1.0 are allowed and used as intermediate values) (0.0 is for no change)
                    // (can be greater than 1.0 or less than -1.0 and will be used as a multiplier)
                    normalizedAdjustment: -1
                }
            ]
        };
        this.landing_zones = {
            list: [
                // x,y,z
                [
                    600,
                    600,
                    600
                ]
            ],
            rules: [
                {
                    min: 1,
                    max: 10
                }
            ]
        };
    }

    return {

    };
});