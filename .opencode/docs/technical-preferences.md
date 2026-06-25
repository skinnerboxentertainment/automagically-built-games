# Technical Preferences

<!-- Populated by /setup-engine. Updated as the user makes decisions throughout development. -->
<!-- All agents reference this file for project-specific standards and conventions. -->

## Engine & Language

- **Renderer**: PixiJS v8 (WebGL2/WebGPU/Canvas)
- **Language**: TypeScript (strict)
- **Rendering**: PixiJS scene graph, sprites, graphics, text, filters
- **Physics**: Matter.js (optional — add when needed)

## Input & Platform

- **Target Platforms**: Web (browser)
- **Input Methods**: Keyboard/Mouse, Gamepad, Touch
- **Primary Input**: [TO BE CONFIGURED — depends on game genre]
- **Gamepad Support**: Partial (via Gamepad API)
- **Touch Support**: Partial (via Pointer Events)
- **Platform Notes**: Canvas-based rendering with DOM overlay for UI when needed. Support Chrome, Firefox, Safari, Edge.

## Naming Conventions

- **Classes**: PascalCase (e.g., `PlayerController`)
- **Variables/functions**: camelCase (e.g., `moveSpeed`, `takeDamage()`)
- **Files**: kebab-case matching export (e.g., `player-controller.ts`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_HEALTH`)
- **Events**: camelCase past tense (e.g., `healthChanged`, `playerDied`)
- **Interfaces**: PascalCase with `I` prefix (e.g., `IDamageable`)
- **Types**: PascalCase (e.g., `DamageResult`)

## Performance Budgets

- **Target Framerate**: 60fps (16.6ms frame budget)
- **Frame Budget**: 8ms rendering, 4ms gameplay, 2ms physics, 2.6ms overhead
- **Draw Calls**: < 100 per frame (batching preferred)
- **Memory Ceiling**: 200MB heap

## Testing

- **Framework**: Vitest
- **Minimum Coverage**: 80% on gameplay systems
- **Required Tests**: Balance formulas, gameplay systems, rendering (if applicable)

## Forbidden Patterns

- Direct DOM manipulation outside `src/ui/`
- `any` type (except in type guard functions)
- Strings in place of `enum` or union types for game state
- `new Sprite()` in update loops — pool or reuse

## Allowed Libraries / Addons

- pixi.js (v8.x)
- [None yet — add as dependencies are approved]

## Architecture Decisions Log

<!-- Quick reference linking to full ADRs in docs/architecture/ -->
- [No ADRs yet — use /architecture-decision to create one]

## TypeScript Compiler MCP Server

A `ts-compiler-mcp` server is available at `tools/ts-compiler-mcp/`.
Provides compiler-backed tools for symbol lookup, type checking, and
boundary analysis. Run with: `node tools/ts-compiler-mcp/src/index.js`
from the project root. Configure as an MCP server in your OpenCode or
Claude Code settings to make tools available to all agents.

## Engine Specialists

- **Primary**: pixijs-specialist
- **Language/Code Specialist**: lead-programmer (TypeScript review)
- **Shader Specialist**: pixijs-specialist (GLSL/WGSL filters, Filter.from(), custom shaders)
- **UI Specialist**: ui-programmer (PixiJS Container-based UI, DOM overlay)
- **Additional Specialists**: gameplay-programmer, ai-programmer, network-programmer
- **Routing Notes**: Invoke pixijs-specialist for all rendering, scene graph, shader, and PixiJS performance work. Invoke lead-programmer for TypeScript architecture and code review. Invoke gameplay-programmer for game mechanics implementation.

### File Extension Routing

| File Extension / Type | Specialist to Spawn |
|-----------------------|---------------------|
| Game code (.ts files) | lead-programmer (consult ts-reference/ docs, use ts-compiler-mcp tools) |
| Shader / filter files (.glsl, .wgsl, .ts with Filter) | pixijs-specialist |
| UI / screen files (.ts in src/ui/) | ui-programmer |
| Scene / level data (.json) | gameplay-programmer |
| General architecture review | pixijs-specialist |
