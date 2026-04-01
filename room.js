var terrainAABBs = [];

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

function buildFloorGrid(W, D) {
    W = W || 40;
    D = D || 40;
    var positions = [];
    var normals = [];
    var indices = [];
    var edgeIndices = [];
    var GRID = 30;  // more grid squares so floor doesn't look stretched
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

function buildRoomPieces(W, D) {
    W = W || 40;
    D = D || 40;
    var H = 10;
    return [
        // floor — dark with subtle warm tint
        {
            data: buildFloorGrid(W, D),
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

function buildBoxMesh() {
    var hw = 0.5, h = 1.0, hd = 0.5;
    var p = [], n = [], idx = [], edge = [];

    function addFace(v0, v1, v2, v3, norm) {
        var base = p.length / 3;
        p.push(v0[0],v0[1],v0[2], v1[0],v1[1],v1[2], v2[0],v2[1],v2[2], v3[0],v3[1],v3[2]);
        for (var i = 0; i < 4; i++) n.push(norm[0], norm[1], norm[2]);
        idx.push(base, base+1, base+2, base, base+2, base+3);
        edge.push(base, base+1, base+1, base+2, base+2, base+3, base+3, base);
    }

    addFace([-hw,0,hd],[hw,0,hd],[hw,h,hd],[-hw,h,hd], [0,0,1]);
    addFace([hw,0,-hd],[-hw,0,-hd],[-hw,h,-hd],[hw,h,-hd], [0,0,-1]);
    addFace([-hw,0,-hd],[-hw,0,hd],[-hw,h,hd],[-hw,h,-hd], [-1,0,0]);
    addFace([hw,0,hd],[hw,0,-hd],[hw,h,-hd],[hw,h,hd], [1,0,0]);
    addFace([-hw,h,-hd],[-hw,h,hd],[hw,h,hd],[hw,h,-hd], [0,1,0]);
    addFace([-hw,0,hd],[-hw,0,-hd],[hw,0,-hd],[hw,0,hd], [0,-1,0]);

    return {
        positions: new Float32Array(p),
        normals: new Float32Array(n),
        indices: new Uint16Array(idx),
        edgeIndices: new Uint16Array(edge)
    };
}

function getTerrainLayout() {
    return [
        // half-walls
        { x:-10, z:-10, w:5,   h:1.2, d:0.6, rotY:0,  color:[0.22, 0.22, 0.24] },
        { x:8,   z:-15, w:4,   h:1.0, d:0.6, rotY:0,  color:[0.28, 0.26, 0.23] },
        { x:-5,  z:-25, w:6,   h:1.5, d:0.6, rotY:45, color:[0.22, 0.22, 0.24] },
        { x:12,  z:-8,  w:4,   h:1.2, d:0.6, rotY:0,  color:[0.20, 0.22, 0.15] },
        { x:0,   z:-20, w:5,   h:1.3, d:0.6, rotY:0,  color:[0.28, 0.26, 0.23] },
        // raised platforms
        { x:-15, z:-20, w:5,   h:1.8, d:5,   rotY:0,  color:[0.22, 0.22, 0.24] },
        { x:14,  z:-22, w:4,   h:2.0, d:4,   rotY:0,  color:[0.28, 0.26, 0.23] },
        // crate stacks (solid from Y=0)
        { x:-20, z:-15, w:1.5, h:2.4, d:1.5, rotY:0,  color:[0.20, 0.22, 0.15] },
        { x:18,  z:-12, w:1.4, h:3.6, d:1.4, rotY:15, color:[0.22, 0.22, 0.24] }
    ];
}

function buildTerrainModelMatrix(def) {
    return multiplyMat4(
        cam_T(def.x, 0, def.z),
        multiplyMat4(cam_Ry(def.rotY), cam_S(def.w, def.h, def.d))
    );
}

function computeTerrainAABB(def) {
    var hw = def.w / 2, hd = def.d / 2;
    var corners = [
        [-hw, 0, -hd], [hw, 0, -hd], [hw, 0, hd], [-hw, 0, hd],
        [-hw, def.h, -hd], [hw, def.h, -hd], [hw, def.h, hd], [-hw, def.h, hd]
    ];
    var cosR = Math.cos(def.rotY * Math.PI / 180);
    var sinR = Math.sin(def.rotY * Math.PI / 180);
    var minX = Infinity, maxX = -Infinity;
    var minZ = Infinity, maxZ = -Infinity;

    for (var i = 0; i < corners.length; i++) {
        var rx = corners[i][0] * cosR + corners[i][2] * sinR + def.x;
        var rz = -corners[i][0] * sinR + corners[i][2] * cosR + def.z;
        if (rx < minX) minX = rx;
        if (rx > maxX) maxX = rx;
        if (rz < minZ) minZ = rz;
        if (rz > maxZ) maxZ = rz;
    }

    return { minX: minX, maxX: maxX, minY: 0, maxY: def.h, minZ: minZ, maxZ: maxZ };
}

function buildTerrainPieces() {
    terrainAABBs = [];
    var layout = getTerrainLayout();
    var pieces = [];

    for (var i = 0; i < layout.length; i++) {
        var def = layout[i];
        pieces.push({
            modelMat: buildTerrainModelMatrix(def),
            colour: def.color
        });
        terrainAABBs.push(computeTerrainAABB(def));
    }

    return pieces;
}

function resolveTerrainCollision() {
    var halfW = 0.4;
    for (var i = 0; i < terrainAABBs.length; i++) {
        var box = terrainAABBs[i];
        var pMinX = camera.x - halfW;
        var pMaxX = camera.x + halfW;
        var pMinZ = camera.z - halfW;
        var pMaxZ = camera.z + halfW;

        if (pMaxX <= box.minX || pMinX >= box.maxX ||
            pMaxZ <= box.minZ || pMinZ >= box.maxZ) continue;

        var dx1 = pMaxX - box.minX;
        var dx2 = box.maxX - pMinX;
        var dz1 = pMaxZ - box.minZ;
        var dz2 = box.maxZ - pMinZ;
        var minOverlap = Math.min(dx1, dx2, dz1, dz2);

        if (minOverlap === dx1) camera.x -= dx1;
        else if (minOverlap === dx2) camera.x += dx2;
        else if (minOverlap === dz1) camera.z -= dz1;
        else camera.z += dz2;
    }
}
