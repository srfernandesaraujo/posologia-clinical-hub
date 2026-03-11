import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI } from "../_shared/ai-provider.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SIMULATOR_PROMPTS: Record<string, string> = {
  // ===================== CLÍNICOS =====================
  prm: `Gere um caso clínico COMPLETO para o Simulador de PRM (Problemas Relacionados a Medicamentos).
O caso deve conter:
- scenario: uma breve descrição do cenário clínico (1-2 frases resumindo o caso)
- patient: { name, age, weight, height, sex }
- history: { diseases (array), mainComplaint, allergies (array), creatinineClearance (number or null), vitalSigns: { bp, hr, temp, spo2 } }
- prescription: array de { drug, dose, route, frequency }
- answers: array de { drugIndex (0-based), hasPRM (boolean), type (string: "Seguranca"|"Efetividade"|"Indicacao"|"Adesao"|null), justification (string) }
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo do caso

Inclua pelo menos 2 PRMs reais baseados em evidências. Varie entre idosos, pediatria, gestantes, polimedicados e comorbidades. Use farmacologia realista.`,

  antimicrobianos: `Gere um caso clínico COMPLETO para o Simulador de Antimicrobial Stewardship.
O caso deve conter:
- scenario: uma breve descrição do cenário clínico (1-2 frases resumindo o caso)
- patient: { name, age, weight, comorbidities (array), allergies (array), vitalSigns: { bp, hr, temp, spo2 } }
- day1: { clinicalDescription, suspectedDiagnosis }
- day3: { evolution, cultureResult, organism, antibiogram: array de { antibiotic, result ("S"|"R"), mic (string) } }
- expectedDay1: { antibiotics (array of strings), cultures (array of strings), justification }
- expectedDay3: { action ("descalonar"|"manter"|"trocar"), newAntibiotic (string or null), stopAntibiotics (array), justification }
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo

Use patógenos reais, antibiogramas coerentes. Varie entre ITU, PAC, infecção de pele, meningite, etc.`,

  tdm: `Gere um caso clínico COMPLETO para o Simulador de TDM (Monitoramento Terapêutico de Fármacos).
O caso deve conter:
- scenario: uma breve descrição do cenário clínico (1-2 frases resumindo o caso)
- patient: { name, age, weight, sex, serumCreatinine, creatinineClearance }
- infection: descrição da infecção/indicação
- currentPrescription: { drug, dose, interval, route }
- tdmResult: { troughLevel (number), peakLevel (number or null), unit (string) }
- therapeuticRange: { troughMin, troughMax, peakMin (or null), peakMax (or null) }
- expected: { newDose, newInterval, holdDose (boolean), justification }
- pharmacokineticData: { halfLife, vd, elimination } para gráfico
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo

Use fármacos como Vancomicina, Gentamicina, Fenitoína, Lítio, Digoxina. Varie cenários.`,

  acompanhamento: `Gere um caso clínico COMPLETO para o Simulador de Acompanhamento Farmacoterapêutico.
O caso deve conter:
- scenario: uma breve descrição do cenário clínico (1-2 frases resumindo o caso)
- patient: { name, age, diagnoses (array) }
- consultations: array de pelo menos 3 consultas, cada uma com:
  - month: número do mês (0, 3, 6)
  - symptoms: descrição clínica
  - labs: objeto com marcadores { name, value, unit, target, status ("normal"|"high"|"low") }
  - currentPrescription: array de { drug, dose, frequency }
  - expected: { actions: array de { drug, action ("manter"|"aumentar"|"reduzir"|"suspender"|"adicionar"), newDose (or null), justification } }
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo

Use doenças crônicas reais: DM2, HAS, dislipidemia, hipotireoidismo, IC, asma. Exames coerentes.`,

  insulina: `Gere um caso clínico COMPLETO para o Simulador de Dose de Insulina (Koda-Kimble).
O caso deve conter:
- scenario: uma breve descrição do cenário clínico (1-2 frases resumindo o caso)
- patient: { name, age, weight, sex, diagnosis, hba1c, fastingGlucose, bp, lipidProfile: { ldl, hdl, tg }, clinicalSummary }
- glycemicProfile: array de 4 números (07h, 12h, 17h, 23h em mg/dL)
- initialTDD: dose total diária sugerida (0.45 * peso)
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo

Varie entre DM1 e DM2, diferentes perfis glicêmicos, comorbidades variadas.`,

  "bomba-infusao": `Gere um caso clínico COMPLETO para o Simulador de Bomba de Infusão.
O caso deve conter:
- patient: { name, age, weight, sex, diagnosis, clinicalContext }
- scenario: descrição do cenário clínico
- drugName: nome da droga (ex: "Noradrenalina", "Dopamina", "Fentanil", "Dobutamina", "Midazolam")
- mode: "simple" | "dose_weight" | "bolus"
- targetRate: taxa alvo em mL/h
- targetDose: dose alvo em mcg/kg/min
- targetBolus: volume do bolus em mL (ou null)
- totalVolume: volume total (mL)
- expectedActions: array de strings com ações corretas
- clinicalTip: dica farmacológica
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  "desmame-benzo": `Gere um caso clínico COMPLETO para o Simulador de Desmame de Benzodiazepínicos (Protocolo de Ashton).
O caso deve conter:
- scenario: uma breve descrição do cenário clínico (1-2 frases resumindo o caso)
- patient: { name, age, sex, diagnosis, clinicalContext }
- drugName: nome do BZD atual ("Alprazolam", "Clonazepam", "Lorazepam", "Bromazepam", "Diazepam", "Nitrazepam", "Flunitrazepam", "Midazolam")
- dailyDose: dose diária em mg
- usageDuration: tempo de uso em meses
- sensitivity: "normal" ou "high"
- comorbidities: array de comorbidades
- expectedPlan: descrição do plano de desmame
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  interacoes: `Gere um caso clínico COMPLETO para o Simulador de Interações Medicamentosas.
O caso deve conter:
- patient: { name, age, sex, diagnosis, clinicalContext }
- scenario: descrição do cenário
- drugs: array de strings (nomes em INGLÊS, 3-6 medicamentos)
- comorbidities: array de strings ("renal", "hepatic", "cardiac", "elderly")
- expectedInteractions: array de { drugA, drugB, severity ("high"|"medium"|"low"), mechanism, conduct }
- clinicalTip: dica farmacológica
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  // ===================== FISIOLOGIA =====================
  sna: `Gere um caso para o Simulador do Sistema Nervoso Autônomo.
