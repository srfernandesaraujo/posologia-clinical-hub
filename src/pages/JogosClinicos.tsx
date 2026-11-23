import { useTranslation } from "react-i18next";
import { Brain, Home, FlaskConical, Search, Crosshair, Award, Link, Building, Lock, Activity, Syringe, Droplet, TrendingUp, Target, Gamepad2, Plus, Sparkles, Shield, Pill, Heart, Crown, ChevronRight, LayoutGrid, List } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type MouseEvent, useCallback, useEffect, useRef, useState, useMemo } from "react";
import RpgTccGame from "@/components/games/RpgTccGame";
import VilaSaudeGame from "@/components/games/VilaSaudeGame";
import LaboratorioInteracoesGame from "@/components/games/LaboratorioInteracoesGame";
import DetetiveHistoricoGame from "@/components/games/DetetiveHistoricoGame";
import ResseccaoOncologicaGame from "@/components/games/ResseccaoOncologicaGame";
import MilionarioFarmaGame from "@/components/games/MilionarioFarmaGame";
import DominoClinicoGame from "@/components/games/DominoClinicoGame";
import CarreiraClinicaGame from "@/components/games/CarreiraClinicaGame";
import PlantaoNoturnoGame from "@/components/games/PlantaoNoturnoGame";
import GestorClearanceGame from "@/components/games/GestorClearanceGame";
import AlertaVermelhoGame from "@/components/games/AlertaVermelhoGame";
import JanelaTerapeuticaGame from "@/components/games/JanelaTerapeuticaGame";
import LabirintoHemogramaGame from "@/components/games/LabirintoHemogramaGame";
import BolsaMetabolicaGame from "@/components/games/BolsaMetabolicaGame";
import InsulinaBirdsGame from "@/components/games/InsulinaBirdsGame";
import AlexKiddHipertensaoGame from "@/components/games/AlexKiddHipertensaoGame";
import PandemicFarmaGame from "@/components/games/PandemicFarmaGame";
import FarmaciaPlantaoGame from "@/components/games/FarmaciaPlantaoGame";
import CodigoAzulGame from "@/components/games/CodigoAzulGame";
import DetetiveToxicologicoGame from "@/components/games/DetetiveToxicologicoGame";
import BatalhaNavalClinicaGame from "@/components/games/BatalhaNavalClinicaGame";
import DynamicAIGame from "@/components/games/DynamicAIGame";
import type { AIGameConfig } from "@/components/games/DynamicAIGame";
import GameHeader, { type GameUpdateType } from "@/components/games/GameHeader";
import GameRanking from "@/components/games/GameRanking";
import CreateGameDialog, { type GeneratedGame } from "@/components/CreateGameDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatureGating } from "@/hooks/useFeatureGating";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UpgradeModal } from "@/components/UpgradeModal";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layouts/PageHeader";
import { CatalogHub, type CatalogItem } from "@/components/catalog/CatalogHub";
import type { PreviewKind } from "@/data/catalogAreas";

const gamePromptSlugMap: Record<string, string> = {
  "rpg-tcc": "rpg-tcc",
  "vila-saude": "vila-saude",
  "laboratorio": "laboratorio-interacoes",
  "detetive": "detetive-historico",
  "resseccao": "resseccao-oncologica",
  "milionario": "milionario-farma",
  "domino": "domino-clinico",
  "carreira": "carreira-clinica",
  "plantao": "plantao-noturno",
  "clearance": "gestor-clearance",
  "alerta-vermelho": "alerta-vermelho",
  "janela": "janela-terapeutica",
  "labirinto": "labirinto-hemograma",
  "bolsa": "bolsa-metabolica",
  "insulina-birds": "insulina-birds",
  "alex-kidd-has": "alex-kidd-hipertensao",
  "pandemic-farma": "pandemic-farma",
  "farmacia-plantao": "farmacia-plantao",
  "codigo-azul": "codigo-azul",
  "detetive-toxico": "detetive-toxicologico",
  "batalha-naval": "batalha-naval-clinica",
};

type GameCategory = "farmacologia" | "investigacao" | "simulacao" | "acao" | "emergencia";

