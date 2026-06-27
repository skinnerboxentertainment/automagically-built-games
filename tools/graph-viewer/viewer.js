let graphData = null
let simulation = null
let svg = null
let g = null
let linkGroup = null
let nodeGroup = null
let labelGroup = null
let linkLabelGroup = null

const arcColors = {
  player: "#00aaff",
  movement: "#44cc44",
  level: "#44cc44",
  economy: "#ffd700",
  enemies: "#ff4444",
  outcome: "#cc44ff",
  default: "#888888",
}

async function init() {
  svg = d3.select("#graph")
  const width = svg.node().clientWidth
  const height = svg.node().clientHeight
  svg.attr("viewBox", [0, 0, width, height])

  // Zoom
  const zoom = d3.zoom()
    .scaleExtent([0.1, 4])
    .on("zoom", (event) => g.attr("transform", event.transform))
  svg.call(zoom)

  g = svg.append("g")
  linkGroup = g.append("g").attr("class", "links")
  linkLabelGroup = g.append("g").attr("class", "link-labels")
  nodeGroup = g.append("g").attr("class", "nodes")
  labelGroup = g.append("g").attr("class", "labels")

  // Search
  document.getElementById("search").addEventListener("input", onSearch)

  // Arc filter
  document.getElementById("arc-filter").addEventListener("change", onFilterChange)

  // Analyze button
  document.getElementById("btn-analyze").addEventListener("click", runAnalysis)

  // Export button
  document.getElementById("btn-export").addEventListener("click", exportJSON)

  // Panel close
  document.getElementById("panel-close").addEventListener("click", () => {
    document.getElementById("panel").hidden = true
  })

  // Drag and drop file
  document.body.addEventListener("dragover", (e) => { e.preventDefault() })
  document.body.addEventListener("drop", onFileDrop)

  // Try to load from URL param, dev server, or default file
  const params = new URLSearchParams(window.location.search)
  const fileParam = params.get("file")

  if (fileParam) {
    loadGraph(fileParam)
  } else {
    // Try dev server first, fall back to default file
    try {
      const resp = await fetch("http://localhost:5173/api/graph", { signal: AbortSignal.timeout(2000) })
      if (resp.ok) {
        const data = await resp.json()
        return renderGraph(data)
      }
    } catch {}
    // Fallback to default graph file
    loadGraph("../../design/game-graph.json")
  }
}

async function loadGraph(path) {
  try {
    const resp = await fetch(path)
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const data = await resp.json()
    renderGraph(data)
    setStatus(`Loaded: ${path}`)
  } catch (err) {
    setStatus(`Error: ${err.message} — drag a game-graph.json file onto this page`)
  }
}

function onFileDrop(event) {
  event.preventDefault()
  const file = event.dataTransfer.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result)
      renderGraph(data)
      setStatus(`Loaded: ${file.name}`)
    } catch (err) {
      setStatus(`Error parsing JSON: ${err.message}`)
    }
  }
  reader.readAsText(file)
}

function inferArc(nodeId, arcs) {
  if (!arcs) return "default"
  for (const [arcId, arc] of Object.entries(arcs)) {
    if (arc.nodeIds && arc.nodeIds.includes(nodeId)) return arcId
  }
  // Fallback: infer from name prefix
  if (nodeId.startsWith("PLAYER_") || nodeId.startsWith("GAME_")) return "player"
  if (nodeId.startsWith("Z") || nodeId.startsWith("GAP")) return "level"
  if (nodeId.startsWith("GEM_")) return "economy"
  if (nodeId.startsWith("ENEMY_")) return "enemies"
  return "default"
}

