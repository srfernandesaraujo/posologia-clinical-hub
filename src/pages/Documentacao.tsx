import { ArrowLeft, Calculator, FlaskConical, Gamepad2, DoorOpen, BarChart3, Store, Trophy, Shield, History, FileText, Share2, Globe, Brain, Pill, Heart, Activity, Bone, Droplets, HeartPulse, Thermometer, Syringe, Baby, Stethoscope, Zap, Beaker } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";

const sections = [
  {
    title: "Calculadoras Clínicas",
    icon: Calculator,
    description: "Mais de 20 calculadoras nativas com fórmulas validadas, modo clínico/educativo, relatório PDF e referências inline.",
    items: [
      { name: "CKD-EPI 2021 (TFGe)", desc: "Equação sem correção racial — KDIGO 2021", link: "/calculadoras/ckd-epi" },
      { name: "Correção de Sódio", desc: "Fórmula de Katz para hiponatremia", link: "/calculadoras/correcao-sodio" },
      { name: "Correção de Cálcio", desc: "Fórmula de Payne (ajuste por albumina)", link: "/calculadoras/correcao-calcio" },
      { name: "Wells Score", desc: "TEP e TVP com estratificação de risco", link: "/calculadoras/wells-score" },
      { name: "qSOFA", desc: "Screening de sepse à beira-leito (Sepsis-3)", link: "/calculadoras/qsofa" },
      { name: "Vancomicina AUC/MIC", desc: "Farmacocinética Sawchuk-Zaske (IDSA 2020)", link: "/calculadoras/vancomicina-auc" },
      { name: "Insulina Basal-Bolus", desc: "DDT, regra 1700 e escalas de correção", link: "/calculadoras/insulina-basal-bolus" },
      { name: "Holliday-Segar", desc: "Regra 4-2-1 para hidratação pediátrica", link: "/calculadoras/holliday-segar" },
      { name: "MELD / MELD-Na / Child-Pugh", desc: "Escores de hepatologia", link: "/calculadoras/meld-score" },
      { name: "QTc Corrigido", desc: "Bazett e Fridericia com limites por sexo", link: "/calculadoras/qtc-corrigido" },
      { name: "Dose Pediátrica", desc: "Dosagem por peso para 10+ medicamentos", link: "/calculadoras/dose-pediatrica" },
      { name: "RASS / SAS", desc: "Escalas de sedação em UTI", link: "/calculadoras/rass-sedacao" },
      { name: "Nutrição Parenteral", desc: "Harris-Benedict, GET, GIR e macronutrientes", link: "/calculadoras/nutricao-parenteral" },
      { name: "Interações CYP450", desc: "Radar visual de interações medicamentosas", link: "/calculadoras/interacoes-cyp" },
      { name: "Risco Cardiovascular", desc: "Framingham / ACC-AHA", link: "/calculadoras/risco-cardiovascular" },
      { name: "Desmame de Corticoide", desc: "Protocolos de redução gradual", link: "/calculadoras/desmame-corticoide" },
      { name: "Equivalência de Opioides", desc: "Conversão entre opioides", link: "/calculadoras/equivalencia-opioides" },
      { name: "HOMA-IR", desc: "Resistência insulínica", link: "/calculadoras/homa-ir" },
      { name: "FINDRISC", desc: "Risco de diabetes tipo 2", link: "/calculadoras/findrisc" },
    ],
  },
  {
    title: "Simuladores Clínicos",
    icon: FlaskConical,
    description: "Simuladores interativos com casos clínicos gerados por IA para treinamento de raciocínio clínico.",
    items: [
      { name: "PRM (Problemas Relacionados a Medicamentos)", link: "/simuladores/prm" },
      { name: "Antimicrobianos", link: "/simuladores/antimicrobianos" },
      { name: "TDM (Monitorização Terapêutica)", link: "/simuladores/tdm" },
      { name: "Acompanhamento Farmacoterapêutico", link: "/simuladores/acompanhamento" },
      { name: "Insulina", link: "/simuladores/insulina" },
      { name: "Bomba de Infusão", link: "/simuladores/bomba-infusao" },
      { name: "Desmame de Benzodiazepínicos", link: "/simuladores/desmame-benzo" },
      { name: "Interações Medicamentosas", link: "/simuladores/interacoes" },
    ],
  },
  {
    title: "Simuladores de Fisiologia Humana",
    icon: HeartPulse,
    description: "Modelos fisiológicos interativos com gráficos em tempo real, casos IA e integração com salas virtuais.",
    items: [
      { name: "Sistema Nervoso Autônomo (SNA)", desc: "Tônus simpático/parassimpático e efeitos em FC, PA, pupila e TGI", link: "/simuladores/sna" },
      { name: "Eletrofisiologia Cardíaca", desc: "Potencial de ação cardíaco com canais de Na⁺, K⁺ e Ca²⁺", link: "/simuladores/eletrofisiologia-cardiaca" },
      { name: "Depuração Renal e TFG", desc: "Pressões arteriolares, hidratação e permeabilidade tubular", link: "/simuladores/depuracao-renal" },
      { name: "Equilíbrio Ácido-Base", desc: "Distúrbios metabólicos/respiratórios e correção de pH", link: "/simuladores/equilibrio-acido-base" },
      { name: "Regulação Glicêmica", desc: "Insulina, glucagon, DM1, DM2 e resistência insulínica", link: "/simuladores/regulacao-glicemica" },
      { name: "Eixo HPA", desc: "Feedback hipotálamo-hipófise-adrenal e corticoides exógenos", link: "/simuladores/eixo-hpa" },
      { name: "Cinética Enzimática", desc: "Michaelis-Menten e Lineweaver-Burk com inibidores", link: "/simuladores/cinetica-enzimatica" },
      { name: "Secreção Ácida Gástrica", desc: "Receptores H2, M3 e CCK-B da célula parietal", link: "/simuladores/secrecao-gastrica" },
      { name: "Cascata de Coagulação", desc: "Hemofilia, varfarina, heparina e CIVD", link: "/simuladores/cascata-coagulacao" },
      { name: "Compartimentos ADME", desc: "Farmacocinética de 1 compartimento com metabolismo de primeira passagem", link: "/simuladores/compartimentos-adme" },
    ],
  },
  {
    title: "Simuladores de Bioquímica",
    icon: Beaker,
    description: "Modelos bioquímicos interativos com visualizações em tempo real, casos IA e modo exame.",
    items: [
      { name: "Cadeia de Transporte de Eletrões", desc: "Fosforilação oxidativa, complexos I-IV, ATP sintase e inibidores", link: "/simuladores/cadeia-eletrons" },
      { name: "Dissociação da Hemoglobina", desc: "Curva sigmoidal, efeito Bohr, mioglobina e moduladores alostéricos", link: "/simuladores/dissociacao-hemoglobina" },
      { name: "Glicólise vs. Gliconeogénese", desc: "Metabolismo hepático: insulina vs glucagon e enzimas regulatórias", link: "/simuladores/glicolise-gliconeogenese" },
      { name: "Cinética Enzimática Avançada", desc: "Inibição competitiva, não-competitiva e acompetitiva", link: "/simuladores/cinetica-avancada" },
      { name: "Ciclo da Ureia", desc: "Deficiências enzimáticas, amónia e neurotoxicidade", link: "/simuladores/ciclo-ureia" },
      { name: "Cascata do Ácido Araquidónico", desc: "COX, LOX, eicosanóides e bloqueios farmacológicos", link: "/simuladores/acido-araquidonico" },
      { name: "Metabolismo das Lipoproteínas", desc: "VLDL, LDL, HDL, estatinas e iPCSK9", link: "/simuladores/lipoproteinas" },
      { name: "Via das Pentoses Fosfato e G6PD", desc: "NADPH, glutationa, stresse oxidativo e hemólise", link: "/simuladores/pentoses-fosfato" },
      { name: "Titulação de Aminoácidos", desc: "Curvas de titulação, pKa, pI e carga líquida", link: "/simuladores/titulacao-aminoacidos" },
      { name: "Operão Lac", desc: "Regulação genética: CAP-cAMP, repressor LacI e β-galactosidase", link: "/simuladores/operon-lac" },
    ],
  },
  {
    title: "Jogos Clínicos",
    icon: Gamepad2,
    description: "Mais de 20 jogos educativos para treinar farmacologia e clínica de forma divertida e gamificada.",
    items: [
      { name: "Alerta Vermelho", desc: "Identificação de emergências" },
      { name: "Código Azul", desc: "Simulação de parada cardíaca" },
      { name: "Milionário da Farma", desc: "Quiz farmacológico" },
      { name: "Detetive Toxicológico", desc: "Investigação de intoxicações" },
      { name: "RPG do TCC", desc: "Role-playing de caso clínico" },
      { name: "E mais 15+ jogos temáticos" },
    ],
  },
  {
    title: "Salas Virtuais",
    icon: DoorOpen,
    description: "Crie salas com PIN para atividades em grupo. Alunos acessam pelo PIN sem necessidade de cadastro.",
    items: [
      { name: "Criação de salas com PIN de 6 dígitos" },
      { name: "Atividades com simuladores e casos clínicos" },
      { name: "Dashboard do professor com submissões em tempo real" },
      { name: "Suporte a grupos e participantes individuais" },
    ],
  },
  {
    title: "Gamificação",
    icon: Trophy,
    description: "Sistema de pontos, badges, streaks e leaderboard para motivar o uso contínuo.",
    items: [
      { name: "Pontuação por simuladores, jogos e calculadoras" },
      { name: "Badges de conquistas (Explorer, Maratonista, etc.)" },
      { name: "Streak diário de uso" },
      { name: "Leaderboard global" },
    ],
  },
  {
    title: "Marketplace",
    icon: Store,
    description: "Publique e compartilhe ferramentas criadas por IA. Compre e venda calculadoras personalizadas.",
    items: [
      { name: "Criação de calculadoras com IA generativa" },
      { name: "Publicação no marketplace" },
      { name: "Sistema de avaliações e reviews" },
    ],
  },
  {
    title: "Recursos Gerais",
    icon: Shield,
    description: "Funcionalidades transversais da plataforma.",
    items: [
      { name: "Histórico de cálculos por paciente", desc: "Salve resultados e acompanhe tendências" },
      { name: "Relatórios em PDF", desc: "Gere laudos clínicos para cada cálculo" },
      { name: "Compartilhamento de ferramentas", desc: "Links públicos com token seguro" },
      { name: "Modo clínico e educativo", desc: "Recomendações adaptadas ao contexto" },
      { name: "Multilíngue", desc: "Português, inglês e espanhol" },
      { name: "Responsivo", desc: "Desktop, tablet e celular" },
      { name: "Analytics", desc: "Métricas de uso e engajamento (premium)" },
    ],
  },
];

export default function Documentacao() {
  const navigate = useNavigate();

  return (
    <div className="max-w-5xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="rounded-xl bg-primary/10 p-3">
            <FileText className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Documentação</h1>
            <p className="text-muted-foreground">Guia completo de todas as funcionalidades do Posologia Clinical Hub</p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {sections.map((section) => (
          <div key={section.title} className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-lg bg-primary/10 p-2">
                <section.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{section.title}</h2>
                <p className="text-sm text-muted-foreground">{section.description}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {section.items.map((item, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                  <span className="text-primary mt-0.5">•</span>
                  <div className="min-w-0">
                    {"link" in item && item.link ? (
                      <Link to={item.link} className="text-sm font-medium text-primary hover:underline">{item.name}</Link>
                    ) : (
                      <span className="text-sm font-medium">{item.name}</span>
                    )}
                    {"desc" in item && item.desc && (
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
