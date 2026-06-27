# Game Graph Viewer

Standalone D3.js graph viewer for `NarrativeDocumentV2` game system graphs.

## Usage

**Open the viewer:**
Open `tools/graph-viewer/index.html` in a browser.

**Load a graph:**
1. Drag a `game-graph.json` file onto the page
2. Or add `?file=path/to/graph.json` to the URL
3. Or start the dev server (`npm run dev`) — the viewer auto-fetches from `localhost:5173/api/graph`

**Features:**
- Force-directed layout with D3.js
- Color-coded nodes by system arc (player, level, economy, enemies, outcome)
- Click a node to see its outgoing transitions, conditions, mutations, and events
- Click a transition line to see its full detail
- Search/highlight nodes by name
- Filter by system arc
- Analyze button detects unreachable nodes, dead ends, undeclared variables
- Drag nodes to reposition (resets on reload)
- Export the current graph as JSON

## Export

```bash
npm run export-graph
```

Writes the combined graph to `design/game-graph.json`. Tries the live dev
server first, then falls back to existing generated graph.
