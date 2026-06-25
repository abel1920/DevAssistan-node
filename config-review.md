◇ injected env (9) from .env // tip: ⌘ override existing { override: true }
╔════════════════════════════════════════╗
║       DevAssistant — Code Reviewer     ║
╚════════════════════════════════════════╝

📄 Archivo: config.ts
   Ruta: C:\Users\jaz20\OneDrive\Escritorio\Educacion\dev-asistan\src\config.ts
   Líneas: 44 | Caracteres: 1793

Analizando con Claude...

────────────────────────────────────────────────────────────
## Code Review: `config.ts`

Archivo de configuración que carga variables de entorno y las valida para una app con soporte multi-provider (Anthropic/OpenAI). La lógica general es sólida, pero hay varios typos, un bug de seguridad y algunos detalles a pulir.

---

## ✅ Bien hecho

- Buena separación de responsabilidades con `getRequiredEnvVar` y `validateProvider`
- Uso correcto del operador `??` para defaults
- `parseInt` con radix explícito (base 10) — buena práctica
- Exportar tanto nombrado como default da flexibilidad al consumidor

---

## 🐛 Bugs

**1. Typo en el nombre del parámetro (línea 6)**
```ts
// ❌ Antes
function getRequiredEnvVar(name: string, defaultValude?: string): string {

// ✅ Después
function getRequiredEnvVar(name: string, defaultValue?: string): string {
```

**2. `ragTopK` puede resultar en `NaN` sin validación**
```ts
// ❌ Antes — si RAG_TOP_K="abc", ragTopK será NaN silenciosamente
ragTopK: parseInt(getRequiredEnvVar("RAG_TOP_K", "5"), 10),

// ✅ Después
const rawTopK = parseInt(getRequiredEnvVar("RAG_TOP_K", "5"), 10);
if (isNaN(rawTopK) || rawTopK <= 0) {
    throw new Error(`RAG_TOP_K debe ser un número entero positivo`);
}
// luego: ragTopK: rawTopK
```

**3. Mensajes de error incorrectos en `validateConfig` (líneas 34-38)**

Los mensajes dicen `ANTHROPIC_MODEL` y `OPENAI_MODEL` cuando en realidad se refieren a las **API keys**:
```ts
// ❌ Antes — mensaje engañoso
throw new Error(`ANTHROPIC_MODEL esta vacia. Agregla en tu archivo .env`);

// ✅ Después
throw new Error(`ANTHROPIC_API_KEY está vacía. Agrégala en tu archivo .env`);
throw new Error(`OPENAI_API_KEY está vacía. Agrégala en tu archivo .env`);
```

---

## 🔒 Seguridad

**Las API keys no deberían tener `""` como default válido**

Pasar `""` como default hace que `getRequiredEnvVar` retorne string vacío sin lanzar error. La validación queda delegada a `validateConfig`, que puede no llamarse siempre:
```ts
// ❌ Antes — acepta string vacío silenciosamente
anthropicApiKey: getRequiredEnvVar("ANTHROPIC_API_KEY", ""),

// ✅ Después — falla rápido si falta la key
anthropicApiKey: getRequiredEnvVar("ANTHROPIC_API_KEY"),
openaiApiKey: getRequiredEnvVar("OPENAI_API_KEY"),
```
> Si el provider es Anthropic, no tiene sentido cargar la app sin `ANTHROPIC_API_KEY`. Fail-fast es más seguro que fail-later.

---

## ⚠️ Sugerencias

**1. Typos en el mensaje de `validateProvider` (línea 16)**
```ts
// ❌ "Deve ser" (portugués) y falta espacio antes de "anthropic"
`MODEL_PROVIDER invalida: ${provider}. Deve ser"anthropic" o "openai" `

// ✅
`MODEL_PROVIDER inválida: "${provider}". Debe ser "anthropic" o "openai"`
```

**2. Considerar `MODEL_PROVIDER` dentro de `getRequiredEnvVar`**

Actualmente `MODEL_PROVIDER` se lee directamente con `process.env`, saltándose la función de utilidad:
```ts
// ❌ Inconsistente con el resto
const rawProvider =
-----------------------------------------------------------