O JSON deve conter EXATAMENTE estes campos (sem campos extras):
- patient: { name, age, sex, clinicalContext }
- scenario: descrição clínica detalhada
- initialSympathetic: número 0-100 (tônus simpático inicial, ex: 40)
- initialParasympathetic: número 0-100 (tônus parassimpático inicial, ex: 50)
- expectedFC: [min, max] frequência cardíaca esperada (ex: [60, 80])
- expectedPAS: [min, max] pressão arterial sistólica esperada (ex: [110, 130])
- clinicalTip: dica clínica educativa
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  "eletrofisiologia-cardiaca": `Gere um caso para o Simulador de Eletrofisiologia Cardíaca.
O JSON deve conter EXATAMENTE estes campos:
- patient: { name, age, sex, clinicalContext }
- scenario: descrição clínica
- initialNa: número 0-100 (atividade canal Na+, ex: 100)
- initialK: número 0-100 (atividade canal K+, ex: 100)
- initialCa: número 0-100 (atividade canal Ca2+, ex: 100)
- cellType: "ventricular" | "nodal" | "atrial" | "purkinje"
- expectedPhase: fase do potencial de ação mais afetada (ex: "fase 0")
- clinicalTip: dica clínica
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  "depuracao-renal": `Gere um caso para o Simulador de Depuração Renal.
O JSON deve conter EXATAMENTE estes campos:
- patient: { name, age, sex, clinicalContext }
- scenario: descrição clínica
- initialAfferent: número 0-100 (tônus arteriolar aferente, ex: 70)
- initialEfferent: número 0-100 (tônus arteriolar eferente, ex: 60)
- initialHydration: número 0-100 (hidratação, ex: 80)
- initialPermeability: número 0-100 (permeabilidade tubular, ex: 100)
- expectedTFG: [min, max] taxa filtração glomerular esperada (ex: [60, 120])
- clinicalTip: dica clínica
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  "equilibrio-acido-base": `Gere um caso para o Simulador de Equilíbrio Ácido-Base.
O JSON deve conter EXATAMENTE estes campos:
- patient: { name, age, sex, clinicalContext }
- scenario: descrição clínica
- initialPH: número (pH arterial, ex: 7.4)
- initialPCO2: número (pCO2 em mmHg, ex: 40)
- initialHCO3: número (HCO3 em mEq/L, ex: 24)
- expectedClassification: classificação esperada (ex: "acidose metabólica")
- clinicalTip: dica clínica
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  "regulacao-glicemica": `Gere um caso para o Simulador de Regulação Glicêmica.
O JSON deve conter EXATAMENTE estes campos:
- patient: { name, age, sex, clinicalContext }
- scenario: descrição clínica
- initialCarbIntake: número 0-100 (ingestão de carboidratos, ex: 50)
- initialInsulinSensitivity: número 0-100 (sensibilidade à insulina, ex: 80)
- initialPancreaticFunction: número 0-100 (função pancreática, ex: 95)
- expectedGlycemia: [min, max] glicemia esperada (ex: [70, 140])
- clinicalTip: dica clínica
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  "eixo-hpa": `Gere um caso para o Simulador do Eixo HPA.
O JSON deve conter EXATAMENTE estes campos:
- patient: { name, age, sex, clinicalContext }
- scenario: descrição clínica
- initialStress: número 0-100 (nível de estresse, ex: 30)
- initialExogenousCortisol: número 0-100 (corticoide exógeno, ex: 0)
- expectedCortisol: [min, max] cortisol esperado (ex: [5, 25])
- clinicalTip: dica clínica
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  "cinetica-enzimatica": `Gere um caso para o Simulador de Cinética Enzimática.
O JSON deve conter EXATAMENTE estes campos:
- patient: { name, age, sex, clinicalContext }
- scenario: descrição clínica
- initialVmax: número (velocidade máxima, ex: 100)
- initialKm: número (Km em µM, ex: 50)
- expectedVmax: [min, max] Vmax esperado (ex: [90, 110])
- expectedKm: [min, max] Km esperado (ex: [45, 55])
- clinicalTip: dica clínica
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  "secrecao-gastrica": `Gere um caso para o Simulador de Secreção Gástrica.
O JSON deve conter EXATAMENTE estes campos:
- patient: { name, age, sex, clinicalContext }
- scenario: descrição clínica
- initialHistamine: boolean (histamina ativa, ex: true)
- initialAcetylcholine: boolean (acetilcolina ativa, ex: true)
- initialGastrin: boolean (gastrina ativa, ex: true)
- initialBlockPPI: boolean (IBP ativo, ex: false)
- initialBlockH2: boolean (bloqueador H2 ativo, ex: false)
- initialBlockAnticholinergic: boolean (anticolinérgico ativo, ex: false)
- expectedPH: [min, max] pH gástrico esperado (ex: [4, 7])
- clinicalTip: dica clínica
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  "cascata-coagulacao": `Gere um caso para o Simulador da Cascata de Coagulação.
O JSON deve conter EXATAMENTE estes campos:
- patient: { name, age, sex, clinicalContext }
- scenario: descrição clínica
- disabledFactors: array de strings com fatores desativados (ex: ["VIII"] para hemofilia A, ["II","VII","IX","X"] para varfarina)
- expectedTP: [min, max] tempo de protrombina esperado em segundos (ex: [10, 14])
- expectedINR: [min, max] INR esperado (ex: [0.8, 1.2])
- expectedTTPa: [min, max] TTPa esperado em segundos (ex: [25, 35])
- clinicalTip: dica clínica
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  "compartimentos-adme": `Gere um caso para o Simulador de Compartimentos ADME.
O JSON deve conter EXATAMENTE estes campos:
- patient: { name, age, sex, clinicalContext }
- scenario: descrição clínica
- initialBioavailability: número 0-100 (biodisponibilidade %, ex: 85)
- initialVd: número 0-100 (volume de distribuição, ex: 50)
- initialClearance: número 0-100 (depuração, ex: 20)
- initialKa: número 0-100 (velocidade de absorção, ex: 70)
- initialFirstPass: boolean (efeito de primeira passagem ativo, ex: true)
- expectedCmax: [min, max] concentração máxima esperada (ex: [5, 30])
- clinicalTip: dica clínica
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  // ===================== BIOQUÍMICA =====================
  "cadeia-eletrons": `Gere um caso para o Simulador da Cadeia de Transporte de Elétrons.