const categoryLabels: { id: GameCategory; label: string; icon: any; color: string }[] = [
  { id: "farmacologia", label: "Farmacologia", icon: Pill, color: "173 66% 50%" },
  { id: "investigacao", label: "Investigação", icon: Search, color: "45 90% 50%" },
  { id: "simulacao", label: "Simulação", icon: Activity, color: "200 70% 50%" },
  { id: "acao", label: "Ação & Estratégia", icon: Target, color: "280 60% 55%" },
  { id: "emergencia", label: "Emergência", icon: Heart, color: "0 62% 50%" },
];

const games: Array<{
  id: string;
  title: string;
  description: string;
  icon: any;
  iconBg: string;
  iconColor: string;
  badge: string;
  category: GameCategory;
}> = [
  { id: "rpg-tcc", title: "RPG Clínico — TCC", description: "Combata monstros de distorções cognitivas usando lógica e pensamento racional.", icon: Brain, iconBg: "bg-purple-100", iconColor: "text-purple-600", badge: "7 batalhas", category: "acao" },
  { id: "vila-saude", title: "Vila da Saúde", description: "Construa e melhore uma cidade ao registar que tomou os seus remédios.", icon: Home, iconBg: "bg-emerald-100", iconColor: "text-emerald-600", badge: "6 construções", category: "simulacao" },
  { id: "laboratorio", title: "Laboratório de Interações", description: "Combine medicamentos, alimentos e fitoterápicos para descobrir interações.", icon: FlaskConical, iconBg: "bg-indigo-100", iconColor: "text-indigo-600", badge: "6 substâncias", category: "farmacologia" },
  { id: "detetive", title: "Detetive do Histórico", description: "Organize a sua anamnese farmacoterapêutica passo a passo antes da consulta.", icon: Search, iconBg: "bg-stone-100", iconColor: "text-stone-600", badge: "4 pistas", category: "investigacao" },
  { id: "resseccao", title: "Ressecção Oncológica", description: "Elimine células tumorais aplicando terapia alvo neste puzzle Resta 1.", icon: Crosshair, iconBg: "bg-rose-100", iconColor: "text-rose-600", badge: "Puzzle", category: "acao" },
  { id: "milionario", title: "Milionário da Farmacologia", description: "Responda perguntas de farmacologia clínica e suba na carreira hospitalar.", icon: Award, iconBg: "bg-yellow-100", iconColor: "text-yellow-600", badge: "5 níveis", category: "farmacologia" },
  { id: "domino", title: "Dominó Clínico", description: "Conecte peças de doenças, fármacos e efeitos adversos numa cascata prescritiva.", icon: Link, iconBg: "bg-stone-100", iconColor: "text-stone-600", badge: "7 peças", category: "farmacologia" },
  { id: "carreira", title: "Carreira Clínica", description: "Gerencie um consultório num tabuleiro estilo Banco Imobiliário.", icon: Building, iconBg: "bg-amber-100", iconColor: "text-amber-600", badge: "16 casas", category: "simulacao" },
  { id: "plantao", title: "O Plantão Noturno", description: "Escape Room clínico: encontre pistas e salve o paciente antes do tempo acabar.", icon: Lock, iconBg: "bg-zinc-200", iconColor: "text-zinc-700", badge: "Escape Room", category: "emergencia" },
  { id: "clearance", title: "Gestor de Clearance", description: "Ajuste doses de Vancomicina monitorizando a função renal do paciente.", icon: Activity, iconBg: "bg-teal-100", iconColor: "text-teal-600", badge: "7 dias", category: "farmacologia" },
  { id: "alerta-vermelho", title: "Alerta Vermelho", description: "Investigue qual medicamento causa os sintomas do paciente.", icon: Syringe, iconBg: "bg-red-100", iconColor: "text-red-600", badge: "Investigação", category: "investigacao" },
  { id: "janela", title: "A Janela Terapêutica", description: "Ajuste a dose de Varfarina para manter o INR na zona segura.", icon: Activity, iconBg: "bg-blue-100", iconColor: "text-blue-600", badge: "10 dias", category: "farmacologia" },
  { id: "labirinto", title: "Labirinto do Hemograma", description: "Navegue pela árvore de decisão para diagnosticar o tipo de anemia.", icon: Droplet, iconBg: "bg-red-100", iconColor: "text-red-600", badge: "3 passos", category: "investigacao" },
  { id: "bolsa", title: "Bolsa de Valores Metabólica", description: "Transforme exames laboratoriais em ações de saúde estilo trading.", icon: TrendingUp, iconBg: "bg-emerald-100", iconColor: "text-emerald-600", badge: "Portfólio", category: "simulacao" },
  { id: "insulina-birds", title: "Insulina Birds", description: "Lance insulinas contra alvos glicêmicos estilo Angry Birds e controle o diabetes!", icon: Target, iconBg: "bg-sky-100", iconColor: "text-sky-600", badge: "5 fases", category: "acao" },
  { id: "alex-kidd-has", title: "Alex Kidd Anti-Hipertensivo", description: "Plataformer retro: colete anti-hipertensivos corretos e desvie de efeitos adversos!", icon: Gamepad2, iconBg: "bg-cyan-100", iconColor: "text-cyan-600", badge: "5 fases", category: "acao" },
  { id: "pandemic-farma", title: "Pandemic Farma", description: "Tower Defense: posicione antibióticos para deter ondas de bactérias resistentes.", icon: Shield, iconBg: "bg-red-100", iconColor: "text-red-600", badge: "Tower Defense", category: "acao" },
  { id: "farmacia-plantao", title: "Farmácia de Plantão", description: "Triagem de prescrições sob pressão: verifique doses, interações e oriente pacientes.", icon: Pill, iconBg: "bg-orange-100", iconColor: "text-orange-600", badge: "Gestão/Tempo", category: "simulacao" },
  { id: "codigo-azul", title: "Código Azul", description: "Simulador ACLS: lidere uma parada cardiorrespiratória com timer real.", icon: Heart, iconBg: "bg-red-100", iconColor: "text-red-600", badge: "ACLS", category: "emergencia" },
  { id: "detetive-toxico", title: "Detetive Toxicológico", description: "Investigue intoxicações: identifique toxidromes e administre o antídoto correto.", icon: Search, iconBg: "bg-amber-100", iconColor: "text-amber-600", badge: "Investigação", category: "investigacao" },
  { id: "batalha-naval", title: "Batalha Naval Clínica", description: "Localize órgãos ocultos no tabuleiro e responda perguntas de fisiopatologia para confirmar o acerto.", icon: Crosshair, iconBg: "bg-sky-100", iconColor: "text-sky-600", badge: "8×8 / 30 tiros", category: "investigacao" },
];

