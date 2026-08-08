import { NextRequest } from "next/server";
import {
  callOpenRouter,
  errorResponse,
  extractContent,
  extractUsage,
  resolveModelForTask,
} from "@/lib/openrouter";
import { saveTaskSpec } from "@/lib/mongodb";

// Allow up to 60s for vision model calls (image processing is slow).
export const maxDuration = 60;

interface DialogRequest {
  imageDataUrl: string;
  model?: string;
}

interface DialogTurn {
  number: number;
  speaker?: string;
  text: string;
}

interface DialogVariant {
  label: string;
  turns: DialogTurn[];
}

interface DialogResponse {
  scenarioType: string;
  scenario?: string;
  scenarioDescription?: string;
  userRole?: string;
  skillsTested?: string[];
  // Dual A/B output. Legacy `turns` (single dialogue) is still accepted for
  // backward compatibility with previously persisted documents.
  modelA?: DialogVariant;
  modelB?: DialogVariant;
  turns?: DialogTurn[];
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost: number;
  };
  model: string;
  requestedAt: string;
}

const SYSTEM_PROMPT = `Eres un generador de guiones de dialogo para evaluaciones S2S (Speech-to-Speech) en vivo. Recibes la captura de pantalla de un escenario de la plataforma S2S Arena.

# CONTRATO DE SALIDA (LEER PRIMERO — OBLIGATORIO)
Debes responder EXCLUSIVAMENTE con un objeto JSON valido, en espanol, SIN texto adicional y SIN markdown fences (no uses \`\`\`). El objeto SIEMPRE debe tener esta forma exacta, con DOS variantes (modelA y modelB). Nunca devuelvas un array "turns" suelto en la raiz: SIEMPRE anidado dentro de modelA y modelB.

# 🚫 CONTRAEJEMPLO REAL DE AUTO-FAIL (NUNCA PRODUZCAS ESTO)
Esto es un extracto de una conversacion REAL que fue calificada como AUTO-FAIL por scripting. El usuario ignora las preguntas del asistente para avanzar su lista. Estudia por que esta MAL:

  Asistente: "Te dejo el lineup del festival. ¿Ese es el festival que buscabas o es otro?"
  Usuario (MAL): "¿Cuáles son las fechas exactas del festival?"           ← IGNORA la pregunta del asistente
  Asistente: "¿Piensas ir aunque las fechas no estén confirmadas aún?"
  Usuario (MAL): "¿Vale la pena el costo de las entradas?"                 ← vuelve a ignorar y avanza su punto

Por que es auto-fail:
- El usuario NO responde a las preguntas del asistente ("sí, ese mismo", "depende").
- Recorre una lista pre-armada (lineup -> fechas -> precios) sin escuchar.
- Cada turno del usuario introduce un NUEVO punto en lugar de profundizar en lo que el asistente dijo.

Tambien es auto-fail la VERSION SUTIL de este patron: el usuario despacha la pregunta con una palabra y en la MISMA frase salta a su siguiente punto. Ejemplo igual de malo:
  Asistente: "¿Qué ciudades te gustaría visitar?"
  Usuario (MAL): "Tokio y Kioto. Pero, ¿debería considerar el Japan Rail Pass?"   ← despacha + avanza la lista

# ✅ COMO SE VE EL PATRON BIEN HECHO (para imitar)
Mismo caso del festival, pero el usuario RESPONDE ANTES de avanzar:
  Asistente: "¿Ese es el festival que buscabas o es otro?"
  Usuario (BIEN): "Sí, ese mismo. ¿Tienes las fechas exactas?"            ← PRIMERO responde, DESPUES avanza
  Asistente: "¿Piensas ir aunque las fechas no estén confirmadas aún?"
  Usuario (BIEN): "Depende del precio, por eso pregunto. ¿Me das un rango?"  ← responde con motivo, despues avanza

# ESTRUCTURA DE SALIDA (ejemplo ilustrativo)
Ejemplo completo de la estructura que debes producir:
{
  "scenarioType": "information",
  "scenario": "SEARCH-REQUIRED",
  "scenarioDescription": "El usuario llama para pedir info sobre un festival de musica.",
  "userRole": "Customer",
  "skillsTested": ["Probing", "Grounding"],
  "modelA": {
    "label": "Model A",
    "turns": [
      { "number": 1, "speaker": "usuario", "text": "Hola, ando buscando info sobre festivales de musica este verano." },
      { "number": 2, "speaker": "asistente", "text": "Claro, ¿tienes en mente alguno en particular o quieres que te recomiende?" },
      { "number": 3, "speaker": "usuario", "text": "Algo me recomiendas. Eso si, me preocupa el presupuesto, ¿las entradas son caras?" },
      { "number": 4, "speaker": "asistente", "text": "Hay para todos los bolsillos. El Summer Sound sale unos 120 dolares el dia. ¿Te interesa ese formato?" },
      { "number": 5, "speaker": "usuario", "text": "Hmm, 120 esta bien. O espera, ¿sabe si incluyen artistas locales? Eso me terminaria de decidir." }
    ]
  },
  "modelB": {
    "label": "Model B",
    "turns": [
      { "number": 1, "speaker": "usuario", "text": "Buenas, quiero armar un plan de vacaciones alrededor de un festival, me ayudas?" },
      { "number": 2, "speaker": "asistente", "text": "Encantado. Para afinar, ¿buscas algo multitudinario o mas intimo?" },
      { "number": 3, "speaker": "usuario", "text": "Mas intimo tiene su punto, la verdad. ¿Que opciones hay en julio?" },
      { "number": 4, "speaker": "asistente", "text": "En julio esta el VerdeFest, unos 80 dolares y con aire mas tranquilo. ¿Te tienta?" },
      { "number": 5, "speaker": "usuario", "text": "Si, suena bien. ¿Y si llueve alguno de los dias, tienen plan alternativo?" }
    ]
  }
}

Nota: el ejemplo de arriba es ILUSTRATIVO. El contenido real (scenarioType, scenario, turns, etc.) debe salir de la imagen que recibas y del escenario "WHAT TO DO". Lo que importa es imitar la ESTRUCTURA y el ESTILO reactivo del usuario (responde antes de avanzar, incluye una duda o cambio en al menos una version).

# TAREAS (en orden)
1. Extraer de la imagen: "WHAT TO DO" (obligatorio), "SCENARIO" tal cual aparezca (ej. SEARCH-REQUIRED, CONFLICTING-CUES, OBJECTIVE; sin traducir ni normalizar; vacio si no aparece), "User Role" si aparece, "SKILLS TESTED" si aparecen, y cualquier restriccion visible.
2. Clasificar el escenario en uno de: customer_service, scheduling, information, troubleshooting, sales, emergency, creative (elige el dominante si mezcla varios).
3. Generar DOS dialogos del MISMO escenario (modelA y modelB), cada uno de 3 a 6 turnos alternando usuario y asistente.

# REGLAS DE LAS DOS VERSIONES
- Mismo objetivo, energia, temas y profundidad en ambas (consistencia 1:1 para una comparacion justa).
- FRASEO y ORDEN distintos: una puede arrancar por precios y la otra por fechas, por ejemplo. No son sinonimos encadenados; son dos conversaciones de dos personas distintas.
- Cada turno: maximo 60 palabras, una unica intervencion por persona.
- Variedad gramatical: preguntas, afirmaciones, exclamaciones, negaciones.
- Coloquial y realista, no excesivamente informal.
- Refleja las restricciones y contexto del "WHAT TO DO".
- Ejercita las "SKILLS TESTED" cuando existan.
- Respeta el "User Role": si es "Customer", los turnos de usuario reflejan ese rol.
- Si el escenario implica numeros, fechas o datos, inventalos coherentemente (pueden diferir entre modelA y modelB).
- El asistente suena empatico y profesional, con un estilo ligeramente distinto entre modelA (mas directo) y modelB (mas conversacional), por ejemplo.

# REGLAS ANTI-SCRIPTING (prioridad #1 — su violacion invalida el guion)
Un anotador que sigue un guion preescrito e ignora al modelo causa AUTO-FAIL. Para evitarlo, el usuario de tus dialogos debe comportarse asi:

1. RESPONDER ANTES DE AVANZAR. En cada turno del usuario, este debe PRIMERO responder o reconocer lo que el asistente acabo de decir, y recien despues plantear su siguiente punto. Como hacerlo: empieza el turno del usuario con un conector de respuesta ("Si, ese mismo.", "Depende.", "Hmm, buena pregunta.", "No, mas bien al reves.") y luego agrega tu nuevo punto. Ejemplo a imitar: asistente pregunta "¿Ese es el festival que buscabas?" -> usuario responde "Si, ese mismo. ¿Tienes las fechas exactas?". Nunca dejes que el usuario ignore una pregunta directa del asistente.
2. NO PARECER UNA LISTA. El usuario debe reaccionar de forma espontanea a lo que escucha, no recorrer una secuencia fija de preguntas.
3. VARIAR ENTRE modelA Y modelB. No repitas las mismas preguntas en el mismo orden; cada version cubre los mismos temas clave pero por caminos distintos.
4. ADAPTABILIDAD. En al menos UNA de las dos versiones, el usuario debe mostrar un cambio de opinion, una interrupcion, una duda genuina o una redireccion a mitad de conversacion (ej. "o espera, pensandolo bien prefiero algo mas tranquilo", "antes de seguir, ¿incluye artistas locales?", "¿y si llueve?").
5. CIERRE NATURAL. No todas las conversaciones llegan a resolucion completa; un final abierto ("lo pienso y te confirmo") es valido y a menudo mas realista.

# RECORDATORIO FINAL
Responde SOLO el objeto JSON con modelA y modelB. Nada de texto fuera del JSON. Nada de fences.`;