O JSON deve conter EXATAMENTE estes campos:
- patient: { name, age, sex, clinicalContext }
- scenario: descrição clínica
- initialNADH: número 0-100 (produção de NADH %, ex: 60)
- initialFADH2: número 0-100 (produção de FADH2 %, ex: 40)
- inhibitors: { rotenone: boolean, antimycinA: boolean, cyanide: boolean, dnp: boolean }
- expectedATP: [min, max] ATP produzido esperado (ex: [20, 38])
- clinicalTip: dica clínica
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  "dissociacao-hemoglobina": `Gere um caso para o Simulador de Dissociação da Hemoglobina.
O JSON deve conter EXATAMENTE estes campos:
- patient: { name, age, sex, clinicalContext }
- scenario: descrição clínica
- initialPH: número (pH sanguíneo, ex: 7.40)
- initialPCO2: número (pCO2 em mmHg, ex: 40)
- initialTemp: número (temperatura em °C, ex: 37)
- initialBPG: número (2,3-BPG em mM, ex: 5)
- expectedP50: [min, max] P50 esperado em mmHg (ex: [24, 28])
- clinicalTip: dica clínica
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  "glicolise-gliconeogenese": `Gere um caso para o Simulador de Glicólise vs Gliconeogênese.
O JSON deve conter EXATAMENTE estes campos:
- patient: { name, age, sex, clinicalContext }
- scenario: descrição clínica
- initialFed: boolean (estado alimentado, ex: true)
- initialInsulin: número 0-100 (insulina %, ex: 60)
- initialGlucagon: número 0-100 (glucagon %, ex: 30)
- expectedFlux: "glycolysis" | "gluconeogenesis" (fluxo metabólico esperado)
- clinicalTip: dica clínica
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  "cinetica-avancada": `Gere um caso para o Simulador de Cinética Enzimática Avançada.
O JSON deve conter EXATAMENTE estes campos:
- patient: { name, age, sex, clinicalContext }
- scenario: descrição clínica
- initialVmax: número (Vmax, ex: 100)
- initialKm: número (Km, ex: 10)
- inhibitorType: "none" | "competitive" | "noncompetitive" | "uncompetitive"
- expectedKmApp: [min, max] Km aparente esperado (ex: [8, 12])
- expectedVmaxApp: [min, max] Vmax aparente esperado (ex: [90, 110])
- clinicalTip: dica clínica
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  "ciclo-ureia": `Gere um caso para o Simulador do Ciclo da Ureia.
O JSON deve conter EXATAMENTE estes campos:
- patient: { name, age, sex, clinicalContext }
- scenario: descrição clínica
- deficiencies: { cpsI: boolean, otc: boolean, ass: boolean, asl: boolean, arginase: boolean }
- expectedAmmonia: [min, max] amônia esperada em µmol/L (ex: [50, 200])
- clinicalTip: dica clínica
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  "acido-araquidonico": `Gere um caso para o Simulador da Cascata do Ácido Araquidônico.
O JSON deve conter EXATAMENTE estes campos:
- patient: { name, age, sex, clinicalContext }
- scenario: descrição clínica
- initialStimulus: número 0-100 (estímulo inflamatório, ex: 70)
- drugs: { aspirin: boolean, ibuprofen: boolean, celecoxib: boolean, corticosteroid: boolean, zileuton: boolean, montelukast: boolean }
- expectedPGE2: [min, max] PGE2 esperada (% do normal, ex: [10, 50])
- clinicalTip: dica clínica
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  lipoproteinas: `Gere um caso para o Simulador de Metabolismo de Lipoproteínas.
O JSON deve conter EXATAMENTE estes campos:
- patient: { name, age, sex, clinicalContext }
- scenario: descrição clínica
- initialFatIntake: número 0-100 (ingestão de gordura, ex: 50)
- initialLPL: número 0-100 (atividade LPL, ex: 80)
- initialLDLReceptor: número 0-100 (atividade receptor LDL, ex: 80)
- drugs: { statin: boolean, resin: boolean, ezetimibe: boolean, pcsk9i: boolean, fibrate: boolean }
- expectedLDL: [min, max] LDL esperado (ex: [70, 130])
- clinicalTip: dica clínica
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  "pentoses-fosfato": `Gere um caso para o Simulador da Via das Pentoses Fosfato.
O JSON deve conter EXATAMENTE estes campos:
- patient: { name, age, sex, clinicalContext }
- scenario: descrição clínica
- g6pdDeficient: boolean (deficiência de G6PD, ex: false)
- oxidantAgent: string (agente oxidante, ex: "primaquina", "dapsona", "sulfonamida", "fava")
- oxidantDose: número 0-100 (dose do oxidante, ex: 50)
- expectedHemolysis: [min, max] hemólise esperada (% ex: [0, 50])
- clinicalTip: dica clínica
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  "titulacao-aminoacidos": `Gere um caso para o Simulador de Titulação de Aminoácidos.
O JSON deve conter EXATAMENTE estes campos:
- patient: { name, age, sex, clinicalContext }
- scenario: descrição educativa
- aminoAcidIndex: número (índice do aminoácido na lista do simulador, 0-9)
- startpH: número (pH inicial da titulação, ex: 1.0)
- clinicalTip: dica clínica sobre o aminoácido
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  "operon-lac": `Gere um caso para o Simulador do Operon Lac.
O JSON deve conter EXATAMENTE estes campos:
- patient: { name, age, sex, clinicalContext }
- scenario: descrição educativa
- initialGlucose: número 0-100 (concentração de glicose, ex: 50)
- initialLactose: número 0-100 (concentração de lactose, ex: 50)
- expectedTranscription: [min, max] nível de transcrição esperado (% ex: [0, 100])
- clinicalTip: dica educativa
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  // ===================== FARMACOLOGIA BÁSICA =====================
  "dose-resposta": `Gere um caso para o Simulador de Curva Dose-Resposta.
