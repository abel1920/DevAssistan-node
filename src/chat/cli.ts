import * as readline from 'readline'
import { Conversation } from './conversation.js';
import { DOCUMENTATION_ASSISTANT_PROMPT } from '../llm/prompts.js';
import { client } from '../llm/anthropic-client.js';
import { config } from '../config.js';

export async function startCLI(): Promise<void> {
    const rl = readline.createInterface(
        {
            input: process.stdin,
            output: process.stdout
        }
    )

    const conversation = new Conversation(DOCUMENTATION_ASSISTANT_PROMPT)
    console.log("╔════════════════════════════════════════╗");
    console.log("║          DevAssistant v0.1             ║");
    console.log("║    Asistente de Documentación IA       ║");
    console.log("╚════════════════════════════════════════╝");
    console.log("");
    console.log("💬 Escribe tu pregunta y presiona Enter.");
    console.log("   Comandos: /clear, /stats, /exit");
    console.log("");
    const promptUser = (): void => {
        rl.question("Tu", async (input) => {
            const userInput = input.trim()
            if (!userInput) {
                promptUser()
                return;
            }
            if (userInput === "/stats") {
                const stats = conversation.getStats();
                console.log(`\n📊 Estadísticas de la conversación:`);
                console.log(`   • Turnos: ${stats.turns}`);
                console.log(`   • Tokens de entrada acumulados: ${stats.inputToken}`);
                console.log(`   • Tokens de salida acumulados: ${stats.ouputTokens}`);
                console.log(`   • Tokens estimados en contexto actual: ${conversation.stimateCurrentTokens}\n`);
                promptUser();
                return;
            }
            if (userInput === "/exit" || userInput === "/salida") {
                const stats = conversation.getStats()
                console.log(`Resumen: ${stats.turns} turnos ` +
                    ` ${stats.inputToken} tokens de entrada` +
                    ` ${stats.ouputTokens} tokens de salida`
                )
                rl.close()
                return
            }
            if (userInput === "/clear" || userInput === "/limpiar") {

                conversation.clear();
                promptUser();
                return;
            }
            try {

                conversation.addUserMessage(userInput);
                process.stdout.write("\nClaude:")
                const record = conversation.getHistory()
                let fullMessages = ""
                const stream = client.messages.stream({
                    model: config.anthropicModel,
                    max_tokens :1024,
                    system:DOCUMENTATION_ASSISTANT_PROMPT,
                    messages:record,
                })
                stream.on("text",(chunk)=>{
                    process.stdout.write(chunk)
                    fullMessages += chunk
                })

                const finalMessage = await stream.finalMessage()
                conversation.addUsage(finalMessage.usage.input_tokens,finalMessage.usage.output_tokens)
                process.stdout.write("\n\n")
                conversation.addAssistanMessage(fullMessages)
            } catch (error) {
                const err = error as Error
                console.log(`Error: ${err.message}`)
            }
            promptUser()
        })

    }
    promptUser()
}