import { useState, useCallback, useEffect } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const FREE_DAILY_CALCULATOR_LIMIT = 3;
const USAGE_KEY = "posologia_calc_usage";

interface DailyUsage {
  date: string;
  count: number;
}

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function getUsage(): DailyUsage {
  try {
    const raw = localStorage.getItem(USAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DailyUsage;
      if (parsed.date === getTodayKey()) return parsed;
    }
  } catch {}
  return { date: getTodayKey(), count: 0 };
}

function incrementUsage(): DailyUsage {
  const usage = getUsage();
  usage.count += 1;
  localStorage.setItem(USAGE_KEY, JSON.stringify(usage));
  return usage;
}

export function useFeatureGating() {
  const { isPremium, loading: subLoading } = useSubscription();
  const { user } = useAuth();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<string | undefined>();
  const [hasUnlimitedAccess, setHasUnlimitedAccess] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) {
      setHasUnlimitedAccess(false);
      setIsAdmin(false);
      return;
    }
    supabase
      .from("profiles")
      .select("has_unlimited_access")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        setHasUnlimitedAccess(data?.has_unlimited_access === true);
      });
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => {
        setIsAdmin(!!data);
      });
  }, [user]);

  const isFullAccess = isPremium || hasUnlimitedAccess || isAdmin;

  const showUpgrade = useCallback((feature?: string) => {
    setUpgradeFeature(feature);
    setUpgradeOpen(true);
  }, []);

  /** Check if a calculator can be used. Returns true if allowed. */
  const canUseCalculator = useCallback((): boolean => {
    if (!user) return true;
    if (isFullAccess) return true;
    const usage = getUsage();
    return usage.count < FREE_DAILY_CALCULATOR_LIMIT;
  }, [isFullAccess, user]);

  /** Record a calculator use. Returns false + shows modal if limit reached. */
  const recordCalculatorUse = useCallback((): boolean => {
    if (!user || isFullAccess) return true;
    const usage = getUsage();
    if (usage.count >= FREE_DAILY_CALCULATOR_LIMIT) {
      showUpgrade(`Você atingiu o limite de ${FREE_DAILY_CALCULATOR_LIMIT} calculadoras por dia`);
      return false;
    }
    incrementUsage();
    return true;
  }, [isFullAccess, user, showUpgrade]);

  const remainingCalculators = (): number => {
    if (isFullAccess) return Infinity;
    const usage = getUsage();
    return Math.max(0, FREE_DAILY_CALCULATOR_LIMIT - usage.count);
  };

  /** Check if simulators are available */
  const canUseSimulator = isFullAccess;

  /** Check if virtual rooms are available */
  const canUseVirtualRooms = isFullAccess;

  return {
    isPremium: isFullAccess,
    loading: subLoading,
    upgradeOpen,
    setUpgradeOpen,
    upgradeFeature,
    showUpgrade,
    canUseCalculator,
    recordCalculatorUse,
    remainingCalculators,
    canUseSimulator,
    canUseVirtualRooms,
  };
}
