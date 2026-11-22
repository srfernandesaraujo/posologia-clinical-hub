import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Search, Star, Lock, X, LayoutGrid, List, Share2, type LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { CatalogPreview, TONE_COLOR } from "@/components/catalog/CatalogPreview";
import { OTHER_AREA, type CatalogArea, type AreaTone, type PreviewKind } from "@/data/catalogAreas";

// Página de catálogo compartilhada (Simuladores, Calculadoras): áreas,
// categorias, filtros, favoritos e cartões com prévia. Cada página só monta a
// lista de itens e diz o que acontece ao clicar.

export interface CatalogItem {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: LucideIcon;
  to: string;
  previewKind: PreviewKind;
  /** Rótulos curtos mostrados no rodapé do cartão (ex.: "Desafio", "Sala") */
  tags?: string[];
  /** Texto extra para a busca (palavras-chave, sinônimos) */
  keywords?: string;
  locked?: boolean;
}

export interface CatalogFilter {
  id: string;
  label: string;
  icon?: LucideIcon;
  test: (item: CatalogItem) => boolean;
}

export interface MyCatalogItem {
  item: CatalogItem;
  isMarketplace: boolean;
  onToggleMarketplace: () => void;
}

interface CatalogHubProps {
  eyebrow: string;
  title: string;
  titleAccent?: string;
  description: string;
  itemNoun: { singular: string; plural: string };
  items: CatalogItem[];
  /** Áreas que agrupam categorias. Sem áreas, as próprias categorias viram o primeiro nível. */
  areas?: CatalogArea[];
  filters?: CatalogFilter[];
  favoritesKey: string;
  mine?: MyCatalogItem[];
  mineTitle?: string;
  headerActions?: ReactNode;
  /** Conteúdo extra antes da lista (ex.: jogos criados com IA) e depois dela (ex.: aviso de plano). */
  beforeCatalog?: ReactNode;
  afterCatalog?: ReactNode;
  isLoading?: boolean;
  /** Interceptar o clique (ex.: cota de calculadoras). Retornar false cancela a navegação. */
  onOpen?: (item: CatalogItem, e: React.MouseEvent) => boolean | void;
  onLockedClick?: (item: CatalogItem) => void;
}