O JSON deve conter EXATAMENTE estes campos:
- patient: { name, age, weight, diagnosis }
- scenario: descrição clínica
- initialEC50: número (EC50 inicial, ex: 50)
- initialEmax: número (Emax inicial %, ex: 100)
- expectedEC50: [min, max] EC50 esperado (ex: [40, 60])
- expectedEmax: [min, max] Emax esperado (ex: [90, 110])
- clinicalTip: dica clínica
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  "transducao-sinal": `Gere um caso para o Simulador de Transdução de Sinal.
O JSON deve conter EXATAMENTE estes campos:
- patient: { name, age, sex, clinicalContext }
- scenario: descrição clínica
- targetReceptor: string (tipo de receptor, ex: "gpcr-gs", "gpcr-gq", "rtk", "canal-ionico")
- expectedBlockStep: número (-1 se nenhum bloqueio, ou índice da etapa bloqueada)
- clinicalTip: dica clínica
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  "janela-terapeutica-farma": `Gere um caso para o Simulador de Janela Terapêutica.
O JSON deve conter EXATAMENTE estes campos:
- patient: { name, age, sex, clinicalContext }
- scenario: descrição clínica
- drugName: nome do fármaco (ex: "Lítio", "Digoxina", "Fenitoína")
- de50: número (DE50, ex: 30)
- dl50: número (DL50, ex: 65)
- expectedDose: [min, max] dose segura esperada (ex: [20, 40])
- clinicalTip: dica clínica
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  "vias-administracao": `Gere um caso para o Simulador de Vias de Administração.
O JSON deve conter EXATAMENTE estes campos:
- patient: { name, age, sex, clinicalContext }
- scenario: descrição clínica
- expectedRoute: string (via ótima, ex: "oral", "iv", "im", "sc", "sl")
- clinicalTip: dica clínica
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  "bloqueio-neuromuscular": `Gere um caso para o Simulador de Bloqueio Neuromuscular.
O JSON deve conter EXATAMENTE estes campos:
- patient: { name, age, sex, clinicalContext }
- scenario: descrição clínica
- expectedAgent: string (tipo de agente, ex: "despolarizante", "nao-despolarizante")
- expectedReversal: string (agente reversor, ex: "nenhum", "neostigmina", "sugammadex")
- clinicalTip: dica clínica
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  "farmaco-autonomica": `Gere um caso para o Simulador de Farmacologia Autonômica.
O JSON deve conter EXATAMENTE estes campos:
- patient: { name, age, sex, clinicalContext }
- scenario: descrição clínica
- expectedDrug: string (fármaco esperado, ex: "atropina", "propranolol", "fenilefrina", "salbutamol")
- clinicalTip: dica clínica
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  "tolerancia-dependencia": `Gere um caso para o Simulador de Tolerância e Dependência.
O JSON deve conter EXATAMENTE estes campos:
- patient: { name, age, sex, clinicalContext }
- scenario: descrição clínica
- drugClass: string (classe do fármaco, ex: "opioide", "benzodiazepínico", "álcool", "anfetamina")
- expectedWeeks: [min, max] semanas para tolerância (ex: [4, 12])
- clinicalTip: dica clínica
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  farmacogenomica: `Gere um caso para o Simulador de Farmacogenômica.
O JSON deve conter EXATAMENTE estes campos:
- patient: { name, age, sex, clinicalContext }
- scenario: descrição clínica
- drugType: "pro-farmaco" | "farmaco-ativo" (tipo de fármaco)
- enzyme: string (enzima CYP, ex: "CYP2D6", "CYP2C19", "CYP3A4")
- expectedPhenotype: "lento" | "intermediario" | "extensivo" | "ultra-rapido"
- expectedDoseAdjust: [min, max] ajuste de dose (% do normal, ex: [80, 120])
- clinicalTip: dica clínica
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  // ===================== FARMACOTÉCNICA =====================
  estabilidade: `Gere um caso para o Simulador de Estabilidade de Fármacos.
