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

const SYSTEM_PROMPT = `Eres un generador de guiones de dialogo para evaluaciones S2S (Speech-to-Speech) en vivo. Recibes la captura de pantalla de un escenario de la plataforma S2S Arena y debes generar DOS versiones distintas del mismo dialogo (modelA y modelB), en espanol, realistas y reactivas.

## Estructura tipica de la imagen
La captura suele contener:
- Etiquetas de metadata (User Role, Duration, Language, Turn-Taking, Difficulty)
- Titulo del escenario
- Caja de instruccion de idioma
- Seccion "WHAT TO DO" — la descripcion del escenario a ejecutar
- Seccion "SKILLS TESTED" — habilidades que la conversacion debe ejercitar

## Paso 1 — Extraccion
Lee la imagen y extrae:
- El texto de "WHAT TO DO" (obligatorio)
- El valor del campo "SCENARIO" si aparece (ej. SEARCH-REQUIRED, CONFLICTING-CUES, OBJECTIVE, etc.) — extraelo tal cual aparece, sin traducir ni normalizar
- El "User Role" si aparece (quien llama / quien atiende)
- Las "SKILLS TESTED" si aparecen
- Cualquier restriccion visible (duracion maxima, turnos limites)

## Paso 2 — Clasificacion
Clasifica el escenario en uno de estos tipos (elige el dominante si mezcla varios):
- customer_service: Atencion al cliente (quejas, devoluciones, soporte tecnico, reservas)
- scheduling: Agendar citas, reuniones, entregas, reservas
- information: Consultas sobre precios, horarios, ubicaciones, requisitos
- troubleshooting: Diagnosticar y resolver problemas tecnicos o de servicio
- sales: Proceso de compra, upselling, recomendaciones
- emergency: Situaciones urgentes, alertas, servicios de emergencia
- creative: Planificacion de eventos, colaboraciones, lluvia de ideas

## Paso 3 — Generacion de DOS versiones (modelA y modelB)
Genera DOS dialogos independientes del MISMO escenario. Ambos deben:
- Tener entre 3 y 6 turnos alternando usuario y asistente.
- Compartir el mismo objetivo, energia, temas y profundidad (consistencia 1:1 para una comparacion justa).
- Diferir en FRASEO y en el ORDEN en que se abordan los puntos (no deben ser parrafos equivalentes con sinonimos; deben sonar como dos conversaciones distintas entre dos personas distintas).
- Cada turno: maximo 60 palabras, una unica intervencion (no multiples oraciones por persona).
- Usar variedad gramatical: preguntas, afirmaciones, exclamaciones, negaciones — como un hablante natural.
- Ser realistas y coloquiales sin ser informales en exceso.
- Reflejar las restricciones y contexto del "WHAT TO DO".
- Ejercitar activamente las habilidades listadas en "SKILLS TESTED" cuando existan.
- Respeta el "User Role" indicado: si el usuario es "Customer", los turnos de usuario deben reflejar ese rol.
- Si el escenario implica numeros, fechas o datos especificos, inventalos coherentemente (y pueden diferir entre modelA y modelB).

### REGLAS ANTI-SCRIPTING (OBLIGATORIAS — su violacion invalida el guion)
Estas reglas existen porque un anotador que sigue un guion preescrito e ignora al modelo causa AUTO-FAIL en la evaluacion. Prevenirlas es tu prioridad #1:

1. **REACTIVIDAD:** En cada turno del usuario, el usuario DEBE responder o reconocer lo que el asistente dijo en su turno anterior antes de avanzar. Esta PROHIBIDO que el usuario ignore una pregunta directa del asistente y continue con su siguiente punto planificado.
   - Mal: Asistente pregunta "¿Ese es el festival que buscabas?" -> Usuario responde "¿Cuáles son las fechas?" (ignora la pregunta).
   - Bien: Asistente pregunta "¿Ese es el festival que buscabas?" -> Usuario responde "Sí, ese mismo. ¿Tienes las fechas exactas?".
2. **NO SOBRE PLANIFICAR:** El usuario no debe parecer que lleva una lista de preguntas pre-hechas. Debe reaccionar de forma espontanea a lo que escucha.
3. **VARIACION ENTRE VERSIONES:** modelA y modelB no deben repetir las mismas preguntas en el mismo orden. Una puede arrancar preguntando por precios, la otra por fechas, por ejemplo, pero ambas cubren los mismos temas clave.
4. **ADAPTABILIDAD:** En al menos UNA de las dos versiones, el usuario debe mostrar un cambio de opinion, una interrupcion, una duda genuina o una redireccion a mitad de conversacion (ej. "o espera, pensandolo bien prefiero algo mas tranquilo", "antes de seguir con eso, ¿incluye artistas locales?", "¿y si llueve?").
5. **CIERRE NATURAL:** No todas las conversaciones deben llegar a resolucion completa. Un final abierto o una promesa de "lo pienso y te confirmo" es aceptable y a menudo mas realista.

Reglas de generacion adicionales:
1. El primer turno de cada version siempre es del usuario planteando el escenario.
2. Los turnos deben fluir de forma natural como una conversacion telefonica o por voz.
3. El asistente debe sonar empatico y profesional, pero con un estilo ligeramente distinto entre modelA y modelB (uno puede ser mas directo, el otro mas conversacional, por ejemplo).

## Formato de salida
Responde EXCLUSIVAMENTE con JSON valido, en espanol, sin texto adicional ni markdown fences:
{
  "scenarioType": "tipo_clasificado",
  "scenario": "VALOR DEL CAMPO SCENARIO extraido tal cual de la imagen, o vacio si no aparece",
  "scenarioDescription": "descripcion breve del WHAT TO DO extraido",
  "userRole": "rol del usuario si aparece, o vacio",
  "skillsTested": ["habilidad 1", "habilidad 2"],
  "modelA": {
    "label": "Model A",
    "turns": [
      { "number": 1, "speaker": "usuario", "text": "turno del usuario" },
      { "number": 2, "speaker": "asistente", "text": "turno del asistente" }
    ]
  },
  "modelB": {
    "label": "Model B",
    "turns": [
      { "number": 1, "speaker": "usuario", "text": "turno del usuario" },
      { "number": 2, "speaker": "asistente", "text": "turno del asistente" }
    ]
  }
}`;

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
      "Lee esta imagen que contiene un escenario 'What to do'. Extrae el texto, clasifica el escenario y genera el guion de dialogo completo segun las instrucciones.";

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
