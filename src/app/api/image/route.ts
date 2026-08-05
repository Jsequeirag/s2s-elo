import { NextRequest } from "next/server";
import {
    callOpenRouter,
    errorResponse,
    extractContent,
    extractUsage,
    resolveModelForTask,
} from "@/lib/openrouter";
import { getLatestJustification } from "@/lib/mongodb";

// Allow up to 60s for vision model calls (image processing is slow).
export const maxDuration = 60;

interface ImageRequest {
    question?: string;
    imageDataUrl: string;
    model?: string;
}

interface Deviation {
    type: "ortografia" | "palabra_cortada" | "texto_faltante" | "texto_extra" | "orden";
    rationale: string;
    justification: string;
    reason: string;
}

interface ImageResponse {
    detectedText: string;
    finalText: string;
    isIdentical: boolean;
    deviations: Deviation[];
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
        cost: number;
    };
    model: string;
    requestedAt: string;
}

export async function POST(req: NextRequest) {
    try {
        let body: ImageRequest;
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

        if (!imageDataUrl || typeof imageDataUrl !== "string" || !imageDataUrl.startsWith("data:image/")) {
            return errorResponse(
                "El campo 'imageDataUrl' es obligatorio y debe ser una imagen en formato data URL.",
                400,
                'Envia: { "imageDataUrl": "data:image/jpeg;base64,..." }'
            );
        }

        // Load saved justification — the AI-generated strengthenedJustification
        // (English) is the SOURCE OF TRUTH. The user's raw Spanish input is not.
        const saved = await getLatestJustification();
        const savedJustification = (
            (saved?.analysis as { strengthenedJustification?: string } | undefined)
                ?.strengthenedJustification || ""
        ).trim();

        if (!savedJustification) {
            return errorResponse(
                "No hay una justificacion generada por la IA. Primero analiza una justificacion en el tab Transcribir para que la IA genere el texto en ingles (fuente de verdad).",
                400,
                "La justificacion generada por la IA (strengthenedJustification, en ingles) es la fuente de verdad para comparar el Rationale de la imagen."
            );
        }

        const systemPrompt = `Eres un comparador de texto implacable. Recibes una imagen con un campo "Rationale" (escrito a mano por un evaluador, puede tener errores) y una justificacion de referencia (texto correcto, la FUENTE DE VERDAD).

Tu trabajo: extraer el texto del Rationale de la imagen y compararlo PALABRA POR PALABRA contra la justificacion. CADA diferencia, por minima que sea, es una desviacion que debes reportar.

JUSTIFICACION DE REFERENCIA (fuente de verdad):
"""
${savedJustification}
"""

METODO DE COMPARACION (sigue estos pasos obligatoriamente):
1. Extrae el texto completo del Rationale de la imagen.
2. Divide ambos textos en palabras/fragmentos.
3. Recorre secuencialmente comparando cada palabra del Rationale contra la justificacion.
4. Por CADA diferencia que encuentres, registra una desviacion.

Tipos de desviacion:
- ortografia: la palabra esta mal escrita (ej: "prefr" vs "prefer", "overal" vs "overall")
- palabra_cortada: palabra incompleta (ej: "informatio" vs "information")
- texto_faltante: palabras/frases que estan en la justificacion pero FALTAN en el Rationale (ej: el Rationale dice "smooth ." donde la justificacion dice "smooth dialogue and providing highly useful information.")
- texto_extra: palabras que estan en el Rationale pero NO en la justificacion
- orden: palabras en orden diferente

EJEMPLO:
Rationale extraido: "I prefr Model A as it successfully completed the task, maintaining a smooth . In contrast, Model B hallucinated about peanuts from turn 1..."
Justificacion: "I prefer Model A as it successfully completed the task, maintaining a smooth dialogue and providing highly useful information. In contrast, Model B hallucinated about peanuts from turn 1..."

Desviaciones esperadas:
[
  {"type":"ortografia","rationale":"prefr","justification":"prefer","reason":"Error de ortografia: falta la letra e"},
  {"type":"texto_faltante","rationale":"maintaining a smooth .","justification":"maintaining a smooth dialogue and providing highly useful information.","reason":"Falta 'dialogue and providing highly useful information' antes del punto"}
]

CRITICO:
- NO omitas desviaciones. Si una palabra difiere en una sola letra, es una desviacion.
- Compara TODO el texto, de principio a fin.
- Si dudaste entre dos palabras, reportalo.
- finalText debe ser la justificacion completa con cada fragmento corregido envuelto en **doble asterisco**.

Formato de salida (SOLO JSON, sin markdown, sin texto extra):
{
  "detectedText": "texto exacto extraido del Rationale",
  "finalText": "justificacion con correcciones en **negrita**",
  "isIdentical": false,
  "deviations": [
    {
      "type": "ortografia",
      "rationale": "palabra o fragmento del Rationale",
      "justification": "palabra o fragmento correcto de la justificacion",
      "reason": "que paso"
    }
  ]
}`;

        try {
            const result = await callOpenRouter(
                systemPrompt,
                "Analiza esta imagen. Extrae el texto del Rationale, comparalo contra la justificacion de referencia, y reporta todas las desviaciones.",
                0.1,
                4000,
                resolveModelForTask("image", requestedModel),
                [
                    {
                        role: "system",
                        content: systemPrompt,
                    },
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: "Analiza esta imagen. Extrae el texto del Rationale, comparalo contra la justificacion de referencia, y reporta todas las desviaciones.",
                            },
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

            // Strip markdown fences if present
            let parsed: Partial<ImageResponse> = {};
            try {
                const cleaned = content
                    .replace(/^```(?:json)?\s*/i, "")
                    .replace(/\s*```$/i, "")
                    .trim();
                parsed = JSON.parse(cleaned);
            } catch {
                parsed = {
                    detectedText: content.trim(),
                    finalText: savedJustification,
                    isIdentical: false,
                    deviations: [],
                };
            }

            const deviations = parsed.deviations || [];
            const isIdentical = parsed.isIdentical ?? deviations.length === 0;

            // Determine finalText:
            // 1. If the model returned finalText with markers (* or **), use it.
            // 2. Otherwise, apply markers programmatically from deviations.
            // 3. If no deviations, use the clean justification.
            let finalText = savedJustification;

            const modelFinalText = typeof parsed.finalText === "string" ? parsed.finalText.trim() : "";
            const hasMarkers = /\*[^*]+\*/.test(modelFinalText);

            if (hasMarkers) {
              finalText = modelFinalText;
            } else if (deviations.length > 0) {
              // Programmatically wrap each justification fragment in **bold**
              let marked = savedJustification;
              for (const dev of deviations) {
                const frag = dev.justification?.trim();
                if (frag && frag.length > 2) {
                  // Escape regex special chars in the fragment
                  const escaped = frag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                  marked = marked.replace(
                    new RegExp(escaped, "gi"),
                    `**${frag}**`
                  );
                }
              }
              finalText = marked;
            }

            const response: ImageResponse = {
                detectedText: parsed.detectedText || content.trim(),
                finalText,
                isIdentical,
                deviations,
                usage: extractUsage(result.data),
                model: result.model || resolveModelForTask("image", requestedModel),
                requestedAt: new Date().toISOString(),
            };

            return Response.json(response);
        } catch (apiError) {
            const msg = apiError instanceof Error ? apiError.message : String(apiError);
            const status = msg.startsWith("OpenRouter API 401") || msg.startsWith("OpenRouter API 403") ? 503 : 502;
            return errorResponse("Error al comunicarse con OpenRouter.", status, msg);
        }
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        const stack = error instanceof Error ? error.stack : undefined;

        console.error("[API /api/image] UNEXPECTED ERROR:", { message: msg, stack });

        return errorResponse("Error interno inesperado del servidor.", 500, {
            message: msg,
            stack: stack?.split("\n").slice(0, 5),
        });
    }
}
