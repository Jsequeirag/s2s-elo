import { NextRequest, NextResponse } from "next/server";
import {
  callOpenRouter,
  errorResponse,
  extractContent,
  extractUsage,
  resolveModelForTask,
} from "@/lib/openrouter";

interface GeneralQARequest {
  question: string;
  model?: string;
}

interface GeneralQAResponse {
  answer: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost: number;
  };
  model: string;
  requestedAt: string;
}

const SYSTEM_PROMPT = `Eres un asistente util y directo. Responde en espanol.

UNICA REGLA: tus respuestas deben ser CLARAS y BREVES. Ve al punto.
- No uses introducciones innecesarias ("Claro,", "Por supuesto,").
- No repitas la pregunta.
- Si la pregunta admite una respuesta corta, da esa respuesta corta.
- Usa bullets solo si ayudan a la claridad; si no, una o dos oraciones.`;

export async function POST(req: NextRequest) {
  try {
    // 1. Parse request body
    let body: GeneralQARequest;
    try {
      body = await req.json();
    } catch {
      return errorResponse(
        "El cuerpo de la solicitud no es JSON valido.",
        400,
        'Asegurate de enviar { "question": "tu pregunta aqui" }'
      );
    }

    const { question, model: requestedModel } = body;

    // 2. Validate question
    if (!question || typeof question !== "string") {
      return errorResponse(
        "El campo 'question' es obligatorio y debe ser texto.",
        400,
        'Envia: { "question": "texto de la pregunta" }'
      );
    }

    if (question.trim().length < 2) {
      return errorResponse(
        `La pregunta debe tener al menos 2 caracteres. Recibidos: ${question.trim().length}.`,
        400
      );
    }

    // 3. Call OpenRouter API (low temperature + capped tokens enforce brevity)
    let data;
    let modelUsed;
    try {
      const result = await callOpenRouter(
        SYSTEM_PROMPT,
        question.trim(),
        0.3,
        1000,
        resolveModelForTask("general", requestedModel)
      );
      data = result.data;
      modelUsed = result.model;
    } catch (apiError) {
      const msg =
        apiError instanceof Error ? apiError.message : String(apiError);
      const status =
        msg.startsWith("OpenRouter API 401") ||
          msg.startsWith("OpenRouter API 403")
          ? 503
          : 502;
      return errorResponse("Error al comunicarse con OpenRouter.", status, msg);
    }

    // 4. Detect error envelope in the body
    if (data?.error) {
      return errorResponse(
        "OpenRouter devolvio un error en el cuerpo de la respuesta.",
        502,
        { modelUsed, apiError: data.error }
      );
    }

    // 5. Extract content
    const content = extractContent(data);

    if (!content.trim()) {
      return errorResponse(
        "OpenRouter devolvio una respuesta vacia.",
        502,
        { modelUsed, responseReceived: JSON.stringify(data).slice(0, 1000) }
      );
    }

    const response: GeneralQAResponse = {
      answer: content.trim(),
      usage: extractUsage(data),
      model: modelUsed || resolveModelForTask("general", requestedModel),
      requestedAt: new Date().toISOString(),
    };
    return NextResponse.json(response);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    console.error("[API /api/general-qa] UNEXPECTED ERROR:", { message: msg, stack });

    return errorResponse("Error interno inesperado del servidor.", 500, {
      message: msg,
      stack: stack?.split("\n").slice(0, 5),
    });
  }
}
