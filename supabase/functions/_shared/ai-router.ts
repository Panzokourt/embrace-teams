// Shared AI Router · Phase 3
// Centralizes model selection, gateway calls, logging & cost estimation.
//
// Usage from any edge function:
//   import { callAI, embedText } from "../_shared/ai-router.ts";
//   const { content, model } = await callAI({
//     task_type: "summarization",
//     messages: [...],
//     companyId, userId, functionName: "kb-compiler"
//   });

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const EMBEDDINGS_URL = "https://ai.gateway.lovable.dev/v1/embeddings";

export type TaskType =
  | "classification"
  | "tagging"
  | "simple_extraction"
  | "generation"
  | "summarization"
  | "chat"
  | "reasoning"
  | "planning"
  | "deep_analysis"
  | "code"
  | "vision"
  | "embeddings";

export interface CallAIOptions {
  task_type: TaskType;
  messages: Array<{ role: string; content: any }>;
  functionName: string;
  companyId?: string | null;
  userId?: string | null;
  tools?: any[];
  tool_choice?: any;
  response_format?: any;
  reasoning?: { effort: string };
  temperature?: number;
  max_tokens?: number;
  override_model?: string;
  // If true, return the raw stream Response (for SSE relay).
  stream?: boolean;
}

export interface CallAIResult {
  content: string;
  tool_calls?: any[];
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  raw: any;
}

// ── Model policy ──────────────────────────────────────────────────
export function pickModel(task_type: TaskType, override?: string): string {
  if (override) return override;
  switch (task_type) {
    case "classification":
    case "tagging":
    case "simple_extraction":
      return "google/gemini-2.5-flash-lite";
    case "reasoning":
    case "planning":
    case "deep_analysis":
    case "code":
    case "vision":
      return "google/gemini-2.5-pro";
    case "embeddings":
      return "google/text-embedding-004";
    case "generation":
    case "summarization":
    case "chat":
    default:
      return "google/gemini-3-flash-preview";
  }
}

// Cost per 1K tokens (USD) · rough estimates
const COST_TABLE: Record<string, { input: number; output: number }> = {
  "google/gemini-2.5-flash-lite": { input: 0.000075, output: 0.0003 },
  "google/gemini-3-flash-preview": { input: 0.00015, output: 0.0006 },
  "google/gemini-2.5-flash": { input: 0.00015, output: 0.0006 },
  "google/gemini-2.5-pro": { input: 0.00125, output: 0.005 },
  "google/text-embedding-004": { input: 0.00001, output: 0 },
  "openai/gpt-5": { input: 0.0025, output: 0.01 },
  "openai/gpt-5-mini": { input: 0.00025, output: 0.001 },
  "openai/gpt-5-nano": { input: 0.00005, output: 0.0002 },
};

function estimateCost(model: string, prompt: number, completion: number): number {
  const t = COST_TABLE[model];
  if (!t) return 0;
  return (prompt / 1000) * t.input + (completion / 1000) * t.output;
}

// ── Logging (best effort, never throws) ──────────────────────────
function getServiceClient(): SupabaseClient | null {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function logCall(row: {
  company_id?: string | null;
  user_id?: string | null;
  function_name: string;
  task_type: string;
  model_used: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  latency_ms: number;
  cost_estimate_usd: number;
  success: boolean;
  error_text?: string | null;
}) {
  try {
    const supa = getServiceClient();
    if (!supa) return;
    await supa.from("ai_call_logs").insert(row);
  } catch (e) {
    console.warn("ai_call_logs insert failed:", e);
  }
}

// ── Main caller ──────────────────────────────────────────────────
export async function callAI(opts: CallAIOptions): Promise<CallAIResult> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

  const model = pickModel(opts.task_type, opts.override_model);
  const start = Date.now();

  const body: any = {
    model,
    messages: opts.messages,
  };
  if (opts.tools) body.tools = opts.tools;
  if (opts.tool_choice) body.tool_choice = opts.tool_choice;
  if (opts.response_format) body.response_format = opts.response_format;
  if (opts.reasoning) body.reasoning = opts.reasoning;
  if (typeof opts.temperature === "number") body.temperature = opts.temperature;
  if (typeof opts.max_tokens === "number") body.max_tokens = opts.max_tokens;

  let resp: Response;
  try {
    resp = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    const latency = Date.now() - start;
    await logCall({
      company_id: opts.companyId ?? null,
      user_id: opts.userId ?? null,
      function_name: opts.functionName,
      task_type: opts.task_type,
      model_used: model,
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      latency_ms: latency,
      cost_estimate_usd: 0,
      success: false,
      error_text: `network: ${(e as Error).message}`,
    });
    throw e;
  }

  if (!resp.ok) {
    const latency = Date.now() - start;
    const errText = await resp.text().catch(() => "");
    await logCall({
      company_id: opts.companyId ?? null,
      user_id: opts.userId ?? null,
      function_name: opts.functionName,
      task_type: opts.task_type,
      model_used: model,
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      latency_ms: latency,
      cost_estimate_usd: 0,
      success: false,
      error_text: `${resp.status}: ${errText.slice(0, 500)}`,
    });
    if (resp.status === 429) throw new Error("AI rate limit exceeded. Try again shortly.");
    if (resp.status === 402) throw new Error("AI credits exhausted. Add credits in Workspace → Usage.");
    throw new Error(`AI gateway error ${resp.status}: ${errText.slice(0, 200)}`);
  }

  const json = await resp.json();
  const latency = Date.now() - start;
  const choice = json.choices?.[0];
  const content: string = choice?.message?.content ?? "";
  const tool_calls = choice?.message?.tool_calls;
  const usage = {
    prompt_tokens: json.usage?.prompt_tokens ?? 0,
    completion_tokens: json.usage?.completion_tokens ?? 0,
    total_tokens: json.usage?.total_tokens ?? 0,
  };

  await logCall({
    company_id: opts.companyId ?? null,
    user_id: opts.userId ?? null,
    function_name: opts.functionName,
    task_type: opts.task_type,
    model_used: model,
    prompt_tokens: usage.prompt_tokens,
    completion_tokens: usage.completion_tokens,
    total_tokens: usage.total_tokens,
    latency_ms: latency,
    cost_estimate_usd: estimateCost(model, usage.prompt_tokens, usage.completion_tokens),
    success: true,
  });

  return { content, tool_calls, model, usage, raw: json };
}

