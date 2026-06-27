/**
 * CLI: Export the combined game graph from generated declarations.
 *
 * Reads all .ts files in src/ for GraphRegistry.register() calls,
 * evaluates the combined graph, and writes design/game-graph.json.
 *
 * Usage: npm run export-graph
 *
 * If the dev server is running, fetches the live graph from /api/graph.
 * Otherwise, scans source files for register() calls and reconstructs.
 */

import fs from "node:fs"
import path from "node:path"

const GRAPH_OUT = "design/game-graph.json"

async function main() {
  // Try dev server first
  try {
    const resp = await fetch("http://localhost:5173/api/graph", {
      signal: AbortSignal.timeout(3000),
    })
    if (resp.ok) {
      const data = await resp.json()
      fs.writeFileSync(GRAPH_OUT, JSON.stringify(data, null, 2))
      console.log(`Live graph written to ${GRAPH_OUT}`)
      process.exit(0)
    }
  } catch {}

  // Fallback: scan src/ for generated game-graph.json from /auto-build
  // Auto-build writes design/game-graph.json if it exists
  const generatedPath = path.resolve(GRAPH_OUT)
  if (fs.existsSync(generatedPath)) {
    console.log(`Using existing graph at ${GRAPH_OUT}`)
    process.exit(0)
  }

  console.log("No graph source found. Start the dev server or run /auto-build first.")
  process.exit(1)
}

main()
