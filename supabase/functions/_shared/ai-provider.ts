import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getActiveProviders, type AiProvider } from "./ai-providers-db.ts";

interface AiRequestOptions {
  messages: Array<{ role: string; content: string }>;
  tools?: any[];
  tool_choice?: any;
  temperature?: number;
  model?: string;
}

const PROVIDER_CONFIGS: Record<string, { baseUrl: string; defaultModel: string; format: "openai" | "anthropic" }> = {
  groq: { baseUrl: "https://api.groq.com/openai/v1/chat/completions", defaultModel: "llama-3.3-70b-versatile", format: "openai" },
  openai: { baseUrl: "https://api.openai.com/v1/chat/completions", defaultModel: "gpt-4o-mini", format: "openai" },
  openrouter: { baseUrl: "https://openrouter.ai/api/v1/chat/completions", defaultModel: "google/gemini-2.5-flash", format: "openai" },
  anthropic: { baseUrl: "https://api.anthropic.com/v1/messages", defaultModel: "claude-sonnet-4-20250514", format: "anthropic" },
  google: { baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", defaultModel: "gemini-2.5-flash", format: "openai" },
};

function buildAnthropicRequest(options: AiRequestOptions, apiKey: string, model: string) {
  const systemMsg = options.messages.find(m => m.role === "system");
  const otherMsgs = options.messages.filter(m => m.role !== "system");

  const body: any = {
    model,
    max_tokens: 8192,
    messages: otherMsgs,
  };
  if (systemMsg) body.system = systemMsg.content;
  if (options.temperature !== undefined) body.temperature = options.temperature;

  // Convert OpenAI tool_choice to Anthropic format
  if (options.tools && options.tools.length > 0) {
    body.tools = options.tools.map((t: any) => ({
      name: t.function.name,
      description: t.function.description,
      input_schema: t.function.parameters,
    }));
    if (options.tool_choice) {
      body.tool_choice = { type: "tool", name: options.tool_choice.function.name };
    }
  }

  return {
    url: "https://api.anthropic.com/v1/messages",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}

function buildOpenAIRequest(options: AiRequestOptions, apiKey: string, model: string, baseUrl: string) {
  const body: any = {
    model,
    messages: options.messages,
  };
  if (options.temperature !== undefined) body.temperature = options.temperature;
  if (options.tools) body.tools = options.tools;
  if (options.tool_choice) body.tool_choice = options.tool_choice;

  return {
    url: baseUrl,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}

function normalizeAnthropicResponse(data: any): any {
  // Convert Anthropic response to OpenAI format
  const toolUse = data.content?.find((c: any) => c.type === "tool_use");
  const textBlock = data.content?.find((c: any) => c.type === "text");

  if (toolUse) {
    return {
      choices: [{
        message: {
          role: "assistant",
          content: textBlock?.text || null,
          tool_calls: [{
            id: toolUse.id,
            type: "function",
            function: {
              name: toolUse.name,
              arguments: JSON.stringify(toolUse.input),
            },
          }],
        },
      }],
    };
  }

  return {
    choices: [{
      message: {
        role: "assistant",
        content: textBlock?.text || data.content?.[0]?.text || "",
      },
    }],
  };
}

async function tryProvider(provider: AiProvider, options: AiRequestOptions): Promise<any> {
  const config = PROVIDER_CONFIGS[provider.provider];
  if (!config) throw new Error(`Unknown provider: ${provider.provider}`);

  const model = provider.model || config.defaultModel;
  const baseUrl = provider.base_url || config.baseUrl;

  let req: { url: string; headers: Record<string, string>; body: string };

  if (config.format === "anthropic") {
    req = buildAnthropicRequest(options, provider.api_key, model);
  } else {
    req = buildOpenAIRequest(options, provider.api_key, model, baseUrl);
  }

  console.log(`[AI-PROVIDER] Trying ${provider.display_name} (${provider.provider}/${model})...`);

  const response = await fetch(req.url, {
    method: "POST",
    headers: req.headers,
    body: req.body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${provider.display_name} returned ${response.status}: ${text.slice(0, 200)}`);
  }

  const data = await response.json();

  if (config.format === "anthropic") {
    return normalizeAnthropicResponse(data);
  }

  return data;
}

// Cost per 1M tokens (USD) - approximate
const COST_PER_MILLION: Record<string, { input: number; output: number }> = {
  "gpt-4o-mini": { input: 0.15, output: 0.60 },
  "gpt-4o": { input: 2.50, output: 10.00 },
  "llama-3.3-70b-versatile": { input: 0.59, output: 0.79 },
  "claude-sonnet-4-20250514": { input: 3.00, output: 15.00 },
  "gemini-2.5-flash": { input: 0.15, output: 0.60 },
  "google/gemini-2.5-flash": { input: 0.15, output: 0.60 },
};

function estimateCost(model: string, tokensIn: number, tokensOut: number): number {
  const rates = COST_PER_MILLION[model] || { input: 0.50, output: 1.50 };
  return (tokensIn * rates.input + tokensOut * rates.output) / 1_000_000;
}

async function logAiUsage(userId: string | null, providerName: string, model: string, promptType: string, data: any) {
  try {
    if (!userId) return;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const usage = data?.usage;
    const tokensInput = usage?.prompt_tokens ?? 0;
    const tokensOutput = usage?.completion_tokens ?? 0;
    const cost = estimateCost(model, tokensInput, tokensOutput);

    await supabase.from("ai_usage_log").insert({
      user_id: userId,
      provider: providerName,
      model,
      prompt_type: promptType,
      tokens_input: tokensInput,
      tokens_output: tokensOutput,
      estimated_cost_usd: cost,
    });
  } catch (e) {
    console.warn("[AI-PROVIDER] Failed to log usage:", e);
  }
}

export async function callAI(options: AiRequestOptions & { userId?: string; promptType?: string }): Promise<{ data: any; provider: string }> {
  const providers = await getActiveProviders();
  const userId = options.userId || null;
  const promptType = options.promptType || "unknown";

  if (providers.length === 0) {
    throw new Error("Nenhum provedor de IA configurado. Peça a um administrador para cadastrar uma chave de API em Admin > API Keys.");
  }

  // Try external providers in priority order
  let lastError: string | null = null;
  for (const provider of providers) {
    try {
      const data = await tryProvider(provider, options);
      const model = provider.model || PROVIDER_CONFIGS[provider.provider]?.defaultModel || "unknown";
      console.log(`[AI-PROVIDER] Success with ${provider.display_name}`);
      logAiUsage(userId, provider.provider, model, promptType, data);
      return { data, provider: provider.display_name };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.warn(`[AI-PROVIDER] ${provider.display_name} failed:`, lastError);
    }
  }

  throw new Error(`Todos os provedores de IA configurados falharam. Último erro: ${lastError}`);
}