const GAME_VERSION_STORAGE_KEY = "clinical-games-version-map-v1";

const readInitialVersions = () => {
  try {
    const raw = localStorage.getItem(GAME_VERSION_STORAGE_KEY);
    if (!raw) return {} as Record<string, number>;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {} as Record<string, number>;
    return Object.entries(parsed).reduce<Record<string, number>>((acc, [key, value]) => {
      const numeric = Number(value);
      if (!Number.isNaN(numeric)) acc[key] = Number(numeric.toFixed(1));
      return acc;
    }, {});
  } catch {
    return {} as Record<string, number>;
  }
};

const gameComponents: Record<string, {
  component: React.FC<{ customData?: any }>;
  title: string;
  subtitle: string;
  howToPlay: string;
  aiPrompt: string;
}> = {
  "rpg-tcc": {
    component: RpgTccGame,
    title: "RPG de Texto Clínico — TCC",
    subtitle: "Combata distorções cognitivas usando pensamento racional.",
    howToPlay: `🎮 RPG Clínico — Terapia Cognitivo-Comportamental\n\n📋 Objetivo: Derrote 7 monstros que representam distorções cognitivas usando pensamento racional.\n\n🕹️ Como jogar:\n1. Cada monstro apresenta uma situação distorcida\n2. Escolha a resposta mais racional entre as opções\n3. Resposta correta: derrota o monstro e ganha 50 XP\n4. Resposta errada: perde 20 HP de vida\n5. Se o HP chegar a 0, é Game Over\n\n💡 Dica: Identifique qual distorção cognitiva está em jogo.`,
    aiPrompt: `Gere um array JSON "battles" com 7 novas batalhas de RPG de TCC.\nRetorne: { "battles": [...] }`,
  },
  "vila-saude": {
    component: VilaSaudeGame,
    title: "Vila da Saúde",
    subtitle: "Tome os seus remédios e construa a sua vila!",
    howToPlay: `🏘️ Vila da Saúde — Adesão Medicamentosa\n\n📋 Objetivo: Tome os seus medicamentos diários e use as moedas para construir a vila.\n\n🕹️ Como jogar:\n1. Marque cada medicamento como tomado para ganhar moedas\n2. Use as moedas para melhorar as construções\n3. Cada construção tem 3-4 níveis\n4. Ao atingir o nível máximo, ganha confetes!`,
    aiPrompt: `Gere novos dados para o jogo Vila da Saúde.\nRetorne: { "medications": [...], "buildings": [...] }`,
  },
  "laboratorio": {
    component: LaboratorioInteracoesGame,
    title: "Laboratório de Interações",
    subtitle: "Descubra interações entre medicamentos, alimentos e fitoterápicos.",
    howToPlay: `🧪 Laboratório de Interações\n\n📋 Objetivo: Descubra todas as interações perigosas combinando substâncias.\n\n🕹️ Como jogar:\n1. Selecione 2 substâncias\n2. Clique em "MISTURAR"\n3. Descubra todas as 3 interações perigosas!`,
    aiPrompt: `Gere novos dados para o Laboratório de Interações.\nRetorne: { "items": [...], "interactions": {...} }`,
  },
  "detetive": {
    component: DetetiveHistoricoGame,
    title: "Detetive do Histórico Clínico",
    subtitle: "Construa o seu dossiê farmacoterapêutico passo a passo.",
    howToPlay: `🔍 Detetive do Histórico Clínico\n\n📋 Objetivo: Complete uma anamnese farmacoterapêutica completa.\n\n🕹️ Como jogar:\n1. Responda a cada pergunta sobre o histórico do paciente\n2. Avance pelas 4 etapas\n3. Revise o dossiê completo`,
    aiPrompt: `Gere novas perguntas para o Detetive do Histórico Clínico.\nRetorne: { "questions": [...] }`,
  },
  "resseccao": {
    component: ResseccaoOncologicaGame,
    title: "Ressecção Oncológica: Terapia Alvo",
    subtitle: "Elimine todas as células tumorais até restar apenas uma.",
    howToPlay: `🎯 Ressecção Oncológica — Resta 1\n\n📋 Objetivo: Elimine células tumorais até restar apenas UMA célula.\n\n🕹️ Como jogar:\n1. Clique numa célula tumoral para selecioná-la\n2. Salte sobre outra célula para eliminá-la\n3. Vence quando restar apenas 1 célula`,
    aiPrompt: `Gere uma nova configuração de tabuleiro.\nRetorne: { "board": [[...], ...] }`,
  },
  "milionario": {
    component: MilionarioFarmaGame,
    title: "Milionário da Farmacologia",
    subtitle: "Escolha um contexto clínico e responda 15 perguntas de dificuldade crescente!",
    howToPlay: `💰 Milionário da Farmacologia\n\n📋 Objetivo: Responda 15 perguntas de dificuldade crescente.\n\n🕹️ Como jogar:\n1. Selecione um contexto clínico\n2. Use as ajudas estrategicamente`,
    aiPrompt: `Gere contextos clínicos para o Milionário.\nRetorne: { "contexts": [...] }`,
  },
  "domino": {
    component: DominoClinicoGame,
    title: "Dominó Clínico",
    subtitle: "Desvende a cascata prescritiva conectando peças clínicas.",
    howToPlay: `🁡 Dominó Clínico — Cascata Prescritiva\n\n📋 Objetivo: Conecte todas as peças do dominó.\n\n🕹️ Como jogar:\n1. O tabuleiro começa com uma peça\n2. Clique numa peça para jogá-la`,
    aiPrompt: `Gere uma nova cascata prescritiva.\nRetorne: { "tiles": [...] }`,
  },
  "carreira": {
    component: CarreiraClinicaGame,
    title: "Carreira Clínica",
    subtitle: "Gerencie as finanças do seu consultório neste tabuleiro clínico.",
    howToPlay: `🏥 Carreira Clínica\n\n📋 Objetivo: Gerencie o seu consultório sem ir à falência.\n\n🕹️ Como jogar:\n1. Lance os dados\n2. Compre propriedades e acumule riqueza`,
    aiPrompt: `Gere um novo tabuleiro.\nRetorne: { "board": [...], "chestCards": [...] }`,
  },
  "plantao": {
    component: PlantaoNoturnoGame,
    title: "O Plantão Noturno",
    subtitle: "Encontre pistas, resolva puzzles e salve o paciente a tempo.",
    howToPlay: `🔒 O Plantão Noturno — Escape Room Clínico\n\n📋 Objetivo: Encontre o antídoto antes que o tempo acabe (10 minutos).`,
    aiPrompt: `Gere um novo cenário para o Escape Room.\nRetorne: { "prontuario": {...}, ... }`,
  },
  "clearance": {
    component: GestorClearanceGame,
    title: "Gestor de Clearance",
    subtitle: "Monitore a função renal e ajuste a dose de Vancomicina em 7 dias.",
    howToPlay: `💉 Gestor de Clearance\n\n📋 Objetivo: Mantenha o paciente vivo por 7 dias ajustando a dose conforme a função renal.`,
    aiPrompt: `Gere novos dados para o Gestor de Clearance.\nRetorne: { "patientInfo": {...}, ... }`,
  },
  "alerta-vermelho": {
    component: AlertaVermelhoGame,
    title: "Alerta Vermelho: Investigação Toxicológica",
    subtitle: "Descubra qual medicamento está a causar os sintomas do paciente.",
    howToPlay: `🚨 Alerta Vermelho\n\n📋 Objetivo: Identifique qual medicamento causa os sintomas e prove com exames.`,
    aiPrompt: `Gere um novo caso.\nRetorne: { "patientInfo": {...}, ... }`,
  },
  "janela": {
    component: JanelaTerapeuticaGame,
    title: "A Janela Terapêutica",
    subtitle: "Ajuste a dose diária de Varfarina para manter o INR na zona segura.",
    howToPlay: `📊 A Janela Terapêutica\n\n📋 Objetivo: Mantenha o INR entre 2.0 e 3.0 durante 10 dias.`,
    aiPrompt: `Gere novos parâmetros.\nRetorne: { "drugName": "...", ... }`,
  },
  "labirinto": {
    component: LabirintoHemogramaGame,
    title: "O Labirinto do Hemograma",
    subtitle: "Navegue pela árvore de decisão e diagnostique a anemia.",
    howToPlay: `🩸 O Labirinto do Hemograma\n\n📋 Objetivo: Navegue pela árvore de decisão e identifique o tipo correto de anemia.`,
    aiPrompt: `Gere uma nova árvore de decisão.\nRetorne: { "storyNodes": {...} }`,
  },
  "bolsa": {
    component: BolsaMetabolicaGame,
    title: "Bolsa de Valores Metabólica",
    subtitle: "Os seus exames são ações. Melhore os resultados e ganhe dividendos!",
    howToPlay: `📈 Bolsa de Valores Metabólica\n\n📋 Objetivo: Acompanhe os seus biomarcadores como ações na bolsa.`,
    aiPrompt: `Gere novos biomarcadores.\nRetorne: { "biomarkers": [...] }`,
  },
  "insulina-birds": {
    component: InsulinaBirdsGame,
    title: "Insulina Birds — Angry Birds do Diabetes",
    subtitle: "Lance insulinas e antidiabéticos contra alvos glicêmicos!",
    howToPlay: `💉 Insulina Birds\n\n📋 Objetivo: Destrua os blocos de glicemia alta sem atingir os blocos verdes.`,
    aiPrompt: `Gere novos níveis.\nRetorne: { "levels": [...] }`,
  },
  "alex-kidd-has": {
    component: AlexKiddHipertensaoGame,
    title: "Alex Kidd Anti-Hipertensivo",
    subtitle: "Colete anti-hipertensivos e desvie de efeitos adversos neste plataformer retro!",
    howToPlay: `🎮 Alex Kidd Anti-Hipertensivo\n\n📋 Objetivo: Colete fármacos corretos e desvie de obstáculos.`,
    aiPrompt: `Gere novos níveis.\nRetorne: { "levels": [...] }`,
  },
  "pandemic-farma": {
    component: PandemicFarmaGame,
    title: "Pandemic Farma — Tower Defense de Antimicrobianos",
    subtitle: "Posicione antibióticos para deter ondas de bactérias resistentes no hospital.",
    howToPlay: `🛡️ Pandemic Farma — Tower Defense\n\n📋 Objetivo: Proteja os pacientes posicionando antibióticos.`,
    aiPrompt: `Gere novas ondas.\nRetorne: { "waves": [...] }`,
  },
  "farmacia-plantao": {
    component: FarmaciaPlantaoGame,
    title: "Farmácia de Plantão — Triagem em Tempo Real",
    subtitle: "Verifique prescrições, identifique erros e oriente pacientes sob pressão temporal.",
    howToPlay: `💊 Farmácia de Plantão\n\n📋 Objetivo: Analise prescrições sob pressão temporal.`,
    aiPrompt: `Gere novos turnos.\nRetorne: { "shifts": [...] }`,
  },
  "codigo-azul": {
    component: CodigoAzulGame,
    title: "Código Azul — Simulador ACLS",
    subtitle: "Lidere uma parada cardiorrespiratória seguindo o protocolo ACLS.",
    howToPlay: `❤️ Código Azul — Simulador ACLS\n\n📋 Objetivo: Siga o protocolo ACLS e obtenha ROSC.`,
    aiPrompt: `Gere novos cenários ACLS.\nRetorne: { "scenarios": [...] }`,
  },
  "detetive-toxico": {
    component: DetetiveToxicologicoGame,
    title: "Detetive Toxicológico — Investigação de Intoxicações",
    subtitle: "Investigue intoxicações, identifique toxidromes e administre o antídoto correto.",
    howToPlay: `🔍 Detetive Toxicológico\n\n📋 Objetivo: Investigue pacientes intoxicados e administre o antídoto correto.`,
    aiPrompt: `Gere novos casos.\nRetorne: { "cases": [...] }`,
  },
  "batalha-naval": {
    component: BatalhaNavalClinicaGame,
    title: "Batalha Naval Clínica",
    subtitle: "Localize órgãos ocultos e responda perguntas clínicas.",
    howToPlay: `⚓ Batalha Naval Clínica\n\n📋 Objetivo: Encontre os 6 órgãos ocultos no tabuleiro 8×8.`,
    aiPrompt: `Gere novas perguntas organizadas por órgão.\nRetorne: { "questions": {...} }`,
  },
};

