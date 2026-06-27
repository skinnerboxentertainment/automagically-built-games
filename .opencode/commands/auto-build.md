---
description: "Auto-build a game from a spec or design document. Reads a game description or document, analyzes it to extract systems, entities, mechanics, and rules. Generates a complete scaffold (core engine + gameplay + tests + audio + assets), verifies with tsc and vitest, then writes to disk on approval. One command to a running build."
agent: build
---

# Auto-Build

This command bypasses the normal collaborative protocol. It reads a game spec
or design document, generates a complete working build, and asks exactly
**one** question at the end (unless the document has gaps — then it batches
all unknowns into one question first).

**Usage:**
```
/auto-build "2D platformer where you collect gems"     — inline spec (short)
/auto-build design/gdd/game-concept.md                  — file path (doc)
/auto-build <paste multi-line description>              — pasted (auto-detect)
```

---

## Phase 0: Ingestion

Detect the input type:

| Input | Detection | Behavior |
|-------|-----------|----------|
| `/auto-build "text..."` | Single line, no newlines, <500 chars | Inline spec — skip doc analysis, go to Phase 1 |
| `/auto-build path/to/file.md` | Argument is an existing readable file | Read file — go to Phase 0.5 |
| `/auto-build <pasted block>` | Contains newlines or >500 chars | Treat as pasted document — go to Phase 0.5 |

Supported file formats: `.md`, `.txt`. If no extension, attempt to read as
markdown anyway.

If file is specified but not found: report error, offer to fall back to
inline spec parsing with the filename as context.

---

## Phase 0.5: Document Analysis

Read the document and extract a structured spec. For each field, record
whether it came from the document or is unknown:

| Field | Extract from doc | Unknown if |
|-------|------------------|------------|
| Genre | "platformer", "top-down", "shmup", "runner", "puzzle", or custom | No genre indicator found |
| Core mechanic | Verbs: jump, shoot, collect, match, dodge, dash, grapple, etc. | No action verbs |
| Player properties | health, speed, abilities, size | No player description |
| Enemy types | Type names + behavior + health per type | Combat not described |
| World layout | Tile size, scrolling direction, ground type, grid | No spatial description |
| Win condition | Score target, reach end, survive, defeat boss | No end state |
| Progression | Levels, waves, difficulty curve, unlocks | No progression system |
| UI screens | Health bar, score, inventory, menu, minimap | No UI description |
| Economy | Currencies, items, prices, sinks/faucets | No economy described |
| Audio cues | Per-action sound events, music style | No audio description |
| Rules/formulas | damage = attack - defense, cooldowns, states | No explicit rules |
| Theme | forest, space, dungeon, city, etc. | No theme described |
| Tone | dark, moody, bright, casual, horror | No tone described |

Extraction strategy — read the document thoroughly, then:
1. Identify all explicitly named systems, entities, mechanics
2. Map each to the field table above
3. Collect anything that doesn't fit a field as "additional notes"
4. Mark any field not addressed as **unknown**

---

## Phase 0.75: Coverage Report

After analysis, produce a structured summary:

```
## Document Analysis Complete

### Captured from document
[coverage count] of [total] fields populated

- Genre: [genre] (source: explicit / inferred)
- [field]: [value] (source: explicit / inferred)
- ...

### Not specified (unknowns)
- [field]: [question for user]
- [field]: [question for user]
- ...
```

If there are **zero unknowns**, display the summary and proceed to Phase 2.

If there are **unknowns**, batch them all into a single question widget:

```
[ ] [field]: [option A] / [option B] / [option C]
[ ] [field]: [option A] / [option B] / [option C]
[ ] [field]: [option A] / [option B] / [option C]

[A] Apply defaults and build      [B] Answer questions first      [C] Cancel
```

- **[A]** — use genre pattern defaults for all unknowns, proceed to Phase 2
- **[B]** — show the question widget with all unknowns, then proceed
- **[C]** — cancel, no files written

After questions are answered (or defaults applied), write the decision record
to conversation state. This feeds into the Build Summary at Phase 5.

---

## Phase 1: Resolve Spec

Combine inputs into a final spec object:

### For inline input (Phase 0 skipped)

Parse the user's game description into a structured spec object:

