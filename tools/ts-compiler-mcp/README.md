# ts-compiler-mcp

MCP server that exposes TypeScript compiler tools to AI agents.

Instead of grep-and-guess, agents query the compiler directly:

- **findSymbol** — locate a symbol's declaration
- **findReferences** — find all usages
- **checkAnyUsage** — audit a file for `any`, `as`, `!` 
- **traceImports** — list imports/exports of a module
- **checkBoundaryViolation** — validate module layer isolation

## Usage

```bash
npx tsx src/index.ts [project-root]
# or
npm run dev -- [project-root]
```

## Claude Code / OpenCode Integration

Add to your MCP config:

```json
{
  "mcpServers": {
    "ts-compiler": {
      "command": "npx",
      "args": ["tsx", "path/to/tools/ts-compiler-mcp/src/index.ts"]
    }
  }
}
```
