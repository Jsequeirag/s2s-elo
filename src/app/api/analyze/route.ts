import { NextRequest, NextResponse } from "next/server";
import {
  callOpenRouter,
  errorResponse,
  extractContent,
  resolveModelForTask,
} from "@/lib/openrouter";

const SUBDIMENSION_CRITERIA = [
  {
    id: "llm-isms",
    label: "LLM-isms / Repetition Loop",
    question:
      "Does the model overuse LLM-isms (i.e. using recognizable catchphrases, sycophantic behavior) or get stuck repeating the same phrase/question in a tight loop?",
  },
  {
    id: "cut-off",
    label: "Cut-off / Interruption",
    question:
      "Does the model cut the user off or respond over the user before they finish speaking, creating a disruptive turn-taking experience?",
  },
  {
    id: "instruction-fail",
    label: "Instruction Misalignment",
    question:
      "Does the model fail to align with the user's explicit request — ranging from partially addressing it to completely ignoring, contradicting, or declining a clearly safe instruction?",
  },
  {
    id: "hallucination",
    label: "Hallucination / Misinformation",
    question:
      "Does the model give incorrect, misleading, or hallucinated information?",
  },
  {
    id: "anthropomorphism",
    label: "Inappropriate Anthropomorphism",
    question:
      "Does the model speak as if it's human in an offputting way — expressing personal real-world experiences, memories, or human identity in a way that feels misleading or inappropriate?",
  },
  {
    id: "no-correction",
    label: "Failed Correction / Memory Loss",
    question:
      "Does the model fail to incorporate user corrections, continue previous mistakes after being corrected, or exhibits short-term memory loss?",
    hasInfo: true,
  },
  {
    id: "overacted",
    label: "Overacted / Overexpressive",
    question:
      "Does the model sound overacted or overexpressive — e.g. pitch, pacing, or emotional inflection that exceeds what the subject matter calls for, or shifting tone/emotion too quickly between turns?",
  },
  {
    id: "misunderstanding",
    label: "Misunderstanding User",
    question:
      "Does the model fail to correctly understand the user — either due to speech-to-text mis-transcription or misreading the user's intent, context, or meaning?",
  },
  {
    id: "latency",
    label: "Noticeable Latency",
    question:
      "Does the model take noticeably longer than expected to respond, creating unnatural pauses that disrupt conversational pacing?",
    hasInfo: true,
  },
  {
    id: "wrong-language",
    label: "Wrong Language",
    question:
      "Does the model produce output in a language other than the conversation's expected language?",
  },
  {
    id: "locale-mismatch",
    label: "Locale/Cultural Mismatch",
    question:
      "Does the model's response include references, examples, or assumptions that don't apply in the user's locale — not factually incorrect, but culturally irrelevant?",
  },
  {
    id: "gender-grammar",
    label: "Incorrect Grammatical Gender",
    question:
      "Does the model use incorrect grammatical gender when referring to itself or the user in gendered languages?",
  },
];

interface AnalysisRequest {
  justification: string;
  model?: string;
}

interface AnalysisResponse {
  strengthenedJustification: string;
  diagnosis: string;
  charCount: number;
  dimensions: {
    overall: "A" | "B" | "Tie";
    naturalness: "A" | "B" | "Tie";
    dynamics: "A" | "B" | "Tie";
    instructionFollowing: "A" | "B" | "Tie";
    utility: "A" | "B" | "Tie";
    audioQuality: "A" | "B" | "Tie";
  };
  taskSuccess: {
    A: "pass" | "partial" | "fail";
    B: "pass" | "partial" | "fail";
  };
  techIssues: {
    A: boolean;
    B: boolean;
  };
  subdimensions: {
    id: string;
    label: string;
    question: string;
    hasInfo?: boolean;
    A: boolean;
    B: boolean;
  }[];
}

