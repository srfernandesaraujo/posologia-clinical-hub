import { useState, useCallback, useEffect } from "react";
import { Stethoscope, Users, BookOpen, PhoneCall, Award, XCircle, ChevronRight, Sparkles, Zap, Shield, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import GameNarrative from "./GameNarrative";
import GameDifficultySelector, { GameDifficulty } from "./GameDifficultySelector";
import GameStarsResult from "./GameStarsResult";
import GameFeedbackOverlay from "./GameFeedbackOverlay";

interface Question {
  id: number;
  levelName: string;
  question: string;
  options: string[];
  correctIndex: number;
  hint: string;
  audienceVotes: number[];
  explanation?: string;
  reference?: string;
}

interface GameContext {
  id: string;
  label: string;
  icon: string;
  questions: Question[];
}

const defaultContexts: GameContext[] = [
  {
    id: "diabetes",
    label: "Tratamento do Diabetes",
    icon: "🩸",
    questions: [
      { id: 1, levelName: "Interno", question: "Qual medicamento é considerado primeira linha no tratamento do DM2?", options: ["Glibenclamida", "Metformina", "Insulina NPH", "Sitagliptina"], correctIndex: 1, hint: "É uma biguanida que reduz a produção hepática de glicose.", audienceVotes: [10, 70, 12, 8], explanation: "A Metformina é primeira linha por reduzir produção hepática de glicose, ter perfil de segurança favorável, não causar hipoglicemia e promover neutralidade/perda de peso.", reference: "ADA Standards of Care 2024" },
      { id: 2, levelName: "Interno", question: "Qual é o principal efeito adverso da Metformina?", options: ["Hipoglicemia severa", "Ganho de peso", "Desconforto gastrointestinal", "Retenção hídrica"], correctIndex: 2, hint: "Náuseas e diarreia são comuns no início do tratamento.", audienceVotes: [12, 8, 68, 12], explanation: "Desconforto GI (náuseas, diarreia) ocorre em 20-30% dos pacientes. Titulação gradual e formulação XR reduzem esse efeito.", reference: "Brunton LL. Goodman & Gilman, 13ª ed." },
      { id: 3, levelName: "Interno", question: "A Hemoglobina Glicada (HbA1c) reflete o controle glicêmico dos últimos:", options: ["7 dias", "30 dias", "2-3 meses", "6 meses"], correctIndex: 2, hint: "Está relacionada ao tempo de vida das hemácias.", audienceVotes: [5, 15, 72, 8], explanation: "HbA1c reflete a glicação não-enzimática da hemoglobina durante a vida média das hemácias (~120 dias), representando os últimos 2-3 meses." },
      { id: 4, levelName: "Residente Júnior", question: "Qual classe de antidiabéticos orais atua inibindo a enzima DPP-4?", options: ["Sulfonilureias", "Glitazonas", "Gliptinas", "Gliflozinas"], correctIndex: 2, hint: "Aumentam os níveis de incretinas endógenas (GLP-1 e GIP).", audienceVotes: [10, 8, 70, 12], explanation: "Gliptinas (Sitagliptina, Vildagliptina) inibem DPP-4, prolongando a ação de incretinas endógenas. Efeito modesto na HbA1c (~0.6-0.8%)." },
      { id: 5, levelName: "Residente Júnior", question: "Qual insulina tem perfil de ação ultrarrápida?", options: ["NPH", "Glargina", "Lispro", "Detemir"], correctIndex: 2, hint: "É um análogo com inversão de aminoácidos na cadeia B.", audienceVotes: [8, 10, 68, 14], explanation: "Insulina Lispro tem inversão Lis-Pro na cadeia B, reduzindo agregação e acelerando absorção. Início em 5-15min, pico 1h." },
      { id: 6, levelName: "Residente Júnior", question: "Paciente com DM2 e TFG de 25 mL/min. Qual medicamento está contraindicado?", options: ["Insulina", "Metformina", "Linagliptina", "Glargina"], correctIndex: 1, hint: "Risco de acidose lática em insuficiência renal grave.", audienceVotes: [5, 72, 13, 10], explanation: "Metformina está contraindicada com TFG <30 mL/min pelo risco de acidose lática por acúmulo. Linagliptina é segura (excreção biliar)." },
      { id: 7, levelName: "Residente Sênior", question: "Os inibidores da SGLT2 atuam em qual segmento do néfron?", options: ["Alça de Henle", "Túbulo contorcido distal", "Túbulo contorcido proximal", "Ducto coletor"], correctIndex: 2, hint: "O SGLT2 é responsável por reabsorver ~90% da glicose filtrada nesse segmento.", audienceVotes: [10, 8, 72, 10], explanation: "SGLT2 no túbulo proximal reabsorve ~90% da glicose filtrada. Gliflozinas bloqueiam essa reabsorção, causando glicosúria terapêutica." },
      { id: 8, levelName: "Residente Sênior", question: "Qual efeito cardiovascular benéfico é atribuído à Empagliflozina?", options: ["Redução do LDL", "Redução de hospitalização por IC", "Aumento da FC", "Broncodilatação"], correctIndex: 1, hint: "O estudo EMPA-REG OUTCOME demonstrou esse benefício.", audienceVotes: [12, 68, 10, 10], explanation: "EMPA-REG OUTCOME mostrou redução de 35% em hospitalização por IC e 38% em mortalidade cardiovascular com Empagliflozina.", reference: "Zinman B et al. NEJM 2015" },
      { id: 9, levelName: "Residente Sênior", question: "Qual é o principal risco das sulfonilureias em idosos?", options: ["Cetoacidose", "Hipoglicemia", "Hepatotoxicidade", "Nefrotoxicidade"], correctIndex: 1, hint: "Estimulam a secreção de insulina independente da glicemia.", audienceVotes: [8, 74, 10, 8], explanation: "Sulfonilureias estimulam secreção insulínica independente da glicemia. Em idosos, metabolismo reduzido + alimentação irregular = hipoglicemia grave e prolongada." },
      { id: 10, levelName: "Especialista", question: "Qual análogo de GLP-1 é administrado por via oral?", options: ["Liraglutida", "Dulaglutida", "Semaglutida", "Exenatida"], correctIndex: 2, hint: "Foi o primeiro agonista GLP-1 disponível em comprimido.", audienceVotes: [15, 10, 65, 10], explanation: "Semaglutida oral usa o promotor de absorção SNAC (salcaprozato de sódio) para proteção contra degradação gástrica. Tomar em jejum com pouca água." },
      { id: 11, levelName: "Especialista", question: "No manejo da cetoacidose diabética, qual é a primeira medida?", options: ["Insulina em bolus IV", "Reposição volêmica com SF 0,9%", "Bicarbonato de sódio", "Glicose hipertônica"], correctIndex: 1, hint: "A desidratação é frequentemente severa e deve ser corrigida primeiro.", audienceVotes: [20, 62, 10, 8], explanation: "Na CAD, a hipovolemia é crítica (déficit de 5-10L). SF 0,9% 1-1.5L/h na 1ª hora. Insulina APÓS hidratação e potássio >3.3 mEq/L." },
      { id: 12, levelName: "Especialista", question: "Qual antidiabético oral está associado a ganho ponderal por retenção hídrica?", options: ["Metformina", "Pioglitazona", "Dapagliflozina", "Vildagliptina"], correctIndex: 1, hint: "Atua como agonista PPAR-gama e pode causar edema periférico.", audienceVotes: [8, 68, 14, 10], explanation: "Pioglitazona ativa PPAR-gama, aumentando retenção de sódio e água. Ganho de 2-4kg. Contraindicada em ICC classe III/IV." },
      { id: 13, levelName: "Chefe de Clínica", question: "Paciente com DM2, IC com FE reduzida e DRC estágio 3. Qual a melhor terapia complementar?", options: ["Glibenclamida", "Pioglitazona", "Dapagliflozina", "Acarbose"], correctIndex: 2, hint: "Benefício cardio-renal comprovado nos estudos DAPA-HF e DAPA-CKD.", audienceVotes: [5, 8, 78, 9], explanation: "Dapagliflozina tem triplo benefício: controle glicêmico + cardioproteção (DAPA-HF) + nefroproteção (DAPA-CKD). Pode ser usada até TFG 20.", reference: "McMurray JJV et al. NEJM 2019" },
      { id: 14, levelName: "Chefe de Clínica", question: "Qual é a principal causa de falha secundária às sulfonilureias?", options: ["Resistência hepática", "Exaustão das células beta", "Absorção intestinal reduzida", "Metabolização CYP rápida"], correctIndex: 1, hint: "O estímulo crônico leva à apoptose progressiva das células produtoras de insulina.", audienceVotes: [12, 70, 10, 8], explanation: "Estimulação crônica das células beta por sulfonilureias acelera a apoptose e exaustão funcional. UKPDS mostrou perda progressiva de controle." },
      { id: 15, levelName: "Chefe de Clínica", question: "No DM1, qual esquema insulínico melhor simula a secreção fisiológica?", options: ["NPH 2x/dia isolada", "Regular pré-prandial isolada", "Basal-bolus (Glargina + Lispro)", "Pré-mistura 70/30 2x/dia"], correctIndex: 2, hint: "Combina uma insulina basal de ação longa com bolus de ação ultrarrápida às refeições.", audienceVotes: [5, 8, 78, 9], explanation: "Esquema basal-bolus (Glargina 1x + Lispro pré-refeições) melhor mimetiza a secreção fisiológica: basal contínua + picos prandiais." },
    ],
  },
  {
    id: "hipertensao",
    label: "Tratamento da Hipertensão",
    icon: "❤️",
    questions: [
      { id: 1, levelName: "Interno", question: "Qual classe de anti-hipertensivos inibe a enzima conversora de angiotensina?", options: ["Betabloqueadores", "IECA", "BCC", "Diuréticos"], correctIndex: 1, hint: "Captopril e Enalapril são exemplos clássicos dessa classe.", audienceVotes: [8, 74, 10, 8], explanation: "IECAs (Captopril, Enalapril, Ramipril) inibem a ECA, reduzindo Angiotensina II e acumulando bradicinina (causa da tosse)." },
      { id: 2, levelName: "Interno", question: "Qual é o anti-hipertensivo mais associado à tosse seca como efeito adverso?", options: ["Losartana", "Enalapril", "Anlodipino", "Hidroclorotiazida"], correctIndex: 1, hint: "A tosse é causada pelo acúmulo de bradicinina.", audienceVotes: [12, 68, 10, 10], explanation: "IECAs causam tosse em 5-20% por acúmulo de bradicinina e substância P nas vias aéreas. BRA é alternativa sem esse efeito." },
      { id: 3, levelName: "Interno", question: "Qual é a meta pressórica geral para a maioria dos hipertensos adultos?", options: ["< 160/100 mmHg", "< 140/90 mmHg", "< 120/70 mmHg", "< 150/95 mmHg"], correctIndex: 1, hint: "É o alvo recomendado pelas diretrizes brasileiras de hipertensão.", audienceVotes: [5, 75, 12, 8], explanation: "Meta geral <140/90 mmHg. Para alto risco CV ou DRC com proteinúria, considerar <130/80 mmHg (ACC/AHA 2017)." },
      { id: 4, levelName: "Residente Júnior", question: "Em paciente negro com HAS, qual classe é preferida como monoterapia inicial?", options: ["IECA", "Betabloqueador", "BCC ou Diurético tiazídico", "BRA"], correctIndex: 2, hint: "Estudos mostram menor resposta ao bloqueio do SRAA nessa população.", audienceVotes: [10, 8, 72, 10], explanation: "Pacientes negros têm sistema renina-angiotensina com menor atividade. BCC e tiazídicos são mais eficazes como monoterapia (ALLHAT)." },
      { id: 5, levelName: "Residente Júnior", question: "Qual diurético é mais usado no tratamento crônico da hipertensão?", options: ["Furosemida", "Espironolactona", "Hidroclorotiazida", "Manitol"], correctIndex: 2, hint: "É um tiazídico de baixo custo e amplamente disponível no SUS.", audienceVotes: [15, 8, 67, 10], explanation: "HCTZ 12.5-25mg é o tiazídico mais prescrito. Age no TCD inibindo NCC. Efeito anti-hipertensivo independe do efeito diurético a longo prazo." },
      { id: 6, levelName: "Residente Júnior", question: "Qual anti-hipertensivo é primeira escolha em gestantes?", options: ["Enalapril", "Metildopa", "Losartana", "Atenolol"], correctIndex: 1, hint: "IECA e BRA são teratogênicos e contraindicados na gestação.", audienceVotes: [5, 75, 10, 10], explanation: "Metildopa (agonista alfa-2 central) é segura em todos os trimestres. IECA/BRA causam agenesia renal fetal e oligoidrâmnio." },
      { id: 7, levelName: "Residente Sênior", question: "Na emergência hipertensiva, qual é a via de administração preferida?", options: ["Via oral", "Via intravenosa", "Via intramuscular", "Via sublingual"], correctIndex: 1, hint: "Permite titulação precisa da redução pressórica nas primeiras horas.", audienceVotes: [5, 78, 8, 9], explanation: "IV permite titulação precisa. Objetivo: reduzir PAM em 25% na 1ª hora. Nitroprussiato ou Nitroglicerina conforme cenário clínico." },
      { id: 8, levelName: "Residente Sênior", question: "Qual BCC diidropiridínico de longa ação é amplamente usado na HAS?", options: ["Verapamil", "Diltiazem", "Anlodipino", "Nifedipino sublingual"], correctIndex: 2, hint: "Tem meia-vida longa e perfil vasodilatador predominante.", audienceVotes: [10, 10, 70, 10], explanation: "Anlodipino (t½ ~40h) permite dose única diária. Vasodilatação arteriolar periférica. Edema maleolar é EA mais comum (dose-dependente)." },
      { id: 9, levelName: "Residente Sênior", question: "Paciente hipertenso e diabético. Qual classe reduz a proteinúria?", options: ["BCC", "Betabloqueador", "IECA/BRA", "Diurético de alça"], correctIndex: 2, hint: "Reduzem a pressão intraglomerular por dilatação da arteríola eferente.", audienceVotes: [8, 8, 76, 8], explanation: "IECA/BRA dilatam a arteríola eferente, reduzindo pressão intraglomerular e proteinúria. Nefroproteção comprovada (RENAAL, IDNT)." },
      { id: 10, levelName: "Especialista", question: "Qual é o mecanismo do Sacubitril/Valsartana na IC com HAS associada?", options: ["Inibição da renina", "Inibição da neprilisina + bloqueio AT1", "Bloqueio beta-adrenérgico", "Inibição da aldosterona"], correctIndex: 1, hint: "É um ARNI (Angiotensin Receptor-Neprilysin Inhibitor).", audienceVotes: [10, 70, 10, 10], explanation: "Sacubitril inibe neprilisina (aumenta BNP/bradicinina natriuréticos) + Valsartana bloqueia AT1. Superioridade sobre Enalapril no PARADIGM-HF." },
      { id: 11, levelName: "Especialista", question: "Qual é o 4º fármaco recomendado na HAS resistente?", options: ["Clonidina", "Espironolactona", "Hidralazina", "Prazosina"], correctIndex: 1, hint: "O estudo PATHWAY-2 demonstrou superioridade desse fármaco.", audienceVotes: [10, 72, 10, 8], explanation: "Espironolactona 25-50mg como 4º fármaco reduziu PA sistólica em ~8.7 mmHg vs placebo (PATHWAY-2). Hiperaldosteronismo é causa frequente." },
      { id: 12, levelName: "Especialista", question: "Qual betabloqueador possui ação vasodilatadora adicional?", options: ["Atenolol", "Propranolol", "Carvedilol", "Metoprolol"], correctIndex: 2, hint: "Bloqueia receptores alfa-1 além dos beta-adrenérgicos.", audienceVotes: [8, 10, 72, 10], explanation: "Carvedilol bloqueia beta-1, beta-2 e alfa-1. Vasodilatação periférica reduz pós-carga. Benefício em IC (COPERNICUS, COMET)." },
      { id: 13, levelName: "Chefe de Clínica", question: "No feocromocitoma, por que betabloqueador isolado é contraindicado inicialmente?", options: ["Causa taquicardia reflexa", "Bloqueia a ação das catecolaminas", "Permite estimulação alfa sem oposição, agravando a HAS", "Reduz o débito cardíaco excessivamente"], correctIndex: 2, hint: "Deve-se primeiro bloquear alfa com fenoxibenzamina antes de iniciar beta.", audienceVotes: [10, 8, 72, 10], explanation: "Beta-bloqueio isolado elimina vasodilatação beta-2, deixando estimulação alfa-1 sem oposição = vasoconstrição grave. Sempre alfa-bloqueio primeiro (Fenoxibenzamina)." },
      { id: 14, levelName: "Chefe de Clínica", question: "Qual é a causa mais comum de hipertensão secundária?", options: ["Feocromocitoma", "Coarctação da aorta", "Doença renal crônica", "Hiperaldosteronismo primário"], correctIndex: 2, hint: "A perda de néfrons leva à retenção de sódio e água.", audienceVotes: [5, 8, 75, 12], explanation: "DRC causa HAS por: retenção de Na/H₂O, ativação SRAA, disfunção endotelial e rigidez arterial. Prevalência de HAS na DRC: 80-90%." },
      { id: 15, levelName: "Chefe de Clínica", question: "No tratamento da crise hipertensiva com dissecção aórtica, qual classe é mais indicada?", options: ["Diurético de alça", "Betabloqueador IV", "IECA", "BCC diidropiridínico"], correctIndex: 1, hint: "Reduz a frequência cardíaca e a força de cisalhamento na parede aórtica.", audienceVotes: [5, 78, 8, 9], explanation: "Esmolol/Labetalol IV reduzem FC <60bpm e PA sistólica <120mmHg em 20min. Reduz dP/dt (força de cisalhamento aórtica). Nitroprussiato só após beta-bloqueio." },
    ],
  },
  {
    id: "antibioticos",
    label: "Antibioticoterapia",
    icon: "🦠",
    questions: [
      { id: 1, levelName: "Interno", question: "Qual antibiótico é primeira escolha para faringite estreptocócica?", options: ["Azitromicina", "Amoxicilina", "Ciprofloxacino", "Metronidazol"], correctIndex: 1, hint: "É uma penicilina de amplo espectro com boa disponibilidade oral.", audienceVotes: [12, 70, 10, 8], explanation: "Amoxicilina 50mg/kg/dia por 10 dias. Streptococcus pyogenes permanece universalmente sensível às penicilinas." },
      { id: 2, levelName: "Interno", question: "Qual é o mecanismo de ação das penicilinas?", options: ["Inibição da síntese proteica", "Inibição da síntese de parede celular", "Inibição da DNA girase", "Desestabilização da membrana"], correctIndex: 1, hint: "Ligam-se às PBPs (Proteínas Ligadoras de Penicilina).", audienceVotes: [8, 74, 10, 8], explanation: "Penicilinas são beta-lactâmicos que inibem transpeptidases (PBPs), impedindo a ligação cruzada do peptidoglicano. Efeito bactericida." },
      { id: 3, levelName: "Interno", question: "Qual antibiótico é contraindicado em crianças por afetar a cartilagem?", options: ["Amoxicilina", "Cefalexina", "Ciprofloxacino", "Azitromicina"], correctIndex: 2, hint: "As fluoroquinolonas podem causar artropatia em animais jovens.", audienceVotes: [5, 8, 78, 9], explanation: "Fluoroquinolonas causam lesão em cartilagem de crescimento em modelos animais. Contraindicadas em <18 anos (exceções: fibrose cística, infecções graves sem alternativa)." },
      { id: 4, levelName: "Residente Júnior", question: "Qual é o antibiótico de escolha para ITU não complicada em mulheres?", options: ["Amoxicilina", "Nitrofurantoína", "Ceftriaxona", "Vancomicina"], correctIndex: 1, hint: "Atinge altas concentrações urinárias e tem baixa resistência.", audienceVotes: [10, 70, 12, 8], explanation: "Nitrofurantoína 100mg 12/12h por 5 dias. Concentração urinária 200x a sérica. Baixa resistência por múltiplos mecanismos de ação." },
      { id: 5, levelName: "Residente Júnior", question: "Qual é o espectro de ação do Metronidazol?", options: ["Gram-positivos aeróbios", "Anaeróbios e protozoários", "Gram-negativos aeróbios", "Micobactérias"], correctIndex: 1, hint: "É a droga de escolha para Clostridium difficile e amebíase.", audienceVotes: [8, 72, 12, 8], explanation: "Metronidazol é um nitroimidazol ativado em condições anaeróbias. Cobre anaeróbios (Bacteroides, Clostridium) e protozoários (Entamoeba, Giardia, Trichomonas)." },
      { id: 6, levelName: "Residente Júnior", question: "A associação Amoxicilina + Clavulanato visa combater qual mecanismo de resistência?", options: ["Bomba de efluxo", "Produção de beta-lactamase", "Alteração do ribossomo", "Mutação da DNA girase"], correctIndex: 1, hint: "O clavulanato é um inibidor suicida dessa enzima bacteriana.", audienceVotes: [8, 74, 10, 8], explanation: "Clavulanato é inibidor irreversível (suicida) de beta-lactamases classe A. Liga-se covalentemente ao sítio ativo da enzima, protegendo a amoxicilina." },
      { id: 7, levelName: "Residente Sênior", question: "Qual antibiótico requer monitorização de nível sérico (TDM) por nefro e ototoxicidade?", options: ["Azitromicina", "Vancomicina", "Amoxicilina", "Doxiciclina"], correctIndex: 1, hint: "É um glicopeptídeo usado contra MRSA e Clostridium.", audienceVotes: [5, 78, 8, 9], explanation: "Vancomicina IV requer TDM com alvo AUC/MIC 400-600. Nefrotoxicidade em 10-20%. Ototoxicidade é rara com monitorização adequada." },
      { id: 8, levelName: "Residente Sênior", question: "No tratamento da pneumonia comunitária grave, qual esquema é frequente?", options: ["Amoxicilina VO", "Ceftriaxona + Azitromicina IV", "Metronidazol isolado", "Ciprofloxacino VO"], correctIndex: 1, hint: "Cobre patógenos típicos e atípicos simultaneamente.", audienceVotes: [5, 75, 10, 10], explanation: "Ceftriaxona (típicos: Pneumococo, H. influenzae) + Azitromicina (atípicos: Legionella, Mycoplasma, Chlamydia). Alternativa: Levofloxacino monoterapia." },
      { id: 9, levelName: "Residente Sênior", question: "Qual é o mecanismo de ação dos aminoglicosídeos?", options: ["Inibição da subunidade 30S do ribossomo", "Inibição da parede celular", "Inibição da RNA polimerase", "Inibição do folato"], correctIndex: 0, hint: "Ligam-se irreversivelmente à subunidade menor do ribossomo.", audienceVotes: [72, 10, 10, 8], explanation: "Aminoglicosídeos (Gentamicina, Amicacina) ligam-se irreversivelmente à subunidade 30S, causando leitura errônea do mRNA. Efeito bactericida concentração-dependente." },
      { id: 10, levelName: "Especialista", question: "Qual carbapenêmico NÃO tem ação contra Pseudomonas aeruginosa?", options: ["Meropenem", "Imipenem", "Ertapenem", "Doripenem"], correctIndex: 2, hint: "É o único carbapenêmico administrado 1x/dia e tem espectro mais estreito.", audienceVotes: [10, 10, 68, 12], explanation: "Ertapenem não cobre Pseudomonas nem Acinetobacter. Vantagem: 1x/dia IM/IV, ideal para ambulatório. Mero/Imi/Doripenem cobrem Pseudomonas." },
      { id: 11, levelName: "Especialista", question: "Na meningite bacteriana do adulto, qual antibiótico empírico é padrão?", options: ["Amoxicilina", "Ceftriaxona", "Metronidazol", "Azitromicina"], correctIndex: 1, hint: "Boa penetração na barreira hematoencefálica e cobertura para Neisseria e Pneumococo.", audienceVotes: [5, 78, 8, 9], explanation: "Ceftriaxona 2g IV 12/12h penetra BHE inflamada. Cobre N. meningitidis e S. pneumoniae. Adicionar Vancomicina se suspeita de Pneumococo resistente." },
      { id: 12, levelName: "Especialista", question: "Qual é a principal preocupação com o uso prolongado de Linezolida?", options: ["Nefrotoxicidade", "Trombocitopenia e neuropatia", "Ototoxicidade", "Hepatotoxicidade fulminante"], correctIndex: 1, hint: "Inibe a MAO e pode causar toxicidade medular após 2+ semanas.", audienceVotes: [10, 70, 12, 8], explanation: "Linezolida causa trombocitopenia (após 10-14 dias, dose-dependente) e neuropatia periférica/óptica (uso >28 dias). Também inibe MAO (risco serotoninérgico)." },
      { id: 13, levelName: "Chefe de Clínica", question: "Na endocardite por MRSA, qual é o esquema preferido?", options: ["Vancomicina + Gentamicina", "Vancomicina (ou Daptomicina)", "Ceftriaxona + Oxacilina", "Linezolida isolada"], correctIndex: 1, hint: "Daptomicina é alternativa à Vancomicina, mas Linezolida tem baixa atividade bactericida.", audienceVotes: [15, 65, 12, 8], explanation: "Vancomicina IV (alvo AUC/MIC 400-600) por 6 semanas. Daptomicina 8-10mg/kg é alternativa. Gentamicina não é mais recomendada (nefrotoxicidade sem benefício). Linezolida é bacteriostática." },
      { id: 14, levelName: "Chefe de Clínica", question: "Qual mecanismo explica a resistência de KPC (Klebsiella produtora de carbapenemase)?", options: ["Bomba de efluxo", "Alteração de PBP", "Produção de enzima que hidrolisa carbapenêmicos", "Impermeabilidade de membrana"], correctIndex: 2, hint: "A enzima KPC (classe A de Ambler) degrada praticamente todos os beta-lactâmicos.", audienceVotes: [8, 10, 72, 10], explanation: "KPC (Klebsiella pneumoniae carbapenemase) é uma serina-beta-lactamase classe A de Ambler. Hidrolisa todos os beta-lactâmicos incluindo carbapenêmicos. Tratamento: Ceftazidima-avibactam." },
      { id: 15, levelName: "Chefe de Clínica", question: "No tratamento da tuberculose, o esquema RIPE inclui quais fármacos?", options: ["Rifampicina, Isoniazida, Pirazinamida, Etambutol", "Rifampicina, Imipenem, Penicilina, Eritromicina", "Ranitidina, Isoniazida, Prednisona, Estreptomicina", "Rifampicina, Ibuprofeno, Pirimetamina, Etionamida"], correctIndex: 0, hint: "São os 4 fármacos da fase intensiva (2 meses) do tratamento.", audienceVotes: [78, 5, 8, 9], explanation: "RIPE: R(ifampicina) + I(soniazida) + P(irazinamida) + E(tambutol) por 2 meses (fase intensiva), seguido de RI por 4 meses (fase manutenção). Total: 6 meses." },
    ],
  },
  {
    id: "psicofarmaco",
    label: "Psicofarmacologia",
    icon: "🧠",
    questions: [
      { id: 1, levelName: "Interno", question: "Qual classe de antidepressivos é considerada primeira linha no tratamento da depressão?", options: ["Tricíclicos", "ISRS", "IMAO", "Antipsicóticos"], correctIndex: 1, hint: "Inibidores Seletivos da Recaptação de Serotonina — fluoxetina, sertralina.", audienceVotes: [10, 72, 10, 8], explanation: "ISRS (Fluoxetina, Sertralina, Escitalopram) são primeira linha por eficácia equivalente aos tricíclicos com melhor tolerabilidade e segurança em overdose." },
      { id: 2, levelName: "Interno", question: "Qual benzodiazepínico tem meia-vida mais longa?", options: ["Alprazolam", "Midazolam", "Diazepam", "Lorazepam"], correctIndex: 2, hint: "Possui metabólitos ativos que prolongam seu efeito por dias.", audienceVotes: [12, 8, 70, 10], explanation: "Diazepam t½ 20-100h + metabólito ativo desmetildiazepam t½ até 200h. Risco de acúmulo em idosos e hepatopatas." },
      { id: 3, levelName: "Interno", question: "Qual é o antídoto para intoxicação por benzodiazepínicos?", options: ["Naloxona", "Flumazenil", "N-acetilcisteína", "Atropina"], correctIndex: 1, hint: "É um antagonista competitivo do receptor GABA-A.", audienceVotes: [12, 72, 8, 8], explanation: "Flumazenil é antagonista competitivo no sítio BZD do receptor GABA-A. Usar com cautela: pode precipitar convulsões em usuários crônicos." },
      { id: 4, levelName: "Residente Júnior", question: "Qual antidepressivo é mais associado à Síndrome Serotoninérgica quando combinado com IMAO?", options: ["Bupropiona", "Mirtazapina", "Fluoxetina", "Trazodona"], correctIndex: 2, hint: "Tem meia-vida muito longa (inclui metabólito norfluoxetina).", audienceVotes: [8, 10, 72, 10], explanation: "Fluoxetina (t½ 4-6 dias, norfluoxetina 4-16 dias) + IMAO = risco máximo de síndrome serotoninérgica. Washout de 5 semanas necessário antes de trocar." },
      { id: 5, levelName: "Residente Júnior", question: "Qual estabilizador de humor requer monitorização de função tireoidiana?", options: ["Valproato", "Carbamazepina", "Lítio", "Lamotrigina"], correctIndex: 2, hint: "Pode causar hipotireoidismo e diabetes insípidus nefrogênico.", audienceVotes: [10, 10, 70, 10], explanation: "Lítio causa hipotireoidismo em 20-30% (inibe síntese/liberação T3/T4) e diabetes insípidus nefrogênico (resistência ao ADH no ducto coletor)." },
      { id: 6, levelName: "Residente Júnior", question: "Qual antipsicótico atípico tem maior risco de síndrome metabólica?", options: ["Aripiprazol", "Risperidona", "Olanzapina", "Ziprasidona"], correctIndex: 2, hint: "Causa ganho de peso significativo, dislipidemia e hiperglicemia.", audienceVotes: [5, 12, 73, 10], explanation: "Olanzapina e Clozapina têm maior risco metabólico por antagonismo H1/5-HT2C. Ganho de 4-10kg em 6 meses. Monitorar glicemia e perfil lipídico trimestralmente." },
      { id: 7, levelName: "Residente Sênior", question: "Qual é o mecanismo de ação do Aripiprazol?", options: ["Antagonista D2 puro", "Agonista parcial D2 e 5-HT1A", "Agonista total D2", "Inibidor da recaptação de dopamina"], correctIndex: 1, hint: "Funciona como estabilizador do sistema dopaminérgico.", audienceVotes: [10, 72, 8, 10], explanation: "Aripiprazol é agonista parcial D2 (estabilizador dopaminérgico): agonista em áreas hipodopaminérgicas (mesocortical) e antagonista funcional em áreas hiperdopaminérgicas (mesolímbica)." },
      { id: 8, levelName: "Residente Sênior", question: "Qual efeito adverso grave é exclusivo da Clozapina?", options: ["Parkinsonismo", "Agranulocitose", "Acatisia", "Discinesia tardia"], correctIndex: 1, hint: "Exige hemograma semanal nas primeiras semanas de tratamento.", audienceVotes: [8, 74, 10, 8], explanation: "Agranulocitose (0.8%): neutrófilos <500/mm³. Hemograma semanal por 18 semanas, quinzenal até 1 ano, mensal após. Clozapina é o único antipsicótico com essa exigência." },
      { id: 9, levelName: "Residente Sênior", question: "Qual ISRS é preferido em idosos por ter menos interações CYP?", options: ["Fluoxetina", "Paroxetina", "Sertralina", "Fluvoxamina"], correctIndex: 2, hint: "Tem perfil farmacocinético mais limpo e menos inibição enzimática.", audienceVotes: [8, 10, 72, 10], explanation: "Sertralina é preferida em idosos: menor inibição CYP2D6 que fluoxetina/paroxetina, sem efeito anticolinérgico significativo, e meia-vida adequada." },
      { id: 10, levelName: "Especialista", question: "No TDAH adulto, qual é o mecanismo do Metilfenidato?", options: ["Agonista GABA", "Bloqueio da recaptação de dopamina e noradrenalina", "Inibição da MAO-B", "Agonismo 5-HT2A"], correctIndex: 1, hint: "É um psicoestimulante que aumenta a disponibilidade de catecolaminas na fenda sináptica.", audienceVotes: [5, 78, 8, 9], explanation: "Metilfenidato bloqueia DAT e NET no córtex pré-frontal, aumentando dopamina e noradrenalina na fenda sináptica. Diferente das anfetaminas, não causa liberação vesicular." },
      { id: 11, levelName: "Especialista", question: "Qual antidepressivo é mais indicado para cessação tabágica?", options: ["Sertralina", "Bupropiona", "Venlafaxina", "Amitriptilina"], correctIndex: 1, hint: "Inibe a recaptação de noradrenalina e dopamina, sem ação serotoninérgica.", audienceVotes: [8, 74, 10, 8], explanation: "Bupropiona (IRND) reduz craving por antagonismo nicotínico + aumento de dopamina no nucleus accumbens. Aprovada para cessação tabágica (150mg 2x/dia por 7-12 semanas)." },
      { id: 12, levelName: "Especialista", question: "A Síndrome Neuroléptica Maligna é caracterizada por qual tríade?", options: ["Febre, rigidez muscular, disautonomia", "Tremor, bradicardia, hipotermia", "Agitação, diarreia, mioclonias", "Sedação, hipotensão, miose"], correctIndex: 0, hint: "É uma emergência psiquiátrica causada por bloqueio dopaminérgico intenso.", audienceVotes: [74, 8, 10, 8], explanation: "SNM: hipertermia >40°C + rigidez muscular tipo 'cano de chumbo' + disautonomia (taquicardia, PA lábil). CPK muito elevada. Tratamento: Dantrolene + Bromocriptina." },
      { id: 13, levelName: "Chefe de Clínica", question: "Na depressão resistente, qual estratégia potencializa ISRS com melhor evidência?", options: ["Adicionar benzodiazepínico", "Associar Lítio ou Aripiprazol", "Dobrar a dose do ISRS", "Trocar para IMAO imediatamente"], correctIndex: 1, hint: "Augmentação com Lítio ou antipsicótico atípico tem forte evidência em guidelines.", audienceVotes: [5, 75, 12, 8], explanation: "Augmentação com Lítio (NNT=5) ou Aripiprazol 2-5mg (STAR*D nível 3-4) tem evidência robusta. Bupropiona como combinação também é opção. Troca direta para IMAO requer washout." },
      { id: 14, levelName: "Chefe de Clínica", question: "Qual é a janela terapêutica do Lítio para manutenção no transtorno bipolar?", options: ["0,2-0,4 mEq/L", "0,6-1,0 mEq/L", "1,5-2,0 mEq/L", "2,5-3,0 mEq/L"], correctIndex: 1, hint: "Acima de 1,5 mEq/L já há risco de toxicidade.", audienceVotes: [5, 78, 10, 7], explanation: "Manutenção: 0.6-1.0 mEq/L. Fase aguda de mania: 0.8-1.2 mEq/L. >1.5: toxicidade leve (tremor, GI). >2.0: toxicidade grave (encefalopatia, arritmia). Índice terapêutico estreito." },
      { id: 15, levelName: "Chefe de Clínica", question: "Na gestação, qual estabilizador de humor tem menor teratogenicidade?", options: ["Valproato", "Carbamazepina", "Lamotrigina", "Lítio"], correctIndex: 2, hint: "O Valproato é o de maior risco (defeitos no tubo neural).", audienceVotes: [3, 8, 78, 11], explanation: "Lamotrigina é o estabilizador mais seguro na gestação. Valproato: 10% defeitos tubo neural (categoria X). Carbamazepina: 2-3% espinha bífida. Lítio: Anomalia de Ebstein (risco real ~0.1%)." },
    ],
  },
  {
    id: "dor",
    label: "Farmacologia da Dor",
    icon: "💊",
    questions: [
      { id: 1, levelName: "Interno", question: "Qual é o mecanismo de ação do Paracetamol?", options: ["Inibição da COX-1 periférica", "Inibição central da COX e sistema endocanabinóide", "Agonismo opioide mu", "Bloqueio de canais de sódio"], correctIndex: 1, hint: "Diferente dos AINEs, tem pouca ação anti-inflamatória periférica.", audienceVotes: [15, 68, 10, 7], explanation: "Paracetamol atua centralmente: inibição fraca da COX central + ativação do sistema endocanabinóide (via metabolito AM404) + vias serotoninérgicas descendentes." },
      { id: 2, levelName: "Interno", question: "Qual é a dose máxima diária segura de Paracetamol em adultos?", options: ["2g/dia", "3g/dia", "4g/dia", "6g/dia"], correctIndex: 2, hint: "Acima disso, há risco de hepatotoxicidade grave.", audienceVotes: [8, 12, 72, 8], explanation: "4g/dia (máximo). Em hepatopatas ou etilistas: 2g/dia. Hepatotoxicidade por acúmulo de NAPQI (metabólito tóxico via CYP2E1). Antídoto: N-acetilcisteína." },
      { id: 3, levelName: "Interno", question: "Qual AINE é mais seletivo para COX-2?", options: ["Ibuprofeno", "Naproxeno", "Celecoxibe", "AAS"], correctIndex: 2, hint: "Foi desenvolvido para reduzir efeitos gastrointestinais.", audienceVotes: [8, 10, 74, 8], explanation: "Celecoxibe é coxib (inibidor seletivo COX-2). Menor toxicidade GI mas mesmo risco cardiovascular que AINEs não-seletivos (CLASS, PRECISION)." },
      { id: 4, levelName: "Residente Júnior", question: "Qual opioide é considerado fraco e usado no 2º degrau da escada da OMS?", options: ["Morfina", "Tramadol", "Fentanil", "Metadona"], correctIndex: 1, hint: "Também tem ação inibitória sobre a recaptação de noradrenalina e serotonina.", audienceVotes: [8, 72, 12, 8], explanation: "Tramadol: agonista mu fraco + inibidor recaptação NE/5-HT. Teto de dose: 400mg/dia. Risco de convulsões e síndrome serotoninérgica com ISRS." },
      { id: 5, levelName: "Residente Júnior", question: "Qual é o antídoto para intoxicação por opioides?", options: ["Flumazenil", "N-acetilcisteína", "Naloxona", "Atropina"], correctIndex: 2, hint: "Antagonista competitivo do receptor mu, com ação rápida mas curta.", audienceVotes: [8, 5, 78, 9], explanation: "Naloxona: antagonista mu competitivo. IV/IM/IN. Início 1-2min IV. t½ 30-90min (mais curta que maioria dos opioides → risco de renarcotização). Dose: 0.04-0.4mg, titular." },
      { id: 6, levelName: "Residente Júnior", question: "A Dipirona é contraindicada em alguns países por risco de:", options: ["Hepatotoxicidade", "Nefrotoxicidade", "Agranulocitose", "Cardiotoxicidade"], correctIndex: 2, hint: "É uma reação idiossincrática rara mas potencialmente fatal.", audienceVotes: [10, 10, 70, 10], explanation: "Agranulocitose por Dipirona: incidência ~1:100.000. Reação idiossincrática imunomediada. Banida em EUA, UK. Amplamente usada no Brasil (~7% dos atendimentos)." },
      { id: 7, levelName: "Residente Sênior", question: "Qual adjuvante é usado na dor neuropática como primeira linha?", options: ["Paracetamol", "Gabapentina/Pregabalina", "Ibuprofeno", "Tramadol"], correctIndex: 1, hint: "Atuam nos canais de cálcio voltagem-dependentes (subunidade alfa-2-delta).", audienceVotes: [5, 75, 10, 10], explanation: "Gabapentinoides ligam-se à subunidade α2δ dos canais de Ca²⁺ voltagem-dependentes, reduzindo liberação de glutamato e substância P. NNT ~4-7 para dor neuropática." },
      { id: 8, levelName: "Residente Sênior", question: "Qual opioide tem maior risco de prolongamento do intervalo QT?", options: ["Morfina", "Codeína", "Metadona", "Oxicodona"], correctIndex: 2, hint: "Também tem meia-vida muito longa e variável entre pacientes.", audienceVotes: [8, 8, 74, 10], explanation: "Metadona bloqueia canal hERG (IKr) → prolongamento QT dose-dependente. ECG basal e monitoramento obrigatórios. t½ 15-60h, altamente variável entre pacientes." },
      { id: 9, levelName: "Residente Sênior", question: "Na escada analgésica da OMS, o 3º degrau inclui:", options: ["AINEs isolados", "Opioides fracos + AINEs", "Opioides fortes ± adjuvantes", "Procedimentos intervencionistas"], correctIndex: 2, hint: "Morfina, fentanil e oxicodona são exemplos desse degrau.", audienceVotes: [5, 10, 77, 8], explanation: "Escada OMS: 1º) Não-opioide ± adjuvante. 2º) Opioide fraco ± não-opioide ± adjuvante. 3º) Opioide forte ± não-opioide ± adjuvante. Morfina é o padrão-ouro do 3º degrau." },
      { id: 10, levelName: "Especialista", question: "Qual é o mecanismo da hiperalgesia induzida por opioides?", options: ["Downregulation de receptores mu", "Ativação de vias NMDA e sensibilização central", "Acúmulo de metabólitos analgésicos", "Tolerância cruzada com AINEs"], correctIndex: 1, hint: "Paradoxalmente, o opioide aumenta a sensibilidade à dor por neuroplasticidade.", audienceVotes: [12, 70, 10, 8], explanation: "OIH envolve: ativação NMDA, upregulation dynorfinas espinhais, neuroplasticidade glial e sensibilização central. Diferente da tolerância (que responde a aumento de dose)." },
      { id: 11, levelName: "Especialista", question: "Qual antidepressivo tricíclico é mais usado como adjuvante na dor crônica?", options: ["Fluoxetina", "Amitriptilina", "Bupropiona", "Sertralina"], correctIndex: 1, hint: "Atua em vias descendentes inibitórias da dor (noradrenérgicas e serotoninérgicas).", audienceVotes: [5, 78, 8, 9], explanation: "Amitriptilina 10-75mg/noite: ativa vias inibitórias descendentes NE/5-HT, bloqueia canais Na⁺ e receptores NMDA. NNT ~3.6 para dor neuropática (Cochrane)." },
      { id: 12, levelName: "Especialista", question: "Qual é a principal vantagem da via transdérmica de fentanil?", options: ["Início de ação rápido", "Liberação contínua por 72h", "Menor risco de dependência", "Sem efeitos adversos"], correctIndex: 1, hint: "O adesivo libera o fármaco de forma constante, ideal para dor crônica estável.", audienceVotes: [10, 72, 10, 8], explanation: "Adesivo de Fentanil: liberação contínua por 72h. Reservatório dérmico fornece níveis séricos estáveis. Ideal para dor crônica estável (NÃO para dor aguda ou intermitente)." },
      { id: 13, levelName: "Chefe de Clínica", question: "Na rotação de opioides, por que se aplica redução de 25-50% da dose equianalgésica?", options: ["Tolerância completa entre opioides", "Tolerância cruzada incompleta", "Metabolismo idêntico entre opioides", "Efeito placebo da troca"], correctIndex: 1, hint: "Há tolerância parcial, e a dose calculada pode ser excessiva sem a redução.", audienceVotes: [8, 74, 10, 8], explanation: "Tolerância cruzada incompleta: receptores mu têm subtipos diferentes para cada opioide. A dose equianalgésica calculada superestima a necessidade real → reduzir 25-50% por segurança." },
      { id: 14, levelName: "Chefe de Clínica", question: "Qual AINE deve ser evitado em paciente com história de infarto recente?", options: ["Naproxeno", "Ibuprofeno", "Diclofenaco", "Todos os inibidores de COX-2"], correctIndex: 3, hint: "Os coxibes aumentam o risco trombótico cardiovascular.", audienceVotes: [8, 8, 10, 74], explanation: "TODOS os coxibes (e diclofenaco) aumentam risco trombótico CV por desequilíbrio TXA2/PGI2. Naproxeno tem o menor risco CV entre AINEs (PRECISION). Evitar qualquer AINE pós-IAM se possível." },
      { id: 15, levelName: "Chefe de Clínica", question: "Na dor oncológica refratária, qual técnica intervencionista pode ser usada?", options: ["Acupuntura isolada", "Bloqueio do plexo celíaco ou bomba intratecal", "Aumento infinito de opioide VO", "Suspensão de todos os analgésicos"], correctIndex: 1, hint: "Permite analgesia com doses menores e menos efeitos sistêmicos.", audienceVotes: [5, 78, 8, 9], explanation: "Bloqueio do plexo celíaco (ca. pâncreas) ou bomba intratecal de morfina ± ziconotida permitem analgesia com 1/300 da dose oral, reduzindo efeitos sistêmicos drasticamente." },
    ],
  },
];

const letters = ["A", "B", "C", "D"];
const prizeValues = [
  "R$ 1.000", "R$ 2.000", "R$ 3.000", "R$ 5.000", "R$ 10.000",
  "R$ 20.000", "R$ 30.000", "R$ 50.000", "R$ 100.000", "R$ 150.000",
  "R$ 200.000", "R$ 300.000", "R$ 500.000", "R$ 750.000", "R$ 1.000.000",
];

const difficultyConfig: Record<GameDifficulty, { skipCount: number; timePerQ: number }> = {
  academic: { skipCount: 0, timePerQ: 0 },
  clinical: { skipCount: 0, timePerQ: 45 },
  specialist: { skipCount: 0, timePerQ: 25 },
};

export default function MilionarioFarmaGame({ customData }: { customData?: any }) {
  const contexts: GameContext[] = customData?.contexts || defaultContexts;

  const [phase, setPhase] = useState<"narrative" | "difficulty" | "context" | "playing" | "result">("narrative");
  const [difficulty, setDifficulty] = useState<GameDifficulty>("academic");
  const [selectedContext, setSelectedContext] = useState<string | null>(null);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [usedFiftyFifty, setUsedFiftyFifty] = useState(false);
  const [usedPhone, setUsedPhone] = useState(false);
  const [usedAudience, setUsedAudience] = useState(false);
  const [hiddenOptions, setHiddenOptions] = useState<Set<number>>(new Set());
  const [showAudience, setShowAudience] = useState(false);
  const [score, setScore] = useState(0);
  const [errors, setErrors] = useState(0);
  const [spotlightActive, setSpotlightActive] = useState(false);
  const [timer, setTimer] = useState(0);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; title: string; explanation: string; reference?: string; tip?: string } | null>(null);
  const [stoppedEarly, setStoppedEarly] = useState(false);
  const [safeHaven, setSafeHaven] = useState<number | null>(null); // Porto Seguro: index of the safe question (score at that point)

  const config = difficultyConfig[difficulty];
  const currentContext = contexts.find((c) => c.id === selectedContext);
  const questions = currentContext?.questions || [];
  const q = questions[qIndex];

  // Timer
  useEffect(() => {
    if (phase !== "playing" || config.timePerQ === 0 || isRevealing || revealed || feedback) return;
    setTimer(config.timePerQ);
    const interval = setInterval(() => {
      setTimer(t => {
        if (t <= 1) {
          clearInterval(interval);
          // Auto-wrong
          setErrors(e => e + 1);
          if (qIndex < questions.length - 1) {
            setQIndex(i => i + 1);
            setSelected(null);
            setRevealed(false);
            setHiddenOptions(new Set());
            setShowAudience(false);
          } else {
            setPhase("result");
          }
          toast.error("Tempo esgotado!");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [qIndex, phase, config.timePerQ, isRevealing, revealed, feedback]);

  const restart = () => {
    setQIndex(0); setSelected(null); setIsRevealing(false); setRevealed(false);
    setUsedFiftyFifty(false); setUsedPhone(false); setUsedAudience(false);
    setHiddenOptions(new Set()); setShowAudience(false); setScore(0); setErrors(0);
    setFeedback(null); setStoppedEarly(false); setSafeHaven(null);
  };

  const handleStop = () => {
    setStoppedEarly(true);
    setPhase("result");
  };

  const handleSelect = (i: number) => {
    if (isRevealing || revealed || selected !== null || hiddenOptions.has(i)) return;
    setSelected(i);
  };

  const handleConfirm = () => {
    if (selected === null) return;
    setIsRevealing(true);
    setShowAudience(false);
    setSpotlightActive(true);

    setTimeout(() => {
      setRevealed(true);
      setIsRevealing(false);
      setSpotlightActive(false);
      const correct = selected === q.correctIndex;
      if (correct) setScore(s => s + 1);
      else setErrors(e => e + 1);

      // Show formative feedback
      setFeedback({
        isCorrect: correct,
        title: correct ? `Correto! ${prizeValues[qIndex]}` : `Incorreto — era ${letters[q.correctIndex]}`,
        explanation: q.explanation || q.hint,
        reference: q.reference,
        tip: !correct ? `Dica: ${q.hint}` : undefined,
      });
    }, 2000);
  };

  const continueFeedback = () => {
    setFeedback(null);
    const wasCorrect = selected === q.correctIndex;
    setSelected(null);
    setRevealed(false);
    setHiddenOptions(new Set());
    setShowAudience(false);

    if (!wasCorrect) {
      setPhase("result");
    } else if (qIndex >= questions.length - 1) {
      setPhase("result");
    } else {
      setQIndex(i => i + 1);
    }
  };

  const useFiftyFifty = () => {
    if (usedFiftyFifty) return;
    setUsedFiftyFifty(true);
    const wrong = q.options.map((_, i) => i).filter(i => i !== q.correctIndex);
    const toHide = wrong.sort(() => Math.random() - 0.5).slice(0, 2);
    setHiddenOptions(new Set(toHide));
  };

  const usePhone = () => {
    if (usedPhone) return;
    setUsedPhone(true);
    toast.info(`Preceptor diz: "${q.hint}"`, { duration: 8000 });
  };

  const useAudience = () => {
    if (usedAudience) return;
    setUsedAudience(true);
    setShowAudience(true);
  };

  if (phase === "narrative") {
    return (
      <GameNarrative
        title="Quem Quer Ser Milionário — Farmacologia"
        setting="Programa de TV — Estúdio de Farmacologia Clínica"
        briefing="Responda 15 perguntas de farmacologia clínica, progredindo do nível Interno ao Chefe de Clínica. Cada resposta correta vale um prêmio crescente. Três ajudas disponíveis: 50/50, Ligar para o Preceptor e Reunião Clínica."
        onStart={() => setPhase("difficulty")}
      />
    );
  }

  if (phase === "difficulty") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6">
        <GameDifficultySelector selected={difficulty} onChange={setDifficulty} />
        <p className="text-xs text-muted-foreground">
          {config.timePerQ > 0 ? `${config.timePerQ}s por pergunta` : "Sem limite de tempo"}
        </p>
        <Button onClick={() => setPhase("context")} size="lg">Escolher Contexto</Button>
      </div>
    );
  }

  if (phase === "context") {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-foreground">Escolha o Contexto Clínico</h2>
          <p className="text-sm text-muted-foreground">Selecione uma área para iniciar as 15 perguntas</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {contexts.map((ctx) => (
            <button
              key={ctx.id}
              onClick={() => { setSelectedContext(ctx.id); restart(); setPhase("playing"); }}
              className="rounded-xl border-2 border-primary/20 bg-primary/5 p-5 text-left transition-all duration-200 hover:border-primary/50 hover:bg-primary/10 hover:scale-[1.02] cursor-pointer group"
            >
              <div className="text-3xl mb-2">{ctx.icon}</div>
              <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{ctx.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{ctx.questions.length} perguntas</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (feedback) {
    return (
      <GameFeedbackOverlay
        isCorrect={feedback.isCorrect}
        title={feedback.title}
        explanation={feedback.explanation}
        reference={feedback.reference}
        tip={feedback.tip}
        onContinue={continueFeedback}
      />
    );
  }

  if (phase === "result") {
    const resultTitle = stoppedEarly
      ? "Você decidiu parar!"
      : score === questions.length ? "Parabéns, Chefe de Clínica!" : score >= questions.length * 0.6 ? "Bom desempenho!" : "Continue estudando!";
    const resultSubtitle = stoppedEarly
      ? `Você parou na pergunta ${qIndex + 1} e garantiu o prêmio de ${score > 0 ? prizeValues[score - 1] : "R$ 0"}. Acertou ${score} de ${qIndex} perguntas respondidas.`
      : `Você acertou ${score} de ${questions.length} perguntas em ${currentContext?.label}. Prêmio: ${score > 0 ? prizeValues[score - 1] : "R$ 0"}.`;
    return (
      <GameStarsResult
        score={score}
        maxScore={stoppedEarly ? qIndex : questions.length}
        errors={errors}
        title={resultTitle}
        subtitle={resultSubtitle}
        onRestart={() => setPhase("narrative")}
      />
    );
  }

  if (!q) return null;

  return (
    <div className={`space-y-6 ${spotlightActive ? "animate-pulse" : ""}`}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <button onClick={() => setPhase("context")} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 mb-1 cursor-pointer">
            ← {currentContext?.icon} {currentContext?.label}
          </button>
          <p className="text-sm text-muted-foreground">Pergunta {qIndex + 1} / {questions.length}</p>
          <p className="font-bold text-foreground flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-primary" />
            Nível: {q.levelName}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {config.timePerQ > 0 && (
            <Badge variant={timer <= 10 ? "destructive" : "secondary"} className={`font-mono ${timer <= 10 ? "animate-pulse" : ""}`}>
              ⏱ {timer}s
            </Badge>
          )}
          <Badge variant="outline" className="text-xs font-mono">
            <Sparkles className="h-3 w-3 mr-1" />
            {prizeValues[qIndex]}
          </Badge>
          <div className="flex gap-1.5">
            <button onClick={useFiftyFifty} disabled={usedFiftyFifty || selected !== null} className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all ${usedFiftyFifty ? "opacity-30 border-border cursor-not-allowed" : "border-primary/50 text-primary hover:bg-primary/10 cursor-pointer hover:scale-110"}`} title="Revisão de Literatura (50/50)"><BookOpen className="h-4 w-4" /></button>
            <button onClick={usePhone} disabled={usedPhone || selected !== null} className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all ${usedPhone ? "opacity-30 border-border cursor-not-allowed" : "border-green-500/50 text-green-500 hover:bg-green-500/10 cursor-pointer hover:scale-110"}`} title="Ligar para o Preceptor"><PhoneCall className="h-4 w-4" /></button>
            <button onClick={useAudience} disabled={usedAudience || selected !== null} className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all ${usedAudience ? "opacity-30 border-border cursor-not-allowed" : "border-purple-500/50 text-purple-500 hover:bg-purple-500/10 cursor-pointer hover:scale-110"}`} title="Reunião Clínica"><Users className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      <Progress value={((qIndex) / questions.length) * 100} className="h-1.5" />

      {/* Prize ladder (mini) */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {prizeValues.map((p, i) => (
          <Badge
            key={i}
            variant={i === qIndex ? "default" : i < qIndex ? "secondary" : "outline"}
            className={`text-[9px] whitespace-nowrap shrink-0 transition-all ${i === qIndex ? "scale-110 shadow-md" : ""}`}
          >
            {i + 1}. {p}
          </Badge>
        ))}
      </div>

      {/* Question */}
      <div className={`rounded-xl border-2 border-primary/30 bg-primary/5 backdrop-blur-sm p-6 transition-all ${spotlightActive ? "shadow-lg shadow-primary/20" : ""}`}>
        <p className="text-foreground text-lg font-medium leading-relaxed">{q.question}</p>
      </div>

      {/* Audience votes bar chart */}
      {showAudience && (
        <div className="flex items-end gap-2 justify-center h-16 animate-in slide-in-from-bottom-2">
          {q.audienceVotes.map((v, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className="text-[10px] font-mono text-muted-foreground">{v}%</span>
              <div className="w-8 bg-primary/60 rounded-t transition-all" style={{ height: `${v * 0.6}px` }} />
              <span className="text-[10px] font-bold">{letters[i]}</span>
            </div>
          ))}
        </div>
      )}

      {/* Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {q.options.map((opt, i) => {
          if (hiddenOptions.has(i)) return <div key={i} className="rounded-lg border border-border bg-muted/20 p-4 opacity-20 h-full" />;
          let style = "border-primary/20 bg-card text-foreground hover:border-primary/50 cursor-pointer";
          if (selected === i && !revealed) style = "border-yellow-500 bg-yellow-500/10 text-foreground ring-2 ring-yellow-500/50 animate-pulse";
          if (revealed) {
            if (i === q.correctIndex) style = "border-green-500 bg-green-500/10 text-green-500 ring-2 ring-green-500/50";
            else if (i === selected) style = "border-destructive bg-destructive/10 text-destructive ring-2 ring-destructive/50";
          }
          const disabled = (selected !== null && selected !== i && !revealed) || isRevealing || revealed;
          return (
            <button key={i} onClick={() => handleSelect(i)} disabled={disabled} className={`rounded-lg border-2 p-4 text-left transition-all duration-300 flex items-start gap-3 ${style} ${disabled && selected !== i ? "opacity-50 cursor-not-allowed" : ""}`}>
              <span className="shrink-0 w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center font-bold text-sm text-primary">{letters[i]}</span>
              <span className="flex-1 text-sm font-medium">{opt}</span>
            </button>
          );
        })}
      </div>

      {selected !== null && !revealed && !isRevealing && (
        <div className="flex justify-center gap-3 animate-in fade-in">
          <Button size="lg" onClick={handleConfirm} className="gap-2">
            <Zap className="h-4 w-4" /> Confirmar Decisão Clínica
          </Button>
        </div>
      )}

      {/* Stop button - always visible during play when not revealing */}
      {!isRevealing && !revealed && selected === null && score > 0 && (
        <div className="flex justify-center animate-in fade-in">
          <Button size="lg" variant="outline" onClick={handleStop} className="gap-2 border-yellow-500/50 text-yellow-600 hover:bg-yellow-500/10">
            <Award className="h-4 w-4" /> Parar e Garantir {prizeValues[score - 1]}
          </Button>
        </div>
      )}

      {isRevealing && (
        <div className="text-center space-y-2 animate-pulse">
          <div className="flex justify-center gap-1">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
          <p className="text-muted-foreground text-sm">Verificando resposta...</p>
        </div>
      )}
    </div>
  );
}
