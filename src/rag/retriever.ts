import config from "../config.js"
import { RetrievedChunk } from "../types.js"
import { generateEmbedding } from "./embeddings.js"
import { VectorStore } from "./vector-store.js"

let vectorStoreInstance: VectorStore | null = null

function getStore(): VectorStore {
    if (!vectorStoreInstance) {
        vectorStoreInstance = new VectorStore(config.dbPath)
    }
    return vectorStoreInstance
}

export async function retrieveContext(query: string, topk: number = config.ragTopK): Promise<RetrievedChunk[]> {
    const store = getStore()
    if (store.size === 0) {
        console.log("Vectore store vacio- usa/ingest para cargar la documentacion")
        return []
    }
    const embedding = await generateEmbedding(query)
    const topSearchResults = store.search(embedding, topk)
    const chunks: RetrievedChunk[] = topSearchResults.map((result) => ({
        ...result.chunk,
        score: result.score
    }))
    const preview = query.length > 50 ? query.slice(0, 50) + "..." : query
    console.log(`Buscando: ${preview} -- ${chunks.length} chunks recuperados`)
    return chunks
}

export function resetStore() {
    if (vectorStoreInstance) {
        vectorStoreInstance.close()
        vectorStoreInstance = null
        console.log("Store reseteado")
    }
}