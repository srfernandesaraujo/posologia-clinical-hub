import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollText, Pill, BookOpen } from "lucide-react";
import { ACOES, addDias, avaliarItem, diasEntre, diasReceita, fmtData, estoqueTotal, type AcaoDispensacao, type DecisaoItem } from "@/lib/cadeiaSuprimentos/dispensacao";
import { Kpi, SimBadge, int, type BancadaProps } from "./ui";

export default function BancadaDispensacao({ caso, onState }: BancadaProps) {
  const c = caso.dispensacao!;
  const [decisoes, setDecisoes] = useState<Record<string, DecisaoItem>>({});
  const set = (id: string, patch: Partial<DecisaoItem>) => setDecisoes((cur) => ({ ...cur, [id]: { ...cur[id], ...patch } }));
  const avaliacoes = useMemo(() => Object.fromEntries(c.itens.map((i) => [i.id, avaliarItem(c, i, decisoes[i.id] ?? {})])), [c, decisoes]);

  useEffect(() => {
    onState({ etapa: "dispensacao", decisoes, avaliacoes, todosCorretos: c.itens.every((i) => avaliacoes[i.id].correto) });
  }, [decisoes, avaliacoes, c.itens, onState]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><ScrollText className="h-4 w-4 text-primary" /> Receita apresentada</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border-2 border-dashed p-4 space-y-2 bg-muted/20">
            <div className="flex flex-wrap justify-between gap-2 text-xs">
              <span><strong>Paciente:</strong> {c.paciente}</span>
              <span><strong>Prescritor:</strong> {c.prescritor}</span>
              <span><strong>Emitida em:</strong> {fmtData(c.receitaEmitidaEm)} (há {diasReceita(c)} dias)</span>
              <span><strong>Hoje:</strong> {fmtData(c.hoje)}</span>
            </div>
            <ol className="list-decimal pl-5 space-y-1 text-sm">
              {c.itens.map((i) => <li key={i.id}><strong>{i.nome}</strong>: {i.posologia}.</li>)}
            </ol>
          </div>
          <p className="text-xs text-muted-foreground">{c.regraLocal}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {c.itens.map((i) => {
          const d = decisoes[i.id] ?? {};
          const acao = d.acao;
          return (
            <Card key={i.id}>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2"><Pill className="h-4 w-4 text-primary" /> {i.nome}</CardTitle>
                <p className="text-xs text-muted-foreground">{i.posologia}. Período de tratamento a cobrir: {i.dias} dias (até {fmtData(addDias(c.hoje, i.dias))}).</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground mb-1">Estoque na farmácia</p>
                  {i.lotes.length === 0 ? (
                    <p className="text-xs text-destructive font-medium">{i.observacaoEstoque ?? "Sem estoque."}</p>
                  ) : (
                    <table className="w-full text-xs">
                      <thead><tr className="text-muted-foreground border-b text-left"><th className="py-1 font-medium">Lote</th><th className="py-1 font-medium">Validade</th><th className="py-1 font-medium text-right">Vence em</th><th className="py-1 font-medium text-right">Saldo</th></tr></thead>
                      <tbody>
                        {i.lotes.map((l) => (
                          <tr key={l.id} className="border-b border-border/50">
                            <td className="py-1 font-mono">{l.lote}</td>
                            <td className="py-1">{fmtData(l.validade)}</td>
                            <td className="py-1 text-right font-mono">{diasEntre(c.hoje, l.validade)} dias</td>
                            <td className="py-1 text-right font-mono">{int(l.saldo)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Ação</label>
                  <Select value={acao ?? ""} onValueChange={(v) => set(i.id, { acao: v as AcaoDispensacao })}>
                    <SelectTrigger><SelectValue placeholder="Escolha a ação" /></SelectTrigger>
                    <SelectContent>{ACOES.map((a) => <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                {acao === "dispensar" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">Lote a dispensar</label>
                      <Select value={d.loteId ?? ""} onValueChange={(v) => set(i.id, { loteId: v })} disabled={i.lotes.length === 0}>
                        <SelectTrigger><SelectValue placeholder="Lote" /></SelectTrigger>
                        <SelectContent>{i.lotes.map((l) => <SelectItem key={l.id} value={l.id}>{l.lote} (vence {fmtData(l.validade)})</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">Quantidade</label>
                      <Input type="number" min={0} value={d.quantidade ?? ""} onChange={(e) => set(i.id, { quantidade: e.target.value === "" ? undefined : Number(e.target.value) })} />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <Kpi label="Estoque total" value={int(estoqueTotal(i))} />
                  <Kpi label="Posologia × dias" value={`${i.dosePorTomada} × ${i.vezesDia} × ${i.dias}`} sub="comprimidos ou cápsulas por dia × dias" />
                </div>
                {acao === "dispensar" && d.quantidade !== undefined && d.loteId && (
                  <p className="text-xs text-muted-foreground">
                    Saldo do lote após a dispensação: <strong className="font-mono">{int((i.lotes.find((l) => l.id === d.loteId)?.saldo ?? 0) - d.quantidade)}</strong>
                    {(i.lotes.find((l) => l.id === d.loteId)?.saldo ?? 0) < d.quantidade && <span className="ml-2"><SimBadge tom="ruim">saldo insuficiente</SimBadge></span>}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /> Normas de consulta</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <p>RDC 471/2021 (Anvisa): regula a prescrição, a dispensação e o controle dos antimicrobianos de uso sob prescrição, incluindo a validade da receita.</p>
          <p>RDC 44/2009 (Anvisa): Boas Práticas Farmacêuticas: exige validar a prescrição antes de dispensar e orientar o paciente.</p>
          <p>Lei 9.787/1999: só autoriza trocar o medicamento pelo genérico ou intercambiável do mesmo princípio ativo; outra troca é decisão do prescritor.</p>
          <p>PVPS (FEFO): sai primeiro o lote que vence primeiro, desde que a validade cubra o período de uso do paciente.</p>
        </CardContent>
      </Card>
    </div>
  );
}
