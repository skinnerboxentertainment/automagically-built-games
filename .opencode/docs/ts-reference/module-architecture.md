# Module Architecture & Boundary Rules

## Dependency Direction

```
src/
├── core/          → depends on: nothing (zero deps)
├── gameplay/      → depends on: core
├── ai/            → depends on: core, gameplay
├── networking/    → depends on: core, gameplay
├── rendering/     → depends on: core, pixi.js
├── ui/            → depends on: core, gameplay
├── tools/         → depends on: anything (dev-only)
└── main.ts        → depends on: everything (composition root)
```

## Rules

1. **Core depends on nothing.** No imports from gameplay, ai, networking, ui, rendering.
2. **UI never imports gameplay internals.** UI reads state through interfaces/events only.
3. **Gameplay never imports UI.** Emit events, don't call UI functions.
4. **Tools can import anything** — but must never be imported by production code.
5. **Cross-module communication** goes through interfaces (defined in core) or EventBus.
6. **No circular imports.** If A imports B and B imports A, extract the shared type to core.

## Barrel Module Pattern

```typescript
// src/gameplay/index.ts — barrel export
export { HealthComponent } from "./health-component"
export { DamageSystem } from "./damage-system"
export type { HealthConfig } from "./types"

// Importers always import from barrel
import { HealthComponent, DamageSystem } from "../gameplay"
```

## Boundary Violation Detection

If you see an import like `../../ui/hud` from inside `src/gameplay/`, flag it.
Gameplay code should never reach into UI.

Allowed cross-boundary patterns:
- `src/gameplay/ → src/core/` ✓
- `src/gameplay/ → src/gameplay/` ✓
- `src/ui/ → src/gameplay/` ✗ — use events
- `src/gameplay/ → src/ui/` ✗ — forbidden
- `src/core/ → src/gameplay/` ✗ — forbidden
