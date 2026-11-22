import {
  LayoutDashboard, Calculator, FlaskConical, Gamepad2, Dna, ScanEye, MessageSquare,
  GraduationCap, DoorOpen, Store, Trophy, Shield, Rocket, Headset, ShieldCheck,
  User, Crown, FileText, LifeBuoy, type LucideIcon,
} from "lucide-react";
import { NATIVE_SIMULATORS } from "@/data/simulatorCatalog";
import { NATIVE_CALCULATORS } from "@/data/calculatorCatalog";
import { benches } from "@/pages/LaboratorioVirtual";

// Estrutura única do menu do app. A barra lateral, a gaveta do celular, a busca
// Ctrl+K e a trilha de navegação leem daqui — mude aqui e todos acompanham.

export type NavGroupId = "inicio" | "praticar" | "ensinar" | "progresso" | "admin";

export interface NavItem {
  /** chave i18n (nav.*) ou rótulo literal quando não houver tradução */
  labelKey?: string;
  label: string;
  to: string;
  icon: LucideIcon;
  /** Recurso Premium: mostra cadeado para quem não é Premium */
  premium?: boolean;
  /** Quantidade exibida ao lado (tamanho do catálogo) */
  count?: number;
  /** Rota casa só exatamente (ex.: /admin não deve acender em /admin/pipeline) */
  exact?: boolean;
}

export interface NavGroup {
  id: NavGroupId;
  label: string;
  items: NavItem[];
}

const labBenchCount = benches.filter((b) => b.status === "disponivel").length;

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "inicio",
    label: "Início",
    items: [{ labelKey: "nav.dashboard", label: "Painel", to: "/dashboard", icon: LayoutDashboard }],
  },
  {
    id: "praticar",
    label: "Praticar",
    items: [
      { labelKey: "nav.simulators", label: "Simuladores", to: "/simuladores", icon: FlaskConical, count: NATIVE_SIMULATORS.length },
      { labelKey: "nav.calculators", label: "Calculadoras", to: "/calculadoras", icon: Calculator, count: NATIVE_CALCULATORS.length },
      { label: "Laboratório Virtual", to: "/laboratorio-virtual", icon: Dna, count: labBenchCount },
      { label: "MedView 3D", to: "/medview-3d", icon: ScanEye },
      { labelKey: "nav.games", label: "Jogos Clínicos", to: "/jogos-clinicos", icon: Gamepad2 },
    ],
  },
  {
    id: "ensinar",
    label: "Ensinar",
    items: [
      { label: "Turmas", to: "/turmas", icon: GraduationCap, premium: true },
      { labelKey: "nav.virtualRooms", label: "Salas Virtuais", to: "/salas-virtuais", icon: DoorOpen, premium: true },
      { label: "Feedback de Simulação", to: "/agente-feedback", icon: MessageSquare },
      { label: "Marketplace", to: "/marketplace", icon: Store, premium: true },
    ],
  },
  {
    id: "progresso",
    label: "Meu progresso",
    items: [{ labelKey: "nav.gamification", label: "Conquistas", to: "/gamificacao", icon: Trophy }],
  },
];

export const ADMIN_GROUP: NavGroup = {
  id: "admin",
  label: "Administração",
  items: [
    { labelKey: "nav.admin", label: "Painel admin", to: "/admin", icon: Shield, exact: true },
    { label: "Pipeline", to: "/admin/pipeline", icon: Rocket },
    { label: "Chamados", to: "/admin/tickets", icon: Headset },
    { label: "Curadoria", to: "/admin/marketplace-review", icon: ShieldCheck },
  ],
};

/** Itens do menu do avatar (conta e ajuda) — fora da navegação principal. */
export const ACCOUNT_ITEMS: NavItem[] = [
  { labelKey: "nav.myAccount", label: "Minha conta", to: "/minha-conta", icon: User },
  { labelKey: "nav.plans", label: "Plano e assinatura", to: "/planos", icon: Crown },
  { label: "Documentação", to: "/documentacao", icon: FileText },
  { label: "Suporte e contato", to: "/suporte", icon: LifeBuoy },
];

export function isNavItemActive(item: NavItem, pathname: string) {
  if (item.exact) return pathname === item.to;
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

/**
 * Trilha de navegação para o cabeçalho: grupo › seção › ferramenta.
 * Devolve null fora das seções conhecidas (a página mostra só o próprio título).
 */
export function getBreadcrumb(pathname: string, groups: NavGroup[]): { group: string; section: NavItem; leaf?: string } | null {
  for (const group of groups) {
    const section = group.items
      .filter((item) => isNavItemActive(item, pathname))
      .sort((a, b) => b.to.length - a.to.length)[0];
    if (!section) continue;
    let leaf: string | undefined;
    if (pathname !== section.to) {
      const slug = pathname.slice(section.to.length + 1).split("/")[0];
      if (section.to === "/simuladores") leaf = NATIVE_SIMULATORS.find((s) => s.slug === slug)?.name;
      else if (section.to === "/calculadoras") leaf = NATIVE_CALCULATORS.find((c) => c.path === `/calculadoras/${slug}`)?.name;
      else if (section.to === "/laboratorio-virtual") leaf = benches.find((b) => b.route === `/laboratorio-virtual/${slug}`)?.title;
    }
    return { group: group.label, section, leaf };
  }
  return null;
}
