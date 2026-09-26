import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ClipboardList, Gauge, CheckCircle2, XCircle } from "lucide-react";
import { computeSelecao, custoMensalPaciente } from "@/lib/cadeiaSuprimentos/selecao";
import { Kpi, SimBadge, brl, dec, int, type BancadaProps } from "./ui";

export default function BancadaSelecao({ caso, onState }: BancadaProps) {
  const sel = caso.selecao!;
  const [incluidos, setIncluidos] = useState<string[]>(() => sel.itens.filter((i) => i.emUso).map((i) => i.id));
  const r = useMemo(() => computeSelecao(sel, incluidos), [sel, incluidos]);
  const linha = (id: string) => r.linhas.find((l) => l.id === id)!;

  useEffect(() => { onState({ etapa: "selecao", incluidos, resultado: r }); }, [incluidos, r, onState]);

  const toggle = (id: string) => setIncluidos((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const grupos = [
    { titulo: "Elenco atual", itens: sel.itens.filter((i) => i.emUso) },
    { titulo: "Solicitações de inclusão", itens: sel.itens.filter((i) => !i.emUso) },
  ];
  const tomUso = r.usoOrcamentoPct > 100 ? "ruim" : r.usoOrcamentoPct > 95 ? "alerta" : "ok";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><ClipboardList className="h-4 w-4 text-primary" /> Elenco em revisão (REMUME)</CardTitle>
          <p className="text-xs text-muted-foreground">Marque os medicamentos que ficam no elenco. Os preços são ilustrativos (último pregão). Nas solicitações, o "impacto líquido" é o custo anual da troca: usuários × 12 × (custo mensal do novo − custo mensal do que ele substitui).</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {grupos.map((g) => (
            <div key={g.titulo}>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">{g.titulo}</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b">
                      <th className="py-1.5 pr-2 w-8" />
                      <th className="py-1.5 pr-2 font-medium">Medicamento</th>
                      <th className="py-1.5 pr-2 font-medium">Classe</th>
                      <th className="py-1.5 pr-2 font-medium">RENAME</th>
                      <th className="py-1.5 pr-2 font-medium text-right">Custo/paciente/mês</th>
                      <th className="py-1.5 pr-2 font-medium text-right">Usuários</th>
                      <th className="py-1.5 pr-2 font-medium text-right">{g.titulo === "Elenco atual" ? "Custo anual" : "Impacto líquido/ano"}</th>
                      <th className="py-1.5 font-medium">Evidência e observações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.itens.map((i) => {
                      const l = linha(i.id);
                      const marcado = incluidos.includes(i.id);
                      return (
                        <tr key={i.id} className={`border-b border-border/50 align-top ${marcado ? "" : "opacity-60"}`}>
                          <td className="py-2 pr-2"><Checkbox checked={marcado} onCheckedChange={() => toggle(i.id)} aria-label={`Incluir ${i.nome}`} /></td>
                          <td className="py-2 pr-2 font-medium">{i.nome}</td>
                          <td className="py-2 pr-2">{i.classe}</td>
                          <td className="py-2 pr-2">{i.rename ? <SimBadge tom="ok">Na RENAME</SimBadge> : <SimBadge tom="alerta">Fora da RENAME</SimBadge>}</td>
                          <td className="py-2 pr-2 text-right font-mono">{brl(custoMensalPaciente(i), 2)}</td>
                          <td className="py-2 pr-2 text-right font-mono">{int(i.usuarios)}{i.migraDe ? <span className="block text-[10px] text-muted-foreground">migram da {sel.itens.find((o) => o.id === i.migraDe)?.nome.split(" ")[0].toLowerCase()}</span> : null}</td>
                          <td className="py-2 pr-2 text-right font-mono">{g.titulo === "Elenco atual" ? brl(marcado ? l.custoAnual : 0) : brl(l.impactoLiquidoAnual ?? i.usuarios * 12 * custoMensalPaciente(i))}</td>
                          <td className="py-2 text-muted-foreground min-w-[220px]">{i.evidencia}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Gauge className="h-4 w-4 text-primary" /> Indicadores do elenco</CardTitle>
          <p className="text-xs text-muted-foreground">Recalculados a cada marcação. O orçamento anual do município para esta linha é {brl(sel.orcamentoAnual)}.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Kpi label="Custo anual do elenco" value={brl(r.custoAnualTotal)} tom={tomUso} />
            <Kpi label="Uso do orçamento" value={`${dec(r.usoOrcamentoPct)}%`} sub={`Saldo: ${brl(r.saldoOrcamento)}`} tom={tomUso} />
            <Kpi label="Itens fora da RENAME" value={r.itensForaRename.length} sub={r.itensForaRename.length ? "custo 100% municipal" : "todos na RENAME"} tom={r.itensForaRename.length ? "alerta" : "ok"} />
            <Kpi label="Duplicidade terapêutica" value={r.duplicidades.length} sub={r.duplicidades.length ? r.duplicidades.map((d) => d.classe).join(", ") : "nenhuma classe repetida"} tom={r.duplicidades.length ? "alerta" : "ok"} />
            <Kpi label="Necessidades sem item" value={r.cobertura.filter((c) => !c.coberta).length} sub={r.pacientesDescobertos ? `${int(r.pacientesDescobertos)} pacientes sem medicamento` : "todas cobertas"} tom={r.pacientesDescobertos ? "ruim" : "ok"} />
            <Kpi label="Itens no elenco" value={incluidos.length} />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5">Cobertura da linha de cuidado</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {r.cobertura.map((c) => (
                <div key={c.id} className="flex items-center gap-2 text-xs rounded-md border p-2">
                  {c.coberta ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> : <XCircle className="h-4 w-4 text-destructive shrink-0" />}
                  <span className="flex-1">{c.label}</span>
                  <span className="font-mono text-muted-foreground">{int(c.pacientes)} pac.</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
