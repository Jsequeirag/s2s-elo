import { NextRequest } from "next/server";
import {
  callOpenRouter,
  errorResponse,
  extractContent,
  extractUsage,
  resolveModelForTask,
} from "@/lib/openrouter";

interface DialogRequest {
  imageDataUrl: string;
  model?: string;
}

interface DialogTurn {
  number: number;
  text: string;
}

interface DialogResponse {
  scenarioType: string;
  scenarioDescription?: string;
  userRole?: string;
  skillsTested?: string[];
  turns: DialogTurn[];
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost: number;
  };
  model: string;
  requestedAt: string;
}

const SYSTEM_PROMPT = `Eres un generador de guiones de dialogo para evaluaciones S2S (Speech-to-Speech) en vivo. Recibes la captura de pantalla de un escenario de la plataforma S2S Arena y debes generar un guion de dialogo realista en espanol.

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

## Paso 3 — Generacion del guion
Genera un dialogo de 3 a 6 turnos alternando entre usuario y asistente. Cada turno debe:
- Ser una unica intervencion (no multiples oraciones por persona)
- Tener maximo 60 palabras
- Usar variedad gramatical: preguntas, afirmaciones, exclamaciones, negaciones — como un hablante natural
- Ser realista y coloquial sin ser informal en exceso
- Avanzar la conversacion hacia resolucion del escenario
- Reflejar las restricciones y contexto del "WHAT TO DO"
- Ejercitar activamente las habilidades listadas en "SKILLS TESTED" cuando existan

Reglas de generacion:
1. El primer turno siempre es del usuario planteando el escenario.
2. Los turnos deben fluir de forma natural como una conversacion telefonica o por voz.
3. El asistente debe sonar empatico y profesional.
4. El dialogo debe llegar a un punto de resolucion o cierre natural.
5. Si el escenario implica numeros, fechas o datos especificos, inventalos coherentemente.
6. Respeta el "User Role" indicado: si el usuario es "Customer", los turnos de usuario deben reflejar ese rol.

## Formato de salida
Responde EXCLUSIVAMENTE con JSON valido, en espanol, sin texto adicional:
{
  "scenarioType": "tipo_clasificado",
  "scenarioDescription": "descripcion breve del WHAT TO DO extraido",
  "userRole": "rol del usuario si aparece, o vacio",
  "skillsTested": ["habilidad 1", "habilidad 2"],
  "turns": [
    { "number": 1, "speaker": "usuario", "text": "turno del usuario" },
    { "number": 2, "speaker": "asistente", "text": "turno del asistente" }
  ]
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
        8000,
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
        scenarioDescription?: string;
        userRole?: string;
        skillsTested?: string[];
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
        // If parse fails, wrap the entire response as a single turn
        parsed = {
          scenarioType: "desconocido",
          scenarioDescription: "No se pudo clasificar",
          turns: [{ number: 1, text: content.trim() }],
        };
      }

      const response: DialogResponse = {
        scenarioType: parsed.scenarioType || "desconocido",
        scenarioDescription: parsed.scenarioDescription,
        userRole: parsed.userRole,
        skillsTested: parsed.skillsTested,
        turns: parsed.turns || [{ number: 1, text: content.trim() }],
        usage: extractUsage(result.data),
        model:
          result.model || resolveModelForTask("dialog", requestedModel),
        requestedAt: new Date().toISOString(),
      };

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
