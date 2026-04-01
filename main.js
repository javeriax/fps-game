var gl, program;
var uLocs = {};
var aLocs = {};

var roomBuffers = [];
var terrainPieceData = [];
var unitBoxBuffers = null;
var dummyGLBuffers = null;
var gunGLBuffers = null;

var shadingMode = 2;
var modeNames = ["WIREFRAME", "FLAT", "SMOOTH"];
var sceneObjects = [];
var keys = {};
var mouseLocked = false;
var score = 0;
var shotsFired = 0;
var hits = 0;

var score = 0;
var ammo = 30;
var maxAmmo = 30;
var reloading = false;
var reloadTimer = 0;

var flashFrames = 0;
var flashBuffer = null;
var flashVertCount = 0;

var tracerTimer = 0;
var tracerBuffer = null;

var lastTime = 0;
var gameTime = 0;
var isMoving = false;
var lastFireTime = 0;
var audioCtx = null;

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

    // Manual shader compile with detailed error logging
    var vertSrc = document.getElementById("vertex-shader").text;
    var fragSrc = document.getElementById("fragment-shader").text;

    var vertShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertShader, vertSrc);
    gl.compileShader(vertShader);
    if (!gl.getShaderParameter(vertShader, gl.COMPILE_STATUS)) {
        console.error("VERTEX SHADER ERROR:\n" + gl.getShaderInfoLog(vertShader));
        return;
    }

    var fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragShader, fragSrc);
    gl.compileShader(fragShader);
    if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) {
        console.error("FRAGMENT SHADER ERROR:\n" + gl.getShaderInfoLog(fragShader));
        return;
    }

    program = gl.createProgram();
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("LINK ERROR:\n" + gl.getProgramInfoLog(program));
        return;
    }
    gl.useProgram(program);

    uLocs.projection  = gl.getUniformLocation(program, "uProjection");
    uLocs.view         = gl.getUniformLocation(program, "uView");
    uLocs.model        = gl.getUniformLocation(program, "uModel");
    uLocs.normalMatrix = gl.getUniformLocation(program, "uNormalMatrix");
    uLocs.color        = gl.getUniformLocation(program, "uColor");
    uLocs.lightPos     = gl.getUniformLocation(program, "uLightPos");
    uLocs.viewPos      = gl.getUniformLocation(program, "uViewPos");
    uLocs.shadingMode  = gl.getUniformLocation(program, "uShadingMode");

    aLocs.position = gl.getAttribLocation(program, "vPosition");
    aLocs.normal   = gl.getAttribLocation(program, "vNormal");

    var pieces = buildRoomPieces();
    for (var i = 0; i < pieces.length; i++) {
        roomBuffers.push(uploadMesh(pieces[i].data, pieces[i].colour));
    }

    var boxMesh = buildBoxMesh();
    unitBoxBuffers = uploadMeshData(boxMesh);
    terrainPieceData = buildTerrainPieces();

    loadPLY("FinalBaseMesh.ply", function(mesh) {
        dummyMesh = mesh;
        dummyMeshBounds = mesh.bounds;
        dummyGLBuffers = uploadMeshData(mesh);
        initDummies();
        console.log("Dummy mesh loaded:", mesh.bounds);
    });

    loadPLY("m4a1.ply", function(mesh) {
        gunMesh = mesh;
        var dx = mesh.bounds.maxX - mesh.bounds.minX;
        var dy = mesh.bounds.maxY - mesh.bounds.minY;
        var dz = mesh.bounds.maxZ - mesh.bounds.minZ;
        var maxDim = Math.max(dx, dy, dz);
        gunNormScale = 0.5 / maxDim;
        gunCenter = [
            (mesh.bounds.minX + mesh.bounds.maxX) / 2,
            (mesh.bounds.minY + mesh.bounds.maxY) / 2,
            (mesh.bounds.minZ + mesh.bounds.maxZ) / 2
        ];
        gunGLBuffers = uploadMeshData(mesh);
        console.log("Gun mesh loaded:", mesh.bounds, "scale:", gunNormScale);
    });

    flashBuffer = gl.createBuffer();
    tracerBuffer = gl.createBuffer();

    setupInput(canvas);

    lastTime = performance.now() / 1000;

    updateScoreDisplay();
    updateAccuracyDisplay();
    updateAmmoDisplay();

    render();
};