/** Lowercases the first letter of a string (used by the fallback variant). */
function lowerFirst(s: string): string {
  if (!s) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
}

export async function POST(req: NextRequest) {
  try {
    let body: DialogRequest;
    try {
      body = await req.json();
    } catch {
      return errorResponse(
        "El cuerpo de la solicitud no es JSON valido.",
        400,
        'Asegurate de enviar { "imageDataUrl": "data:image/jpeg;base64,..." }'
      );
    }

    const { imageDataUrl, model: requestedModel } = body;

    if (
      !imageDataUrl ||
      typeof imageDataUrl !== "string" ||
      !imageDataUrl.startsWith("data:image/")
    ) {
      return errorResponse(
        "El campo 'imageDataUrl' es obligatorio y debe ser una imagen en formato data URL.",
        400,
        'Envia: { "imageDataUrl": "data:image/jpeg;base64,..." }'
      );
    }

    const userPrompt =
      "Lee esta imagen con un escenario 'What to do'. Extrae el texto, clasifica el escenario y genera DOS versiones del dialogo (modelA y modelB) siguiendo las reglas anti-scripting. Devuelve SOLO el JSON con la estructura del contrato (modelA y modelB anidados, nunca un array 'turns' suelto en la raiz).";

    try {
      const result = await callOpenRouter(
        SYSTEM_PROMPT,
        userPrompt,
        0.7,
        10000,
        resolveModelForTask("dialog", requestedModel),
        [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              { type: "image_url", image_url: { url: imageDataUrl } },
            ],
          },
        ]
      );

      const content = extractContent(result.data);

      if (!content.trim()) {
        return errorResponse(
          "OpenRouter devolvio una respuesta vacia.",
          502,
          {
            responseReceived: JSON.stringify(result.data).slice(0, 1000),
          }
        );
      }

      // Try to parse as JSON
      let parsed: {
        scenarioType?: string;
        scenario?: string;
        scenarioDescription?: string;
        userRole?: string;
        skillsTested?: string[];
        modelA?: DialogVariant;
        modelB?: DialogVariant;
        turns?: DialogTurn[];
      } = {};

      try {
        // Strip markdown fences if present
        const cleaned = content
          .replace(/^```(?:json)?\s*/i, "")
          .replace(/\s*```$/i, "")
          .trim();
        parsed = JSON.parse(cleaned);
      } catch {
        // If parse fails, wrap the entire response as a single legacy turn
        parsed = {
          scenarioType: "desconocido",
          scenarioDescription: "No se pudo clasificar",
          turns: [{ number: 1, text: content.trim() }],
        };
      }

      // SAFETY NET: if the model returned a legacy flat `turns[]` array
      // instead of the dual modelA/modelB structure, derive two variants so
      // the dual UI always has something to render (rather than silently
      // falling back to a single column). modelA keeps the original; modelB
      // is a lightly rephrased mirror of the same turns so it still differs.
      if (
        (!parsed.modelA || !parsed.modelB) &&
        Array.isArray(parsed.turns) &&
        parsed.turns.length > 0
      ) {
        const baseTurns = parsed.turns;
        if (!parsed.modelA) {
          parsed.modelA = {
            label: "Model A",
            turns: baseTurns.map((t) => ({ ...t })),
          };
        }
        if (!parsed.modelB) {
          parsed.modelB = {
            label: "Model B",
            turns: baseTurns.map((t, i) => ({
              number: t.number,
              speaker: t.speaker,
              // Light surface variation per turn so the two columns are not
              // identical. Keeps meaning; changes phrasing. This is a
              // fallback only — the prompt asks for genuine dual generation.
              text:
                i % 2 === 0
                  ? `Mira, ${lowerFirst(t.text)}`
                  : `${t.text} ¿te hace sentido?`,
            })),
          };
        }
      }

      const response: DialogResponse = {
        scenarioType: parsed.scenarioType || "desconocido",
        scenario: parsed.scenario,
        scenarioDescription: parsed.scenarioDescription,
        userRole: parsed.userRole,
        skillsTested: parsed.skillsTested,
        // Dual A/B variants when present; legacy `turns` is kept for backward
        // compatibility with older documents and parse-fallback responses.
        modelA: parsed.modelA,
        modelB: parsed.modelB,
        turns: parsed.turns,
        usage: extractUsage(result.data),
        model:
          result.model || resolveModelForTask("dialog", requestedModel),
        requestedAt: new Date().toISOString(),
      };

      // Persist task spec (SCENARIO + WHAT TO DO + Skills Tested) so the
      // analyze endpoint can use it as evaluation criteria for task success.
      // Best-effort — a failure here should not break the response.
      try {
        await saveTaskSpec({
          scenario: parsed.scenario,
          whatToDo: parsed.scenarioDescription,
          skillsTested: parsed.skillsTested,
          userRole: parsed.userRole,
        });
      } catch (saveError) {
        const msg =
          saveError instanceof Error ? saveError.message : String(saveError);
        console.error("[API /api/dialog] saveTaskSpec error:", msg);
      }

      return Response.json(response);
    } catch (apiError) {
      const msg =
        apiError instanceof Error ? apiError.message : String(apiError);
      const status =
        msg.startsWith("OpenRouter API 401") ||
        msg.startsWith("OpenRouter API 403")
          ? 503
          : 502;
      return errorResponse(
        "Error al comunicarse con OpenRouter.",
        status,
        msg
      );
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    console.error("[API /api/dialog] UNEXPECTED ERROR:", {
      message: msg,
      stack,
    });

    return errorResponse(
      "Error interno inesperado del servidor.",
      500,
      {
        message: msg,
        stack: stack?.split("\n").slice(0, 5),
      }
    );
  }
}
