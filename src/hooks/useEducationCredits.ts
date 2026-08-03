import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { EducationCredit } from "@/lib/educationCredit";

async function fetchEducationCredits(userId: string): Promise<EducationCredit[]> {
  // education_credits ainda não está em types.ts (gerado só após o deploy da migration
  // ser regenerado) — mesmo escape usado para osce_certificates em SalaDetalhe.tsx.
  const { data, error } = await (supabase as any)
    .from("education_credits")
    .select("*")
    .eq("user_id", userId);
  if (error) throw error;
  return (data || []) as EducationCredit[];
}

export function useEducationCredits() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["education-credits", user?.id],
    queryFn: () => fetchEducationCredits(user!.id),
    enabled: !!user,
  });
}

export interface IssueCreditResult {
  issued: boolean;
  alreadyIssued?: boolean;
  eligible?: boolean;
  masteryPct?: number;
  distinctSimulators?: number;
  required?: { masteryPct: number; distinctSimulators: number };
  credit?: EducationCredit;
}

export function useIssueEducationCredit() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (category: string) => {
      const { data, error } = await supabase.functions.invoke("education-credit-issue", {
        body: { action: "issue", category },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as IssueCreditResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["education-credits", user?.id] });
    },
  });
}
