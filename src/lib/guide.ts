export const guide = `# GUIA SINTETIZADA - LIVE S2S ELO
Version resumida de las directrices del proyecto de evaluacion de asistentes de voz AI.

---

## Flujo de Trabajo

### Paso 1 - Configuracion de Audio
Usa auriculares estereo alineados en fase. No se permiten parlantes ni auriculares mono. Escucha el clip completo e identifica si el sonido esta posicionado a la izquierda, centro o derecha.

### Paso 2 - Iniciar Conversacion
Revisa el Escenario y la seccion "Que Hacer" antes de empezar.
No leas las instrucciones palabra por palabra al modelo; usa tus propias palabras naturales.

### Paso 3 - Interaccion con Modelos
- Minimo 4 turnos (2 del usuario + 2 del asistente). Ideal: 4-6 turnos.
- Mantene la consistencia 1:1: misma energia, temas y profundidad con ambos modelos.
- Adherencia al escenario: variaciones menores en el fraseo son aceptables, pero la informacion clave debe ser equivalente.
- Prueba interrupciones para evaluar adaptabilidad: cambia de opinion a mitad de respuesta y observa como reacciona.
- Si hay problemas tecnicos (congelamiento, sin respuesta, sin conexion), usa "Skip (Technical Issue)".

### Paso 4 - Calificar Conversacion
Califica cada dimension y escribe una justificacion especifica. Selecciona los Error Clusters presentes en cada conversacion.
Evalua Task Success: Pass, Fail o Partial.

### Paso 5 - Enviar Voto
Revisa: mi preferencia es clara, evalúe toda la conversacion, identifiqué donde fallo el modelo, consideré trade-offs. Haz clic en "Submit Vote".

---

## Dimensiones de Evaluacion

**Jerarquia de prioridad:** Naturalness/Engagement > Utility > Audio Quality

| Dimension | Que Evaluar | Pregunta Clave |
|---|---|---|
| **Overall Preference** | Experiencia general combinando todos los criterios. | Considerando todo, que conversacion prefiero? |
| **Naturalness / Engagement** | Si la respuesta suena humana, fluida y atractiva vs. robotica o repetitiva. | Siente como conversar con una persona real o con un sistema? |
| **Conversational Dynamics** | Manejo de turnos, pausas, interrupciones, backchannels, cambio de tono y seguimiento de contexto. | La interaccion fluye naturalmente o se siente forzada? |
| **Instruction Following** | Si el modelo entendio y ejecuto la intencion del usuario sin clarificaciones innecesarias. | Cumplio con TODOS los matices del prompt? |
| **Utility (umbral)** | Utilidad como criterio secundario: la respuesta debe ser correcta y usable para ser competitiva. | Es accionable, relevante y especifica? |
| **Audio Quality (umbral)** | Evaluar con lenidad. Solo penaliza si hay artefactos evidentes (cortes, distorsion). Ligero ruido de ambiente es aceptable. | Hay artefactos mayores que distraen? |

**Regla clave:** Utility y Audio Quality operan como umbral: ambos modelos deben cumplir un minimo aceptable. Si ambos pasan el umbral, la decision se basa en trade-offs entre dimensiones. Usa "Tie" solo cuando son genuinamente indistinguibles.

---

## Guia de Trade-Offs

| Situacion | Como Decidir |
|---|---|
| Empatia sin accion | Mas debil cuando el usuario queria ayuda concreta (fallo en Utility). |
| Respuesta pulida pero ignora algo pedido | Mas debil: desvio de la intencion del usuario. |
| Tecnicamente correcto pero responde otra pregunta | Mas debil que una respuesta simple que responda directamente. |
| Ambas respuestas fuertes en dimensiones distintas | Elige segun la necesidad principal del usuario. |
| Ambas son defectuosas | Elige la que falla menos criticamente. |
| Uno mas completo, otro mas preciso | Naturalness y precision suelen ganar, salvo que completitud sea esencial. |
| Correcto pero robotico vs. impreciso pero natural | El natural y util suele ganar, salvo que el formato fuera requerido. |

---

## Justificacion (Rationale)

La justificacion debe ser: **especifica** (con timestamps, turnos o frases), **concreta** (evidencia observable) y **concisa** (4-6 oraciones). Debe entenderse por si misma sin escuchar el audio.

### Formula
> Elegi [Modelo] porque [dimension] fue mas fuerte. En [timestamp/turno/frase], [comportamiento observable], lo cual importo porque [impacto en el usuario]. El otro modelo [trade-off o debilidad breve].

### Bueno vs. Malo

**Bueno (especifico, con evidencia):**
- "Modelo B rio suavemente en 0:45 y pregunto algo relevante, manteniendo la conversacion viva. Modelo A pauso 2s y dijo plano ok, got it."
- "Ambos limpios, sin artefactos mayores. A tuvo leve sibilancia en 0:12 y 0:34, B un tick en 0:08."
- "Usuario pidio 3 restaurantes con precios. A dio los 3 con precios. B solo cubrio 2 y omitio precios."

**Malo (generico, sin pruebas):**
- "Modelo B fue mas natural y atractivo en general."
- "Ambos tuvieron buena calidad de audio."
- "Modelo A siguio instrucciones mejor."

Referencia dimensiones con evidencia observable: Naturalness (donde fue mas vivo vs. robotico), Instruction Following (algo omitido o mal interpretado), Utility (el usuario puede actuar con esto?), Audio Quality (artefactos que rompieron la inmersion, con categorias de taxonomia).

---

## Defectos de Audio (Taxonomia)

| Defecto | Descripcion |
|---|---|
| Warbling / Aliasing / Smearing | Tartamudeos, repeticiones, garabato. No penalizar si es leve. |
| Ticks / Clicks | Sonidos impulsivos no-voz (ticks) o chasquidos labiales excesivos. |
| Ruido Sintetico de Fondo | Ruido mecanico/artificial en el fondo. |
| Distorsion de Voz | Voz suena dura, aplastada o sobrecargada. |
| Ruido de Fondo (Estatico/Mecanico) | Ruido ambiental (habitacion, calle, electrico, estatico). |
| Plosivas / Soplidos | Explosiones de aire en p, b, t, h, f. |
| Sibilancia Harsh | Sonidos s/sh agudos o penetrantes. |
| Reverberacion / Eco | Sonido ecoico, distante o demasiado reflectivo. |
| Corte al Final del Track | Voz truncada abruptamente al final. |
| Cambio de Identidad Vocal | Timbre cambia inesperadamente (ej. masculino a femenino). |
| Solapamiento por Busqueda | Glitches antes/durante/despues de busqueda web. |

---

## Error Clusters del Proyecto

Declara severidad (Minor/Moderate/Major) e identifica cada instancia especifica.
- **Minor:** errores pequenos sin impacto.
- **Moderate:** degradan calidad pero no invalidan.
- **Major:** errores graves que vuelven la respuesta inutil o incorrecta.

| Cluster | Descripcion |
|---|---|
| Task Success | No completo el objetivo del usuario. |
| Bad ASR | Errores de transcripcion voz-a-texto; responde cosas que no se dijeron. |
| Latencia | Retrasos evidentes (Minor: 1-3s, Moderate: 4-8s, Major: silencios largos). |
| Rechazo del Modelo | Rechaza injustificadamente o no rechaza cuando deberia. |
| Silencio (Audio Faltante) | Ausencia de voz donde se esperaba salida. |
| Embodyment | Se hace pasar por humano (experiencias, emociones, recuerdos). |
| Repetitivo | Bucle repitiendo la misma frase, ignorando redirecciones. |
| Degradacion | La calidad de la conversacion empeora turno a turno. |
| No Para (Failed Stop) | No reconoce el goodbye y sigue preguntando o en bucle. |
| Interrumpe | Corta al usuario o habla encima de forma disruptiva. |
| No Corrige | Ignora correcciones del usuario y continua con el error. |
| Prosodia Exagerada | Expresividad vocal exagerada, inconsistente o teatral. |
| Alucinacion / Inexactitud | Informacion falsa, enganosa o incompleta. |

---

## Criterios de Auditoria (Como Te Califican)

| Criterio | Peso | Lo Que Se Espera |
|---|---|---|
| Scenario Adherence | Autofail | Sigue el escenario exactamente. No cambies X por Y. Misma profundidad y temas en ambos modelos. |
| Scenario Coherence | Autofail | Mismo escenario en ambos modelos. Diferencia de longitud >50% = autofail. Excepcion: si un modelo alucina. |
| Adversarial Users | Autofail | No fuerces resultados. No uses scripts rigidos. No uses fuentes externas. No repitas instrucciones verbatim. |
| Rating Justification Quality | -1 pt | Justificacion especifica con evidencia observable y timestamps. Sin frases genericas. |
| Rating Dimension Quality | -2 pts | Todas las dimensiones evaluadas. Ratings coherentes con la justificacion. No abuses de "Tie". |
| Missed Objective Errors | -2 pts | Identifica alucinaciones, fallos de instrucciones, defectos de audio, errores de seguridad. |

---

## Hacer y No Hacer (Resumen Rapido)

### ✅ HACER
- Minimo 4 turnos con ambos modelos.
- Asumir el persona del escenario con naturalidad.
- Priorizar flujo espontaneo, no entrevista preplanificada.
- Mantener consistencia 1:1 (misma energia, temas, profundidad).
- Objetivo 4-6 turnos: suficiente para establecer ritmo.
- Naturalness/Engagement es prioridad #1.
- Aceptar imperfecciones de audio menores (ligero ruido de ambiente).
- Responder a las preguntas del modelo y seguir el flujo.
- Usar interrupciones para probar adaptabilidad.
- Marcar todos los Error Clusters, incluso si preferiste ese modelo.
- Incluir timestamps y frases especificas en la justificacion.
- Revisar coherencia entre ratings y justificacion antes de enviar.

### ❌ NO HACER
- Usar voz de "AI" ("As an AI...", "I can certainly help...").
- Priorizar utilidad sobre humanidad y fluidez natural.
- Romper el personaje con "meta-talk" sobre el prompt o tarea.
- Aceptar alucinaciones evidentes o misinformation.
- Ser robotico: respuestas estructuradas, bullet points, frases repetitivas.
- Seguir un script preescrito que ignore las respuestas del modelo.
- Dar turnos muy distintos o temas diferentes a cada modelo.
- Marcar "Both Good" si uno tiene artefactos claros de audio.
- Usar justificaciones genericas sin evidencia concreta.
- Usar herramientas AI externas para evaluar.
- Sobredimensionar diferencias de audio menores cuando ambos pasan el umbral.

---

## Errores Comunes Condensados

| Error | Como Evitarlo |
|---|---|
| Evaluacion de Audio | Marcar "Both Good" cuando un modelo tiene artefactos claros. Siempre escucha en aislamiento y documenta todo. |
| Justificacion Contradictoria | La justificacion no coincide con la preferencia seleccionada. Alinea todo antes de enviar. |
| No Detectar Problemas | No flagar naturalidad robotica, cortes de audio, o alucinaciones evidentes. |
| Enfoque Inconsistente | Dar turnos, temas o profundidad diferente a cada modelo. La comparacion debe ser equitativa. |
| No Marcar Error Clusters | Omitir checklists de errores observables (repeticiones, fallos de correccion, interrupciones). |
| Malinterpretar Escenario | No entender que un modelo discrepando o argumentando puede ser positivo segun el escenario. |
| No Seguir el Escenario | Desviarse del escenario asignado o cumplir solo parcialmente la tarea. |
| Usar Script Preescrito | Respuestas preescritas que ignoran las respuestas especificas del modelo. |
| Conversacion Rigid/Robotica | Seguir un guion predefinido en vez de responder naturalmente al modelo. |
| Ignorar Errores Objetivos | No penalizar problemas evidentes (inexactitudes, cortes, embodied experiences). |
`;
