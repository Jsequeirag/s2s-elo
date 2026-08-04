import { NextRequest, NextResponse } from "next/server";
import {
  callOpenRouter,
  errorResponse,
  extractContent,
  extractUsage,
  loadReferenceFiles,
  resolveModelForTask,
} from "@/lib/openrouter";

interface QARequest {
  question: string;
  model?: string;
}

interface QAResponse {
  answer: string;
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
    // 1. Parse request body
    let body: QARequest;
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

    if (question.trim().length < 5) {
      return errorResponse(
        `La pregunta debe tener al menos 5 caracteres. Recibidos: ${question.trim().length}.`,
        400
      );
    }

    // 3. Build system prompt from reference files
    const { instructions, guide } = await loadReferenceFiles();

    const systemPrompt = `Eres un asistente experto en la evaluacion de modelos de voz AI Live S2S (Speech-to-Speech). Tu trabajo es responder preguntas de los evaluadores basandote EXCLUSIVAMENTE en el material de referencia siguiente.

REGLAS:
1. Responde SIEMPRE en espanol.
2. Basate UNICAMENTE en el material de referencia. No inventes reglas ni criterios que no esten en el material.
3. Se conciso, directo y especifico. Cita la dimension, regla o criterio exacto cuando aplique.
4. Si la pregunta es sobre un caso limite que el material no cubre, di claramente: "El material de referencia no cubre este caso especifico" y da la orientacion mas cercana posible.
5. Usa terminos tecnicos cuando aporten claridad (dimension, subdimension, trade-off, Task Success, Tech Issues, etc.).

====================
MATERIAL DE REFERENCIA 1: INSTRUCCIONES DE EVALUACION
====================
${instructions}

====================
MATERIAL DE REFERENCIA 2: GUIA DE EVALUACION
====================
${guide}`;

    // 4. Call OpenRouter API
    let data;
    let modelUsed;
    try {
      const result = await callOpenRouter(
        systemPrompt,
        question.trim(),
        0.3,
        800,
        resolveModelForTask("qa", requestedModel)
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

    // 5. Detect error envelope in the body
    if (data?.error) {
      return errorResponse(
        "OpenRouter devolvio un error en el cuerpo de la respuesta.",
        502,
        { modelUsed, apiError: data.error }
      );
    }

    // 6. Extract content
    const content = extractContent(data);

    if (!content.trim()) {
      return errorResponse(
        "OpenRouter devolvio una respuesta vacia.",
        502,
        { modelUsed, responseReceived: JSON.stringify(data).slice(0, 1000) }
      );
    }

    const result: QAResponse = {
      answer: content.trim(),
      usage: extractUsage(data),
      model: modelUsed || resolveModelForTask("qa", requestedModel),
      requestedAt: new Date().toISOString(),
    };
    return NextResponse.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    console.error("[API /api/qa] UNEXPECTED ERROR:", { message: msg, stack });

    return errorResponse("Error interno inesperado del servidor.", 500, {
      message: msg,
      stack: stack?.split("\n").slice(0, 5),
    });
  }
}
