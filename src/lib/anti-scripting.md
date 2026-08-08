# Mini-guia: detectar y evitar el scripting (defensive scripting)

El scripting (tambien llamado "defensive scripting" o "adversarial user")
es el patron en el que el anotador ignora lo que dice el modelo y responde
con lo que ya tenia planeado decir. Es la causa #1 de AUTO-FAIL en la
evaluacion S2S segun el criterio `Adversarial Users` de la guia oficial
(`src/lib/guide.md`).

Esta guia es un complemento operativo de `guide.md`. Lo que diga la guia
oficial siempre tiene prioridad.

---

## Que es el scripting

Un anotador entra con un **guion preescrito** (una lista de preguntas o
puntos) y lo recorre sin importar lo que responda el modelo. El indicio
mas claro: el modelo hace una **pregunta directa** y el anotador la ignora
para introducir su siguiente punto planificado.

> La regla de oro de `guide.md`: *"Priorizar flujo espontaneo, no entrevista
> preplanificada"* y *"Responder a las preguntas del modelo y seguir el
ujo"*.

---

## Como DETECTARLO (senal de alarma)

Aplica este test a cada turno del usuario. Un solo NO ya es motivo para
revisar el dialogo completo.

| Pregunta | Si respondes NO... |
|----------|--------------------|
| ¿El usuario respondio a la pregunta directa del modelo en su turno anterior? | Scripting |
| ¿El usuario reconocio lo que el modelo dijo antes de avanzar? | Scripting |
| ¿El usuario profundizo en la respuesta del modelo, o solo la despacho con una palabra? | Scripting sutil |
| ¿El usuario introdujo un punto NUEVO sin haber contestado el anterior? | Scripting |
| ¿El usuario repite la misma pregunta a ambos modelos (A y B) en el mismo orden? | Scripting + inconsistencia 1:1 |

### Patron flagrante (auto-fail directo)

| Turno | El modelo... | El usuario... |
|-------|-------------|---------------|
| A6 | da el lineup y pregunta "¿Ese es el festival que buscabas o es otro?" | ignora y pide "las fechas exactas" (A7) |
| A8 | pregunta "¿Piensas ir aunque las fechas no esten confirmadas?" | ignora y pregunta "¿vale la pena el costo?" (A9) |
| B8 | pregunta "¿Quieres ir o solo curiosidad?" | ignora y pide "repetir el lineup" (B8) |

### Patron sutil (tambien auto-fail)

El usuario **despacha** la pregunta con una palabra y en la **misma frase**
salta a su siguiente punto:

| Asistente | Usuario (MAL) |
|-----------|---------------|
| "¿Que ciudades te gustaria visitar?" | "Tokio y Kioto. Pero, ¿deberia considerar el Japan Rail Pass?" |

Parece que responde, pero en realidad esta recorriendo su lista. La
diferencia con un dialogo natural es que **no profundiza** en lo que el
modelo ofrecio.

---

## Como EVITARLO (5 reglas)

### 1. La regla del rebote (la mas importante)
Antes de cada turno del usuario, preguntate: *"¿El modelo me hizo una
pregunta en su ultimo turno?"*. Si la respuesta es SI, tu proxima
intervencion **debe empezar respondiendola**.

| Turno del modelo | Scripting | Natural |
|------------------|-----------|---------|
| "¿Ese es el festival que buscabas?" | "¿Cuales son las fechas?" | **"Si, ese mismo."** ¿Tienes las fechas exactas? |
| "¿Piensas ir aunque no haya fechas?" | "¿Vale la pena el precio?" | **"Depende del precio, por eso pregunto."** |
| "¿Quieres ir o solo curiosidad?" | "Repite el lineup" | **"Tengo curiosidad mainly."** ¿Me repites el lineup? |

Solo agregar "si / no / depende" + una palabra de reconocimiento ya
rompe el patron.

### 2. Entra con objetivo, no con guion
- **Mal:** "Tengo 5 preguntas sobre festivales" -> ignoras al modelo.
- **Bien:** "Quiero saber si vale la pena ir" -> respondes al modelo.

### 3. Profundiza, no despaches
Cuando el modelo te de una respuesta, **haz una pregunta de seguimiento
sobre esa respuesta** antes de saltar a otro tema. Eso demuestra que
estas escuchando.

| Scripting | Natural |
|-----------|---------|
| "Tokio y Kioto. Pero, ¿el Rail Pass?" (despacha + salta) | "Tokio y Kioto me tientan. Antes de seguir, ¿el Rail Pass cubre el trayecto entre esas dos?" (responde + engancha) |

### 4. Variacion 1:1 entre Model A y Model B
La guia exige *misma energia, temas y profundidad* con ambos modelos.
La trampa es repetir las mismas frases (eso delata scripting).

| | Mismo (obligatorio) | Distinto (para no parecer copia) |
|---|---|---|
| A y B | tema, energia, profundidad, nº de turnos | orden de las preguntas, fraseo, que pregunta primero |

### 5. Interrumpe o cambia de opinion al menos una vez
La guia lo pide explicitamente: *"Prueba interrupciones para evaluar
adaptabilidad"*. Una sola interrupcion demuestra que no llevas guion:

- **Cambio de opinion:** "O espera, pensandolo bien prefiero algo mas tranquilo."
- **Redireccion:** "Antes de seguir con eso, ¿incluye artistas locales?"
- **Duda genuina:** "¿Y si llueve? ¿Tienen plan alternativo?"

---

## Auto-chequeo antes de enviar el voto

Aplica este test a tus dos conversaciones. **Un solo NO** ya es alarma:

| Check | Pasa si... |
|-------|-----------|
| Reactividad | Respondi a la pregunta directa del modelo en cada turno |
| Consistencia 1:1 | Mis turnos con A y B son de longitud similar (+/-50%) |
| Variacion A/B | Varie el fraseo entre A y B aunque fuera el mismo tema |
| Adaptabilidad | Alguna vez cambie de opinion o hice una pregunta no planificada |
| Cierre natural | Mi ultima intervencion se despido de forma natural (no abrupta) |

---

## Donde se aplica esto en el codigo

- **Generador de dialogos (`src/app/api/dialog/route.ts`):** el
  `SYSTEM_PROMPT` ya incluye las reglas anti-scripting y un contraejemplo
  real etiquetado como AUTO-FAIL. La herramienta genera dos versiones
  (Model A / Model B) pensadas para servir de referencia de dialogos
  reactivos.
- **Guia oficial (`src/lib/guide.md`):** fuente autoritativa. El
  criterio `Adversarial Users` es AUTO-FAIL y prohibe los scripts
  rigidos.
- **Instrucciones de justificacion (`src/lib/instructions.md`):** el
  fortalecimiento de justificaciones se basa en evidencia observable
  (turnos, frases), no en diagnosticos genericos de scripting.

---

## Resumen en una frase

> **Entra con un objetivo, escucha antes de hablar, responde al modelo
> antes de avanzar, e interrumpe al menos una vez. Si recorres una lista
> fija, es auto-fail.**
