// Resumo semanal de "revisão espaçada". Não existe dado de acerto/erro em
// nenhuma tabela do produto — o sinal usado aqui é recência (ferramenta que o
// usuário já tocou e não volta a usar há 14+ dias) e cobertura (calculadora de
// uma categoria que ele frequenta e nunca abriu). Disparado semanalmente por
// pg_cron (ver migration de agendamento), sem depender de JWT de usuário.
import { Resend } from "npm:resend@6";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mesma ressalva de sandbox do Resend documentada em notify-ticket-event/index.ts.
const FROM_EMAIL = "Posologia <onboarding@resend.dev>";
const STALE_DAYS = 14;
const MAX_STALE = 3;
const MAX_DISCOVERY = 2;

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface RecoItem {
  type: "calculadora" | "simulador";
  slug: string;
  name: string;
  link: string;
  reason: "parado" | "descoberta";
  daysSince?: number;
}

function prettifySlug(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function daysBetween(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function renderEmailHtml(items: RecoItem[]): string {
  const rows = items
    .map((i) => {
      const badge = i.reason === "parado" ? `há ${i.daysSince} dias sem usar` : "você ainda não tentou";
      return `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;">
            <a href="https://simulador.posologia.app${i.link}" style="color:#0f766e;font-weight:600;text-decoration:none;">${i.name}</a>
            <div style="color:#6b7280;font-size:13px;margin-top:2px;">${i.type === "calculadora" ? "Calculadora" : "Simulador"} · ${badge}</div>
          </td>
        </tr>`;
    })
    .join("");

  return `
    <h2>Sua revisão da semana</h2>
    <p>Separamos algumas ferramentas para você retomar ou conhecer no Posologia Clinical Hub:</p>
    <table style="width:100%;border-collapse:collapse;">${rows}</table>
    <p style="margin-top:24px;color:#6b7280;font-size:12px;">
      Para não receber este resumo, desative em
      <a href="https://simulador.posologia.app/minha-conta">Minha Conta → Preferências</a>.
    </p>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: tools } = await supabase
      .from("tools")
      .select("id, slug, name, category_id")
      .eq("is_active", true)
      .eq("is_marketplace", false);
    const toolsBySlug = new Map((tools || []).map((t) => [t.slug, t]));
    const toolsById = new Map((tools || []).map((t) => [t.id, t]));

    const { data: profiles, error: profilesErr } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("weekly_digest_opt_in", true);
    if (profilesErr) throw profilesErr;

    let sent = 0;
    let skipped = 0;

    for (const profile of profiles || []) {
      const userId = profile.user_id;

      const [{ data: history }, { data: usage }, { data: points }] = await Promise.all([
        supabase.from("calculation_history").select("calculator_slug, created_at").eq("user_id", userId),
        supabase.from("usage_logs").select("tool_id, created_at").eq("user_id", userId),
        supabase.from("student_points").select("simulator_slug, source, created_at").eq("user_id", userId).eq("source", "simulator_case"),
      ]);

      const calcLastUsed = new Map<string, string>();
      for (const h of history || []) {
        if (!h.calculator_slug) continue;
        const prev = calcLastUsed.get(h.calculator_slug);
        if (!prev || h.created_at > prev) calcLastUsed.set(h.calculator_slug, h.created_at);
      }
      for (const u of usage || []) {
        const slug = toolsById.get(u.tool_id)?.slug;
        if (!slug) continue;
        const prev = calcLastUsed.get(slug);
        if (!prev || u.created_at > prev) calcLastUsed.set(slug, u.created_at);
      }

      const simLastUsed = new Map<string, string>();
      for (const p of points || []) {
        if (!p.simulator_slug) continue;
        const prev = simLastUsed.get(p.simulator_slug);
        if (!prev || p.created_at > prev) simLastUsed.set(p.simulator_slug, p.created_at);
      }

      if (calcLastUsed.size === 0 && simLastUsed.size === 0) {
        skipped++;
        continue;
      }

      const staleCandidates: RecoItem[] = [];
      for (const [slug, lastUsed] of calcLastUsed) {
        const days = daysBetween(lastUsed);
        if (days < STALE_DAYS) continue;
        const tool = toolsBySlug.get(slug);
        staleCandidates.push({
          type: "calculadora", slug, name: tool?.name || prettifySlug(slug),
          link: `/calculadoras/${slug}`, reason: "parado", daysSince: days,
        });
      }
      for (const [slug, lastUsed] of simLastUsed) {
        const days = daysBetween(lastUsed);
        if (days < STALE_DAYS) continue;
        staleCandidates.push({
          type: "simulador", slug, name: prettifySlug(slug),
          link: `/simuladores/${slug}`, reason: "parado", daysSince: days,
        });
      }
      staleCandidates.sort((a, b) => (b.daysSince || 0) - (a.daysSince || 0));
      const stale = staleCandidates.slice(0, MAX_STALE);

      const usedCategoryIds = new Set(
        [...calcLastUsed.keys()].map((slug) => toolsBySlug.get(slug)?.category_id).filter((id): id is string => !!id)
      );
      const discovery: RecoItem[] = (tools || [])
        .filter((t) => t.category_id && usedCategoryIds.has(t.category_id) && !calcLastUsed.has(t.slug))
        .slice(0, MAX_DISCOVERY)
        .map((t) => ({ type: "calculadora", slug: t.slug, name: t.name, link: `/calculadoras/${t.slug}`, reason: "descoberta" }));

      const items = [...stale, ...discovery];
      if (items.length === 0) {
        skipped++;
        continue;
      }

      const { data: authUser } = await supabase.auth.admin.getUserById(userId);
      const email = authUser?.user?.email;
      if (!email) {
        skipped++;
        continue;
      }

      const { error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: [email],
        subject: "Sua revisão da semana no Posologia Clinical Hub",
        html: renderEmailHtml(items),
      });
      if (error) {
        console.error("Resend error for user", userId, error);
        continue;
      }
      sent++;
    }

    return new Response(JSON.stringify({ sent, skipped }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-review-digest error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
