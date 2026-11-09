// Define the module using AMD syntax to load dependencies
var _math;
define(['./math'], function (math) {
    // Fallback to local randomFloat if math module is unavailable
    _math = math || { random_float: randomFloat };
    // Expose the main function for generating landing zones
    return { generate_landing_zones: generate_landing_zones };
});

// Configuration for spawn placement
var config = {
    teamDist: Math.PI / 2,          // Angular distance between team centers
    playerDist: Math.PI / 10,       // Angular distance for player spawns
    rotationOffset: [Math.PI / 10, Math.PI / 3], // Random rotation range
    triangleSharpness: 1.0,         // Unused
    spiralCurve: Math.PI / 4,               // Spiral twist factor
    spacing: Math.PI / 6,                  // Spacing between players
    formationName: 'line'         // Default formation
};

// Map of available formations
var formations = {
    circle: formationCircle,
    line: formationLine,
    spiral: formationSpiral,
    // starburst: formationStarburst
};

/**
 * Generates landing zones for teams and players on a planet.
 * @param {Object} planet - Planet object with radius.
 * @param {Object[]} teams - Array of teams with id and players.
 * @param {boolean} [debug=false] - Enable debug logging.
 * @returns {Object[]} Array of landing zones with teamId, player, position, and basis.
 */
function generate_landing_zones(planet, teams, debug) {
    // Validate inputs
    if (!planet || !planet.planet || typeof planet.planet.radius !== 'number') {
        throw new Error('Invalid planet object or radius');
    }
    if (!teams || !Array.isArray(teams) || teams.length === 0) {
        throw new Error('Teams must be a non-empty array');
    }

    var radius = planet.planet.radius;
    var teams_count = teams.length;

    // Generate random central point
    var centerVec = vectorFromArray(randomPointOnSphere(radius));
    // Generate team centers
    var teamCenters = generateFairTeamSpawns(centerVec, config.teamDist, teams_count);

    var landing_zones = [];
    // Select random formation name
    var formationNames = Object.keys(formations);
    var randomFormationName = formationNames[Math.floor(Math.random() * formationNames.length)];
    // Process each team
    for (var i = 0; i < teamCenters.length; i++) {
        var team = teams[i];
        // Skip invalid teams
        if (!team || team.id == null || !Array.isArray(team.players)) {
            console.warn('Skipping invalid team at index ' + i);
            continue;
        }
        var teamPos = vectorFromArray(teamCenters[i]);
        var players_per_team = team.players.length;

        // Skip empty teams
        if (players_per_team === 0) {
            console.warn('Team ' + team.id + ' has no players, skipping');
            continue;
        }

        // Generate random rotation offset
        var random_rotation_offset = randomFloat(config.rotationOffset[0], config.rotationOffset[1]);

        // Generate player positions
        var players_positions = generatePlayerSpawns(
            teamPos,
            centerVec,
            config.playerDist,
            players_per_team,
            random_rotation_offset,
            randomFormationName,
            config.triangleSharpness,
            config.spiralCurve,
            config.spacing
        );

        // Create landing zones for players
        var team_landing_zones = players_positions.map(function (position, index) {
            var localOffset = [0.01 * index, 0.02 * index, 0];
            var finalPosition = transformInLocalSpace(
                position.toArray(),
                localOffset,
                [random_rotation_offset, 0, 0]
            );
            return {
                teamId: team.id,
                player: team.players[index],
                position: position.toArray(),
                basis: getLocalBasis(finalPosition)
            };
        });
        landing_zones = landing_zones.concat(team_landing_zones);
    }

    // Debug logging
    if (debug) {
        console.log('Center Point: [' + centerVec.toArray().join(', ') + ']');
        console.log('Team Centers: [' + teamCenters.map(function (c) { return '[' + c.join(', ') + ']'; }).join(', ') + ']');
        console.log('Landing Zones: [' + landing_zones.map(function (z) {
            return '{teamId: ' + z.teamId + ', player: "' + z.player + '", position: [' + z.position.join(', ') + ']}';
        }).join(', ') + ']');
    }

    return landing_zones;
}

/**
 * Places team centers evenly around a central point.
 * @param {Vector3} centerVec - Central point.
 * @param {number} angularDistance - Angle between centers.
 * @param {number} nTeams - Number of teams.
 * @returns {number[][]} Array of team center coordinates.
 */
