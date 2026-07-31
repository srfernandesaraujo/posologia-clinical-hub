import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MarketplaceTool {
  id: string;
  name: string;
  description: string | null;
  short_description: string | null;
  fields: unknown;
  formula: unknown;
  created_by: string | null;
  is_marketplace: boolean;
  ai_audit_status: string;
  ai_audit_notes: string | null;
  ai_audited_at: string | null;
  clinically_validated: boolean;
  clinically_validated_at: string | null;
  updated_at: string;
}

const AUDIT_BADGE: Record<string, { label: string; className: string }> = {
  pending: { label: "Auditoria pendente", className: "bg-muted text-muted-foreground border-border" },
  clear: { label: "IA: sem ressalvas", className: "bg-blue-500 text-white border-blue-500" },
  flagged: { label: "IA: sinalizado", className: "bg-red-600 text-white border-red-600" },
};

function useMarketplaceReviewTools() {
  return useQuery({
    queryKey: ["marketplace-review-tools"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tools")
        .select("id, name, description, short_description, fields, formula, created_by, is_marketplace, ai_audit_status, ai_audit_notes, ai_audited_at, clinically_validated, clinically_validated_at, updated_at")
        .not("created_by", "is", null)
        .or("is_marketplace.eq.true,ai_audit_status.eq.flagged")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data || []) as MarketplaceTool[];
    },
  });
}

function useAuthorNames(tools: MarketplaceTool[]) {
  const ids = useMemo(() => Array.from(new Set(tools.map((t) => t.created_by).filter(Boolean))) as string[], [tools]);
  return useQuery({
    queryKey: ["marketplace-review-authors", ids],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, full_name").in("user_id", ids);
      const map: Record<string, string> = {};
      (data || []).forEach((p) => { map[p.user_id] = p.full_name || p.user_id.slice(0, 8); });
      return map;
    },
    enabled: ids.length > 0,
  });
}

function ReviewDetail({ tool }: { tool: MarketplaceTool }) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const approve = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tools").update({
        clinically_validated: true,
        clinically_validated_by: user!.id,
        clinically_validated_at: new Date().toISOString(),
      }).eq("id", tool.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ferramenta validada clinicamente");
      qc.invalidateQueries({ queryKey: ["marketplace-review-tools"] });
    },
    onError: () => toast.error("Erro ao validar"),
  });

  const revokeApproval = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tools").update({
        clinically_validated: false,
        clinically_validated_by: null,
        clinically_validated_at: null,
      }).eq("id", tool.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Selo removido");
      qc.invalidateQueries({ queryKey: ["marketplace-review-tools"] });
    },
    onError: () => toast.error("Erro ao remover selo"),
  });

  const togglePublish = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tools").update({ is_marketplace: !tool.is_marketplace }).eq("id", tool.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(tool.is_marketplace ? "Despublicada do Marketplace" : "Republicada no Marketplace");
      qc.invalidateQueries({ queryKey: ["marketplace-review-tools"] });
    },
    onError: () => toast.error("Erro ao atualizar publicação"),
  });

  const audit = AUDIT_BADGE[tool.ai_audit_status] || AUDIT_BADGE.pending;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={`text-[10px] ${audit.className}`}>{audit.label}</Badge>
        <Badge variant="outline" className="text-[10px]">{tool.is_marketplace ? "Publicada" : "Despublicada"}</Badge>
        {tool.clinically_validated && (
          <Badge className="text-[10px] bg-emerald-600 text-white border-emerald-600 gap-1">
            <ShieldCheck className="h-3 w-3" /> Validado clinicamente
          </Badge>
        )}
      </div>

      <p className="text-sm text-muted-foreground">{tool.short_description || tool.description || "Sem descrição"}</p>

      <div className="bg-card border border-border rounded-xl p-4 space-y-2">
        <h3 className="text-sm font-semibold">Notas da auditoria de IA</h3>
        {tool.ai_audit_notes ? (
          <p className="text-xs text-muted-foreground whitespace-pre-wrap">{tool.ai_audit_notes}</p>
        ) : (
          <p className="text-xs text-muted-foreground">Ainda sem resultado de auditoria.</p>
        )}
        {tool.ai_audited_at && (
          <p className="text-[10px] text-muted-foreground">
            Auditado em {format(new Date(tool.ai_audited_at), "dd MMM yyyy HH:mm", { locale: ptBR })}
          </p>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl p-4 space-y-2">
        <h3 className="text-sm font-semibold">Campos e fórmula</h3>
        <pre className="text-[10px] bg-muted/50 rounded-lg p-3 overflow-x-auto max-h-56">
          {JSON.stringify({ fields: tool.fields, formula: tool.formula }, null, 2)}
        </pre>
      </div>

      <div className="flex flex-wrap gap-2">
        {tool.clinically_validated ? (
          <Button size="sm" variant="outline" onClick={() => revokeApproval.mutate()} disabled={revokeApproval.isPending}>
            Remover selo
          </Button>
        ) : (
          <Button size="sm" onClick={() => approve.mutate()} disabled={approve.isPending}>
            <ShieldCheck className="h-4 w-4 mr-1.5" /> Aprovar e conceder selo
          </Button>
        )}
        <Button size="sm" variant="destructive" onClick={() => togglePublish.mutate()} disabled={togglePublish.isPending}>
          {tool.is_marketplace ? "Despublicar" : "Republicar"}
        </Button>
      </div>
    </div>
  );
}

