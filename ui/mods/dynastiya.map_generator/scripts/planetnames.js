define(function () {
    return {
        // Function to generate a random compound name
        generate_name: function (namesArray) {
            // Random number of words (from 1 to 4, so it's not too long)
            var wordCount = Math.floor(Math.random() * 4) + 1;
            var compositeName = "";

            for (var i = 0; i < wordCount; i++) {
                // Random index from the array
                var randomIndex = Math.floor(Math.random() * namesArray.length);
                compositeName += namesArray[randomIndex];
                // Add a hyphen if not the last word
                if (i < wordCount - 1) {
                    compositeName += "-";
                }
            }

            return compositeName;
        },

        generate_planet_name: function () {
            return this.generate_name(this.get_planet_names())
        },

        generate_system_name: function () {
            return this.generate_name(this.get_system_names())
        },

        get_planet_names: function () {
            var names = this.planet_names_god.concat(this.planet_names_units);
            return names
        },

        get_system_names: function () {
            var names = this.system_names_god.concat(this.system_names_units);
            return names
        },

        planet_names_god: [
            "Zeus",
            "Demon",
            "Angel",
            "Satan",
            "Thor",
            "Hades",
            "Cherub",
            "Buddha",
            "Vishnu",
            "Ghost",
            "Jesus",
            "Krishna",
            "Odin",
            "Seraph",
            "Golem",
            "Titan",
            "Loki",
            "Imp",
            "Banshee",
            "Yahweh",
            "Anubis",
            "Kali",
            "Wraith",
            "Bahamut",
            "Arm",
            "Leg",
            "Hand",
            "Foot",
            "Knee",
            "Elbow"
        ],
        planet_names_units: [
            "Dox",    // T1 Dox
            "Galata", // T1 Turret
            "Laser",  // T1 Single Laser Defense Tower
            "Torpedo", // T1 Torpedo Launcher
            "Flak",   // T2 Flak Cannon
            "Pelter", // T1 Pelter
            "Umbrella", // T1 Umbrella
            "Catapult", // T2 Catapult
            "Holkins", // T2 Holkins
            "Mine",   // T0 Mine
            "Shredder", // T1 Shredder
            "Ripple", // T1 Ripple
            "Jackal", // T1 Jackal
            "Hive",   // T1 Hive
            "Arsonist", // T2 Arsonist
            "Slammer", // T2 Bot
            "Kestrel", // T2 Aircraft
            "Piranha", // T1 Naval
            "Locusts"  // T2 Bot
        ],

        system_names_god: [
            "Heaven",
            "Hell",
            "Eden",
            "Purgatory",
            "Valhalla",
            "Nirvana",
            "Abyss",
            "Tartarus",
            "Olympus",
            "Sheol",
            "Zion",
            "Asgard",
            "Devil",
            "God",
            "Leviathan",
            "Behemoth",
            "Vampire",
            "Zombie",
            "Reaper",
            "Tiamat",
            "Shiva",
            "Osiris",
            "Moloch",
            "Specter",
            "Arm",
            "Leg",
            "Hand",
            "Foot",
            "Knee",
            "Elbow"
        ],

        system_names_units: [
            "Ares",   // T3 Vehicle
            "Atlas",  // T3 Bot
            "Zeus",   // T3 Aircraft
            "Ragnarok", // T3 Annihilation
            "Helios", // T3 Teleporter
            "Odin",   // T3 Vehicle
            "Thor",   // T3 Bot
            "Loki",   // T3 Aircraft
            "Tyr",    // T3 Orbital
            "Holocene" // T3 Annihilation
        ]
    };
})
