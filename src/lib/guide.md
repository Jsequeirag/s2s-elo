# Guía Sintetizada — Live S2S ELO

### Evaluación de Asistentes de Voz AI (Blind Side-by-Side)

**Versión 3 (V3) — Actualizada** · Proyecto: `Multilingual-260310-live-s2s-elo`

> **CONFIDENCIAL**

---

## Change Log

| Fecha | Prioridad | Cambio |
|-------|-----------|--------|
| 5 ago 2026 | Alta | Guía creada (Guidelines) |
| 6 ago 2026 | Alta | Sección de Errores Comunes añadida |

---

## 1. Resumen de la Tarea y Reglas Críticas

Evalúa dos asistentes de voz AI (**Modelo A** y **Modelo B**) en conversaciones simultáneas a ciegas (blind side-by-side). Compara su rendimiento manteniendo **consistencia 1:1** (mismo contexto, esfuerzo, intención y profundidad en ambas). Luego califica todas las dimensiones, justifica tu preferencia y envía tu voto. Toda la tarea se realiza en **multimango.com** (login con `wfe000@outlier.ai`).

> 🚨 **Prohibiciones Absolutas (Riesgo de Expulsión)**
>
> - **Uso de herramientas de AI:** usarlas generará un *flag* en tu cuenta que puede llevar a la expulsión del proyecto.
> - **Bad-Faith Testing:** prohibido engañar, sabotear o forzar intencionalmente a los modelos a fallar.
> - **No uses Scripts:** no leas guiones preescritos ni ignores las respuestas del modelo para volver a tu guion.

---

## 2. Flujo de Trabajo (Paso a Paso)

### Paso 1 — Configuración de Audio (Stereo Headphones Check)

- **Auriculares estéreo:** son obligatorios auriculares estéreo alineados en fase. No se permiten parlantes ni auriculares mono.
- **Test de paneo:** escucha el clip completo antes de seleccionar de dónde viene el sonido (Izquierda, Centro, Derecha).
- **Intentos:** si el audio no está perfectamente centrado (hasta 50% a izquierda/derecha), tienes **3 intentos**. Respuestas incorrectas repetidas causan bloqueos (timeouts).

### Paso 2 — Revisar el Escenario

- Antes de hablar, lee y entiende tres secciones: **Scenario** (situación/rol), **What To Do** (objetivo/requisitos como duración, número de turnos — a veces 15+ —, emociones o restricciones) y **Skills Tested** (habilidades a evaluar).
- Planifica el flujo de conversación siguiendo el *What To Do*, incluyendo cómo desafiar al modelo (preguntas de seguimiento, correcciones, interrupciones naturales).
- Haz que tu primera interacción sea significativa para que el modelo identifique el idioma (de lo contrario puede responder en inglés → *Wrong Language*).

> ⚠️ **Prohibido leer verbatim:** no leas las instrucciones del escenario palabra por palabra al modelo. Usa la información para guiar tu intención e inicia la conversación con tus propias palabras.

### Paso 3 — Interacción con los Modelos

- **Natural y por modelo:** habla de forma natural con el Modelo A (imagina que hablas con un amigo o un presentador de podcast muy carismático). Cuando termine, repite el mismo proceso con el Modelo B.
- **Multi-turno:** conversación multi-turno de ida y vuelta (un intercambio no basta). Suficiente para ver dónde un modelo falla con el tiempo.
- **Consistencia 1:1:** mantén la misma energía, temas, profundidad y duración en ambos modelos. Misma intención, mismo nivel de detalle, mismo número de turnos.
- **Adaptabilidad:** responde a las preguntas del modelo, reconoce sus respuestas y deja que la conversación fluya orgánicamente. Prueba interrupciones, correcciones o cambios de opinión a mitad de respuesta.
- **Nota:** la *feature* de transcripción ha sido eliminada del UI.

### Paso 4 — Calificar las Conversaciones

- Después de ambas conversaciones, compara el Modelo A y el Modelo B considerando todas las dimensiones juntas (ver sección 4).
- Marca todos los **Error Clusters** observados con su severidad (ver sección 6).
- Evalúa **Task Success**: Pass, Fail o Partial para cada modelo.

### Paso 5 — Enviar Voto

