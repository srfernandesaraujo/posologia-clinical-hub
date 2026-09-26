import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";
import { Calculator, Gavel, Truck } from "lucide-react";
import { OPCOES_ENTREGAS, custoParcelamento, precoReferencia, vencedor, type Estatistica } from "@/lib/cadeiaSuprimentos/aquisicao";
import { Kpi, SimBadge, TOOLTIP_STYLE, brl, dec, int, type BancadaProps } from "./ui";

const ESTATISTICAS: { id: Estatistica; label: string }[] = [
  { id: "media", label: "Média" },
  { id: "mediana", label: "Mediana" },
  { id: "menor", label: "Menor valor" },
];

export default function BancadaAquisicao({ caso, onState }: BancadaProps) {
  const aq = caso.aquisicao!;
  const [incluidas, setIncluidas] = useState<string[]>(() => aq.cotacoes.map((c) => c.id));
  const [estatistica, setEstatistica] = useState<Estatistica>("media");
  const [classificadas, setClassificadas] = useState<string[]>(() => aq.propostas.map((p) => p.id));
  const [entregas, setEntregas] = useState<number>(1);

  const ref = useMemo(() => precoReferencia(aq.cotacoes, incluidas, estatistica), [aq.cotacoes, incluidas, estatistica]);
  const venc = useMemo(() => vencedor(aq.propostas, classificadas), [aq.propostas, classificadas]);
  const opcoes = useMemo(() => OPCOES_ENTREGAS.map((n) => custoParcelamento(aq.parcelamento, n)), [aq.parcelamento]);
  const parc = opcoes.find((o) => o.n === entregas)!;
  const economia = venc && ref.valor > 0 ? (ref.valor - venc.precoUnit) * aq.parcelamento.quantidadeAnual : 0;

  useEffect(() => {
    onState({
      etapa: "aquisicao",
      cotacoesIncluidas: incluidas,
      estatistica,
      precoRef: +ref.valor.toFixed(2),
      classificadas,
      vencedorId: venc?.id ?? null,
      entregas,
      parcelamento: parc,
    });
  }, [incluidas, estatistica, ref.valor, classificadas, venc, entregas, parc, onState]);

  const toggle = (lista: string[], set: (v: string[]) => void, id: string) => set(lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Calculator className="h-4 w-4 text-primary" /> 1. Pesquisa de preços: {aq.itemNome}</CardTitle>
          <p className="text-xs text-muted-foreground">Marque as cotações que entram no preço de referência e escolha a estatística. Valores por frasco.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-1.5 pr-2 w-8" />
                  <th className="py-1.5 pr-2 font-medium">Fonte</th>
                  <th className="py-1.5 pr-2 font-medium text-right">Valor</th>
                  <th className="py-1.5 font-medium">Situação</th>
                </tr>
              </thead>
              <tbody>
                {aq.cotacoes.map((c) => (
                  <tr key={c.id} className={`border-b border-border/50 ${incluidas.includes(c.id) ? "" : "opacity-50"}`}>
                    <td className="py-1.5 pr-2"><Checkbox checked={incluidas.includes(c.id)} onCheckedChange={() => toggle(incluidas, setIncluidas, c.id)} aria-label={`Usar a cotação: ${c.fonte}`} /></td>
                    <td className="py-1.5 pr-2">{c.fonte}</td>
                    <td className="py-1.5 pr-2 text-right font-mono">{brl(c.valor, 2)}</td>
                    <td className="py-1.5 text-muted-foreground">{c.detalhe}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium">Estatística</label>
              <Select value={estatistica} onValueChange={(v) => setEstatistica(v as Estatistica)}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>{ESTATISTICAS.map((e) => <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Kpi label="Preço de referência" value={brl(ref.valor, 2)} sub={`${ref.n} cotação(ões) usada(s)`} />
            <Kpi label="Valor estimado da compra" value={brl(ref.valor * aq.parcelamento.quantidadeAnual)} sub={`${int(aq.parcelamento.quantidadeAnual)} frascos/ano`} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Gavel className="h-4 w-4 text-primary" /> 2. Julgamento das propostas</CardTitle>
          <p className="text-xs text-muted-foreground">Exigências do edital: validade mínima de {aq.edital.validadeMinimaMeses} meses na entrega e prazo máximo de {aq.edital.prazoMaximoEntregaDias} dias. Deixe classificadas só as propostas que você manteria no julgamento.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-1.5 pr-2 w-8" />
                  <th className="py-1.5 pr-2 font-medium">Fornecedor</th>
                  <th className="py-1.5 pr-2 font-medium text-right">Preço unitário</th>
                  <th className="py-1.5 pr-2 font-medium text-right">Validade na entrega</th>
                  <th className="py-1.5 pr-2 font-medium text-right">Prazo de entrega</th>
                  <th className="py-1.5 font-medium">Documentação sanitária</th>
                </tr>
              </thead>
              <tbody>
                {aq.propostas.map((p) => {
                  const classificada = classificadas.includes(p.id);
                  return (
                    <tr key={p.id} className={`border-b border-border/50 align-top ${classificada ? "" : "opacity-50"}`}>
                      <td className="py-2 pr-2"><Checkbox checked={classificada} onCheckedChange={() => toggle(classificadas, setClassificadas, p.id)} aria-label={`Classificar a proposta de ${p.fornecedor}`} /></td>
                      <td className="py-2 pr-2 font-medium">{p.fornecedor}{venc?.id === p.id && <span className="ml-2"><SimBadge tom="ok">Vencedora</SimBadge></span>}</td>
                      <td className="py-2 pr-2 text-right font-mono">{brl(p.precoUnit, 2)}</td>
                      <td className="py-2 pr-2 text-right font-mono">{p.validadeMeses} meses</td>
                      <td className="py-2 pr-2 text-right font-mono">{p.prazoEntregaDias} dias</td>
                      <td className="py-2">{p.documentacaoOk ? <SimBadge tom="ok">Em dia</SimBadge> : <SimBadge tom="ruim">{p.pendencia ?? "Irregular"}</SimBadge>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <Kpi label="Vencedora (menor preço entre as classificadas)" value={venc ? venc.fornecedor : "—"} sub={venc ? brl(venc.precoUnit, 2) + " por frasco" : "nenhuma classificada"} />
            <Kpi label="Economia sobre o preço de referência" value={venc ? brl(economia) : "—"} sub="na quantidade anual" tom={economia > 0 ? "ok" : "neutro"} />
            <Kpi label="Propostas classificadas" value={`${classificadas.length} de ${aq.propostas.length}`} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Truck className="h-4 w-4 text-primary" /> 3. Parcelamento das entregas</CardTitle>
          <p className="text-xs text-muted-foreground">
            Quantidade anual: {int(aq.parcelamento.quantidadeAnual)} frascos a {brl(aq.parcelamento.precoUnit, 2)}. Cada entrega custa {brl(aq.parcelamento.freteEntrega)} de transporte refrigerado; manter estoque custa {dec(aq.parcelamento.taxaManutencaoMes * 100)}% do valor ao mês; segurança de {dec(aq.parcelamento.mesesSeguranca)} mês em cada entrega; capacidade da câmara fria: {int(aq.parcelamento.capacidade)} frascos. O custo adicional é o que se soma ao valor da compra.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium">Número de entregas no ano</label>
              <Select value={String(entregas)} onValueChange={(v) => setEntregas(Number(v))}>
                <SelectTrigger className="w-72"><SelectValue /></SelectTrigger>
                <SelectContent>{OPCOES_ENTREGAS.map((n) => <SelectItem key={n} value={String(n)}>{n === 1 ? "1 entrega" : `${n} entregas`} (a cada {dec(12 / n, n === 1 ? 0 : 1)} m)</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Kpi label="Transporte" value={brl(parc.frete)} />
            <Kpi label="Manutenção de estoque" value={brl(parc.manutencao)} />
            <Kpi label="Perdas por vencimento" value={brl(parc.vencimento)} tom={parc.vencimento ? "ruim" : "ok"} />
            <Kpi label="Custo adicional total" value={brl(parc.total - parc.compra)} />
            <Kpi label="Estoque médio" value={`${int(parc.estoqueMedioUnid)}`} sub="frascos" />
            <Kpi label="Pico na câmara" value={int(parc.picoUnid)} sub={`capacidade ${int(aq.parcelamento.capacidade)}`} tom={parc.excedeCapacidade ? "ruim" : "ok"} />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={opcoes.map((o) => ({ n: `${o.n} ${o.n === 1 ? "entrega" : "entregas"}`, extra: Math.round(o.total - o.compra), cap: o.excedeCapacidade, sel: o.n === entregas }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="n" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
              <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => int(v)} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => brl(v)} cursor={{ fill: "hsl(var(--muted) / 0.4)" }} />
              <Bar dataKey="extra" name="Custo adicional (R$)">
                {opcoes.map((o) => <Cell key={o.n} fill={o.excedeCapacidade ? "hsl(var(--destructive))" : "hsl(var(--chart-2))"} fillOpacity={o.n === entregas ? 1 : 0.45} />)}
                <LabelList dataKey="extra" position="top" fontSize={10} formatter={(v: number) => int(v)} fill="hsl(var(--muted-foreground))" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-[11px] text-muted-foreground">Barras vermelhas: o pico de estoque não cabe na câmara fria. A barra mais clara é uma opção que você não selecionou.</p>
        </CardContent>
      </Card>
    </div>
  );
}
