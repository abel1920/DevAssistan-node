import { config } from "../config.js";
import { client } from "../llm/anthropic-client.js";
import { Message } from "../types.js";

const CHARS_PER_TOKEN = 4

export class Conversation {
    private messages: Message[] = []
    private systemPrompt: string;
    private totalInputsTokens: number = 0
    private totalOuputsTokens: number = 0

    // PARÉNTESIS ()
    constructor(systemPrompt: string = "")
    //        ↑ Los parámetros van AQUÍ
    //        Esto significa: "Este constructor recibe un parámetro llamado systemPrompt"
    {
        this.systemPrompt = systemPrompt
    }
    // ↑ El CUERPO (lo que hace) va AQUÍ

    addUserMessage(text: string): void {

        this.messages.push({
            role: "user",
            content: text
        })
    }

    addAssistantMessage(text: string): void {
        this.messages.push({
            role: "assistant",
            content: text
        })
    }

    async send(): Promise<string> {
        const response = await client.messages.create({
            model: config.anthropicModel,
            max_tokens: 1024,
            ...(this.systemPrompt && { system: this.systemPrompt }),
            messages: this.messages,
        });
        //TODO
        // this.totalInputsTokens += response.usage.input_tokens;
        // this.totalOuputsTokens += response.usage.output_tokens;
        this.addUsage(response.usage.input_tokens, response.usage.output_tokens)
        const textBlock = response.content.find((block) => block.type === "text")
        if (!textBlock || textBlock.type !== "text") {
            throw new Error("Claude no retorno un bloque de texto en la respuesta");
        }
        const responseText = textBlock.text
        this.addAssistantMessage(responseText)
        return responseText
    }

    addUsage(input_tokens: number, output_tokens: number) {
        this.totalInputsTokens += input_tokens;
        this.totalOuputsTokens += output_tokens;
    }

    //Limpia la conversación y los contadores.
    clear(): void {
        this.messages = []
        this.totalInputsTokens = 0
        this.totalOuputsTokens = 0
        console.log("Conversacion limpiada")
    }

    //Calcula cuántos “turnos” hay en la conversación
    //útil para saber cuántas preguntas/respuestas han ocurrido
    getTurnCount(): number {
        return Math.floor(this.messages.length / 2)
    }

    //Hace una estimación simple de tokens a partir de caracteres:
    estimateCurrentTokens(): number {
        const totalChars = this.messages.reduce((sum, msg) => sum + msg.content.length, 0)
        return Math.floor(totalChars / CHARS_PER_TOKEN);
    }

    //Devuelve estadísticas
    getStats(): {
        inputTokens: number;
        outputTokens: number;
        turns: number
    } {
        return {
            inputTokens: this.totalInputsTokens,
            outputTokens: this.totalOuputsTokens,
            turns: this.getTurnCount()
        }
    }

    //Devuelve una copia del historial:
    getHistory(): Message[] {
        return [
            ...
            this.messages
        ]
    }


}