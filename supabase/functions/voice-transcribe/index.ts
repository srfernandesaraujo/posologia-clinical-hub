import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getFullAccess } from "../_shared/subscription.ts";
import { checkAndIncrementVoiceUsage } from "../_shared/voice-rate-limit.ts";
import { transcribeAudio, hasActiveSttProvider } from "../_shared/stt-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_AUDIO_BYTES = 4 * 1024 * 1024; // 4MB — comfortably covers the 60s client-side recording cap

function decodeBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    if (!(await getFullAccess(userId))) {
      return new Response(JSON.stringify({ error: "Paciente-IA por Voz é um recurso exclusivo do plano Premium." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!(await hasActiveSttProvider())) {
      return new Response(
        JSON.stringify({ error: "Nenhum provedor de transcrição de voz ativo (Groq ou OpenAI). Peça a um administrador para cadastrar/ativar uma dessas chaves em Admin > API Keys." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await checkAndIncrementVoiceUsage(userId);

    const { audioBase64, mimeType } = await req.json();
    if (!audioBase64 || typeof audioBase64 !== "string") {
      return new Response(JSON.stringify({ error: "Campo 'audioBase64' é obrigatório." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const audioBytes = decodeBase64(audioBase64);
    if (audioBytes.byteLength > MAX_AUDIO_BYTES) {
      return new Response(JSON.stringify({ error: "Áudio excede o tamanho máximo permitido (4MB)." }), {
        status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { text, provider } = await transcribeAudio(audioBytes, mimeType || "audio/webm", userId);

    return new Response(JSON.stringify({ text, provider }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("voice-transcribe error:", e);
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    const status = /\b429\b/.test(msg)
      ? 429
      : /Nenhum provedor de transcrição/.test(msg)
      ? 503
      : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
