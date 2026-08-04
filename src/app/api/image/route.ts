import { NextRequest } from "next/server";
import {
    callOpenRouter,
    errorResponse,
    extractContent,
    resolveModelForTask,
} from "@/lib/openrouter";

interface ImageRequest {
    question?: string;
    imageDataUrl: string;
    model?: string;
}

interface ImageResponse {
    answer: string;
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
            "Analiza la descripcion visible del campo Rationale en la imagen. Focalizate en si es especifica, concreta, concisa y apoyada en evidencia observable. Responde en espanol con un JSON valido."
        ).trim();

        const systemPrompt = `Eres un analizador visual especializado en evaluar la descripcion del campo Rationale dentro de capturas de pantalla de una interfaz de evaluacion. Tu trabajo es responder EXCLUSIVAMENTE con JSON valido, en espanol, usando el esquema que se te indique.

Objetivo:
- Leer la descripcion visible del campo Rationale en la imagen.
- Decidir si la descripcion es especifica, concreta, concisa y basada en evidencia observable.
- No evaluar la imagen como un documento general; enfocate en el texto del Rationale.

Reglas:
1. Si aparece texto del Rationale, identifica problemas de calidad en esa descripcion: falta de evidencia, genericidad, vaguedad, falta de timestamps/turnos/frases, exceso de longitud o falta de concrecion.
2. Si no se distingue el texto del Rationale, responde indicando que no se ve la descripcion claramente.
3. No des nada fuera del JSON.
4. Mantente conciso, claro y concreto.

Responde con este formato:
{
  "hasRationaleIssues": true,
  "issues": [
    {
      "type": "generic|missing_evidence|not_concrete|too_long|unclear",
      "detail": "descripcion del problema",
      "severity": "minor|moderate|major"
    }
  ],
  "summary": "Resumen breve en espanol"
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
                    { responseReceived: JSON.stringify(result.data).slice(0, 1000) }
                );
            }

            const response: ImageResponse = { answer: content.trim() };
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