O JSON deve conter EXATAMENTE estes campos:
- patient: { name, age, sex, clinicalContext }
- scenario: descrição do cenário farmacotécnico
- initialConcentration: número (concentração inicial, ex: 100)
- initialTemp: número (temperatura em °C, ex: 25)
- initialOrder: "zero" | "first" | "second" (ordem da reação de degradação)
- expectedT90Range: [min, max] t90 esperado em meses (ex: [5, 15])
- clinicalTip: dica farmacotécnica
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  "liberacao-farmacos": `Gere um caso para o Simulador de Liberação de Fármacos.
O JSON deve conter EXATAMENTE estes campos:
- patient: { name, age, sex, clinicalContext }
- scenario: descrição do cenário
- initialCoating: número 0-100 (espessura do revestimento, ex: 50)
- initialParticleSize: número 0-100 (tamanho de partícula, ex: 50)
- expectedT80Range: [min, max] tempo para 80% de liberação em horas (ex: [4, 12])
- clinicalTip: dica farmacotécnica
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  diluicao: `Gere um caso para o Simulador de Diluição Farmacêutica.
O JSON deve conter EXATAMENTE estes campos:
- patient: { name, age, sex, clinicalContext }
- scenario: descrição do cenário
- initialC1: número (concentração inicial em mg/mL, ex: 1)
- initialV1: número (volume inicial em mL, ex: 1)
- expectedC2Range: [min, max] concentração final esperada (ex: [0.05, 0.15])
- clinicalTip: dica farmacotécnica
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  reologia: `Gere um caso para o Simulador de Reologia Farmacêutica.
O JSON deve conter EXATAMENTE estes campos:
- patient: { name, age, sex, clinicalContext }
- scenario: descrição do cenário
- initialBehavior: "newtonian" | "pseudoplastic" | "dilatant" | "bingham" (comportamento reológico)
- initialViscosity: número 0-100 (viscosidade, ex: 70)
- clinicalTip: dica farmacotécnica
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  "hlb-emulsoes": `Gere um caso para o Simulador de HLB e Emulsões.
O JSON deve conter EXATAMENTE estes campos:
- patient: { name, age, sex, clinicalContext }
- scenario: descrição do cenário
- expectedHLBRange: [min, max] HLB requerido (ex: [9, 12])
- clinicalTip: dica farmacotécnica
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  granulometria: `Gere um caso para o Simulador de Granulometria.
O JSON deve conter EXATAMENTE estes campos:
- patient: { name, age, sex, clinicalContext }
- scenario: descrição do cenário
- initialMean: número (diâmetro médio em µm, ex: 150)
- initialSpread: número 0-100 (dispersão granulométrica, ex: 30)
- expectedD50Range: [min, max] D50 esperado em µm (ex: [100, 200])
- clinicalTip: dica farmacotécnica
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  compressao: `Gere um caso para o Simulador de Compressão de Comprimidos.
O JSON deve conter EXATAMENTE estes campos:
- patient: { name, age, sex, clinicalContext }
- scenario: descrição do cenário
- initialForce: número 0-100 (força de compressão, ex: 50)
- initialGranuleSize: número 0-100 (tamanho do grânulo, ex: 50)
- initialLubricant: número 0-100 (concentração de lubrificante, ex: 20)
- expectedHardnessRange: [min, max] dureza esperada em kP (ex: [6, 10])
- clinicalTip: dica farmacotécnica
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  "tampao-farmaceutico": `Gere um caso para o Simulador de Tampão Farmacêutico.
O JSON deve conter EXATAMENTE estes campos:
- patient: { name, age, sex, clinicalContext }
- scenario: descrição do cenário
- initialBuffer: string (nome do tampão, ex: "Fosfato", "Acetato", "Citrato")
- targetpH: número (pH alvo, ex: 7.0)
- expectedpHRange: [min, max] pH esperado (ex: [6.5, 7.5])
- clinicalTip: dica farmacotécnica
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  // ===================== QUÍMICA FARMACÊUTICA =====================
  "sar-explorer": `Gere um caso para o Simulador de Relação Estrutura-Atividade (SAR).