| Field | Extract from text | Default if missing |
|-------|-------------------|--------------------|
| Genre | platformer, top-down, shmup, runner, puzzle | minimal |
| Core mechanic | jump, shoot, collect, match, dodge | move around |
| Theme | forest, space, dungeon, city | generic |
| Tone | dark, moody, bright, casual, horror | neutral |
| Player description | character details | unnamed character |
| Win condition | reach end, survive, score target | none (free-roam) |
| Has enemies | yes / no | yes (if genre has them) |

If the genre is not one of the five named patterns, fall back to `minimal`.

### For document input (Phase 0.5 completed)

Merge three sources in priority order:
1. **Document fields** (highest priority) — what the spec explicitly stated
2. **User answers** (medium priority) — what the user selected in Phase 0.75
3. **Genre defaults** (lowest priority) — what the matched genre pattern provides

The genre pattern provides defaults **only** for fields the document didn't
address and the user didn't answer. The document's own specs are authoritative
where they exist.

---

## Phase 2: Load Patterns and Rules

1. **Read genre pattern**: `.opencode/templates/genre-patterns/[genre].md`
   - Extract player parameters, world layout, objects, camera, audio, test strategy
   - These provide **defaults** — document fields override them
   - If genre is unknown, read `minimal.md`

2. **Read architecture rules**: `.opencode/skills/automagically-game-architecture/SKILL.md`
   - State ownership, scene lifecycle, update loop, input handling, composition model
   - Every generated file must conform to these rules

3. **Read test rules**: `.opencode/skills/automagically-testing/SKILL.md`
   - Testing pyramid, deterministic clocks, seeded RNG
   - Every generated test must follow these patterns

4. **Read audio rules**: `.opencode/skills/automagically-audio/SKILL.md`
   - AudioManager interface, Howler usage, scene cleanup
   - Every generated audio call must use these patterns

5. **Read asset rules**: `.opencode/skills/automagically-assets-and-build/SKILL.md`
   - PixiJS Assets bundles, manifest format, import convention
   - Every generated asset reference must use these patterns

---

## Phase 3: Generate Scaffold

Generate all files in this order. Each file must conform to the architecture,
testing, audio, and asset rules loaded in Phase 2.

**Document-driven generation:** When generating gameplay code, prefer the
document's explicit specifications over genre pattern defaults:
- If the doc says "player health = 5" → generate exactly that
- If the doc says "enemy has 3 HP and drops a coin" → generate exactly that
- If the doc says nothing about a field → use genre pattern default
- If the doc describes a system not in the genre pattern → generate it anyway

### Core (always generated)

```
src/main.ts
```
- PixiJS v8 `Application` init with `app.init({ resizeTo: window })`
- Append canvas to `document.body`
- Init `InputManager` after first user gesture
- Create `SceneManager`, push `BootScene`
- `app.ticker.add((ticker) => gameLoop.update(ticker.deltaTime))`

```typescript
// src/core/scene-manager.ts
```
- Stack-based: `push(scene)`, `pop()`, `replace(scene)`
- `update(dt)` calls current scene only
- `enter()` on push, `exit()` on pop

```typescript
// src/core/input-manager.ts
```
- Captures keyboard state (`keys: Set<string>`, `keysJustPressed: Set<string>`)
- Mouse position + button state
- `update()` called once per frame before scene update
- Clears on blur (focus loss)

```typescript
// src/core/game-loop.ts
```
- Calls `inputManager.update()` then `sceneManager.update(dt)`
- Exports `dt` for use by systems

```typescript
// src/core/types.ts
```
- `Scene` interface: `enter(): void`, `update(dt: number): void`, `exit(): void`

### Scenes (always generated)

```
src/scenes/boot-scene.ts
```
- Minimal loading screen (text centered: "Loading...")
- `Assets.init({ manifest: "assets/manifest.json" })` on enter
- Load first scene's bundle
- Push `GameScene` when done

```
src/scenes/game-scene.ts
```
- Creates gameplay objects from resolved spec
- Delegates update to player, enemies, systems
- Handles game-over transition

### Gameplay (spec-dependent)

Generate files matching the resolved spec's systems. For each system:
- If the doc specifies exact behavior → implement exactly
- If the genre pattern defines it and doc is silent → use genre pattern logic
- If neither covers it → implement minimal working version

