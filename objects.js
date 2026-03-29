// ---------- basic transform helpers ----------
console.log("objects.js loaded");
function obj_T(x, y, z) {
    return mat4(
        1, 0, 0, x,
        0, 1, 0, y,
        0, 0, 1, z,
        0, 0, 0, 1
    );
}

function obj_S(x, y, z) {
    return mat4(
        x, 0, 0, 0,
        0, y, 0, 0,
        0, 0, z, 0,
        0, 0, 0, 1
    );
}

function obj_Rx(deg) {
    var c = Math.cos(deg * Math.PI / 180);
    var s = Math.sin(deg * Math.PI / 180);
    return mat4(
        1, 0, 0, 0,
        0, c, -s, 0,
        0, s, c, 0,
        0, 0, 0, 1
    );
}

function obj_Ry(deg) {
    var c = Math.cos(deg * Math.PI / 180);
    var s = Math.sin(deg * Math.PI / 180);
    return mat4(
        c, 0, s, 0,
        0, 1, 0, 0,
        -s, 0, c, 0,
        0, 0, 0, 1
    );
}

function obj_Rz(deg) {
    var c = Math.cos(deg * Math.PI / 180);
    var s = Math.sin(deg * Math.PI / 180);
    return mat4(
        c, -s, 0, 0,
        s, c, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    );
}

function obj_ShearXY(k) {
    return mat4(
        1, k, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    );
}

function buildCube(size) {
    var s = size / 2;

    var positions = [
        // front
        -s, -s,  s,   s, -s,  s,   s,  s,  s,  -s,  s,  s,
        // back
        -s, -s, -s,  -s,  s, -s,   s,  s, -s,   s, -s, -s,
        // left
        -s, -s, -s,  -s, -s,  s,  -s,  s,  s,  -s,  s, -s,
        // right
         s, -s, -s,   s,  s, -s,   s,  s,  s,   s, -s,  s,
        // top
        -s,  s, -s,  -s,  s,  s,   s,  s,  s,   s,  s, -s,
        // bottom
        -s, -s, -s,   s, -s, -s,   s, -s,  s,  -s, -s,  s
    ];

    var normals = [
        // front
         0, 0, 1,  0, 0, 1,  0, 0, 1,  0, 0, 1,
        // back
         0, 0,-1,  0, 0,-1,  0, 0,-1,  0, 0,-1,
        // left
        -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
        // right
         1, 0, 0,  1, 0, 0,  1, 0, 0,  1, 0, 0,
        // top
         0, 1, 0,  0, 1, 0,  0, 1, 0,  0, 1, 0,
        // bottom
         0,-1, 0,  0,-1, 0,  0,-1, 0,  0,-1, 0
    ];

    var indices = [
         0, 1, 2,   0, 2, 3,
         4, 5, 6,   4, 6, 7,
         8, 9,10,   8,10,11,
        12,13,14,  12,14,15,
        16,17,18,  16,18,19,
        20,21,22,  20,22,23
    ];

    var edgeIndices = [
         0,1, 1,2, 2,3, 3,0,
         4,5, 5,6, 6,7, 7,4,
         8,9, 9,10, 10,11, 11,8,
         12,13, 13,14, 14,15, 15,12,
         16,17, 17,18, 18,19, 19,16,
         20,21, 21,22, 22,23, 23,20
    ];

    return {
        positions: new Float32Array(positions),
        normals: new Float32Array(normals),
        indices: new Uint16Array(indices),
        edgeIndices: new Uint16Array(edgeIndices)
    };
}

function buildSphere(radius, latBands, lonBands) {
    var positions = [];
    var normals = [];
    var indices = [];
    var edgeIndices = [];

    for (var lat = 0; lat <= latBands; lat++) {
        var theta = lat * Math.PI / latBands;
        var sinTheta = Math.sin(theta);
        var cosTheta = Math.cos(theta);

        for (var lon = 0; lon <= lonBands; lon++) {
            var phi = lon * 2 * Math.PI / lonBands;
            var sinPhi = Math.sin(phi);
            var cosPhi = Math.cos(phi);

            var x = cosPhi * sinTheta;
            var y = cosTheta;
            var z = sinPhi * sinTheta;

            positions.push(radius * x, radius * y, radius * z);
            normals.push(x, y, z);
        }
    }

    for (var lat = 0; lat < latBands; lat++) {
        for (var lon = 0; lon < lonBands; lon++) {
            var first = lat * (lonBands + 1) + lon;
            var second = first + lonBands + 1;

            indices.push(first, second, first + 1);
            indices.push(second, second + 1, first + 1);

            edgeIndices.push(first, second);
            edgeIndices.push(first, first + 1);
        }
    }

    return {
        positions: new Float32Array(positions),
        normals: new Float32Array(normals),
        indices: new Uint16Array(indices),
        edgeIndices: new Uint16Array(edgeIndices)
    };
}

