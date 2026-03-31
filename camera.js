var camera = {
    x: 0, y: 1.65, z: 4,
    yaw: 0,
    pitch: 0,
    leanAngle: 0,
    leanOffset: 0,
    speed: 0.25,
    fovy: 60,
    near: 0.1,
    far: 200,
    aspect: 1,
    roomHalfW: 39,
    roomHalfD: 39,
    minY: 1.65,
    maxY: 1.65
};

function cam_Rx(deg) {
    var c = Math.cos(deg * Math.PI / 180);
    var s = Math.sin(deg * Math.PI / 180);
    return mat4(
        1, 0, 0, 0,
        0, c, -s, 0,
        0, s, c, 0,
        0, 0, 0, 1
    );
}

function cam_Ry(deg) {
    var c = Math.cos(deg * Math.PI / 180);
    var s = Math.sin(deg * Math.PI / 180);
    return mat4(
        c, 0, s, 0,
        0, 1, 0, 0,
        -s, 0, c, 0,
        0, 0, 0, 1
    );
}

function cam_Rz(deg) {
    var c = Math.cos(deg * Math.PI / 180);
    var s = Math.sin(deg * Math.PI / 180);
    return mat4(
        c, -s, 0, 0,
        s, c, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    );
}

function cam_T(x, y, z) {
    return mat4(
        1, 0, 0, x,
        0, 1, 0, y,
        0, 0, 1, z,
        0, 0, 0, 1
    );
}

function cam_S(sx, sy, sz) {
    return mat4(
        sx, 0, 0, 0,
        0, sy, 0, 0,
        0, 0, sz, 0,
        0, 0, 0, 1
    );
}

function multiplyMat4(A, B) {
    var R = [];
    for (var r = 0; r < 4; r++) {
        R[r] = [];
        for (var c = 0; c < 4; c++) {
            var s = 0;
            for (var k = 0; k < 4; k++) s += A[r][k] * B[k][c];
            R[r][c] = s;
        }
    }
    return R;
}

function mat4ToColumnMajor(M) {
    return new Float32Array([
        M[0][0], M[1][0], M[2][0], M[3][0],
        M[0][1], M[1][1], M[2][1], M[3][1],
        M[0][2], M[1][2], M[2][2], M[3][2],
        M[0][3], M[1][3], M[2][3], M[3][3]
    ]);
}

function buildViewMatrix() {
    var yawRad = camera.yaw * Math.PI / 180;
    var rightX = Math.cos(yawRad);
    var rightZ = -Math.sin(yawRad);

    var eyeX = camera.x + camera.leanOffset * rightX;
    var eyeY = camera.y;
    var eyeZ = camera.z + camera.leanOffset * rightZ;

    var Ry = cam_Ry(camera.yaw);
    var Rx = cam_Rx(camera.pitch);
    var R = multiplyMat4(Ry, Rx);

    var RT = mat4(
        R[0][0], R[1][0], R[2][0], 0,
        R[0][1], R[1][1], R[2][1], 0,
        R[0][2], R[1][2], R[2][2], 0,
        0, 0, 0, 1
    );

    var Tinv = cam_T(-eyeX, -eyeY, -eyeZ);
    var view = multiplyMat4(RT, Tinv);

    if (Math.abs(camera.leanAngle) > 0.01) {
        view = multiplyMat4(cam_Rz(camera.leanAngle), view);
    }

    return view;
}

function buildProjectionMatrix() {
    var f = 1.0 / Math.tan(camera.fovy * Math.PI / 360);
    var d = camera.far - camera.near;
    return mat4(
        f / camera.aspect, 0, 0, 0,
        0, f, 0, 0,
        0, 0, -(camera.far + camera.near) / d, -2 * camera.far * camera.near / d,
        0, 0, -1, 0
    );
}

function buildNormalMatrix(M) {
    var a = [
        M[0][0], M[0][1], M[0][2],
        M[1][0], M[1][1], M[1][2],
        M[2][0], M[2][1], M[2][2]
    ];
    var det = a[0] * (a[4] * a[8] - a[5] * a[7])
            - a[1] * (a[3] * a[8] - a[5] * a[6])
            + a[2] * (a[3] * a[7] - a[4] * a[6]);
    if (Math.abs(det) < 1e-10) det = 1.0;
    return new Float32Array([
        (a[4]*a[8]-a[5]*a[7])/det, -(a[1]*a[8]-a[2]*a[7])/det,  (a[1]*a[5]-a[2]*a[4])/det,
       -(a[3]*a[8]-a[5]*a[6])/det,  (a[0]*a[8]-a[2]*a[6])/det, -(a[0]*a[5]-a[2]*a[3])/det,
        (a[3]*a[7]-a[4]*a[6])/det, -(a[0]*a[7]-a[1]*a[6])/det,  (a[0]*a[4]-a[1]*a[3])/det
    ]);
}

function identityMat4() {
    return mat4(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
}

function transformVec4(M, v) {
    return [
        M[0][0]*v[0] + M[0][1]*v[1] + M[0][2]*v[2] + M[0][3]*v[3],
        M[1][0]*v[0] + M[1][1]*v[1] + M[1][2]*v[2] + M[1][3]*v[3],
        M[2][0]*v[0] + M[2][1]*v[1] + M[2][2]*v[2] + M[2][3]*v[3],
        M[3][0]*v[0] + M[3][1]*v[1] + M[3][2]*v[2] + M[3][3]*v[3]
    ];
}

function cameraPosToWorld(cp) {
    var R = multiplyMat4(cam_Ry(camera.yaw), cam_Rx(camera.pitch));
    var wp = transformVec4(R, [cp[0], cp[1], cp[2], 1]);
    return [wp[0] + camera.x, wp[1] + camera.y, wp[2] + camera.z];
}

function cameraMove(forwardAmount, rightAmount) {
    var yawRad = camera.yaw * Math.PI / 180;
    var fx = -Math.sin(yawRad);
    var fz = -Math.cos(yawRad);
    var rx = Math.cos(yawRad);
    var rz = -Math.sin(yawRad);

    camera.x += fx * forwardAmount + rx * rightAmount;
    camera.z += fz * forwardAmount + rz * rightAmount;

    camera.x = Math.max(-camera.roomHalfW, Math.min(camera.roomHalfW, camera.x));
    camera.z = Math.max(-camera.roomHalfD, Math.min(camera.roomHalfD, camera.z));
    camera.y = Math.max(camera.minY, Math.min(camera.maxY, camera.y));
}

function cameraMouseLook(dx, dy) {
    camera.yaw -= dx * 0.15;
    camera.pitch -= dy * 0.15;
    camera.pitch = Math.max(-89, Math.min(89, camera.pitch));
    camera.yaw = camera.yaw % 360;
}

function updateLean(dt, leanLeft, leanRight) {
    var targetAngle = 0;
    var targetOffset = 0;
    if (leanLeft) { targetAngle = -15; targetOffset = -0.2; }
    else if (leanRight) { targetAngle = 15; targetOffset = 0.2; }
    var t = Math.min(1, 6 * dt);
    camera.leanAngle += (targetAngle - camera.leanAngle) * t;
    camera.leanOffset += (targetOffset - camera.leanOffset) * t;
}
