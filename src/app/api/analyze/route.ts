import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import os from "os";
import path from "path";
import ZAI from "z-ai-web-dev-sdk";

/**
 * The Z.ai SDK (`ZAI.create()`) reads a `.z-ai-config` JSON file from disk via
 * `loadConfig()`, which searches `process.cwd()`, `os.homedir()`, and `/etc/`.
 * It does NOT support environment variables directly, and its constructor is
 * private so it cannot be instantiated directly either.
 *
 * On serverless platforms (Vercel), the project directory is READ-ONLY. The
 * only writable location is `/tmp` (or the OS temp dir). So we:
 *   1. Write the config file into the OS temp directory.
 *   2. `chdir` into that directory so `loadConfig()` finds it via `process.cwd()`.
 */
async function createZaiClient() {
  const baseUrl = process.env.ZAI_BASE_URL;
  const apiKey = process.env.ZAI_API_KEY;

  if (!baseUrl || !apiKey) {
    throw new Error(
      `Faltan variables de entorno: ZAI_BASE_URL=${baseUrl ? "OK" : "FALTA"}, ZAI_API_KEY=${apiKey ? "OK" : "FALTA"}. Configuralas en Vercel > Settings > Environment Variables.`
    );
  }

  // Use the OS temp dir — the only writable location on serverless (Vercel = /tmp).
  const tmpDir = os.tmpdir();
  const configPath = path.join(tmpDir, ".z-ai-config");
  const configContent = JSON.stringify({ baseUrl, apiKey });

  try {
    await fs.writeFile(configPath, configContent, "utf-8");
  } catch (writeError) {
    throw new Error(
      `No se pudo escribir .z-ai-config en ${configPath}: ${writeError instanceof Error ? writeError.message : String(writeError)}`
    );
  }

  // Move cwd into tmpDir so the SDK's loadConfig() picks up the file we wrote.
  const previousCwd = process.cwd();
  try {
    process.chdir(tmpDir);
    return await ZAI.create();
  } finally {
    // Restore cwd so we don't leak process state across invocations.
    process.chdir(previousCwd);
  }
}

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

function errorResponse(message: string, status: number, details?: unknown) {
  console.error(`[API /api/analyze] ${status}: ${message}`, details || "");
  return NextResponse.json(
    {
      error: message,
      details: details ?? null,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
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

    const { justification } = body;

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

    // 3. Initialize Z.ai client
    let zai;
    try {
      zai = await createZaiClient();
    } catch (configError) {
      return errorResponse(
        "Error de configuracion del API de Z.ai.",
        503,
        configError instanceof Error ? configError.message : String(configError)
      );
    }

    // 4. Build prompt
    const systemPrompt = `You are an expert auditor for Live S2S (Speech-to-Speech) AI voice model evaluation. You analyze evaluator justifications written in Spanish and produce a structured vote analysis.

YOUR STRICT RULES:
1. The evaluator writes a justification in Spanish. You must analyze it and determine what votes it implies.
2. You must output ONLY valid JSON, no markdown, no code fences, no extra text.
3. Apply the Instruction rules: if the text mentions clicks, restarts, pauses, or cuts → mark techIssues. If audio quality is equal → audioQuality = "Tie".
4. Task Success: "pass" (completed task), "partial" (omitted something/inaccurate), "fail" (refused/didn't understand). NEVER mark fail just because it sounded fake.
5. Conversational Dynamics: penalize if the model used "Helpful Assistant" phrases.
6. The "mirror rule": checkboxes MUST be an exact mirror of what the justification says.

OUTPUT FORMAT (JSON only):
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
}`;

    // 5. Call Z.ai API
    let response;
    try {
      response = await zai.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Analyze this justification and determine the votes:

"""${justification}"""`,
          },
        ],
        temperature: 0.1,
      });
    } catch (apiError) {
      const msg =
        apiError instanceof Error ? apiError.message : String(apiError);
      return errorResponse(
        "Error al comunicarse con el API de Z.ai.",
        502,
        `Detalle: ${msg}`
      );
    }

    // 6. Extract content from response
    const content = response?.choices?.[0]?.message?.content || "";

    if (!content.trim()) {
      return errorResponse(
        "El API de Z.ai devolvio una respuesta vacia.",
        502,
        `Respuesta recibida: ${JSON.stringify(response).slice(0, 500)}`
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

    return NextResponse.json(result);
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
