import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface AiProvider {
  id: string;
  provider: string;
  api_key: string;
  base_url: string | null;
  model: string | null;
  display_name: string;
  priority: number;
}

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

async function getActiveProviders(): Promise<AiProvider[]> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const { data, error } = await supabase
    .from("ai_api_keys")
    .select("*")
    .eq("is_active", true)
    .order("priority", { ascending: true });

  if (error) {
    console.error("[AI-PROVIDER] Error fetching providers:", error.message);
    return [];
  }
  return data || [];
}

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

async function tryLovableAI(options: AiRequestOptions): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

  console.log("[AI-PROVIDER] Using Lovable AI (fallback)...");

  const body: any = {
    model: options.model || "google/gemini-3-flash-preview",
    messages: options.messages,
  };
  if (options.temperature !== undefined) body.temperature = options.temperature;
  if (options.tools) body.tools = options.tools;
  if (options.tool_choice) body.tool_choice = options.tool_choice;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error("RATE_LIMIT");
    if (response.status === 402) throw new Error("PAYMENT_REQUIRED");
    const t = await response.text();
    throw new Error(`Lovable AI returned ${response.status}: ${t.slice(0, 200)}`);
  }

  return await response.json();
}

export async function callAI(options: AiRequestOptions): Promise<{ data: any; provider: string }> {
  const providers = await getActiveProviders();

  // Try external providers first (sorted by priority)
  for (const provider of providers) {
    try {
      const data = await tryProvider(provider, options);
      console.log(`[AI-PROVIDER] Success with ${provider.display_name}`);
      return { data, provider: provider.display_name };
    } catch (err) {
      console.warn(`[AI-PROVIDER] ${provider.display_name} failed:`, err instanceof Error ? err.message : err);
    }
  }

  // Fallback to Lovable AI
  try {
    const data = await tryLovableAI(options);
    console.log("[AI-PROVIDER] Success with Lovable AI (fallback)");
    return { data, provider: "Lovable AI" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "RATE_LIMIT") throw new Error("Limite de requisições excedido. Tente novamente.");
    if (msg === "PAYMENT_REQUIRED") throw new Error("Créditos insuficientes.");
    throw new Error(`Todos os provedores de IA falharam. Último erro: ${msg}`);
  }
}
