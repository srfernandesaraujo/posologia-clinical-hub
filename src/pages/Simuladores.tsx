import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import {
  FlaskConical, Search, Pill, Bug, Activity, ClipboardList, Syringe, Lock, Crown, Plus, Share2,
  HeartPulse, PillBottle, Zap, Brain, Heart, Droplets, Beaker, Shield, Flame, TestTube, Dna,
  BookOpen, Scan, Accessibility, ChevronRight, LayoutGrid, List,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useMemo, useRef, useEffect } from "react";
import { useFeatureGating } from "@/hooks/useFeatureGating";
import { UpgradeModal } from "@/components/UpgradeModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreateToolDialog } from "@/components/CreateToolDialog";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const NATIVE_SIMULATORS = [
  { slug: "metodo-soap", name: "Simulador do Método SOAP", description: "Treine a documentação clínica estruturada: Subjetivo, Objetivo, Avaliação e Plano.", icon: ClipboardList, category: "Farmácia Clínica" },
  { slug: "mai", name: "Simulador MAI", description: "Medication Appropriateness Index – Avalie a adequação de cada medicamento em 10 critérios.", icon: ClipboardList, category: "Farmácia Clínica" },
  { slug: "cascata-prescricao", name: "Simulador de Cascata de Prescrição", description: "Identifique medicamentos prescritos para tratar efeitos adversos de outros.", icon: ClipboardList, category: "Farmácia Clínica" },
  { slug: "prm", name: "Simulador de PRM", description: "Problemas Relacionados a Medicamentos – Avalie prescrições e identifique erros.", icon: Pill, category: "Farmácia Clínica" },
  { slug: "antimicrobianos", name: "Simulador de Antimicrobial Stewardship", description: "Terapia empírica e descalonamento baseado em antibiograma.", icon: Bug, category: "Infectologia" },
  { slug: "tdm", name: "Simulador TDM", description: "Monitoramento Terapêutico de Fármacos – Ajuste de doses de medicamentos de baixo índice terapêutico.", icon: Activity, category: "Farmacocinética" },
  { slug: "acompanhamento", name: "Simulador de Acompanhamento Farmacoterapêutico", description: "Monitore pacientes crônicos ao longo de várias consultas.", icon: ClipboardList, category: "Farmácia Clínica" },
  { slug: "insulina", name: "Simulador de Dose de Insulina", description: "Treinamento de insulinoterapia intensiva baseado no livro Koda-Kimble.", icon: Syringe, category: "Endocrinologia" },
  { slug: "bomba-infusao", name: "Simulador de Bomba de Infusão", description: "Treinamento de programação de bombas de seringa/equipo com drug library e alarmes de segurança.", icon: HeartPulse, category: "Enfermagem / UTI" },
  { slug: "desmame-benzo", name: "Desmame de Benzodiazepínicos", description: "Planejamento de redução gradual baseado no Protocolo de Ashton com check-in de sintomas.", icon: PillBottle, category: "Psiquiatria" },
  { slug: "interacoes", name: "Interações Medicamentosas", description: "Analise interações entre fármacos com dados do RxNav (NIH) e cenários clínicos.", icon: Zap, category: "Farmacologia Clínica" },
  { slug: "manejo-dor", name: "Manejo da Dor e Analgesia", description: "Classifique a dor (aguda, neuropática, fibromialgia, oncológica) e prescreva pelo protocolo da Escada Analgésica da OMS.", icon: HeartPulse, category: "Farmacologia Clínica" },
  { slug: "inflamacao-aines", name: "Inflamação e Anti-inflamatórios", description: "Selecione AINEs e corticoides considerando seletividade COX, pKa, meia-vida, comorbidades e populações especiais.", icon: Flame, category: "Farmacologia Clínica" },
  { slug: "infeccoes-antibioticos", name: "Infecções e Antibioticoterapia", description: "Trate ITU e diarreia infecciosa: algoritmos de seleção, espectro, resistência, grupos especiais e C. difficile.", icon: Bug, category: "Farmacologia Clínica" },
  { slug: "tratamento-asma", name: "Tratamento da Asma", description: "Classifique gravidade, selecione Steps GINA (1-5), interprete espirometria e trate situações especiais (gestante, crise, biológicos).", icon: HeartPulse, category: "Farmacologia Clínica" },
  { slug: "sna", name: "Sistema Nervoso Autônomo", description: "Manipule o tônus simpático e parassimpático e observe alterações na FC, PA, pupila e motilidade GI.", icon: Brain, category: "Fisiologia Humana" },
  { slug: "eletrofisiologia-cardiaca", name: "Eletrofisiologia Cardíaca", description: "Altere a condutância de canais de Na⁺, K⁺ e Ca²⁺ e observe o potencial de ação cardíaco.", icon: Heart, category: "Fisiologia Humana" },
  { slug: "depuracao-renal", name: "Depuração Renal e TFG", description: "Ajuste pressões arteriolares, hidratação e permeabilidade tubular para simular a função renal.", icon: Droplets, category: "Fisiologia Humana" },
  { slug: "equilibrio-acido-base", name: "Equilíbrio Ácido-Base", description: "Injete distúrbios metabólicos/respiratórios e corrija o pH manipulando ventilação e excreção renal.", icon: Beaker, category: "Fisiologia Humana" },
  { slug: "regulacao-glicemica", name: "Regulação Glicêmica", description: "Modele a interação entre carboidratos, insulina pancreática e captação muscular. Simule DM1, DM2 e resistência à insulina.", icon: Droplets, category: "Fisiologia Humana" },
  { slug: "eixo-hpa", name: "Eixo HPA", description: "Simule o feedback negativo hipotálamo-hipófise-adrenal com estresse e corticoides exógenos.", icon: Brain, category: "Fisiologia Humana" },
  { slug: "cinetica-enzimatica", name: "Cinética Enzimática", description: "Explore curvas de Michaelis-Menten e Lineweaver-Burk com inibidores competitivos e não-competitivos.", icon: FlaskConical, category: "Fisiologia Humana" },
  { slug: "secrecao-gastrica", name: "Secreção Ácida Gástrica", description: "Ative e bloqueie receptores da célula parietal (H2, M3, CCK-B) e observe o impacto no pH gástrico.", icon: FlaskConical, category: "Fisiologia Humana" },
  { slug: "cascata-coagulacao", name: "Cascata de Coagulação", description: "Desative fatores de coagulação e simule hemofilias, uso de varfarina, heparina e CIVD.", icon: Shield, category: "Fisiologia Humana" },
  { slug: "compartimentos-adme", name: "Compartimentos ADME", description: "Modelo farmacocinético de 1 compartimento com absorção oral, metabolismo de primeira passagem e eliminação.", icon: Beaker, category: "Fisiologia Humana" },
  { slug: "cadeia-eletrons", name: "Cadeia de Transporte de Eletrões", description: "Fosforilação oxidativa, inibidores de complexos mitocondriais e desacopladores.", icon: Flame, category: "Bioquímica" },
  { slug: "dissociacao-hemoglobina", name: "Dissociação da Hemoglobina", description: "Curva de saturação O₂, efeito Bohr, mioglobina e moduladores alostéricos (pH, pCO₂, BPG).", icon: Droplets, category: "Bioquímica" },
  { slug: "glicolise-gliconeogenese", name: "Glicólise vs. Gliconeogénese", description: "Regulação do metabolismo hepático: insulina vs glucagon, enzimas-chave e fluxo de carbono.", icon: FlaskConical, category: "Bioquímica" },
  { slug: "cinetica-avancada", name: "Cinética Enzimática Avançada", description: "Michaelis-Menten e Lineweaver-Burk com inibição competitiva, não-competitiva e acompetitiva.", icon: FlaskConical, category: "Bioquímica" },
  { slug: "ciclo-ureia", name: "Ciclo da Ureia", description: "Deficiências enzimáticas, acumulação de intermediários e neurotoxicidade da amónia.", icon: Beaker, category: "Bioquímica" },
  { slug: "acido-araquidonico", name: "Cascata do Ácido Araquidónico", description: "Vias COX e LOX, eicosanóides e bloqueios farmacológicos (AINEs, corticosteróides, LOX-i).", icon: Flame, category: "Bioquímica" },
  { slug: "lipoproteinas", name: "Metabolismo das Lipoproteínas", description: "Transporte de colesterol, vias exógena/endógena e efeito de estatinas, fibratos e iPCSK9.", icon: Heart, category: "Bioquímica" },
  { slug: "pentoses-fosfato", name: "Via das Pentoses Fosfato e G6PD", description: "Stresse oxidativo, NADPH, glutationa e hemólise na deficiência de G6PD.", icon: Shield, category: "Bioquímica" },
  { slug: "titulacao-aminoacidos", name: "Titulação de Aminoácidos", description: "Curvas de titulação em tempo real com pKa, pI e carga líquida dinâmica.", icon: TestTube, category: "Bioquímica" },
  { slug: "operon-lac", name: "Operão Lac", description: "Regulação genética bacteriana: CAP-cAMP, repressor LacI e expressão de β-galactosidase.", icon: Dna, category: "Bioquímica" },
  { slug: "dose-resposta", name: "Curva Dose-Resposta", description: "Potência (EC50) vs eficácia (Emax), agonistas parciais e antagonismo competitivo/não-competitivo.", icon: FlaskConical, category: "Farmacologia Básica" },
  { slug: "transducao-sinal", name: "Transdução de Sinal", description: "Cascatas intracelulares GPCR (Gs, Gi, Gq), tirosina quinase, ionotrópico e nuclear com bloqueios farmacológicos.", icon: Brain, category: "Farmacologia Básica" },
  { slug: "janela-terapeutica-farma", name: "Janela Terapêutica e Índice Terapêutico", description: "Compare DE50 vs DL50, calcule o IT e identifique fármacos de janela estreita vs ampla.", icon: Shield, category: "Farmacologia Básica" },
  { slug: "vias-administracao", name: "Vias de Administração", description: "Compare perfis Cp×t para IV bolus, IV infusão, IM, SC, oral e sublingual lado a lado.", icon: Beaker, category: "Farmacologia Básica" },
  { slug: "bloqueio-neuromuscular", name: "Bloqueio Neuromuscular", description: "Despolarizantes vs não-despolarizantes na placa motora, monitorização TOF e reversão com sugammadex/neostigmina.", icon: Zap, category: "Farmacologia Básica" },
  { slug: "farmaco-autonomica", name: "Farmacologia Autonômica Aplicada", description: "Aplique atropina, fenilefrina, propranolol e pilocarpina e observe efeitos em órgãos-alvo.", icon: Heart, category: "Farmacologia Básica" },
  { slug: "tolerancia-dependencia", name: "Tolerância, Dependência e Abstinência", description: "Simule uso crônico de opioides, BZD e álcool: downregulation, tolerância e síndrome de abstinência.", icon: Flame, category: "Farmacologia Básica" },
  { slug: "farmacogenomica", name: "Farmacogenômica e Polimorfismos CYP", description: "Impacto de metabolizadores lentos/ultrarrápidos na curva Cp×t de pró-fármacos e fármacos ativos.", icon: Dna, category: "Farmacologia Básica" },
  { slug: "estabilidade", name: "Estabilidade e Prazo de Validade", description: "Cinética de degradação (ordem zero, 1ª e 2ª), equação de Arrhenius e cálculo de t90.", icon: FlaskConical, category: "Farmacotécnica" },
  { slug: "liberacao-farmacos", name: "Sistemas de Liberação de Fármacos", description: "Compare perfis: imediata, prolongada, entérica, pulsátil e transdérmica com modelos de Higuchi e Korsmeyer-Peppas.", icon: Beaker, category: "Farmacotécnica" },
  { slug: "diluicao", name: "Diluição e Concentração", description: "Diluição simples (C1V1=C2V2), seriada, conversão de unidades e cálculos de isotonia.", icon: Droplets, category: "Farmacotécnica" },
  { slug: "reologia", name: "Reologia e Viscosidade", description: "Reogramas interativos: newtoniano, pseudoplástico, dilatante e tixotrópico com espessantes.", icon: FlaskConical, category: "Farmacotécnica" },
  { slug: "hlb-emulsoes", name: "Equilíbrio HLB e Emulsões", description: "Calcule o HLB de misturas Span/Tween e otimize a estabilidade de emulsões O/A e A/O.", icon: Beaker, category: "Farmacotécnica" },
  { slug: "granulometria", name: "Granulometria e Distribuição de Partículas", description: "Histograma, curva acumulativa, D10, D50, D90 e span para controle de qualidade de pós.", icon: TestTube, category: "Farmacotécnica" },
  { slug: "compressao", name: "Compressão de Comprimidos", description: "Gráficos de Heckel e Kawakita, dureza, friabilidade e tempo de desintegração.", icon: Shield, category: "Farmacotécnica" },
  { slug: "tampao-farmaceutico", name: "Tampão Farmacêutico e pH", description: "Henderson-Hasselbalch interativo, capacidade tamponante (β) e curvas de titulação.", icon: Beaker, category: "Farmacotécnica" },
  { slug: "sar-explorer", name: "Relação Estrutura-Atividade (SAR)", description: "Manipule substituintes em scaffolds e observe alterações em potência, lipofilia e seletividade.", icon: FlaskConical, category: "Química Farmacêutica" },
  { slug: "lipinski", name: "Regra de Lipinski e Druglikeness", description: "Avalie MW, logP, HBD, HBA e visualize o espaço de druglikeness com Lipinski e Veber.", icon: TestTube, category: "Química Farmacêutica" },
  { slug: "bioisosterismo", name: "Isosteria e Bioisosterismo", description: "Compare grupos funcionais e bioisósteros em pKa, logP, estabilidade e absorção.", icon: Beaker, category: "Química Farmacêutica" },
  { slug: "metabolismo-farmacos", name: "Metabolismo de Fármacos e Pró-Fármacos", description: "Cinética de ativação de pró-fármacos, CYP450 e polimorfismos metabólicos.", icon: FlaskConical, category: "Química Farmacêutica" },
  { slug: "docking-simplificado", name: "Interação Fármaco-Receptor (Docking)", description: "Simule ligações H, van der Waals, π-π e calcule ΔG e Ki.", icon: Brain, category: "Química Farmacêutica" },
  { slug: "quiralidade", name: "Quiralidade e Estereoquímica", description: "Compare enantiômeros: eutômero vs distômero, razão eudísmica e chiral switch.", icon: Dna, category: "Química Farmacêutica" },
  { slug: "pka-absorcao", name: "pKa, Ionização e Absorção", description: "Henderson-Hasselbalch interativo com compartimentos fisiológicos e ion trapping.", icon: Droplets, category: "Química Farmacêutica" },
  { slug: "qsar-simplificado", name: "QSAR Simplificado (Hansch)", description: "Equação de Hansch parabólica: logP, σ Hammett e correlação com atividade biológica.", icon: FlaskConical, category: "Química Farmacêutica" },
  { slug: "feedback-formativo", name: "Feedback Formativo (Pendleton/R2C2/ALOBA)", description: "Treine a habilidade de dar feedback construtivo usando modelos validados de comunicação pedagógica.", icon: ClipboardList, category: "Formação Docente" },
  { slug: "elaboracao-questoes", name: "Elaboração de Questões (Bloom)", description: "Crie questões em diferentes níveis cognitivos da Taxonomia de Bloom revisada.", icon: BookOpen, category: "Formação Docente" },
  { slug: "conducao-caso-pbl", name: "Condução de Caso (PBL/TBL)", description: "Treine a facilitação de discussões em grupo sem dar a resposta diretamente.", icon: ClipboardList, category: "Formação Docente" },
  { slug: "planejamento-aula", name: "Planejamento de Aula por Competências", description: "Alinhamento construtivo de Biggs: objetivo ↔ metodologia ↔ avaliação, com DCNs.", icon: ClipboardList, category: "Formação Docente" },
  { slug: "gestao-sala", name: "Gestão de Sala — Incidentes Críticos", description: "Responda a situações difíceis em tempo real: conflitos, crises emocionais, integridade acadêmica.", icon: ClipboardList, category: "Formação Docente" },
  { slug: "avaliacao-rubrica-osce", name: "Avaliação por Rubrica (OSCE)", description: "Treine calibração como avaliador clínico com índice de concordância (kappa).", icon: ClipboardList, category: "Formação Docente" },
  { slug: "preceptoria-clinica", name: "Preceptoria Clínica (One-Minute Preceptor)", description: "Modelo de ensino clínico rápido em 5 passos para estágios e residência.", icon: ClipboardList, category: "Formação Docente" },
  { slug: "odontograma", name: "Odontograma Interativo", description: "Registro clínico com arcada SVG interativa (32 dentes, 5 faces) e diagnóstico ICDAS.", icon: Scan, category: "Odontologia" },
  { slug: "anatomia-endodontia", name: "Anatomia Dental em Corte (Endodontia)", description: "Anatomia interna do dente com testes de vitalidade e decisão terapêutica endodôntica.", icon: Scan, category: "Odontologia" },
  { slug: "periodontograma", name: "Periodontograma e Classificação Periodontal", description: "Sondagem periodontal com régua animada e classificação AAP/EFP 2018.", icon: Scan, category: "Odontologia" },
  { slug: "anestesiologia-odonto", name: "Anestesiologia Odontológica", description: "Técnicas de bloqueio anestésico com anatomia nervosa SVG e cálculo de dose máxima.", icon: Syringe, category: "Odontologia" },
  { slug: "cefalometria", name: "Cefalometria e Classificação de Angle", description: "Marcação cefalométrica interativa com cálculo automático de SNA, SNB e ANB.", icon: Scan, category: "Odontologia" },
  { slug: "radiografia-odonto", name: "Radiografia e Interpretação de Imagens", description: "Leitura de radiografias odontológicas esquemáticas com identificação de estruturas e patologias.", icon: Scan, category: "Odontologia" },
  { slug: "farmacologia-odonto", name: "Farmacologia Odontológica e Prescrição", description: "Prescrição segura em odontologia com gauges de risco por perfil do paciente.", icon: Pill, category: "Odontologia" },
  { slug: "cirurgia-exodontia", name: "Cirurgia e Exodontia — Pell & Gregory", description: "Classificação de terceiros molares inclusos e planejamento cirúrgico com SVG interativo.", icon: Scan, category: "Odontologia" },
  { slug: "goniometria", name: "Goniometria Articular Interativa", description: "Medição de ADM com goniômetro virtual e comparação com valores AAOS.", icon: Accessibility, category: "Fisioterapia" },
  { slug: "avaliacao-postural", name: "Avaliação Postural (Simetrógrafo)", description: "Análise postural com marcação de pontos anatômicos e fio de prumo virtual.", icon: Accessibility, category: "Fisioterapia" },
  { slug: "forca-muscular", name: "Teste de Força Muscular (Oxford/MRC)", description: "Avaliação manual de força muscular com graduação 0-5 e mapa de calor.", icon: Accessibility, category: "Fisioterapia" },
  { slug: "dermatomos", name: "Dermátomos e Avaliação Sensitiva", description: "Mapeamento de sensibilidade corporal e correlação com nível de lesão neurológica.", icon: Accessibility, category: "Fisioterapia" },
  { slug: "respiratorio", name: "Fisioterapia Respiratória", description: "Ausculta virtual, técnicas de higiene brônquica e reexpansão pulmonar.", icon: Accessibility, category: "Fisioterapia" },
  { slug: "eletroterapia", name: "Eletroterapia e Parâmetros de Corrente", description: "Programação de TENS, FES, corrente russa e interferencial com visualização de onda.", icon: Accessibility, category: "Fisioterapia" },
  { slug: "testes-ortopedicos", name: "Testes Ortopédicos Especiais", description: "Execução e interpretação de testes provocativos com animação SVG da manobra.", icon: Accessibility, category: "Fisioterapia" },
  { slug: "berg", name: "Escala de Equilíbrio de Berg", description: "Avaliação funcional de equilíbrio com 14 itens, gráfico radar e risco de queda.", icon: Accessibility, category: "Fisioterapia" },
  { slug: "avaliacao-nutricional", name: "Avaliação Nutricional Antropométrica", description: "IMC, composição corporal e classificação de risco metabólico.", icon: ClipboardList, category: "Nutrição" },
  { slug: "triagem-nutricional", name: "Triagem Nutricional (NRS-2002)", description: "Aplicação de ferramentas de triagem e decisão de conduta nutricional.", icon: ClipboardList, category: "Nutrição" },
  { slug: "necessidades-energeticas", name: "Cálculo de Necessidades Energéticas", description: "Harris-Benedict, Mifflin e distribuição de macronutrientes.", icon: ClipboardList, category: "Nutrição" },
  { slug: "tne", name: "Terapia Nutricional Enteral (TNE)", description: "Fórmulas enterais, vias de acesso e manejo de complicações.", icon: ClipboardList, category: "Nutrição" },
  { slug: "tnp", name: "Terapia Nutricional Parenteral (TNP)", description: "Prescrição parenteral, compatibilidade e manejo metabólico.", icon: ClipboardList, category: "Nutrição" },
  { slug: "disfagia", name: "Avaliação e Conduta em Disfagia", description: "Testes à beira-leito, FOIS e manejo de consistências alimentares.", icon: ClipboardList, category: "Nutrição" },
  { slug: "nutricao-renal", name: "Nutrição no Paciente Renal Crônico", description: "Prescrição dietética, restrições e suplementação na DRC.", icon: ClipboardList, category: "Nutrição" },
  { slug: "nutricao-materno-infantil", name: "Nutrição Materno-Infantil", description: "Curva de Atalah, suplementação e manejo de intercorrências gestacionais.", icon: ClipboardList, category: "Nutrição" },
  { slug: "dispensacao-344", name: "Dispensação — Portaria 344/98", description: "Treine a dispensação de medicamentos controlados (listas A, B e C) no balcão da farmácia.", icon: Pill, category: "Farmácia Clínica" },
  { slug: "sequenciamento-dna", name: "Sequenciamento de DNA (Sanger e NGS)", description: "Compare métodos Sanger vs NGS. Visualize eletroferogramas, quality scores (Phred) e cobertura de leitura.", icon: Dna, category: "Genética" },
  { slug: "snp-farmacogenetica", name: "SNPs e Farmacogenética", description: "Analise polimorfismos CYP450, VKORC1 e DPYD. Correlacione genótipos com fenótipos metabólicos.", icon: Dna, category: "Genética" },
  { slug: "cariotipo", name: "Cariótipo e Anomalias Cromossômicas", description: "Monte cariótipos virtuais e identifique trissomias, monossomias e translocações.", icon: Dna, category: "Genética" },
  { slug: "heranca-mendeliana", name: "Herança Mendeliana e Heredogramas", description: "Padrões de herança, quadro de Punnett e cálculo de probabilidades genéticas.", icon: Dna, category: "Genética" },
  { slug: "pcr-eletroforese", name: "PCR e Eletroforese em Gel", description: "Ciclos térmicos, design de primers e visualização de bandas em gel de agarose.", icon: Dna, category: "Genética" },
  { slug: "epigenetica", name: "Epigenética e Regulação Gênica", description: "Metilação de DNA, acetilação de histonas e impacto na expressão gênica.", icon: Dna, category: "Genética" },
  { slug: "mutacoes-reparo", name: "Mutações e Reparo de DNA", description: "Simule mutações e identifique mecanismos de reparo (MMR, BER, NER, HR).", icon: Dna, category: "Genética" },
  { slug: "genetica-populacoes", name: "Genética de Populações (Hardy-Weinberg)", description: "Frequências alélicas, seleção natural e deriva genética ao longo de gerações.", icon: Dna, category: "Genética" },
  { slug: "farmacoterapia-hemograma", name: "Hemograma e Condutas Hematológicas", description: "Interprete hemograma completo (Hb, VCM, leucócitos, plaquetas) e ajuste a farmacoterapia para anemias, neutropenias e plaquetopenias.", icon: TestTube, category: "Farmacoterapia Laboratorial" },
  { slug: "farmacoterapia-acido-base", name: "Distúrbios Ácido-Base e Eletrólitos", description: "Interprete gasometria e eletrólitos (pH, pCO₂, HCO₃⁻, K⁺, Na⁺, Ca²⁺) e corrija distúrbios com intervenções farmacológicas.", icon: Beaker, category: "Farmacoterapia Laboratorial" },
  { slug: "farmacoterapia-hepatopatia", name: "Hepatopatias e Ajuste Hepático", description: "Interprete transaminases, bilirrubinas e INR. Calcule Child-Pugh e ajuste doses em insuficiência hepática.", icon: TestTube, category: "Farmacoterapia Laboratorial" },
  { slug: "farmacoterapia-renal", name: "Função Renal e Ajuste de Dose", description: "Calcule ClCr/TFG, estadie DRC (G1-G5) e ajuste doses de nefrotóxicos como vancomicina, gentamicina e metformina.", icon: Droplets, category: "Farmacoterapia Laboratorial" },
  { slug: "farmacoterapia-infeccao-lab", name: "Marcadores de Infecção e Antibioticoterapia", description: "Interprete PCR, PCT, lactato e leucograma diferencial para guiar escolha e escalonamento de antimicrobianos.", icon: TestTube, category: "Farmacoterapia Laboratorial" },
  { slug: "farmacoterapia-dislipidemia", name: "Perfil Lipídico e Risco Cardiovascular", description: "Analise LDL, HDL, triglicerídeos e risco Framingham para definir metas e escolher estatinas ou fibratos.", icon: Heart, category: "Farmacoterapia Laboratorial" },
  { slug: "farmacoterapia-glicemia", name: "Glicemia, Diabetes e Insulinoterapia", description: "Interprete glicemia, HbA1c e perfil insulínico para ajuste de antidiabéticos e insulina.", icon: Droplets, category: "Farmacoterapia Laboratorial" },
  { slug: "farmacoterapia-coagulacao", name: "Coagulação e Anticoagulantes", description: "Interprete INR, TTPa, anti-Xa e coagulograma para manejo de anticoagulação e reversão.", icon: TestTube, category: "Farmacoterapia Laboratorial" },
];