function renderGraph(data) {
  graphData = data
  const nodes = []
  const links = []
  const arcs = data.content?.arcs || {}

  // Build nodes
  if (data.topology?.nodes) {
    for (const [id, node] of Object.entries(data.topology.nodes)) {
      nodes.push({
        id,
        ...node,
        arc: node.arcId || inferArc(id, arcs),
      })
    }
  }

  // Build links
  if (data.topology?.transitions) {
    for (const [id, t] of Object.entries(data.topology.transitions)) {
      links.push({
        id,
        source: t.source,
        target: t.target,
        label: t.label || "",
        conditions: t.conditions || [],
        mutations: t.mutations || [],
        events: t.events || [],
      })
    }
  }

  // Populate arc filter
  const filter = document.getElementById("arc-filter")
  filter.innerHTML = '<option value="all">All Systems</option>'
  const uniqueArcs = [...new Set(nodes.map(n => n.arc))]
  for (const arc of uniqueArcs) {
    const opt = document.createElement("option")
    opt.value = arc
    opt.textContent = arc.charAt(0).toUpperCase() + arc.slice(1)
    filter.appendChild(opt)
  }

  const width = svg.node().clientWidth
  const height = svg.node().clientHeight

  // Clear previous
  g.selectAll("*").remove()
  linkGroup = g.append("g").attr("class", "links")
  linkLabelGroup = g.append("g").attr("class", "link-labels")
  nodeGroup = g.append("g").attr("class", "nodes")
  labelGroup = g.append("g").attr("class", "labels")

  // Force simulation
  simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id(d => d.id).distance(140))
    .force("charge", d3.forceManyBody().strength(-400))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collision", d3.forceCollide(30))

  // Links
  const link = linkGroup.selectAll("line")
    .data(links).join("line")
    .attr("class", "link")
    .attr("stroke-width", 1.5)
    .on("click", (event, d) => showTransitionDetail(d))
    .on("mouseover", function () { d3.select(this).attr("stroke", "#fff").attr("stroke-width", 2.5) })
    .on("mouseout", function () { d3.select(this).attr("stroke", "#555").attr("stroke-width", 1.5) })

  // Link labels
  const linkLabel = linkLabelGroup.selectAll("text")
    .data(links.filter(l => l.label)).join("text")
    .attr("class", "link-label")
    .text(d => d.label)

  // Nodes
  const node = nodeGroup.selectAll("circle")
    .data(nodes).join("circle")
    .attr("r", 10)
    .attr("class", d => `arc-${d.arc}`)
    .on("click", (event, d) => showNodeDetail(d, data))
    .on("mouseover", function () { d3.select(this).attr("r", 14) })
    .on("mouseout", function () { d3.select(this).attr("r", 10) })
    .call(d3.drag()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart()
        d.fx = d.x
        d.fy = d.y
      })
      .on("drag", (event, d) => {
        d.fx = event.x
        d.fy = event.y
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0)
        d.fx = null
        d.fy = null
      }))

  // Node labels
  const label = labelGroup.selectAll("text")
    .data(nodes).join("text")
    .text(d => d.id)
    .attr("dx", 14)
    .attr("dy", 4)
    .attr("font-size", "10px")
    .attr("fill", "#ccc")
    .attr("font-family", "monospace")

  // Tick
  simulation.on("tick", () => {
    link
      .attr("x1", d => d.source.x).attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x).attr("y2", d => d.target.y)

    linkLabel
      .attr("x", d => (d.source.x + d.target.x) / 2)
      .attr("y", d => (d.source.y + d.target.y) / 2)

    node
      .attr("cx", d => d.x).attr("cy", d => d.y)

    label
      .attr("x", d => d.x).attr("y", d => d.y)
  })

  setStatus(`${nodes.length} nodes, ${links.length} transitions`)
}

