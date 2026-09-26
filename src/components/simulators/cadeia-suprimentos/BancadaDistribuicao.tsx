import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts";
import { Route, Warehouse, Lock, Unlock } from "lucide-react";
import { CRITERIOS, computeDistribuicao, deficit, sugerirRateio, type CriterioRateio } from "@/lib/cadeiaSuprimentos/distribuicao";
import { Kpi, SimBadge, TOOLTIP_STYLE, dec, int, type BancadaProps } from "./ui";

export default function BancadaDistribuicao({ caso, onState }: BancadaProps) {
  const d = caso.distribuicao!;
  const [criterio, setCriterio] = useState<CriterioRateio | "">("");
  const [reserva, setReserva] = useState(0);
  const [aloc, setAloc] = useState<Record<string, number>>(() => Object.fromEntries(d.ubs.map((u) => [u.id, 0])));
  const [fixos, setFixos] = useState<string[]>([]);

  const r = useMemo(() => computeDistribuicao(d, aloc), [d, aloc]);

  useEffect(() => {
    onState({ etapa: "distribuicao", criterio, reserva, aloc, fixos, resultado: r });
  }, [criterio, reserva, aloc, fixos, r, onState]);

  const fixosComoMapa = (ids: string[], base: Record<string, number>) => Object.fromEntries(ids.map((id) => [id, base[id] ?? 0]));
  const aplicar = (c: CriterioRateio | "" = criterio, res = reserva, ids = fixos) => {
    if (!c) return;
    setAloc(sugerirRateio(d, c, { reserva: res, fixos: fixosComoMapa(ids, aloc) }));
  };
  // Editar uma unidade à mão fixa a quantidade dela; se há critério escolhido, o restante é repartido de novo.
  const editar = (id: string, v: number) => {
    const ids = fixos.includes(id) ? fixos : [...fixos, id];
    setFixos(ids);
    if (criterio) setAloc(sugerirRateio(d, criterio, { reserva, fixos: fixosComoMapa(ids, { ...aloc, [id]: v }) }));
    else setAloc((cur) => ({ ...cur, [id]: v }));
  };
  const soltar = (id: string) => {
    const ids = fixos.filter((x) => x !== id);
    setFixos(ids);
    if (criterio) setAloc(sugerirRateio(d, criterio, { reserva, fixos: fixosComoMapa(ids, aloc) }));
  };
  const soltarTodas = () => {
    setFixos([]);
    if (criterio) setAloc(sugerirRateio(d, criterio, { reserva }));
  };

  const teto = Math.max(...d.ubs.map((u) => u.capacidade));
  const dados = r.linhas.map((l) => ({ nome: l.nome.replace("UBS ", ""), dias: +l.coberturaDias.toFixed(1), risco: l.emRisco, cap: l.excedeCapacidade }));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Warehouse className="h-4 w-4 text-primary" /> Rateio de {d.itemNome}</CardTitle>
          <p className="text-xs text-muted-foreground">
            A CAF tem {int(d.disponivelCAF)} {d.unidade}. Cobertura (dias) = (saldo + quantidade recebida) ÷ CMM × 30. O limite de risco é {d.limiteRiscoDias} dias (ressuprimento mensal) e a meta é {dec(d.coberturaAlvoMeses * 30, 0)} dias. Escolher um critério preenche as quantidades. Ao editar uma unidade à mão ela fica fixada (cadeado) e o critério reparte de novo só o que sobrar entre as demais; o cadeado solta a unidade.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium">Critério de rateio</label>
              <Select value={criterio} onValueChange={(v) => { setCriterio(v as CriterioRateio); aplicar(v as CriterioRateio); }}>
                <SelectTrigger className="w-80"><SelectValue placeholder="Escolha um critério" /></SelectTrigger>
                <SelectContent>{CRITERIOS.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1 w-64">
              <div className="flex justify-between"><label className="text-xs font-medium">Reserva técnica na CAF</label><span className="text-xs font-bold">{int(reserva)}</span></div>
              <Slider value={[reserva]} onValueChange={([v]) => { setReserva(v); aplicar(criterio, v); }} min={0} max={10000} step={1000} />
            </div>
            <Button size="sm" variant="outline" onClick={soltarTodas} disabled={fixos.length === 0}>Soltar todas as unidades e reaplicar o critério</Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-1.5 pr-2 font-medium">Unidade</th>
                  <th className="py-1.5 pr-2 font-medium text-right">CMM</th>
                  <th className="py-1.5 pr-2 font-medium text-right">Saldo</th>
                  <th className="py-1.5 pr-2 font-medium text-right">Déficit até a meta</th>
                  <th className="py-1.5 pr-2 font-medium text-right">Capacidade</th>
                  <th className="py-1.5 pr-2 font-medium min-w-[200px]">Quantidade recebida</th>
                  <th className="py-1.5 pr-2 font-medium text-right">Saldo final</th>
                  <th className="py-1.5 font-medium text-right">Cobertura</th>
                </tr>
              </thead>
              <tbody>
                {d.ubs.map((u, i) => {
                  const l = r.linhas[i];
                  const fixo = fixos.includes(u.id);
                  return (
                    <tr key={u.id} className="border-b border-border/50 align-top">
                      <td className="py-2 pr-2 font-medium">{u.nome}{u.nota && <span className="block text-[10px] font-normal text-muted-foreground">{u.nota}</span>}</td>
                      <td className="py-2 pr-2 text-right font-mono">{int(u.cmm)}</td>
                      <td className="py-2 pr-2 text-right font-mono">{int(u.saldo)}</td>
                      <td className="py-2 pr-2 text-right font-mono">{int(deficit(d, u))}</td>
                      <td className="py-2 pr-2 text-right font-mono">{int(u.capacidade)}</td>
                      <td className="py-2 pr-2">
                        <div className="flex items-center gap-2">
                          <Slider value={[aloc[u.id] ?? 0]} onValueChange={([v]) => editar(u.id, v)} min={0} max={Math.min(teto, d.disponivelCAF)} step={d.passo} className="flex-1" />
                          <span className="font-mono font-bold w-14 text-right">{int(aloc[u.id] ?? 0)}</span>
                          <button type="button" onClick={() => soltar(u.id)} disabled={!fixo} title={fixo ? "Fixada à mão (clique para soltar)" : "Segue o critério"} aria-label={fixo ? `Soltar ${u.nome}` : `${u.nome} segue o critério`}>
                            {fixo ? <Lock className="h-3.5 w-3.5 text-primary" /> : <Unlock className="h-3.5 w-3.5 text-muted-foreground" />}
                          </button>
                        </div>
                      </td>
                      <td className={`py-2 pr-2 text-right font-mono ${l.excedeCapacidade ? "text-destructive font-bold" : ""}`}>{int(l.saldoFinal)}</td>
                      <td className="py-2 text-right">
                        <span className={`font-mono font-bold ${l.emRisco ? "text-destructive" : "text-green-600 dark:text-green-400"}`}>{dec(l.coberturaDias)} d</span>
                        {l.excedeCapacidade && <span className="block"><SimBadge tom="ruim">acima da capacidade</SimBadge></span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Route className="h-4 w-4 text-primary" /> Cobertura resultante</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Kpi label="Distribuído" value={int(r.totalAlocado)} sub={`de ${int(d.disponivelCAF)}`} tom={r.excedeDisponivel ? "ruim" : "neutro"} />
            <Kpi label="Sobra na CAF" value={int(r.sobraCAF)} sub={reserva ? `reserva planejada ${int(reserva)}` : undefined} tom={r.excedeDisponivel ? "ruim" : "neutro"} />
            <Kpi label={`UBS abaixo de ${d.limiteRiscoDias} dias`} value={r.ubsEmRisco.length} sub={r.ubsEmRisco.join(", ") || "nenhuma"} tom={r.ubsEmRisco.length ? "ruim" : "ok"} />
            <Kpi label="UBS acima da capacidade" value={r.ubsAcimaCapacidade.length} sub={r.ubsAcimaCapacidade.join(", ") || "nenhuma"} tom={r.ubsAcimaCapacidade.length ? "ruim" : "ok"} />
            <Kpi label="Menor e maior cobertura" value={`${dec(r.minDias)} – ${dec(r.maxDias)} d`} />
            <Kpi label="Maior ÷ menor cobertura" value={Number.isFinite(r.razaoMaxMin) ? dec(r.razaoMaxMin, 2) : "—"} sub="quanto mais perto de 1, mais equitativo" />
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dados}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="nome" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
              <YAxis stroke="hsl(var(--muted-foreground))" unit=" d" />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => `${v} dias`} cursor={{ fill: "hsl(var(--muted) / 0.4)" }} />
              <ReferenceLine y={d.limiteRiscoDias} stroke="hsl(var(--destructive))" strokeDasharray="5 4" label={{ value: `${d.limiteRiscoDias} d`, position: "insideTopRight", fontSize: 10, fill: "hsl(var(--destructive))" }} />
              <ReferenceLine y={d.coberturaAlvoMeses * 30} stroke="hsl(var(--chart-2))" strokeDasharray="5 4" label={{ value: `meta ${dec(d.coberturaAlvoMeses * 30, 0)} d`, position: "insideTopRight", fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <Bar dataKey="dias" name="Cobertura (dias)">
                {dados.map((x, i) => <Cell key={i} fill={x.risco || x.cap ? "hsl(var(--destructive))" : "hsl(var(--chart-1))"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