O JSON deve conter EXATAMENTE estes campos:
- patient: { name, scaffold, drugClass } (scaffold deve ser "benzodiazepine", "sulfonamide" ou "fluoroquinolone")
- scenario: descrição do projeto SAR
- initialHalogen: número 0-100 (substituinte halogênio %, ex: 50)
- initialOH: número 0-100 (substituinte hidroxila %, ex: 20)
- initialCH3: número 0-100 (substituinte metila %, ex: 30)
- initialCF3: número 0-100 (substituinte trifluorometila %, ex: 10)
- expectedPotencyRange: [min, max] potência esperada (ex: [60, 90])
- clinicalTip: dica sobre a relação estrutura-atividade
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  lipinski: `Gere um caso para o Simulador de Regra de Lipinski.
O JSON deve conter EXATAMENTE estes campos:
- patient: { name, age, sex, clinicalContext }
- scenario: descrição do cenário de design de fármacos
- initialMW: número (peso molecular, ex: 350)
- initialLogP: número (LogP, ex: 2.5)
- initialHBD: número (doadores de ligação H, ex: 2)
- initialHBA: número (aceitadores de ligação H, ex: 5)
- expectedViolations: número (violações Lipinski esperadas, ex: 0)
- clinicalTip: dica sobre druglikeness
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  bioisosterismo: `Gere um caso para o Simulador de Bioisosterismo.
O JSON deve conter EXATAMENTE estes campos:
- patient: { name, age, sex, clinicalContext }
- scenario: descrição do cenário
- initialGroup: string (grupo funcional original, ex: "cooh", "ester", "amide", "oh", "halogen")
- initialBioisostere: string (bioisóstero sugerido, ex: "tetrazole", "oxadiazole", "sulfonamide", "hydroxamic")
- bestBioisostere: string (melhor bioisóstero para o caso)
- clinicalTip: dica sobre bioisosterismo
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  "metabolismo-farmacos": `Gere um caso para o Simulador de Metabolismo de Fármacos.
O JSON deve conter EXATAMENTE estes campos:
- patient: { name, age, sex, clinicalContext }
- scenario: descrição clínica
- initialProdrug: string (pró-fármaco, ex: "enalapril", "clopidogrel", "codeina", "valaciclovir")
- initialCypActivity: número 0-200 (atividade CYP %, ex: 100)
- expectedActiveRange: [min, max] nível do metabólito ativo esperado (ex: [30, 70])
- clinicalTip: dica clínica
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  "docking-simplificado": `Gere um caso para o Simulador de Docking Simplificado.
O JSON deve conter EXATAMENTE estes campos:
- patient: { name, age, sex, clinicalContext }
- scenario: descrição do cenário de docking
- initialTarget: string (alvo molecular, ex: "cox2", "ace", "hmgcoa", "opioide")
- initialDistance: número (distância ligando-sítio em Å, ex: 3.5)
- expectedDeltaGRange: [min, max] energia de ligação esperada em kcal/mol (ex: [-12, -8])
- clinicalTip: dica sobre docking molecular
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  quiralidade: `Gere um caso para o Simulador de Quiralidade.
O JSON deve conter EXATAMENTE estes campos:
- patient: { name, age, sex, clinicalContext }
- scenario: descrição clínica
- initialDrug: string (fármaco quiral, ex: "omeprazol", "ibuprofeno", "cetirizina", "talidomida")
- initialEnantiomericExcess: número 0-100 (excesso enantiomérico %, ex: 100)
- expectedAnswer: "eutomer" | "distomer" | "racemato" (resposta esperada)
- clinicalTip: dica sobre quiralidade
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  "pka-absorcao": `Gere um caso para o Simulador de pKa e Absorção.
O JSON deve conter EXATAMENTE estes campos:
- patient: { name, age, sex, clinicalContext }
- scenario: descrição clínica
- initialPka: número (pKa do fármaco, ex: 3.5)
- initialType: "weak_acid" | "weak_base" (tipo do fármaco)
- initialPH: número (pH do compartimento, ex: 1.5)
- expectedAbsorptionSite: string (local de absorção esperado, ex: "estomago", "intestino")
- clinicalTip: dica sobre ionização e absorção
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  "qsar-simplificado": `Gere um caso para o Simulador de QSAR (Hansch).
O JSON deve conter EXATAMENTE estes campos:
- patient: { name, age, sex, clinicalContext }
- scenario: descrição do cenário QSAR
- initialSeries: string (série congênere, ex: "sulfonamides", "barbiturates", "phenols", "benzoics")
- initialLogP: número (LogP inicial, ex: 1.0)
- initialSigma: número (constante de Hammett σ, ex: 0)
- expectedOptimalLogPRange: [min, max] LogP ótimo (ex: [0.7, 1.2])
- clinicalTip: dica sobre QSAR
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  // ===================== CLÍNICOS ESPECIALIZADOS =====================
  "metodo-soap": `Gere um caso clínico COMPLETO para o Simulador do Método SOAP (prontuário farmacêutico).
O caso deve conter:
- scenario: breve descrição do cenário clínico (1-2 frases)
- patient: { name, age, weight, height, sex, diseases (array), allergies (array), vitalSigns: { bp, hr, temp, spo2 } }
- prescription: array de { drug, dose, route, frequency }
- labs: objeto com exames laboratoriais relevantes (ex: { creatinina: "1.2 mg/dL", glicemia: "180 mg/dL" })
- mainComplaint: queixa principal do paciente
- expectedSOAP: {
    subjetivo: array de strings (palavras-chave esperadas na seção Subjetivo, ex: ["queixa de dor", "há 3 dias", "uso crônico de AINE"]),
    objetivo: array de strings (palavras-chave esperadas na seção Objetivo, ex: ["PA 150/90", "creatinina 1.2", "glicemia 180"]),
    avaliacao: array de strings (palavras-chave esperadas na seção Avaliação, ex: ["PRM de segurança", "nefrotoxicidade por AINE", "HAS não controlada"]),
    plano: array de strings (palavras-chave esperadas na seção Plano, ex: ["suspender AINE", "monitorar função renal", "orientar paciente"])
  }
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo

Inclua pelo menos 2 PRMs identificáveis. Use cenários realistas de farmácia clínica.`,

  mai: `Gere um caso clínico COMPLETO para o Simulador MAI (Medication Appropriateness Index).
O caso deve conter:
- scenario: breve descrição do cenário clínico (1-2 frases)
- patient: { name, age, weight, sex, diseases (array), allergies (array) }
- medications: array de objetos, cada um com:
  - drug: nome do medicamento
  - dose: dose prescrita
  - route: via de administração
  - frequency: frequência
  - indication: indicação clínica
  - expectedMAI: objeto com os 10 critérios do MAI, cada um com:
    - score: "A" (Apropriado) | "B" (Marginalmente apropriado) | "C" (Inapropriado)
    - justification: justificativa clínica
  Os 10 critérios são: indication, effectiveness, dose, directions, practicality, drugInteractions, diseaseInteractions, duplication, duration, costBenefit
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo

Inclua 3-5 medicamentos. Pelo menos 1 deve ter problemas significativos (scores "C"). Use polifarmácia realista em idosos.`,

  "cascata-prescricao": `Gere um caso clínico COMPLETO para o Simulador de Cascata de Prescrição.
O caso deve conter:
- scenario: breve descrição do cenário clínico (1-2 frases)
- patient: { name, age, sex, diseases (array), allergies (array) }
- medications: array CRONOLÓGICO de objetos, cada um com:
  - drug: nome do medicamento
  - dose: dose
  - startDate: data de início (formato "DD/MM/AAAA")
  - indication: motivo da prescrição
  - isCascade: boolean (true se é cascata de prescrição)
  - causedBy: string | null (nome do medicamento causador, se isCascade=true)
  - adverseEffect: string | null (efeito adverso que motivou a prescrição, se isCascade=true)
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo

