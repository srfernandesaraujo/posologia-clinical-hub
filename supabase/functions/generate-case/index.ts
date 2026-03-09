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
- patient: { name, age, weight, height, sex }
- history: { diseases (array), mainComplaint, allergies (array), creatinineClearance (number or null), vitalSigns: { bp, hr, temp, spo2 } }
- prescription: array de { drug, dose, route, frequency }
- answers: array de { drugIndex (0-based), hasPRM (boolean), type (string: "Seguranca"|"Efetividade"|"Indicacao"|"Adesao"|null), justification (string) }
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo do caso

Inclua pelo menos 2 PRMs reais baseados em evidências. Varie entre idosos, pediatria, gestantes, polimedicados e comorbidades. Use farmacologia realista.`,

  antimicrobianos: `Gere um caso clínico COMPLETO para o Simulador de Antimicrobial Stewardship.
O caso deve conter:
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

  // ===================== FISIOLOGIA HUMANA =====================
  sna: `Gere um caso clínico para o Simulador do Sistema Nervoso Autônomo.
O caso deve conter:
- patient: { name, age, sex, clinicalContext }
- scenario: descrição do cenário fisiológico (ex: estresse, exercício, digestão)
- sympatheticTone: valor inicial do tônus simpático (0-100)
- parasympatheticTone: valor inicial do tônus parassimpático (0-100)
- expectedEffects: { heartRate, bloodPressure, pupilDiameter, bronchialTone, giMotility, bladderTone }
- pharmacologicalChallenge: { drug, mechanism, expectedChanges }
- clinicalQuestions: array de { question, correctAnswer, explanation }
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  "eletrofisiologia-cardiaca": `Gere um caso para o Simulador de Eletrofisiologia Cardíaca.
O caso deve conter:
- patient: { name, age, sex, clinicalContext }
- scenario: descrição (ex: bradiarritmia, taquicardia, bloqueio AV)
- initialParams: { heartRate, prInterval, qrsDuration, qtInterval }
- ionChannelModifications: { sodiumConductance, potassiumConductance, calciumConductance } (% do normal)
- pharmacologicalChallenge: { drug, class, expectedECGChanges }
- clinicalQuestions: array de { question, correctAnswer, explanation }
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  "depuracao-renal": `Gere um caso para o Simulador de Depuração Renal.
O caso deve conter:
- patient: { name, age, weight, sex, serumCreatinine, clinicalContext }
- scenario: descrição (ex: IRA, DRC, nefrotoxicidade)
- initialGFR: taxa de filtração glomerular inicial (mL/min)
- tubularFunction: { reabsorption, secretion } (% do normal)
- pharmacologicalChallenge: { drug, renalElimination, doseAdjustment }
- clinicalQuestions: array de { question, correctAnswer, explanation }
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  "equilibrio-acido-base": `Gere um caso para o Simulador de Equilíbrio Ácido-Base.
O caso deve conter:
- patient: { name, age, sex, clinicalContext }
- scenario: descrição (ex: cetoacidose diabética, DPOC, intoxicação)
- initialABG: { pH, pCO2, HCO3, pO2, BE, AG }
- expectedDiagnosis: diagnóstico ácido-base (ex: "acidose metabólica com AG elevado")
- compensation: { type, expected, actual }
- clinicalQuestions: array de { question, correctAnswer, explanation }
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  "regulacao-glicemica": `Gere um caso para o Simulador de Regulação Glicêmica.
O caso deve conter:
- patient: { name, age, sex, clinicalContext }
- scenario: descrição (ex: DM1 pós-prandial, jejum prolongado, estresse)
- initialGlucose: glicemia inicial em mg/dL
- insulinSensitivity: sensibilidade à insulina (% do normal)
- betaCellFunction: função das células beta (% do normal)
- mealChallenge: { carbsGrams, glycemicIndex }
- expectedResponse: { peakGlucose, timeToBaseline, insulinCurve }
- clinicalQuestions: array de { question, correctAnswer, explanation }
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  "eixo-hpa": `Gere um caso para o Simulador do Eixo HPA.
O caso deve conter:
- patient: { name, age, sex, clinicalContext }
- scenario: descrição (ex: Cushing, Addison, uso crônico de corticoides)
- initialLevels: { crh, acth, cortisol }
- feedbackIntegrity: { hypothalamic, pituitary, adrenal } (% do normal)
- pharmacologicalChallenge: { drug, dose, expectedChanges }
- clinicalQuestions: array de { question, correctAnswer, explanation }
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  "cinetica-enzimatica": `Gere um caso para o Simulador de Cinética Enzimática.
O caso deve conter:
- patient: { name, age, sex, clinicalContext }
- scenario: descrição (ex: deficiência enzimática, inibição competitiva por fármaco)
- enzyme: { name, km, vmax, substrate }
- inhibitor: { name, type ("competitive"|"noncompetitive"|"uncompetitive"), ki }
- substrateConcentrations: array de números para plotar curva
- expectedResults: { apparentKm, apparentVmax }
- clinicalQuestions: array de { question, correctAnswer, explanation }
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  "secrecao-gastrica": `Gere um caso para o Simulador de Secreção Gástrica.
O caso deve conter:
- patient: { name, age, sex, clinicalContext }
- scenario: descrição (ex: DRGE, úlcera péptica, Zollinger-Ellison)
- initialSecretion: { basalAcid, stimulatedAcid, gastricPH }
- stimuli: { histamine, acetylcholine, gastrin } (% atividade)
- pharmacologicalChallenge: { drug, mechanism, expectedPHChange }
- clinicalQuestions: array de { question, correctAnswer, explanation }
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  "cascata-coagulacao": `Gere um caso para o Simulador da Cascata de Coagulação.
O caso deve conter:
- patient: { name, age, sex, clinicalContext }
- scenario: descrição (ex: hemofilia, CIVD, anticoagulação)
- initialFactors: objeto com fatores { I, II, V, VII, VIII, IX, X, XI, XII, XIII } (% atividade)
- expectedLabs: { PT, aPTT, INR, fibrinogen, dDimer }
- pharmacologicalChallenge: { drug, mechanism, affectedFactors }
- clinicalQuestions: array de { question, correctAnswer, explanation }
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  "compartimentos-adme": `Gere um caso para o Simulador de Modelos Farmacocinéticos (ADME).
O caso deve conter:
- patient: { name, age, weight, sex, clinicalContext }
- drug: { name, bioavailability, vd, clearance, halfLife, proteinBinding }
- administration: { route, dose, interval }
- expectedCurve: { cmax, tmax, auc, css }
- clinicalQuestions: array de { question, correctAnswer, explanation }
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  // ===================== BIOQUÍMICA =====================
  "cadeia-eletrons": `Gere um caso para o Simulador da Cadeia de Transporte de Elétrons.
O caso deve conter:
- patient: { name, age, sex, clinicalContext }
- scenario: descrição (ex: intoxicação por cianeto, deficiência de CoQ10, uso de metformina)
- complexActivities: { complexI, complexII, complexIII, complexIV, atpSynthase } (% atividade)
- expectedATP: produção esperada de ATP (% do normal)
- pharmacologicalChallenge: { substance, targetComplex, mechanism }
- clinicalQuestions: array de { question, correctAnswer, explanation }
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  "dissociacao-hemoglobina": `Gere um caso para o Simulador de Dissociação da Hemoglobina.
O caso deve conter:
- patient: { name, age, sex, clinicalContext }
- scenario: descrição (ex: anemia falciforme, intoxicação por CO, acidose)
- initialParams: { pH, temperature, pCO2, diphosphoglycerate }
- expectedP50: P50 esperado (mmHg)
- curveShift: "left" | "right" | "normal"
- clinicalQuestions: array de { question, correctAnswer, explanation }
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  "glicolise-gliconeogenese": `Gere um caso para o Simulador de Glicólise vs Gliconeogênese.
O caso deve conter:
- patient: { name, age, sex, clinicalContext }
- scenario: descrição (ex: jejum prolongado, exercício intenso, diabetes)
- metabolicState: "fed" | "fasting" | "exercise"
- enzymeActivities: { hexokinase, pfk1, pyruvateKinase, pepck, fbpase, g6pase } (% atividade)
- hormonalProfile: { insulin, glucagon, cortisol } (% do normal)
- clinicalQuestions: array de { question, correctAnswer, explanation }
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  "cinetica-avancada": `Gere um caso para o Simulador de Cinética Enzimática Avançada.
O caso deve conter:
- patient: { name, age, sex, clinicalContext }
- scenario: descrição (ex: inibição acompetitiva, substrato suicida)
- enzyme: { name, km, vmax }
- inhibitor: { name, type ("uncompetitive"|"mixed"|"suicide"), ki, alphaKi }
- expectedPlots: { lineweaver_slope, lineweaver_intercept }
- clinicalQuestions: array de { question, correctAnswer, explanation }
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  "ciclo-ureia": `Gere um caso para o Simulador do Ciclo da Ureia.
O caso deve conter:
- patient: { name, age, sex, clinicalContext }
- scenario: descrição (ex: deficiência de OTC, hiperamonemia neonatal)
- enzymeActivities: { cps1, otc, ass, asl, arginase } (% atividade)
- metaboliteLevels: { ammonia, citrulline, argininosuccinate, arginine, urea }
- clinicalQuestions: array de { question, correctAnswer, explanation }
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  "acido-araquidonico": `Gere um caso para o Simulador da Cascata do Ácido Araquidônico.
O caso deve conter:
- patient: { name, age, sex, clinicalContext }
- scenario: descrição (ex: asma, inflamação, uso de AINEs)
- enzymeActivities: { pla2, cox1, cox2, lox5, lox12 } (% atividade)
- expectedEicosanoids: { pge2, pgi2, txa2, ltb4, ltc4 } (% do normal)
- pharmacologicalChallenge: { drug, target, expectedEffect }
- clinicalQuestions: array de { question, correctAnswer, explanation }
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  lipoproteinas: `Gere um caso para o Simulador de Metabolismo de Lipoproteínas.
O caso deve conter:
- patient: { name, age, sex, clinicalContext }
- scenario: descrição (ex: hipercolesterolemia familiar, uso de estatinas)
- lipidProfile: { totalCholesterol, ldl, hdl, vldl, triglycerides }
- receptorActivity: { ldlReceptor, srb1, lpl } (% atividade)
- pharmacologicalChallenge: { drug, mechanism, expectedChanges }
- clinicalQuestions: array de { question, correctAnswer, explanation }
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  "pentoses-fosfato": `Gere um caso para o Simulador da Via das Pentoses Fosfato.
O caso deve conter:
- patient: { name, age, sex, clinicalContext }
- scenario: descrição (ex: deficiência de G6PD, anemia hemolítica por fármaco)
- g6pdActivity: atividade da G6PD (% do normal)
- oxidativeStress: nível de estresse oxidativo (0-100)
- nadphProduction: produção de NADPH (% do normal)
- clinicalQuestions: array de { question, correctAnswer, explanation }
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  "titulacao-aminoacidos": `Gere um caso para o Simulador de Titulação de Aminoácidos.
O caso deve conter:
- aminoacid: { name, pka1, pka2, pkaR (or null), pI, classification }
- scenario: descrição educativa
- titrationPoints: array de { pH, charge, dominantForm }
- clinicalRelevance: relevância clínica do aminoácido
- clinicalQuestions: array de { question, correctAnswer, explanation }
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  "operon-lac": `Gere um caso para o Simulador do Operon Lac.
O caso deve conter:
- scenario: descrição (ex: presença/ausência de lactose e glicose)
- conditions: { lactosePresent, glucosePresent, campLevels }
- geneExpression: { lacZ, lacY, lacA } (% expressão)
- regulatoryState: { repressorBound, capBound, rnaPolBound }
- clinicalQuestions: array de { question, correctAnswer, explanation }
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  // ===================== FARMACOLOGIA BÁSICA =====================
  "dose-resposta": `Gere um caso para o Simulador de Curva Dose-Resposta.
O caso deve conter:
- drug: { name, ec50, emax, hillCoefficient }
- antagonist: { name, type ("competitive"|"noncompetitive"|"irreversible"), kb, concentration }
- scenario: descrição clínica
- expectedShift: deslocamento esperado da curva
- clinicalQuestions: array de { question, correctAnswer, explanation }
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  "transducao-sinal": `Gere um caso para o Simulador de Transdução de Sinal.
O caso deve conter:
- receptor: { name, type ("GPCR"|"RTK"|"ion_channel"|"nuclear"), ligand }
- pathway: array de { step, molecule, activity } (% do normal)
- pharmacologicalChallenge: { drug, target, mechanism }
- expectedCellularResponse: descrição da resposta celular
- clinicalQuestions: array de { question, correctAnswer, explanation }
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  "janela-terapeutica-farma": `Gere um caso para o Simulador de Janela Terapêutica.
O caso deve conter:
- drug: { name, ed50, td50, therapeuticIndex, mec, mtc }
- patient: { name, age, sex, clinicalContext }
- doseRange: array de doses para simular
- expectedSafetyProfile: { safetyMargin, riskLevel }
- clinicalQuestions: array de { question, correctAnswer, explanation }
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  "vias-administracao": `Gere um caso para o Simulador de Vias de Administração.
O caso deve conter:
- drug: { name, molecularWeight, logP, pKa }
- routes: array de { route, bioavailability, tmax, cmax, onset, duration }
- patient: { name, age, sex, clinicalContext }
- optimalRoute: via ideal com justificativa
- clinicalQuestions: array de { question, correctAnswer, explanation }
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  "bloqueio-neuromuscular": `Gere um caso para o Simulador de Bloqueio Neuromuscular.
O caso deve conter:
- patient: { name, age, weight, sex, clinicalContext }
- drug: { name, type ("depolarizing"|"nondepolarizing"), ed95, onsetTime, duration }
- scenario: descrição (ex: intubação, cirurgia, reversão)
- tofRatio: valor inicial de TOF
- pharmacologicalChallenge: { reversal, drug, dose }
- clinicalQuestions: array de { question, correctAnswer, explanation }
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  "farmaco-autonomica": `Gere um caso para o Simulador de Farmacologia Autonômica.
O caso deve conter:
- patient: { name, age, sex, clinicalContext }
- scenario: descrição (ex: crise hipertensiva, bradicardia, broncoespasmo)
- drug: { name, class, receptorAffinity }
- autonomicEffects: { heartRate, bloodPressure, bronchialTone, pupilSize, giMotility }
- clinicalQuestions: array de { question, correctAnswer, explanation }
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  "tolerancia-dependencia": `Gere um caso para o Simulador de Tolerância e Dependência.
O caso deve conter:
- patient: { name, age, sex, clinicalContext }
- drug: { name, class, halfLife }
- exposureProfile: { durationWeeks, doseEscalation }
- toleranceMechanisms: { receptorDownregulation, metabolicTolerance, learningTolerance } (% contribuição)
- withdrawalSymptoms: array de { symptom, severity, onset }
- clinicalQuestions: array de { question, correctAnswer, explanation }
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  farmacogenomica: `Gere um caso para o Simulador de Farmacogenômica.
O caso deve conter:
- patient: { name, age, sex, ethnicity, clinicalContext }
- drug: { name, metabolizingEnzyme, pathway }
- genotype: { gene, variant, phenotype ("poor"|"intermediate"|"normal"|"ultrarapid") }
- expectedPK: { clearance, halfLife, auc } (% do metabolizador normal)
- doseAdjustment: recomendação de ajuste de dose
- clinicalQuestions: array de { question, correctAnswer, explanation }
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  // ===================== FARMACOTÉCNICA =====================
  estabilidade: `Gere um caso para o Simulador de Estabilidade de Fármacos.
O caso deve conter:
- drug: { name, degradationOrder (0|1|2), activationEnergy, shelfLife25C }
- conditions: { temperature, pH, humidity, lightExposure }
- stabilityData: array de { timeMonths, potencyPercent }
- expectedShelfLife: prazo de validade esperado (meses)
- clinicalQuestions: array de { question, correctAnswer, explanation }
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  "liberacao-farmacos": `Gere um caso para o Simulador de Liberação de Fármacos.
O caso deve conter:
- formulation: { name, type ("immediate"|"sustained"|"enteric"|"matrix"), drug }
- releaseModel: "zero_order" | "first_order" | "higuchi" | "korsmeyer_peppas"
- releaseParams: { k, n (para Korsmeyer-Peppas), t50 }
- dissolutionData: array de { timeHours, percentReleased }
- clinicalQuestions: array de { question, correctAnswer, explanation }
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  diluicao: `Gere um caso para o Simulador de Diluição Farmacêutica.
O caso deve conter:
- preparation: { name, initialConcentration, initialVolume, unit }
- targetConcentration: concentração desejada
- targetVolume: volume final desejado
- diluentOptions: array de { name, compatible (boolean) }
- expectedCalculation: { diluentVolume, finalConcentration }
- clinicalQuestions: array de { question, correctAnswer, explanation }
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  reologia: `Gere um caso para o Simulador de Reologia Farmacêutica.
O caso deve conter:
- formulation: { name, type ("cream"|"gel"|"suspension"|"solution") }
- flowBehavior: "newtonian" | "pseudoplastic" | "dilatant" | "plastic"
- rheologyParams: { viscosity, yieldStress, powerLawIndex }
- shearRateData: array de { shearRate, shearStress, apparentViscosity }
- clinicalQuestions: array de { question, correctAnswer, explanation }
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  "hlb-emulsoes": `Gere um caso para o Simulador de HLB e Emulsões.
O caso deve conter:
- formulation: { name, oilPhase, waterPhase, targetType ("O/W"|"W/O") }
- surfactants: array de { name, hlb, concentration }
- requiredHLB: HLB requerido para a fase oleosa
- calculatedHLB: HLB da mistura de tensoativos
- emulsionStability: { stable (boolean), reason }
- clinicalQuestions: array de { question, correctAnswer, explanation }
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  granulometria: `Gere um caso para o Simulador de Granulometria.
O caso deve conter:
- powder: { name, application }
- sieveData: array de { meshSize, apertureMm, retainedPercent, cumulativePercent }
- expectedParams: { d10, d50, d90, span, uniformityIndex }
- flowProperties: { angleOfRepose, carrIndex, hausnerRatio, flowability }
- clinicalQuestions: array de { question, correctAnswer, explanation }
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  compressao: `Gere um caso para o Simulador de Compressão de Comprimidos.
O caso deve conter:
- tablet: { name, drug, targetWeight, targetHardness }
- compressionParams: { force, speed, punchDiameter }
- heckelData: array de { pressure, porosity, lnPorosity }
- expectedResults: { hardness, friability, disintegrationTime, weightVariation }
- clinicalQuestions: array de { question, correctAnswer, explanation }
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  "tampao-farmaceutico": `Gere um caso para o Simulador de Tampão Farmacêutico.
O caso deve conter:
- buffer: { name, acidComponent, baseComponent, pKa }
- targetPH: pH desejado
- targetConcentration: concentração total do tampão (M)
- expectedRatio: razão [A-]/[HA] (Henderson-Hasselbalch)
- bufferCapacity: capacidade tampão (mol/L/pH)
- clinicalQuestions: array de { question, correctAnswer, explanation }
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo`,

  // ===================== QUÍMICA FARMACÊUTICA =====================
  "sar-explorer": `Gere um caso para o Simulador de Relação Estrutura-Atividade (SAR).