Every generated file must:
- Use the Scene interface and types from `src/core/types.ts`
- Read input from `InputManager` (never register DOM listeners)
- Keep state on plain classes (never on Sprite/Container properties)
- Use delta time for all movement
- Use seeded RNG from `src/utils/rng.ts` for any randomness — every class
  that uses randomness must accept an optional `rng` parameter seeded from
  this utility, enabling deterministic testing
- Read tunable values from `assets/data/gameplay-config.json` — never
  hardcode gameplay constants like speed, health, gravity, or score values
  in source code

### Audio (interface + stub implementation)

```typescript
// src/audio/audio-manager.interface.ts
```
- `IAudioManager` interface with: `init()`, `playMusic(key)`, `playSfx(key)`,
  `stopAll()`, `setMusicVolume(v)`, `setSfxVolume(v)`, `mute()`, `unmute()`
- Generate the exact interface from the audio skill

```typescript
// src/audio/audio-manager.ts
```
- Implements `IAudioManager` with Howler.js stubs
- `init()`: mark as ready after first call (no actual Howl init yet — placeholder assets)
- `playSfx`/`playMusic`: log to console with the key name
- `stopAll()`: stop all active sounds
- Wrap in `// TODO: Replace stubs with real Howl instances when audio assets are added`

### Utilities (always generated)

```
src/utils/rng.ts
```
- Seeded PRNG (mulberry32 or similar)
- `createRng(seed: number): { next(): number, nextInt(min, max): number }`

### Tests (always generated)

```
tests/helpers/fake-clock.ts
```
- `FakeClock` class: `time`, `advance(ms)`, `reset()`

```
tests/helpers/seeded-rng.ts
```
- Same PRNG as `src/utils/rng.ts` for deterministic testing

```
tests/unit/core/scene-manager.test.ts
```
- Scene lifecycle: push calls enter, pop calls exit, replace swaps
- Current scene receives updates

```
tests/unit/core/input-manager.test.ts
```
- Keys captured on keydown, released on keyup, cleared on blur

Generate spec-specific tests for each gameplay system. Each test must:
- Use Vitest (`describe`, `it`, `expect`)
- Use `FakeClock` for time-dependent assertions
- Use `seeded-rng` for any randomness
- Test state logic, not pixels

```
tests/browser/startup.test.ts
```
- Playwright test: load page, wait for canvas, assert visible

### Data (always generated)

```
assets/data/gameplay-config.json
```
- All tunable gameplay values in one file. Every generated gameplay class
  reads from this config — never hardcoded constants.
- Schema:
  ```json
  {
    "player_speed": 250,
    "player_jump_velocity": -500,
    "player_gravity": 980,
    "player_health": 3,
    "invincibility_frames": 1.5,
    "score_per_gem": 100,
    "enemy_health": 1,
    "tile_size": 32,
    "max_fall_speed": 600
  }
  ```
- Values come from the genre pattern, document spec, or user answers, in
  priority order. If the spec didn't specify a value, use the genre default.
- Generate a `Config` loader class in `src/core/config.ts` that reads,
  validates, and exports this JSON as a typed object.

For genre builds (platformer, top-down, shmup, runner, puzzle), also generate:

```
assets/data/level-01.json
```
- Level layout as a structured JSON file, not hardcoded arrays in source.
- Schema:
  ```json
  {
    "width": 60,
    "height": 15,
    "tile_size": 32,
    "tiles": [],
    "spawns": [
      { "type": "player", "x": 2, "y": 12 },
      { "type": "enemy", "x": 10, "y": 12, "patrol": [8, 14] },
      { "type": "collectible", "x": 5, "y": 8, "value": 100 }
    ],
    "exit": { "x": 58, "y": 12 }
  }
  ```
- `tiles` is a flat array where each value is a tile type:
  0 = air, 1 = ground, 2 = platform, 3 = spike
- Level dimensions are `width × height` tiles. The scene loads this file
  and renders tiles from the array — no hardcoded positions in scene code.
- Generation rules (use genre pattern as base, then vary):
  - Ground row at bottom. Remove blocks for gaps (1-2 tiles wide) every
    8-15 tiles.
  - Platforms at varying heights above ground.
  - Enemies on flat ground sections, spaced at least 5 tiles apart.
  - Collectibles scattered on platforms and in the air.
  - Player start: 2 tiles from left edge on ground level.
  - Exit: last ground tile on right edge.

### Assets

