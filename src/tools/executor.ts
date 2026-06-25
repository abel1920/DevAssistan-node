import * as fs from "fs"
import * as path from "path"


// obtener directorio Raiz
const PROJECT_ROOT = process.cwd()

//limitar archivo para evitar que se cosumen los tokens
const MAX_FILE_SIZE = 50_000;
//limitar resultados de busqueda cuando se busca codigo
const MAX_SEARCH_RESULT = 20;

//delimitar lineas de contexto al buscar contexto
const CONTEXT_LINES = 2;


//Funcion para evitar que una ruta salga del proyecto
function resolveSecurePath(targetPath: string): string | null {
    const absolutePath = path.resolve(PROJECT_ROOT, targetPath)
    const projectwithSep = PROJECT_ROOT + path.sep
    if (!absolutePath.startsWith(projectwithSep) && absolutePath !== PROJECT_ROOT) {
        return null
    }
    return absolutePath
}

//Funcion para obtener todos los archivos de un directorio y subdirectorios, opcionalmente filtrando por extension
// Aqui se usa recursividad para recorrer los subdirectorios y obtener todos los archivos que cumplan con la extension especificada. Se omiten los directorios "node_modules" 
// y los archivos/directorios que comiencen con un punto (.) para evitar incluir archivos ocultos o dependencias externas.q
async function collectFiles(dirPath: string, extension?: string): Promise<string[]> {

    const result: string[] = []
    //entradas del directorio
    let entries;
    try {
        // Leer el contenido del directorio de manera segura
        entries = await fs.promises.readdir(dirPath, { withFileTypes: true })
    } catch {
        return result
    }

    // Iterar sobre cada entrada en el directorio
    for (const entry of entries) {
        // Omitir directorios "node_modules" y archivos/directorios ocultos (que comienzan con un punto)
        if (entry.name === "node_modules" || entry.name.startsWith(".")) {
            continue
        }
        // Construir la ruta completa de la entrada
        const fullPath = path.join(dirPath, entry.name)
        if (entry.isDirectory()) {
            const subFiles = await collectFiles(fullPath, extension)
            result.push(...subFiles)
        } else if (entry.isFile()) {
            if (!extension || entry.name.endsWith(extension)) {
                result.push(fullPath)
            }
        }
    }
    return result
}

async function executeListFiles(params: {
    path: string,
    extension?: string
}): Promise<string> {
    const securePath = resolveSecurePath(params.path)
    if (!securePath) {
        return `Error de Seguridad: "${params.path}" intenta acceder fuera del proyecto`
    }
    try {
        // Verificar si el directorio existe y es un directorio
        const stat = await fs.promises.stat(securePath)
        if (!stat.isDirectory()) {
            return `Error: el directorio "${params.path}" no existe`
        }
        //Manejo de errores amigable para la IA
    } catch (error) {
        return `Error: el directorio "${params.path}" no existe`
    }
    const files = await collectFiles(securePath, params.extension)

    if (files.length === 0) {
        const filterFile = params.extension ? `con extesion ${params.extension}` : `sin extesion`
        return `Directorio vacio ${filterFile} en "${params.path}"`
    }
    const relativePaths = files.map((file) => path.relative(PROJECT_ROOT, file))
    return relativePaths.join("\n")
}

async function executeReadFile(params: {
    file_path: string
}): Promise<string> {
    const securePath = resolveSecurePath(params.file_path)
    if (!securePath) {
        return `Error de Seguridad: "${params.file_path}" intenta acceder fuera del proyecto`
    }
    try {
        const stat = await fs.promises.stat(securePath)
        if (stat.isDirectory()) {
            return `Error: "${params.file_path}" es un directorio, no un archivo`
        }
        if (stat.size > MAX_FILE_SIZE) {
            return `Error: el archivo "${params.file_path}" excede el tamaño máximo permitido de ${MAX_FILE_SIZE} bytes`
        }
        const content = await fs.promises.readFile(securePath, "utf-8")
        if (content.length > MAX_FILE_SIZE) {
            return content.slice(0, MAX_FILE_SIZE) + `\n\n[El contenido del archivo ha sido truncado a ${MAX_FILE_SIZE} bytes]`
        }
        return content
    } catch (error) {
        const err = error as NodeJS.ErrnoException
        if (err.code === 'ENOENT') {
            return `Error: el archivo "${params.file_path}" no existe`
        }
        return `Error: Al leer el archivo "${params.file_path}"`

    }
}

async function executeSearchCode(params: {
    pattern: string,
    path?: string,
    file_extension?: string
}): Promise<string> {
    const searchPath = params.path ?? "."
    const securePath = resolveSecurePath(searchPath)
    if (!securePath) {
        return `Error de Seguridad: "${searchPath}" intenta acceder fuera del proyecto`
    }
    const files = await collectFiles(securePath, params.file_extension)
    const results: string[] = []
    let totalMatches = 0
    for (const file of files) {
        if (totalMatches >= MAX_SEARCH_RESULT) break
        let content: string
        try {
            content = await fs.promises.readFile(file, "utf-8")
        } catch (error) {
            continue
        }
        const lines = content.split("\n")
        for (let i = 0; i < lines.length; i++) {
            if (totalMatches >= MAX_SEARCH_RESULT) break
            const line = lines[i] ?? ""
            if (!line.includes(params.pattern)) continue
            totalMatches++
            const contextBloc: string[] = []
            const startLine = Math.max(0, i - CONTEXT_LINES)
            const endLine = Math.min(lines.length - 1, i + CONTEXT_LINES)
            for (let j = startLine; j <= endLine; j++) {
                const contextLine = lines[j] ?? "";
                const lineNumber = j + 1
                const prefix = j === i ? ">" : "   "
                contextBloc.push(`${prefix}${lineNumber}: ${contextLine}`)
            }
            results.push(contextBloc.join("\n"))
        }
    }
    if (results.length === 0) {
        return `Sin coincidencias para "${params.pattern}"`
    }
    const header = totalMatches >= MAX_SEARCH_RESULT
        ? `Coincidencias ${MAX_SEARCH_RESULT} `
        : `Resultados para: ${totalMatches}`
    return header + results.join("\n\n")
}

export async function executeTool(
  name: string,
  params: Record<string, unknown>,
): Promise<string> {
  switch (name) {
    case "list_files": {
      const p = params as { path?: unknown; extension?: unknown };
      if (typeof p.path !== "string") {
        return "Error: el parámetro 'path' es requerido y debe ser string.";
      }
      return executeListFiles({
        path: p.path,
        extension: typeof p.extension === "string" ? p.extension : undefined,
      });
    }

    case "read_file": {
      const p = params as { file_path?: unknown };
      if (typeof p.file_path !== "string") {
        return "Error: el parámetro 'file_path' es requerido y debe ser string.";
      }
      return executeReadFile({ file_path: p.file_path });
    }

    case "search_code": {
      const p = params as {
        pattern: unknown;
        path?: unknown;
        file_extension?: unknown;
      };
      if (typeof p.pattern !== "string") {
        return "Error: el parámetro 'pattern' es requerido y debe ser string.";
      }
      return executeSearchCode({
        pattern: p.pattern,
        path: typeof p.path === "string" ? p.path : undefined,
        file_extension:
          typeof p.file_extension === "string" ? p.file_extension : undefined,
      });
    }
    default:
      return `Error: tool desconocida "${name}. Tools disponibles: list_files,read_file, search_code."`;
  }
}