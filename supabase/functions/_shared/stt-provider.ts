import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getActiveProviders } from "./ai-providers-db.ts";

/**
 * Speech-to-text sibling of ai-provider.ts's callAI(). callAI only knows how
 * to POST JSON chat-completions bodies — transcription needs a multipart
 * upload, so this is a separate small client that reuses the same
 * ai_api_keys table (same API key works for both a provider's chat and audio
 * endpoints), restricted to the providers that actually expose a
 * Whisper-compatible transcription endpoint.
 */

const STT_PROVIDER_CONFIGS: Record<string, { url: string; model: string }> = {
  groq: { url: "https://api.groq.com/openai/v1/audio/transcriptions", model: "whisper-large-v3-turbo" },
  openai: { url: "https://api.openai.com/v1/audio/transcriptions", model: "whisper-1" },
};

async function tryTranscribe(
  providerName: string,
  apiKey: string,
  audioBytes: Uint8Array,
  mimeType: string
): Promise<string> {
  const config = STT_PROVIDER_CONFIGS[providerName];
  if (!config) throw new Error(`Provider ${providerName} has no STT endpoint configured`);

  const form = new FormData();
  form.append("file", new Blob([audioBytes], { type: mimeType }), "audio.webm");
  form.append("model", config.model);
  form.append("language", "pt");

  const response = await fetch(config.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${providerName} STT returned ${response.status}: ${text.slice(0, 200)}`);
  }

  const data = await response.json();
  return data.text ?? "";
}

async function logSttUsage(userId: string | null, providerName: string, model: string) {
  try {
    if (!userId) return;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    await supabase.from("ai_usage_log").insert({
      user_id: userId,
      provider: providerName,
      model,
      prompt_type: "voice-transcribe",
    });
  } catch (e) {
    console.warn("[STT-PROVIDER] Failed to log usage:", e);
  }
}

/** Cheap pre-flight check (no external network call) so callers can fail fast before spending the daily quota. */
export async function hasActiveSttProvider(): Promise<boolean> {
  const providers = await getActiveProviders();
  return providers.some((p) => p.provider in STT_PROVIDER_CONFIGS);
}

export async function transcribeAudio(
  audioBytes: Uint8Array,
  mimeType: string,
  userId: string | null
): Promise<{ text: string; provider: string }> {
  const providers = (await getActiveProviders()).filter((p) => p.provider in STT_PROVIDER_CONFIGS);

  if (providers.length === 0) {
    throw new Error(
      "Nenhum provedor de transcrição de voz ativo (Groq ou OpenAI). Peça a um administrador para cadastrar/ativar uma dessas chaves em Admin > API Keys."
    );
  }

  let lastError: string | null = null;
  for (const provider of providers) {
    try {
      const text = await tryTranscribe(provider.provider, provider.api_key, audioBytes, mimeType);
      logSttUsage(userId, provider.provider, STT_PROVIDER_CONFIGS[provider.provider].model);
      return { text, provider: provider.display_name };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.warn(`[STT-PROVIDER] ${provider.display_name} failed:`, lastError);
    }
  }

  throw new Error(`Todos os provedores de transcrição falharam. Último erro: ${lastError}`);
}
