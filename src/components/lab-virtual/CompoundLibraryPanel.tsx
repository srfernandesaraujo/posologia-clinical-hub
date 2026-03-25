import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer } from "recharts";
import { Library, Plus, Trash2, Download, BarChart3, ArrowUpDown } from "lucide-react";
import type { DrugProperties } from "./DrugDesignPanel";
import type { PubChemCompound } from "./PubChemSearchBar";

export interface CompoundEntry {
  id: string;
  name: string;
  smiles: string;
  properties: DrugProperties;
  tpsa?: number;
  rotatableBonds?: number;
  formula?: string;
  cid?: number;
  admetScore?: number;
  dG?: number;
}

interface CompoundLibraryPanelProps {
  compounds: CompoundEntry[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onSelect: (entry: CompoundEntry) => void;
  onExportCSV: () => void;
}

type SortKey = "name" | "mw" | "logP" | "hbd" | "hba" | "tpsa" | "admetScore" | "dG";

export function CompoundLibraryPanel({ compounds, onAdd, onRemove, onSelect, onExportCSV }: CompoundLibraryPanelProps) {
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [showSAR, setShowSAR] = useState(false);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const sorted = useMemo(() => {
    return [...compounds].sort((a, b) => {
      let va: number | string, vb: number | string;
      switch (sortKey) {
        case "name": va = a.name.toLowerCase(); vb = b.name.toLowerCase(); break;
        case "mw": va = a.properties.mw; vb = b.properties.mw; break;
        case "logP": va = a.properties.logP; vb = b.properties.logP; break;
        case "hbd": va = a.properties.hbd; vb = b.properties.hbd; break;
        case "hba": va = a.properties.hba; vb = b.properties.hba; break;
        case "tpsa": va = a.tpsa ?? 0; vb = b.tpsa ?? 0; break;
        case "admetScore": va = a.admetScore ?? 0; vb = b.admetScore ?? 0; break;
        case "dG": va = a.dG ?? 0; vb = b.dG ?? 0; break;
        default: va = 0; vb = 0;
      }
      if (va < vb) return sortAsc ? -1 : 1;
      if (va > vb) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [compounds, sortKey, sortAsc]);

  const sarData = useMemo(() => {
    return compounds.map(c => ({
      name: c.name,
      logP: c.properties.logP,
      mw: c.properties.mw,
      admet: c.admetScore ?? 0,
    }));
  }, [compounds]);

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <TableHead className="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort(k)}>
      <span className="flex items-center gap-1">
        {label}
        {sortKey === k && <ArrowUpDown className="h-3 w-3" />}
      </span>
    </TableHead>
  );

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Library className="h-5 w-5 text-primary" />
          Biblioteca de Candidatos
          <Badge variant="outline" className="text-[10px] ml-1">{compounds.length} compostos</Badge>
          <div className="ml-auto flex gap-1.5">
            {compounds.length >= 3 && (
              <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setShowSAR(!showSAR)}>
                <BarChart3 className="h-3.5 w-3.5 mr-1" />
                {showSAR ? "Ocultar SAR" : "Análise SAR"}
              </Button>
            )}
            <Button variant="outline" size="sm" className="text-xs h-7" onClick={onExportCSV} disabled={compounds.length === 0}>
              <Download className="h-3.5 w-3.5 mr-1" /> CSV
            </Button>
            <Button size="sm" className="text-xs h-7" onClick={onAdd}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar Atual
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {compounds.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <Library className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Nenhum composto na biblioteca.</p>
            <p className="text-xs mt-1">Ajuste as propriedades no Módulo 2 e clique em "Adicionar Atual" para começar a comparar.</p>
          </div>
        ) : (
          <div className="overflow-auto max-h-[300px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortHeader label="Nome" k="name" />
                  <SortHeader label="MW" k="mw" />
                  <SortHeader label="LogP" k="logP" />
                  <SortHeader label="HBD" k="hbd" />
                  <SortHeader label="HBA" k="hba" />
                  <SortHeader label="TPSA" k="tpsa" />
                  <SortHeader label="ADMET" k="admetScore" />
                  <SortHeader label="ΔG" k="dG" />
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map(c => (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onSelect(c)}>
                    <TableCell className="font-medium text-xs">{c.name}</TableCell>
                    <TableCell className="text-xs font-mono">{c.properties.mw}</TableCell>
                    <TableCell className="text-xs font-mono">{c.properties.logP}</TableCell>
                    <TableCell className="text-xs font-mono">{c.properties.hbd}</TableCell>
                    <TableCell className="text-xs font-mono">{c.properties.hba}</TableCell>
                    <TableCell className="text-xs font-mono">{c.tpsa?.toFixed(1) ?? "—"}</TableCell>
                    <TableCell className="text-xs">
                      {c.admetScore != null ? (
                        <Badge variant={c.admetScore >= 60 ? "default" : "secondary"} className={c.admetScore >= 60 ? "bg-emerald-600" : ""}>
                          {c.admetScore}%
                        </Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-xs font-mono">{c.dG != null ? c.dG.toFixed(2) : "—"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onRemove(c.id); }}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {showSAR && compounds.length >= 3 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground">Análise SAR — LogP vs MW (tamanho = ADMET score)</h4>
            <div className="h-[250px] rounded-lg border border-border bg-background p-2">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 20, bottom: 25, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="logP"
                    type="number"
                    name="LogP"
                    label={{ value: "LogP", position: "insideBottom", offset: -10, style: { fill: "hsl(var(--muted-foreground))", fontSize: 11 } }}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  />
                  <YAxis
                    dataKey="mw"
                    type="number"
                    name="MW"
                    label={{ value: "MW (g/mol)", angle: -90, position: "insideLeft", offset: 5, style: { fill: "hsl(var(--muted-foreground))", fontSize: 11 } }}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  />
                  <RTooltip
                    content={({ payload }) => {
                      if (!payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-popover border border-border rounded-md p-2 text-xs shadow-md">
                          <p className="font-semibold">{d.name}</p>
                          <p>LogP: {d.logP} | MW: {d.mw}</p>
                          <p>ADMET: {d.admet}%</p>
                        </div>
                      );
                    }}
                  />
                  <Scatter data={sarData} fill="hsl(var(--primary))" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
