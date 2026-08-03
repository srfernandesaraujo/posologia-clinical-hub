import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getSimulatorCategory } from "@/data/simulatorCategories";

// Não é Bayesian Knowledge Tracing de verdade (sem parâmetros learn/guess/slip
// ajustados por EM) — é uma média dos scores reais de cada tentativa,
// ponderada por recência (meia-vida de 30 dias), por categoria de simulador.
// Simples, honesto sobre o que é, e melhora sozinho conforme o uso cresce.
const HALF_LIFE_DAYS = 30;
const MIN_ATTEMPTS_RELIABLE = 2;

export interface CategoryMastery {
  category: string;
  masteryPct: number;
  attemptCount: number;
  distinctSimulators: number;
  lastAttemptAt: string;
  reliable: boolean;
}

function daysBetween(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 86_400_000;
}

async function fetchMastery(userId: string): Promise<CategoryMastery[]> {
  const { data: attempts } = await supabase
    .from("simulator_attempts")
    .select("simulator_slug, score, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(500);

  const byCategory: Record<string, { weightedSum: number; weightTotal: number; count: number; slugs: Set<string>; lastAttemptAt: string }> = {};

  for (const a of attempts || []) {
    const category = getSimulatorCategory(a.simulator_slug);
    if (!category) continue;
    const weight = Math.pow(0.5, daysBetween(a.created_at) / HALF_LIFE_DAYS);
    const bucket = byCategory[category] || { weightedSum: 0, weightTotal: 0, count: 0, slugs: new Set<string>(), lastAttemptAt: a.created_at };
    bucket.weightedSum += a.score * weight;
    bucket.weightTotal += weight;
    bucket.count += 1;
    bucket.slugs.add(a.simulator_slug);
    if (a.created_at > bucket.lastAttemptAt) bucket.lastAttemptAt = a.created_at;
    byCategory[category] = bucket;
  }

  return Object.entries(byCategory)
    .map(([category, b]) => ({
      category,
      masteryPct: b.weightTotal > 0 ? Math.round(b.weightedSum / b.weightTotal) : 0,
      attemptCount: b.count,
      distinctSimulators: b.slugs.size,
      lastAttemptAt: b.lastAttemptAt,
      reliable: b.count >= MIN_ATTEMPTS_RELIABLE,
    }))
    .sort((a, b) => b.masteryPct - a.masteryPct);
}

export function useMastery() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["mastery", user?.id],
    queryFn: () => fetchMastery(user!.id),
    enabled: !!user,
    staleTime: 30 * 60 * 1000,
  });
}
