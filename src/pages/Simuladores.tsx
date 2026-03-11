import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { FlaskConical, Search, Pill, Bug, Activity, ClipboardList, Syringe, Lock, Crown, Plus, Share2, HeartPulse, PillBottle, Zap, Brain, Heart, Droplets, Beaker, Shield, Flame, TestTube, Dna, BookOpen, Scan } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useFeatureGating } from "@/hooks/useFeatureGating";
import { UpgradeModal } from "@/components/UpgradeModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreateToolDialog } from "@/components/CreateToolDialog";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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
];

export default function Simuladores() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { isPremium, canUseSimulator, upgradeOpen, setUpgradeOpen, upgradeFeature, showUpgrade } = useFeatureGating();
  const [createOpen, setCreateOpen] = useState(false);

  // System tools
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

  // User's own tools
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

  // Collect all unique categories
  const allCategories = Array.from(new Set([
    ...NATIVE_SIMULATORS.map(s => s.category),
    ...tools.filter((t: any) => t.categories?.name).map((t: any) => t.categories.name),
  ])).sort();

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

  return (
    <div>
      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} feature={upgradeFeature} />
      <CreateToolDialog open={createOpen} onOpenChange={setCreateOpen} type="simulador" />

      <div className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">{t("simulators.title")}</h1>
            <p className="text-muted-foreground">{t("simulators.subtitle")}</p>
          </div>
          <div className="flex items-center gap-3">
            {!canUseSimulator && (
              <Badge variant="outline" className="gap-1 text-sm">
                <Lock className="h-3.5 w-3.5" />
                Premium
              </Badge>
            )}
            {isPremium && (
              <Badge className="gap-1 bg-primary/10 text-primary border-primary/20">
                <Crown className="h-3.5 w-3.5" />
                Premium – Desbloqueado
              </Badge>
            )}
            <Button onClick={handleCreateClick} className="gap-2">
              <Plus className="h-4 w-4" />
              Criar Simulador
            </Button>
          </div>
        </div>
      </div>

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("simulators.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            !selectedCategory
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          Todas
        </button>
        {allCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              selectedCategory === cat
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* User's own simulators */}
      {filteredUser.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Meus Simuladores</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUser.map((tool: any) => (
              <div
                key={tool.id}
                className="rounded-2xl border border-primary/30 bg-card p-5 hover:shadow-lg hover:shadow-primary/5 transition-all hover:-translate-y-0.5 ring-1 ring-primary/20 relative"
              >
                <Link to={`/simuladores/${tool.slug}`} className="block">
                  <div className="inline-flex rounded-lg bg-primary/10 p-2.5 mb-3">
                    <FlaskConical className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-1">{tool.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{tool.short_description || tool.description}</p>
                  {tool.categories && (
                    <span className="inline-block mt-3 text-xs font-medium text-primary bg-primary/10 rounded-full px-2.5 py-0.5">{tool.categories.name}</span>
                  )}
                </Link>
                <button
                  onClick={() => toggleMarketplace(tool.id, tool.is_marketplace)}
                  className={`absolute top-3 right-3 p-1.5 rounded-lg transition-colors ${
                    tool.is_marketplace
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                  title={tool.is_marketplace ? "Remover do Marketplace" : "Publicar no Marketplace"}
                >
                  <Share2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section header */}
      {filteredUser.length > 0 && <h2 className="text-lg font-semibold mb-4">Simuladores do Sistema</h2>}

      {selectedCategory ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNative.map((sim) => {
            const Icon = sim.icon;
            return canUseSimulator ? (
              <Link
                key={sim.slug}
                to={`/simuladores/${sim.slug}`}
                className="rounded-2xl border border-primary/30 bg-card p-5 hover:shadow-lg hover:shadow-primary/5 transition-all hover:-translate-y-0.5 ring-1 ring-primary/20"
              >
                <div className="inline-flex rounded-lg bg-primary/10 p-2.5 mb-3"><Icon className="h-5 w-5 text-primary" /></div>
                <h3 className="font-semibold mb-1">{sim.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">{sim.description}</p>
                <span className="inline-block mt-3 text-xs font-medium text-primary bg-primary/10 rounded-full px-2.5 py-0.5">{sim.category}</span>
              </Link>
            ) : (
              <div
                key={sim.slug}
                onClick={() => showUpgrade("Simuladores avançados são exclusivos do plano Premium")}
                className="cursor-pointer rounded-2xl border border-border bg-card p-5 opacity-75 hover:opacity-100 transition-all relative"
              >
                <div className="absolute top-3 right-3"><Lock className="h-4 w-4 text-muted-foreground" /></div>
                <div className="inline-flex rounded-lg bg-muted p-2.5 mb-3"><Icon className="h-5 w-5 text-muted-foreground" /></div>
                <h3 className="font-semibold mb-1">{sim.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">{sim.description}</p>
                <span className="inline-block mt-3 text-xs font-medium text-muted-foreground bg-muted rounded-full px-2.5 py-0.5">{sim.category}</span>
              </div>
            );
          })}
          {filteredDynamic.map((tool: any) => (
            <Link
              key={tool.id}
              to={`/simuladores/${tool.slug}`}
              className="rounded-2xl border border-border bg-card p-5 hover:shadow-lg hover:shadow-primary/5 transition-all hover:-translate-y-0.5"
            >
              <div className="inline-flex rounded-lg bg-accent/10 p-2.5 mb-3">
                <FlaskConical className="h-5 w-5 text-accent" />
              </div>
              <h3 className="font-semibold mb-1">{tool.name}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">{tool.short_description || tool.description}</p>
              {tool.categories && (
                <span className="inline-block mt-3 text-xs font-medium text-accent bg-accent/10 rounded-full px-2.5 py-0.5">{tool.categories.name}</span>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <>
          {allCategories.map((cat) => {
            const catNative = NATIVE_SIMULATORS.filter((s) => {
              const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.description.toLowerCase().includes(search.toLowerCase());
              return s.category === cat && matchesSearch;
            });
            const catDynamic = tools.filter((t: any) => {
              const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase());
              return t.categories?.name === cat && matchesSearch;
            });
            if (catNative.length === 0 && catDynamic.length === 0) return null;
            return (
              <div key={cat} className="mb-8">
                <h2 className="text-lg font-semibold mb-3">{cat}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {catNative.map((sim) => {
                    const Icon = sim.icon;
                    return canUseSimulator ? (
                      <Link
                        key={sim.slug}
                        to={`/simuladores/${sim.slug}`}
                        className="rounded-2xl border border-primary/30 bg-card p-5 hover:shadow-lg hover:shadow-primary/5 transition-all hover:-translate-y-0.5 ring-1 ring-primary/20"
                      >
                        <div className="inline-flex rounded-lg bg-primary/10 p-2.5 mb-3"><Icon className="h-5 w-5 text-primary" /></div>
                        <h3 className="font-semibold mb-1">{sim.name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">{sim.description}</p>
                        <span className="inline-block mt-3 text-xs font-medium text-primary bg-primary/10 rounded-full px-2.5 py-0.5">{sim.category}</span>
                      </Link>
                    ) : (
                      <div
                        key={sim.slug}
                        onClick={() => showUpgrade("Simuladores avançados são exclusivos do plano Premium")}
                        className="cursor-pointer rounded-2xl border border-border bg-card p-5 opacity-75 hover:opacity-100 transition-all relative"
                      >
                        <div className="absolute top-3 right-3"><Lock className="h-4 w-4 text-muted-foreground" /></div>
                        <div className="inline-flex rounded-lg bg-muted p-2.5 mb-3"><Icon className="h-5 w-5 text-muted-foreground" /></div>
                        <h3 className="font-semibold mb-1">{sim.name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">{sim.description}</p>
                        <span className="inline-block mt-3 text-xs font-medium text-muted-foreground bg-muted rounded-full px-2.5 py-0.5">{sim.category}</span>
                      </div>
                    );
                  })}
                  {catDynamic.map((tool: any) => (
                    <Link
                      key={tool.id}
                      to={`/simuladores/${tool.slug}`}
                      className="rounded-2xl border border-border bg-card p-5 hover:shadow-lg hover:shadow-primary/5 transition-all hover:-translate-y-0.5"
                    >
                      <div className="inline-flex rounded-lg bg-accent/10 p-2.5 mb-3">
                        <FlaskConical className="h-5 w-5 text-accent" />
                      </div>
                      <h3 className="font-semibold mb-1">{tool.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{tool.short_description || tool.description}</p>
                      {tool.categories && (
                        <span className="inline-block mt-3 text-xs font-medium text-accent bg-accent/10 rounded-full px-2.5 py-0.5">{tool.categories.name}</span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}

      {!isLoading && filteredNative.length === 0 && filteredDynamic.length === 0 && filteredUser.length === 0 && (
        <p className="text-muted-foreground text-center py-12">
          {search ? t("simulators.noResults") : t("simulators.empty")}
        </p>
      )}
    </div>
  );
}