function uploadMeshData(data) {
    var pb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pb);
    gl.bufferData(gl.ARRAY_BUFFER, data.positions, gl.STATIC_DRAW);

    var nb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nb);
    gl.bufferData(gl.ARRAY_BUFFER, data.normals, gl.STATIC_DRAW);

    var ib = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data.indices, gl.STATIC_DRAW);

    var eb = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, eb);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data.edgeIndices, gl.STATIC_DRAW);

    return {
        posBuffer: pb, normBuffer: nb,
        idxBuffer: ib, edgeBuffer: eb,
        triCount: data.indices.length,
        edgeCount: data.edgeIndices.length
    };
}

function uploadMesh(data, colour) {
    var bufs = uploadMeshData(data);
    bufs.colour = colour;
    return bufs;
}

function loadPLY(filename, callback) {
    fetch(filename).then(function(resp) {
        if (!resp.ok) throw new Error("Failed to load " + filename + ": " + resp.status);
        return resp.text();
    }).then(function(text) {
        callback(parsePLY(text));
    }).catch(function(err) {
        console.error("PLY load error for " + filename + ":", err);
    });
}

function drawMesh(buffers, modelMat, colour, mode) {
    var drawColor = mode === 0 ? [0.0, 1.0, 0.9] : colour;
    gl.uniformMatrix4fv(uLocs.model, false, mat4ToColumnMajor(modelMat));
    gl.uniformMatrix3fv(uLocs.normalMatrix, false, buildNormalMatrix(modelMat));
    gl.uniform3fv(uLocs.color, new Float32Array(drawColor));
    gl.uniform1i(uLocs.shadingMode, mode);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.posBuffer);
    gl.vertexAttribPointer(aLocs.position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aLocs.position);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normBuffer);
    gl.vertexAttribPointer(aLocs.normal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aLocs.normal);

    if (mode === 0) {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.edgeBuffer);
        gl.drawElements(gl.LINES, buffers.edgeCount, gl.UNSIGNED_SHORT, 0);
    } else {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.idxBuffer);
        gl.drawElements(gl.TRIANGLES, buffers.triCount, gl.UNSIGNED_SHORT, 0);
    }
}

function setupInput(canvas) {
    document.addEventListener("keydown", function(e) {
        keys[e.key.toLowerCase()] = true;
        handleKeyDown(e);
        if (e.key !== 'F11' && e.key !== 'F12') e.preventDefault();
    });
    document.addEventListener("keyup", function(e) {
        keys[e.key.toLowerCase()] = false;
    });

    canvas.addEventListener("mousedown", function(e) {
        ensureAudio();

        if (mouseLocked) {
            if (e.button === 0) fire();
        } else {
            canvas.requestPointerLock();
        }
    });

    document.addEventListener("pointerlockchange", function() {
        mouseLocked = (document.pointerLockElement === canvas);
        document.getElementById("clickPrompt").style.display = mouseLocked ? "none" : "block";
    });

    document.addEventListener("mousemove", function(e) {
        if (!mouseLocked) return;
        cameraMouseLook(e.movementX, e.movementY);
    });

    window.addEventListener("resize", function() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        camera.aspect = canvas.width / canvas.height;
        gl.viewport(0, 0, canvas.width, canvas.height);
    });
}

// builds and uploads room geometry to gpu
// called on init and whenever room size changes
function uploadRoom(W, D) {
    // delete old buffers from gpu if they exist
    for (var i = 0; i < roomPieces.length; i++) {
        gl.deleteBuffer(roomPieces[i].posBuffer);
        gl.deleteBuffer(roomPieces[i].normBuffer);
        gl.deleteBuffer(roomPieces[i].idxBuffer);
        gl.deleteBuffer(roomPieces[i].edgeBuffer);
    }
    roomPieces = [];

    var pieces = buildRoomPieces(W, D);
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
}