// Category icon mapping
const CATEGORY_ICONS: Record<string, any> = {
  "Farmácia Clínica": ClipboardList,
  "Infectologia": Bug,
  "Farmacocinética": Activity,
  "Endocrinologia": Syringe,
  "Enfermagem / UTI": HeartPulse,
  "Psiquiatria": PillBottle,
  "Farmacologia Clínica": Zap,
  "Fisiologia Humana": Heart,
  "Bioquímica": FlaskConical,
  "Farmacologia Básica": Brain,
  "Farmacotécnica": Beaker,
  "Química Farmacêutica": TestTube,
  "Formação Docente": BookOpen,
  "Odontologia": Scan,
  "Fisioterapia": Accessibility,
  "Nutrição": ClipboardList,
  "Genética": Dna,
  "Farmacoterapia Laboratorial": TestTube,
};

// Category color accents (HSL-based using design tokens where possible)
const CATEGORY_COLORS: Record<string, string> = {
  "Farmácia Clínica": "168 80% 42%",
  "Infectologia": "0 62% 50%",
  "Farmacocinética": "200 70% 50%",
  "Endocrinologia": "45 90% 50%",
  "Enfermagem / UTI": "340 70% 55%",
  "Psiquiatria": "262 83% 65%",
  "Farmacologia Clínica": "30 90% 55%",
  "Fisiologia Humana": "200 70% 50%",
  "Bioquímica": "150 60% 45%",
  "Farmacologia Básica": "280 60% 55%",
  "Farmacotécnica": "190 70% 45%",
  "Química Farmacêutica": "320 60% 50%",
  "Formação Docente": "45 80% 50%",
  "Odontologia": "168 80% 42%",
  "Fisioterapia": "210 70% 50%",
  "Nutrição": "140 60% 45%",
  "Genética": "260 70% 55%",
  "Farmacoterapia Laboratorial": "15 75% 50%",
};

