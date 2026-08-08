import { NextResponse } from "next/server";
import { instructions as instructionsContent } from "@/lib/instructions";
import { guide as guideContent } from "@/lib/guide";
import { getReferenceDoc } from "@/lib/mongodb";

export type OpenRouterTask = "analyze" | "qa" | "image" | "dialog" | "general";

type OpenRouterMessageContentItem =
  | { type: "text"; text: string }
  | {
    type: "image_url";
    image_url: {
      url: string;
    };
  };

type OpenRouterMessage = {
  role: string;
  content: string | OpenRouterMessageContentItem[];
};

/**
 * Shared reference material used by both /api/analyze and /api/qa.
 * Checks MongoDB first for user-uploaded content; falls back to the
 * bundled TS modules (template-literal strings shipped at build time).
 */
export async function loadReferenceFiles() {
  const [dbInstructions, dbGuide] = await Promise.all([
    getReferenceDoc("instructions"),
    getReferenceDoc("guide"),
  ]);
  return {
    instructions: dbInstructions ?? instructionsContent,
    guide: dbGuide ?? guideContent,
  };
}

/**
 * Resolves the model for a specific task.
 *
 * Priority order:
 * 1. explicit request override from the route payload
 * 2. env-specific task model (OPENROUTER_MODEL_ANALYZE / QA / IMAGE)
 * 3. general OPENROUTER_MODEL fallback
 * 4. hardcoded default for this app
 */
export function resolveModelForTask(task: OpenRouterTask, requestModel?: string) {
  const requested = requestModel?.trim();
  if (requested) {
    return requested;
  }

  const envVarMap: Record<OpenRouterTask, string> = {
    analyze: "OPENROUTER_MODEL_ANALYZE",
    qa: "OPENROUTER_MODEL_QA",
    image: "OPENROUTER_MODEL_IMAGE",
    dialog: "OPENROUTER_MODEL_DIALOG",
    general: "OPENROUTER_MODEL_GENERAL",
  };

  const taskModel = process.env[envVarMap[task]]?.trim();
  if (taskModel) {
    return taskModel;
  }

  return process.env.OPENROUTER_MODEL?.trim() || "openai/gpt-4o-mini";
}

/**
 * Calls the OpenRouter Chat Completions API (OpenAI-compatible).
 * Requires OPENROUTER_API_KEY in the environment.
 *
 * Docs: https://openrouter.ai/docs
 */
export async function callOpenRouter(
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
  maxTokens = 2000,
  modelOverride?: string,
  messagesOverride?: OpenRouterMessage[]
) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = modelOverride?.trim() || process.env.OPENROUTER_MODEL?.trim() || "openai/gpt-4o-mini";

  if (!apiKey) {
    throw new Error(
      "Falta OPENROUTER_API_KEY. Configurala en Vercel > Settings > Environment Variables."
    );
  }

  // Build the request body. Some optional flags are model-specific and must
  // NOT be sent to models that do not support them (OpenRouter rejects them
  // with HTTP 400). We add them conditionally based on the model id.
  const body: Record<string, unknown> = {
    model,
    messages: messagesOverride ?? [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature,
    max_tokens: maxTokens,
  };

  // Disable "thinking" mode for Qwen 3.x models that support it. Otherwise
  // the model spends all max_tokens on internal reasoning and returns
  // content: null. Other providers (GLM, OpenAI, Anthropic...) reject this
  // parameter, so it is scoped to Qwen only.
  if (/qwen/i.test(model)) {
    body.thinking = { type: "disabled" };
  }

  // Reasoning-mode handling. Several reasoning-capable models will enter an
  // infinite reasoning loop and exhaust the token budget, leaving nothing
  // for the actual answer (known GLM-4.6 / GLM-4.6V behavior on OpenRouter).
  // Two distinct cases:
  //  - OpenAI o-series / Luna: accept effort levels -> cap at "low".
  //  - GLM (z-ai/glm-*): accept an enabled flag -> disable entirely.
  if (/^openai\/o\d/i.test(model) || /\/luna\b/i.test(model)) {
    body.reasoning = { effort: "low" };
  } else if (/\/glm[\-.]/i.test(model) || /^z-ai\//i.test(model)) {
    body.reasoning = { enabled: false };
  }

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://s2s-elo.vercel.app",
      "X-Title": "Live S2S ELO Evaluator",
    },
    body: JSON.stringify(body),
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

export function extractUsage(data: unknown) {
  const usage = (data as {
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
      cost?: number;
      prompt_tokens_details?: {
        cached_tokens?: number;
        cache_write_tokens?: number;
      };
      completion_tokens_details?: {
        reasoning_tokens?: number;
      };
    };
  })?.usage;

  const promptTokens = usage?.prompt_tokens ?? 0;
  const completionTokens = usage?.completion_tokens ?? 0;
  const totalTokens = usage?.total_tokens ?? promptTokens + completionTokens;
  const cost = usage?.cost ?? 0;

  return {
    promptTokens,
    completionTokens,
    totalTokens,
    cost: Math.round(cost * 10_000) / 10_000, // 4 decimal places ($0.0001)
  };
}