O caso deve conter:
- scaffold: { name, baseStructure, therapeuticClass }
- positions: array de { position, currentSubstituent }
- substituents: array de { name, effects: { potency, logP, solubility, selectivity } }
- optimalCombination: { substituents, expectedPotency, rationale }
- clinicalQuestions: array de { question, correctAnswer, explanation }
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo

Use scaffolds reais: benzodiazepínicos, sulfonamidas, fluoroquinolonas, barbitúricos.`,

  lipinski: `Gere um caso para o Simulador de Regra de Lipinski e Druglikeness.
O caso deve conter:
- drugs: array de { name, mw, logP, hbd, hba, psa, rotatableBonds, isDruglike }
- scenario: descrição do cenário de design de fármacos
- comparisonTask: { drugA, drugB, preferredDrug, rationale }
- rules: { lipinski, veber, ghose } resultados para cada fármaco
- clinicalQuestions: array de { question, correctAnswer, explanation }
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo

Use fármacos reais e compare druglikeness.`,

  bioisosterismo: `Gere um caso para o Simulador de Bioisosterismo.
O caso deve conter:
- originalGroup: { name, structure, pKa, logP, metabolicStability }
- bioisosteres: array de { name, type ("classical"|"nonclassical"), pKa, logP, metabolicStability, rationale }
- realWorldExample: { originalDrug, modifiedDrug, groupChanged, clinicalOutcome }
- optimalBioisostere: { name, rationale }
- clinicalQuestions: array de { question, correctAnswer, explanation }
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo

