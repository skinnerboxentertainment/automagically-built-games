# Genre Pattern Authoring Guide

This document explains how genre patterns work, why the default values are
what they are, and how to add a new genre pattern for `/auto-build`.

---

## How Genre Patterns Work

Genre patterns live in `.opencode/templates/genre-patterns/[name].md`.

When `/auto-build` runs with an inline spec (or with a document that doesn't
specify a field), it reads the matched genre pattern to fill in defaults.
The pattern provides:

- **Player parameters** — movement, physics, health, visual
- **World parameters** — tile size, level dimensions, colors
- **Object specs** — enemies, collectibles, obstacles, their behaviors
- **Camera behavior** — follow style, bounds, deadzone
- **Audio cues** — what sounds play for which actions
- **Test strategy** — what to unit test, integrate, browser test
- **Generated files** — what source files to create
- **Data file schema** — what goes in level JSON and gameplay config JSON

---

## Default Value Rationale

Values in patterns are not arbitrary. They relate to each other.

### Tile size: 32px

- Power-of-two textures (efficient for GPU)
- 16px is too small for detail, 64px is too large for screens
- 800px viewport ÷ 32px = 25 visible tiles — enough for gameplay

### Gravity: 980 px/s²

- Roughly matches real-world gravity scaled to pixels (9.8 m/s × 100)
- With 32px tiles: a jump of -500 px/s lasts ~1 second, clearing ~2 tiles
- Formula: `jump_height = vy² / (2 × gravity) = 500² / (2 × 980) ≈ 127px ≈ 4 tiles`
- This gives enough clearance for 2-tile-high obstacles

### Speed: 250 px/s

- 250 ÷ 32 ≈ 7.8 tiles per second — a brisk but controllable pace
- At 60fps with delta time: ~4.2 px/frame
- Crossing a 25-tile viewport: ~3.2 seconds

### Jump velocity: -500 px/s

- Negative because PixiJS Y axis points down
- Combined with 980 gravity: ~4 tile jump height
- Variable jump height: holding jump extends the ascent by not applying the
  40% velocity cut on key release

### Invincibility frames: 1.5s

- Long enough to recover visually (flash the sprite)
- Short enough that the player doesn't wait
- At 60fps: 90 frames of invincibility

### Tile types: 0=air, 1=ground, 2=platform, 3=spike

- 0 is the default (empty space)
- 1 is solid ground (full block, collides on all sides)
- 2 is a thin platform (collides only from above, can jump through)
- 3 is a hazard (damages on touch)
- Extensible: add types 4+ for new tile behaviors

---

## Adding a New Genre Pattern

### Step 1: Create the file

```
.opencode/templates/genre-patterns/[your-genre].md
```

### Step 2: Define required sections

Every pattern must have these sections:

```
# Genre Pattern: [Name]

## Player
- Movement description
- Physics values
- Speed, jump, health
- Visual placeholder

## World
- Tile types and colors
- Level dimensions
- Background

## Camera
- Follow behavior
- Bounds

## Objects
- What entities exist
- Their behaviors and values

## Win Condition
- How the player wins

## Collision
- Approach (per-axis AABB recommended for 2D)

## Data File Schema
- Level JSON and gameplay config JSON conventions

## Audio (stubs)
- Sound events by action

## Test Strategy
- Unit, integration, browser test guidance

## Generated Files
- List of source files to create
```

### Step 3: Reference the pattern

The pattern is auto-discovered by `/auto-build`. If the user's spec mentions
the genre name (e.g., "shmup", "top-down"), the command reads the matching
file automatically. No registration step needed.

### Step 4: Test with an inline spec

```bash
/auto-build "[genre] where [core mechanic]"
```

The build should produce a runnable game. If it doesn't, the pattern is
missing a required section or the values produce unplayable behavior.

---

## Pattern Design Principles

1. **Provide defaults, not templates** — The pattern fills gaps when the
   user's spec doesn't specify a value. If the spec says "player speed = 400",
   use 400, not the pattern's default of 250.

2. **Values must work together** — Tile size, gravity, speed, and jump
   velocity form a physics system. Changing one without adjusting the others
   produces broken gameplay. If you change tile size, recalculate jump height.

3. **Prefer simple collision** — Per-axis AABB is sufficient for tile-based
   2D games. Swept AABB, pixel-perfect, or physics-engine collision should
   be added in a subsequent iteration, not in the initial pattern.

4. **Minimal generated files** — Each pattern should generate the minimum
   number of files to produce a working game. Don't split into 15 micro-files.
   Consolidate logic that naturally belongs together. Decompose later.

5. **Never hardcode values** — The pattern provides defaults for the
   `gameplay-config.json` file. Generated code reads from config. If you
   hardcode a value in a generated file, the user must edit source code to
   tune it.

6. **Document the reasoning** — A future contributor (or your future self)
   needs to understand why gravity is 980 and not 500. Add a note explaining
   the relationship between values.
