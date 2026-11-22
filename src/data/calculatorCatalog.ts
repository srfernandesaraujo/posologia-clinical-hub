import {
  Activity, Baby, Beaker, Bone, Brain, Dna, Droplets, Flame, FlaskConical, Heart, HeartPulse, Moon, Pill, ShieldAlert, Syringe, Thermometer, Utensils, Zap,
  type LucideIcon,
} from "lucide-react";

// Fonte canônica das calculadoras nativas (/calculadoras/*). Usada pela página
// /calculadoras e pela busca universal (Ctrl+K) — não duplique esta lista.
export interface NativeCalculator {
  name: string;
  description: string;
  category: string;
  path: string;
  icon: LucideIcon;
  searchKey: string;
}

export const NATIVE_CALCULATORS: NativeCalculator[] = [
  { name: "Calculadora de Risco Cardiovascular", description: "Estima o risco CV em 10 anos via Framingham, ASCVD e SCORE2.", category: "Cardiologia", path: "/calculadoras/risco-cardiovascular", icon: Heart, searchKey: "calculadora de risco cardiovascular" },
  { name: "Calculadora de Desmame de Corticoides", description: "Plano individualizado de redução de dose com avaliação de risco de supressão adrenal.", category: "Endocrinologia", path: "/calculadoras/desmame-corticoide", icon: Pill, searchKey: "calculadora de desmame de corticoides" },
  { name: "Calculadora de Equivalência de Opioides", description: "Conversão segura entre opioides com fatores de correção para tolerância cruzada.", category: "Dor / Cuidados Paliativos", path: "/calculadoras/equivalencia-opioides", icon: Syringe, searchKey: "calculadora de equivalência de opioides" },
  { name: "Calculadora de Ajuste de Dose Renal", description: "Cockcroft-Gault, CKD-EPI e ajuste de dose para insuficiência renal.", category: "Nefrologia", path: "/calculadoras/ajuste-dose-renal", icon: Beaker, searchKey: "calculadora de ajuste de dose renal" },
  { name: "Calculadora de Equivalência de Antidepressivos", description: "Conversão segura entre antidepressivos com estratégia de transição terapêutica.", category: "Psiquiatria", path: "/calculadoras/equivalencia-antidepressivos", icon: Brain, searchKey: "calculadora de equivalência de antidepressivos" },
  { name: "Calculadora de Resistência Insulínica (HOMA-IR)", description: "Cálculo e interpretação do índice HOMA-IR para avaliação metabólica.", category: "Endocrinologia", path: "/calculadoras/homa-ir", icon: Activity, searchKey: "calculadora de resistência insulínica homa-ir" },
  { name: "Calculadora de Risco de Diabetes Tipo 2 (FINDRISC)", description: "Escore FINDRISC para estimar risco de DM2 em 10 anos.", category: "Endocrinologia", path: "/calculadoras/findrisc", icon: ShieldAlert, searchKey: "calculadora de risco de diabetes tipo 2 findrisc" },
  { name: "CKD-EPI 2021 (TFG estimada)", description: "Equação 2021 sem correção racial — estimativa da taxa de filtração glomerular.", category: "Nefrologia", path: "/calculadoras/ckd-epi", icon: Beaker, searchKey: "ckd-epi tfg taxa filtracao glomerular renal creatinina" },
  { name: "Correção de Sódio por Hiperglicemia", description: "Corrige sódio pela glicemia (fórmula de Katz) — essencial em CAD/EHH.", category: "Emergência / Medicina Interna", path: "/calculadoras/correcao-sodio", icon: Droplets, searchKey: "correcao sodio hiponatremia hiperglicemia katz" },
  { name: "Correção de Cálcio pela Albumina", description: "Ajusta o cálcio total pela albumina sérica (fórmula de Payne).", category: "Emergência / Medicina Interna", path: "/calculadoras/correcao-calcio", icon: Bone, searchKey: "correcao calcio albumina payne hipocalcemia" },
  { name: "Escore de Wells (TEP / TVP)", description: "Estratificação de probabilidade pré-teste para tromboembolismo venoso.", category: "Cardiologia", path: "/calculadoras/wells-score", icon: HeartPulse, searchKey: "wells score tep tvp embolia pulmonar trombose venosa" },
  { name: "qSOFA (Quick SOFA)", description: "Triagem rapida a beira-leito para risco de sepse — Sepsis-3.", category: "Emergência / Medicina Interna", path: "/calculadoras/qsofa", icon: Thermometer, searchKey: "qsofa sofa sepse sepsis triagem" },
  { name: "Vancomicina AUC/MIC", description: "Monitoramento farmacocinetico baseado em AUC — IDSA/ASHP 2020.", category: "Farmacologia Clínica", path: "/calculadoras/vancomicina-auc", icon: FlaskConical, searchKey: "vancomicina auc mic farmacocinetica" },
  { name: "Insulina Basal-Bolus + Correcao", description: "Calculo de dose basal, prandial e escala de correcao hospitalar.", category: "Endocrinologia", path: "/calculadoras/insulina-basal-bolus", icon: Syringe, searchKey: "insulina basal bolus correcao hospitalar" },
  { name: "Holliday-Segar (Hidratacao Pediatrica)", description: "Volume de manutencao IV com eletrolitos — regra 4-2-1.", category: "Pediatria", path: "/calculadoras/holliday-segar", icon: Baby, searchKey: "holliday segar pediatria hidratacao 4-2-1" },
  { name: "MELD / MELD-Na / Child-Pugh", description: "Prognostico hepatico e priorizacao para transplante.", category: "Hepatologia", path: "/calculadoras/meld-score", icon: Flame, searchKey: "meld meld-na child pugh hepatologia cirrose transplante" },
  { name: "QTc Corrigido (Bazett / Fridericia)", description: "Correcao do intervalo QT pela frequencia cardiaca.", category: "Cardiologia", path: "/calculadoras/qtc-corrigido", icon: Zap, searchKey: "qtc corrigido bazett fridericia intervalo qt ecg" },
  { name: "Dose Pediatrica por Peso", description: "Calculo de dose por kg para medicamentos pediatricos comuns.", category: "Pediatria", path: "/calculadoras/dose-pediatrica", icon: Baby, searchKey: "dose pediatrica peso crianca amoxicilina ibuprofeno" },
  { name: "Escala RASS (Sedacao em UTI)", description: "Richmond Agitation-Sedation Scale — avaliacao e conduta.", category: "Terapia Intensiva", path: "/calculadoras/rass-sedacao", icon: Moon, searchKey: "rass sedacao uti agitacao richmond" },
  { name: "Nutricao Parenteral Total (NPT)", description: "Calculo de macronutrientes, GIR e volume para NPT.", category: "Terapia Intensiva", path: "/calculadoras/nutricao-parenteral", icon: Utensils, searchKey: "nutricao parenteral npt gir harris benedict" },
  { name: "Radar de Interacoes CYP450", description: "Visualizacao das interacoes farmacocineticas via citocromo P450.", category: "Farmacologia Clínica", path: "/calculadoras/interacoes-cyp", icon: Dna, searchKey: "interacoes cyp450 citocromo farmacologia" },
  { name: "Predição de Risco de Não Adesão Oncológica", description: "ARMS, MOATT, Morisky e AQT para avaliar risco de não adesão em pacientes oncológicos.", category: "Oncologia", path: "/calculadoras/adesao-oncologia", icon: Pill, searchKey: "adesao oncologia arms moatt morisky aqt" },
  { name: "Predição de Reações Adversas a Antineoplásicos", description: "CARG, CRASH e HFA-ICOS para predição de toxicidade e cardiotoxicidade.", category: "Oncologia", path: "/calculadoras/toxicidade-antineoplasicos", icon: Activity, searchKey: "toxicidade antineoplasicos carg crash hfa icos cardiotoxicidade" },
  { name: "Ajuste de Dose Oncológico (Renal/Hepático)", description: "Carboplatina (Calvert), ajuste renal (Cockcroft-Gault) e hepático (NCI-ODWG / Child-Pugh).", category: "Oncologia", path: "/calculadoras/ajuste-dose-oncologico", icon: FlaskConical, searchKey: "ajuste dose oncologico carboplatina calvert renal hepatico child pugh nci odwg" },
  { name: "Curvas de Crescimento OMS (Z-Score)", description: "Peso-para-idade com percentis WHO 2006 — criancas 0-5 anos.", category: "Pediatria", path: "/calculadoras/curvas-crescimento-oms", icon: Baby, searchKey: "curvas crescimento oms zscore peso idade percentil who pediatria" },
  { name: "Bilirrubina Neonatal (Bhutani/AAP)", description: "Nomograma de risco e indicacao de fototerapia neonatal.", category: "Pediatria", path: "/calculadoras/bilirrubina-neonatal", icon: Baby, searchKey: "bilirrubina neonatal bhutani aap fototerapia ictericia recem nascido" },
  { name: "TFG Pediatrica (Schwartz)", description: "Estimativa da TFG em criancas — Bedside Schwartz 2009.", category: "Pediatria", path: "/calculadoras/schwartz-pediatrico", icon: Baby, searchKey: "schwartz pediatrico tfg taxa filtracao glomerular crianca creatinina" },
  { name: "PEWS (Pediatric Early Warning Score)", description: "Deteccao precoce de deterioracao clinica em criancas hospitalizadas.", category: "Pediatria", path: "/calculadoras/pews", icon: Baby, searchKey: "pews pediatric early warning score deterioracao crianca" },
  { name: "Drogas Vasoativas Pediatricas", description: "Calculo de infusao e diluicao para vasopressores e inotropicos pediatricos.", category: "Pediatria", path: "/calculadoras/drogas-vasoativas-pediatricas", icon: Baby, searchKey: "drogas vasoativas pediatricas dopamina dobutamina noradrenalina adrenalina milrinona" },
  { name: "Idade Gestacional + DPP", description: "Calculo por DUM ou USG com timeline gestacional e data provavel do parto.", category: "Ginecologia e Obstetrícia", path: "/calculadoras/idade-gestacional", icon: HeartPulse, searchKey: "idade gestacional dum usg dpp naegele obstetrica" },
  { name: "Ganho de Peso Gestacional (IOM)", description: "Avaliacao do ganho ponderal conforme IMC pre-gestacional (IOM 2009).", category: "Ginecologia e Obstetrícia", path: "/calculadoras/ganho-peso-gestacional", icon: HeartPulse, searchKey: "ganho peso gestacional iom imc gravidez obstetrica" },
  { name: "Risco de Pre-Eclampsia (ACOG/NICE)", description: "Rastreio de fatores de risco e indicacao de AAS profilatico.", category: "Ginecologia e Obstetrícia", path: "/calculadoras/risco-pre-eclampsia", icon: HeartPulse, searchKey: "pre eclampsia acog nice aas aspirina risco obstetrica" },
  { name: "Bishop Score", description: "Avaliacao do amadurecimento cervical para inducao do parto.", category: "Ginecologia e Obstetrícia", path: "/calculadoras/bishop-score", icon: HeartPulse, searchKey: "bishop score inducao parto cervical obstetrica" },
  { name: "Dosagem de Sulfato de Magnesio", description: "Protocolos Zuspan e Pritchard para eclampsia/pre-eclampsia grave.", category: "Ginecologia e Obstetrícia", path: "/calculadoras/sulfato-magnesio", icon: HeartPulse, searchKey: "sulfato magnesio zuspan pritchard eclampsia obstetrica" },
];