Use exemplos reais: celecoxibe/rofecoxibe, losartan/valsartan.`,

  "metabolismo-farmacos": `Gere um caso para o Simulador de Metabolismo de Fármacos e Pró-Fármacos.
O caso deve conter:
- drug: { name, type ("drug"|"prodrug"), activeForm }
- metabolicPathway: { phase1: array de { reaction, enzyme, metabolite }, phase2: array de { reaction, enzyme, conjugate } }
- cypActivity: { cyp3a4, cyp2d6, cyp2c19, cyp1a2 } (% atividade)
- kineticParams: { activationRate, inactivationRate, halfLifeActive }
- clinicalQuestions: array de { question, correctAnswer, explanation }
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo

Use pró-fármacos reais: enalapril, clopidogrel, codeína, valaciclovir.`,

  "docking-simplificado": `Gere um caso para o Simulador de Docking Simplificado.
O caso deve conter:
- target: { name, type ("enzyme"|"receptor"|"channel"), bindingSiteResidues }
- ligand: { name, functionalGroups }
- interactions: array de { type ("hydrogen"|"ionic"|"hydrophobic"|"pi_pi"|"vanderwaals"), residue, strength }
- bindingEnergy: deltaG em kcal/mol
- optimalDistance: distância ótima em Angstroms
- clinicalQuestions: array de { question, correctAnswer, explanation }
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo

