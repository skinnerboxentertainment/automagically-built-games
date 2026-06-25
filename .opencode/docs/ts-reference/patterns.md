# TypeScript Patterns & Conventions

## Dogma (Always Enforce)

- **No `any`** — except in type guard function signatures. Use `unknown` instead.
- **No type assertions (`as`)** unless TypeScript cannot infer correctly and a
  type guard is impractical. Document why.
- **No `// @ts-ignore` or `// @ts-expect-error`** — they hide real bugs.
- **No `!` non-null assertions** — use control flow narrowing or early returns.
- **No `require()`** — use ESM `import`/`export` only.
- **No `Function` type** — use a call signature or `(...args: unknown[]) => unknown`.
- **No `object` type** — use `Record<string, unknown>` or a specific interface.
- **No `{}` as a type** — that means "any non-nullish value." Be specific.

## Strict Patterns

### Type Guards
```typescript
// Good: branded type guard
interface Health { _brand: "health"; value: number }

function isHealth(x: unknown): x is Health {
  return typeof x === "object" && x !== null && "_brand" in x && (x as any)._brand === "health"
}

// Good: discriminated union
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }

function handle(r: Result<number, string>): void {
  if (r.ok) { r.value } // narrowed
  else { r.error }      // narrowed
}
```

### Branded Types for Game IDs
```typescript
// Prevents passing entity ID where item ID is expected
type EntityId = string & { _entityBrand: never }
type ItemId = string & { _itemBrand: never }

function getEntity(id: EntityId): Entity { /* ... */ }
function getItem(id: ItemId): Item { /* ... */ }

// Usage
const eid = "ent_001" as EntityId
const iid = "itm_001" as ItemId
getEntity(eid) // OK
getEntity(iid) // Type error
```

### Discriminated Unions for State Machines
```typescript
type PlayerState =
  | { kind: "idle" }
  | { kind: "running"; speed: number }
  | { kind: "jumping"; velocity: number }
  | { kind: "attacking"; animation: string; frame: number }

function updateState(state: PlayerState, delta: number): PlayerState {
  switch (state.kind) {
    case "idle": // ...
    case "running": // state.speed is narrowed
    case "jumping": // state.velocity is narrowed
    case "attacking": // state.animation, state.frame narrowed
  }
}
```

### Generic Constraints
```typescript
// Prefer constraints over assertions
function getComponent<T extends Component>(entity: Entity, type: new () => T): T | null {
  return entity.components.find(c => c instanceof type) as T | null
}

// Use satisfies for validation
const config = {
  maxHealth: 100,
  damage: 25,
} satisfies Record<string, number>
```

### Readonly for Immutable State
```typescript
interface GameState {
  readonly entities: ReadonlyMap<string, Entity>
  readonly playerId: string
  readonly score: number
}

// Deep readonly utility
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K]
}
```

### Async Patterns
```typescript
// Always handle promise rejections
async function loadAssets(): Promise<void> {
  try {
    await Assets.loadBundle("game")
  } catch (err: unknown) {
    console.error("Asset load failed:", err instanceof Error ? err.message : String(err))
  }
}

// AbortController for cancellable operations
function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), ms)
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timeout))
}
```

## Banned Patterns

```typescript
// BANNED — unsafe assertion
const x = foo as Bar     // Use: type guard or narrowing

// BANNED — non-null assertion
const y = foo!.bar       // Use: early return or null check

// BANNED — implicit any
function process(data) { }  // Use: explicit parameter type

// BANNED — any escape
const z: any = someFunc()   // Use: unknown + type guard

// BANNED — loose enum (runtime emitted)
enum Direction { Up, Down }  // Use: const enum or 'as const' object

// BANNED — stringly typed
function get(key: string) { }  // Use: union type or enum
```

## Bundle & Performance Awareness

- Prefer `interface` over `type` for object shapes (faster type instantiation).
- Use `const` over `let` where possible — better narrowing.
- Avoid large discriminated unions in hot paths (can slow compiler).
- Use `Map`/`Set` over object literals for dynamic key lookups.
- No `eval()`, `new Function()`, `setTimeout(string)` — security + perf.