Crie cadeias realistas de 5-8 medicamentos. Pelo menos 2 devem ser cascatas identificáveis. Exemplo: AINE→edema→furosemida→hipocalemia→KCl. Varie entre idosos polimedicados.`,

  // ===================== ODONTOLOGIA =====================
  odontograma: `Gere um caso clínico para o Simulador de Odontograma Interativo. O caso deve conter: title, difficulty, patient (name, age, sex), teeth (array de {number, findings: array de {type, icdas, description}}), idealTreatments (array de {tooth, treatment, justification}). Inclua 3-6 dentes com achados variados (cáries ICDAS 1-6, restaurações infiltradas, lesões endodônticas). Varie entre pacientes pediátricos e adultos.`,

  "anatomia-endodontia": `Gere um caso clínico para o Simulador de Anatomia Dental (Endodontia). O caso deve conter: title, difficulty, patient (name, age), tooth (number, type, canals: array de {name, curvature, length}), diagnosis (pulpite reversível/irreversível/necrose), idealTherapy (pulpotomia/pulpectomia/necropulpectomia), prognosis, clinicalConsequences. Varie entre dentes anteriores e posteriores com anatomias complexas.`,

  periodontograma: `Gere um caso clínico para o Simulador de Periodontograma. O caso deve conter: title, difficulty, patient (name, age, smoker: boolean, diabetic: boolean), depths (array de 6 números para sítios MV,V,DV,ML,L,DL), bop (array de 6 booleans), boneLoss (percentual), idealStage (I-IV), idealGrade (A-C), idealTreatments (array: rasp, antibio, cirurgia, regeneracao), consequence ({correct, wrong}). Use classificação AAP/EFP 2018.`,

  "anestesiologia-odonto": `Gere um caso clínico para o Simulador de Anestesiologia Odontológica. O caso deve conter: title, difficulty, patient (name, age, weight, comorbidities), procedure (description, region, nerve), idealTechnique, idealAnesthetic, maxDoseMgKg, complication ({title, desc, correctConduct}). Varie entre bloqueios e infiltrativas, pacientes cardiopatas e saudáveis.`,

  cefalometria: `Gere um caso clínico para o Simulador de Cefalometria. O caso deve conter: title, difficulty, patient (name, age, sex), classe (I/II/III), profile, sna, snb, anb, points ({S,N,A,B,Gn,Go} com x,y), idealClassification, idealTreatment (fixo/alinhadores/ortognatica/expansor), consequence ({correct, wrong}). Varie ANB entre -6 e +10.`,

  "radiografia-odonto": `Gere um caso clínico para o Simulador de Radiografia Odontológica. O caso deve conter: title, difficulty, exam (periapical/panoramica/interproximal), structures (array de nomes), pathologies (array de {name, type: radiolúcida/radiopaca/mista, classification, distractors: array}), idealDiagnosis, consequence ({correct, wrong}). Inclua diagnósticos diferenciais realistas.`,

  "farmacologia-odonto": `Gere um caso clínico para o Simulador de Farmacologia Odontológica. O caso deve conter: title, difficulty, patient (name, age, weight, profile, comorbidities, contraindications), procedure, idealAnalgesic, idealAINE, idealAntibiotic, risks ({renal, hepatic, cardiovascular, gastric}), scenario72h (texto descritivo do cenário adverso se prescrição inadequada). Varie entre nefropatas, cardiopatas, gestantes.`,

  "cirurgia-exodontia": `Gere um caso clínico para o Simulador de Cirurgia e Exodontia. O caso deve conter: title, difficulty, position (Mesioangular/Vertical/Horizontal/Distoangular), winter, pellGregory ({class: I-III, pos: A-C}), needsOsteotomy, needsOdontosection, complication ({title, desc, options: array de {label, correct}}), idealPreOp, idealPostOp (arrays de medicamentos), consequence ({correct, wrong}).`,

  // ===================== FISIOTERAPIA =====================
  goniometria: `Gere um caso clínico para o Simulador de Goniometria Articular. O caso deve conter: title, difficulty, patient (name, age, diagnosis), joint, movements (array de {name, measured, normal, deficit}), idealClassifications (array de {movement, classification: leve/moderado/grave}), idealTechniques (array), consequence ({correct, wrong}). Varie entre ombro, joelho, tornozelo, quadril.`,

  "avaliacao-postural": `Gere um caso clínico para o Simulador de Avaliação Postural. O caso deve conter: title, difficulty, patient (name, age, complaint), correctLandmarks (array de 8 pontos), distractorLandmarks (array de 4 pontos), deviations (array de {name, description}), primaryDeviation, diagnosisOptions (array com 1 correta + 3 distratores), idealProgram (array de exercícios), consequence ({correct, wrong}).`,

  "forca-muscular": `Gere um caso clínico para o Simulador de Força Muscular Oxford/MRC. O caso deve conter: title, difficulty, patient (name, age, diagnosis), muscles (array de {name, grade: 0-5, nerve}), pattern (hemiparesia/tetraparesia/radicular/miopatia), lesionLevel, idealProgram (array de exercícios), consequence ({correct, wrong}). Varie entre AVE, lesão medular, neuropatia.`,

  dermatomos: `Gere um caso clínico para o Simulador de Dermátomos. O caso deve conter: title, difficulty, patient (name, age, complaint), dermatomes (array de {level, sensitivity: normal/diminuída/ausente/aumentada}), lesionLevel, pattern (central/periférico), asiaClassification (A-E ou null), diagnosisOptions (array com 1 correta + distratores), consequence ({correct, wrong}).`,

  respiratorio: `Gere um caso clínico para o Simulador de Fisioterapia Respiratória. O caso deve conter: title, difficulty, patient (name, age, diagnosis, gasometry: {pH, pCO2, pO2, HCO3, SaO2}), auscultation (array de {region, sound}), idealTechniques (array), reevaluation ({improved: boolean, newFindings}), idealNextConduct (manter/trocar/vni/intubacao), consequence ({correct, wrong}).`,

  eletroterapia: `Gere um caso clínico para o Simulador de Eletroterapia. O caso deve conter: title, difficulty, patient (name, age, diagnosis, indication), idealModality, idealParameters ({frequency, intensity, time, modulation}), idealElectrodePlacement, contraindications (array), consequence ({correct, wrong}). Varie entre TENS, FES, corrente russa, interferencial.`,

  "testes-ortopedicos": `Gere um caso clínico para o Simulador de Testes Ortopédicos. O caso deve conter: title, difficulty, patient (name, age, complaint, mechanism), availableTests (array de {name, result: positivo/negativo, interpretation}), correctDiagnosis, diagnosisOptions (array com 1 correta + 3-4 distratores), idealRehab (array), consequence ({correct, wrong}). Varie entre ombro, joelho, tornozelo, coluna.`,

  berg: `Gere um caso clínico para o Simulador de Escala de Berg. O caso deve conter: title, difficulty, patient (name, age, diagnosis, history), items (array de 14 objetos com {task, score: 0-4}), totalScore, riskLevel (alto/moderado/baixo), idealProgram (array de exercícios de prevenção de quedas), consequence ({correct, wrong}). Varie entre Parkinson, pós-AVE, fragilidade.`,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const { simulator_slug, tool_id } = await req.json();

    let prompt: string;

    if (tool_id) {
      // ─── USER-CREATED SIMULATOR: fetch tool and build prompt from its structure ───
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: tool, error: toolError } = await supabase
        .from("tools")
        .select("name, description, formula")
        .eq("id", tool_id)
        .single();

      if (toolError || !tool) {
        return new Response(JSON.stringify({ error: "Ferramenta não encontrada" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const formula = tool.formula as any;
      if (!formula || formula.type !== "simulator") {
        return new Response(JSON.stringify({ error: "Esta ferramenta não é um simulador" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const stepsDescription = (formula.steps || []).map((step: any, i: number) => {
        const panelsDesc = (step.panels || []).map((p: any) => {
          let desc = `  - Painel "${p.title}" (tipo: ${p.type})`;
          if (p.type === "checklist" || p.type === "radio") {
            desc += ` com ${(p.options || []).length} opções`;
          }
          return desc;
        }).join("\n");
        return `Step ${i + 1}: "${step.title}"\n${panelsDesc}`;
      }).join("\n\n");

      prompt = `Gere um caso clínico NOVO e DIFERENTE para o seguinte simulador:
