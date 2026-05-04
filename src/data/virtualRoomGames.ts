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
import type { ComponentType } from "react";

export type VirtualRoomGameCategory =
  | "Farmacologia"
  | "Investigação"
  | "Simulação"
  | "Ação & Estratégia"
  | "Emergência";

export interface VirtualRoomGame {
  /** Slug stored on virtual_rooms.simulator_slug. Always prefixed with "game-". */
  slug: string;
  /** Original game id used in JogosClinicos.tsx */
  gameId: string;
  label: string;
  category: VirtualRoomGameCategory;
  component: ComponentType<{ customData?: any }>;
}

/**
 * Catalog of clinical games available inside virtual rooms.
 * The "game-" prefix lets the rest of the app distinguish games from
 * simulators / labs while reusing the existing virtual_rooms schema.
 */
export const VIRTUAL_ROOM_GAMES: VirtualRoomGame[] = [
  { slug: "game-rpg-tcc",          gameId: "rpg-tcc",          label: "RPG Clínico — TCC",                       category: "Ação & Estratégia", component: RpgTccGame },
  { slug: "game-vila-saude",       gameId: "vila-saude",       label: "Vila da Saúde",                            category: "Simulação",         component: VilaSaudeGame },
  { slug: "game-laboratorio",      gameId: "laboratorio",      label: "Laboratório de Interações",                category: "Farmacologia",      component: LaboratorioInteracoesGame },
  { slug: "game-detetive",         gameId: "detetive",         label: "Detetive do Histórico",                    category: "Investigação",      component: DetetiveHistoricoGame },
  { slug: "game-resseccao",        gameId: "resseccao",        label: "Ressecção Oncológica",                     category: "Ação & Estratégia", component: ResseccaoOncologicaGame },
  { slug: "game-milionario",       gameId: "milionario",       label: "Milionário da Farmacologia",               category: "Farmacologia",      component: MilionarioFarmaGame },
  { slug: "game-domino",           gameId: "domino",           label: "Dominó Clínico",                           category: "Farmacologia",      component: DominoClinicoGame },
  { slug: "game-carreira",         gameId: "carreira",         label: "Carreira Clínica",                         category: "Simulação",         component: CarreiraClinicaGame },
  { slug: "game-plantao",          gameId: "plantao",          label: "O Plantão Noturno",                        category: "Emergência",        component: PlantaoNoturnoGame },
  { slug: "game-clearance",        gameId: "clearance",        label: "Gestor de Clearance",                      category: "Farmacologia",      component: GestorClearanceGame },
  { slug: "game-alerta-vermelho",  gameId: "alerta-vermelho",  label: "Alerta Vermelho",                          category: "Investigação",      component: AlertaVermelhoGame },
  { slug: "game-janela",           gameId: "janela",           label: "A Janela Terapêutica",                     category: "Farmacologia",      component: JanelaTerapeuticaGame },
  { slug: "game-labirinto",        gameId: "labirinto",        label: "Labirinto do Hemograma",                   category: "Investigação",      component: LabirintoHemogramaGame },
  { slug: "game-bolsa",            gameId: "bolsa",            label: "Bolsa de Valores Metabólica",              category: "Simulação",         component: BolsaMetabolicaGame },
  { slug: "game-insulina-birds",   gameId: "insulina-birds",   label: "Insulina Birds",                           category: "Ação & Estratégia", component: InsulinaBirdsGame },
  { slug: "game-alex-kidd-has",    gameId: "alex-kidd-has",    label: "Alex Kidd Anti-Hipertensivo",              category: "Ação & Estratégia", component: AlexKiddHipertensaoGame },
  { slug: "game-pandemic-farma",   gameId: "pandemic-farma",   label: "Pandemic Farma",                           category: "Ação & Estratégia", component: PandemicFarmaGame },
  { slug: "game-farmacia-plantao", gameId: "farmacia-plantao", label: "Farmácia de Plantão",                      category: "Simulação",         component: FarmaciaPlantaoGame },
  { slug: "game-codigo-azul",      gameId: "codigo-azul",      label: "Código Azul",                              category: "Emergência",        component: CodigoAzulGame },
  { slug: "game-detetive-toxico",  gameId: "detetive-toxico",  label: "Detetive Toxicológico",                    category: "Investigação",      component: DetetiveToxicologicoGame },
  { slug: "game-batalha-naval",    gameId: "batalha-naval",    label: "Batalha Naval Clínica",                    category: "Investigação",      component: BatalhaNavalClinicaGame },
];

export const VIRTUAL_ROOM_GAME_CATEGORIES: VirtualRoomGameCategory[] = [
  "Farmacologia",
  "Investigação",
  "Simulação",
  "Ação & Estratégia",
  "Emergência",
];

export const GAME_SLUG_PREFIX = "game-";

export function isGameSlug(slug?: string | null): boolean {
  return !!slug && slug.startsWith(GAME_SLUG_PREFIX);
}

export function getGameBySlug(slug?: string | null): VirtualRoomGame | undefined {
  if (!slug) return undefined;
  return VIRTUAL_ROOM_GAMES.find((g) => g.slug === slug);
}

export const GAME_LABELS: Record<string, string> = VIRTUAL_ROOM_GAMES.reduce(
  (acc, g) => {
    acc[g.slug] = g.label;
    return acc;
  },
  {} as Record<string, string>,
);
