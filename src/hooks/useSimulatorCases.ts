import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SIMULATOR_SLUGS = ["tdm", "prm", "antimicrobianos", "acompanhamento", "insulina", "bomba-infusao"];

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

  const deleteCase = async (caseId: string) => {
    try {
      const { error } = await supabase
        .from("simulator_cases" as any)
        .delete()
        .eq("id", caseId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["simulator-cases", simulatorSlug] });
      toast.success("Caso excluído com sucesso!");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Erro ao excluir caso");
    }
  };

  const updateCase = async (caseId: string, updates: { title: string; difficulty: string }) => {
    try {
      const { error } = await supabase
        .from("simulator_cases" as any)
        .update({ title: updates.title, difficulty: updates.difficulty } as any)
        .eq("id", caseId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["simulator-cases", simulatorSlug] });
      toast.success("Caso atualizado com sucesso!");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Erro ao atualizar caso");
    }
  };

  const copyCase = async (caseId: string, targetSlug: string) => {
    try {
      // Fetch the original case
      const { data: original, error: fetchError } = await supabase
        .from("simulator_cases" as any)
        .select("*")
        .eq("id", caseId)
        .single();
      if (fetchError) throw fetchError;
      const orig = original as any;

      const { error: insertError } = await supabase
        .from("simulator_cases" as any)
        .insert({
          simulator_slug: targetSlug,
          title: `${orig.title} (cópia)`,
          difficulty: orig.difficulty,
          case_data: orig.case_data,
          is_ai_generated: orig.is_ai_generated,
        } as any);
      if (insertError) throw insertError;

      queryClient.invalidateQueries({ queryKey: ["simulator-cases", targetSlug] });
      toast.success(`Caso copiado para ${targetSlug}!`);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Erro ao copiar caso");
    }
  };

  const availableTargets = SIMULATOR_SLUGS.filter(s => s !== simulatorSlug);

  return { allCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets };
}