function generateFairTeamSpawns(centerVec, angularDistance, nTeams) {
    // Create basis vectors
    var basis = generateBasis(centerVec);
    var t = basis[0];
    var n = basis[1];
    var b = basis[2];

    var spawns = [];
    // Distribute teams evenly
    for (var i = 0; i < nTeams; i++) {
        var angle = 2 * Math.PI * i / nTeams;
        var dir = t.scale(Math.cos(angle)).add(b.scale(Math.sin(angle)));
        var point = rotateVector(centerVec, dir, angularDistance);
        spawns.push(point.toArray());
    }
    return spawns;
}

/**
 * Arranges players for a team in a specific pattern.
 * @param {Vector3} teamPos - Team center.
 * @param {Vector3} globalCenter - Reference point for all teams.
 * @param {number} angularDistance - Distance from center.
 * @param {number} nPlayers - Number of players.
 * @param {number} rotationOffset - Random angle for variety.
 * @param {string} formation - Pattern name (e.g., 'circle').
 * @param {number} triangleSharpness - Unused.
 * @param {number} spiralCurve - Spiral twist factor.
 * @param {number} spacing - Distance between players.
 * @returns {Vector3[]} Array of player positions.
 */
function generatePlayerSpawns(teamPos, globalCenter, angularDistance, nPlayers, rotationOffset, formation, triangleSharpness, spiralCurve, spacing) {
    // Select formation, default to circle
    var formationFn = formations[formation] || formations.circle;
    // Call formation with parameters
    return formationFn(teamPos, globalCenter, angularDistance, nPlayers, rotationOffset, spacing, spiralCurve);
}

/**
 * Arranges players in a circular pattern around the team center, like people holding hands in a ring.
 * @param {Vector3} team_center - The team’s central point on the planet (acts as the "up" direction).
 * @param {Vector3} global_center - The reference point for all teams (used to compute "right" direction).
 * @param {number} angleStep - Angular distance from the team center for players (in radians).
 * @param {number} count - Number of players to place.
 * @param {number} offsetAngle - Angle to rotate the entire circle for variety (in radians).
 * @param {number} spacing - Unused in this formation.
 * @param {number} curve - Unused in this formation.
 * @returns {Vector3[]} Array of player positions as Vector3 objects.
 */
function formationCircle(team_center, global_center, angleStep, count, offsetAngle, spacing, curve) {
    // Define the "up" direction as the team center
    var up = team_center.normalize();

    // Compute the "right" direction from global_center to team_center
    var right = team_center.subtract(global_center);
    var upComponent = right.dot(up);
    right = right.subtract(up.scale(upComponent)).normalize();

    // Compute the "forward" direction as up cross right
    var forward = up.cross(right).normalize();

    // Handle edge case: if team_center and global_center are too close
    if (right.length() === 0 || forward.length() === 0) {
        var ref = Math.abs(up.dot(new Vector3(1, 0, 0))) < 0.99 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0);
        right = up.cross(ref).normalize();
        forward = up.cross(right).normalize();
    }

    // Create quaternion for initial rotation: rotate up around forward by angleStep
    var qFromTeamCenter = Quaternion.fromAxisAngle(forward, angleStep * 0.5 + (Math.PI / 12));

    // Generate positions for all players
    var positions = [];
    for (var i = 0; i < count; i++) {
        // Calculate angle for this player
        var random_rotation_offset =
            randomFloat(config.rotationOffset[0], config.rotationOffset[1]);
        var theta = random_rotation_offset + (2 * Math.PI * i / count);
        // console.log("offset in degrees: " + (random_rotation_offset * 180 / Math.PI).toFixed(1));
        // console.log("theta in degrees: " + (theta * 180 / Math.PI).toFixed(1));

        // Create quaternion for rotation around up axis
        var qAroundTeamCenter = Quaternion.fromAxisAngle(up, theta);
        // Combine rotations
        var finalPos = qAroundTeamCenter.multiply(qFromTeamCenter).rotateVector(up);
        // Scale to planet radius
        finalPos = finalPos.normalize().scale(team_center.length());
        positions.push(finalPos);
    }

    return positions;
}

