var dummyMesh = null;
var dummyMeshBounds = null;
var dummyNormScale = 1.0;
var dummyCenterX = 0;
var dummyCenterZ = 0;
var dummyMinY = 0;

var gunMesh = null;
var gunNormScale = 0.03;
var gunCenter = [0, 0, 0];

var dummyPositions = [
    [-10, 0, -12],
    [8, 0, -18],
    [-14, 1.8, -20],
    [12, 2.0, -22],
    [0, 0, -28],
    [-6, 0, -22]
];

var dummyColors = [
    [0.35, 0.38, 0.22],
    [0.55, 0.50, 0.35],
    [0.40, 0.40, 0.42],
    [0.52, 0.44, 0.30],
    [0.20, 0.30, 0.18],
    [0.38, 0.28, 0.20]
];

var dummies = [];

var gunBobX = 0, gunBobY = 0;
var gunKickY = 0, gunKickZ = 0;

function parsePLY(text) {
    var lines = text.split('\n');
    var li = 0;
    var vertexCount = 0, faceCount = 0;
    var hasNormals = false;
    var vertPropCount = 0;
    var inVertexEl = false;

    while (li < lines.length) {
        var line = lines[li].trim();
        li++;
        if (line === 'end_header') break;
        if (line.indexOf('element vertex') === 0) {
            vertexCount = parseInt(line.split(/\s+/)[2]);
            inVertexEl = true;
        } else if (line.indexOf('element face') === 0) {
            faceCount = parseInt(line.split(/\s+/)[2]);
            inVertexEl = false;
        } else if (inVertexEl && line.indexOf('property') === 0) {
            vertPropCount++;
            if (line.indexOf(' nx') >= 0) hasNormals = true;
        }
    }

    var positions = new Float32Array(vertexCount * 3);
    var normals = new Float32Array(vertexCount * 3);
    var minX = Infinity, maxX = -Infinity;
    var minY = Infinity, maxY = -Infinity;
    var minZ = Infinity, maxZ = -Infinity;

    for (var v = 0; v < vertexCount; v++) {
        var parts = lines[li].trim().split(/\s+/);
        li++;
        var x = parseFloat(parts[0]);
        var y = parseFloat(parts[1]);
        var z = parseFloat(parts[2]);
        positions[v * 3]     = x;
        positions[v * 3 + 1] = y;
        positions[v * 3 + 2] = z;

        if (hasNormals) {
            normals[v * 3]     = parseFloat(parts[3]);
            normals[v * 3 + 1] = parseFloat(parts[4]);
            normals[v * 3 + 2] = parseFloat(parts[5]);
        }

        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
        if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    }

    var triIndices = [];
    for (var f = 0; f < faceCount; f++) {
        var parts = lines[li].trim().split(/\s+/);
        li++;
        var n = parseInt(parts[0]);
        var fv = [];
        for (var j = 0; j < n; j++) fv.push(parseInt(parts[j + 1]));
        for (var j = 1; j < n - 1; j++) {
            triIndices.push(fv[0], fv[j], fv[j + 1]);
        }
    }

    if (!hasNormals) {
        for (var t = 0; t < triIndices.length; t += 3) {
            var i0 = triIndices[t], i1 = triIndices[t+1], i2 = triIndices[t+2];
            var e1x = positions[i1*3]-positions[i0*3];
            var e1y = positions[i1*3+1]-positions[i0*3+1];
            var e1z = positions[i1*3+2]-positions[i0*3+2];
            var e2x = positions[i2*3]-positions[i0*3];
            var e2y = positions[i2*3+1]-positions[i0*3+1];
            var e2z = positions[i2*3+2]-positions[i0*3+2];
            var nx = e1y*e2z - e1z*e2y;
            var ny = e1z*e2x - e1x*e2z;
            var nz = e1x*e2y - e1y*e2x;
            normals[i0*3]+=nx; normals[i0*3+1]+=ny; normals[i0*3+2]+=nz;
            normals[i1*3]+=nx; normals[i1*3+1]+=ny; normals[i1*3+2]+=nz;
            normals[i2*3]+=nx; normals[i2*3+1]+=ny; normals[i2*3+2]+=nz;
        }
        for (var v = 0; v < vertexCount; v++) {
            var nx = normals[v*3], ny = normals[v*3+1], nz = normals[v*3+2];
            var len = Math.sqrt(nx*nx + ny*ny + nz*nz);
            if (len > 0) { normals[v*3]/=len; normals[v*3+1]/=len; normals[v*3+2]/=len; }
        }
    }

    var edgeIndices = [];
    for (var t = 0; t < triIndices.length; t += 3) {
        edgeIndices.push(triIndices[t], triIndices[t+1]);
        edgeIndices.push(triIndices[t+1], triIndices[t+2]);
        edgeIndices.push(triIndices[t+2], triIndices[t]);
    }

    return {
        positions: positions,
        normals: normals,
        indices: new Uint16Array(triIndices),
        edgeIndices: new Uint16Array(edgeIndices),
        bounds: { minX: minX, maxX: maxX, minY: minY, maxY: maxY, minZ: minZ, maxZ: maxZ }
    };
}