function handleKeyDown(e) {
    switch (e.key) {
        case '1': shadingMode = 0; updateModeDisplay(); break;
        case '2': shadingMode = 1; updateModeDisplay(); break;
        case '3': shadingMode = 2; updateModeDisplay(); break;
        case 'f': case 'F':
            camera.fovy = (camera.fovy === 60) ? 90 : 60; break;
        case 't': case 'T':
            camera.far = Math.max(10, camera.far - 10); break;
        case 'y': case 'Y':
            camera.far = Math.min(500, camera.far + 10); break;
        case 'o': case 'O':
            camera.near = Math.max(0.01, camera.near - 0.05); break;
        case 'p': case 'P':
            camera.near = Math.min(5.0, camera.near + 0.05); break;
        case 'v': case 'V':
            camera.speed = Math.max(0.05, camera.speed - 0.05); break;
        case 'b': case 'B':
            camera.speed = Math.min(1.0, camera.speed + 0.05);
            break;

        // expand room boundary — walls and floor grow outward
        case 'g': case 'G':
            camera.roomHalfW = Math.min(200, camera.roomHalfW + 5);
            camera.roomHalfD = Math.min(200, camera.roomHalfD + 5);
            uploadRoom(camera.roomHalfW, camera.roomHalfD);
            break;

        // shrink room boundary i.e., pull bounds back in
        case 'c': case 'C':
            camera.roomHalfW = Math.max(10, camera.roomHalfW - 5);
            camera.roomHalfD = Math.max(10, camera.roomHalfD - 5);
            uploadRoom(camera.roomHalfW, camera.roomHalfD);
            break;

        case 'r': case 'R':
            if (!reloading && ammo < maxAmmo) startReload();
            break;
        case 'Tab':
            camera.yaw = 0; camera.pitch = 0;
            camera.leanAngle = 0; camera.leanOffset = 0;
            camera.x = 0; camera.y = 1.65; camera.z = 4;
            camera.fovy = 60; camera.near = 0.1; camera.far = 200;
            camera.speed = 0.25;
            camera.roomHalfW = 40;
            camera.roomHalfD = 40;
            uploadRoom(camera.roomHalfW, camera.roomHalfD);
            break;
        case ' ':
            fire(); break;
    }
}

function updateModeDisplay() {
    document.getElementById("modeDisplay").textContent = "MODE: " + modeNames[shadingMode];
}

function processMovement(dt) {
    var spd = camera.speed;
    var fwd = 0, right = 0;
    if (keys['w']) fwd += spd;
    if (keys['s']) fwd -= spd;
    if (keys['a']) right -= spd;
    if (keys['d']) right += spd;

    isMoving = (fwd !== 0 || right !== 0);
    if (isMoving) cameraMove(fwd, right);

    updateLean(dt, !!keys['q'], !!keys['e']);
    resolveTerrainCollision();

    camera.x = Math.max(-camera.roomHalfW, Math.min(camera.roomHalfW, camera.x));
    camera.z = Math.max(-camera.roomHalfD, Math.min(camera.roomHalfD, camera.z));
}