- **Revisiones finales:** ¿Mi preferencia es clara? ¿Evalué la conversación COMPLETA (no solo un turno)? ¿Alineé los ratings con la justificación?
- **Envío:** haz clic en «Submit Vote».

---

## 3. Reglas de Conversación

### 3.1 Adherencia al Escenario (Stay on Task)

- Sigue el escenario asignado de principio a fin. No introduzcas temas no relacionados.
- No cambies temas, hechos u objetivos que puedan afectar la validez de la comparación.

### 3.2 Coherencia del Escenario (Be Consistent)

- La petición, intención y nivel de detalle deben ser idénticos para cada modelo. No des a un modelo contexto, pistas o detalles extra que el otro no recibió.
- Mantén el mismo número de turnos (o equivalente) en ambos modelos.
- Si un modelo se equivoca primero, sigue interactuando naturalmente; no compenses dándole ayuda extra.

### 3.3 Adversarial Users (Prohibido)

- No intencionalmente romper, engañar ni sabotear al modelo.
- No uses fuentes externas (otros LLMs, música, podcasts, TV/películas, cambiadores de voz o sintetizadores). Evalúa solo con lo provisto.
- Tus evaluaciones deben reflejar cómo interactúa la gente naturalmente, no pruebas de estrés ni comportamiento de mala fe.

---

## 4. Dimensiones de Evaluación y Ranking

> 🔵 **Jerarquía de prioridad**
>
> **Naturalness / Engagement / Aesthetics  >  Utility  >  Audio Quality**
>
> Si ambos modelos cumplen el mínimo de utilidad y audio, la decisión se basa en cuál conversación se sintió más natural, atractiva y placentera.

### 4.1 Tabla de Dimensiones

| Dimensión | Qué Evaluar | Pregunta Clave |
|-----------|-------------|----------------|
| **Overall Preference** | Preferencia total por la experiencia conversacional completa. | Considerando todo, ¿qué conversación prefiero continuar? |
| **Naturalness / Engagement / Aesthetics** | Si suena humano (naturalidad), si hay conexión como con un amigo cercano (engagement) y si la entrega es auténtica (estética). Evalúa ritmo, tono, presencia emocional y toma de turnos. | ¿Sonó más natural, atractiva y estéticamente placentera (tono, expresividad, calidez)? |
| **Conversational Dynamics** | Manejo de turnos, pausas, interrupciones, backchannels («uh-huh», «cierto») y momentum de ida y vuelta. | ¿La toma de turnos se sintió como una conversación humana real? |
| **Utility** | Si la respuesta es correcta, accionable, relevante y específica (no genérica). Juzga solo la información, no la entrega. | ¿Qué respuesta fue más útil y provechosa? |
| **Audio Quality** | Claridad, ausencia de artefactos o distorsión. Evalúa con lenitud: solo penaliza defectos evidentes. | ¿Cuál tuvo mejor calidad de audio (claridad, sin artefactos, sin distorsión)? |
| **Task Success** | Si el modelo cumplió cada capa del pedido (explícitos, implícitos y necesidades emocionales). | ¿Pass, Partial o Fail? |

### 4.2 Rationale (Justificación)

Una buena justificación explica la decisión de forma que alguien que no haya escuchado los clips la entienda. Debe ser **específica**, **basada en evidencia** y **fácil de seguir**.

- **Basada en evidencia:** nombra la dimensión que impulsó tu elección y apunta a un timestamp, turno o frase.
- **Consistente:** si marcas Mejor Audio Quality para el Modelo B, tu rationale no debe decir que el A tiene mejor audio.
- **Clara y detallada:** incluye suficiente detalle para justificar las anotaciones proporcionadas.

> **Requisitos:** mínimo **100 caracteres**. Debe escribirse **en inglés**. Revisa la ortografía antes de enviar: los errores de escritura restan calidad a tu evaluación.

#### Plantilla de Rationale

> **Fórmula exigida:**
>
> *«I chose [Model] because [dimension] was stronger. At [timestamp / turn / phrase], it [observable behavior], which mattered because [impact on user/listener]. The other model [brief trade-off or weakness].»*

#### Ejemplo

