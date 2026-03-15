//task 1    
function vec2(a, b) {
    if (arguments.length !== 2) {
        throw new Error("this function requires exactly 2 arguments");
    }
    return [a, b];
}

function vec3(a, b, c) {
    if (arguments.length !== 3) {
        throw new Error("this function requires exactly 3 arguments");
    }
    return [a, b, c];
}

function vec4(a, b, c, d) {
    if (arguments.length !== 4) {
        throw new Error("this function requires exactly 4 arguments");
    }
    return [a, b, c, d];
}

function mat2(a, b, c, d) {
    if (arguments.length !== 4) {
        throw new Error("this function requires exactly 4 arguments");
    }

    return [
        [a, b],  //row0
        [c, d] //row1
    ];
}

function mat3(a, b, c, d, e, f, g, h, i) {
    if (arguments.length != 9) {
        throw new Error("this function requires exactly 9 arguments");
    }
    return [
        [a, b, c],  //row0
        [d, e, f],  //row1
        [g, h, i]   //row2
    ];
}

function mat4(a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p) {
    if (arguments.length != 16) {
        throw new Error("this function requires exactly 16 arguments");
    }
    return [
        [a, b, c, d],  //row0
        [e, f, g, h],  //row1
        [i, j, k, l],  //row2
        [m, n, o, p]   //row3
    ]
};

function lerp(p, q, alpha) {
    // Check if we are dealing with scalars
    if (typeof p === 'number') {
        return (alpha) * q + ((1 - alpha) * p);
    }

    // Vector logic (for arrays)
    if (p.length !== q.length) {
        throw new Error("vectors must be of same length");
    }
    let result = [];
    for (let i = 0; i < p.length; i++) {
        result[i] = (alpha) * q[i] + ((1 - alpha) * p[i]);
    }

    return result;
}

function map_point(p, q, a, b, x) { //p,q,x are of same type and a,b are of same type
    let alpha;

    // Check if the inputs are scalars (numbers) or vectors (arrays)
    if (typeof p === 'number') {
        // for scalars, we calculate the ratio directly
        if (q - p !== 0) { //denominator should not be 0
            alpha = (x - p) / (q - p);
        } else {
            console.warn("edge Case: P and Q are the same point. returning A because in this case output range should be at the starting point");
            return a;
        }
    } else {
        // calculating the ratio (alpha) using the first component of the vectors as all of them are on the same line, if that is 0 we use the second component
        if (q[0] - p[0] != 0) { //denominator should not be 0
            alpha = (x[0] - p[0]) / (q[0] - p[0]);
        }
        else if (q[1] - p[1] != 0) {
            alpha = (x[1] - p[1]) / (q[1] - p[1]);
        }
        else {
            console.warn("edge Case: P and Q are the same point. returning A because in this case output range should be at the starting point");
            return a;
        }
    }

    //interpolating bw a and b
    return lerp(a, b, alpha);
}

function midpoint(a, b) {
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

function midpoint3d(p, q) {
    return [
        (p[0] + q[0]) / 2,
        (p[1] + q[1]) / 2,
        (p[2] + q[2]) / 2
    ];
}

// helper function for random float
function randFloat(min, max) {
    return Math.random() * (max - min) + min;
}

// helper function from random color
function randomColor() {
    return [Math.random(), Math.random(), Math.random(), 1.0];
}
// //testing
// let p1 = [0, 0]
// let q1 = [10, 10];
// let alpha1 = 0.5;

// console.log("lerp test case 1:", lerp(p1, q1, alpha1));
// //Expected Output: [5, 5]

// let p2 = [0, 0];
// let q2 = [10, 10, 10];
// let alpha2 = 0.3;

// console.log("lerp test case 2:", lerp(p2, q2, alpha2));
// // expected Output error due to dimension mismatch

// let p3 = [3, 3];
// let q3 = [3, 3];
// let x3 = [3, 3];
// let a3 = [100, 100];
// let b3 = [200, 200];

// console.log("map_point test case 1:", map_point(p3, q3, a3, b3, x3));
// //expected output: [100,100] with a warning aswell

// Scalar Testing
// let p4 = 0;
// let q4 = 100;
// let x4 = 25;
// let a4 = 500;
// let b4 = 1000;

// // Assuming your lerp handles scalars: 
// // function lerp(v0, v1, t) { return v0 * (1 - t) + v1 * t; }

// console.log("map_point scalar test case:", map_point(p4, q4, a4, b4, x4));
// Expected Output: 625