import { useCallback, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// ── Badge definitions ──────────────────────────────────────────────
export interface BadgeDef {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji
  requirement: (ctx: BadgeContext) => boolean;
}

interface BadgeContext {
  totalPoints: number;
  totalCases: number;
  simulatorCounts: Record<string, number>;
  streak: number;
  activeDays: number;
}

export const BADGE_DEFINITIONS: BadgeDef[] = [
  { id: "first_case", name: "Primeiro Caso", description: "Resolveu seu primeiro caso clínico", icon: "🎯", requirement: (c) => c.totalCases >= 1 },
  { id: "10_cases", name: "Praticante", description: "Resolveu 10 casos clínicos", icon: "📚", requirement: (c) => c.totalCases >= 10 },
  { id: "50_cases", name: "Experiente", description: "Resolveu 50 casos clínicos", icon: "🏆", requirement: (c) => c.totalCases >= 50 },
  { id: "100_cases", name: "Mestre Clínico", description: "Resolveu 100 casos clínicos", icon: "👑", requirement: (c) => c.totalCases >= 100 },
  { id: "tdm_master", name: "Mestre em TDM", description: "Completou 10 casos de TDM", icon: "💊", requirement: (c) => (c.simulatorCounts["tdm"] || 0) >= 10 },
  { id: "prm_master", name: "Mestre em PRM", description: "Completou 10 casos de PRM", icon: "💉", requirement: (c) => (c.simulatorCounts["prm"] || 0) >= 10 },
  { id: "antimicrobial_master", name: "Mestre em Antimicrobianos", description: "Completou 10 casos de Stewardship", icon: "🦠", requirement: (c) => (c.simulatorCounts["antimicrobianos"] || 0) >= 10 },
  { id: "insulin_master", name: "Mestre em Insulina", description: "Completou 10 casos de insulinoterapia", icon: "🩺", requirement: (c) => (c.simulatorCounts["insulina"] || 0) >= 10 },
  { id: "streak_3", name: "Consistente", description: "3 dias consecutivos de prática", icon: "🔥", requirement: (c) => c.streak >= 3 },
  { id: "streak_7", name: "Dedicado", description: "7 dias consecutivos de prática", icon: "⚡", requirement: (c) => c.streak >= 7 },
  { id: "streak_30", name: "Imparável", description: "30 dias consecutivos de prática", icon: "🌟", requirement: (c) => c.streak >= 30 },
  { id: "points_500", name: "500 Pontos", description: "Acumulou 500 pontos", icon: "💎", requirement: (c) => c.totalPoints >= 500 },
  { id: "points_2000", name: "2000 Pontos", description: "Acumulou 2000 pontos", icon: "🏅", requirement: (c) => c.totalPoints >= 2000 },
  { id: "versatile", name: "Versátil", description: "Praticou em 4 simuladores diferentes", icon: "🎨", requirement: (c) => Object.keys(c.simulatorCounts).length >= 4 },
];

// ── Points config ──────────────────────────────────────────────────
export const POINTS = {
  SIMULATOR_CASE: 20,
  CALCULATOR_USE: 5,
  DAILY_LOGIN: 10,
  STREAK_BONUS_3: 30,
  STREAK_BONUS_7: 70,
  STREAK_BONUS_30: 300,
};

// ── Hook ───────────────────────────────────────────────────────────
export function useGamification() {
  const { user } = useAuth();
  const qc = useQueryClient();

  // Fetch user points
  const { data: points = [] } = useQuery({
    queryKey: ["gamification-points", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_points")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data as any[];
    },
  });

  // Fetch earned badges
  const { data: earnedBadges = [] } = useQuery({
    queryKey: ["gamification-badges", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_badges")
        .select("*")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data as any[];
    },
  });

  // Computed stats
  const totalPoints = useMemo(() => points.reduce((a, p) => a + (p.points || 0), 0), [points]);

  const totalCases = useMemo(
    () => points.filter((p) => p.source === "simulator_case").length,
    [points]
  );

  const simulatorCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    points.forEach((p) => {
      if (p.simulator_slug) {
        counts[p.simulator_slug] = (counts[p.simulator_slug] || 0) + 1;
      }
    });
    return counts;
  }, [points]);

  // Streak calculation
  const streak = useMemo(() => {
    if (points.length === 0) return 0;
    const uniqueDays = [...new Set(points.map((p) => new Date(p.created_at).toISOString().slice(0, 10)))].sort().reverse();
    if (uniqueDays.length === 0) return 0;

    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    // Streak must include today or yesterday
    if (uniqueDays[0] !== today && uniqueDays[0] !== yesterday) return 0;

    let count = 1;
    for (let i = 1; i < uniqueDays.length; i++) {
      const prev = new Date(uniqueDays[i - 1]);
      const curr = new Date(uniqueDays[i]);
      const diff = (prev.getTime() - curr.getTime()) / 86400000;
      if (diff === 1) count++;
      else break;
    }
    return count;
  }, [points]);

  const activeDays = useMemo(
    () => new Set(points.map((p) => new Date(p.created_at).toISOString().slice(0, 10))).size,
    [points]
  );

  const badgeContext: BadgeContext = { totalPoints, totalCases, simulatorCounts, streak, activeDays };

  // Award points
  const awardPoints = useCallback(
    async (pts: number, source: string, simulatorSlug?: string, sourceId?: string) => {
      if (!user) return;
      const { error } = await supabase.from("student_points").insert({
        user_id: user.id,
        points: pts,
        source,
        simulator_slug: simulatorSlug || null,
        source_id: sourceId || null,
      } as any);
      if (!error) {
        qc.invalidateQueries({ queryKey: ["gamification-points"] });
      }
    },
    [user, qc]
  );

  // Check and award new badges
  const checkBadges = useCallback(async () => {
    if (!user) return [];
    const newBadges: BadgeDef[] = [];
    const earnedIds = new Set(earnedBadges.map((b: any) => b.badge_id));

    for (const badge of BADGE_DEFINITIONS) {
      if (!earnedIds.has(badge.id) && badge.requirement(badgeContext)) {
        const { error } = await supabase.from("user_badges").insert({
          user_id: user.id,
          badge_id: badge.id,
        } as any);
        if (!error) newBadges.push(badge);
      }
    }

    if (newBadges.length > 0) {
      qc.invalidateQueries({ queryKey: ["gamification-badges"] });
    }
    return newBadges;
  }, [user, earnedBadges, badgeContext, qc]);

  // Daily login check
  useEffect(() => {
    if (!user || points.length === undefined) return;
    const today = new Date().toISOString().slice(0, 10);
    const hasToday = points.some(
      (p) => p.source === "daily_login" && new Date(p.created_at).toISOString().slice(0, 10) === today
    );
    if (!hasToday && points !== undefined) {
      awardPoints(POINTS.DAILY_LOGIN, "daily_login");
    }
  }, [user, points]);

  // Check badges whenever stats change
  useEffect(() => {
    if (user && points.length > 0) {
      checkBadges();
    }
  }, [totalPoints, totalCases, streak]);

  // Leaderboard
  const { data: leaderboard = [] } = useQuery({
    queryKey: ["gamification-leaderboard"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_points")
        .select("user_id, points, created_at")
        .order("created_at", { ascending: false })
        .limit(1000);
      // We can't use the view directly due to RLS, so aggregate client-side
      if (error) return [];
      // Group by user
      const userMap: Record<string, number> = {};
      (data || []).forEach((r: any) => {
        userMap[r.user_id] = (userMap[r.user_id] || 0) + r.points;
      });
      // Fetch profiles for all users
      const userIds = Object.keys(userMap);
      if (userIds.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);
      const profileMap: Record<string, any> = {};
      (profiles || []).forEach((p: any) => { profileMap[p.user_id] = p; });

      return Object.entries(userMap)
        .map(([uid, pts]) => ({
          userId: uid,
          name: profileMap[uid]?.full_name || "Usuário",
          avatarUrl: profileMap[uid]?.avatar_url,
          totalPoints: pts,
        }))
        .sort((a, b) => b.totalPoints - a.totalPoints)
        .slice(0, 50);
    },
  });

  return {
    totalPoints,
    totalCases,
    simulatorCounts,
    streak,
    activeDays,
    earnedBadges: earnedBadges as Array<{ badge_id: string; earned_at: string }>,
    awardPoints,
    checkBadges,
    leaderboard: leaderboard as Array<{ userId: string; name: string; avatarUrl: string | null; totalPoints: number }>,
    BADGE_DEFINITIONS,
  };
}
