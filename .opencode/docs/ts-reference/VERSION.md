# TypeScript — Version Reference

| Field | Value |
|-------|-------|
| **Language** | TypeScript 5.9.3 |
| **Config** | `strict: true` in tsconfig.json |
| **Module** | ESNext with bundler resolution |
| **Project Pinned** | 2026-06-25 |
| **LLM Knowledge Cutoff** | May 2025 |
| **Risk Level** | HIGH — TS 5.9 is beyond training data |

## Post-Cutoff Timeline (TS 5.5 → 5.9)

| Version | Release | Notable |
|---------|---------|---------|
| 5.5 | ~Jun 2024 | Inferred type predicates, control flow narrowing for `const` variables |
| 5.6 | ~Sep 2024 | Disallowed nullish/truthy checks on `never`, iterator helper methods |
| 5.7 | ~Nov 2024 | `--rewriteRelativeImportExtensions`, `using` declarations in top-level await |
| 5.8 | ~Feb 2025 | `--erasableSyntaxOnly`, `--libReplacement`, `return` type from `catch` |
| 5.9 | ~Apr 2026 | *Check changelog for specifics — beyond cutoff* |

## Key Changes Since Training Data

### No-BroadChain --erasableSyntaxOnly
- TS 5.8+: `--erasableSyntaxOnly` prevents using `enum` and `namespace` constructs
  that emit runtime code. Only `const enum` is allowed.
- If your project uses runtime `enum`, you may need to migrate to `const enum` or
  `as const` objects.

### Inferred Type Predicates (TS 5.5+)
```typescript
// Before 5.5 — had to write explicit type predicate
function isString(x: unknown): x is string { return typeof x === "string" }

// TS 5.5+ — compiler infers the type predicate automatically
function isString(x: unknown) { return typeof x === "string" }
// Return type is inferred as `x is string`
```

### `using` Declarations (TS 5.7+)
```typescript
// Explicit resource management — compiles with downlevelIteration
using resource = getResource()
// resource[Symbol.dispose]() called at block end
```

### Iterator Helper Methods (TS 5.6+)
```typescript
// Built-in iterable helpers — no more polyfill needed
const doubled = [1, 2, 3].values().map(x => x * 2)
```

## Config Rules for This Project

- `strict: true` — never disable
- `noImplicitAny: true` (implied by strict)
- `strictNullChecks: true` (implied by strict)
- `erasableSyntaxOnly: false` — we use `enum` for game state types
- `moduleResolution: "bundler"` — Vite handles resolution
- `target: "ES2022"` — modern browsers support this