// ── Streaming variant (returns the raw fetch Response so the caller can pipe SSE) ──
export async function callAIStream(opts: Omit<CallAIOptions, "stream">): Promise<Response> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");
  const model = pickModel(opts.task_type, opts.override_model);

  const body: any = {
    model,
    messages: opts.messages,
    stream: true,
  };
  if (opts.tools) body.tools = opts.tools;
  if (opts.tool_choice) body.tool_choice = opts.tool_choice;
  if (opts.response_format) body.response_format = opts.response_format;
  if (opts.reasoning) body.reasoning = opts.reasoning;
  if (typeof opts.temperature === "number") body.temperature = opts.temperature;
  if (typeof opts.max_tokens === "number") body.max_tokens = opts.max_tokens;

  const start = Date.now();
  const resp = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  // Best-effort log (no token counts available in stream)
  if (!resp.ok) {
    await logCall({
      company_id: opts.companyId ?? null,
      user_id: opts.userId ?? null,
      function_name: opts.functionName,
      task_type: opts.task_type,
      model_used: model,
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      latency_ms: Date.now() - start,
      cost_estimate_usd: 0,
      success: false,
      error_text: `${resp.status} stream`,
    });
  } else {
    // Fire log of attempt; tokens unknown for streamed
    logCall({
      company_id: opts.companyId ?? null,
      user_id: opts.userId ?? null,
      function_name: opts.functionName,
      task_type: opts.task_type,
      model_used: model,
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      latency_ms: Date.now() - start,
      cost_estimate_usd: 0,
      success: true,
    }).catch(() => {});
  }

  return resp;
}

// ── Embeddings ──────────────────────────────────────────────────
export async function embedText(
  text: string,
  ctx: { functionName: string; companyId?: string | null; userId?: string | null }
): Promise<number[]> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");
  const model = "google/text-embedding-004";
  const start = Date.now();

  const resp = await fetch(EMBEDDINGS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, input: text }),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    await logCall({
      company_id: ctx.companyId ?? null,
      user_id: ctx.userId ?? null,
      function_name: ctx.functionName,
      task_type: "embeddings",
      model_used: model,
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      latency_ms: Date.now() - start,
      cost_estimate_usd: 0,
      success: false,
      error_text: `${resp.status}: ${errText.slice(0, 300)}`,
    });
    if (resp.status === 429) throw new Error("Embeddings rate limit. Retry shortly.");
    if (resp.status === 402) throw new Error("AI credits exhausted.");
    throw new Error(`Embeddings error ${resp.status}: ${errText.slice(0, 200)}`);
  }

  const json = await resp.json();
  const vec: number[] = json.data?.[0]?.embedding ?? [];
  const promptTokens: number = json.usage?.prompt_tokens ?? Math.ceil(text.length / 4);

  await logCall({
    company_id: ctx.companyId ?? null,
    user_id: ctx.userId ?? null,
    function_name: ctx.functionName,
    task_type: "embeddings",
    model_used: model,
    prompt_tokens: promptTokens,
    completion_tokens: 0,
    total_tokens: promptTokens,
    latency_ms: Date.now() - start,
    cost_estimate_usd: estimateCost(model, promptTokens, 0),
    success: true,
  });

  return vec;
}

// ── Chunking helper ──────────────────────────────────────────────
// Split text into ~targetTokens-sized chunks (approx by chars * 4) with overlap.
export function chunkText(
  text: string,
  targetTokens = 500,
  overlapTokens = 50
): Array<{ index: number; content: string; tokens: number }> {
  const targetChars = targetTokens * 4;
  const overlapChars = overlapTokens * 4;
  const chunks: Array<{ index: number; content: string; tokens: number }> = [];
  if (!text || text.trim().length === 0) return chunks;

  // Split by paragraph first to keep semantic boundaries
  const paras = text.split(/\n\s*\n/);
  let buf = "";
  let idx = 0;

  const flush = () => {
    const content = buf.trim();
    if (content.length === 0) return;
    chunks.push({
      index: idx++,
      content,
      tokens: Math.ceil(content.length / 4),
    });
    // Keep overlap from end of buffer
    buf = content.length > overlapChars ? content.slice(-overlapChars) + "\n\n" : "";
  };

  for (const p of paras) {
    if ((buf + p).length > targetChars && buf.length > 0) {
      flush();
    }
    if (p.length > targetChars) {
      // Hard split very long paragraph
      let i = 0;
      while (i < p.length) {
        const slice = p.slice(i, i + targetChars);
        buf += slice + "\n\n";
        if (buf.length >= targetChars) flush();
        i += targetChars - overlapChars;
      }
    } else {
      buf += p + "\n\n";
    }
  }
  if (buf.trim().length > 0) flush();
  return chunks;
}
