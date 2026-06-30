import * as fs from "fs/promises";
import * as path from "path";
import { ToolDefinition } from "../types.js";
import { retrieveContext } from "../rag/retriever.js";
import { TOOL_DEFINITIONS } from "../tools/definitions.js";
import { executeTool } from "../tools/executor.js";

// === Definiciones de las 2 tools nuevas ===

const SEARCH_DOCS_TOOL: ToolDefinition = {
  name: "search_docs",
  description:
    "Busca información en la documentación ingestada usando búsqueda semántica. " +
    "Úsala cuando el usuario pregunta sobre cómo usar una API, conceptos del sistema, " +
    "o cualquier información que podría estar en los docs técnicos del proyecto. " +
    "Requiere que los documentos estén cargados con el comando /ingest. " +
    "Retorna los fragmentos más relevantes con su fuente y sección.",
  input_schema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "La pregunta o tema a buscar en la documentación.",
      },
      top_k: {
        type: "number",
        description:
          "Número de fragmentos a recuperar (default: 5, máximo: 10).",
      },
    },
    required: ["query"],
  },
};
const CREATE_ISSUE_TOOL: ToolDefinition = {
  name: "create_issue",
  description:
    "Crea un issue o tarea en el directorio ./issues/ del proyecto. " +
    "Úsala cuando el usuario quiera reportar un bug, registrar una mejora, " +
    "o crear una tarea de seguimiento. " +
    "Los issues se guardan como archivos Markdown con numeración automática.",
  input_schema: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "Título conciso del issue.",
      },
      description: {
        type: "string",
        description: "Descripción detallada del problema o tarea.",
      },
      labels: {
        type: "array",
        items: { type: "string" },
        description:
          "Etiquetas opcionales (ej: ['bug', 'enhancement', 'documentation']).",
      },
      priority: {
        type: "string",
        enum: ["low", "medium", "high"],
        description: "Prioridad del issue (default: medium).",
      },
    },
    required: ["title", "description"],
  },
};

async function executeSearchDocs(
  params: {
    query: string;
    top_k?: number;
  }
): Promise<string> {
  try {
    const topk = Math.min(params.top_k ?? 5, 10);
    const chunks = await retrieveContext(params.query, topk)
    if (chunks.length === 0) {
      return (
        "No se encontraron documentos relevante para esta consulta" +
        "Asegurate de haber ingestado la documentacion con el comando / ingest"
      )
    }
    const result = chunks.map((chunk) => {
      const source = chunk.metadata.source
      const section = chunk.metadata.heading
      const score = (chunk.score * 100).toFixed(0)
      return `[Fuente: ${source} | Sección: ${section} | Relevancia: ${score}%]\n${chunk.content}`
    }).join("\n\n-----\n\n")
    return `Se encontraron ${chunks.length} Fragmentos relevantes :\n\n${result}`
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return `Error al buyscar en la documentacion: ${message}`
  }
}

async function executeCreateIssue(params: {
  title: string
  description: string
  labels?: string[]
  priority?: string
}): Promise<string> {
  try {
    const issuesDir = "./issues"
    await fs.mkdir(issuesDir, { recursive: true })
    const existingFiles = await fs.readdir(issuesDir)
    const existingIssues = existingFiles.filter(file => file.endsWith(".md"))
    const issueNumber = existingIssues.length + 1
    const formattedNumber = String(issueNumber).padStart(3, "0")
    const fileName = `issue-${formattedNumber}`
    const fullPath = path.join(issuesDir, `${fileName}`)

    const date = new Date().toISOString().substring(0, 10)
    const labesStr = params.labels?.join(", ") ?? "sin etiquetas"
    const priority = params.priority ?? "medium"
    const content = `# Issue #${issueNumber}: ${params.title}
        ## Metadata
        - **Fecha:** ${date}
        - **Prioridad:** ${priority}
        - **Etiquetas:** ${labesStr}
        - **Estado:** abierto
        ## Descripción
        ${params.description}
        ---
        *Issue creado automáticamente por DevAssistant*
        `;
    await fs.writeFile(fullPath, content, "utf-8")
    return (
      ` Issue **${formattedNumber}** creado exitosamente:` +
      `\n- **Título:** ${params.title}` +
      `\n- **Prioridad:** ${priority}` +
      `\n- **Etiquetas:** ${labesStr}` +
      `\n- **Estado:** abierto` +
      `\n- **Ubicación:** ${fullPath}`
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return `Error al crear el issue: ${message}`
  }
}


export const ALL_TOOL_DEFINITIONS: ToolDefinition[] =
  [
    ...TOOL_DEFINITIONS,
    SEARCH_DOCS_TOOL,
    CREATE_ISSUE_TOOL
  ]

export async function executeAnyTool(name: string, params: Record<string, unknown>): Promise<string> {
  switch (name) {
    case "list_files":
    case "create_issue":
    case "search_code":
      return executeTool(name, params)
    case "search_docs":
      return executeSearchDocs(params as { query: string, top_k?: number })
    case "create_issue":
      return executeCreateIssue(params as {
        title: string,
        description: string,
        labels?: string[],
        priority?: string
      });
    default:
      return `Herramienta desconocida: "${name}".
      Tools disponibles: list_files, search_code, search_docs, create_issue`
  }
}