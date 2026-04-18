# CS440 Project 1 — FPS Arena

A first-person arena shooter built from scratch with **vanilla JavaScript** and **raw WebGL 1**. No game engines or 3D libraries — all rendering, physics, and audio are hand-written.

![WebGL](https://img.shields.io/badge/WebGL-1.0-red)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6-yellow)

---

## Features

- **Three shading modes** — wireframe, flat (vertex-lit), and smooth (per-pixel Blinn-Phong with specular highlights, ground bounce, and distance fog)
- **PLY model loading** — custom ASCII PLY parser for the gun viewmodel (M4A1) and humanoid target dummies
- **First-person controls** — pointer-lock mouse look, WASD movement, and Q/E leaning
- **Shooting mechanics** — raycasting against axis-aligned bounding boxes, muzzle flash, bullet tracers, ammo count, and reload
- **Procedural audio** — synthesized shoot and hit sounds via the Web Audio API
- **Arena environment** — gridded floor, colored walls, ceiling, and cover geometry (half-walls, platforms, crates) with AABB collision
- **HUD** — on-screen crosshair, score counter, hit accuracy percentage, ammo display, scanline overlay, and vignette effect
- **Dynamic arena** — expand or shrink the room bounds on the fly, and geometry rebuilds in real time

---

## Controls

### Movement

| Input | Action |
|-------|--------|
| **W / A / S / D** | Move forward / strafe left / backward / strafe right |
| **Mouse** | Look around (click the canvas first to lock the cursor) |
| **Q / E** | Lean left / right |
| **V / B** | Decrease / increase move speed |

### Combat

| Input | Action |
|-------|--------|
| **Left Click** / **Space** | Fire |
| **R** | Reload (30-round magazine, 2.5 s reload time) |

### View

| Input | Action |
|-------|--------|
| **F** | Toggle FOV between 60° and 90° |
| **T / Y** | Decrease / increase far clip distance |
| **O / P** | Decrease / increase near clip distance |
| **1 / 2 / 3** | Shading mode: wireframe / flat / smooth |
| **G / C** | Expand / shrink arena bounds |
| **Tab** | Reset camera to defaults |

---

---

## Getting Started

### Prerequisites

A modern browser with WebGL support (Chrome or Firefox recommended).

### Running

**Option 1** — Open `index.html` directly in your browser.

**Option 2** — If PLY models fail to load due to `file://` restrictions, serve the files locally:

```bash
python -m http.server 8080
```

Then open [http://localhost:8080](http://localhost:8080).

---

## Technical Details

### Rendering Pipeline

All geometry is rendered through a single shader program with three modes controlled by a `uShadingMode` uniform:

| Mode | Technique |
|------|-----------|
| **Wireframe** | `gl.LINES` draw, flat color pass-through |
| **Flat** | Per-vertex lighting computed in the vertex shader, interpolated across faces |
| **Smooth** | Per-pixel Blinn-Phong in the fragment shader — three point lights, specular with a cyan tint, subtle ground-bounce fill, and distance fog fading to near-black |

The gun viewmodel is rendered in a separate pass after clearing the depth buffer, so it always draws on top of the world geometry.

### Physics

Lightweight axis-aligned bounding box (AABB) collision only — no full rigid-body simulation. Player movement is clamped to room bounds and pushed out of terrain boxes via smallest-overlap resolution.

### Audio

All sound effects are generated at runtime using the Web Audio API with oscillator nodes — no audio files are loaded.
