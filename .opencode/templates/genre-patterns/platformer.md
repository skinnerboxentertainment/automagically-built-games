# Genre Pattern: Platformer

Side-scrolling platformer with gravity, jump, horizontal movement, collectibles, enemies, and score.

## Player
- Movement: A/D or arrow keys horizontal, Space/W/Up to jump
- Physics: gravity (980 px/s²), ground check, velocity-based movement, variable jump height
  (holding jump extends ascent, releasing cuts vy by 40%)
- Speed: 250 px/s horizontal, -500 px/s jump velocity
- Visual: colored rectangle (0x00aaff, 24x40 px) or placeholder circle
- State: idle → running → jumping → falling → dead
- Health: 3 hits, invincibility frames (1.5s after hit)

## World
- Tiles: ground blocks (0x8B4513), platforms (0x654321), gaps (air)
- Level: horizontal scroll, ground with platforms at varying heights, occasional gaps, one exit flag
- Tile size: 32x32 px
- Level width: 40-80 tiles. Height: 15 tiles (one screen).
- Ground row at bottom tile row (y=14). Gaps every 10-15 tiles, 1-2 tiles wide.
- Platforms at y=8 to y=12, 3-8 tiles wide, placed above gaps and in open areas.
- Background: solid color approximating sky (0x87CEEB)

## Camera
- Follow player horizontally, deadzone 25% from left edge
- Y locked to level height — camera never scrolls vertically past the tile bounds
- Camera bounds: 0 to level_width × tile_size - viewport_width

## Objects
- Collectible: coins/gems (0xFFD700, 16x16), float bobbing animation, +100 score on overlap
  - Scatter count: 15-25 per level, placed on platforms and in the air between gaps
- Enemy: patrol horizontally between two pixel bounds, damage on overlap (1 HP), can be stomped from above
  - Stomp detection: player vy > 0 && bottom of player within 16px of enemy top
  - Patrol bounds: 4-8 tiles apart
  - Count: 3-7 per level
- Exit flag: end-of-level trigger (0x00FF00), on overlap → "LEVEL CLEAR"
  - Always on the last ground tile at the right edge of the level

## Win Condition
- Reach the exit flag

## Collision
- Per-axis AABB: resolve X-axis first, then Y-axis
- Player collision check: player rectangle against solid tiles (type 1 and 2)
- No continuous collision — acceptable for tile-based levels at ≤60fps
- Enemy collision: AABB overlap with player hitbox. Enemies do not collide with tiles.

## Data File Schema
Levels are stored in `assets/data/level-01.json`:
- `tiles`: flat array where 0=air, 1=ground, 2=platform, 3=spike
- `spawns`: array of entity spawns with type, position, and behavior config
- `exit`: x,y tile coordinates for the level exit

Gameplay values are stored in `assets/data/gameplay-config.json`:
- All tunable values (player speed, jump velocity, gravity, health, etc.)
- Never hardcoded in source code

## Audio (stubs)
- Jump: play on jump action
- Collect: play on coin overlap
- Hit: play on damage
- Death: play on health reaches 0

## Test Strategy
- Unit: player jump arc, enemy patrol bounds, collectible overlap, damage invincibility
- Integration: scene enter/exit, respawn flow, level load from JSON
- Browser: canvas renders, player moves, jump works

## Generated Files
```
src/gameplay/player.ts
src/gameplay/player-state.ts
src/gameplay/enemy.ts
src/gameplay/collectible.ts
src/gameplay/score-manager.ts
tests/unit/gameplay/player.test.ts
tests/unit/gameplay/enemy.test.ts
tests/unit/gameplay/collectible.test.ts
```

Note: `collision-system.ts` is intentionally omitted — collision logic is
inlined in `player.ts` and `game-scene.ts` to keep the initial build simple.
If the project needs a standalone collision system, add it in a subsequent
iteration via `dev-story`.
