import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useSimulatorCases(simulatorSlug: string, builtInCases: any[]) {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: dbCases = [] } = useQuery({
    queryKey: ["simulator-cases", simulatorSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("simulator_cases" as any)
        .select("*")
        .eq("simulator_slug", simulatorSlug)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any[]).map((c: any) => ({
        ...c.case_data,
        id: c.id,
        title: c.title,
        difficulty: c.difficulty,
        isAI: true,
      }));
    },
  });

  const allCases = [...builtInCases, ...dbCases];

  const generateCase = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-case", {
        body: { simulator_slug: simulatorSlug },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const generated = data.case;
      
      const { error: insertError } = await supabase
        .from("simulator_cases" as any)
        .insert({
          simulator_slug: simulatorSlug,
          title: generated.title,
          difficulty: generated.difficulty,
          case_data: generated.case_data,
          is_ai_generated: true,
        } as any);
      
      if (insertError) throw insertError;

      queryClient.invalidateQueries({ queryKey: ["simulator-cases", simulatorSlug] });
      toast.success("Caso clínico gerado com sucesso!");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Erro ao gerar caso clínico");
    } finally {
      setIsGenerating(false);
    }
  };

  return { allCases, generateCase, isGenerating };
}
