import * as fs from "fs/promises"
import * as path from "path"
import type { Chunk } from "../types.js"

const MAX_CHUNK_SIZE = 2000

export function chunkMardown(content: string, filePath: string): Chunk[] {
    const fileName = path.basename(filePath)
    const chunks: Chunk[] = []
    const sections = content.split(/(?=^## )/m);
    let globalPosition = 0
    let lastParagraph = ""

    //Parrafo completo
    for (const section of sections) {
        if (!section.trim()) continue
        const lines = section.split("\n")
        const firstLine = lines[0] ?? ""
        const isHeading = firstLine.startsWith("##")
        const heading = isHeading ? firstLine.trim() : "(Introducciones)"

        if (section.length <= MAX_CHUNK_SIZE) {
            const chunkContent = lastParagraph ? `${lastParagraph}\n\n${section.trim()}` : section.trim()
            lastParagraph = ""
            chunks.push({
                id: `${fileName}-${globalPosition}`,
                content: chunkContent,
                metadata: {
                    source: fileName,
                    heading,
                    position: globalPosition,
                    charCount: chunkContent.length,
                },
            })
            const paragraphs = section.trim().split(/\n\n+/)
            lastParagraph = paragraphs[paragraphs.length - 1] ?? ""
            globalPosition++
            continue
        }

        const paragraphs = section.split(/\n\n+/).filter(p => p.trim().length > 0)
        let currentChunk = lastParagraph ? `${lastParagraph} \n\n` : ""
        for (let index = 0; index < paragraphs.length; index++) {
            const paragraph = paragraphs[index] ?? ""
            if (currentChunk.length > 0 && currentChunk.length + paragraph.length > MAX_CHUNK_SIZE) {
                const chunkContent = isHeading
                    ? `${heading}\n\n${currentChunk.trim()}`
                    : currentChunk.trim()
                chunks.push({
                    id: `${fileName}-${globalPosition}`,
                    content: chunkContent,
                    metadata: {
                        source: fileName,
                        heading,
                        position: globalPosition,
                        charCount: chunkContent.length,
                    },
                })
                const chunkParagraphs = currentChunk.trim().split(/\n\n+/)
                lastParagraph = chunkParagraphs[chunkParagraphs.length - 1] ?? ""
                currentChunk = `${lastParagraph}\n\n`
                globalPosition++
            }
            currentChunk += paragraph + "\n\n"
        }
        if (currentChunk.trim().length > 0) {
            const chunkContent = isHeading
                ? `${heading}\n\n${currentChunk.trim()}`
                : currentChunk.trim()
            chunks.push({
                id: `${fileName}-${globalPosition}`,
                content: chunkContent,
                metadata: {
                    source: fileName,
                    heading,
                    position: globalPosition,
                    charCount: chunkContent.length,
                },
            })
            const finalParagraphs = currentChunk.trim().split(/\n\n+/)
            lastParagraph = finalParagraphs[finalParagraphs.length - 1] ?? ""
            globalPosition++
        }
    }

    return chunks
}

// funcion para leer archivos markdown
export async function proccesDirectory(directoryPath: string,): Promise<Chunk[]> {
    const allChunk: Chunk[] = []
    let entries;
    try {
        //lee el directorio y almacena los archivos en entries
        entries = await fs.readdir(directoryPath, { withFileTypes: true })
    } catch (error) {
        throw new Error(`Error al leer el directorio ${directoryPath}: ${error}`)
    }

    //filtra los archivos que sean markdown y los ordena alfabeticamente
    const markdownFiles = entries.filter(entry => entry.isFile() && entry.name.endsWith(".md"))
        .sort((a, b) => a.name.localeCompare(b.name))

    //lee cada archivo markdown y lo chunk
    for (const file of markdownFiles) {
        const fullPath = path.join(directoryPath, file.name)
        let content: string
        try {
            content = await fs.readFile(fullPath, "utf-8")
        } catch (error) {
            console.warn(`Error al leer el archivo ${fullPath}: ${error}`)
            continue
        }
        const chunks = chunkMardown(content, file.name)
        allChunk.push(...chunks)
        console.log(`Procesando archivo: ${file.name}... Chunks agregados: ${chunks.length}`)
    }
    return allChunk

}