const AI_GAMES_STORAGE_KEY = "clinical-ai-games-v2";

function loadAiGames(): GeneratedGame[] {
  try {
    const raw = localStorage.getItem(AI_GAMES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return parsed.filter((g: any) => g.gameConfig && g.gameConfig.rounds);
  } catch { return []; }
}

export default function JogosClinicos() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isPremium, showUpgrade, upgradeOpen, setUpgradeOpen, upgradeFeature } = useFeatureGating();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle().then(({ data }) => {
      setIsAdmin(!!data);
    });
  }, [user]);

  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [aiData, setAiData] = useState<Record<string, any>>({});
  const [gameVersions, setGameVersions] = useState<Record<string, number>>(readInitialVersions);
  const [sessionScore, setSessionScore] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [aiGames, setAiGames] = useState<GeneratedGame[]>(loadAiGames);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const lastInteractionRef = useRef(0);
  const active = activeGame ? gameComponents[activeGame] : null;

  const handleOpenGame = useCallback((gameId: string) => {
    if (!isPremium) {
      showUpgrade("Jogos Clínicos são exclusivos do plano Premium");
      return;
    }
    setActiveGame(gameId);
  }, [isPremium, showUpgrade]);

  const getVersion = useCallback((gameId: string) => Number((gameVersions[gameId] ?? 1).toFixed(1)), [gameVersions]);
  const formatVersion = useCallback((value: number) => value.toFixed(1), []);

  useEffect(() => {
    localStorage.setItem(GAME_VERSION_STORAGE_KEY, JSON.stringify(gameVersions));
  }, [gameVersions]);

  const awardGamePoints = useCallback(async (gameId: string, points: number, reason: string) => {
    if (!user) return;
    setSessionScore((prev) => prev + points);
    const { error } = await supabase.functions.invoke("award-points", {
      body: {
        source: "game_completion",
        points,
        simulator_slug: gameId,
        source_id: `${gameId}:${reason}`,
      },
    });
    if (error) console.error("Pontuação não registrada:", error.message);
  }, [user]);

  useEffect(() => {
    if (!activeGame) return;
    setSessionScore(0);
    lastInteractionRef.current = 0;
    void awardGamePoints(activeGame, 10, `start-${Date.now()}`);
  }, [activeGame, awardGamePoints]);

  const handleGameInteraction = useCallback((event: MouseEvent<HTMLDivElement>) => {
    if (!activeGame) return;
    const target = event.target as HTMLElement;
    if (!target.closest("button")) return;
    const now = Date.now();
    if (now - lastInteractionRef.current < 2500) return;
    lastInteractionRef.current = now;
    void awardGamePoints(activeGame, 3, `interaction-${now}`);
  }, [activeGame, awardGamePoints]);

  const handleAiUpdate = useCallback((data: any, updateType: GameUpdateType) => {
    if (!activeGame) return;
    setAiData((prev) => ({ ...prev, [activeGame]: data }));
    setGameVersions((prev) => {
      const current = prev[activeGame] ?? 1;
      const next = updateType === "major"
        ? Math.floor(current) + 1
        : Number((current + 0.1).toFixed(1));
      return { ...prev, [activeGame]: next };
    });
    void awardGamePoints(activeGame, updateType === "major" ? 30 : 10, `ai-update-${Date.now()}`);
  }, [activeGame, awardGamePoints]);

  const handleGameCreated = useCallback((game: GeneratedGame) => {
    setAiGames((prev) => {
      const next = [...prev, game];
      localStorage.setItem(AI_GAMES_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    toast.success(`Jogo "${game.title}" adicionado à coleção!`);
  }, []);

  const handleDeleteAiGame = useCallback((gameId: string) => {
    setAiGames((prev) => {
      const next = prev.filter((g) => g.id !== gameId);
      localStorage.setItem(AI_GAMES_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    toast.success("Jogo removido da coleção.");
  }, []);

  // Categories with counts
  const categoriesWithCounts = useMemo(() => {
    return categoryLabels.map(cat => ({
      ...cat,
      count: games.filter(g => g.category === cat.id).length,
    }));
  }, []);

  const totalCount = games.length;

  // Filtered games
  const filteredGames = useMemo(() => {
    return games.filter(g => {
      const matchesSearch = !search || g.title.toLowerCase().includes(search.toLowerCase()) || g.description.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = !selectedCategory || g.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [search, selectedCategory]);

  // Group filtered games by category
  const groupedGames = useMemo(() => {
    const groups = new Map<string, typeof games>();
    filteredGames.forEach(g => {
      if (!groups.has(g.category)) groups.set(g.category, []);
      groups.get(g.category)!.push(g);
    });
    // Sort by categoryLabels order
    return categoryLabels
      .filter(cat => groups.has(cat.id))
      .map(cat => ({ ...cat, games: groups.get(cat.id)! }));
  }, [filteredGames]);

  // Check if activeGame is an AI-generated game
  const activeAiGame = aiGames.find((g) => g.id === activeGame);

  // ── AI GAME VIEW ──
  if (activeAiGame && activeGame) {
    return (
      <div className="mx-auto max-w-4xl">
        <PageHeader
          onBack={() => setActiveGame(null)}
          backLabel="Voltar aos jogos"
          icon={<Sparkles />}
          title={activeAiGame.title}
          badges={<Badge variant="secondary" className="bg-primary/10 text-primary">Criado com IA</Badge>}
          description={activeAiGame.description}
        />
        <div onClickCapture={handleGameInteraction} className="rounded-2xl border border-border bg-card/60 p-4 sm:p-6">
          <DynamicAIGame config={activeAiGame.gameConfig} />
        </div>
        <GameRanking gameId={activeGame} currentScore={sessionScore} />
      </div>
    );
  }

  // ── BUILT-IN GAME VIEW ──
  if (active && activeGame) {
    const GameComponent = active.component;
    const customData = aiData[activeGame] || undefined;
    const versionLabel = formatVersion(getVersion(activeGame));
    const meta = games.find((g) => g.id === activeGame);

    return (
      <div className="mx-auto max-w-4xl">
        <PageHeader
          onBack={() => setActiveGame(null)}
          backLabel="Voltar aos jogos"
          icon={meta ? <meta.icon /> : <Gamepad2 />}
          title={active.title}
          badges={
            <>
              <Badge variant="secondary">v{versionLabel}</Badge>
              <Badge variant="outline">{categoryLabels.find((c) => c.id === meta?.category)?.label}</Badge>
            </>
          }
          description={active.subtitle}
          className="mb-4"
        />
        <AdminPromptViewer
          toolSlug={gamePromptSlugMap[activeGame] || activeGame}
          toolName={active.title}
          toolType="game"
          prompt={getNativePrompt(gamePromptSlugMap[activeGame] || activeGame) || ""}
        />
        <GameHeader
          howToPlay={active.howToPlay}
          aiPrompt={active.aiPrompt}
          gameId={activeGame}
          versionLabel={versionLabel}
          currentData={customData}
          onAiUpdate={handleAiUpdate}
          showAiFeatures={isAdmin}
        />
        <div onClickCapture={handleGameInteraction} className="rounded-2xl border border-border bg-card/60 p-4 sm:p-6">
          <GameComponent key={JSON.stringify(customData)} customData={customData} />
        </div>
        <GameRanking gameId={activeGame} currentScore={sessionScore} />
      </div>
    );
  }

  // ── GAMES LISTING ──
  const PREVIEW_BY_GAME_CATEGORY: Record<GameCategory, PreviewKind> = {
    farmacologia: "curve",
    investigacao: "record",
    simulacao: "bars",
    acao: "cycle",
    emergencia: "ecg",
  };
  const catalogItems: CatalogItem[] = games.map((game) => ({
    id: `game:${game.id}`,
    name: game.title,
    description: game.description,
    category: categoryLabels.find((c) => c.id === game.category)?.label || "Outros",
    icon: game.icon,
    to: "/jogos-clinicos",
    previewKind: PREVIEW_BY_GAME_CATEGORY[game.category] || "record",
    tags: [game.badge],
    locked: !isPremium,
  }));
  const gameIdOf = (item: CatalogItem) => item.id.replace(/^game:/, "");

  return (
    <>
      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} feature={upgradeFeature} />
      <CatalogHub
        eyebrow="Praticar"
        title="Jogos"
        titleAccent="clínicos"
        description={`${games.length} jogos de farmacologia, investigação, simulação, ação e emergência para revisar conteúdo jogando, sozinho ou com a turma.`}
        itemNoun={{ singular: "jogo", plural: "jogos" }}
        items={catalogItems}
        favoritesKey="posologia_fav_jogos_v1"
        onOpen={(item, e) => {
          e.preventDefault();
          handleOpenGame(gameIdOf(item));
          return false;
        }}
        onLockedClick={(item) => handleOpenGame(gameIdOf(item))}
        headerActions={
          <>
            {isPremium ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Crown className="h-3.5 w-3.5" /> Premium
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
                <Lock className="h-3.5 w-3.5" /> Exclusivo Premium
              </span>
            )}
            {isAdmin && (
              <Button onClick={() => setCreateDialogOpen(true)} size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" /> Criar com IA
              </Button>
            )}
          </>
        }
        beforeCatalog={
          aiGames.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Jogos criados com IA <span className="tabular-nums">{aiGames.length}</span>
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {aiGames.map((game) => (
                  <div
                    key={game.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleOpenGame(game.id)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleOpenGame(game.id); }}
                    className="group relative flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold group-hover:text-primary">{game.title}</span>
                      <span className="line-clamp-2 text-xs text-muted-foreground">{game.description}</span>
                    </span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDeleteAiGame(game.id); }}
                      className="text-xs text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )
        }
        afterCatalog={
          !isPremium && (
            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-primary/30 bg-primary/5 p-5">
              <Crown className="h-7 w-7 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold">Jogos Clínicos são exclusivos do Premium</h3>
                <p className="text-sm text-muted-foreground">Assine o plano Premium para jogar todos os jogos e usá-los com a turma.</p>
              </div>
              <Button onClick={() => showUpgrade("Jogos Clínicos")} size="sm" className="shrink-0 gap-2">
                <Crown className="h-4 w-4" /> Ver planos
              </Button>
            </div>
          )
        }
      />
      <CreateGameDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} onGameCreated={handleGameCreated} />
    </>
  );
}
