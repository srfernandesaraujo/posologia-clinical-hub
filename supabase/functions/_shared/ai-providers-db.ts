import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AiProvider {
  id: string;
  provider: string;
  api_key: string;
  base_url: string | null;
  model: string | null;
  display_name: string;
  priority: number;
}

/** Shared by ai-provider.ts (chat) and stt-provider.ts (transcription) — both read the same ai_api_keys table. */
export async function getActiveProviders(): Promise<AiProvider[]> {
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
    console.error("[AI-PROVIDERS-DB] Error fetching providers:", error.message);
    return [];
  }
  return data || [];
}
