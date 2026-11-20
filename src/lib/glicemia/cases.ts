import type { GlicBaseLab, RegimenItem } from "./engine";

export interface GlicCase {
  id?: string; title: string; difficulty: string; isAI?: boolean;
  patient: { name: string; age: number; weight: number; sex: string; specialGroup: string[]; diagnosis?: string };
  scenario: string;
  baseLab: GlicBaseLab;
  expectedDrugs: string[];
  clinicalTip: string;
  references: string[];
  /** Esquema JÁ em uso: o baseLab é o laboratório COM esse esquema (opcional). */
  regimen?: RegimenItem[];
  /** Paciente com insuficiência cardíaca: mostra a barra de descompensação de IC (opcional). */
  ic?: boolean;
  /** Meta de HbA1c do caso, em % (opcional). */
  hba1cTarget?: number;
}

export const BUILT_IN_CASES: GlicCase[] = [
  {
    title: "Caso 1: Maria Santos",
    difficulty: "Fácil",
    patient: { name: "Maria Santos", age: 52, weight: 85, sex: "F", specialGroup: ["Obesa"], diagnosis: "DM2 HbA1c 8.2% — 1ª linha" },
    scenario: "Mulher 52a, 85 kg, obesa (IMC 32), DM2 recém-diagnosticado na primeira consulta, sem tratamento medicamentoso. Glicemia de jejum 185 mg/dL, pós-prandial 260 mg/dL, HbA1c 8,2%, insulina 22 µUI/mL, peptídeo-C 3,0 ng/mL. Creatinina 0,8 mg/dL, TFG 95 mL/min, K⁺ 4,2. Sem complicações. Meta de HbA1c do caso: até 7,0%.",
    baseLab: { jejum: 185, pp: 260, hba1c: 8.2, insulina: 22, peptideoC: 3.0, creatinina: 0.8, tfg: 95, potassio: 4.2 },
    hba1cTarget: 7.0,
    expectedDrugs: ["Metformina"],
    clinicalTip: "DM2 recém-diagnosticado com HbA1c 7-9%: metformina 1ª linha. Iniciar 500mg e titular a cada 1-2 semanas. Associar MEV. Se a meta não for atingida em ~3 meses, o 2º agente é escolhido pelo perfil do paciente.",
    references: ["SBD 2024", "ADA Standards of Care 2024"],
  },
  {
    title: "Caso 2: José Oliveira",
    difficulty: "Médio",
    patient: { name: "José Oliveira", age: 63, weight: 92, sex: "M", specialGroup: ["DCV", "IC"], diagnosis: "DM2 + IC com FE reduzida" },
    scenario: "Homem 63a, 92 kg, DM2 há 8 anos, IAM prévio, insuficiência cardíaca com FE 35% (NYHA II). Em uso de metformina 2 g/dia: jejum 195 mg/dL, pós-prandial 280 mg/dL, HbA1c 8,5%. Creatinina 1,1 mg/dL, TFG 72 mL/min, K⁺ 4,5. Meta de HbA1c do caso: até 7,5% (cardiopata com IC).",
    baseLab: { jejum: 195, pp: 280, hba1c: 8.5, insulina: 18, peptideoC: 2.5, creatinina: 1.1, tfg: 72, potassio: 4.5 },
    regimen: [{ drug: "Metformina", dose: 2000 }],
    ic: true,
    hba1cTarget: 7.5,
    expectedDrugs: ["Empagliflozina", "Liraglutida"],
    clinicalTip: "DM2 + DCV/IC: priorizar iSGLT2 (empagliflozina/dapagliflozina) por benefício cardiorrenal. GLP-1 RA como alternativa com benefício CV. Pioglitazona é contraindicada na IC.",
    references: ["EMPA-REG OUTCOME 2015", "ADA/EASD Consensus 2022"],
  },
  {
    title: "Caso 3: Dona Fátima",
    difficulty: "Difícil",
    patient: { name: "Dona Fátima", age: 68, weight: 65, sex: "F", specialGroup: ["DRC G3b"], diagnosis: "DM2 + DRC G3b TFG 38" },
    scenario: "Mulher 68a, 65 kg, DM2 há 15 anos, creatinina 1,6 mg/dL, TFG 38 mL/min (G3b), K⁺ 5,0. Em uso de metformina 1 g/dia + glibenclamida 10 mg/dia, com hipoglicemias frequentes: jejum 170 mg/dL, pós-prandial 240 mg/dL, HbA1c 8,0%, peptídeo-C 4,0 ng/mL. Meta de HbA1c do caso: até 8,0%.",
    baseLab: { jejum: 170, pp: 240, hba1c: 8.0, insulina: 14, peptideoC: 4.0, creatinina: 1.6, tfg: 38, potassio: 5.0 },
    regimen: [{ drug: "Metformina", dose: 1000 }, { drug: "Glibenclamida", dose: 10 }],
    hba1cTarget: 8.0,
    expectedDrugs: ["Insulina Glargina"],
    clinicalTip: "DRC G3b (TFG 30-44): metformina até 1 g/dia (suspender se <30). Suspender glibenclamida (hipoglicemia). iSGLT2 com cautela. Insulina basal é segura, com dose conservadora.",
    references: ["KDIGO 2022", "SBD 2024"],
  },
  {
    title: "Caso 4: Pedro Lima",
    difficulty: "Difícil",
    patient: { name: "Pedro Lima", age: 28, weight: 70, sex: "M", specialGroup: ["DM1"], diagnosis: "CAD — pH 7.18, glicemia 450" },
    scenario: "Homem 28a, 70 kg, DM1 diagnosticado há 5 meses. Parou a insulina há 3 dias. Náusea, dor abdominal e respiração de Kussmaul. Glicemia 450 mg/dL, pH 7,18, HCO₃⁻ 11 mEq/L, ânion gap 24, K⁺ 5,8 mEq/L, creatinina 1,4 mg/dL, TFG 75 mL/min, peptídeo-C 0,3 ng/mL. Neste caso as doses de insulina do painel representam a intensidade da insulinização (na prática, a insulina é regular EV contínua, 0,1 UI/kg/h).",
    baseLab: { jejum: 450, pp: 520, hba1c: 11.0, insulina: 2, peptideoC: 0.3, creatinina: 1.4, tfg: 75, potassio: 5.8, ph: 7.18, hco3: 11, anionGap: 24 },
    expectedDrugs: ["Insulina Lispro"],
    clinicalTip: "CAD: SF 0.9% 1-1.5L/h → insulina regular EV 0.1 UI/kg/h. Repor K⁺ se <5.3. Manter insulina até o ânion gap normalizar. Transição para basal-bolus com sobreposição.",
    references: ["ADA 2024", "Kitabchi AE, Diabetes Care 2009"],
  },
  {
    title: "Caso 5: Seu Antônio",
    difficulty: "Médio",
    patient: { name: "Seu Antônio", age: 82, weight: 58, sex: "M", specialGroup: ["Idoso frágil", "Polifarmácia"], diagnosis: "DM2 + fragilidade — meta HbA1c <8.5%" },
    scenario: "Homem 82a, 58 kg, frágil, DM2 há 20 anos, creatinina 1,3 mg/dL (clearance de creatinina estimado por Cockcroft-Gault: 36 mL/min). Em uso de glibenclamida 15 mg/dia + metformina 1,5 g/dia, com hipoglicemias noturnas recorrentes: jejum 110 mg/dL, pós-prandial 180 mg/dL, HbA1c 7,0%, K⁺ 4,8. Meta de HbA1c do caso: até 8,5%.",
    baseLab: { jejum: 110, pp: 180, hba1c: 7.0, insulina: 10, peptideoC: 1.5, creatinina: 1.3, tfg: 36, potassio: 4.8 },
    regimen: [{ drug: "Glibenclamida", dose: 15 }, { drug: "Metformina", dose: 1500 }],
    hba1cTarget: 8.5,
    expectedDrugs: ["Sitagliptina"],
    clinicalTip: "Idoso frágil: meta HbA1c <8-8.5%. Suspender sulfonilureias (hipo). iDPP-4 seguro, peso-neutro, com dose ajustada à função renal. Metformina até 1 g/dia com TFG 30-44.",
    references: ["ADA Older Adults 2024", "SBD 2024"],
  },
];