/**
 * Arranges players in a line pattern extending from the team center.
 * @param {Vector3} team_center - The team’s central point on the planet (acts as the "up" direction).
 * @param {Vector3} global_center - The reference point for all teams (used to compute "right" direction).
 * @param {number} angleStep - Base angular distance from the team center.
 * @param {number} count - Number of players to place.
 * @param {number} offsetAngle - Starting angle for the line.
 * @param {number} spacing - Angular spacing between players.
 * @param {number} curve - Unused in this formation.
 * @returns {Vector3[]} Array of player positions as Vector3 objects.
 */
function formationLine(team_center, global_center, angleStep, count, offsetAngle, spacing, curve) {
    // Define the "up" direction as the team center
    var up = team_center.normalize();

    // Compute the "right" direction from global_center to team_center
    var right = team_center.subtract(global_center);
    var upComponent = right.dot(up);
    right = right.subtract(up.scale(upComponent)).normalize();

    // Compute the "forward" direction as up cross right
    var forward = up.cross(right).normalize();

    // Handle edge case: if team_center and global_center are too close
    if (right.length() === 0 || forward.length() === 0) {
        var ref = Math.abs(up.dot(new Vector3(1, 0, 0))) < 0.99 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0);
        right = up.cross(ref).normalize();
        forward = up.cross(right).normalize();
    }

    // Create quaternion for base rotation around forward
    // var qBase = Quaternion.fromAxisAngle(forward, angleStep);
    var qBase = Quaternion.fromAxisAngle(forward, 0);

    // Calculate middle index for centering the line
    var mid = (count - 1) / 2;

    var positions = [];
    for (var i = 0; i < count; i++) {
        // Compute offset for this player
        var offset_at_line = ((i + 1) - mid) * (spacing+Math.PI/12);
        console.log("offset in degrees: " + (offset_at_line * 180 / Math.PI).toFixed(1));
        // Create quaternion for additional rotation around right axis
        var qOffset = Quaternion.fromAxisAngle(right, offset_at_line);
        // Combine rotations
        var finalPos = qOffset.multiply(qBase).rotateVector(up);
        // Apply offsetAngle rotation around up
        var random_tilt =
            randomFloat(config.rotationOffset[0], config.rotationOffset[1]) * _math.random_sign() * 0;
        console.log("tilt in degrees: " + (random_tilt * 180 / Math.PI).toFixed(1));
        var qAngle = Quaternion.fromAxisAngle(up, random_tilt);
        finalPos = qAngle.rotateVector(finalPos);
        // Scale to planet radius
        finalPos = finalPos.normalize().scale(team_center.length());
        positions.push(finalPos);
    }

    return positions;
}

/**
 * Arranges players in an Archimedean spiral pattern extending from the team center.
 * @param {Vector3} team_center - The team’s central point on the planet (acts as the "up" direction).
 * @param {Vector3} global_center - The reference point for all teams (used to compute "right" direction).
 * @param {number} angleStep - Base angular distance from the team center (in radians).
 * @param {number} count - Number of players to place.
 * @param {number} offsetAngle - Starting angle for the spiral (in radians).
 * @param {number} spacing - Angular spacing added per player (controls spiral growth).
 * @param {number} curve - Factor controlling spiral tightness (affects rotation speed).
 * @returns {Vector3[]} Array of player positions as Vector3 objects.
 */
function formationSpiral(team_center, global_center, angleStep, count, offsetAngle, spacing, curve) {
    // Define the "up" direction as the team center
    var up = team_center.normalize();

    // Compute the "right" direction from global_center to team_center
    var right = team_center.subtract(global_center);
    var upComponent = right.dot(up);
    right = right.subtract(up.scale(upComponent)).normalize();

    // Compute the "forward" direction as up cross right
    var forward = up.cross(right).normalize();

    // Handle edge case: if team_center and global_center are too close
    if (right.length() === 0 || forward.length() === 0) {
        var ref = Math.abs(up.dot(new Vector3(1, 0, 0))) < 0.99 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0);
        right = up.cross(ref).normalize();
        forward = up.cross(right).normalize();
    }

    var positions = [];
    for (var i = 0; i < count; i++) {
        // Compute the angular distance for this player (Archimedean spiral: r = a * θ)
        // Base distance plus incremental spacing
        var dist = angleStep + i * spacing * 0.1;
        // Compute the rotation angle, scaled by curve for tightness
        offsetAngle = randomFloat(config.rotationOffset[0], config.rotationOffset[1]) * _math.random_sign() * 0;
        var theta = offsetAngle + i * curve;
        console.log("theta (deg): " + (theta * 180 / Math.PI).toFixed(1) + ", dist (deg): " + (dist * 180 / Math.PI).toFixed(1));
        // Create quaternion for distance rotation around forward
        var qDist = Quaternion.fromAxisAngle(forward, dist);
        // Create quaternion for spiral rotation around up
        var qSpiral = Quaternion.fromAxisAngle(up, theta);
        // Combine rotations: first distance, then spiral
        var finalPos = qSpiral.multiply(qDist).rotateVector(up);
        // Scale to planet radius to ensure position lies on sphere
        finalPos = finalPos.normalize().scale(team_center.length());
        positions.push(finalPos);
    }

    return positions;
}