function showNodeDetail(d, data) {
  const panel = document.getElementById("panel")
  const title = document.getElementById("panel-title")
  const body = document.getElementById("panel-body")
  const env = data.environment || {}
  const vars = env.variables || {}

  title.textContent = d.id
  let html = `<table>`
  html += `<tr><td>System</td><td>${d.arc || "—"}</td></tr>`
  html += `<tr><td>Scene</td><td>${d.sceneId || "—"}</td></tr>`

  // Find outgoing transitions
  const outgoing = []
  if (data.topology?.transitions) {
    for (const [id, t] of Object.entries(data.topology.transitions)) {
      if (t.source === d.id) {
        const conditions = (t.conditions || []).map(c => `${c.variableId} ${c.operator} ${c.value}`).join(", ")
        const mutations = (t.mutations || []).map(m => `${m.variableId} ${m.operator} ${m.value}`).join(", ")
        const events = (t.events || []).map(e => e.eventId).join(", ")
        outgoing.push({
          id, target: t.target, label: t.label, conditions, mutations, events
        })
      }
    }
  }

  if (outgoing.length > 0) {
    html += `<tr><td>Transitions</td><td>${outgoing.length}</td></tr>`
    html += `</table><h4>Outgoing</h4>`
    for (const o of outgoing) {
      html += `<div style="margin:4px 0;padding:4px;background:#222;border-radius:4px;font-size:12px">`
      html += `<b>${o.id}</b> → ${o.target}`
      if (o.label) html += `<br/><span style="color:#888">${o.label}</span>`
      if (o.conditions) html += `<br/><span style="color:#ffd700">if ${o.conditions}</span>`
      if (o.mutations) html += `<br/><span style="color:#44cc44">${o.mutations}</span>`
      if (o.events) html += `<br/><span style="color:#00aaff">🔊 ${o.events}</span>`
      html += `</div>`
    }
  } else {
    html += `</table>`
  }

  // Show relevant variables
  const relevantVars = Object.entries(vars).filter(([k]) =>
    k.startsWith(d.arc) || k.includes(d.id.toLowerCase())
  )
  if (relevantVars.length > 0) {
    html += `<h4>Variables</h4><table>`
    for (const [k, v] of relevantVars) {
      html += `<tr><td>${k}</td><td>${v.type}: ${v.defaultValue}</td></tr>`
    }
    html += `</table>`
  }

  body.innerHTML = html
  panel.hidden = false
}

function showTransitionDetail(d) {
  const panel = document.getElementById("panel")
  const title = document.getElementById("panel-title")
  const body = document.getElementById("panel-body")

  title.textContent = d.id
  let html = `<table>`
  html += `<tr><td>From</td><td>${d.source.id || d.source}</td></tr>`
  html += `<tr><td>To</td><td>${d.target.id || d.target}</td></tr>`
  if (d.label) html += `<tr><td>Label</td><td>${d.label}</td></tr>`
  html += `</table>`

  if (d.conditions && d.conditions.length > 0) {
    html += `<h4>Conditions</h4>`
    for (const c of d.conditions) {
      html += `<div style="color:#ffd700">${c.variableId} ${c.operator} ${JSON.stringify(c.value)}</div>`
    }
  }

  if (d.mutations && d.mutations.length > 0) {
    html += `<h4>Mutations</h4>`
    for (const m of d.mutations) {
      html += `<div style="color:#44cc44">${m.variableId} ${m.operator} ${JSON.stringify(m.value)}</div>`
    }
  }

  if (d.events && d.events.length > 0) {
    html += `<h4>Events</h4>`
    for (const e of d.events) {
      html += `<div style="color:#00aaff">🔊 ${e.eventId}</div>`
    }
  }

  body.innerHTML = html
  panel.hidden = false
}

function onSearch() {
  const query = document.getElementById("search").value.toLowerCase()
  nodeGroup.selectAll("circle").attr("opacity", d => {
    if (!query) return 1
    return d.id.toLowerCase().includes(query) ? 1 : 0.15
  })
  labelGroup.selectAll("text").attr("opacity", d => {
    if (!query) return 1
    return d.id.toLowerCase().includes(query) ? 1 : 0.15
  })
  linkGroup.selectAll("line").attr("opacity", d => {
    if (!query) return 0.6
    const src = (d.source.id || d.source).toLowerCase()
    const tgt = (d.target.id || d.target).toLowerCase()
    return (src.includes(query) || tgt.includes(query)) ? 0.8 : 0.05
  })
  linkLabelGroup.selectAll("text").attr("opacity", d => {
    if (!query) return 0.6
    const src = (d.source.id || d.source).toLowerCase()
    const tgt = (d.target.id || d.target).toLowerCase()
    return (src.includes(query) || tgt.includes(query)) ? 0.8 : 0.05
  })
}

