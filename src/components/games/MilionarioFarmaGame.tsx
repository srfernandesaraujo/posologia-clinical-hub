import { useState, useCallback } from "react";
import { Stethoscope, Users, BookOpen, PhoneCall, Award, XCircle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

interface Question {
  id: number;
  levelName: string;
  question: string;
  options: string[];
  correctIndex: number;
  hint: string;
  audienceVotes: number[];
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
      { id: 1, levelName: "Interno", question: "Qual medicamento é considerado primeira linha no tratamento do DM2?", options: ["Glibenclamida", "Metformina", "Insulina NPH", "Sitagliptina"], correctIndex: 1, hint: "É uma biguanida que reduz a produção hepática de glicose.", audienceVotes: [10, 70, 12, 8] },
      { id: 2, levelName: "Interno", question: "Qual é o principal efeito adverso da Metformina?", options: ["Hipoglicemia severa", "Ganho de peso", "Desconforto gastrointestinal", "Retenção hídrica"], correctIndex: 2, hint: "Náuseas e diarreia são comuns no início do tratamento.", audienceVotes: [12, 8, 68, 12] },
      { id: 3, levelName: "Interno", question: "A Hemoglobina Glicada (HbA1c) reflete o controle glicêmico dos últimos:", options: ["7 dias", "30 dias", "2-3 meses", "6 meses"], correctIndex: 2, hint: "Está relacionada ao tempo de vida das hemácias.", audienceVotes: [5, 15, 72, 8] },
      { id: 4, levelName: "Residente Júnior", question: "Qual classe de antidiabéticos orais atua inibindo a enzima DPP-4?", options: ["Sulfonilureias", "Glitazonas", "Gliptinas", "Gliflozinas"], correctIndex: 2, hint: "Aumentam os níveis de incretinas endógenas (GLP-1 e GIP).", audienceVotes: [10, 8, 70, 12] },
      { id: 5, levelName: "Residente Júnior", question: "Qual insulina tem perfil de ação ultrarrápida?", options: ["NPH", "Glargina", "Lispro", "Detemir"], correctIndex: 2, hint: "É um análogo com inversão de aminoácidos na cadeia B.", audienceVotes: [8, 10, 68, 14] },
      { id: 6, levelName: "Residente Júnior", question: "Paciente com DM2 e TFG de 25 mL/min. Qual medicamento está contraindicado?", options: ["Insulina", "Metformina", "Linagliptina", "Glargina"], correctIndex: 1, hint: "Risco de acidose lática em insuficiência renal grave.", audienceVotes: [5, 72, 13, 10] },
      { id: 7, levelName: "Residente Sênior", question: "Os inibidores da SGLT2 atuam em qual segmento do néfron?", options: ["Alça de Henle", "Túbulo contorcido distal", "Túbulo contorcido proximal", "Ducto coletor"], correctIndex: 2, hint: "O SGLT2 é responsável por reabsorver ~90% da glicose filtrada nesse segmento.", audienceVotes: [10, 8, 72, 10] },
      { id: 8, levelName: "Residente Sênior", question: "Qual efeito cardiovascular benéfico é atribuído à Empagliflozina?", options: ["Redução do LDL", "Redução de hospitalização por IC", "Aumento da FC", "Broncodilatação"], correctIndex: 1, hint: "O estudo EMPA-REG OUTCOME demonstrou esse benefício.", audienceVotes: [12, 68, 10, 10] },
      { id: 9, levelName: "Residente Sênior", question: "Qual é o principal risco das sulfonilureias em idosos?", options: ["Cetoacidose", "Hipoglicemia", "Hepatotoxicidade", "Nefrotoxicidade"], correctIndex: 1, hint: "Estimulam a secreção de insulina independente da glicemia.", audienceVotes: [8, 74, 10, 8] },
      { id: 10, levelName: "Especialista", question: "Qual análogo de GLP-1 é administrado por via oral?", options: ["Liraglutida", "Dulaglutida", "Semaglutida", "Exenatida"], correctIndex: 2, hint: "Foi o primeiro agonista GLP-1 disponível em comprimido.", audienceVotes: [15, 10, 65, 10] },
      { id: 11, levelName: "Especialista", question: "No manejo da cetoacidose diabética, qual é a primeira medida?", options: ["Insulina em bolus IV", "Reposição volêmica com SF 0,9%", "Bicarbonato de sódio", "Glicose hipertônica"], correctIndex: 1, hint: "A desidratação é frequentemente severa e deve ser corrigida primeiro.", audienceVotes: [20, 62, 10, 8] },
      { id: 12, levelName: "Especialista", question: "Qual antidiabético oral está associado a ganho ponderal por retenção hídrica?", options: ["Metformina", "Pioglitazona", "Dapagliflozina", "Vildagliptina"], correctIndex: 1, hint: "Atua como agonista PPAR-gama e pode causar edema periférico.", audienceVotes: [8, 68, 14, 10] },
      { id: 13, levelName: "Chefe de Clínica", question: "Paciente com DM2, IC com FE reduzida e DRC estágio 3. Qual a melhor terapia complementar?", options: ["Glibenclamida", "Pioglitazona", "Dapagliflozina", "Acarbose"], correctIndex: 2, hint: "Benefício cardio-renal comprovado nos estudos DAPA-HF e DAPA-CKD.", audienceVotes: [5, 8, 78, 9] },
      { id: 14, levelName: "Chefe de Clínica", question: "Qual é a principal causa de falha secundária às sulfonilureias?", options: ["Resistência hepática", "Exaustão das células beta", "Absorção intestinal reduzida", "Metabolização CYP rápida"], correctIndex: 1, hint: "O estímulo crônico leva à apoptose progressiva das células produtoras de insulina.", audienceVotes: [12, 70, 10, 8] },
      { id: 15, levelName: "Chefe de Clínica", question: "No DM1, qual esquema insulínico melhor simula a secreção fisiológica?", options: ["NPH 2x/dia isolada", "Regular pré-prandial isolada", "Basal-bolus (Glargina + Lispro)", "Pré-mistura 70/30 2x/dia"], correctIndex: 2, hint: "Combina uma insulina basal de ação longa com bolus de ação ultrarrápida às refeições.", audienceVotes: [5, 8, 78, 9] },
    ],
  },
  {
    id: "hipertensao",
    label: "Tratamento da Hipertensão",
    icon: "❤️",
    questions: [
      { id: 1, levelName: "Interno", question: "Qual classe de anti-hipertensivos inibe a enzima conversora de angiotensina?", options: ["Betabloqueadores", "IECA", "BCC", "Diuréticos"], correctIndex: 1, hint: "Captopril e Enalapril são exemplos clássicos dessa classe.", audienceVotes: [8, 74, 10, 8] },
      { id: 2, levelName: "Interno", question: "Qual é o anti-hipertensivo mais associado à tosse seca como efeito adverso?", options: ["Losartana", "Enalapril", "Anlodipino", "Hidroclorotiazida"], correctIndex: 1, hint: "A tosse é causada pelo acúmulo de bradicinina.", audienceVotes: [12, 68, 10, 10] },
      { id: 3, levelName: "Interno", question: "Qual é a meta pressórica geral para a maioria dos hipertensos adultos?", options: ["< 160/100 mmHg", "< 140/90 mmHg", "< 120/70 mmHg", "< 150/95 mmHg"], correctIndex: 1, hint: "É o alvo recomendado pelas diretrizes brasileiras de hipertensão.", audienceVotes: [5, 75, 12, 8] },
      { id: 4, levelName: "Residente Júnior", question: "Em paciente negro com HAS, qual classe é preferida como monoterapia inicial?", options: ["IECA", "Betabloqueador", "BCC ou Diurético tiazídico", "BRA"], correctIndex: 2, hint: "Estudos mostram menor resposta ao bloqueio do SRAA nessa população.", audienceVotes: [10, 8, 72, 10] },
      { id: 5, levelName: "Residente Júnior", question: "Qual diurético é mais usado no tratamento crônico da hipertensão?", options: ["Furosemida", "Espironolactona", "Hidroclorotiazida", "Manitol"], correctIndex: 2, hint: "É um tiazídico de baixo custo e amplamente disponível no SUS.", audienceVotes: [15, 8, 67, 10] },
      { id: 6, levelName: "Residente Júnior", question: "Qual anti-hipertensivo é primeira escolha em gestantes?", options: ["Enalapril", "Metildopa", "Losartana", "Atenolol"], correctIndex: 1, hint: "IECA e BRA são teratogênicos e contraindicados na gestação.", audienceVotes: [5, 75, 10, 10] },
      { id: 7, levelName: "Residente Sênior", question: "Na emergência hipertensiva, qual é a via de administração preferida?", options: ["Via oral", "Via intravenosa", "Via intramuscular", "Via sublingual"], correctIndex: 1, hint: "Permite titulação precisa da redução pressórica nas primeiras horas.", audienceVotes: [5, 78, 8, 9] },
      { id: 8, levelName: "Residente Sênior", question: "Qual BCC diidropiridínico de longa ação é amplamente usado na HAS?", options: ["Verapamil", "Diltiazem", "Anlodipino", "Nifedipino sublingual"], correctIndex: 2, hint: "Tem meia-vida longa e perfil vasodilatador predominante.", audienceVotes: [10, 10, 70, 10] },
      { id: 9, levelName: "Residente Sênior", question: "Paciente hipertenso e diabético. Qual classe reduz a proteinúria?", options: ["BCC", "Betabloqueador", "IECA/BRA", "Diurético de alça"], correctIndex: 2, hint: "Reduzem a pressão intraglomerular por dilatação da arteríola eferente.", audienceVotes: [8, 8, 76, 8] },
      { id: 10, levelName: "Especialista", question: "Qual é o mecanismo do Sacubitril/Valsartana na IC com HAS associada?", options: ["Inibição da renina", "Inibição da neprilisina + bloqueio AT1", "Bloqueio beta-adrenérgico", "Inibição da aldosterona"], correctIndex: 1, hint: "É um ARNI (Angiotensin Receptor-Neprilysin Inhibitor).", audienceVotes: [10, 70, 10, 10] },
      { id: 11, levelName: "Especialista", question: "Qual é o 4º fármaco recomendado na HAS resistente?", options: ["Clonidina", "Espironolactona", "Hidralazina", "Prazosina"], correctIndex: 1, hint: "O estudo PATHWAY-2 demonstrou superioridade desse fármaco.", audienceVotes: [10, 72, 10, 8] },
      { id: 12, levelName: "Especialista", question: "Qual betabloqueador possui ação vasodilatadora adicional?", options: ["Atenolol", "Propranolol", "Carvedilol", "Metoprolol"], correctIndex: 2, hint: "Bloqueia receptores alfa-1 além dos beta-adrenérgicos.", audienceVotes: [8, 10, 72, 10] },
      { id: 13, levelName: "Chefe de Clínica", question: "No feocromocitoma, por que betabloqueador isolado é contraindicado inicialmente?", options: ["Causa taquicardia reflexa", "Bloqueia a ação das catecolaminas", "Permite estimulação alfa sem oposição, agravando a HAS", "Reduz o débito cardíaco excessivamente"], correctIndex: 2, hint: "Deve-se primeiro bloquear alfa com fenoxibenzamina antes de iniciar beta.", audienceVotes: [10, 8, 72, 10] },
      { id: 14, levelName: "Chefe de Clínica", question: "Qual é a causa mais comum de hipertensão secundária?", options: ["Feocromocitoma", "Coarctação da aorta", "Doença renal crônica", "Hiperaldosteronismo primário"], correctIndex: 2, hint: "A perda de néfrons leva à retenção de sódio e água.", audienceVotes: [5, 8, 75, 12] },
      { id: 15, levelName: "Chefe de Clínica", question: "No tratamento da crise hipertensiva com dissecção aórtica, qual classe é mais indicada?", options: ["Diurético de alça", "Betabloqueador IV", "IECA", "BCC diidropiridínico"], correctIndex: 1, hint: "Reduz a frequência cardíaca e a força de cisalhamento na parede aórtica.", audienceVotes: [5, 78, 8, 9] },
    ],
  },
  {
    id: "antibioticos",
    label: "Antibioticoterapia",
    icon: "🦠",
    questions: [
      { id: 1, levelName: "Interno", question: "Qual antibiótico é primeira escolha para faringite estreptocócica?", options: ["Azitromicina", "Amoxicilina", "Ciprofloxacino", "Metronidazol"], correctIndex: 1, hint: "É uma penicilina de amplo espectro com boa disponibilidade oral.", audienceVotes: [12, 70, 10, 8] },
      { id: 2, levelName: "Interno", question: "Qual é o mecanismo de ação das penicilinas?", options: ["Inibição da síntese proteica", "Inibição da síntese de parede celular", "Inibição da DNA girase", "Desestabilização da membrana"], correctIndex: 1, hint: "Ligam-se às PBPs (Proteínas Ligadoras de Penicilina).", audienceVotes: [8, 74, 10, 8] },
      { id: 3, levelName: "Interno", question: "Qual antibiótico é contraindicado em crianças por afetar a cartilagem?", options: ["Amoxicilina", "Cefalexina", "Ciprofloxacino", "Azitromicina"], correctIndex: 2, hint: "As fluoroquinolonas podem causar artropatia em animais jovens.", audienceVotes: [5, 8, 78, 9] },
      { id: 4, levelName: "Residente Júnior", question: "Qual é o antibiótico de escolha para ITU não complicada em mulheres?", options: ["Amoxicilina", "Nitrofurantoína", "Ceftriaxona", "Vancomicina"], correctIndex: 1, hint: "Atinge altas concentrações urinárias e tem baixa resistência.", audienceVotes: [10, 70, 12, 8] },
      { id: 5, levelName: "Residente Júnior", question: "Qual é o espectro de ação do Metronidazol?", options: ["Gram-positivos aeróbios", "Anaeróbios e protozoários", "Gram-negativos aeróbios", "Micobactérias"], correctIndex: 1, hint: "É a droga de escolha para Clostridium difficile e amebíase.", audienceVotes: [8, 72, 12, 8] },
      { id: 6, levelName: "Residente Júnior", question: "A associação Amoxicilina + Clavulanato visa combater qual mecanismo de resistência?", options: ["Bomba de efluxo", "Produção de beta-lactamase", "Alteração do ribossomo", "Mutação da DNA girase"], correctIndex: 1, hint: "O clavulanato é um inibidor suicida dessa enzima bacteriana.", audienceVotes: [8, 74, 10, 8] },
      { id: 7, levelName: "Residente Sênior", question: "Qual antibiótico requer monitorização de nível sérico (TDM) por nefro e ototoxicidade?", options: ["Azitromicina", "Vancomicina", "Amoxicilina", "Doxiciclina"], correctIndex: 1, hint: "É um glicopeptídeo usado contra MRSA e Clostridium.", audienceVotes: [5, 78, 8, 9] },
      { id: 8, levelName: "Residente Sênior", question: "No tratamento da pneumonia comunitária grave, qual esquema é frequente?", options: ["Amoxicilina VO", "Ceftriaxona + Azitromicina IV", "Metronidazol isolado", "Ciprofloxacino VO"], correctIndex: 1, hint: "Cobre patógenos típicos e atípicos simultaneamente.", audienceVotes: [5, 75, 10, 10] },
      { id: 9, levelName: "Residente Sênior", question: "Qual é o mecanismo de ação dos aminoglicosídeos?", options: ["Inibição da subunidade 30S do ribossomo", "Inibição da parede celular", "Inibição da RNA polimerase", "Inibição do folato"], correctIndex: 0, hint: "Ligam-se irreversivelmente à subunidade menor do ribossomo.", audienceVotes: [72, 10, 10, 8] },
      { id: 10, levelName: "Especialista", question: "Qual carbapenêmico NÃO tem ação contra Pseudomonas aeruginosa?", options: ["Meropenem", "Imipenem", "Ertapenem", "Doripenem"], correctIndex: 2, hint: "É o único carbapenêmico administrado 1x/dia e tem espectro mais estreito.", audienceVotes: [10, 10, 68, 12] },
      { id: 11, levelName: "Especialista", question: "Na meningite bacteriana do adulto, qual antibiótico empírico é padrão?", options: ["Amoxicilina", "Ceftriaxona", "Metronidazol", "Azitromicina"], correctIndex: 1, hint: "Boa penetração na barreira hematoencefálica e cobertura para Neisseria e Pneumococo.", audienceVotes: [5, 78, 8, 9] },
      { id: 12, levelName: "Especialista", question: "Qual é a principal preocupação com o uso prolongado de Linezolida?", options: ["Nefrotoxicidade", "Trombocitopenia e neuropatia", "Ototoxicidade", "Hepatotoxicidade fulminante"], correctIndex: 1, hint: "Inibe a MAO e pode causar toxicidade medular após 2+ semanas.", audienceVotes: [10, 70, 12, 8] },
      { id: 13, levelName: "Chefe de Clínica", question: "Na endocardite por MRSA, qual é o esquema preferido?", options: ["Vancomicina + Gentamicina", "Vancomicina (ou Daptomicina)", "Ceftriaxona + Oxacilina", "Linezolida isolada"], correctIndex: 1, hint: "Daptomicina é alternativa à Vancomicina, mas Linezolida tem baixa atividade bactericida.", audienceVotes: [15, 65, 12, 8] },
      { id: 14, levelName: "Chefe de Clínica", question: "Qual mecanismo explica a resistência de KPC (Klebsiella produtora de carbapenemase)?", options: ["Bomba de efluxo", "Alteração de PBP", "Produção de enzima que hidrolisa carbapenêmicos", "Impermeabilidade de membrana"], correctIndex: 2, hint: "A enzima KPC (classe A de Ambler) degrada praticamente todos os beta-lactâmicos.", audienceVotes: [8, 10, 72, 10] },
      { id: 15, levelName: "Chefe de Clínica", question: "No tratamento da tuberculose, o esquema RIPE inclui quais fármacos?", options: ["Rifampicina, Isoniazida, Pirazinamida, Etambutol", "Rifampicina, Imipenem, Penicilina, Eritromicina", "Ranitidina, Isoniazida, Prednisona, Estreptomicina", "Rifampicina, Ibuprofeno, Pirimetamina, Etionamida"], correctIndex: 0, hint: "São os 4 fármacos da fase intensiva (2 meses) do tratamento.", audienceVotes: [78, 5, 8, 9] },
    ],
  },
  {
    id: "psicofarmaco",
    label: "Psicofarmacologia",
    icon: "🧠",
    questions: [
      { id: 1, levelName: "Interno", question: "Qual classe de antidepressivos é considerada primeira linha no tratamento da depressão?", options: ["Tricíclicos", "ISRS", "IMAO", "Antipsicóticos"], correctIndex: 1, hint: "Inibidores Seletivos da Recaptação de Serotonina — fluoxetina, sertralina.", audienceVotes: [10, 72, 10, 8] },
      { id: 2, levelName: "Interno", question: "Qual benzodiazepínico tem meia-vida mais longa?", options: ["Alprazolam", "Midazolam", "Diazepam", "Lorazepam"], correctIndex: 2, hint: "Possui metabólitos ativos que prolongam seu efeito por dias.", audienceVotes: [12, 8, 70, 10] },
      { id: 3, levelName: "Interno", question: "Qual é o antídoto para intoxicação por benzodiazepínicos?", options: ["Naloxona", "Flumazenil", "N-acetilcisteína", "Atropina"], correctIndex: 1, hint: "É um antagonista competitivo do receptor GABA-A.", audienceVotes: [12, 72, 8, 8] },
      { id: 4, levelName: "Residente Júnior", question: "Qual antidepressivo é mais associado à Síndrome Serotoninérgica quando combinado com IMAO?", options: ["Bupropiona", "Mirtazapina", "Fluoxetina", "Trazodona"], correctIndex: 2, hint: "Tem meia-vida muito longa (inclui metabólito norfluoxetina).", audienceVotes: [8, 10, 72, 10] },
      { id: 5, levelName: "Residente Júnior", question: "Qual estabilizador de humor requer monitorização de função tireoidiana?", options: ["Valproato", "Carbamazepina", "Lítio", "Lamotrigina"], correctIndex: 2, hint: "Pode causar hipotireoidismo e diabetes insípidus nefrogênico.", audienceVotes: [10, 10, 70, 10] },
      { id: 6, levelName: "Residente Júnior", question: "Qual antipsicótico atípico tem maior risco de síndrome metabólica?", options: ["Aripiprazol", "Risperidona", "Olanzapina", "Ziprasidona"], correctIndex: 2, hint: "Causa ganho de peso significativo, dislipidemia e hiperglicemia.", audienceVotes: [5, 12, 73, 10] },
      { id: 7, levelName: "Residente Sênior", question: "Qual é o mecanismo de ação do Aripiprazol?", options: ["Antagonista D2 puro", "Agonista parcial D2 e 5-HT1A", "Agonista total D2", "Inibidor da recaptação de dopamina"], correctIndex: 1, hint: "Funciona como estabilizador do sistema dopaminérgico.", audienceVotes: [10, 72, 8, 10] },
      { id: 8, levelName: "Residente Sênior", question: "Qual efeito adverso grave é exclusivo da Clozapina?", options: ["Parkinsonismo", "Agranulocitose", "Acatisia", "Discinesia tardia"], correctIndex: 1, hint: "Exige hemograma semanal nas primeiras semanas de tratamento.", audienceVotes: [8, 74, 10, 8] },
      { id: 9, levelName: "Residente Sênior", question: "Qual ISRS é preferido em idosos por ter menos interações CYP?", options: ["Fluoxetina", "Paroxetina", "Sertralina", "Fluvoxamina"], correctIndex: 2, hint: "Tem perfil farmacocinético mais limpo e menos inibição enzimática.", audienceVotes: [8, 10, 72, 10] },
      { id: 10, levelName: "Especialista", question: "No TDAH adulto, qual é o mecanismo do Metilfenidato?", options: ["Agonista GABA", "Bloqueio da recaptação de dopamina e noradrenalina", "Inibição da MAO-B", "Agonismo 5-HT2A"], correctIndex: 1, hint: "É um psicoestimulante que aumenta a disponibilidade de catecolaminas na fenda sináptica.", audienceVotes: [5, 78, 8, 9] },
      { id: 11, levelName: "Especialista", question: "Qual antidepressivo é mais indicado para cessação tabágica?", options: ["Sertralina", "Bupropiona", "Venlafaxina", "Amitriptilina"], correctIndex: 1, hint: "Inibe a recaptação de noradrenalina e dopamina, sem ação serotoninérgica.", audienceVotes: [8, 74, 10, 8] },
      { id: 12, levelName: "Especialista", question: "A Síndrome Neuroléptica Maligna é caracterizada por qual tríade?", options: ["Febre, rigidez muscular, disautonomia", "Tremor, bradicardia, hipotermia", "Agitação, diarreia, mioclonias", "Sedação, hipotensão, miose"], correctIndex: 0, hint: "É uma emergência psiquiátrica causada por bloqueio dopaminérgico intenso.", audienceVotes: [74, 8, 10, 8] },
      { id: 13, levelName: "Chefe de Clínica", question: "Na depressão resistente, qual estratégia potencializa ISRS com melhor evidência?", options: ["Adicionar benzodiazepínico", "Associar Lítio ou Aripiprazol", "Dobrar a dose do ISRS", "Trocar para IMAO imediatamente"], correctIndex: 1, hint: "Augmentação com Lítio ou antipsicótico atípico tem forte evidência em guidelines.", audienceVotes: [5, 75, 12, 8] },
      { id: 14, levelName: "Chefe de Clínica", question: "Qual é a janela terapêutica do Lítio para manutenção no transtorno bipolar?", options: ["0,2-0,4 mEq/L", "0,6-1,0 mEq/L", "1,5-2,0 mEq/L", "2,5-3,0 mEq/L"], correctIndex: 1, hint: "Acima de 1,5 mEq/L já há risco de toxicidade.", audienceVotes: [5, 78, 10, 7] },
      { id: 15, levelName: "Chefe de Clínica", question: "Na gestação, qual estabilizador de humor tem menor teratogenicidade?", options: ["Valproato", "Carbamazepina", "Lamotrigina", "Lítio"], correctIndex: 2, hint: "O Valproato é o de maior risco (defeitos no tubo neural).", audienceVotes: [3, 8, 78, 11] },
    ],
  },
  {
    id: "dor",
    label: "Farmacologia da Dor",
    icon: "💊",
    questions: [
      { id: 1, levelName: "Interno", question: "Qual é o mecanismo de ação do Paracetamol?", options: ["Inibição da COX-1 periférica", "Inibição central da COX e sistema endocanabinóide", "Agonismo opioide mu", "Bloqueio de canais de sódio"], correctIndex: 1, hint: "Diferente dos AINEs, tem pouca ação anti-inflamatória periférica.", audienceVotes: [15, 68, 10, 7] },
      { id: 2, levelName: "Interno", question: "Qual é a dose máxima diária segura de Paracetamol em adultos?", options: ["2g/dia", "3g/dia", "4g/dia", "6g/dia"], correctIndex: 2, hint: "Acima disso, há risco de hepatotoxicidade grave.", audienceVotes: [8, 12, 72, 8] },
      { id: 3, levelName: "Interno", question: "Qual AINE é mais seletivo para COX-2?", options: ["Ibuprofeno", "Naproxeno", "Celecoxibe", "AAS"], correctIndex: 2, hint: "Foi desenvolvido para reduzir efeitos gastrointestinais.", audienceVotes: [8, 10, 74, 8] },
      { id: 4, levelName: "Residente Júnior", question: "Qual opioide é considerado fraco e usado no 2º degrau da escada da OMS?", options: ["Morfina", "Tramadol", "Fentanil", "Metadona"], correctIndex: 1, hint: "Também tem ação inibitória sobre a recaptação de noradrenalina e serotonina.", audienceVotes: [8, 72, 12, 8] },
      { id: 5, levelName: "Residente Júnior", question: "Qual é o antídoto para intoxicação por opioides?", options: ["Flumazenil", "N-acetilcisteína", "Naloxona", "Atropina"], correctIndex: 2, hint: "Antagonista competitivo do receptor mu, com ação rápida mas curta.", audienceVotes: [8, 5, 78, 9] },
      { id: 6, levelName: "Residente Júnior", question: "A Dipirona é contraindicada em alguns países por risco de:", options: ["Hepatotoxicidade", "Nefrotoxicidade", "Agranulocitose", "Cardiotoxicidade"], correctIndex: 2, hint: "É uma reação idiossincrática rara mas potencialmente fatal.", audienceVotes: [10, 10, 70, 10] },
      { id: 7, levelName: "Residente Sênior", question: "Qual adjuvante é usado na dor neuropática como primeira linha?", options: ["Paracetamol", "Gabapentina/Pregabalina", "Ibuprofeno", "Tramadol"], correctIndex: 1, hint: "Atuam nos canais de cálcio voltagem-dependentes (subunidade alfa-2-delta).", audienceVotes: [5, 75, 10, 10] },
      { id: 8, levelName: "Residente Sênior", question: "Qual opioide tem maior risco de prolongamento do intervalo QT?", options: ["Morfina", "Codeína", "Metadona", "Oxicodona"], correctIndex: 2, hint: "Também tem meia-vida muito longa e variável entre pacientes.", audienceVotes: [8, 8, 74, 10] },
      { id: 9, levelName: "Residente Sênior", question: "Na escada analgésica da OMS, o 3º degrau inclui:", options: ["AINEs isolados", "Opioides fracos + AINEs", "Opioides fortes ± adjuvantes", "Procedimentos intervencionistas"], correctIndex: 2, hint: "Morfina, fentanil e oxicodona são exemplos desse degrau.", audienceVotes: [5, 10, 77, 8] },
      { id: 10, levelName: "Especialista", question: "Qual é o mecanismo da hiperalgesia induzida por opioides?", options: ["Downregulation de receptores mu", "Ativação de vias NMDA e sensibilização central", "Acúmulo de metabólitos analgésicos", "Tolerância cruzada com AINEs"], correctIndex: 1, hint: "Paradoxalmente, o opioide aumenta a sensibilidade à dor por neuroplasticidade.", audienceVotes: [12, 70, 10, 8] },
      { id: 11, levelName: "Especialista", question: "Qual antidepressivo tricíclico é mais usado como adjuvante na dor crônica?", options: ["Fluoxetina", "Amitriptilina", "Bupropiona", "Sertralina"], correctIndex: 1, hint: "Atua em vias descendentes inibitórias da dor (noradrenérgicas e serotoninérgicas).", audienceVotes: [5, 78, 8, 9] },
      { id: 12, levelName: "Especialista", question: "Qual é a principal vantagem da via transdérmica de fentanil?", options: ["Início de ação rápido", "Liberação contínua por 72h", "Menor risco de dependência", "Sem efeitos adversos"], correctIndex: 1, hint: "O adesivo libera o fármaco de forma constante, ideal para dor crônica estável.", audienceVotes: [10, 72, 10, 8] },
      { id: 13, levelName: "Chefe de Clínica", question: "Na rotação de opioides, por que se aplica redução de 25-50% da dose equianalgésica?", options: ["Tolerância completa entre opioides", "Tolerância cruzada incompleta", "Metabolismo idêntico entre opioides", "Efeito placebo da troca"], correctIndex: 1, hint: "Há tolerância parcial, e a dose calculada pode ser excessiva sem a redução.", audienceVotes: [8, 74, 10, 8] },
      { id: 14, levelName: "Chefe de Clínica", question: "Qual AINE deve ser evitado em paciente com história de infarto recente?", options: ["Naproxeno", "Ibuprofeno", "Diclofenaco", "Todos os inibidores de COX-2"], correctIndex: 3, hint: "Os coxibes aumentam o risco trombótico cardiovascular.", audienceVotes: [8, 8, 10, 74] },
      { id: 15, levelName: "Chefe de Clínica", question: "Na dor oncológica refratária, qual técnica intervencionista pode ser usada?", options: ["Acupuntura isolada", "Bloqueio do plexo celíaco ou bomba intratecal", "Aumento infinito de opioide VO", "Suspensão de todos os analgésicos"], correctIndex: 1, hint: "Permite analgesia com doses menores e menos efeitos sistêmicos.", audienceVotes: [5, 78, 8, 9] },
    ],
  },
];