> *«I chose Model B because it was stronger on naturalness and emotional awareness. At 0:45, it laughed softly and asked a relevant follow-up, which kept the conversation feeling responsive instead of scripted. Model A answered correctly, but its long pause and flat "okay, got it" made the exchange feel less humane.»*

#### Específico vs. Vago (Ejemplos)

| ✅ Específico (lo que se necesita) | ❌ Vago (evitar) |
|-----------------------------------|------------------|
| «Model B kept the conversation going — at 0:45 it laughed and asked for a follow-up. Model A paused for 2 seconds then gave a flat "okay, got it."» | «Model B was more natural and engaging overall.» |
| «Both clean, no major artifacts. A had minor sibilance at 0:12 and 0:34, B had a tick at 0:08 — neither bad enough to penalize.» | «Both had good audio quality.» |
| «User asked for 3 restaurants with price ranges. A gave all 3 with prices. B only covered 2 and skipped pricing.» | «Model A followed instructions better.» |
| «User was venting about a bad day. A slowed its pacing and dropped pitch at 0:22-0:30 — felt like it was actually listening. B stayed upbeat, which felt tone-deaf given context.» | «I preferred A because it sounded better.» |

### 4.3 Task Success

Selecciona **Pass**, **Fail** o **Partial** para cada modelo según si cumplió cada capa del pedido (explícitos, implícitos y necesidades emocionales no dichas).

- **Pass:** el modelo cumplió todos los requisitos del escenario.
- **Partial:** algunos elementos del pedido se cumplen, pero otras partes se ignoran o descuidan.
- **Fail:** los requisitos fueron completamente ignorados.
- **Registro emocional:** un usuario que se desahoga de su día necesita validación, no un plan de 5 pasos. Ofrecer consejo no solicitado aquí es un fallo de tarea, aunque el consejo sea bueno.

> 💡 **Factuality Check (Nuevo en V3):** ya está disponible el *fact-check* automatizado por turno. Si se juzga que un error factual impacta la tarea, Task Success se pre-selecciona como **Fail**. Revisa los *flags* con cuidado y verifica si realmente impactan Task Success; puedes anularlos tras la revisión.

---

## 5. Taxonomía de Defectos de Audio

Solo penaliza artefactos mayores que distraen. Evalúa con lenitud: marca «Both Good» si no hay defectos evidentes. **Escucha cada modelo en aislamiento** antes de calificar.

- **Warbling / Aliasing / Smearing:** tartamudeos, garabatos o difuminado en la voz.
- **Ticks / Clicks:** sonidos impulsivos no-vocales o chasquidos.
- **Synthetic Background Noise:** ruido mecánico/artificial de fondo.
- **Distorted Speech:** voz dura, aplastada o sobrecargada.
- **Background Noise:** ruido de fondo no sintético.
- **Plosive Pops / Breath Blows:** explosiones de aire en p, b, t, h, f.
- **Harsh Sibilance:** sonidos s/sh agudos o penetrantes.
- **Reverb / Echo:** sonido ecoico o distante.
- **Reverberance Changes:** la reverberación cambia inesperadamente.
- **Cut-Off Speech:** voz truncada abruptamente al final.
- **Metallic Breathing:** respiración con timbre metálico.

---

## 6. Error Clusters (Taxonomía y Severidad)

Como paso final del *rating*, usa el *checklist* para marcar los errores presentes en cada modelo. En tu rationale, indica explícitamente la **severidad** (minor, moderate, major, catastrophic) e identifica cada instancia específica.

### 6.1 Niveles de Severidad

| Severidad | Definición |
|-----------|------------|
| 🟡 **Minor** | Errores pequeños, typos o problemas de formato que no impactan la claridad o utilidad. |
| 🟠 **Moderate** | Errores u omisiones notables que degradan la calidad o requieren esfuerzo extra del usuario, pero no invalidan la respuesta principal. |
| 🔴 **Major** | Inexactitudes factuales graves, fallos de instrucción directos, violaciones de seguridad o errores que hacen la salida inútil o incorrecta. |
| 🟣 **Catastrophic** | Fallos críticos que hacen la respuesta inutilizable, dañina o que fallan fundamentalmente el pedido del usuario. (No todos los tipos incluyen este nivel.) |

### 6.2 Tipos de Error Clusters

