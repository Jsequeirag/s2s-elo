import { NextRequest } from "next/server";
import {
    callOpenRouter,
    errorResponse,
    extractContent,
    extractUsage,
    resolveModelForTask,
} from "@/lib/openrouter";

interface ImageRequest {
    question?: string;
    imageDataUrl: string;
    model?: string;
}

interface ImageErrorItem {
    original: string;
    corrected: string;
    reason: string;
    position: number;
}

interface ImageResponse {
    answer: string;
    detectedText?: string;
    correctedText?: string;
    errors?: ImageErrorItem[];
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
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
                'Asegurate de enviar { "imageDataUrl": "data:image/jpeg;base64,...", "question": "texto opcional" }'
            );
        }

        const { question, imageDataUrl, model: requestedModel } = body;

        if (!imageDataUrl || typeof imageDataUrl !== "string" || !imageDataUrl.startsWith("data:image/")) {
            return errorResponse(
                "El campo 'imageDataUrl' es obligatorio y debe ser una imagen en formato data URL.",
                400,
                'Envia: { "imageDataUrl": "data:image/jpeg;base64,..." }'
            );
        }

        const prompt = (
            question?.trim() ||
            "Lee solo la descripcion visible bajo el encabezado Rationale en la imagen. Primero extrae ese bloque de texto. Luego corrige los errores ortograficos de ese texto y devuelve el texto corregido en formato JSON. La justificacion generada ya esta bien y no debe tocarse."
        ).trim();

        const systemPrompt = `Eres un analizador visual especializado en lectura de capturas de pantalla. Tu tarea es extraer y corregir el texto que aparece inmediatamente debajo del encabezado Rationale en la imagen.

Objetivo:
- Leer únicamente la descripcion del campo Rationale.
- Si el texto tiene errores ortograficos, corregirlos.
- Dejar intacta cualquier justificacion generada en otra pantalla; tu trabajo es corregir el texto de la imagen, no la justificacion.
- Responder EXCLUSIVAMENTE con JSON valido, en espanol.

Reglas:
1. Extrae solo el texto bajo "Rationale".
2. Si no se distingue claramente ese bloque, responde indicando que no se ve el texto del Rationale.
3. Devuelve el texto original y el texto corregido.
4. Lista los errores ortograficos en orden de aparicion dentro del texto.
5. No des nada fuera del JSON.
6. Mantente preciso y conciso.

Responde con este formato:
{
  "detectedText": "texto extraido de la imagen",
  "correctedText": "texto corregido con las palabras erradas marcadas con **",
  "errors": [
    {
      "original": "palabra errada",
      "corrected": "palabra correcta",
      "reason": "ortografia",
      "position": 1
    }
  ],
  "summary": "resumen breve en espanol"
}`;

        try {
            const result = await callOpenRouter(
                systemPrompt,
                prompt,
                0.2,
                800,
                resolveModelForTask("image", requestedModel),
                [
                    {
                        role: "system",
                        content: systemPrompt,
                    },
                    {
                        role: "user",
                        content: [
                            { type: "text", text: prompt },
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

            let parsedAnswer: Partial<ImageResponse> = {};
            try {
                parsedAnswer = JSON.parse(content);
            } catch {
                parsedAnswer = {
                    answer: content.trim(),
                };
            }

            const response: ImageResponse = {
                answer: parsedAnswer.correctedText || parsedAnswer.answer || content.trim(),
                detectedText: parsedAnswer.detectedText,
                correctedText: parsedAnswer.correctedText,
                errors: parsedAnswer.errors,
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
