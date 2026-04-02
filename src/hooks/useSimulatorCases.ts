import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SIMULATOR_SLUGS = ["tdm", "prm", "antimicrobianos", "acompanhamento", "insulina", "bomba-infusao", "desmame-benzo", "interacoes", "manejo-dor", "inflamacao-aines", "infeccoes-antibioticos", "sna", "eletrofisiologia-cardiaca", "depuracao-renal", "equilibrio-acido-base", "regulacao-glicemica", "eixo-hpa", "cinetica-enzimatica", "secrecao-gastrica", "cascata-coagulacao", "compartimentos-adme", "cadeia-eletrons", "dissociacao-hemoglobina", "glicolise-gliconeogenese", "cinetica-avancada", "ciclo-ureia", "acido-araquidonico", "lipoproteinas", "pentoses-fosfato", "titulacao-aminoacidos", "operon-lac", "dose-resposta", "transducao-sinal", "janela-terapeutica-farma", "vias-administracao", "bloqueio-neuromuscular", "farmaco-autonomica", "tolerancia-dependencia", "farmacogenomica", "estabilidade", "liberacao-farmacos", "diluicao", "reologia", "hlb-emulsoes", "granulometria", "compressao", "tampao-farmaceutico", "sar-explorer", "lipinski", "bioisosterismo", "metabolismo-farmacos", "docking-simplificado", "quiralidade", "pka-absorcao", "qsar-simplificado", "metodo-soap", "mai", "cascata-prescricao", "odontograma", "anatomia-endodontia", "periodontograma", "anestesiologia-odonto", "cefalometria", "radiografia-odonto", "farmacologia-odonto", "cirurgia-exodontia", "goniometria", "avaliacao-postural", "forca-muscular", "dermatomos", "respiratorio", "eletroterapia", "testes-ortopedicos", "berg", "avaliacao-nutricional", "triagem-nutricional", "necessidades-energeticas", "tne", "tnp", "disfagia", "nutricao-renal", "nutricao-materno-infantil", "dispensacao-344", "sequenciamento-dna", "snp-farmacogenetica", "cariotipo", "heranca-mendeliana", "pcr-eletroforese", "epigenetica", "mutacoes-reparo", "genetica-populacoes"];

/** Extract diagnosis from case_data */
function extractDiagnosis(caseData: any): string {
  if (!caseData) return "";
  if (caseData.diagnosis) return caseData.diagnosis;
  // PRM: from diseases
  if (caseData.history?.diseases?.length) return caseData.history.diseases.join(", ");
  // Antimicrobianos: from suspected diagnosis
  if (caseData.day1?.suspectedDiagnosis) return caseData.day1.suspectedDiagnosis;
  // TDM: infection
  if (caseData.infection) return caseData.infection;
  // Insulina: from patient diagnosis
  if (caseData.patient?.diagnosis) return caseData.patient.diagnosis;
  // Desmame: from patient diagnosis
  if (caseData.patient?.clinicalContext) return caseData.patient.clinicalContext;
  return "";
}

/** Extract a short description from case_data for display */
function extractDescription(caseData: any): string {
  if (!caseData) return "";
  if (caseData.scenario) return caseData.scenario;
  if (caseData.history?.mainComplaint) return caseData.history.mainComplaint;
  if (caseData.day1?.clinicalDescription) return caseData.day1.clinicalDescription;
  if (caseData.patient?.clinicalSummary) return caseData.patient.clinicalSummary;
  if (caseData.consultations?.[0]?.symptoms) return caseData.consultations[0].symptoms;
  if (caseData.patient_summary) return caseData.patient_summary;
  return "";
}

export function useSimulatorCases(simulatorSlug: string, builtInCases: any[]) {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);

  // RLS already filters: created_by IS NULL OR created_by = auth.uid() OR is_marketplace = true
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
        created_by: c.created_by,
        is_marketplace: c.is_marketplace,
        _description: extractDescription(c.case_data),
        _diagnosis: extractDiagnosis(c.case_data),
      }));
    },
  });

  // Fetch author profiles for AI cases
  const authorIds = [...new Set(dbCases.filter(c => c.created_by).map(c => c.created_by))];
  const { data: authorProfiles = [] } = useQuery({
    queryKey: ["case-author-profiles", authorIds.join(",")],
    queryFn: async () => {
      if (authorIds.length === 0) return [];

      const { data: edgeData, error: edgeError } = await supabase.functions.invoke("case-authors", {
        body: { userIds: authorIds },
      });

      if (!edgeError && edgeData?.authors) {
        return edgeData.authors as { user_id: string; full_name: string | null }[];
      }

      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", authorIds);
      return (data || []) as { user_id: string; full_name: string | null }[];
    },
    enabled: authorIds.length > 0,
  });

  const authorMap = new Map(authorProfiles.map(p => [p.user_id, p.full_name || "Autor"]));

  const enrichedDbCases = dbCases.map(c => ({
    ...c,
    _authorName: c.created_by ? (authorMap.get(c.created_by) || "Autor") : null,
  }));

  const allCases = [...builtInCases, ...enrichedDbCases];

  const generateCase = async () => {
    setIsGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Você precisa estar logado para gerar casos");

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
          created_by: user.id,
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
      const { data: { user } } = await supabase.auth.getUser();
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
          created_by: user?.id,
        } as any);
      if (insertError) throw insertError;

      queryClient.invalidateQueries({ queryKey: ["simulator-cases", targetSlug] });
      toast.success(`Caso copiado para ${targetSlug}!`);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Erro ao copiar caso");
    }
  };

  const toggleCaseMarketplace = async (caseId: string, current: boolean) => {
    try {
      const { error } = await supabase
        .from("simulator_cases" as any)
        .update({ is_marketplace: !current } as any)
        .eq("id", caseId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["simulator-cases", simulatorSlug] });
      toast.success(!current ? "Caso publicado no Marketplace!" : "Caso removido do Marketplace");
    } catch (e: any) {
      toast.error(e.message || "Erro ao atualizar caso");
    }
  };

  const availableTargets = SIMULATOR_SLUGS.filter(s => s !== simulatorSlug);

  return { allCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace };
}