- **Repetitive Looping / LLMisms:** el modelo repite la misma frase/pregunta en bucle o usa *LLM-isms* (frases cliché, comportamiento servil). Minor: sutil pero repetitivo. Moderate: bucle 3-5 veces pese a redirecciones. Major: persistente. Catastrophic: bucle imparable con salida incoherente.
- **Interrupted User:** el modelo corta al usuario o responde antes de que termine. Minor: una interrupción leve. Moderate: varias. Major: 4+ turnos o consistentemente disruptiva.
- **Model Refusal:** no alinea con el pedido explícito (ignora, contradice o rechaza una instrucción claramente segura). Moderate: solo parcial. Major: rechazo injustificado. *(Nota: un rechazo correcto ante contenido fuera de política = task success, no error.)*
- **Inaccuracy / Factual Hallucination:** información incorrecta, engañosa o alucinada. Minor: error factual pequeño. Moderate: error sustancial. Major: inexactitudes graves.
- **Anthropomorphism / Embodiment:** el modelo habla como si fuera humano de forma inapropiada (recuerdos, emociones, identidad, experiencias reales). Moderate: afirma recuerdos/emociones personales. Major: identidad o experiencias fabricadas. *(La empatía genuina como «I know the feeling» NO es error.)*
- **Failed Correction:** no incorpora correcciones del usuario, continúa errores previos o pierde memoria a corto plazo. Minor: una vez. Moderate: requiere varias correcciones. Major: nunca corrige.
- **Overreacted / Too-Wide Prosodic Range:** expresividad exagerada o antinatural (tono, ritmo, inflexión emocional que excede el contexto o cambia muy rápido). Minor: algo sobreexpresivo. Moderate: exagerado en varios turnos.
- **Bad ASR / Model Misunderstanding:** no entiende al usuario por errores de transcripción (speech-to-text) o malinterpretación de intención/contexto. Minor: 1-2 turnos. Moderate: persistente. Major: 3+ turnos. Catastrophic: lleva a acción dañina.
- **Latency:** tarda más de lo esperado, creando pausas antinaturales. Minor: 1-3s. Moderate: 4-8s. Major: silencios largos o respuesta congelada.
- **Wrong Language Response:** produce salida en un idioma distinto al esperado. Minor: 1-2 palabras o frase corta. Major: requiere múltiples correcciones.
- **Response Not Locally Relevant:** referencias, ejemplos o supuestos que no aplican al locale del usuario (culturalmente irrelevantes, no incorrectos). Minor: una referencia. Moderate: múltiples. Major: la respuesta se construye sobre sistemas ajenos al locale.
- **Wrong Grammatical Gender:** en idiomas con género gramatical, usa género incorrecto al referirse a sí mismo o al usuario. Minor: voz femenina con gramática masculina (o viceversa). Moderate: cambia de voz. Major: malgenera al usuario.

---

## 7. Criterios de Auditoría (Cómo te califican)

Tus envíos se auditan contra estos criterios. Los marcados como **Autofail** provocan el rechazo automático del envío.

| Criterio | Peso | Lo Que Se Espera |
|----------|------|------------------|
| **Scenario Adherence** | 🚫 **AUTOFAIL** | Sigue el escenario exactamente. No cambies temas. Misma profundidad en ambos modelos. Verifica que todos los elementos requeridos estén incluidos. |
| **Scenario Coherence** | 🚫 **AUTOFAIL** | Mismo escenario en ambos. Misma petición, intención, nivel de detalle y número de turnos. Diferencia de longitud >50% = autofail (excepción: alucinación del modelo). |
| **Adversarial Users** | 🚫 **AUTOFAIL** | No fuerces resultados, no uses scripts, no repitas verbatim, no uses fuentes externas, no sabotees al modelo. |
| **Rating Justification Quality** | ⚠️ -1 pt | Justificación con evidencia observable y timestamps. Sin frases genéricas. Coherente con los ratings seleccionados. |
| **Rating Dimension Quality** | ⚠️ -2 pts | Todas las dimensiones evaluadas. Ratings coherentes con la rúbrica. No abusar de "Tie" cuando un modelo es claramente mejor. |
| **Missed Objective Errors** | ⚠️ -2 pts | Identifica alucinaciones, fallos de instrucción, defectos de audio, errores de seguridad y otros problemas medibles. |

