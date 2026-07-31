import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Mesma lógica de recência/cobertura do edge function generate-review-digest
// (supabase/functions/generate-review-digest/index.ts) — não existe dado de
// acerto/erro em nenhuma tabela, então a recomendação é "o que você usou e
// parou" + "o que existe na categoria que você mais usa e nunca abriu".
const STALE_DAYS = 14;
const MAX_STALE = 3;
const MAX_DISCOVERY = 2;

export interface Recommendation {
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

async function fetchRecommendations(userId: string): Promise<Recommendation[]> {
  const [{ data: tools }, { data: history }, { data: usage }, { data: points }] = await Promise.all([
    supabase.from("tools").select("id, slug, name, category_id").eq("is_active", true).eq("is_marketplace", false),
    supabase.from("calculation_history").select("calculator_slug, created_at").eq("user_id", userId),
    supabase.from("usage_logs").select("tool_id, created_at, tools(slug)").eq("user_id", userId),
    supabase.from("student_points").select("simulator_slug, created_at").eq("user_id", userId).eq("source", "simulator_case"),
  ]);

  const toolsBySlug = new Map((tools || []).map((t) => [t.slug, t]));

  const calcLastUsed = new Map<string, string>();
  for (const h of history || []) {
    if (!h.calculator_slug) continue;
    const prev = calcLastUsed.get(h.calculator_slug);
    if (!prev || h.created_at > prev) calcLastUsed.set(h.calculator_slug, h.created_at);
  }
  for (const u of (usage || []) as unknown as { tool_id: string; created_at: string; tools: { slug: string } | null }[]) {
    const slug = u.tools?.slug;
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

  if (calcLastUsed.size === 0 && simLastUsed.size === 0) return [];

  const staleCandidates: Recommendation[] = [];
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
  const discovery: Recommendation[] = (tools || [])
    .filter((t) => t.category_id && usedCategoryIds.has(t.category_id) && !calcLastUsed.has(t.slug))
    .slice(0, MAX_DISCOVERY)
    .map((t) => ({ type: "calculadora", slug: t.slug, name: t.name, link: `/calculadoras/${t.slug}`, reason: "descoberta" }));

  return [...stale, ...discovery];
}

export function useRecommendations() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["recommendations", user?.id],
    queryFn: () => fetchRecommendations(user!.id),
    enabled: !!user,
    staleTime: 60 * 60 * 1000,
  });
}
