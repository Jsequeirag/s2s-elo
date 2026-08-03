import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

function createZaiClient() {
  const baseUrl = process.env.ZAI_BASE_URL;
  const apiKey = process.env.ZAI_API_KEY;

  if (!baseUrl || !apiKey) {
    throw new Error("ZAI_BASE_URL and ZAI_API_KEY environment variables are required.");
  }

  // Bypass loadConfig() by constructing ZAI directly with env vars
  return new ZAI({ baseUrl, apiKey });
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

export async function POST(req: NextRequest) {
  try {
    const body: AnalysisRequest = await req.json();
    const { justification } = body;

    if (!justification || justification.trim().length < 20) {
      return NextResponse.json(
        { error: "La justificación debe tener al menos 20 caracteres." },
        { status: 400 }
      );
    }

    const zai = createZaiClient();

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

    const response = await zai.chat.completions.create({
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

    const content = response.choices[0]?.message?.content || "";

    // Try to parse JSON from the response
    let jsonStr = content.trim();
    // Remove markdown code fences if present
    const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      jsonStr = fenceMatch[1].trim();
    }

    let analysis;
    try {
      analysis = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json(
        {
          error:
            "No se pudo analizar la justificación. Intenta con un texto más claro y específico.",
          raw: content,
        },
        { status: 422 }
      );
    }

    // Merge subdimensions with full criteria info
    const subdimensionMap = new Map(
      analysis.subdimensions?.map((s: { id: string; A: boolean; B: boolean }) => [
        s.id,
        s,
      ]) || []
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

    const result: AnalysisResponse = {
      strengthenedJustification:
        analysis.strengthenedJustification || "",
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
    console.error("Analysis error:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor. Por favor, intenta de nuevo.",
      },
      { status: 500 }
    );
  }
}
