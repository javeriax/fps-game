CTRL+SHIFT+V TO VIEW THIS FILE!

# CS440 Project 1 — FPS Arena
WebGL first-person shooter. Open `index.html` in Chrome or Firefox.

---

## Movement

| Key | Action |
|-----|--------|
| W / S | Move forward / backward |
| A / D | Strafe left / right |
| Mouse | Look around (click canvas first to lock mouse) |
| H / M | Yaw — turn left / right via keyboard |
| I / N | Pitch — look up / down via keyboard |
| Q / E | Roll — tilt the camera sideways |
| v / B | Speed down / up |

Movement direction always matches where you're looking. WASD and mouse work simultaneously.

---

## View Controls

| Key | Action |
|-----|--------|
| F | Toggle FOV between 60° (narrow/zoomed) and 90° (wide, standard FPS) |
| K / L | Far clip — decrease / increase how far you can see |
| O / P | Near clip — decrease / increase minimum render distance |

**FOV** — F key switches between 60° and 90°. 60 feels zoomed in, 90 feels wider and more natural for an FPS.

**Far clip** — K cuts render distance (far walls disappear), L brings them back. Default is 200 which shows the whole room.

**Near clip** — walk up to a wall and press P. The wall starts getting sliced off as the near plane pushes out. Press O to bring it back. 

---

## Shading Modes

| Key | Mode |
|-----|------|
| 1 | Wireframe: edges only, see through everything |
| 2 | Flat: one colour per face, hard faceted look |
| 3 | Smooth: Blinn-Phong per-pixel lighting with specular highlights (default) |

Current mode shown top-right corner of the screen.

---

## Shooting

| Key | Action |
|-----|--------|
| Space / Left click | Fire |

Aim with the crosshair. Hit enemies flash white and respawn somewhere else in the room. Score shown top-left.

---

## Running the Project

Just open `index.html`. If PLY models fail to load:
```
python -m http.server 8080
```
Then open `http://localhost:8080` in your browser. Tested on Chrome and Firefox.