export default function Simuladores() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { isPremium, canUseSimulator, upgradeOpen, setUpgradeOpen, upgradeFeature, showUpgrade } = useFeatureGating();
  const [createOpen, setCreateOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const { data: tools = [], isLoading } = useQuery({
    queryKey: ["tools", "simulador"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tools")
        .select("*, categories(name, slug)")
        .eq("type", "simulador")
        .eq("is_active", true)
        .is("created_by", null)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: userTools = [] } = useQuery({
    queryKey: ["user-tools", "simulador", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tools")
        .select("*, categories(name, slug)")
        .eq("type", "simulador")
        .eq("is_active", true)
        .eq("created_by", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Build categories with counts
  const categoriesWithCounts = useMemo(() => {
    const catMap = new Map<string, number>();
    NATIVE_SIMULATORS.forEach(s => catMap.set(s.category, (catMap.get(s.category) || 0) + 1));
    tools.forEach((t: any) => {
      if (t.categories?.name) {
        catMap.set(t.categories.name, (catMap.get(t.categories.name) || 0) + 1);
      }
    });
    return Array.from(catMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [tools]);

  const totalCount = useMemo(() =>
    categoriesWithCounts.reduce((sum, c) => sum + c.count, 0),
    [categoriesWithCounts]
  );

  const filteredNative = NATIVE_SIMULATORS.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategory || s.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredDynamic = tools.filter((t: any) => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategory || t.categories?.name === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredUser = userTools.filter((t: any) => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategory || t.categories?.name === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Group filtered results by category
  const groupedSimulators = useMemo(() => {
    const groups = new Map<string, Array<{ slug: string; name: string; description: string; icon: any; category: string; isDynamic?: boolean; toolId?: string }>>();

    filteredNative.forEach(s => {
      if (!groups.has(s.category)) groups.set(s.category, []);
      groups.get(s.category)!.push(s);
    });

    filteredDynamic.forEach((t: any) => {
      const cat = t.categories?.name || "Outros";
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push({
        slug: t.slug,
        name: t.name,
        description: t.short_description || t.description || "",
        icon: FlaskConical,
        category: cat,
        isDynamic: true,
        toolId: t.id,
      });
    });

    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredNative, filteredDynamic]);

  const handleCreateClick = () => {
    if (!isPremium) {
      showUpgrade("Criação de simuladores personalizados");
      return;
    }
    setCreateOpen(true);
  };

  const toggleMarketplace = async (toolId: string, current: boolean) => {
    const { error } = await supabase
      .from("tools")
      .update({ is_marketplace: !current })
      .eq("id", toolId);
    if (error) {
      toast.error("Erro ao atualizar");
    } else {
      toast.success(!current ? "Publicado no Marketplace!" : "Removido do Marketplace");
      queryClient.invalidateQueries({ queryKey: ["user-tools"] });
    }
  };

  const scrollToCategory = (cat: string) => {
    setSelectedCategory(null);
    setTimeout(() => {
      categoryRefs.current[cat]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const SimCard = ({ sim, isDynamic, isLocked }: { sim: any; isDynamic?: boolean; isLocked?: boolean }) => {
    const Icon = sim.icon;
    const color = CATEGORY_COLORS[sim.category] || "168 80% 42%";

    if (isLocked) {
      return (
        <div
          onClick={() => showUpgrade("Simuladores avançados são exclusivos do plano Premium")}
          className="cursor-pointer group relative rounded-xl border border-border bg-card/50 p-4 opacity-60 hover:opacity-90 transition-all"
        >
          <div className="absolute top-3 right-3">
            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="flex items-start gap-3">
            <div className="shrink-0 rounded-lg p-2 bg-muted">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <h3 className="font-medium text-sm leading-tight mb-1 pr-6">{sim.name}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2">{sim.description}</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <Link
        to={`/simuladores/${sim.slug}`}
        className="group relative rounded-xl border border-border/50 bg-card p-4 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all hover:-translate-y-0.5"
      >
        <div className="flex items-start gap-3">
          <div
            className="shrink-0 rounded-lg p-2"
            style={{ backgroundColor: `hsl(${color} / 0.12)` }}
          >
            <Icon className="h-4 w-4" style={{ color: `hsl(${color})` }} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-sm leading-tight mb-1 group-hover:text-primary transition-colors">{sim.name}</h3>
            <p className="text-xs text-muted-foreground line-clamp-2">{sim.description}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary/60 transition-colors shrink-0 mt-0.5" />
        </div>
      </Link>
    );
  };

  return (
    <div>
      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} feature={upgradeFeature} />
      <CreateToolDialog open={createOpen} onOpenChange={setCreateOpen} type="simulador" />

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-1">{t("simulators.title")}</h1>
            <p className="text-muted-foreground text-sm">
              {totalCount} simuladores em {categoriesWithCounts.length} categorias
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!canUseSimulator && (
              <Badge variant="outline" className="gap-1 text-xs">
                <Lock className="h-3 w-3" />
                Premium
              </Badge>
            )}
            {isPremium && (
              <Badge className="gap-1 bg-primary/10 text-primary border-primary/20 text-xs">
                <Crown className="h-3 w-3" />
                Premium
              </Badge>
            )}
            <div className="flex items-center border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode("grid")}
                className={cn("p-2 transition-colors", viewMode === "grid" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn("p-2 transition-colors", viewMode === "list" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
            <Button onClick={handleCreateClick} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Criar
            </Button>
          </div>
        </div>
      </div>

      {/* Search + Category navigation */}
      <div className="flex gap-6 items-start">
        {/* Left sidebar - category nav (hidden on mobile) */}
        <div className="hidden lg:block w-56 shrink-0 sticky top-4">
          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar simulador..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
          <ScrollArea className="h-[calc(100vh-220px)]">
            <nav className="space-y-0.5 pr-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
                  !selectedCategory
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <span>Todas</span>
                <span className="text-xs tabular-nums opacity-60">{totalCount}</span>
              </button>
              {categoriesWithCounts.map(({ name, count }) => {
                const CatIcon = CATEGORY_ICONS[name] || FlaskConical;
                return (
                  <button
                    key={name}
                    onClick={() => setSelectedCategory(selectedCategory === name ? null : name)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                      selectedCategory === name
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <CatIcon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate flex-1 text-left">{name}</span>
                    <span className="text-xs tabular-nums opacity-60 shrink-0">{count}</span>
                  </button>
                );
              })}
            </nav>
          </ScrollArea>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Mobile search */}
          <div className="lg:hidden mb-4">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar simulador..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            {/* Mobile category chips */}
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setSelectedCategory(null)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                  !selectedCategory
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                Todas
              </button>
              {categoriesWithCounts.map(({ name, count }) => (
                <button
                  key={name}
                  onClick={() => setSelectedCategory(selectedCategory === name ? null : name)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                    selectedCategory === name
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {name} ({count})
                </button>
              ))}
            </div>
          </div>

          {/* User's simulators */}
          {filteredUser.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-5 w-1 rounded-full bg-primary" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">Meus Simuladores</h2>
              </div>
              <div className={cn(
                viewMode === "grid"
                  ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3"
                  : "space-y-2"
              )}>
                {filteredUser.map((tool: any) => (
                  <div key={tool.id} className="relative">
                    <SimCard sim={{ slug: tool.slug, name: tool.name, description: tool.short_description || tool.description, icon: FlaskConical, category: tool.categories?.name || "" }} />
                    <button
                      onClick={() => toggleMarketplace(tool.id, tool.is_marketplace)}
                      className={cn(
                        "absolute top-3 right-3 p-1.5 rounded-lg transition-colors z-10",
                        tool.is_marketplace ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground hover:text-foreground"
                      )}
                      title={tool.is_marketplace ? "Remover do Marketplace" : "Publicar no Marketplace"}
                    >
                      <Share2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grouped simulators */}
          {groupedSimulators.map(([cat, sims]) => {
            const CatIcon = CATEGORY_ICONS[cat] || FlaskConical;
            const color = CATEGORY_COLORS[cat] || "168 80% 42%";
            return (
              <div key={cat} className="mb-6" ref={el => { categoryRefs.current[cat] = el; }}>
                <div className="flex items-center gap-2.5 mb-3">
                  <div
                    className="rounded-lg p-1.5"
                    style={{ backgroundColor: `hsl(${color} / 0.12)` }}
                  >
                    <CatIcon className="h-4 w-4" style={{ color: `hsl(${color})` }} />
                  </div>
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">{cat}</h2>
                  <span className="text-xs text-muted-foreground">({sims.length})</span>
                </div>
                <div className={cn(
                  viewMode === "grid"
                    ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3"
                    : "space-y-2"
                )}>
                  {sims.map((sim) => (
                    <SimCard
                      key={sim.slug}
                      sim={sim}
                      isDynamic={sim.isDynamic}
                      isLocked={!canUseSimulator && !sim.isDynamic}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {!isLoading && groupedSimulators.length === 0 && filteredUser.length === 0 && (
            <div className="text-center py-16">
              <FlaskConical className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">
                {search ? "Nenhum simulador encontrado para essa busca." : t("simulators.empty")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
