import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ReferenceArea } from "recharts";
import { Snowflake, Thermometer, PackageCheck } from "lucide-react";
import { CONDUTAS, avaliarConduta, exposicao, serieLogger, type Conduta } from "@/lib/cadeiaSuprimentos/armazenamento";
import { Kpi, SimBadge, TOOLTIP_STYLE, brl, dec, int, type BancadaProps } from "./ui";

const hora = (h: number) => `${String(Math.floor(h) % 24).padStart(2, "0")}h${h >= 24 ? " (+1 dia)" : ""}`;

const CONSEQUENCIA: Record<Conduta, (valor: number) => string> = {
  liberar: (v) => `${brl(v)} disponíveis para uso, com a excursão registrada.`,
  quarentena: (v) => `${brl(v)} retidos a 2–8 °C, sem uso, até o parecer.`,
  descartar: (v) => `Perda imediata de ${brl(v)} e desabastecimento do item.`,
};

export default function BancadaArmazenamento({ caso, onState }: BancadaProps) {
  const c = caso.armazenamento!;
  const [transferenciaH, setTransferenciaH] = useState(c.chegadaEquipeH);
  const [condutas, setCondutas] = useState<Record<string, Conduta | undefined>>({});

  const exp = useMemo(() => exposicao(c, transferenciaH), [c, transferenciaH]);
  const serie = useMemo(() => serieLogger(c).map((p) => ({ ...p, produto: p.h <= transferenciaH ? p.camara : null })), [c, transferenciaH]);
  const avaliacoes = useMemo(() => Object.fromEntries(c.itens.map((i) => [i.id, avaliarConduta(i, exp, c, condutas[i.id])])), [c, exp, condutas]);

  useEffect(() => {
    onState({ etapa: "armazenamento", transferenciaH, exposicao: exp, condutas, avaliacoes });
  }, [transferenciaH, exp, condutas, avaliacoes, onState]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Thermometer className="h-4 w-4 text-primary" /> Registro do data logger da câmara fria</CardTitle>
          <p className="text-xs text-muted-foreground">Hora 0 = meia-noite, momento da falha de energia. Temperatura inicial {c.tempInicialC} °C, subindo {dec(c.taxaSubidaCporH)} °C por hora até o retorno da energia (hora {c.retornoEnergiaH}). A faixa verde é o intervalo de armazenamento (2 a 8 °C). Simplificação: o produto acompanha a temperatura do ar da câmara.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={serie} margin={{ right: 8, bottom: 26 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="h" type="number" domain={[0, 48]} ticks={[0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48]} label={{ value: "Horas desde a falha", position: "insideBottom", offset: -18 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis domain={[0, 32]} unit=" °C" stroke="hsl(var(--muted-foreground))" />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => `${v} °C`} labelFormatter={(h) => `Hora ${h} (${hora(Number(h))})`} />
              <Legend verticalAlign="top" wrapperStyle={{ fontSize: 12 }} />
              <ReferenceArea y1={c.limiteInferiorC} y2={c.limiteSuperiorC} fill="hsl(142 71% 45%)" fillOpacity={0.15} />
              <ReferenceLine y={25} stroke="hsl(var(--chart-4))" strokeDasharray="4 4" label={{ value: "25 °C", position: "insideTopRight", fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <ReferenceLine x={+exp.h8.toFixed(1)} stroke="hsl(var(--chart-5))" strokeDasharray="3 3" label={{ value: "Alarme 8 °C", position: "insideBottomLeft", fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <ReferenceLine x={transferenciaH} stroke="hsl(var(--primary))" strokeWidth={2} label={{ value: "Transferência", position: "insideTopRight", fontSize: 10, fill: "hsl(var(--primary))" }} />
              <Line type="monotone" dataKey="camara" name="Ar da câmara (logger)" stroke="hsl(var(--chart-5))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="produto" name="Produto até a transferência" stroke="hsl(var(--chart-1))" strokeWidth={3} dot={false} connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
          <div className="space-y-1.5">
            <div className="flex justify-between"><label className="text-xs font-medium">Hora da transferência para o refrigerador reserva</label><span className="text-xs font-bold">hora {transferenciaH} ({hora(transferenciaH)})</span></div>
            <Slider value={[transferenciaH]} onValueChange={([v]) => setTransferenciaH(v)} min={c.chegadaEquipeH} max={c.retornoEnergiaH} step={1} />
            <p className="text-[11px] text-muted-foreground">A equipe chega na hora {c.chegadaEquipeH}. Depois da transferência, os produtos ficam a 2–8 °C no refrigerador reserva.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi label="Temperatura máxima do produto" value={`${dec(exp.picoC)} °C`} tom={exp.picoC > 25 ? "ruim" : exp.picoC > c.limiteSuperiorC ? "alerta" : "ok"} />
            <Kpi label="Tempo acima de 8 °C" value={`${dec(exp.horasAcima8)} h`} sub={`alarme na hora ${dec(exp.h8)}`} tom={exp.horasAcima8 > 0 ? "alerta" : "ok"} />
            <Kpi label="Tempo acima de 25 °C" value={`${dec(exp.horasAcima25)} h`} sub={`cruza 25 °C na hora ${dec(exp.h25)}`} tom={exp.horasAcima25 > 0 ? "ruim" : "ok"} />
            <Kpi label="Refrigerador reserva" value={hora(transferenciaH)} sub="a partir daqui, 2–8 °C" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><PackageCheck className="h-4 w-4 text-primary" /> Conduta por lote</CardTitle>
          <p className="text-xs text-muted-foreground">Leia o dado de estabilidade disponível de cada lote, compare com a exposição acima e escolha a conduta.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {c.itens.map((i) => {
            const valor = i.quantidade * i.valorUnit;
            const escolha = condutas[i.id];
            const pico = i.dado.tipo === "limite" ? i.dado.tempMaxC : null;
            return (
              <div key={i.id} className="rounded-lg border p-3 space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold flex items-center gap-2"><Snowflake className="h-4 w-4 text-primary" /> {i.nome}</p>
                    <p className="text-xs text-muted-foreground">{int(i.quantidade)} {i.unidade} · valor do lote {brl(valor)}</p>
                  </div>
                  {pico !== null && (
                    <SimBadge tom={exp.picoC > pico ? "ruim" : "ok"}>Pico {dec(exp.picoC)} °C × limite do fabricante {pico} °C</SimBadge>
                  )}
                </div>
                <p className="text-xs"><strong>Dado de estabilidade:</strong> {i.dado.descricao}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
                  <Select value={escolha ?? ""} onValueChange={(v) => setCondutas((cur) => ({ ...cur, [i.id]: v as Conduta }))}>
                    <SelectTrigger><SelectValue placeholder="Escolha a conduta" /></SelectTrigger>
                    <SelectContent>{CONDUTAS.map((o) => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground min-h-[1.5rem]">{escolha ? CONSEQUENCIA[escolha](valor) : "Sem conduta escolhida."}</p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