const letters = ["A", "B", "C", "D"];

export default function MilionarioFarmaGame({ customData }: { customData?: any }) {
  const contexts: GameContext[] = customData?.contexts || defaultContexts;

  const [selectedContext, setSelectedContext] = useState<string | null>(null);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [gameStatus, setGameStatus] = useState<"playing" | "won" | "lost">("playing");
  const [usedFiftyFifty, setUsedFiftyFifty] = useState(false);
  const [usedPhone, setUsedPhone] = useState(false);
  const [usedAudience, setUsedAudience] = useState(false);
  const [hiddenOptions, setHiddenOptions] = useState<Set<number>>(new Set());
  const [showAudience, setShowAudience] = useState(false);
  const [score, setScore] = useState(0);

  const currentContext = contexts.find((c) => c.id === selectedContext);
  const questions = currentContext?.questions || [];
  const q = questions[qIndex];

  const restart = () => {
    setQIndex(0); setSelected(null); setIsRevealing(false); setRevealed(false);
    setGameStatus("playing"); setUsedFiftyFifty(false); setUsedPhone(false);
    setUsedAudience(false); setHiddenOptions(new Set()); setShowAudience(false); setScore(0);
  };

  const backToContexts = () => { setSelectedContext(null); restart(); };

  const handleSelect = (i: number) => { if (isRevealing || revealed || selected !== null || hiddenOptions.has(i)) return; setSelected(i); };

  const handleConfirm = () => {
    if (selected === null) return;
    setIsRevealing(true); setShowAudience(false);
    setTimeout(() => {
      setRevealed(true); setIsRevealing(false);
      const correct = selected === q.correctIndex;
      if (correct) setScore((s) => s + 1);
      setTimeout(() => {
        if (!correct) setGameStatus("lost");
        else if (qIndex === questions.length - 1) setGameStatus("won");
        else { setQIndex((i) => i + 1); setSelected(null); setRevealed(false); setHiddenOptions(new Set()); setShowAudience(false); }
      }, 2000);
    }, 2500);
  };

  const useFiftyFifty = () => { if (usedFiftyFifty) return; setUsedFiftyFifty(true); const wrong = q.options.map((_, i) => i).filter((i) => i !== q.correctIndex); const toHide = wrong.sort(() => Math.random() - 0.5).slice(0, 2); setHiddenOptions(new Set(toHide)); };
  const usePhone = () => { if (usedPhone) return; setUsedPhone(true); toast.info(`Preceptor diz: "${q.hint}"`, { duration: 8000 }); };
  const useAudience = () => { if (usedAudience) return; setUsedAudience(true); setShowAudience(true); };

  // Context selector screen
  if (!selectedContext) {
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
              onClick={() => { setSelectedContext(ctx.id); restart(); }}
              className="rounded-xl border-2 border-blue-500/30 bg-blue-950/20 p-5 text-left transition-all duration-200 hover:border-blue-400/60 hover:bg-blue-950/40 hover:scale-[1.02] cursor-pointer group"
            >
              <div className="text-3xl mb-2">{ctx.icon}</div>
              <p className="font-semibold text-foreground group-hover:text-blue-300 transition-colors">{ctx.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{ctx.questions.length} perguntas</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // End screen
  if (gameStatus !== "playing") {
    const won = gameStatus === "won";
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <div className={`rounded-full p-6 ${won ? "bg-yellow-900/40" : "bg-red-900/40"}`}>{won ? <Award className="h-16 w-16 text-yellow-400" /> : <XCircle className="h-16 w-16 text-red-400" />}</div>
        <h2 className={`text-2xl font-bold ${won ? "text-yellow-400" : "text-red-400"}`}>{won ? "Parabéns, Chefe de Clínica!" : "O seu plantão terminou."}</h2>
        <p className="text-muted-foreground max-w-md">
          {won
            ? `Você acertou todas as ${questions.length} perguntas de ${currentContext?.label}! Raciocínio farmacoterapêutico impecável!`
            : `Você acertou ${score} de ${qIndex + 1} perguntas em ${currentContext?.label}. Volte a estudar e tente novamente.`}
        </p>
        <div className="flex gap-3">
          <Button onClick={restart} variant="outline" className="gap-2">Tentar Novamente</Button>
          <Button onClick={backToContexts} variant="ghost" className="gap-2">Trocar Contexto</Button>
        </div>
      </div>
    );
  }

  // Game screen
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <button onClick={backToContexts} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 mb-1 cursor-pointer">
            ← {currentContext?.icon} {currentContext?.label}
          </button>
          <p className="text-sm text-muted-foreground">Pergunta {qIndex + 1} / {questions.length}</p>
          <p className="font-bold text-foreground flex items-center gap-2"><Stethoscope className="h-4 w-4 text-cyan-400" />Nível: {q.levelName}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={useFiftyFifty} disabled={usedFiftyFifty || selected !== null} className={`w-10 h-10 rounded-full flex items-center justify-center border transition-colors ${usedFiftyFifty ? "opacity-40 border-border cursor-not-allowed" : "border-blue-500 text-blue-400 hover:bg-blue-500/20 cursor-pointer"}`} title="Revisão de Literatura (50/50)"><BookOpen className="h-4 w-4" /></button>
          <button onClick={usePhone} disabled={usedPhone || selected !== null} className={`w-10 h-10 rounded-full flex items-center justify-center border transition-colors ${usedPhone ? "opacity-40 border-border cursor-not-allowed" : "border-green-500 text-green-400 hover:bg-green-500/20 cursor-pointer"}`} title="Ligar para o Preceptor"><PhoneCall className="h-4 w-4" /></button>
          <button onClick={useAudience} disabled={usedAudience || selected !== null} className={`w-10 h-10 rounded-full flex items-center justify-center border transition-colors ${usedAudience ? "opacity-40 border-border cursor-not-allowed" : "border-purple-500 text-purple-400 hover:bg-purple-500/20 cursor-pointer"}`} title="Reunião Clínica"><Users className="h-4 w-4" /></button>
        </div>
      </div>
      <Progress value={((qIndex) / questions.length) * 100} className="h-1.5" />
      <div className="rounded-xl border border-blue-500/40 bg-blue-950/40 backdrop-blur-sm p-6"><p className="text-foreground text-lg font-medium leading-relaxed">{q.question}</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {q.options.map((opt, i) => {
          if (hiddenOptions.has(i)) return <div key={i} className="rounded-lg border border-border bg-muted/30 p-4 opacity-30 h-full" />;
          let style = "border-blue-500/30 bg-blue-950/20 text-foreground hover:border-blue-400/60 cursor-pointer";
          if (selected === i && !revealed) style = "border-yellow-400 bg-yellow-500/20 text-yellow-100 animate-pulse";
          if (revealed) { if (i === q.correctIndex) style = "border-green-400 bg-green-600 text-white"; else if (i === selected) style = "border-red-400 bg-red-600 text-white"; }
          const disabled = (selected !== null && selected !== i && !revealed) || isRevealing || revealed;
          return (
            <button key={i} onClick={() => handleSelect(i)} disabled={disabled} className={`rounded-lg border-2 p-4 text-left transition-all duration-300 flex items-start gap-3 ${style} ${disabled && selected !== i ? "opacity-60 cursor-not-allowed" : ""}`}>
              <span className="shrink-0 w-8 h-8 rounded-md bg-blue-500/20 flex items-center justify-center font-bold text-sm text-blue-300">{letters[i]}</span>
              <span className="flex-1 text-sm font-medium">{opt}</span>
              {showAudience && <span className="shrink-0 text-xs font-mono text-muted-foreground">{q.audienceVotes[i]}%</span>}
            </button>
          );
        })}
      </div>
      {selected !== null && !revealed && !isRevealing && (<div className="flex justify-center animate-in fade-in"><Button size="lg" onClick={handleConfirm} className="gap-2 bg-yellow-600 hover:bg-yellow-700 text-white">Confirmar Decisão Clínica</Button></div>)}
      {isRevealing && <p className="text-center text-muted-foreground animate-pulse text-sm">A verificar resposta...</p>}
    </div>
  );
}