Use alvos reais: COX-2, ACE, HMG-CoA redutase, receptores opioides.`,

  quiralidade: `Gere um caso para o Simulador de Quiralidade e Estereoquímica Farmacológica.
O caso deve conter:
- drug: { name, racemate, rEnantiomer, sEnantiomer }
- comparison: { rPotency, sPotency, rToxicity, sToxicity, rMetabolism, sMetabolism }
- eudismicRatio: razão eudísmica
- chiralSwitch: { exists (boolean), pureEnantiomer, clinicalAdvantage }
- clinicalQuestions: array de { question, correctAnswer, explanation }
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo

Use exemplos reais: omeprazol/esomeprazol, ibuprofeno R/S, talidomida, cetirizina/levocetirizina.`,

  "pka-absorcao": `Gere um caso para o Simulador de pKa, Ionização e Absorção.
O caso deve conter:
- drug: { name, type ("weak_acid"|"weak_base"|"amphoteric"), pKa, pKa2 (or null), logP }
- compartments: array de { name, pH, fractionUnionized, absorptionPotential }
- hendersonHasselbalch: { equation, calculation }
- ionTrapping: { compartment, mechanism, clinicalRelevance }
- clinicalQuestions: array de { question, correctAnswer, explanation }
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo

Use fármacos reais: aspirina, diazepam, anfetamina, metformina.`,

  "qsar-simplificado": `Gere um caso para o Simulador de QSAR (Hansch).
O caso deve conter:
- series: { name, scaffold, therapeuticTarget }
- congeners: array de { name, logP, sigmaHammett, esTaft, mr, logInvC }
- hanschEquation: { coefficients: { a, b, c, d }, r2, logPOptimal }
- optimalCompound: { name, predictedActivity, rationale }
- clinicalQuestions: array de { question, correctAnswer, explanation }
- difficulty: "Fácil"|"Médio"|"Difícil"
- title: título descritivo

Use séries congêneres reais: sulfonamidas, barbitúricos, fenóis, ácidos benzoicos.`,
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
