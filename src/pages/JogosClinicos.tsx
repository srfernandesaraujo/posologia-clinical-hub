import { useTranslation } from "react-i18next";
import { Brain, Home, FlaskConical, Search, Crosshair, Award, Link, Building } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useState } from "react";
import RpgTccGame from "@/components/games/RpgTccGame";
import VilaSaudeGame from "@/components/games/VilaSaudeGame";
import LaboratorioInteracoesGame from "@/components/games/LaboratorioInteracoesGame";
import DetetiveHistoricoGame from "@/components/games/DetetiveHistoricoGame";
import ResseccaoOncologicaGame from "@/components/games/ResseccaoOncologicaGame";
import MilionarioFarmaGame from "@/components/games/MilionarioFarmaGame";
import DominoClinicoGame from "@/components/games/DominoClinicoGame";
import CarreiraClinicaGame from "@/components/games/CarreiraClinicaGame";
import { Button } from "@/components/ui/button";

const games = [
  {
    id: "rpg-tcc",
    title: "RPG Clínico — TCC",
    description: "Combata monstros de distorções cognitivas usando lógica e pensamento racional.",
    icon: Brain,
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
    badge: "7 batalhas",
  },
  {
    id: "vila-saude",
    title: "Vila da Saúde",
    description: "Construa e melhore uma cidade ao registar que tomou os seus remédios.",
    icon: Home,
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    badge: "6 construções",
  },
  {
    id: "laboratorio",
    title: "Laboratório de Interações",
    description: "Combine medicamentos, alimentos e fitoterápicos para descobrir interações.",
    icon: FlaskConical,
    iconBg: "bg-indigo-100",
    iconColor: "text-indigo-600",
    badge: "6 substâncias",
  },
  {
    id: "detetive",
    title: "Detetive do Histórico",
    description: "Organize a sua anamnese farmacoterapêutica passo a passo antes da consulta.",
    icon: Search,
    iconBg: "bg-stone-100",
    iconColor: "text-stone-600",
    badge: "4 pistas",
  },
  {
    id: "resseccao",
    title: "Ressecção Oncológica",
    description: "Elimine células tumorais aplicando terapia alvo neste puzzle Resta 1.",
    icon: Crosshair,
    iconBg: "bg-rose-100",
    iconColor: "text-rose-600",
    badge: "Puzzle",
  },
  {
    id: "milionario",
    title: "Milionário da Farmacologia",
    description: "Responda perguntas de farmacologia clínica e suba na carreira hospitalar.",
    icon: Award,
    iconBg: "bg-yellow-100",
    iconColor: "text-yellow-600",
    badge: "5 níveis",
  },
  {
    id: "domino",
    title: "Dominó Clínico",
    description: "Conecte peças de doenças, fármacos e efeitos adversos numa cascata prescritiva.",
    icon: Link,
    iconBg: "bg-stone-100",
    iconColor: "text-stone-600",
    badge: "7 peças",
  },
  {
    id: "carreira",
    title: "Carreira Clínica",
    description: "Gerencie um consultório num tabuleiro estilo Banco Imobiliário.",
    icon: Building,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    badge: "16 casas",
  },
];

const gameComponents: Record<string, { component: React.FC; title: string; subtitle: string }> = {
  "rpg-tcc": {
    component: RpgTccGame,
    title: "RPG de Texto Clínico — TCC",
    subtitle: "Combata distorções cognitivas usando pensamento racional.",
  },
  "vila-saude": {
    component: VilaSaudeGame,
    title: "Vila da Saúde",
    subtitle: "Tome os seus remédios e construa a sua vila!",
  },
  "laboratorio": {
    component: LaboratorioInteracoesGame,
    title: "Laboratório de Interações",
    subtitle: "Descubra interações entre medicamentos, alimentos e fitoterápicos.",
  },
  "detetive": {
    component: DetetiveHistoricoGame,
    title: "Detetive do Histórico Clínico",
    subtitle: "Construa o seu dossiê farmacoterapêutico passo a passo.",
  },
  "resseccao": {
    component: ResseccaoOncologicaGame,
    title: "Ressecção Oncológica: Terapia Alvo",
    subtitle: "Elimine todas as células tumorais até restar apenas uma.",
  },
  "milionario": {
    component: MilionarioFarmaGame,
    title: "Milionário da Farmacologia",
    subtitle: "Responda perguntas clínicas e alcance o nível de Chefe de Clínica!",
  },
  "domino": {
    component: DominoClinicoGame,
    title: "Dominó Clínico",
    subtitle: "Desvende a cascata prescritiva conectando peças clínicas.",
  },
  "carreira": {
    component: CarreiraClinicaGame,
    title: "Carreira Clínica",
    subtitle: "Gerencie as finanças do seu consultório neste tabuleiro clínico.",
  },
};

export default function JogosClinicos() {
  const { t } = useTranslation();
  const [activeGame, setActiveGame] = useState<string | null>(null);

  const active = activeGame ? gameComponents[activeGame] : null;

  if (active) {
    const GameComponent = active.component;
    return (
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" className="mb-4 gap-2" onClick={() => setActiveGame(null)}>
          ← Voltar aos jogos
        </Button>
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">{active.title}</h1>
          <p className="text-muted-foreground">{active.subtitle}</p>
        </div>
        <GameComponent />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t("games.title")}</h1>
        <p className="text-muted-foreground text-lg">{t("games.subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {games.map((game) => (
          <Card
            key={game.id}
            className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary/40"
            onClick={() => setActiveGame(game.id)}
          >
            <CardHeader className="pb-3">
              <div className={`inline-flex rounded-xl ${game.iconBg} p-3 mb-2 w-fit`}>
                <game.icon className={`h-6 w-6 ${game.iconColor}`} />
              </div>
              <CardTitle className="text-lg">{game.title}</CardTitle>
              <CardDescription>{game.description}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded-full">
                {game.badge}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