/**
 * Arranges players in a starburst pattern with alternating distances from the team center.
 * @param {Vector3} team_center - The team’s central point on the planet (acts as the "up" direction).
 * @param {Vector3} global_center - The reference point for all teams (used to compute "right" direction).
 * @param {number} angleStep - Base angular distance from the team center.
 * @param {number} count - Number of players to place.
 * @param {number} offsetAngle - Starting angle for the starburst.
 * @param {number} spacing - Spacing factor for alternation.
 * @param {number} curve - Factor for slight spiral effect.
 * @returns {Vector3[]} Array of player positions as Vector3 objects.
 */
function formationStarburst(team_center, global_center, angleStep, count, offsetAngle, spacing, curve) {
    // Define the "up" direction as the team center
    var up = team_center.normalize();

    // Compute the "right" direction from global_center to team_center
    var right = team_center.subtract(global_center);
    var upComponent = right.dot(up);
    right = right.subtract(up.scale(upComponent)).normalize();

    // Compute the "forward" direction as up cross right
    var forward = up.cross(right).normalize();

    // Handle edge case: if team_center and global_center are too close
    if (right.length() === 0 || forward.length() === 0) {
        var ref = Math.abs(up.dot(new Vector3(1, 0, 0))) < 0.99 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0);
        right = up.cross(ref).normalize();
        forward = up.cross(right).normalize();
    }

    // Define inner and outer distances
    var innerDist = angleStep;
    var outerDist = angleStep * 1.5;

    var positions = [];
    for (var i = 0; i < count; i++) {
        // Calculate angle for this player
        var theta = offsetAngle + (2 * Math.PI * i / count);
        // Alternate distances
        var dist = (i % 2 === 0) ? innerDist : outerDist;
        // Add spiral effect
        var spiralAngle = theta + i * spacing * curve;
        // Create quaternions
        var qDist = Quaternion.fromAxisAngle(forward, dist);
        var qSpiral = Quaternion.fromAxisAngle(up, spiralAngle);
        // Combine rotations
        var finalPos = qSpiral.multiply(qDist).rotateVector(up);
        // Scale to planet radius
        finalPos = finalPos.normalize().scale(team_center.length());
        positions.push(finalPos);
    }

    return positions;
}


/**
 * Generates a random number between a minimum and maximum value.
 * @param {number} min - The smallest possible value.
 * @param {number} max - The largest possible value.
 * @returns {number} A random number between min and max.
 */
function randomFloat(min, max) {
    // Use Math.random to pick a random fraction and scale it to the desired range
    return Math.random() * (max - min) + min;
}

/**
 * Checks if an object is a valid 3D vector with numeric x, y, z properties.
 * @param {Object} v - The object to check.
 * @returns {boolean} True if the object is a valid vector, false otherwise.
 */
function isValidVector(v) {
    // Ensure the object exists and has numeric x, y, z values
    return v && typeof v.x === 'number' && typeof v.y === 'number' && typeof v.z === 'number';
}

/**
 * Creates a 3D vector with x, y, z coordinates.
 * @param {number} [x=0] - X coordinate.
 * @param {number} [y=0] - Y coordinate.
 * @param {number} [z=0] - Z coordinate.
 * @constructor
 */
function Vector3(x, y, z) {
    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;
}

