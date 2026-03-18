function buildSurface(verts, normal) {
    var positions = [];
    var normals = [];
    var indices = [0, 1, 2, 0, 2, 3];
    var edgeIndices = [0, 1, 1, 2, 2, 3, 3, 0];

    for (var i = 0; i < 4; i++) {
        positions.push(verts[i][0], verts[i][1], verts[i][2]);
        normals.push(normal[0], normal[1], normal[2]);
    }

    return {
        positions: new Float32Array(positions),
        normals: new Float32Array(normals),
        indices: new Uint16Array(indices),
        edgeIndices: new Uint16Array(edgeIndices)
    };
}

function buildFloorGrid() {
    var positions = [];
    var normals = [];
    var indices = [];
    var edgeIndices = [];

    var W = 20, D = 20;
    var GRID = 20;

    for (var row = 0; row < GRID; row++) {
        for (var col = 0; col < GRID; col++) {
            var x0 = -W + col * (2 * W / GRID);
            var x1 = -W + (col + 1) * (2 * W / GRID);
            var z0 = -D + row * (2 * D / GRID);
            var z1 = -D + (row + 1) * (2 * D / GRID);

            var base = positions.length / 3;
            positions.push(x0, 0, z0, x1, 0, z0, x1, 0, z1, x0, 0, z1);
            normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
            indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
            edgeIndices.push(base, base + 1, base + 1, base + 2, base + 2, base + 3, base + 3, base);
        }
    }

    return {
        positions: new Float32Array(positions),
        normals: new Float32Array(normals),
        indices: new Uint16Array(indices),
        edgeIndices: new Uint16Array(edgeIndices)
    };
}

function buildRoomPieces() {
    var W = 20, H = 8, D = 20;

    return [
        // floor — dark with subtle warm tint
        {
            data: buildFloorGrid(),
            colour: [0.15, 0.14, 0.18]
        },

        // ceiling
        {
            data: buildSurface(
                [[-W, H, -D], [W, H, -D], [W, H, D], [-W, H, D]], [0, -1, 0]),
            colour: [0.08, 0.10, 0.18]
        },

        // back wall — glowing blue
        {
            data: buildSurface(
                [[-W, 0, -D], [W, 0, -D], [W, H, -D], [-W, H, -D]], [0, 0, 1]),
            colour: [0.08, 0.18, 0.38]
        },

        // front wall
        {
            data: buildSurface(
                [[W, 0, D], [-W, 0, D], [-W, H, D], [W, H, D]], [0, 0, -1]),
            colour: [0.06, 0.14, 0.28]
        },

        // left wall — teal glow
        {
            data: buildSurface(
                [[-W, 0, D], [-W, 0, -D], [-W, H, -D], [-W, H, D]], [1, 0, 0]),
            colour: [0.05, 0.20, 0.22]
        },

        // right wall — purple glow
        {
            data: buildSurface(
                [[W, 0, -D], [W, 0, D], [W, H, D], [W, H, -D]], [-1, 0, 0]),
            colour: [0.18, 0.08, 0.28]
        },
    ];
}