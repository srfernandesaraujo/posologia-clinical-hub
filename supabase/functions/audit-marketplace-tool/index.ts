// Auditoria de IA disparada quando o dono publica uma calculadora no
// Marketplace (ver toggleMarketplace em src/pages/Calculadoras.tsx). Não
// bloqueia a publicação — só grava um veredito preliminar que um admin
// confirma depois em /admin/marketplace-review para conceder o selo
// "Validado clinicamente". Se a IA sinalizar risco clínico real, despublica
// a ferramenta automaticamente até revisão humana (rede de segurança).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI } from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

function bad(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return bad("Não autenticado", 401);

    const authClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsError || !claimsData?.claims?.sub) return bad("Não autenticado", 401);
    const callerId = claimsData.claims.sub as string;

    const { toolId } = await req.json();
    if (!toolId) return bad("toolId é obrigatório");

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: tool, error: toolErr } = await admin
      .from("tools")
      .select("id, name, description, short_description, fields, formula, created_by")
      .eq("id", toolId)
      .single();
    if (toolErr || !tool) return bad("Ferramenta não encontrada", 404);

    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();
    const isAdmin = !!roleRow;

    if (tool.created_by !== callerId && !isAdmin) return bad("Sem permissão", 403);

    const systemPrompt = `Você é um farmacêutico clínico revisor, auditando uma calculadora clínica criada por um usuário antes de ela ganhar um selo de validação no Marketplace de uma plataforma de ensino em saúde.
Avalie a fórmula e os campos abaixo contra literatura/faixas de referência clínicas conhecidas. Sinalize "flagged" se houver erro de fórmula, faixa de referência claramente errada, unidade incorreta, ou risco de dose/resultado perigoso. Use "clear" quando a lógica estiver coerente com a prática clínica padrão, mesmo que simples.
Responda em português, de forma objetiva (2-4 frases), citando o problema específico se houver.`;

    const userPrompt = `Nome: ${tool.name}
Descrição: ${tool.description || tool.short_description || "(sem descrição)"}
Campos: ${JSON.stringify(tool.fields)}
Fórmula/lógica: ${JSON.stringify(tool.formula)}`;

    const { data } = await callAI({
      userId: callerId,
      promptType: "clinical-audit",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "submit_clinical_audit",
            description: "Registra o veredito da auditoria clínica",
            parameters: {
              type: "object",
              properties: {
                status: { type: "string", enum: ["clear", "flagged"] },
                notes: { type: "string" },
              },
              required: ["status", "notes"],
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "submit_clinical_audit" } },
      model: "google/gemini-3-flash-preview",
    });

    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) return bad("Auditoria não retornou resultado", 502);
    const verdict = JSON.parse(toolCall.function.arguments) as { status: "clear" | "flagged"; notes: string };

    const update: Record<string, unknown> = {
      ai_audit_status: verdict.status,
      ai_audit_notes: verdict.notes,
      ai_audited_at: new Date().toISOString(),
    };
    if (verdict.status === "flagged") update.is_marketplace = false;

    const { error: updateErr } = await admin.from("tools").update(update).eq("id", toolId);
    if (updateErr) {
      console.error("[AUDIT-MARKETPLACE-TOOL] Falha ao gravar veredito:", updateErr);
      return bad("Falha ao gravar veredito", 500);
    }

    return new Response(JSON.stringify({ status: verdict.status }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[AUDIT-MARKETPLACE-TOOL]", err);
    return bad(err.message || "Erro interno", 500);
  }
});