// Vector3 methods for 3D vector operations
Vector3.prototype = {
    // Normalizes the vector to unit length
    normalize: function () {
        var len = this.length();
        return len === 0 ? new Vector3(0, 0, 0) : this.scale(1 / len);
    },
    // Computes the cross product with another vector
    cross: function (v) {
        return new Vector3(
            this.y * v.z - this.z * v.y,
            this.z * v.x - this.x * v.z,
            this.x * v.y - this.y * v.x
        );
    },
    // Computes the dot product with another vector
    dot: function (v) {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    },
    // Scales the vector by a scalar
    scale: function (s) {
        return new Vector3(this.x * s, this.y * s, this.z * s);
    },
    // Adds another vector to this one
    add: function (v) {
        return new Vector3(this.x + v.x, this.y + v.y, this.z + v.z);
    },
    // Subtracts another vector from this one
    subtract: function (v) {
        return new Vector3(this.x - v.x, this.y - v.y, this.z - v.z);
    },
    // Computes the vector's magnitude
    length: function () {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    },
    // Converts to array format
    toArray: function () {
        return [this.x, this.y, this.z];
    },
    // Rotates using Euler angles
    rotateEuler: function (yaw, pitch, roll) {
        return Quaternion.fromEuler(yaw, pitch, roll).rotateVector(this);
    },
    // Rotates using a quaternion
    rotate: function (q) {
        return q.rotateVector(this);
    }
};

/**
 * Converts an array to a Vector3 object.
 * @param {number[]} arr - Array of [x, y, z] coordinates.
 * @returns {Vector3} A new Vector3 object.
 */
function vectorFromArray(arr) {
    // Take the first three values and create a vector
    return new Vector3(arr[0], arr[1], arr[2]);
}

/**
 * Creates a quaternion for 3D rotations.
 * @param {number} [x=0] - X component.
 * @param {number} [y=0] - Y component.
 * @param {number} [z=0] - Z component.
 * @param {number} [w=1] - W component.
 * @constructor
 */
function Quaternion(x, y, z, w) {
    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;
    this.w = w !== undefined ? w : 1;
}

// Quaternion methods for rotation operations
Quaternion.prototype = {
    // Creates a quaternion from Euler angles
    fromEuler: function (yaw, pitch, roll) {
        var cy = Math.cos(yaw * 0.5), sy = Math.sin(yaw * 0.5);
        var cp = Math.cos(pitch * 0.5), sp = Math.sin(pitch * 0.5);
        var cr = Math.cos(roll * 0.5), sr = Math.sin(roll * 0.5);
        return new Quaternion(
            sr * cp * cy - cr * sp * sy,
            cr * sp * cy + sr * cp * sy,
            cr * cp * sy - sr * sp * cy,
            cr * cp * cy + sr * sp * sy
        );
    },
    // Creates a quaternion for rotation around an axis
    fromAxisAngle: function (axis, angle) {
        var ha = angle * 0.5;
        var s = Math.sin(ha);
        return new Quaternion(axis.x * s, axis.y * s, axis.z * s, Math.cos(ha));
    },
    // Rotates a vector using this quaternion
    rotateVector: function (v) {
        var qv = new Quaternion(v.x, v.y, v.z, 0);
        var qConj = new Quaternion(-this.x, -this.y, -this.z, this.w);
        var qRes = this.multiply(qv).multiply(qConj);
        return new Vector3(qRes.x, qRes.y, qRes.z);
    },
    // Multiplies this quaternion with another
    multiply: function (q) {
        return new Quaternion(
            this.w * q.x + this.x * q.w + this.y * q.z - this.z * q.y,
            this.w * q.y - this.x * q.z + this.y * q.w + this.z * q.x,
            this.w * q.z + this.x * q.y - this.y * q.x + this.z * q.w,
            this.w * q.w - this.x * q.x - this.y * q.y - this.z * q.z
        );
    },
    // Normalizes the quaternion to unit length
    normalize: function () {
        var m = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
        return m === 0 ? new Quaternion(0, 0, 0, 1) : new Quaternion(this.x / m, this.y / m, this.z / m, this.w / m);
    }
};

// Static quaternion methods
Quaternion.fromEuler = function (yaw, pitch, roll) {
    return new Quaternion().fromEuler(yaw, pitch, roll);
};

Quaternion.fromAxisAngle = function (axis, angle) {
    return new Quaternion().fromAxisAngle(axis, angle);
};

/**
 * Finds a safe perpendicular axis for a vector to avoid alignment issues.
 * @param {Vector3} vec - The input vector.
 * @returns {Vector3} A perpendicular vector.
 */
function getSafeCrossAxis(vec) {
    // Try x-axis first
    var axis = vec.cross(new Vector3(1, 0, 0)).normalize();
    // Fallback to y-axis if needed
    if (axis.length() === 0) {
        axis = vec.cross(new Vector3(0, 1, 0)).normalize();
    }
    return axis;
}

