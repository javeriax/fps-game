
var gl, program;

var roomPieces = [];

var shadingMode = 2;
var modeNames = ["WIREFRAME", "FLAT", "SMOOTH"];

var keys = {};
var mouseLocked = false;

window.onload = function init() {
    var canvas = document.getElementById("gl-canvas");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    camera.aspect = canvas.width / canvas.height;

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL not available"); return; }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.02, 0.02, 0.06, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(1.0, 1.0);

    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    var pieces = buildRoomPieces();
    for (var i = 0; i < pieces.length; i++) {
        var d = pieces[i].data;

        var pb = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, pb);
        gl.bufferData(gl.ARRAY_BUFFER, d.positions, gl.STATIC_DRAW);

        var nb = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, nb);
        gl.bufferData(gl.ARRAY_BUFFER, d.normals, gl.STATIC_DRAW);

        var ib = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, d.indices, gl.STATIC_DRAW);

        var eb = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, eb);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, d.edgeIndices, gl.STATIC_DRAW);

        roomPieces.push({
            posBuffer: pb,
            normBuffer: nb,
            idxBuffer: ib,
            edgeBuffer: eb,
            triCount: d.indices.length,
            edgeCount: d.edgeIndices.length,
            colour: pieces[i].colour
        });
    }

    // moved to document — pointer lock captures at document level
    // window misses keydown events when mouse is locked
    document.addEventListener("keydown", function (e) {
        keys[e.key] = true;
        handleKeyDown(e);
        e.preventDefault();  // stops browser eating spacebar/arrows during pointer lock
    });
    document.addEventListener("keyup", function (e) {
        keys[e.key] = false;
    });

    canvas.addEventListener("click", function () {
        canvas.requestPointerLock();
    });

    document.addEventListener("pointerlockchange", function () {
        mouseLocked = (document.pointerLockElement === canvas);
        document.getElementById("clickPrompt").style.display =
            mouseLocked ? "none" : "block";
    });

    document.addEventListener("mousemove", function (e) {
        if (!mouseLocked) return;
        cameraMouseLook(e.movementX, e.movementY);
    });

    window.addEventListener("resize", function () {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        camera.aspect = canvas.width / canvas.height;
        gl.viewport(0, 0, canvas.width, canvas.height);
    });

    render();
};

function handleKeyDown(e) {
    switch (e.key) {

        // shading modes
        case '1': shadingMode = 0; updateModeDisplay(); break;
        case '2': shadingMode = 1; updateModeDisplay(); break;
        case '3': shadingMode = 2; updateModeDisplay(); break;

        // fov :60 narrow, 90 wide
        case 'f': case 'F':
            camera.fovy = (camera.fovy === 60) ? 90 : 60;
            break;

        // far clip :T decreases, Y increases
        case 't': case 'T':
            camera.far = Math.max(10, camera.far - 10);
            break;
        case 'y': case 'Y':
            camera.far = Math.min(500, camera.far + 10);
            break;

        // near clip: O decreases, P increases
        case 'o': case 'O':
            camera.near = Math.max(0.01, camera.near - 0.05);
            break;
        case 'p': case 'P':
            camera.near = Math.min(5.0, camera.near + 0.05);
            break;

        // speed: V slows down, B speeds up
        case 'v': case 'V':
            camera.speed = Math.max(0.05, camera.speed - 0.05);
            break;
        case 'b': case 'B':
            camera.speed = Math.min(1.0, camera.speed + 0.05);
            break;
        case 'r': case 'R':
            camera.yaw = 0;
            camera.pitch = 0;
            camera.roll = 0;
            camera.x = 0;
            camera.y = 1.6;
            camera.z = 4;
            camera.fovy = 60;
            camera.near = 0.1;
            camera.far = 200;
            camera.speed = 0.25;
            break;
    }
}

function updateModeDisplay() {
    document.getElementById("modeDisplay").textContent =
        "MODE: " + modeNames[shadingMode];
}

//movement polled every frame
function processMovement() {
    var spd = camera.speed;
    var fwd = 0;
    var right = 0;

    if (keys['w'] || keys['W']) fwd += spd;
    if (keys['s'] || keys['S']) fwd -= spd;
    if (keys['a'] || keys['A']) right -= spd;
    if (keys['d'] || keys['D']) right += spd;

    if (fwd !== 0 || right !== 0) cameraMove(fwd, right);

    // pitch up/down via keyboard
    if (keys['i'] || keys['I']) {
        camera.pitch -= 1;
        camera.pitch = Math.max(-89, camera.pitch);
    }
    if (keys['n'] || keys['N']) {
        camera.pitch += 1;
        camera.pitch = Math.min(89, camera.pitch);
    }

    // yaw left/right via keyboard
    if (keys['h'] || keys['H']) camera.yaw -= 1;
    if (keys['m'] || keys['M']) camera.yaw += 1;

    // roll
    if (keys['q'] || keys['Q']) camera.roll -= 1;
    if (keys['e'] || keys['E']) camera.roll += 1;
}

function drawObject(posBuffer, normBuffer, idxBuffer, edgeBuffer,
    triCount, edgeCount, modelMat, colour) {

    var uProj = gl.getUniformLocation(program, "uProjection");
    var uView = gl.getUniformLocation(program, "uView");
    var uModel = gl.getUniformLocation(program, "uModel");
    var uNorm = gl.getUniformLocation(program, "uNormalMatrix");
    var uColor = gl.getUniformLocation(program, "uColor");
    var uShade = gl.getUniformLocation(program, "uShadingMode");
    var uLight = gl.getUniformLocation(program, "uLightPos");
    var uEye = gl.getUniformLocation(program, "uViewPos");

    var proj = buildProjectionMatrix();
    var view = buildViewMatrix();

    gl.uniformMatrix4fv(uProj, false, mat4ToColumnMajor(proj));
    gl.uniformMatrix4fv(uView, false, mat4ToColumnMajor(view));
    gl.uniformMatrix4fv(uModel, false, mat4ToColumnMajor(modelMat));
    gl.uniformMatrix3fv(uNorm, false, buildNormalMatrix(modelMat));

    gl.uniform3fv(uLight, new Float32Array([0.0, 6.0, 0.0]));
    gl.uniform3fv(uEye, new Float32Array([camera.x, camera.y, camera.z]));
    gl.uniform3fv(uColor, new Float32Array(colour));
    gl.uniform1i(uShade, shadingMode);

    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    var aPos = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aPos);

    gl.bindBuffer(gl.ARRAY_BUFFER, normBuffer);
    var aNorm = gl.getAttribLocation(program, "vNormal");
    gl.vertexAttribPointer(aNorm, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aNorm);

    if (shadingMode === 0) {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, edgeBuffer);
        gl.drawElements(gl.LINES, edgeCount, gl.UNSIGNED_SHORT, 0);
    } else {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuffer);
        gl.drawElements(gl.TRIANGLES, triCount, gl.UNSIGNED_SHORT, 0);
    }
}

function render() {
    requestAnimFrame(render);
    processMovement();

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    for (var i = 0; i < roomPieces.length; i++) {
        var rp = roomPieces[i];
        drawObject(
            rp.posBuffer, rp.normBuffer,
            rp.idxBuffer, rp.edgeBuffer,
            rp.triCount, rp.edgeCount,
            identityMat4(),
            rp.colour
        );
    }
}