import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js"
import { Project } from "ts-morph"
import path from "node:path"

const projectRoot = process.argv[2] || process.cwd()
const project = new Project({
  tsConfigFilePath: path.join(projectRoot, "tsconfig.json"),
  skipAddingFilesFromTsConfig: false,
})

const server = new Server(
  {
    name: "ts-compiler-mcp",
    version: "0.1.0",
  },
  { capabilities: { tools: {} } }
)

function relPath(absPath: string): string {
  return absPath.replace(projectRoot, "").replace(/\\/g, "/")
}

const LAYER_ORDER = ["core", "gameplay", "ai", "networking", "rendering", "ui", "tools"] as const
type Layer = (typeof LAYER_ORDER)[number]

const ALLOWED: Record<Layer, Layer[]> = {
  core: [],
  gameplay: ["core"],
  ai: ["core", "gameplay"],
  networking: ["core", "gameplay"],
  rendering: ["core"],
  ui: ["core", "gameplay"],
  tools: ["core", "gameplay", "ai", "networking", "rendering", "ui"],
}

function detectLayer(absPath: string): Layer | null {
  const normalized = absPath.replace(/\\/g, "/")
  const match = normalized.match(/\/src\/(core|gameplay|ai|networking|rendering|ui|tools)\//)
  return (match ? match[1] : null) as Layer | null
}

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "findSymbol",
      description: "Find a symbol by name across the codebase",
      inputSchema: {
        type: "object",
        properties: { name: { type: "string", description: "Symbol name" } },
        required: ["name"],
      },
    },
    {
      name: "findReferences",
      description: "Find all references to a symbol by name",
      inputSchema: {
        type: "object",
        properties: { name: { type: "string", description: "Symbol name" } },
        required: ["name"],
      },
    },
    {
      name: "checkAnyUsage",
      description: "Check a file for `any` type usage, type assertions, and non-null assertions",
      inputSchema: {
        type: "object",
        properties: { filePath: { type: "string", description: "Relative path to the file" } },
        required: ["filePath"],
      },
    },
    {
      name: "traceImports",
      description: "Trace all imports and exports for a file",
      inputSchema: {
        type: "object",
        properties: { filePath: { type: "string", description: "Relative path to the file" } },
        required: ["filePath"],
      },
    },
    {
      name: "checkBoundaryViolation",
      description: "Check if a file imports from a disallowed module layer",
      inputSchema: {
        type: "object",
        properties: { filePath: { type: "string", description: "Relative path to the file" } },
        required: ["filePath"],
      },
    },
  ],
}))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  switch (name) {
    case "findSymbol": {
      const symbolName = String(args?.name || "")
      for (const source of project.getSourceFiles()) {
        for (const [exportedName, declarations] of source.getExportedDeclarations()) {
          if (exportedName === symbolName) {
            const decl = declarations[0]
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      name: exportedName,
                      kind: decl.getKindName(),
                      file: relPath(source.getFilePath()),
                      line: decl.getStartLineNumber(),
                    },
                    null,
                    2
                  ),
                },
              ],
            }
          }
        }
      }
      return { content: [{ type: "text", text: `Symbol "${symbolName}" not found` }] }
    }

    case "findReferences": {
      const symbolName = String(args?.name || "")
      const refs: Array<{ file: string; line: number; text: string }> = []
      for (const source of project.getSourceFiles()) {
        const [declaration] = source.getExportedDeclarations().get(symbolName) || []
        if (declaration) {
          const refNodes = (declaration as any).findReferencesAsNodes()
          if (Array.isArray(refNodes)) {
            for (const node of refNodes) {
              const sf = node.getSourceFile()
              refs.push({
                file: relPath(sf.getFilePath()),
                line: node.getStartLineNumber(),
                text: node.getText().substring(0, 80),
              })
            }
          }
        }
      }
      if (refs.length === 0) {
        return { content: [{ type: "text", text: `No references found for "${symbolName}"` }] }
      }
      return { content: [{ type: "text", text: JSON.stringify(refs, null, 2) }] }
    }

    case "checkAnyUsage": {
      const filePath = String(args?.filePath || "")
      const sourceFile = project.getSourceFileOrThrow(path.join(projectRoot, filePath))
      const text = sourceFile.getFullText()
      const lines = text.split("\n")
      const anyMatches: Array<{ line: number; column: number }> = []
      const asMatches: Array<{ line: number; text: string }> = []
      const bangMatches: Array<{ line: number }> = []

      for (let i = 0; i < lines.length; i++) {
        let col = lines[i].indexOf("any")
        while (col !== -1) {
          const prev = col > 0 ? lines[i][col - 1] : " "
          const next = col + 3 < lines[i].length ? lines[i][col + 3] : " "
          if (/[\s,;:{}([<>=+\-*/|&!?]/.test(prev) && /[\s,;:{})\]>=\-+/|&!?\n\r]/.test(next)) {
            anyMatches.push({ line: i + 1, column: col + 1 })
          }
          col = lines[i].indexOf("any", col + 3)
        }
        const asMatch = lines[i].match(/\bas\s+(\w+)/)
        if (asMatch && asMatch[1] !== "const" && asMatch[1] !== "let" && asMatch[1] !== "var") {
          asMatches.push({ line: i + 1, text: lines[i].trim().substring(0, 60) })
        }
        if (/\)!\s/.test(lines[i]) || /\w+!\s/.test(lines[i])) {
          bangMatches.push({ line: i + 1 })
        }
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                file: filePath,
                anyKeywords: anyMatches,
                typeAssertions: asMatches,
                nonNullAssertions: bangMatches,
                totalIssues: anyMatches.length + asMatches.length + bangMatches.length,
              },
              null,
              2
            ),
          },
        ],
      }
    }

    case "traceImports": {
      const filePath = String(args?.filePath || "")
      const sourceFile = project.getSourceFileOrThrow(path.join(projectRoot, filePath))
      const imports = sourceFile.getImportDeclarations().map((imp) => ({
        module: imp.getModuleSpecifierValue(),
        namedImports: imp.getNamedImports().map((n) => n.getName()),
        defaultImport: imp.getDefaultImport()?.getText() || null,
      }))
      const exports = sourceFile.getExportDeclarations().map((exp) => ({
        module: exp.getModuleSpecifierValue(),
        namedExports: exp.getNamedExports().map((n) => n.getName()),
      }))
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ imports, exports, totalImports: imports.length }, null, 2),
          },
        ],
      }
    }

    case "checkBoundaryViolation": {
      const filePath = String(args?.filePath || "")
      const fullPath = path.resolve(projectRoot, filePath)
      const sourceFile = project.getSourceFileOrThrow(fullPath)
      const currentLayer = detectLayer(fullPath)

      if (!currentLayer) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                file: filePath,
                note: "File is not in src/<layer>/ — no boundaries to check",
                status: "SKIP",
              }),
            },
          ],
        }
      }

      const violations: Array<{ from: string; to: string; importPath: string }> = []
      const allowedLayers = ALLOWED[currentLayer]
      for (const imp of sourceFile.getImportDeclarations()) {
        const modulePath = imp.getModuleSpecifierValue()
        for (const layer of LAYER_ORDER) {
          if (modulePath.includes(`/${layer}/`)) {
            const allowed = allowedLayers
            if (!allowed.includes(layer) && layer !== currentLayer) {
              violations.push({ from: currentLayer, to: layer, importPath: modulePath })
            }
          }
        }
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                file: filePath,
                layer: currentLayer,
                violations: violations.length > 0 ? violations : "none",
                status: violations.length > 0 ? "VIOLATION" : "CLEAN",
              },
              null,
              2
            ),
          },
        ],
      }
    }

    default:
      throw new Error(`Unknown tool: ${name}`)
  }
})

async function main(): Promise<void> {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error("ts-compiler-mcp running on stdio")
}

main().catch(console.error)
