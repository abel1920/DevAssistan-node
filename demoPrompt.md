╔════════════════════════════════════════╗
║        DevAssistant - Curso IA         ║
║            System Prompt               ║
╚════════════════════════════════════════╝

Demo 1: Enviando codigo Sin system prompt

--------------------------------------------------
Respuesta: # Revisión de Código

Encontré varios problemas importantes. Te los explico:

## 🔴 Problemas Críticos

### 1. Inyección SQL
```javascript
// ❌ PELIGROSO - Vulnerable a SQL Injection
const query = "SELECT * FROM users WHERE id = " + id;

// ✅ CORRECTO - Usar consultas parametrizadas
const query = "SELECT * FROM users WHERE id = ?";
const result = await db.query(query, [id]);
```

## 🟡 Problemas Moderados

### 2. Sin validación de entrada
```javascript
// ❌ Sin validación
async function getUser(id) { ... }

// ✅ Con validación
async function getUser(id) {
  if (!id || isNaN(id) || id <= 0) {
    throw new Error("ID de usuario inválido");
  }
  // ...
}
```

### 3. Sin manejo de errores
```javascript
// ❌ Sin manejo de errores
const result = await db.query(query, [id]);
return result[0];

// ✅ Con manejo de errores
try {
  const result = await db.query(query, [id]);
  return result[0] ?? null; // Retorna null si no existe
} catch (error) {
  console.error("Error al obtener usuario:", error);
  throw error;
}
```

### 4. Uso de `==` en lugar de `===`
```javascript
// ❌ Comparación débil (no verifica tipo)
if (tipo == "vip")

// ✅ Comparación estricta
if (tipo === "vip")
```

## 🟢 Mejoras Adicionales

### 5. Reemplazar if-else por estructura más limpia
```javascript
// ✅ Más mantenible y escalable
const DESCUENTOS = {
  vip: 0.8,
  regular: 0.9,
};

function calcularDescuento(precio, tipo) {
  if (typeof precio !== "number" || precio < 0) {
    throw new Error("Precio inválido");
  }

  const factor = DESCUENTOS[tipo] ?? 1;
  return precio * factor;
}
```

## ✅ Código Final Corregido

```javascript
const DESCUENTOS = {
  vip: 0.8,
  regular: 0.9,
};

async function getUser(id) {
  if (!id || isNaN(id) || id <= 0) {
    throw new Error("ID de usuario inválido");
  }

  try {
    const result = await db.query(
      "SELECT * FROM users WHERE id = ?",
      [id]
    );
    return result[0] ?? null;
  } catch (error) {
    console.error("Error al obtener usuario:", error);
    throw error;
  }
}

function calcularDescuento(precio, tipo) {
  if (typeof precio !== "number" || precio < 0) {
    throw new Error("Precio inválido");
  }

  const factor = DESCUENTOS[tipo] ?? 1;
  return precio * factor;
}
```

## 📋 Resumen

| Problema | Severidad | Estado |
|---|---|---|
| SQL Injection | 🔴 Crítico | Corregido |
| Sin validación de inputs | 🟡 Moderado | Corregido |
| Sin manejo de errores | 🟡 Moderado | Corregido |
| Uso de `==` | 🟡 Moderado | Corregido |
| Estructura if-else | 🟢 Mejora | Optimizado |
--------------------------------------------------
Demo 2: Enviando codigo COn system prompt

--------------------------------------------------
Respuesta con System: ## Revisión de código — Utilidades de usuario y descuentos

Dos funciones cortas pero con problemas importantes que vale la pena corregir antes de que lleguen a producción.

---

## 🐛 Bugs

**`getUser` no maneja el caso donde el usuario no existe**
Si `result` está vacío, `result[0]` retorna `undefined` silenciosamente, lo que puede causar errores difíciles de rastrear más adelante.

---

## 🔒 Seguridad — CRÍTICO

**SQL Injection en `getUser`**
Concatenar el `id` directamente en la query es una vulnerabilidad grave. Un atacante puede pasar `id = "1 OR 1=1"` y obtener todos los usuarios.

```javascript
// ❌ Vulnerable
const query = "SELECT * FROM users WHERE id = " + id;

// ✅ Usar consultas parametrizadas
const query = "SELECT * FROM users WHERE id = ?";
const result = await db.query(query, [id]);
```

---

## ⚠️ Sugerencias

**1. Agregar validación de entrada y manejo de errores en `getUser`**
```javascript
async function getUser(id) {
  if (!id || isNaN(id)) {
    throw new Error("ID de usuario inválido");
  }

  try {
    const result = await db.query(
      "SELECT * FROM users WHERE id = ?", 
      [id]
    );
    
    if (!result || result.length === 0) {
      return null; // O lanzar: throw new Error("Usuario no encontrado")
    }
    
    return result[0];
  } catch (error) {
    // Loggear sin exponer detalles internos al caller
    console.error("Error al obtener usuario:", error);
    throw error;
  }
}
```

**2. Usar `===` en lugar de `==` en `calcularDescuento`**
El operador `==` hace coerción de tipos y puede dar resultados inesperados.
```javascript
// ❌ Comparación débil
if (tipo == "vip")

// ✅ Comparación estricta
if (tipo === "vip")
```

**3. Reemplazar if/else con una estructura más mantenible**
Si en el futuro agregas más tipos de descuento, el if/else crecerá sin control.
```javascript
const DESCUENTOS = {
  vip: 0.8,
  regular: 0.9,
};

function calcularDescuento(precio, tipo) {
  if (!precio || precio < 0) {
    throw new Error("Precio inválido");
  }

  const multiplicador = DESCUENTOS[tipo] ?? 1;
  return precio * multiplicador;
}
```

---

## ✅ Bien hecho

- Buen uso de `async/await` en lugar de callbacks o `.then()`
- Los nombres de funciones son claros e intuitivos
- La lógica de negocio está correctamente separada de la capa de datos

---

**Calificación: 4/10**

La estructura base tiene buenas intenciones, pero la SQL injection es un bloqueante para ir a producción. ¡La buena noticia es que los fixes son simples y rápidos de aplicar! Con los cambios sugeridos este código quedaría sólido. 💪
--------------------------------------------------