function initDummies() {
    if (!dummyMeshBounds) return;

    var meshHeight = dummyMeshBounds.maxY - dummyMeshBounds.minY;
    dummyNormScale = 1.7 / meshHeight;
    dummyCenterX = (dummyMeshBounds.minX + dummyMeshBounds.maxX) / 2;
    dummyCenterZ = (dummyMeshBounds.minZ + dummyMeshBounds.maxZ) / 2;
    dummyMinY = dummyMeshBounds.minY;

    dummies = [];
    for (var i = 0; i < dummyPositions.length; i++) {
        var d = {
            position: dummyPositions[i].slice(),
            scale: [1, 1, 1],
            color: dummyColors[i],
            fallAngle: 0,
            fallState: "standing",
            fallTimer: 0,
            aabbActive: true,
            worldAABB: null,
            posIndex: i
        };
        d.worldAABB = buildDummyWorldAABB(d);
        dummies.push(d);
    }
}

function buildDummyWorldAABB(d) {
    var s = dummyNormScale;
    var halfW = (dummyMeshBounds.maxX - dummyMeshBounds.minX) / 2 * s;
    var halfD = (dummyMeshBounds.maxZ - dummyMeshBounds.minZ) / 2 * s;
    var height = (dummyMeshBounds.maxY - dummyMeshBounds.minY) * s;
    return {
        minX: d.position[0] - halfW,
        maxX: d.position[0] + halfW,
        minY: d.position[1],
        maxY: d.position[1] + height,
        minZ: d.position[2] - halfD,
        maxZ: d.position[2] + halfD
    };
}

function buildDummyModelMatrix(dummy) {
    var s = dummyNormScale;
    var centerT = cam_T(-dummyCenterX, -dummyMinY, -dummyCenterZ);
    var scale = cam_S(s, s, s);
    var rot = cam_Rx(-dummy.fallAngle);
    var pos = cam_T(dummy.position[0], dummy.position[1], dummy.position[2]);
    return multiplyMat4(pos, multiplyMat4(rot, multiplyMat4(scale, centerT)));
}

function updateDummies(dt) {
    for (var i = 0; i < dummies.length; i++) {
        var d = dummies[i];
        if (d.fallState === "falling") {
            d.fallAngle += (90 / 0.4) * dt;
            if (d.fallAngle >= 90) {
                d.fallAngle = 90;
                d.fallState = "fallen";
                d.fallTimer = 0;
            }
        } else if (d.fallState === "fallen") {
            d.fallTimer += dt;
            if (d.fallTimer >= 1.5) {
                d.position = dummyPositions[d.posIndex].slice();
                d.fallAngle = 0;
                d.fallState = "standing";
                d.aabbActive = true;
                d.worldAABB = buildDummyWorldAABB(d);
            }
        }
    }
}

function updateGunAnimation(dt, moving, time) {
    if (moving) {
        gunBobX = Math.cos(time * 5) * 0.005;
        gunBobY = Math.sin(time * 8) * 0.008;
    } else {
        var decay = Math.min(1, 5 * dt);
        gunBobX *= (1 - decay);
        gunBobY *= (1 - decay);
    }
    var kickDecay = Math.min(1, dt * 10);
    gunKickY *= (1 - kickDecay);
    gunKickZ *= (1 - kickDecay);
}

function triggerGunKick() {
    gunKickY = 0.03;
    gunKickZ = -0.04;
}

function buildGunModelMatrix() {
    var tx = 0.32 + gunBobX;
    var ty = -0.32 + gunBobY + gunKickY;
    var tz = -0.55 + gunKickZ;

    var T = cam_T(tx, ty, tz);
    var Ry = cam_Ry(180 + 2);
    var Rx = cam_Rx(-4);
    var S = cam_S(gunNormScale, gunNormScale, gunNormScale);
    var center = cam_T(-gunCenter[0], -gunCenter[1], -gunCenter[2]);

    return multiplyMat4(T, multiplyMat4(Ry, multiplyMat4(Rx, multiplyMat4(S, center))));
}

function getGunMuzzleCameraPos() {
    if (!gunMesh) return [0.1, -0.2, -0.7];
    var model = buildGunModelMatrix();
    var tip = transformVec4(model, [gunCenter[0], gunCenter[1], gunMesh.bounds.maxZ, 1]);
    return [tip[0], tip[1], tip[2]];
}

function rayVsAABB(origin, dir, box) {
    var tmin = -Infinity, tmax = Infinity;
    var bmin = [box.minX, box.minY, box.minZ];
    var bmax = [box.maxX, box.maxY, box.maxZ];

    for (var i = 0; i < 3; i++) {
        if (Math.abs(dir[i]) < 1e-8) {
            if (origin[i] < bmin[i] || origin[i] > bmax[i]) return null;
        } else {
            var t1 = (bmin[i] - origin[i]) / dir[i];
            var t2 = (bmax[i] - origin[i]) / dir[i];
            if (t1 > t2) { var tmp = t1; t1 = t2; t2 = tmp; }
            tmin = Math.max(tmin, t1);
            tmax = Math.min(tmax, t2);
            if (tmin > tmax) return null;
        }
    }
    if (tmax < 0) return null;
    return tmin >= 0 ? tmin : tmax;
}