```
assets/manifest.json
```
- PixiJS v8 manifest format
- Bundle `core` with shared assets (empty for now — placeholder)
- Bundle per scene name from resolved spec

---

## Phase 4: Verify

After generating all file content (but before writing to disk):

1. **Dry-run check**: Parse all generated TypeScript for structural issues:
   - Import paths resolve correctly
   - No circular imports (`core` → `gameplay` → `core`)
   - No direct DOM event listeners in scenes
   - No state on display objects
   - No `any` type (strict mode)

2. **Write all files to disk**

3. **Run `npx tsc --noEmit`**:
   - If PASS → proceed
   - If FAIL → read the error output, fix all errors, re-run. Repeat up to 3 attempts.
   - If still FAIL after 3 attempts → report the failure and offer: retry, simplify, or cancel

4. **Run `npx vitest run`**:
   - If PASS → proceed
   - If FAIL → read the error output, fix all failing tests, re-run. Repeat up to 3 attempts.
   - If still FAIL after 3 attempts → report the failures and offer: retry, skip tests, or cancel

---

## Phase 5: Gate + Build Summary

Present the result with the gate. If this was a document build, write a
Build Summary to `docs/build-summary-[YYYY-MM-DD].md`.

### Gate presentation

```
## Build Complete

**Source:** [inline spec / path/to/design-doc.md / pasted document]
**Genre:** [genre]
**Files created:** [count]
**Systems generated:** [list of gameplay systems]
**tsc:** PASS
**vitest:** [PASS / SKIPPED]

[A] Write to disk — save all files and confirm build
[B] Show summary — list every file and its purpose before deciding
[C] Cancel — discard everything, no files written
```

If the user picks [B]: show a bullet list of every file with a one-line
description of its purpose, then re-ask [A]/[B]/[C].

If the user picks [A]: write all files verified in Phase 4. Then write the
Build Summary to `docs/build-summary-[YYYY-MM-DD].md` (see below).

If the user picks [C]: delete any files written during verification.
Clean up completely. No trace.

### Build Summary document

When writing to disk, also create `docs/build-summary-[YYYY-MM-DD].md`:

```markdown
# Build Summary — [YYYY-MM-DD]

**Generated from:** [path-to-document / inline spec]
**Genre:** [genre]

## Source Coverage

| Field | Value | Source |
|-------|-------|--------|
| Genre | [genre] | [explicit / inferred / default] |
| [field] | [value] | [explicit / user / default] |
| ... | ... | ... |

## Files Created

| File | Purpose |
|------|---------|
| `src/main.ts` | Rewritten for game boot |
| ... | ... |

## Decisions Made

[For each field that was answered by the user or filled by default:]
- **Field:** [field name] → [chosen value]
- **Rationale:** [answered by user / genre default because doc was silent]

## Verification

- tsc: [PASS / FAIL — errors fixed]
- vitest: [PASS / FAIL — tests fixed]

## Next Steps

Recommended commands for iteration:
- `/auto-build "change [specific thing]"` — quick iteration
- `/dev-story` — implement a structured feature
- `/design-review` — validate generated game design
```

---

## Behavior Contract

This command intentionally breaks the normal collaborative protocol:
- **No per-section approval** — generate everything before asking
- **No intermediate questions** — parse the spec and build
- **No director gates** — no creative-director, technical-director, or producer review
- **No "May I write?"** — write during verification, gate at the end

The only user interactions after the initial input are:
1. (Optional) Phase 0.75 — one batched question if the document has gaps
2. Phase 5 — one gate to confirm write

Both are batched. Neither is per-file or per-section.

---

## Error Recovery

If any phase fails:

| Phase | Failure | Recovery |
|-------|---------|----------|
| 0 (Ingest) | File not found | Offer fallback to inline parsing |
| 0.5 (Analysis) | Document unparseable | Fall back to inline parsing with filename as context |
| 1 (Resolve) | Spec unrecognizable | Adopt minimal genre, use spec text as theme name |
| 3 (Generate) | Cannot generate a file | Skip that file, note in summary, continue |
| 4 (Verify) | tsc fails after 3 retries | Show errors, offer retry/simplify/cancel |
| 4 (Verify) | vitest fails after 3 retries | Show failures, offer retry/skip/cancel |

Never fail the entire build because of one file or one test.
Always produce something runnable.
