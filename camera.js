// camera state — position and orientation in world space
var camera = {
    x: 0, y: 1.6, z: 4,       // starting position, y=1.6 is eye height

    yaw: 0,    // rotation around Y axis — turning left/right like shaking your head "no"
    pitch: 0,    // rotation around X axis — looking up/down like nodding "yes"
    roll: 0,    // rotation around Z axis — tilting head sideways

    speed: 0.25,   // units moved per frame when WASD held
    fovy: 60,     // field of view in degrees — how wide your vision is (60=narrow, 90=wide)
    near: 0.1,    // near clip plane — geometry closer than this gets cut off
    far: 200,    // far clip plane — geometry further than this gets cut off

    aspect: 1,      // canvas width/height ratio, updated on resize

    // room boundary clamps — camera stays inside these
    roomHalfW: 39,
    roomHalfD: 39,
    minY: 0.5,
    maxY: 9.5
};

// ── rotation matrix helpers ────────────────────────────────
// each builds a 4x4 rotation matrix for one axis, same pattern as homework

function cam_Rx(deg) {
    var c = Math.cos(deg * Math.PI / 180);
    var s = Math.sin(deg * Math.PI / 180);
    return mat4(
        1, 0, 0, 0,
        0, c, -s, 0,   // rotates Y and Z components
        0, s, c, 0,
        0, 0, 0, 1
    );
}

function cam_Ry(deg) {
    var c = Math.cos(deg * Math.PI / 180);
    var s = Math.sin(deg * Math.PI / 180);
    return mat4(
        c, 0, s, 0,   // rotates X and Z components
        0, 1, 0, 0,
        -s, 0, c, 0,
        0, 0, 0, 1
    );
}

function cam_Rz(deg) {
    var c = Math.cos(deg * Math.PI / 180);
    var s = Math.sin(deg * Math.PI / 180);
    return mat4(
        c, -s, 0, 0,   // rotates X and Y components
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

// multiply two row-major mat4s — same as homework multiplyMat4
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

// converts row-major mat4 to column-major Float32Array for WebGL uniforms
function mat4ToColumnMajor(M) {
    return new Float32Array([
        M[0][0], M[1][0], M[2][0], M[3][0],
        M[0][1], M[1][1], M[2][1], M[3][1],
        M[0][2], M[1][2], M[2][2], M[3][2],
        M[0][3], M[1][3], M[2][3], M[3][3]
    ]);
}

// ── view matrix ───────────────────────────────────────────
// view matrix transforms world space into camera space
// built as: transpose(R) * T(-eye)
// transpose(R) is the inverse rotation since R is orthogonal
function buildViewMatrix() {
    var Ry = cam_Ry(camera.yaw);
    var Rx = cam_Rx(camera.pitch);
    var Rz = cam_Rz(camera.roll);

    // compose full rotation: yaw applied last so it controls left/right turn
    var R = multiplyMat4(Ry, multiplyMat4(Rx, Rz));

    // transpose upper 3x3 to get inverse rotation
    var RT = mat4(
        R[0][0], R[1][0], R[2][0], 0,
        R[0][1], R[1][1], R[2][1], 0,
        R[0][2], R[1][2], R[2][2], 0,
        0, 0, 0, 1
    );

    // translate by negative eye position
    var Tinv = cam_T(-camera.x, -camera.y, -camera.z);
    return multiplyMat4(RT, Tinv);
}

// ── perspective projection matrix ─────────────────────────
// maps 3D world into clip space based on fov, aspect, near, far
// f = cot(fovy/2) — controls how much vertical space maps to screen height
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

// ── normal matrix ─────────────────────────────────────────
// used to correctly transform normals when model has non-uniform scale or shear
// = transpose(inverse(upper 3x3 of modelMatrix))
// same function as homework normalMatrix3x3
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
        (a[4] * a[8] - a[5] * a[7]) / det, -(a[1] * a[8] - a[2] * a[7]) / det, (a[1] * a[5] - a[2] * a[4]) / det,
        -(a[3] * a[8] - a[5] * a[6]) / det, (a[0] * a[8] - a[2] * a[6]) / det, -(a[0] * a[5] - a[2] * a[3]) / det,
        (a[3] * a[7] - a[4] * a[6]) / det, -(a[0] * a[7] - a[1] * a[6]) / det, (a[0] * a[4] - a[1] * a[3]) / det
    ]);
}

// returns a 4x4 identity matrix
function identityMat4() {
    return mat4(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
}

// ── movement ──────────────────────────────────────────────
// moves camera in XZ plane relative to current yaw
// so W always goes where you are looking regardless of mouse position
function cameraMove(forwardAmount, rightAmount) {
    var yawRad = camera.yaw * Math.PI / 180;

    // forward vector projected onto XZ plane — points where camera faces
    var fx = -Math.sin(yawRad);
    var fz = -Math.cos(yawRad);

    // right vector — 90 degrees clockwise from forward in XZ
    var rx = Math.cos(yawRad);
    var rz = -Math.sin(yawRad);

    camera.x += fx * forwardAmount + rx * rightAmount;
    camera.z += fz * forwardAmount + rz * rightAmount;

    // clamp to room boundaries so camera cant walk through walls
    camera.x = Math.max(-camera.roomHalfW, Math.min(camera.roomHalfW, camera.x));
    camera.z = Math.max(-camera.roomHalfD, Math.min(camera.roomHalfD, camera.z));
    camera.y = Math.max(camera.minY, Math.min(camera.maxY, camera.y));
}

// updates yaw and pitch from raw mouse delta values
// movementX/Y come from the pointerlocked mousemove event
function cameraMouseLook(dx, dy) {
    if (dx === 0 && dy === 0) return;
    camera.yaw += dx * 0.15;
    camera.pitch -= dy * 0.15;  // was +=, changed to -= to fix inversion
    camera.pitch = Math.max(-89, Math.min(89, camera.pitch));
    camera.yaw = camera.yaw % 360;
}