function normalize(text: string) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function readFavorites(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function CatalogHub({
  eyebrow, title, titleAccent, description, itemNoun, items, areas, filters = [], favoritesKey,
  mine = [], mineTitle, headerActions, beforeCatalog, afterCatalog, isLoading, onOpen, onLockedClick,
}: CatalogHubProps) {
  const [search, setSearch] = useState("");
  const [areaId, setAreaId] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(() => readFavorites(favoritesKey));
  const [view, setView] = useState<"grid" | "list">("grid");

  const toggleFavorite = (id: string) => {
    const next = favorites.includes(id) ? favorites.filter((f) => f !== id) : [...favorites, id];
    setFavorites(next);
    try {
      localStorage.setItem(favoritesKey, JSON.stringify(next));
    } catch {
      /* sem armazenamento: favoritos valem só nesta visita */
    }
  };

  // Áreas efetivas: as informadas + "Outros" para categorias sem área; sem áreas, uma por categoria.
  const effectiveAreas = useMemo<CatalogArea[]>(() => {
    const categories = [...new Set(items.map((i) => i.category))];
    if (!areas) {
      return categories
        .sort((a, b) => a.localeCompare(b))
        .map((c) => ({ id: c, label: c, description: "", tone: "primary" as AreaTone, categories: [c] }));
    }
    const mapped = new Set(areas.flatMap((a) => a.categories));
    const orphans = categories.filter((c) => !mapped.has(c));
    return orphans.length ? [...areas, { ...OTHER_AREA, categories: orphans }] : areas;
  }, [areas, items]);

  const areaOf = (cat: string) => effectiveAreas.find((a) => a.categories.includes(cat)) || OTHER_AREA;
  const hasAreaLevel = !!areas;

  const terms = normalize(search).split(/\s+/).filter(Boolean);
  const matchesSearch = (item: CatalogItem) => {
    if (!terms.length) return true;
    const hay = normalize(`${item.name} ${item.description} ${item.category} ${item.keywords || ""}`);
    return terms.every((t) => hay.includes(t));
  };
  const matchesFilters = (item: CatalogItem) =>
    activeFilters.every((id) => filters.find((f) => f.id === id)?.test(item) ?? true) &&
    (!onlyFavorites || favorites.includes(item.id));

  // Contagens de área/categoria respeitam busca e filtros, para o número sempre bater com o que aparece.
  const base = items.filter((i) => matchesSearch(i) && matchesFilters(i));
  const area = areaId ? effectiveAreas.find((a) => a.id === areaId) : null;
  const visible = base.filter((i) => (!area || area.categories.includes(i.category)) && (!category || i.category === category));

  const grouped = (() => {
    const order = effectiveAreas.flatMap((a) => a.categories);
    const map = new Map<string, CatalogItem[]>();
    for (const item of visible) {
      if (!map.has(item.category)) map.set(item.category, []);
      map.get(item.category)!.push(item);
    }
    return [...map.entries()]
      .sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
      .map(([cat, list]) => [cat, list.sort((x, y) => x.name.localeCompare(y.name))] as const);
  })();

  const favoriteItems = !onlyFavorites && !search && !areaId && !category
    ? items.filter((i) => favorites.includes(i.id))
    : [];

  const areaCategories = area
    ? area.categories
        .map((c) => ({ name: c, count: base.filter((i) => i.category === c).length }))
        .filter((c) => c.count > 0)
    : [];

  const clearAll = () => {
    setSearch("");
    setAreaId(null);
    setCategory(null);
    setActiveFilters([]);
    setOnlyFavorites(false);
  };
  const anyFilter = !!(search || areaId || category || activeFilters.length || onlyFavorites);

  const renderCard = (item: CatalogItem, extra?: ReactNode) => {
    const tone = hasAreaLevel ? areaOf(item.category).tone : "primary";
    const color = TONE_COLOR[tone];
    const fav = favorites.includes(item.id);
    const handleClick = (e: React.MouseEvent) => {
      if (item.locked) {
        e.preventDefault();
        onLockedClick?.(item);
        return;
      }
      if (onOpen && onOpen(item, e) === false) e.preventDefault();
    };

    const favButton = (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleFavorite(item.id);
        }}
        aria-pressed={fav}
        aria-label={fav ? `Tirar ${item.name} dos favoritos` : `Favoritar ${item.name}`}
        className={cn(
          "grid h-7 w-7 shrink-0 place-items-center rounded-md transition-colors",
          fav ? "text-status-warn" : "text-muted-foreground/50 opacity-0 hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100",
        )}
      >
        <Star className={cn("h-3.5 w-3.5", fav && "fill-current")} />
      </button>
    );

    if (view === "list") {
      return (
        <Link
          key={item.id}
          to={item.to}
          onClick={handleClick}
          className={cn(
            "group flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 transition-colors hover:border-primary/40",
            item.locked && "opacity-60",
          )}
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)` }}>
            <item.icon className="h-4 w-4" style={{ color }} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium group-hover:text-primary">{item.name}</span>
            <span className="block truncate text-xs text-muted-foreground">{item.description}</span>
          </span>
          {item.tags?.map((t) => (
            <span key={t} className="hidden shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">{t}</span>
          ))}
          {item.locked && <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label="Premium" />}
          {extra}
          {favButton}
        </Link>
      );
    }

    return (
      <Link
        key={item.id}
        to={item.to}
        onClick={handleClick}
        className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-black/30"
      >
        <div className="relative h-[76px] border-b border-border bg-background/60 bg-grid px-3 pb-1.5 pt-3">
          <div className={cn("h-full transition-opacity", item.locked ? "opacity-30" : "opacity-80 group-hover:opacity-100")}>
            <CatalogPreview id={item.id} kind={item.previewKind} tone={tone} />
          </div>
          <span className="absolute left-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-md border border-border bg-card/90 backdrop-blur">
            <item.icon className="h-3.5 w-3.5" style={{ color }} />
          </span>
          <span className="absolute right-1.5 top-1.5 flex items-center gap-1">
            {extra}
            {favButton}
          </span>
          {item.locked && (
            <span className="absolute bottom-2 right-2.5 inline-flex items-center gap-1 rounded-md bg-card/90 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
              <Lock className="h-3 w-3" /> Premium
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1.5 p-3.5">
          <h3 className="text-sm font-semibold leading-snug group-hover:text-primary">{item.name}</h3>
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{item.description}</p>
          {!!item.tags?.length && (
            <div className="mt-auto flex flex-wrap gap-1.5 pt-1.5">
              {item.tags.map((t) => (
                <span key={t} className="rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{t}</span>
              ))}
            </div>
          )}
        </div>
      </Link>
    );
  };

  const gridClass = view === "grid" ? "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" : "grid gap-2";
  const chip = (active: boolean) =>
    cn(
      "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors",
      active ? "border-primary/50 bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground",
    );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Cabeçalho */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
          <h1 className="text-3xl font-semibold md:text-4xl">
            {title}
            {titleAccent && <> <span className="text-gradient">{titleAccent}</span></>}
          </h1>
          <p className="text-sm text-muted-foreground md:text-[15px]">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">{headerActions}</div>
      </header>

      {/* Busca + visualização */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id={`${favoritesKey}-search`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Buscar ${itemNoun.singular} por nome, fármaco ou tema…`}
            className="h-10 bg-card pl-9"
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Limpar busca">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex items-center overflow-hidden rounded-lg border border-border">
          <button type="button" onClick={() => setView("grid")} aria-pressed={view === "grid"} aria-label="Ver em cartões" className={cn("p-2.5 transition-colors", view === "grid" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}>
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setView("list")} aria-pressed={view === "list"} aria-label="Ver em lista" className={cn("p-2.5 transition-colors", view === "list" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}>
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Áreas */}
      <div className="space-y-3">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
          <button type="button" onClick={() => { setAreaId(null); setCategory(null); }} className={chip(!areaId)}>
            Todas <span className="tabular-nums text-muted-foreground">{base.length}</span>
          </button>
          {effectiveAreas.map((a) => {
            const count = base.filter((i) => a.categories.includes(i.category)).length;
            if (!count && areaId !== a.id) return null;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => { setAreaId(areaId === a.id ? null : a.id); setCategory(null); }}
                className={chip(areaId === a.id)}
              >
                {hasAreaLevel && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: TONE_COLOR[a.tone] }} />}
                {a.label} <span className="tabular-nums text-muted-foreground">{count}</span>
              </button>
            );
          })}
        </div>

        {hasAreaLevel && area && areaCategories.length > 1 && (
          <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
            {areaCategories.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => setCategory(category === c.name ? null : c.name)}
                className={cn(
                  "shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  category === c.name ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                )}
              >
                {c.name} <span className="tabular-nums opacity-70">{c.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {filters.map((f) => {
            const on = activeFilters.includes(f.id);
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={on}
                onClick={() => setActiveFilters(on ? activeFilters.filter((x) => x !== f.id) : [...activeFilters, f.id])}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-medium transition-colors",
                  on ? "border-highlight/50 bg-highlight/10 text-foreground" : "border-dashed border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {f.icon && <f.icon className="h-3.5 w-3.5" />}
                {f.label}
              </button>
            );
          })}
          <button
            type="button"
            aria-pressed={onlyFavorites}
            onClick={() => setOnlyFavorites(!onlyFavorites)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-medium transition-colors",
              onlyFavorites ? "border-status-warn/50 bg-status-warn/10 text-foreground" : "border-dashed border-border text-muted-foreground hover:text-foreground",
            )}
          >
            <Star className={cn("h-3.5 w-3.5", onlyFavorites && "fill-current text-status-warn")} />
            Favoritos {favorites.length > 0 && <span className="tabular-nums opacity-70">{favorites.length}</span>}
          </button>
          {anyFilter && (
            <button type="button" onClick={clearAll} className="ml-1 text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
              Limpar filtros
            </button>
          )}
          <span className="ml-auto text-muted-foreground tabular-nums">
            {visible.length} {visible.length === 1 ? itemNoun.singular : itemNoun.plural}
          </span>
        </div>
      </div>

      {area?.description && hasAreaLevel && (
        <p className="border-l-2 pl-3 text-sm text-muted-foreground" style={{ borderColor: TONE_COLOR[area.tone] }}>{area.description}</p>
      )}

      {beforeCatalog}

      {/* Meus itens (criados com IA) */}
      {mine.length > 0 && !areaId && !onlyFavorites && (
        <section className="space-y-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{mineTitle}</h2>
          <div className={gridClass}>
            {mine.filter((m) => matchesSearch(m.item)).map((m) =>
              renderCard(
                m.item,
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    m.onToggleMarketplace();
                  }}
                  title={m.isMarketplace ? "Remover do Marketplace" : "Publicar no Marketplace"}
                  aria-label={m.isMarketplace ? "Remover do Marketplace" : "Publicar no Marketplace"}
                  className={cn(
                    "grid h-7 w-7 place-items-center rounded-md transition-colors",
                    m.isMarketplace ? "bg-primary/15 text-primary" : "bg-card/80 text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Share2 className="h-3.5 w-3.5" />
                </button>,
              ),
            )}
          </div>
        </section>
      )}

      {/* Favoritos no topo */}
      {favoriteItems.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <Star className="h-3.5 w-3.5 fill-current text-status-warn" /> Seus favoritos
          </h2>
          <div className={gridClass}>{favoriteItems.map((i) => renderCard(i))}</div>
        </section>
      )}

      {/* Catálogo agrupado */}
      {isLoading && items.length === 0 ? (
        <div className={gridClass}>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : grouped.length > 0 ? (
        grouped.map(([cat, list]) => {
          const a = areaOf(cat);
          return (
            <section key={cat} className="space-y-3">
              <div className="flex items-baseline gap-2">
                {hasAreaLevel && <span className="h-2 w-2 translate-y-[-1px] rounded-full" style={{ backgroundColor: TONE_COLOR[a.tone] }} />}
                <h2 className="text-base font-semibold">{cat}</h2>
                <span className="text-xs tabular-nums text-muted-foreground">{list.length}</span>
                {hasAreaLevel && !areaId && <span className="text-xs text-muted-foreground">· {a.label}</span>}
              </div>
              <div className={gridClass}>{list.map((i) => renderCard(i))}</div>
            </section>
          );
        })
      ) : (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">
            {onlyFavorites && favorites.length === 0
              ? "Você ainda não favoritou nada. Passe o mouse num cartão e toque na estrela."
              : `Nenhum ${itemNoun.singular} encontrado com esses filtros.`}
          </p>
          {anyFilter && (
            <button type="button" onClick={clearAll} className="mt-3 text-sm font-medium text-primary hover:underline">
              Limpar filtros
            </button>
          )}
        </div>
      )}
      {afterCatalog}
    </div>
  );
}
