import { NextRequest } from "next/server";
import {
    callOpenRouter,
    errorResponse,
    extractContent,
    extractUsage,
    resolveModelForTask,
} from "@/lib/openrouter";
import { getLatestJustification } from "@/lib/mongodb";

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

        // Load saved justification — it is the SOURCE OF TRUTH.
        // If missing, we cannot do the comparison.
        const saved = await getLatestJustification();
        const savedJustification = saved?.justification?.trim() || "";

        if (!savedJustification) {
            return errorResponse(
                "No hay una justificacion guardada. Primero genera una justificacion en el tab Transcribir antes de analizar la imagen.",
                400,
                "La justificacion generada es la fuente de verdad para comparar el Rationale de la imagen."
            );
        }

        const systemPrompt = `Eres un verificador de exactitud. Recibes una imagen con un campo "Rationale" escrito manualmente por un evaluador, y una justificacion de referencia que es la FUENTE DE VERDAD (texto limpio, correcto, ya generado).

Tu unico objetivo es: verificar que el texto del Rationale extraido de la imagen sea IDENTICO a la justificacion de referencia. Cualquier diferencia es una desviacion que debes reportar.

JUSTIFICACION DE REFERENCIA (fuente de verdad):
"""
${savedJustification}
"""

Tipos de desviaciones que debes detectar:
- ortografia: errores de ortografia (ej. "prefr" en vez de "prefer")
- palabra_cortada: palabras incompletas o cortadas (ej. "informatio" en vez de "information")
- texto_faltante: fragmentos que aparecen en la justificacion pero NO en el Rationale
- texto_extra: fragmentos que aparecen en el Rationale pero NO en la justificacion
- orden: palabras o frases en orden diferente

Reglas:
1. Extrae el texto completo del Rationale de la imagen.
2. Compara palabra por palabra contra la justificacion de referencia.
3. Lista TODAS las desviaciones encontradas, sin excepcion.
4. Si no hay desviaciones, devuelve deviations: [] e isIdentical: true.
5. El campo finalText SIEMPRE debe ser igual al texto de la justificacion de referencia (es la meta).
6. Responde EXCLUSIVAMENTE con JSON valido, sin texto adicional.

Formato de salida:
{
  "detectedText": "texto exacto extraido del Rationale en la imagen",
  "finalText": "texto de la justificacion de referencia (la meta)",
  "isIdentical": true | false,
  "deviations": [
    {
      "type": "ortografia" | "palabra_cortada" | "texto_faltante" | "texto_extra" | "orden",
      "rationale": "fragmento del Rationale con el problema",
      "justification": "fragmento correspondiente de la justificacion correcta",
      "reason": "explicacion breve del problema"
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

            const response: ImageResponse = {
                detectedText: parsed.detectedText || content.trim(),
                finalText: savedJustification,
                isIdentical: parsed.isIdentical ?? false,
                deviations: parsed.deviations || [],
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