function onFilterChange() {
  const arc = document.getElementById("arc-filter").value
  nodeGroup.selectAll("circle").attr("opacity", d => {
    if (arc === "all") return 1
    return d.arc === arc ? 1 : 0.1
  })
  labelGroup.selectAll("text").attr("opacity", d => {
    if (arc === "all") return 1
    return d.arc === arc ? 1 : 0.1
  })
  linkGroup.selectAll("line").attr("opacity", d => {
    if (arc === "all") return 0.6
    const srcArc = typeof d.source === "object" ? d.source.arc : null
    const tgtArc = typeof d.target === "object" ? d.target.arc : null
    return (srcArc === arc || tgtArc === arc) ? 0.8 : 0.03
  })
  linkLabelGroup.selectAll("text").attr("opacity", d => {
    if (arc === "all") return 0.6
    const srcArc = typeof d.source === "object" ? d.source.arc : null
    const tgtArc = typeof d.target === "object" ? d.target.arc : null
    return (srcArc === arc || tgtArc === arc) ? 0.8 : 0.03
  })
}

function runAnalysis() {
  if (!graphData) return
  const panel = document.getElementById("analysis-panel")
  let html = "<h4>Analysis</h4>"

  // Check for unreachable nodes (no incoming transitions)
  const nodes = graphData.topology?.nodes || {}
  const transitions = graphData.topology?.transitions || {}
  const targets = new Set(Object.values(transitions).map(t => t.target))
  const unreachable = Object.keys(nodes).filter(id => !targets.has(id))

  if (unreachable.length > 0) {
    html += `<div class="analysis-warn">Unreachable nodes (no incoming edges): ${unreachable.join(", ")}</div>`
  } else {
    html += `<div class="analysis-pass">All nodes reachable ✓</div>`
  }

  // Check for dead ends (nodes with no outgoing transitions)
  const sources = new Set(Object.values(transitions).map(t => t.source))
  const deadends = Object.keys(nodes).filter(id => !sources.has(id) && id !== "GAME_CLEARED" && id !== "GAME_OVER")
  if (deadends.length > 0) {
    html += `<div class="analysis-warn">Dead-end nodes: ${deadends.join(", ")}</div>`
  }

  // Variable scope check
  const vars = graphData.environment?.variables || {}
  const usedVars = new Set()
  for (const t of Object.values(transitions)) {
    for (const c of t.conditions || []) usedVars.add(c.variableId)
    for (const m of t.mutations || []) usedVars.add(m.variableId)
  }
  const declared = new Set(Object.keys(vars))
  const undeclared = [...usedVars].filter(v => !declared.has(v))
  const unused = [...declared].filter(v => !usedVars.has(v))

  if (undeclared.length > 0) {
    html += `<div class="analysis-fail">Used but not declared: ${undeclared.join(", ")}</div>`
  }
  if (unused.length > 0) {
    html += `<div class="analysis-warn">Declared but never used: ${unused.join(", ")}</div>`
  }

  html += `<div class="analysis-pass">${Object.keys(nodes).length} nodes, ${Object.keys(transitions).length} transitions, ${Object.keys(vars).length} variables</div>`
  panel.innerHTML = html
  panel.hidden = false
  setTimeout(() => panel.hidden = true, 10000)
}

function exportJSON() {
  if (!graphData) return
  const blob = new Blob([JSON.stringify(graphData, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "game-graph.json"
  a.click()
  URL.revokeObjectURL(url)
  setStatus("Exported game-graph.json")
}

function setStatus(msg) {
  document.getElementById("status").textContent = msg
}

document.addEventListener("DOMContentLoaded", init)