/**
 * Creates a new point on a sphere relative to a base point.
 * @param {number[]} base - Base point coordinates [x, y, z].
 * @param {number} radius - Sphere radius.
 * @param {number} angle - Angular distance in radians.
 * @param {number[]} dir - Direction vector [x, y, z].
 * @returns {number[]} New point coordinates [x, y, z].
 */
function pointOnSphereRelative(base, radius, angle, dir) {
    // Convert inputs to vectors
    var baseVec = vectorFromArray(base);
    var dirVec = vectorFromArray(dir).normalize();
    // Find perpendicular axis
    var axis = baseVec.cross(dirVec).normalize();
    axis = axis.length() === 0 ? getSafeCrossAxis(baseVec) : axis;
    // Rotate and scale to sphere
    return Quaternion.fromAxisAngle(axis, angle).rotateVector(baseVec).normalize().scale(radius).toArray();
}

/**
 * Creates a local coordinate system for a point on a sphere.
 * @param {number[]} pos - Point coordinates [x, y, z].
 * @returns {Object} Object with forward, up, and right vectors.
 */
function getLocalBasis(pos) {
    // Forward is the point’s direction from planet center
    var forward = vectorFromArray(pos).normalize();
    // Choose reference vector
    var ref = Math.abs(forward.dot(new Vector3(1, 0, 0))) < 0.99 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0);
    // Compute right and up directions
    var right = forward.cross(ref).normalize();
    var up = right.cross(forward).normalize();
    return { forward: forward, up: up, right: right };
}

/**
 * Moves a point on a sphere using local directions and optional rotation.
 * @param {number[]} point - Starting point coordinates [x, y, z].
 * @param {number[]} offsetArr - Local offset [right, up, forward].
 * @param {number[]} [eulerRot] - Optional rotation angles [yaw, pitch, roll].
 * @returns {number[]} New point coordinates [x, y, z].
 */
function transformInLocalSpace(point, offsetArr, eulerRot) {
    // Get local coordinate system
    var basis = getLocalBasis(point);
    var offset = new Vector3(offsetArr[0], offsetArr[1], offsetArr[2]);
    // Convert offset to world space
    var worldOffset = basis.right.scale(offset.x).add(basis.up.scale(offset.y)).add(basis.forward.scale(offset.z));
    // Apply rotation if provided
    if (eulerRot) {
        worldOffset = Quaternion.fromEuler(eulerRot[0] || 0, eulerRot[1] || 0, eulerRot[2] || 0).rotateVector(worldOffset);
    }
    // Move point and keep it on the sphere
    var base = vectorFromArray(point);
    return base.add(worldOffset).normalize().scale(base.length()).toArray();
}

/**
 * Picks a random point on a sphere’s surface.
 * @param {number} radius - The sphere’s radius.
 * @returns {number[]} Point coordinates [x, y, z].
 */
function randomPointOnSphere(radius) {
    // Use spherical coordinates for even distribution
    var u = Math.random() * 2 - 1;
    var theta = Math.random() * 2 * Math.PI;
    var phi = Math.acos(u);
    var x = radius * Math.sin(phi) * Math.cos(theta);
    var y = radius * Math.sin(phi) * Math.sin(theta);
    var z = radius * Math.cos(phi);
    return [x, y, z];
}

/**
 * Creates three perpendicular directions for a point.
 * @param {Vector3} centerVec - The central vector.
 * @returns {Vector3[]} Array of [tangent, normal, binormal].
 */
function generateBasis(centerVec) {
    // Normalize input
    var n = centerVec.normalize();
    // Choose reference vector
    var ref = Math.abs(n.dot(new Vector3(1, 0, 0))) < 0.99 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0);
    var t = n.cross(ref).normalize();
    var b = n.cross(t).normalize();
    return [t, n, b];
}

/**
 * Rotates a vector around an axis by an angle.
 * @param {Vector3} v - Vector to rotate.
 * @param {Vector3} axis - Rotation axis.
 * @param {number} angle - Rotation angle in radians.
 * @returns {Vector3} Rotated vector.
 */
function rotateVector(v, axis, angle) {
    var q = Quaternion.fromAxisAngle(axis, angle);
    return q.rotateVector(v);
}
