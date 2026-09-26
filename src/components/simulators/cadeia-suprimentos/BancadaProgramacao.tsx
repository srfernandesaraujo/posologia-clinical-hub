import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ComposedChart, Area, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import { CalendarClock, LineChart as LineChartIcon, Package } from "lucide-react";
import { METODOS_CMM, MESES, calcCMM, simularProgramacao, type MetodoCMM, type ProgParams } from "@/lib/cadeiaSuprimentos/programacao";
import { MAX_PEDIDOS_ANO } from "@/lib/cadeiaSuprimentos/avaliacao";
import { Kpi, TOOLTIP_STYLE, brl, dec, int, type BancadaProps } from "./ui";

const INTERVALOS = [1, 2, 3, 4, 6, 12];
const PADRAO: ProgParams = { metodo: "media12", mesesSeguranca: 0, intervalo: 3 };

export default function BancadaProgramacao({ caso, onState }: BancadaProps) {
  const itens = caso.programacao!.itens;
  const [itemId, setItemId] = useState(itens[0].id);
  const [params, setParams] = useState<Record<string, ProgParams>>(() => Object.fromEntries(itens.map((i) => [i.id, { ...PADRAO }])));
  const item = itens.find((i) => i.id === itemId)!;
  const p = params[itemId];
  const setP = (patch: Partial<ProgParams>) => setParams((cur) => ({ ...cur, [itemId]: { ...cur[itemId], ...patch } }));

  const resultados = useMemo(() => Object.fromEntries(itens.map((i) => [i.id, simularProgramacao(i, params[i.id])])), [itens, params]);
  const r = resultados[itemId];

  useEffect(() => {
    onState({
      etapa: "programacao",
      itemId,
      itens: Object.fromEntries(itens.map((i) => [i.id, { ...params[i.id], resultado: resultados[i.id] }])),
    });
  }, [itemId, params, resultados, itens, onState]);

  const dados = r.meses.map((m) => ({ mes: m.mes, estoque: Math.round(m.estoqueFinal), demanda: m.demanda, recebido: m.recebido }));
  const pedidosOk = r.nPedidos <= MAX_PEDIDOS_ANO;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4 text-primary" /> Item e histórico de consumo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={itemId} onValueChange={setItemId}>
            <SelectTrigger className="max-w-sm"><SelectValue /></SelectTrigger>
            <SelectContent>{itens.map((i) => <SelectItem key={i.id} value={i.id}>{i.nome} ({i.apresentacao})</SelectItem>)}</SelectContent>
          </Select>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
            <Kpi label="Tempo de reposição" value={`${item.trMeses} ${item.trMeses === 1 ? "mês" : "meses"}`} />
            <Kpi label="Validade do lote na entrega" value={`${item.validadeMeses} meses`} />
            <Kpi label="Estoque atual" value={`${int(item.estoqueInicial)}`} sub={`vence em ${item.validadeEstoqueInicial} meses`} />
            <Kpi label="Capacidade da CAF" value={item.capacidade ? int(item.capacidade) : "—"} sub={item.unidade + "s"} />
            <Kpi label="Preço unitário" value={brl(item.precoUnit, 2)} />
          </div>
          {item.nota && <p className="text-xs text-muted-foreground">{item.nota}</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground border-b">
                  <th className="py-1 pr-2 text-left font-medium">Mês (ano anterior)</th>
                  {MESES.map((m) => <th key={m} className="py-1 px-1 text-right font-medium">{m}</th>)}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/50">
                  <td className="py-1 pr-2 font-medium">Consumo registrado</td>
                  {item.consumoHist.map((c, i) => <td key={i} className="py-1 px-1 text-right font-mono">{int(c)}</td>)}
                </tr>
                <tr>
                  <td className="py-1 pr-2 font-medium">Dias sem estoque</td>
                  {item.diasFalta.map((d, i) => <td key={i} className={`py-1 px-1 text-right font-mono ${d > 0 ? "font-bold text-destructive" : "text-muted-foreground"}`}>{d}</td>)}
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><CalendarClock className="h-4 w-4 text-primary" /> Parâmetros da programação</CardTitle>
          <p className="text-xs text-muted-foreground">Cada item guarda os próprios parâmetros. A cada intervalo de compra, o pedido leva a posição de estoque (estoque + saldo em trânsito) até o nível máximo S.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Cálculo do consumo médio mensal (CMM)</label>
              <Select value={p.metodo} onValueChange={(v) => setP({ metodo: v as MetodoCMM })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{METODOS_CMM.map((m) => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}</SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">{METODOS_CMM.find((m) => m.id === p.metodo)!.formula}</p>
              <p className="text-xs">CMM resultante: <strong className="font-mono">{int(r.cmm)}</strong> {item.unidade}s/mês</p>
              <p className="text-[10px] text-muted-foreground">Para comparar: {METODOS_CMM.map((m) => `${m.id === "media12" ? "média 12 m" : m.id === "media6" ? "média 6 m" : "corrigida"} = ${int(calcCMM(item, m.id))}`).join(" · ")}</p>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between"><label className="text-xs font-medium">Estoque de segurança</label><span className="text-xs font-bold">{dec(p.mesesSeguranca)} mês(es) de CMM</span></div>
              <Slider value={[p.mesesSeguranca]} onValueChange={([v]) => setP({ mesesSeguranca: v })} min={0} max={2} step={0.5} />
              <p className="text-[11px] text-muted-foreground">= {int(r.es)} {item.unidade}s (faixa usual na Assistência Farmacêutica: 0 a 2 meses)</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Intervalo entre pedidos</label>
              <Select value={String(p.intervalo)} onValueChange={(v) => setP({ intervalo: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{INTERVALOS.map((i) => <SelectItem key={i} value={String(i)}>{i === 1 ? "Todo mês" : `A cada ${i} meses`}</SelectItem>)}</SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">Nível máximo S = CMM × (intervalo + reposição) + segurança = <strong className="font-mono">{int(r.nivelMax)}</strong></p>
              <p className="text-[11px] text-muted-foreground">A CAF consegue fazer no máximo {MAX_PEDIDOS_ANO} pedidos por item ao ano (cada pedido é um processo de compra).</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><LineChartIcon className="h-4 w-4 text-primary" /> Os 12 meses seguintes</CardTitle>
          <p className="text-xs text-muted-foreground">Estoque no fim de cada mês contra a demanda real (que você não conhecia ao programar). As barras são os recebimentos; a linha tracejada vermelha é a capacidade de armazenamento.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Kpi label="Ruptura" value={`${r.rupturaDias} dias`} sub={r.rupturaDias ? `em ${r.mesesComRuptura} mês(es)` : "sem falta"} tom={r.rupturaDias ? "ruim" : "ok"} />
            <Kpi label="Perdas por vencimento" value={int(r.perdasUnid)} sub={brl(r.perdasValor)} tom={r.perdasUnid ? "ruim" : "ok"} />
            <Kpi label="Estoque médio" value={int(r.estoqueMedioUnid)} sub={`${dec(r.coberturaMeses, 2)} meses de cobertura · ${brl(r.estoqueMedioValor)}`} />
            <Kpi label="Pedidos no ano" value={r.nPedidos} sub={`máximo da CAF: ${MAX_PEDIDOS_ANO}`} tom={pedidosOk ? "ok" : "ruim"} />
            <Kpi label="Pico de estoque" value={int(r.picoEstoque)} sub={item.capacidade ? `capacidade ${int(item.capacidade)}` : undefined} tom={r.excedeCapacidade ? "ruim" : "ok"} />
            <Kpi label="Nível de serviço" value={`${dec(r.nivelServico * 100)}%`} sub="demanda atendida" tom={r.nivelServico < 1 ? "alerta" : "ok"} />
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={dados} margin={{ right: 8, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" />
              <YAxis width={72} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => int(v)} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => int(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="recebido" name="Recebido no mês" fill="hsl(var(--chart-3))" fillOpacity={0.5} />
              <Area type="monotone" dataKey="estoque" name="Estoque no fim do mês" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.2} strokeWidth={2} />
              <Line type="monotone" dataKey="demanda" name="Demanda real do mês" stroke="hsl(var(--chart-5))" strokeWidth={2} dot />
              {r.es > 0 && <ReferenceLine y={r.es} stroke="hsl(var(--chart-4))" strokeDasharray="4 4" label={{ value: "Estoque de segurança", position: "insideTopLeft", fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />}
              {item.capacidade && <ReferenceLine y={item.capacidade} stroke="hsl(var(--destructive))" strokeDasharray="6 4" label={{ value: "Capacidade", position: "insideTopRight", fontSize: 10, fill: "hsl(var(--destructive))" }} />}
            </ComposedChart>
          </ResponsiveContainer>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground border-b">
                  <th className="py-1 pr-2 text-left font-medium">Mês</th>
                  {r.meses.map((m) => <th key={m.mes} className="py-1 px-1 text-right font-medium">{m.mes}</th>)}
                </tr>
              </thead>
              <tbody>
                {([["Pedido feito", (m: typeof r.meses[number]) => (m.pedido ? int(m.pedido) : "—")], ["Recebido", (m: typeof r.meses[number]) => (m.recebido ? int(m.recebido) : "—")], ["Dias de ruptura", (m: typeof r.meses[number]) => String(m.diasRuptura)], ["Vencido", (m: typeof r.meses[number]) => (m.perdas ? int(m.perdas) : "—")]] as const).map(([rot, fn]) => (
                  <tr key={rot} className="border-b border-border/50">
                    <td className="py-1 pr-2 font-medium">{rot}</td>
                    {r.meses.map((m) => <td key={m.mes} className={`py-1 px-1 text-right font-mono ${rot === "Dias de ruptura" && m.diasRuptura > 0 ? "font-bold text-destructive" : rot === "Vencido" && m.perdas > 0 ? "font-bold text-destructive" : ""}`}>{fn(m)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