function fire() {
    if (reloading) return;
    if (ammo <= 0) { startReload(); return; }
    var now = performance.now();
    if (now - lastFireTime < 150) return;
    lastFireTime = now;
    shotsFired++;
    updateAccuracyDisplay();

    ammo--;
    triggerGunKick();
    playShootSound();

    flashFrames = 2;
    generateFlashLines();

    var yawRad = camera.yaw * Math.PI / 180;
    var pitchRad = camera.pitch * Math.PI / 180;
    var dir = [
        -Math.sin(yawRad) * Math.cos(pitchRad),
         Math.sin(pitchRad),
        -Math.cos(yawRad) * Math.cos(pitchRad)
    ];
    var origin = [camera.x, camera.y, camera.z];

    var closestT = Infinity;
    var hitIndex = -1;
    for (var i = 0; i < dummies.length; i++) {
        if (!dummies[i].aabbActive || !dummies[i].worldAABB) continue;
        var t = rayVsAABB(origin, dir, dummies[i].worldAABB);
        if (t !== null && t < closestT) {
            closestT = t;
            hitIndex = i;
        }
    }

    var muzzleWorld = getMuzzleWorldPos();
    if (hitIndex >= 0) {
        score++;
        hits++;
        updateAccuracyDisplay();
        playHitSound();
        dummies[hitIndex].color = [1.0, 1.0, 1.0];
        dummies[hitIndex].hitTimer = 0.2;
        dummies[hitIndex].fallState = "falling";
        dummies[hitIndex].aabbActive = false;
        dummies[hitIndex].fallAngle = 0;
        var hitPos = [
            origin[0] + dir[0] * closestT,
            origin[1] + dir[1] * closestT,
            origin[2] + dir[2] * closestT
        ];
        spawnTracer(muzzleWorld, hitPos);
        updateScoreDisplay();
    } else {
        spawnTracer(muzzleWorld, [
            origin[0] + dir[0] * 40,
            origin[1] + dir[1] * 40,
            origin[2] + dir[2] * 40
        ]);
    }

    updateAmmoDisplay();
    if (ammo <= 0) startReload();
}

function getMuzzleWorldPos() {
    var cp = getGunMuzzleCameraPos();
    return cameraPosToWorld(cp);
}

function generateFlashLines() {
    var muzzle = getGunMuzzleCameraPos();
    var verts = [];
    for (var i = 0; i < 5; i++) {
        var angle = (i / 5) * Math.PI * 2;
        var r = 0.03 + Math.random() * 0.02;
        verts.push(muzzle[0], muzzle[1], muzzle[2]);
        verts.push(
            muzzle[0] + Math.cos(angle) * r,
            muzzle[1] + Math.sin(angle) * r,
            muzzle[2] - (0.15 + Math.random() * 0.05)
        );
    }
    flashVertCount = verts.length / 3;
    gl.bindBuffer(gl.ARRAY_BUFFER, flashBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.DYNAMIC_DRAW);
}

function spawnTracer(start, end) {
    tracerTimer = 0.12;
    gl.bindBuffer(gl.ARRAY_BUFFER, tracerBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        start[0], start[1], start[2], end[0], end[1], end[2]
    ]), gl.DYNAMIC_DRAW);
}

function startReload() {
    reloading = true;
    reloadTimer = 2.5;
    updateAmmoDisplay();
}

function updateAmmoDisplay() {
    var el = document.getElementById('ammo');
    if (reloading) {
        el.textContent = 'RELOADING...';
        el.style.color = '#ff3333';
    } else {
        el.textContent = ammo + ' / ' + maxAmmo;
        el.style.color = 'white';
    }
}

function updateScoreDisplay() {
    document.getElementById('score').textContent = 'SCORE: ' + score;
}

function updateAccuracyDisplay() {
    var acc = 0;
    if (shotsFired > 0) {
        acc = (hits / shotsFired) * 100;
    }
    document.getElementById('accuracy').textContent =
        'ACCURACY: ' + acc.toFixed(0) + '%';
}

function ensureAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (audioCtx.state === "suspended") {
        audioCtx.resume();
    }
}

function playShootSound() {
    ensureAudio();

    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(220, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(90, audioCtx.currentTime + 0.09);

    gain.gain.setValueAtTime(0.9, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.09);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.09);
}

function playHitSound() {
    ensureAudio();

    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(500, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1100, audioCtx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.14, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.12);
}

