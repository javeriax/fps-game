// ─── Camera ───────────────────────────────────────────────
// Stores position + three Euler angles and builds the view
// matrix the same way the homework builds model matrices —
// manually composed mat4 multiplications.

var camera = {
    // world position
    x: 0, y: 1.6, z: 4,

    // orientation angles (degrees)
    yaw: 0,   // left / right  (Y axis)
    pitch: 0,   // up  / down    (X axis)
    roll: 0,   // tilt          (Z axis)

    // tunables
    speed: 0.08,
    fovy: 60,
    near: 0.1,
    far: 80,
    aspect: 1,

    // room size (half-extents) — camera clamped inside these
    roomHalfW: 19,
    roomHalfD: 19,
    minY: 0.5,
    maxY: 7.5
};

// ── helpers (same style as homework) ──────────────────────

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

// multiply two row-major mat4s (same multiplyMat4 from homework)
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

// row-major → column-major flat Float32Array for gl.uniformMatrix4fv
function mat4ToColumnMajor(M) {
    return new Float32Array([
        M[0][0], M[1][0], M[2][0], M[3][0],
        M[0][1], M[1][1], M[2][1], M[3][1],
        M[0][2], M[1][2], M[2][2], M[3][2],
        M[0][3], M[1][3], M[2][3], M[3][3]
    ]);
}

// ── View matrix ───────────────────────────────────────────
// View = inv(T(eye)) * inv(R)
// Since rotation matrices are orthogonal, inv(R) = R^T.
// We compose Ry(yaw) * Rx(pitch) * Rz(roll) then transpose
// the upper-3x3 to get the inverse rotation part.
function buildViewMatrix() {
    var Ry = cam_Ry(camera.yaw);
    var Rx = cam_Rx(camera.pitch);
    var Rz = cam_Rz(camera.roll);

    // camera orientation: apply roll first, then pitch, then yaw
    var R = multiplyMat4(Ry, multiplyMat4(Rx, Rz));

    // view = transpose(R) * T(-eye)
    // transpose upper-3x3 in place
    var RT = mat4(
        R[0][0], R[1][0], R[2][0], 0,
        R[0][1], R[1][1], R[2][1], 0,
        R[0][2], R[1][2], R[2][2], 0,
        0, 0, 0, 1
    );

    var Tinv = cam_T(-camera.x, -camera.y, -camera.z);
    return multiplyMat4(RT, Tinv);
}

// ── Perspective matrix ────────────────────────────────────
function buildProjectionMatrix() {
    var fovy = camera.fovy;
    var aspect = camera.aspect;
    var near = camera.near;
    var far = camera.far;

    var f = 1.0 / Math.tan(fovy * Math.PI / 360); // cot(fovy/2)
    var d = far - near;

    return mat4(
        f / aspect, 0, 0, 0,
        0, f, 0, 0,
        0, 0, -(far + near) / d, -2 * far * near / d,
        0, 0, -1, 0
    );
}

// ── Normal matrix (upper-3x3 transpose-inverse of model) ──
// Identical to the homework normalMatrix3x3 function.
function buildNormalMatrix(modelMat) {
    var m = modelMat;
    var a = [
        m[0][0], m[0][1], m[0][2],
        m[1][0], m[1][1], m[1][2],
        m[2][0], m[2][1], m[2][2]
    ];
    var det = a[0] * (a[4] * a[8] - a[5] * a[7])
        - a[1] * (a[3] * a[8] - a[5] * a[6])
        + a[2] * (a[3] * a[7] - a[4] * a[6]);
    if (Math.abs(det) < 1e-10) det = 1.0;
    // cofactor matrix (already transposed by layout)
    return new Float32Array([
        (a[4] * a[8] - a[5] * a[7]) / det, -(a[1] * a[8] - a[2] * a[7]) / det, (a[1] * a[5] - a[2] * a[4]) / det,
        -(a[3] * a[8] - a[5] * a[6]) / det, (a[0] * a[8] - a[2] * a[6]) / det, -(a[0] * a[5] - a[2] * a[3]) / det,
        (a[3] * a[7] - a[4] * a[6]) / det, -(a[0] * a[7] - a[1] * a[6]) / det, (a[0] * a[4] - a[1] * a[3]) / det
    ]);
}

// ── Identity mat4 helper ──────────────────────────────────
function identityMat4() {
    return mat4(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
}

// ── Movement ──────────────────────────────────────────────
// Forward/strafe direction in XZ plane based on yaw only
// (so you don't fly when looking up/down — standard FPS behaviour)
function cameraMove(forwardAmount, rightAmount) {
    var yawRad = camera.yaw * Math.PI / 180;

    // forward vector
    var fx = -Math.sin(yawRad);
    var fz = -Math.cos(yawRad);

    // right vector — 90 degrees clockwise from forward
    var rx = Math.cos(yawRad);
    var rz = -Math.sin(yawRad);

    camera.x += fx * forwardAmount + rx * rightAmount;
    camera.z += fz * forwardAmount + rz * rightAmount;

    camera.x = Math.max(-camera.roomHalfW, Math.min(camera.roomHalfW, camera.x));
    camera.z = Math.max(-camera.roomHalfD, Math.min(camera.roomHalfD, camera.z));
    camera.y = Math.max(camera.minY, Math.min(camera.maxY, camera.y));
}
function cameraMouseLook(dx, dy) {
    camera.yaw += dx * 0.15;
    camera.pitch += dy * 0.15;
    camera.pitch = Math.max(-89, Math.min(89, camera.pitch));
    // yaw wraps around so it never overflows
    camera.yaw = camera.yaw % 360;
}