export default function AdminMarketplaceReview() {
  const { data: tools = [], isLoading } = useMarketplaceReviewTools();
  const { data: authorNames = {} } = useAuthorNames(tools);
  const [auditFilter, setAuditFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = tools.find((t) => t.id === selectedId) || null;

  const filtered = tools.filter((t) => (
    (auditFilter === "all" || t.ai_audit_status === auditFilter)
    && (search.trim() === "" || t.name.toLowerCase().includes(search.toLowerCase()))
  ));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          Curadoria Clínica do Marketplace
        </h1>
        <p className="text-sm text-muted-foreground">
          Calculadoras publicadas por usuários passam por auditoria automática de IA; aprove aqui para conceder o selo "Validado clinicamente".
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input placeholder="Buscar por nome..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={auditFilter} onValueChange={setAuditFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status de IA</SelectItem>
            <SelectItem value="pending">Auditoria pendente</SelectItem>
            <SelectItem value="clear">Sem ressalvas</SelectItem>
            <SelectItem value="flagged">Sinalizado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Nenhuma ferramenta encontrada.</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Autor</TableHead>
              <TableHead>Status IA</TableHead>
              <TableHead>Selo</TableHead>
              <TableHead>Publicada</TableHead>
              <TableHead>Atualizado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((t) => {
              const audit = AUDIT_BADGE[t.ai_audit_status] || AUDIT_BADGE.pending;
              return (
                <TableRow key={t.id} className="cursor-pointer" onClick={() => setSelectedId(t.id)}>
                  <TableCell className="font-medium max-w-xs truncate">{t.name}</TableCell>
                  <TableCell>{t.created_by ? (authorNames[t.created_by] || "—") : "—"}</TableCell>
                  <TableCell><Badge className={`text-[10px] ${audit.className}`}>{audit.label}</Badge></TableCell>
                  <TableCell>{t.clinically_validated ? <ShieldCheck className="h-4 w-4 text-emerald-600" /> : "—"}</TableCell>
                  <TableCell className="text-xs">{t.is_marketplace ? "Sim" : "Não"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(t.updated_at), "dd MMM HH:mm", { locale: ptBR })}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <Sheet open={!!selected} onOpenChange={(o) => { if (!o) setSelectedId(null); }}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="truncate pr-6">{selected.name}</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <ReviewDetail tool={selected} />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