function render() {
    requestAnimFrame(render);

    var now = performance.now() / 1000;
    var dt = Math.min(now - lastTime, 0.1);
    lastTime = now;
    gameTime += dt;

    processMovement(dt);
    updateDummies(dt);
    updateGunAnimation(dt, isMoving, gameTime);

    if (reloading) {
        reloadTimer -= dt;
        if (reloadTimer <= 0) {
            reloading = false;
            ammo = maxAmmo;
            updateAmmoDisplay();
        }
    }

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    var proj = buildProjectionMatrix();
    var view = buildViewMatrix();

    gl.uniformMatrix4fv(uLocs.projection, false, mat4ToColumnMajor(proj));
    gl.uniformMatrix4fv(uLocs.view, false, mat4ToColumnMajor(view));
    gl.uniform3fv(uLocs.lightPos, new Float32Array([0.0, 6.0, 0.0]));
    gl.uniform3fv(uLocs.viewPos, new Float32Array([camera.x, camera.y, camera.z]));

    for (var i = 0; i < roomBuffers.length; i++) {
        drawMesh(roomBuffers[i], identityMat4(), roomBuffers[i].colour, shadingMode);
    }

    if (unitBoxBuffers) {
        for (var i = 0; i < terrainPieceData.length; i++) {
            drawMesh(unitBoxBuffers, terrainPieceData[i].modelMat, terrainPieceData[i].colour, shadingMode);
        }
    }

    if (dummyGLBuffers && dummies.length > 0) {
        for (var i = 0; i < dummies.length; i++) {
            drawMesh(dummyGLBuffers, buildDummyModelMatrix(dummies[i]), dummies[i].color, shadingMode);
        }
    }

    // bullet trace (world space)
    if (tracerTimer > 0) {
        tracerTimer -= dt;
        var brightness = Math.max(0, tracerTimer / 0.12);
        gl.uniform1i(uLocs.shadingMode, 0);
        gl.uniform3fv(uLocs.color, new Float32Array([1.0 * brightness, 0.95 * brightness, 0.6 * brightness]));
        gl.uniformMatrix4fv(uLocs.model, false, mat4ToColumnMajor(identityMat4()));
        gl.uniformMatrix3fv(uLocs.normalMatrix, false, buildNormalMatrix(identityMat4()));

        gl.bindBuffer(gl.ARRAY_BUFFER, tracerBuffer);
        gl.vertexAttribPointer(aLocs.position, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(aLocs.position);
        gl.disableVertexAttribArray(aLocs.normal);
        gl.vertexAttrib3f(aLocs.normal, 0, 1, 0);
        gl.drawArrays(gl.LINES, 0, 2);
        gl.enableVertexAttribArray(aLocs.normal);
    }

    // gun pass — always mode 2, drawn on top
    if (gunGLBuffers) {
        gl.clear(gl.DEPTH_BUFFER_BIT);

        gl.uniformMatrix4fv(uLocs.view, false, mat4ToColumnMajor(identityMat4()));
        gl.uniformMatrix4fv(uLocs.projection, false, mat4ToColumnMajor(proj));
        gl.uniform3fv(uLocs.lightPos, new Float32Array([0.0, 1.0, -1.0]));
        gl.uniform3fv(uLocs.viewPos, new Float32Array([0, 0, 0]));

        drawMesh(gunGLBuffers, buildGunModelMatrix(), [0.25, 0.25, 0.27], 2);

        // muzzle flash (camera space)
        if (flashFrames > 0) {
            flashFrames--;
            gl.uniform1i(uLocs.shadingMode, 0);
            gl.uniform3fv(uLocs.color, new Float32Array([1.0, 0.95, 0.6]));
            gl.uniformMatrix4fv(uLocs.model, false, mat4ToColumnMajor(identityMat4()));
            gl.uniformMatrix3fv(uLocs.normalMatrix, false, buildNormalMatrix(identityMat4()));

            gl.bindBuffer(gl.ARRAY_BUFFER, flashBuffer);
            gl.vertexAttribPointer(aLocs.position, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(aLocs.position);
            gl.disableVertexAttribArray(aLocs.normal);
            gl.vertexAttrib3f(aLocs.normal, 0, 1, 0);
            gl.drawArrays(gl.LINES, 0, flashVertCount);
            gl.enableVertexAttribArray(aLocs.normal);
        }
    }
}
