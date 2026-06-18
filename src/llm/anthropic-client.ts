import Anthropic from "@anthropic-ai/sdk"
import { config } from "../config.js";

//Este archivo es como un "cliente" que te conecta a Claude (la IA de Anthropic).
//  Similar a cómo usarías un cliente de base de datos en Node.j

//Crea una conexión con Anthropic usando tu API key.
const client = new Anthropic({ apiKey: config.anthropicApiKey })

export async function askClaude(prompt: string, systemPrompt?: string): Promise<string> {
    // 1️⃣ Construyes el mensaje
    //Se envia la pregunta, espera y responde( segurda en response)
    const response = await client.messages.create({
        model: config.anthropicModel,
        max_tokens: 1024,
        ...(systemPrompt && { system: systemPrompt }),
        messages: [
            {
                role: "user",
                content: prompt
            }
        ]
    });
    // 2️⃣ Buscas el bloque de texto en la respuesta
    //Claude no responde un string directametne si no un arreglo de objectos
    const textBlock = response.content.find((block) => block.type === "text")
    // 3️⃣ Si no hay texto, error
    if (!textBlock || textBlock.type !== "text") {
        throw new Error("Claude no retorno un bloque de texto en la respuesta");
    }
    // 4️⃣ Devuelves la respuesta de Claude
    return textBlock.text
}

export { client }