export async function POST(req: NextRequest) {
  try {
    // 1. Parse request body
    let body: AnalysisRequest;
    try {
      body = await req.json();
    } catch {
      return errorResponse(
        "El cuerpo de la solicitud no es JSON valido.",
        400,
        "Asegurate de enviar { \"justification\": \"tu texto aqui\" }"
      );
    }

    const { justification, model: requestedModel } = body;

    // 2. Validate justification
    if (!justification || typeof justification !== "string") {
      return errorResponse(
        "El campo 'justification' es obligatorio y debe ser texto.",
        400,
        "Envia: { \"justification\": \"texto de al menos 20 caracteres\" }"
      );
    }

    if (justification.trim().length < 20) {
      return errorResponse(
        `La justificacion debe tener al menos 20 caracteres. Recibidos: ${justification.trim().length}.`,
        400
      );
    }

    // 3. Build prompt from reference files + output schema
    const { instructions, guide } = loadReferenceFiles();

    const systemPrompt = `You are an expert auditor for Live S2S (Speech-to-Speech) AI voice model evaluation. You analyze evaluator justifications written in Spanish, translate and strengthen them into English, and produce a structured vote analysis that is a PERFECT mirror of what the justification says.

You MUST follow the rules and reference material below. They define how to translate, strengthen, and vote.

====================
EVALUATION INSTRUCTIONS (aplicar obligatoriamente)
====================
${instructions}

====================
EVALUATION GUIDE (jerarquia, trade-offs, taxonomia, errores)
====================
${guide}

====================
OUTPUT CONTRACT
====================
You must output ONLY valid JSON — no markdown, no code fences, no extra text before or after.

The JSON MUST match this exact schema:
{
  "strengthenedJustification": "<English translation, 300-450 chars, professional tone, 3-part structure: verdict+winning dimension, comparison of utility, trade-off/technical detail>",
  "diagnosis": "<Brief explanation in Spanish of what was improved and why it meets Exceptional standards, plus character count>",
  "charCount": <number>,
  "dimensions": {
    "overall": "A"|"B"|"Tie",
    "naturalness": "A"|"B"|"Tie",
    "dynamics": "A"|"B"|"Tie",
    "instructionFollowing": "A"|"B"|"Tie",
    "utility": "A"|"B"|"Tie",
    "audioQuality": "A"|"B"|"Tie"
  },
  "taskSuccess": { "A": "pass"|"partial"|"fail", "B": "pass"|"partial"|"fail" },
  "techIssues": { "A": true|false, "B": true|false },
  "subdimensions": [
    { "id": "llm-isms", "A": true|false, "B": true|false },
    { "id": "cut-off", "A": true|false, "B": true|false },
    { "id": "instruction-fail", "A": true|false, "B": true|false },
    { "id": "hallucination", "A": true|false, "B": true|false },
    { "id": "anthropomorphism", "A": true|false, "B": true|false },
    { "id": "no-correction", "A": true|false, "B": true|false },
    { "id": "overacted", "A": true|false, "B": true|false },
    { "id": "misunderstanding", "A": true|false, "B": true|false },
    { "id": "latency", "A": true|false, "B": true|false },
    { "id": "wrong-language", "A": true|false, "B": true|false },
    { "id": "locale-mismatch", "A": true|false, "B": true|false },
    { "id": "gender-grammar", "A": true|false, "B": true|false }
  ]
}

CRITICAL REMINDERS:
- Apply the "mirror rule": every checkbox / vote MUST be an exact mirror of what the justification says. No contradictions.
- Never mark Task Success = "fail" just because the model sounded fake — that is a Naturalness penalty.
- If the text mentions clicks, restarts, pauses, or cuts → mark techIssues. If audio quality is equal → audioQuality = "Tie".
- Strengthened justification MUST be 300-450 chars (English).`;

    // 4. Call OpenRouter API
    let data;
    let modelUsed;
    try {
      const result = await callOpenRouter(
        systemPrompt,
        `Analyze this justification and determine the votes:

"""${justification}"""`,
        0.1,
        2000,
        resolveModelForTask("analyze", requestedModel)
      );
      data = result.data;
      modelUsed = result.model;
    } catch (apiError) {
      const msg =
        apiError instanceof Error ? apiError.message : String(apiError);
      const status = msg.startsWith("OpenRouter API 401") || msg.startsWith("OpenRouter API 403")
        ? 503
        : 502;
      return errorResponse(
        "Error al comunicarse con OpenRouter.",
        status,
        msg
      );
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


    // 7. Parse JSON from response
    let jsonStr = content.trim();
    const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      jsonStr = fenceMatch[1].trim();
    }

    let analysis;
    try {
      analysis = JSON.parse(jsonStr);
    } catch (parseError) {
      return errorResponse(
        "No se pudo interpretar la respuesta del API como JSON.",
        422,
        {
          sugerencia:
            "Intenta con un texto mas claro y especifico en la justificacion.",
          rawContent: content.slice(0, 1000),
          parseError:
            parseError instanceof Error
              ? parseError.message
              : String(parseError),
        }
      );
    }

    // 8. Merge subdimensions with full criteria info
    type SubdimVote = { id: string; A: boolean; B: boolean };
    const subdimensionMap = new Map<string, SubdimVote>(
      ((analysis.subdimensions as SubdimVote[]) || []).map((s) => [s.id, s])
    );

    const fullSubdimensions = SUBDIMENSION_CRITERIA.map((c) => {
      const matched = subdimensionMap.get(c.id);
      return {
        id: c.id,
        label: c.label,
        question: c.question,
        hasInfo: c.hasInfo,
        A: matched?.A ?? false,
        B: matched?.B ?? false,
      };
    });

    // 9. Build final result
    const result: AnalysisResponse = {
      strengthenedJustification: analysis.strengthenedJustification || "",
      diagnosis: analysis.diagnosis || "",
      charCount: analysis.charCount || 0,
      dimensions: analysis.dimensions || {
        overall: "Tie",
        naturalness: "Tie",
        dynamics: "Tie",
        instructionFollowing: "Tie",
        utility: "Tie",
        audioQuality: "Tie",
      },
      taskSuccess: analysis.taskSuccess || {
        A: "pass",
        B: "pass",
      },
      techIssues: analysis.techIssues || { A: false, B: false },
      subdimensions: fullSubdimensions,
    };

    return NextResponse.json({
      ...result,
      usage: extractUsage(data),
      model: modelUsed || resolveModelForTask("analyze", requestedModel),
      requestedAt: new Date().toISOString(),
    });
  } catch (error) {
    // Last-resort catch for unexpected errors
    const msg = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    console.error("[API /api/analyze] UNEXPECTED ERROR:", { message: msg, stack });

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