function buildTorus(R, r, majorSteps, minorSteps) {
    var positions = [];
    var normals = [];
    var indices = [];
    var edgeIndices = [];

    for (var i = 0; i <= majorSteps; i++) {
        var u = i * 2 * Math.PI / majorSteps;
        var cu = Math.cos(u);
        var su = Math.sin(u);

        for (var j = 0; j <= minorSteps; j++) {
            var v = j * 2 * Math.PI / minorSteps;
            var cv = Math.cos(v);
            var sv = Math.sin(v);

            var x = (R + r * cv) * cu;
            var y = r * sv;
            var z = (R + r * cv) * su;

            var nx = cv * cu;
            var ny = sv;
            var nz = cv * su;

            positions.push(x, y, z);
            normals.push(nx, ny, nz);
        }
    }

    for (var i = 0; i < majorSteps; i++) {
        for (var j = 0; j < minorSteps; j++) {
            var first = i * (minorSteps + 1) + j;
            var second = first + (minorSteps + 1);

            indices.push(first, second, first + 1);
            indices.push(second, second + 1, first + 1);

            edgeIndices.push(first, second);
            edgeIndices.push(first, first + 1);
        }
    }

    return {
        positions: new Float32Array(positions),
        normals: new Float32Array(normals),
        indices: new Uint16Array(indices),
        edgeIndices: new Uint16Array(edgeIndices)
    };
}

function createSceneObjects() {
    return [
        {
            name: "cube",
            data: buildCube(3.0),
            colour: [1.0, 0.0, 0.0],
            position: [0, 2.0, -12],
            rotation: [0, 0, 0],
            scale: [1, 1, 1]
        },
        {
            name: "sphere",
            data: buildSphere(1.8, 12, 18),
            colour: [0.0, 0.7, 1.0],
            position: [8, 3.0, -18],
            rotation: [0, 0, 0],
            scale: [1, 1, 1]
        },
        {
            name: "torus",
            data: buildTorus(2.2, 0.7, 18, 12),
            colour: [1.0, 0.8, 0.1],
            position: [-10, 3.0, -18],
            rotation: [0, 0, 0],
            scale: [1, 1, 1]
        }
    ];
}

function updateSceneObjects(time) {
    for (var i = 0; i < sceneObjects.length; i++) {
        var obj = sceneObjects[i];

        
        if (obj.hitTimer > 0) {
            obj.hitTimer -= 0.016;
            if (obj.hitTimer <= 0) {
                obj.colour = obj.baseColour.slice();
                obj.hitTimer = 0;
            }
        }

        // --- existing animation code ---
        if (obj.name === "cube") {
            obj.rotation[1] = time * 50.0;
            obj.position[1] = 2.0 + Math.sin(time * 2.0) * 0.5;
        }

        if (obj.name === "sphere") {
            obj.position[0] = 8 + Math.sin(time * 1.5) * 4.0;
            obj.position[1] = 3.0 + Math.cos(time * 2.0) * 0.4;
        }

        if (obj.name === "torus") {
            obj.rotation[0] = time * 70.0;
            obj.rotation[1] = time * 40.0;
            obj.position[1] = 3.0 + Math.sin(time * 1.2) * 0.3;
        }
    }
}



function buildObjectModelMatrix(obj) {
    var T = obj_T(obj.position[0], obj.position[1], obj.position[2]);
    var S = obj_S(obj.scale[0], obj.scale[1], obj.scale[2]);
    var Rx = obj_Rx(obj.rotation[0]);
    var Ry = obj_Ry(obj.rotation[1]);
    var Rz = obj_Rz(obj.rotation[2]);

    var R = multiplyMat4(Rz, S);
    R = multiplyMat4(Rx, R);
    R = multiplyMat4(Ry, R);

    return multiplyMat4(T, R);
}