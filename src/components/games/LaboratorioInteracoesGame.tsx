import { useState } from "react";
import { FlaskConical, Pill, Leaf, AlertTriangle, CheckCircle, Star, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface InventoryItem { id: string; name: string; type: "Pill" | "Leaf"; category: string; color: string; }
interface InteractionResult { type: "danger" | "safe"; title: string; description: string; points: number; }

const defaultItems: InventoryItem[] = [
  { id: "M1", name: "Varfarina", type: "Pill", category: "Anticoagulante", color: "bg-blue-100 text-blue-700" },
  { id: "A1", name: "Espinafre", type: "Leaf", category: "Rico em Vitamina K", color: "bg-green-100 text-green-700" },
  { id: "M2", name: "Omeprazol", type: "Pill", category: "Inibidor da Bomba de Protões", color: "bg-purple-100 text-purple-700" },
  { id: "M3", name: "Clopidogrel", type: "Pill", category: "Antiagregante Plaquetário", color: "bg-red-100 text-red-700" },
  { id: "F1", name: "Ginkgo Biloba", type: "Leaf", category: "Fitoterápico", color: "bg-emerald-100 text-emerald-700" },
  { id: "M4", name: "Ibuprofeno", type: "Pill", category: "AINE", color: "bg-orange-100 text-orange-700" },
];

const defaultInteractions: Record<string, InteractionResult> = {
  "A1-M1": { type: "danger", title: "Risco de Trombose!", description: "A Vitamina K do espinafre antagoniza o efeito da Varfarina, reduzindo a sua eficácia anticoagulante.", points: 50 },
  "M2-M3": { type: "danger", title: "Interação Enzimática!", description: "O Omeprazol inibe a enzima CYP2C19, impedindo a ativação do Clopidogrel. Aumenta o risco cardiovascular.", points: 75 },
  "F1-M4": { type: "danger", title: "Risco de Sangramento!", description: "Ambos afetam a coagulação/agregação. Juntos, aumentam significativamente o risco de hemorragia.", points: 50 },
  default: { type: "safe", title: "Combinação Segura", description: "Não existem interações graves documentadas entre estas duas substâncias nesta base de dados.", points: 10 },
};

const TypeIcon = ({ type }: { type: "Pill" | "Leaf" }) => type === "Pill" ? <Pill className="h-5 w-5" /> : <Leaf className="h-5 w-5" />;

function SlotBox({ item, onRemove }: { item?: InventoryItem; onRemove: () => void }) {
  if (!item) return <div className="w-36 h-28 rounded-xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center text-muted-foreground text-sm">Vazio</div>;
  return (
    <div className={`relative w-36 h-28 rounded-xl flex flex-col items-center justify-center gap-1 ${item.color}`}>
      <button onClick={onRemove} className="absolute top-1 right-1 rounded-full p-0.5 hover:bg-black/10"><X className="h-4 w-4" /></button>
      <TypeIcon type={item.type} /><p className="font-semibold text-sm">{item.name}</p><p className="text-xs opacity-75">{item.category}</p>
    </div>
  );
}

export default function LaboratorioInteracoesGame({ customData }: { customData?: any }) {
  const inventoryItems: InventoryItem[] = customData?.items || defaultItems;
  const interactionsDictionary: Record<string, InteractionResult> = customData?.interactions ? { ...customData.interactions, default: defaultInteractions.default } : defaultInteractions;

  const [selectedItems, setSelectedItems] = useState<InventoryItem[]>([]);
  const [score, setScore] = useState(0);
  const [lastResult, setLastResult] = useState<InteractionResult | null>(null);
  const [discoveredKeys, setDiscoveredKeys] = useState<Set<string>>(new Set());

  const handleSelectItem = (item: InventoryItem) => { if (selectedItems.length >= 2 || selectedItems.some((s) => s.id === item.id)) return; setSelectedItems((prev) => [...prev, item]); };
  const handleRemoveSlot = (index: number) => setSelectedItems((prev) => prev.filter((_, i) => i !== index));

  const handleMix = () => {
    if (selectedItems.length !== 2) return;
    const key = [selectedItems[0].id, selectedItems[1].id].sort().join("-");
    const result = interactionsDictionary[key] || interactionsDictionary.default;
    const isNew = !discoveredKeys.has(key);
    setLastResult(result);
    if (isNew) { setScore((s) => s + result.points); setDiscoveredKeys((prev) => new Set(prev).add(key)); }
  };

  const handleClear = () => { setLastResult(null); setSelectedItems([]); };

  const totalDangerInteractions = Object.keys(interactionsDictionary).filter((k) => k !== "default").length;
  const discoveredDanger = [...discoveredKeys].filter((k) => interactionsDictionary[k]?.type === "danger").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">Interações perigosas descobertas: {discoveredDanger}/{totalDangerInteractions}</p>
        <div className="flex items-center gap-2 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full font-bold text-lg"><Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />{score}</div>
      </div>
      <Card className="backdrop-blur-sm bg-white/70 border border-white/40 shadow-lg">
        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-lg"><FlaskConical className="h-5 w-5 text-indigo-600" />Misturador</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <SlotBox item={selectedItems[0]} onRemove={() => handleRemoveSlot(0)} />
            <span className="text-2xl font-bold text-muted-foreground">+</span>
            <SlotBox item={selectedItems[1]} onRemove={() => handleRemoveSlot(1)} />
          </div>
          <div className="flex justify-center mt-6"><Button size="lg" disabled={selectedItems.length !== 2} onClick={handleMix} className="gap-2 text-base px-8"><FlaskConical className="h-5 w-5" />MISTURAR</Button></div>
        </CardContent>
      </Card>
      <div>
        <h3 className="font-semibold mb-3 text-muted-foreground text-sm uppercase tracking-wide">Inventário de Substâncias</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {inventoryItems.map((item) => {
            const isSelected = selectedItems.some((s) => s.id === item.id);
            return (
              <button key={item.id} onClick={() => handleSelectItem(item)} disabled={isSelected || selectedItems.length >= 2}
                className={`flex items-center gap-3 rounded-xl p-3 text-left transition-all border-2 ${isSelected ? "border-primary/50 opacity-50 cursor-not-allowed" : "border-transparent hover:border-primary/30 hover:shadow-md cursor-pointer"} ${item.color}`}>
                <TypeIcon type={item.type} /><div><p className="font-semibold text-sm">{item.name}</p><p className="text-xs opacity-75">{item.category}</p></div>
              </button>
            );
          })}
        </div>
      </div>
      <Dialog open={!!lastResult} onOpenChange={(open) => !open && handleClear()}>
        <DialogContent className="sm:max-w-md">
          {lastResult && (<>
            <DialogHeader>
              <div className="flex justify-center mb-3">{lastResult.type === "danger" ? <div className="rounded-full bg-red-100 p-4"><AlertTriangle className="h-10 w-10 text-red-600" /></div> : <div className="rounded-full bg-green-100 p-4"><CheckCircle className="h-10 w-10 text-green-600" /></div>}</div>
              <DialogTitle className={`text-center text-xl ${lastResult.type === "danger" ? "text-red-700" : "text-green-700"}`}>{lastResult.title}</DialogTitle>
              <DialogDescription className="text-center text-base mt-2">{lastResult.description}</DialogDescription>
            </DialogHeader>
            <div className="flex justify-center my-2"><Badge variant="secondary" className="text-sm">+{lastResult.points} pontos</Badge></div>
            <DialogFooter className="sm:justify-center"><Button onClick={handleClear} className="gap-2">Limpar Bancada</Button></DialogFooter>
          </>)}
        </DialogContent>
      </Dialog>
    </div>
  );
}
