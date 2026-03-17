import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Maps route paths to tool metadata for automatic tracking.
 * Place this component once in the app tree (e.g., inside BrowserRouter).
 */

const ROUTE_MAP: Record<string, { slug: string; name: string; category: string }> = {
  // ── Calculadoras ──
  "/risco-cardiovascular": { slug: "risco-cardiovascular", name: "Risco Cardiovascular", category: "calculadora" },
  "/desmame-corticoide": { slug: "desmame-corticoide", name: "Desmame de Corticóide", category: "calculadora" },
  "/equivalencia-opioides": { slug: "equivalencia-opioides", name: "Equivalência de Opióides", category: "calculadora" },
  "/ajuste-dose-renal": { slug: "ajuste-dose-renal", name: "Ajuste de Dose Renal", category: "calculadora" },
  "/equivalencia-antidepressivos": { slug: "equivalencia-antidepressivos", name: "Equivalência de Antidepressivos", category: "calculadora" },
  "/homa-ir": { slug: "homa-ir", name: "HOMA-IR", category: "calculadora" },
  "/findrisc": { slug: "findrisc", name: "FINDRISC", category: "calculadora" },
  "/ckd-epi": { slug: "ckd-epi", name: "CKD-EPI", category: "calculadora" },
  "/correcao-sodio": { slug: "correcao-sodio", name: "Correção de Sódio", category: "calculadora" },
  "/correcao-calcio": { slug: "correcao-calcio", name: "Correção de Cálcio", category: "calculadora" },
  "/wells-score": { slug: "wells-score", name: "Wells Score", category: "calculadora" },
  "/qsofa": { slug: "qsofa", name: "qSOFA", category: "calculadora" },
  "/vancomicina-auc": { slug: "vancomicina-auc", name: "Vancomicina AUC", category: "calculadora" },
  "/insulina-basal-bolus": { slug: "insulina-basal-bolus", name: "Insulina Basal-Bolus", category: "calculadora" },
  "/holliday-segar": { slug: "holliday-segar", name: "Holliday-Segar", category: "calculadora" },
  "/meld-score": { slug: "meld-score", name: "MELD Score", category: "calculadora" },
  "/qtc-corrigido": { slug: "qtc-corrigido", name: "QTc Corrigido", category: "calculadora" },
  "/dose-pediatrica": { slug: "dose-pediatrica", name: "Dose Pediátrica", category: "calculadora" },
  "/rass-sas": { slug: "rass-sas", name: "RASS/SAS", category: "calculadora" },
  "/nutricao-parenteral": { slug: "nutricao-parenteral", name: "Nutrição Parenteral", category: "calculadora" },
  "/interacoes-cyp": { slug: "interacoes-cyp", name: "Interações CYP", category: "calculadora" },
  "/adesao-oncologia": { slug: "adesao-oncologia", name: "Adesão Oncologia", category: "calculadora" },
  "/toxicidade-antineoplasicos": { slug: "toxicidade-antineoplasicos", name: "Toxicidade Antineoplásicos", category: "calculadora" },
  "/ajuste-dose-oncologico": { slug: "ajuste-dose-oncologico", name: "Ajuste Dose Oncológico", category: "calculadora" },

  // ── Simuladores Farmácia Clínica ──
  "/simuladores/prm": { slug: "prm", name: "PRM", category: "simulador" },
  "/simuladores/antimicrobianos": { slug: "antimicrobianos", name: "Antimicrobianos", category: "simulador" },
  "/simuladores/tdm": { slug: "tdm", name: "TDM", category: "simulador" },
  "/simuladores/acompanhamento": { slug: "acompanhamento", name: "Acompanhamento", category: "simulador" },
  "/simuladores/insulina": { slug: "insulina", name: "Insulina", category: "simulador" },
  "/simuladores/bomba-infusao": { slug: "bomba-infusao", name: "Bomba de Infusão", category: "simulador" },
  "/simuladores/desmame-benzo": { slug: "desmame-benzo", name: "Desmame Benzo", category: "simulador" },
  "/simuladores/interacoes": { slug: "interacoes", name: "Interações", category: "simulador" },
  "/simuladores/metodo-soap": { slug: "metodo-soap", name: "Método SOAP", category: "simulador" },
  "/simuladores/mai": { slug: "mai", name: "MAI", category: "simulador" },
  "/simuladores/cascata-prescricao": { slug: "cascata-prescricao", name: "Cascata de Prescrição", category: "simulador" },

  // ── Simuladores Fisiologia ──
  "/simuladores/sna": { slug: "sna", name: "SNA", category: "simulador" },
  "/simuladores/eletrofisiologia-cardiaca": { slug: "eletrofisiologia-cardiaca", name: "Eletrofisiologia Cardíaca", category: "simulador" },
  "/simuladores/depuracao-renal": { slug: "depuracao-renal", name: "Depuração Renal", category: "simulador" },
  "/simuladores/equilibrio-acido-base": { slug: "equilibrio-acido-base", name: "Equilíbrio Ácido-Base", category: "simulador" },
  "/simuladores/regulacao-glicemica": { slug: "regulacao-glicemica", name: "Regulação Glicêmica", category: "simulador" },
  "/simuladores/eixo-hpa": { slug: "eixo-hpa", name: "Eixo HPA", category: "simulador" },
  "/simuladores/cinetica-enzimatica": { slug: "cinetica-enzimatica", name: "Cinética Enzimática", category: "simulador" },
  "/simuladores/secrecao-gastrica": { slug: "secrecao-gastrica", name: "Secreção Gástrica", category: "simulador" },
  "/simuladores/cascata-coagulacao": { slug: "cascata-coagulacao", name: "Cascata Coagulação", category: "simulador" },
  "/simuladores/compartimentos-adme": { slug: "compartimentos-adme", name: "ADME", category: "simulador" },

  // ── Simuladores Bioquímica ──
  "/simuladores/cadeia-eletrons": { slug: "cadeia-eletrons", name: "Cadeia de Elétrons", category: "simulador" },
  "/simuladores/dissociacao-hemoglobina": { slug: "dissociacao-hemoglobina", name: "Dissociação Hemoglobina", category: "simulador" },
  "/simuladores/glicolise-gliconeogenese": { slug: "glicolise-gliconeogenese", name: "Glicólise/Gliconeogênese", category: "simulador" },
  "/simuladores/cinetica-avancada": { slug: "cinetica-avancada", name: "Cinética Avançada", category: "simulador" },
  "/simuladores/ciclo-ureia": { slug: "ciclo-ureia", name: "Ciclo da Ureia", category: "simulador" },
  "/simuladores/acido-araquidonico": { slug: "acido-araquidonico", name: "Ácido Araquidônico", category: "simulador" },
  "/simuladores/lipoproteinas": { slug: "lipoproteinas", name: "Lipoproteínas", category: "simulador" },
  "/simuladores/pentoses-fosfato": { slug: "pentoses-fosfato", name: "Pentoses Fosfato", category: "simulador" },
  "/simuladores/titulacao-aminoacidos": { slug: "titulacao-aminoacidos", name: "Titulação Aminoácidos", category: "simulador" },
  "/simuladores/operon-lac": { slug: "operon-lac", name: "Óperon Lac", category: "simulador" },

  // ── Simuladores Farmacologia ──
  "/simuladores/dose-resposta": { slug: "dose-resposta", name: "Dose-Resposta", category: "simulador" },
  "/simuladores/transducao-sinal": { slug: "transducao-sinal", name: "Transdução de Sinal", category: "simulador" },
  "/simuladores/janela-terapeutica-farma": { slug: "janela-terapeutica", name: "Janela Terapêutica", category: "simulador" },
  "/simuladores/vias-administracao": { slug: "vias-administracao", name: "Vias de Administração", category: "simulador" },
  "/simuladores/bloqueio-neuromuscular": { slug: "bloqueio-neuromuscular", name: "Bloqueio Neuromuscular", category: "simulador" },
  "/simuladores/farmaco-autonomica": { slug: "farmaco-autonomica", name: "Fármaco Autonômica", category: "simulador" },
  "/simuladores/tolerancia-dependencia": { slug: "tolerancia-dependencia", name: "Tolerância/Dependência", category: "simulador" },
  "/simuladores/farmacogenomica": { slug: "farmacogenomica", name: "Farmacogenômica", category: "simulador" },
  "/simuladores/dispensacao-344": { slug: "dispensacao-344", name: "Dispensação 344", category: "simulador" },

  // ── Simuladores Farmacotécnica ──
  "/simuladores/estabilidade": { slug: "estabilidade", name: "Estabilidade", category: "simulador" },
  "/simuladores/liberacao-farmacos": { slug: "liberacao-farmacos", name: "Liberação de Fármacos", category: "simulador" },
  "/simuladores/diluicao": { slug: "diluicao", name: "Diluição", category: "simulador" },
  "/simuladores/reologia": { slug: "reologia", name: "Reologia", category: "simulador" },
  "/simuladores/hlb-emulsoes": { slug: "hlb-emulsoes", name: "HLB e Emulsões", category: "simulador" },
  "/simuladores/granulometria": { slug: "granulometria", name: "Granulometria", category: "simulador" },
  "/simuladores/compressao": { slug: "compressao", name: "Compressão", category: "simulador" },
  "/simuladores/tampao-farmaceutico": { slug: "tampao-farmaceutico", name: "Tampão Farmacêutico", category: "simulador" },

  // ── Simuladores Química Farmacêutica ──
  "/simuladores/sar": { slug: "sar", name: "SAR", category: "simulador" },
  "/simuladores/lipinski": { slug: "lipinski", name: "Lipinski", category: "simulador" },
  "/simuladores/bioisosterismo": { slug: "bioisosterismo", name: "Bioisosterismo", category: "simulador" },
  "/simuladores/metabolismo": { slug: "metabolismo", name: "Metabolismo", category: "simulador" },
  "/simuladores/docking": { slug: "docking", name: "Docking", category: "simulador" },
  "/simuladores/quiralidade": { slug: "quiralidade", name: "Quiralidade", category: "simulador" },
  "/simuladores/pka-absorcao": { slug: "pka-absorcao", name: "pKa e Absorção", category: "simulador" },
  "/simuladores/qsar": { slug: "qsar", name: "QSAR", category: "simulador" },

  // ── Simuladores Docência ──
  "/simuladores/feedback-formativo": { slug: "feedback-formativo", name: "Feedback Formativo", category: "simulador" },
  "/simuladores/elaboracao-questoes": { slug: "elaboracao-questoes", name: "Elaboração de Questões", category: "simulador" },
  "/simuladores/conducao-caso": { slug: "conducao-caso", name: "Condução de Caso", category: "simulador" },
  "/simuladores/planejamento-aula": { slug: "planejamento-aula", name: "Planejamento de Aula", category: "simulador" },
  "/simuladores/gestao-sala": { slug: "gestao-sala", name: "Gestão de Sala", category: "simulador" },
  "/simuladores/avaliacao-rubrica": { slug: "avaliacao-rubrica", name: "Avaliação por Rubrica", category: "simulador" },
  "/simuladores/preceptoria-clinica": { slug: "preceptoria-clinica", name: "Preceptoria Clínica", category: "simulador" },

  // ── Simuladores Odontologia ──
  "/simuladores/odontograma": { slug: "odontograma", name: "Odontograma", category: "simulador" },
  "/simuladores/anatomia-endodontia": { slug: "anatomia-endodontia", name: "Anatomia/Endodontia", category: "simulador" },
  "/simuladores/periodontograma": { slug: "periodontograma", name: "Periodontograma", category: "simulador" },
  "/simuladores/anestesiologia-odonto": { slug: "anestesiologia-odonto", name: "Anestesiologia Odonto", category: "simulador" },
  "/simuladores/cefalometria": { slug: "cefalometria", name: "Cefalometria", category: "simulador" },
  "/simuladores/radiografia-odonto": { slug: "radiografia-odonto", name: "Radiografia Odonto", category: "simulador" },
  "/simuladores/farmacologia-odonto": { slug: "farmacologia-odonto", name: "Farmacologia Odonto", category: "simulador" },
  "/simuladores/cirurgia-exodontia": { slug: "cirurgia-exodontia", name: "Cirurgia/Exodontia", category: "simulador" },

  // ── Simuladores Fisioterapia ──
  "/simuladores/goniometria": { slug: "goniometria", name: "Goniometria", category: "simulador" },
  "/simuladores/avaliacao-postural": { slug: "avaliacao-postural", name: "Avaliação Postural", category: "simulador" },
  "/simuladores/forca-muscular": { slug: "forca-muscular", name: "Força Muscular", category: "simulador" },
  "/simuladores/dermatomos": { slug: "dermatomos", name: "Dermátomos", category: "simulador" },
  "/simuladores/respiratorio": { slug: "respiratorio", name: "Fisio. Respiratória", category: "simulador" },
  "/simuladores/eletroterapia": { slug: "eletroterapia", name: "Eletroterapia", category: "simulador" },
  "/simuladores/testes-ortopedicos": { slug: "testes-ortopedicos", name: "Testes Ortopédicos", category: "simulador" },
  "/simuladores/berg": { slug: "berg", name: "Escala de Berg", category: "simulador" },

  // ── Simuladores Nutrição ──
  "/simuladores/avaliacao-nutricional": { slug: "avaliacao-nutricional", name: "Aval. Nutricional", category: "simulador" },
  "/simuladores/triagem-nutricional": { slug: "triagem-nutricional", name: "Triagem Nutricional", category: "simulador" },
  "/simuladores/necessidades-energeticas": { slug: "necessidades-energeticas", name: "Nec. Energéticas", category: "simulador" },
  "/simuladores/tne": { slug: "tne", name: "TNE", category: "simulador" },
  "/simuladores/tnp": { slug: "tnp", name: "TNP", category: "simulador" },
  "/simuladores/disfagia": { slug: "disfagia", name: "Disfagia", category: "simulador" },
  "/simuladores/nutricao-renal": { slug: "nutricao-renal", name: "Nutrição Renal", category: "simulador" },
  "/simuladores/nutricao-materno-infantil": { slug: "nutricao-materno-infantil", name: "Nutrição M.I.", category: "simulador" },

  // ── Laboratórios Virtuais ──
  "/laboratorio-virtual/farmacos": { slug: "lab-farmacos", name: "Lab: Fármacos", category: "laboratorio" },
  "/laboratorio-virtual/microbiologia": { slug: "lab-microbiologia", name: "Lab: Microbiologia", category: "laboratorio" },
  "/laboratorio-virtual/toxicologia": { slug: "lab-toxicologia", name: "Lab: Toxicologia", category: "laboratorio" },
  "/laboratorio-virtual/farmacogenomica": { slug: "lab-farmacogenomica", name: "Lab: Farmacogenômica", category: "laboratorio" },
  "/laboratorio-virtual/estabilidade": { slug: "lab-estabilidade", name: "Lab: Estabilidade", category: "laboratorio" },
  "/laboratorio-virtual/controle-qualidade": { slug: "lab-controle-qualidade", name: "Lab: Controle de Qualidade", category: "laboratorio" },
  "/laboratorio-virtual/epidemiologia": { slug: "lab-epidemiologia", name: "Lab: Epidemiologia", category: "laboratorio" },
  "/laboratorio-virtual/biotecnologia": { slug: "lab-biotecnologia", name: "Lab: Biotecnologia", category: "laboratorio" },
  "/laboratorio-virtual/simulacao-realistica": { slug: "lab-simulacao-realistica", name: "Lab: Simulação Realística", category: "laboratorio" },
  "/laboratorio-virtual/pericia-forense": { slug: "lab-pericia-forense", name: "Lab: Perícia Forense", category: "laboratorio" },
  "/laboratorio-virtual/modelagem-molecular": { slug: "lab-modelagem-molecular", name: "Lab: Modelagem Molecular", category: "laboratorio" },

  // ── Jogos Clínicos ──
  "/jogos-clinicos": { slug: "jogos-clinicos", name: "Jogos Clínicos", category: "jogo" },

  // ── MedView 3D ──
  "/medview3d": { slug: "medview3d", name: "MedView 3D", category: "ferramenta" },
  "/medview3d/ortopedia": { slug: "medview3d-ortopedia", name: "MedView: Ortopedia", category: "ferramenta" },
  "/medview3d/cardiologia": { slug: "medview3d-cardiologia", name: "MedView: Cardiologia", category: "ferramenta" },
  "/medview3d/odontologia": { slug: "medview3d-odontologia", name: "MedView: Odontologia", category: "ferramenta" },
  "/medview3d/farmacologia": { slug: "medview3d-farmacologia", name: "MedView: Farmacologia", category: "ferramenta" },
  "/medview3d/dermatologia": { slug: "medview3d-dermatologia", name: "MedView: Dermatologia", category: "ferramenta" },
  "/medview3d/cirurgia-geral": { slug: "medview3d-cirurgia-geral", name: "MedView: Cirurgia Geral", category: "ferramenta" },
};

export function RouteTracker() {
  const location = useLocation();
  const lastPath = useRef("");

  useEffect(() => {
    const path = location.pathname;
    if (path === lastPath.current) return;
    lastPath.current = path;

    const meta = ROUTE_MAP[path];
    if (!meta) return;

    const log = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        await (supabase as any).from("tool_visits").insert({
          user_id: user?.id || null,
          tool_slug: meta.slug,
          tool_name: meta.name,
          tool_category: meta.category,
        });
      } catch {
        // silent
      }
    };
    log();
  }, [location.pathname]);

  return null;
}
