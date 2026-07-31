import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface CalculationEntry {
  id: string;
  calculatorName: string;
  calculatorSlug: string;
  patientName?: string;
  date: string;
  summary: string;
  details: Record<string, string | number>;
  createdAt: string;
}

export function useCalculationHistory() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<CalculationEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!user) { setEntries([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from("calculation_history")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200);
    if (data) {
      setEntries(data.map((row: any) => ({
        id: row.id,
        calculatorName: row.calculator_name,
        calculatorSlug: row.calculator_slug,
        patientName: row.patient_name || undefined,
        date: row.calculation_date || "",
        summary: row.summary,
        details: (row.details || {}) as Record<string, string | number>,
        createdAt: row.created_at,
      })));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const saveCalculation = useCallback(
    async (entry: Omit<CalculationEntry, "id" | "createdAt">) => {
      if (!user) return;
      const { error } = await supabase.from("calculation_history").insert({
        user_id: user.id,
        calculator_name: entry.calculatorName,
        calculator_slug: entry.calculatorSlug,
        patient_name: entry.patientName || null,
        calculation_date: entry.date || null,
        summary: entry.summary,
        details: entry.details as any,
      });
      if (!error) {
        await fetchHistory();
      } else if (!navigator.onLine) {
        toast.error("Sem conexão — o resultado foi calculado, mas não foi salvo no histórico.");
      }
    },
    [user, fetchHistory]
  );

  const deleteEntry = useCallback(
    async (id: string) => {
      if (!user) return;
      await supabase.from("calculation_history").delete().eq("id", id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    },
    [user]
  );

  const clearHistory = useCallback(async () => {
    if (!user) return;
    await supabase.from("calculation_history").delete().eq("user_id", user.id);
    setEntries([]);
  }, [user]);

  const getByCalculator = useCallback(
    (slug: string) => entries.filter((e) => e.calculatorSlug === slug),
    [entries]
  );

  const getByPatient = useCallback(
    (name: string) =>
      entries.filter((e) => e.patientName?.toLowerCase().includes(name.toLowerCase())),
    [entries]
  );

  return {
    entries,
    loading,
    hasConsent: !!user, // always enabled for logged-in users
    grantConsent: () => {},
    revokeConsent: clearHistory,
    saveCalculation,
    deleteEntry,
    clearHistory,
    getByCalculator,
    getByPatient,
  };
}