Nome: ${tool.name}
Descrição: ${tool.description || ""}

ESTRUTURA DO SIMULADOR (mantenha EXATAMENTE esta estrutura de steps e panels):
${stepsDescription}

CASO EXEMPLO (use como referência de formato, mas crie conteúdo COMPLETAMENTE DIFERENTE):
${JSON.stringify(formula, null, 2)}

INSTRUÇÕES:
- Mantenha a MESMA estrutura de steps e panels (mesmos títulos, mesmos tipos)
- Mude COMPLETAMENTE: paciente diferente, cenário clínico diferente, opções diferentes (quando faz sentido clínico)
- Para painéis "checklist" e "radio": mantenha opções clinicamente relevantes para o novo cenário e atualize correctAnswers
- Para painéis "info": atualize o conteúdo com os dados do novo paciente
- Para painéis "text": atualize correctText para o novo cenário
- Para painéis "chart": atualize chartConfig.data com valores diferentes mas mantenha a mesma estrutura de series e axes
- Para painéis "numeric_keypad": mantenha keypadConfig mas atualize correctValue para o novo cenário
- Para painéis "indicator": atualize indicatorConfig.displayValues com novos valores
- Para painéis "calculation": mantenha calculationConfig.fields mas atualize correctValue
- Atualize o feedback de cada step para o novo cenário
- Mantenha patient_summary atualizado
- O caso deve ter title, difficulty, patient_summary e steps

Retorne APENAS o JSON puro com: title, difficulty, patient_summary, steps (mesma estrutura).`;

    } else if (simulator_slug && SIMULATOR_PROMPTS[simulator_slug]) {
      prompt = SIMULATOR_PROMPTS[simulator_slug];
    } else {
      return new Response(JSON.stringify({ error: `Simulador '${simulator_slug || tool_id}' não encontrado` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const difficulties = ["Fácil", "Médio", "Difícil"];
    const randomDifficulty = difficulties[Math.floor(Math.random() * difficulties.length)];
    const randomSeed = Math.floor(Math.random() * 100000);

    const { data } = await callAI({ userId, promptType: "case-generate",
      messages: [
        { role: "system", content: "Você é um especialista em farmácia clínica e medicina. Gere casos clínicos realistas e educacionais. CADA caso deve ser ÚNICO e DIFERENTE dos anteriores. Use nomes de pacientes brasileiros variados, idades diferentes, cenários clínicos distintos. Retorne APENAS um JSON válido, sem markdown, sem blocos de código." },
        { role: "user", content: `${prompt}\n\nIMPORTANTE: A dificuldade deste caso DEVE ser "${randomDifficulty}". Gere um caso COMPLETAMENTE DIFERENTE e ALEATÓRIO. Seed de aleatoriedade: ${randomSeed}.\n\nRETORNE APENAS O JSON PURO, sem \`\`\`json\`\`\` ou qualquer formatação.` },
      ],
      temperature: 1.2,
      model: "google/gemini-3-flash-preview",
    });
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("IA não retornou conteúdo");

    let jsonStr = content.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }

    const result = JSON.parse(jsonStr);
    const { title, difficulty, ...caseFields } = result;

    console.log("Generated case fields:", Object.keys(caseFields));

    return new Response(JSON.stringify({ 
      case: { 
        title: title || "Caso Clínico Gerado por IA", 
        difficulty: difficulty || "Médio", 
        case_data: caseFields 
      } 
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-case error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