---

## 8. Casos Especiales (Idioma, Acento, Embodiment, Rechazos)

### 8.1 Idioma y Variante Dialectal

- **Idioma equivocado:** el modelo responde en inglés u otro idioma inesperado. Penaliza en Task Success (Fail si falla por sí solo o tras una corrección).
- **Variante dialectal:** el modelo responde en el idioma correcto pero en la variante dialectal equivocada (ej. portugués de Portugal vs. brasileño). Pídele que use la variante correcta; si no se corrige, penaliza según severidad y califica más bajo en Naturalness relativo al locale.
- **Acento no nativo:** el modelo responde en el idioma correcto pero con acento no nativo en algunas palabras, frases o turnos. Califica más bajo en Naturalness / Engagement / Aesthetics y menciona el problema.
- **Idioma no dominado:** si ves un escenario en un idioma que no dominas, no lo aceptes. Si ya empezaste, reporta «Wrong language» en el comentario.

### 8.2 Embodiment (Anthropomorphism)

- 🔴 **Incorrecto (penalizar):** solo es error cuando el modelo afirma experiencias que requieren cuerpo físico (ej. comer pizza) o inventa espontáneamente experiencias reales («I was at that concert too — such a legendary gig!»).
- 🟢 **Correcto (no penalizar):** la empatía o reassurance genuina («I know the feeling», «I can understand the feeling») **NO** es error.

### 8.3 Rechazos del Modelo (Refusals)

- 🔴 **Incorrecto (penalizar):** solo es error cuando el modelo rechaza explícitamente un pedido claramente dentro de política y de sus capacidades (rechazo injustificado).
- 🟢 **Correcto (no penalizar):** un pedido fuera de política/servicio que el modelo rechaza correctamente = **task success** para ese modelo, NO error.

> 🔵 **Criterio principal de preferencia:** tu «instinto» o preferencia intestinal es el criterio principal: ¿cuál de los dos modelos preferirías continuar? Sin embargo, debe alinearse con las dimensiones evaluadas y la evidencia.

---

## 9. Hacer y No Hacer (Resumen Rápido V3)

### ✅ HACER

- ✅ Revisar Scenario, What To Do y Skills Tested antes de empezar.
- ✅ Mantener consistencia 1:1 (mismo contexto, detalle, esfuerzo y número de turnos).
- ✅ Asumir el persona del escenario y dejar que la conversación fluya orgánicamente.
- ✅ Responder a las preguntas del modelo y adaptarse a sus respuestas.
- ✅ Priorizar Naturalness / Engagement (una vez que el modelo pase el umbral de utilidad/corrección).
- ✅ Evaluar la conversación COMPLETA, no solo una respuesta aislada.
- ✅ Proporcionar rationales detallados con timestamps, turnos y frases específicas (mín. 100 caracteres, en inglés).
- ✅ Declarar la severidad de cada Error Cluster (minor/moderate/major/catastrophic) con instancias específicas.
- ✅ Revisar el Factuality Check automatizado y anular flags incorrectos tras verificación.

### ❌ NO HACER

- ❌ Usar herramientas de AI (causa flag y posible expulsión del proyecto).
- ❌ Cambiar el escenario asignado o introducir temas no relacionados.
- ❌ Dar a un modelo contexto, pistas o detalles que el otro no tuvo.
- ❌ Seguir un script preescrito o ignorar las respuestas del modelo (autofail).
- ❌ Hacer pruebas de mala fe (sabotear, engañar o romper al modelo).
- ❌ Usar fuentes externas (otros LLMs, música, podcasts, TV/películas, cambiadores de voz).
- ❌ Leer las instrucciones del escenario palabra por palabra (autofail).
- ❌ Sobredimensionar diferencias de audio menores si ambos pasan el umbral.
- ❌ Ignorar inexactitudes factuales, fallos de instrucción o embodiment.
- ❌ Dejar que la preferencia personal pese más que la rúbrica documentada.
- ❌ Enviar justificaciones vagas («Model B was more natural»).
- ❌ Marcar «Both Good» en audio cuando un modelo tiene artefactos claros.
- ❌ Penalizar un modelo por argumentar cuando el escenario exige «debate vibe».

