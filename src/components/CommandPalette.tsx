import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Command as CommandPrimitive } from "cmdk";
import { Search, Clock, CornerDownLeft, Lock, Dna, type LucideIcon } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { NATIVE_SIMULATORS } from "@/data/simulatorCatalog";
import { NATIVE_CALCULATORS } from "@/data/calculatorCatalog";
import { benches } from "@/pages/LaboratorioVirtual";
import { ACCOUNT_ITEMS, type NavGroup } from "@/components/layouts/appNavigation";
import { cn } from "@/lib/utils";

const RECENTS_KEY = "posologia_palette_recents_v1";
const MAX_RECENTS = 5;

interface PaletteEntry {
  id: string;
  title: string;
  subtitle: string;
  to: string;
  group: string;
  icon: LucideIcon;
  keywords: string;
  locked?: boolean;
}

/** Remove acentos e caixa para que "farmaco" encontre "Fármaco". */
function normalize(text: string) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Todas as palavras digitadas precisam aparecer (em qualquer ordem). */
function paletteFilter(value: string, search: string, keywords?: string[]) {
  const haystack = normalize(`${value} ${(keywords || []).join(" ")}`);
  const terms = normalize(search).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return 1;
  if (!terms.every((term) => haystack.includes(term))) return 0;
  // Título que começa com o termo vem primeiro
  return normalize(value).startsWith(terms[0]) ? 1 : 0.6;
}

function readRecents(): string[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function pushRecent(id: string) {
  try {
    const next = [id, ...readRecents().filter((r) => r !== id)].slice(0, MAX_RECENTS);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    /* armazenamento indisponível: a busca funciona sem recentes */
  }
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: NavGroup[];
  isPremium: boolean;
}

export function CommandPalette({ open, onOpenChange, groups, isPremium }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [recentIds, setRecentIds] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setSearch("");
      setRecentIds(readRecents());
    }
  }, [open]);

  const entries = useMemo<PaletteEntry[]>(() => {
    const pages: PaletteEntry[] = [...groups.flatMap((g) => g.items.map((item) => ({ item, group: g.label }))), ...ACCOUNT_ITEMS.map((item) => ({ item, group: "Conta" }))]
      .map(({ item, group }) => ({
        id: `page:${item.to}`,
        title: item.labelKey ? t(item.labelKey, { defaultValue: item.label }) : item.label,
        subtitle: group,
        to: item.to,
        group: "Páginas",
        icon: item.icon,
        keywords: `${item.label} ${group}`,
        locked: item.premium && !isPremium,
      }));

    const simulators: PaletteEntry[] = NATIVE_SIMULATORS.map((sim) => ({
      id: `sim:${sim.slug}`,
      title: sim.name,
      subtitle: sim.category,
      to: `/simuladores/${sim.slug}`,
      group: "Simuladores",
      icon: sim.icon,
      keywords: `${sim.category} ${sim.description}`,
      locked: !isPremium,
    }));

    const calculators: PaletteEntry[] = NATIVE_CALCULATORS.map((calc) => ({
      id: `calc:${calc.path}`,
      title: calc.name,
      subtitle: calc.category,
      to: calc.path,
      group: "Calculadoras",
      icon: calc.icon,
      keywords: `${calc.category} ${calc.searchKey}`,
    }));

    const labs: PaletteEntry[] = benches
      .filter((b) => b.status === "disponivel")
      .map((b) => ({
        id: `lab:${b.id}`,
        title: b.title,
        subtitle: `Laboratório Virtual · ${b.subtitle}`,
        to: b.route,
        group: "Laboratório Virtual",
        icon: Dna,
        keywords: `${b.subtitle} ${b.description} bancada laboratorio`,
        locked: !isPremium,
      }));

    return [...pages, ...simulators, ...calculators, ...labs];
  }, [groups, isPremium, t]);

  const byId = useMemo(() => new Map(entries.map((e) => [e.id, e])), [entries]);
  const recents = recentIds.map((id) => byId.get(id)).filter(Boolean) as PaletteEntry[];

  const sections = useMemo(() => {
    const order = ["Páginas", "Simuladores", "Calculadoras", "Laboratório Virtual"];
    return order.map((name) => ({ name, items: entries.filter((e) => e.group === name) }));
  }, [entries]);

  const go = (entry: PaletteEntry) => {
    pushRecent(entry.id);
    onOpenChange(false);
    navigate(entry.to);
  };

  const renderItem = (entry: PaletteEntry, keyPrefix = "") => (
    <CommandPrimitive.Item
      key={`${keyPrefix}${entry.id}`}
      value={`${keyPrefix}${entry.title}`}
      keywords={[entry.subtitle, entry.keywords]}
      onSelect={() => go(entry)}
      className="group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm outline-none data-[selected=true]:bg-primary/10 data-[selected=true]:text-foreground"
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-border bg-secondary/60 text-muted-foreground group-data-[selected=true]:border-primary/40 group-data-[selected=true]:text-primary">
        <entry.icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{entry.title}</span>
        <span className="block truncate text-xs text-muted-foreground">{entry.subtitle}</span>
      </span>
      {entry.locked && <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" aria-label="Premium" />}
      <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-primary opacity-0 group-data-[selected=true]:opacity-100" />
    </CommandPrimitive.Item>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[12vh] translate-y-0 gap-0 overflow-hidden border-border/80 bg-popover/95 p-0 shadow-2xl shadow-black/50 backdrop-blur-xl sm:max-w-xl [&>button]:hidden">
        <DialogTitle className="sr-only">Buscar na plataforma</DialogTitle>
        <CommandPrimitive filter={paletteFilter} loop className="flex flex-col">
          <div className="flex items-center gap-3 border-b border-border px-4">
            <Search className="h-4 w-4 shrink-0 text-primary" />
            <CommandPrimitive.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Buscar simulador, calculadora, bancada ou página…"
              className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
            />
            <kbd className="hidden rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">Esc</kbd>
          </div>
          <CommandPrimitive.List className="max-h-[min(60vh,460px)] overflow-y-auto overscroll-contain p-2">
            <CommandPrimitive.Empty className="px-3 py-10 text-center text-sm text-muted-foreground">
              Nada encontrado para "{search}". Tente o nome do fármaco, do exame ou da disciplina.
            </CommandPrimitive.Empty>
            {!search && recents.length > 0 && (
              <CommandPrimitive.Group
                heading={<span className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> Recentes</span>}
                className="pb-1 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[10.5px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.14em] [&_[cmdk-group-heading]]:text-muted-foreground"
              >
                {recents.map((entry) => renderItem(entry, "recent:"))}
              </CommandPrimitive.Group>
            )}
            {sections.map((section) => (
              <CommandPrimitive.Group
                key={section.name}
                heading={section.name}
                className={cn(
                  "pb-1 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[10.5px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.14em] [&_[cmdk-group-heading]]:text-muted-foreground",
                )}
              >
                {section.items.map((entry) => renderItem(entry))}
              </CommandPrimitive.Group>
            ))}
          </CommandPrimitive.List>
          <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
            <span>
              <kbd className="font-mono">↑↓</kbd> navegar · <kbd className="font-mono">Enter</kbd> abrir
            </span>
            <span>{entries.length} itens na plataforma</span>
          </div>
        </CommandPrimitive>
      </DialogContent>
    </Dialog>
  );
}
