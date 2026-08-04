import { NextResponse } from "next/server";
import { instructions as instructionsContent } from "@/lib/instructions";
import { guide as guideContent } from "@/lib/guide";

/**
 * Shared reference material used by both /api/analyze and /api/qa.
 * Imported at build time (TS modules exporting template-literal strings),
 * so they always ship inside the serverless bundle on Vercel.
 */
export function loadReferenceFiles() {
  return {
    instructions: instructionsContent,
    guide: guideContent,
  };
}

/**
 * Calls the OpenRouter Chat Completions API (OpenAI-compatible).
 * Requires OPENROUTER_API_KEY in the environment. The model defaults to
 * DeepSeek V4 Flash and can be overridden via OPENROUTER_MODEL.
 *
 * Docs: https://openrouter.ai/docs
 */
export async function callOpenRouter(
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
  maxTokens = 2000
) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash";

  if (!apiKey) {
    throw new Error(
      "Falta OPENROUTER_API_KEY. Configurala en Vercel > Settings > Environment Variables."
    );
  }

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://s2s-elo.vercel.app",
      "X-Title": "Live S2S ELO Evaluator",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`OpenRouter API ${res.status}: ${errorBody.slice(0, 500)}`);
  }

  const data = await res.json();
  return { data, model };
}

/**
 * Shared error-response helper. Logs server-side and returns a structured
 * JSON payload the frontend can render (error message + optional details).
 */
export function errorResponse(message: string, status: number, details?: unknown) {
  console.error(`[API] ${status}: ${message}`, details || "");
  return NextResponse.json(
    {
      error: message,
      details: details ?? null,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

/**
 * Extracts the plain-text content from an OpenRouter chat completion response.
 * Returns "" if the structure is unexpected.
 */
export function extractContent(data: unknown): string {
  const choices = (data as { choices?: Array<{ message?: { content?: string } }> })?.choices;
  return choices?.[0]?.message?.content || "";
}