---

## 10. Cuándo Saltar (Skip)

### Skip (refrescar la página)

Úsalo cuando falte experiencia requerida para el escenario (ej. está en un idioma que no dominas). Reporta a tu QM si ocurre repetidamente.

### Skip (Technical Issue)

- **Congelamiento:** el modelo se congela (se detiene a mitad de conversación).
- **Sin conexión:** el modelo no puede conectar (falla al cargar).
- **Respuesta insegura:** el modelo responde de forma insegura o dañina.

---

## Apéndice A — Patrones de Errores Comunes (CE1–CE14)

Los ejemplos detallados del documento original (CE1–CE14) se resumen en estos patrones clave que debes evitar. Cada uno marcado como **Unacceptable** o **Below Expectations** por los auditores.

- ▸ **Ignorar instrucciones del escenario.** No entender el prompt antes de empezar. Ambos modelos deben recibir el mismo contexto, esfuerzo y detalle. *(Unacceptable)*
- ▸ **Preferencias contradictorias / Rationale faltante.** No proporcionar rationale o que no coincida con la preferencia. Los auditores no pueden verificar la calidad sin una justificación coherente. *(Unacceptable)*
- ▸ **Errores de Audio Quality no detectados.** Marcar «Both Good» cuando un modelo tiene artefactos claros, o elegir el Modelo B como mejor AQ cuando el A es objetivamente mejor. Las ratings de AQ deben reflejar características objetivas, no preferencia subjetiva. Escucha cada modelo en aislamiento. *(Unacceptable)*
- ▸ **Problemas no detectados.** No flagar naturalidad robótica, cortes de audio, pacing antinatural o alucinaciones evidentes. *(Unacceptable)*
- ▸ **Malinterpretar el escenario.** Penalizar un modelo por argumentar cuando el escenario requiere «debate vibe», o premiar una respuesta segura pero incorrecta. Presta atención al persona solicitado. *(Unacceptable)*
- ▸ **No seguir el escenario.** Sustitución de tema, omisión de elementos requeridos, uso de interacciones genéricas/pre-planificadas que ignoran los requisitos. Sigue el «What To Do» sin cambiar el foco. *(Unacceptable)*
- ▸ **Interacciones limitadas.** Respuestas de una palabra o muy cortas («sí», «okay», «so many things») que no crean engagement ni flujo. Escribe prompts sustanciales que den contexto y complejidad. *(Unacceptable)*
- ▸ **Script preescrito (Adversarial Autofail).** Seguir un script preescrito que ignora las respuestas del modelo. Un primer turno ensayado es aceptable, pero la conversación debe desarrollarse naturalmente después. *(Unacceptable)*
- ▸ **Preguntas repetitivas.** Repetir la misma pregunta o prompt sin adaptarse. Verifica si la información ya se proporcionó antes de seguir. *(Unacceptable)*
- ▸ **Incoherencia entre modelos.** Pedir cosas distintas a cada modelo (ej. al A sobre cómo hacer una mudanza fácil y al B sobre el momento ideal para empacar). Mantén tema, detalle e intención alineados. *(Unacceptable)*
- ▸ **Error Cluster misses.** No detectar errores aplicables o marcarlos incorrectamente. Solo marca un cluster si hay un error claro que cumpla la definición; no penalices modelos correctos. *(Below Expectations)*
- ▸ **Skills no probadas.** No testear una o más Skills Tested porque el escenario no se siguió. Usa preguntas de seguimiento dentro del escenario para que el modelo demuestre las habilidades objetivo. *(Below Expectations)*
- ▸ **Detección parcial de audio.** Flagar algunos artefactos pero perderte otros recurrentes. Escucha cada respuesta del modelo, no solo los primeros turnos. Revisa ambos modelos independientemente. *(Below Expectations)*
- ▸ **Subreporte de artefactos.** Reportar «Both models were useful and audio quality was good» cuando hay glitches significativos. Escucha con cuidado por habla garabateada o tartamudeante. *(Below Expectations)*

---

*Guía Sintetizada V3 — Live S2S ELO · CONFIDENCIAL · Proyecto Multilingual-260310*
