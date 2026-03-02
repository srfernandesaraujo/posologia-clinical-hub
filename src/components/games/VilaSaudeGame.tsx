import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Coins, Flame, Pill, HeartPulse, TreePine, Home, Dumbbell, Apple, Check, type LucideIcon } from "lucide-react";
import confetti from "canvas-confetti";

interface Medication { id: number; name: string; time: string; taken: boolean; reward: number; }
interface Building { id: number; name: string; type: string; level: number; maxLevel: number; upgradeCost: number; description: string; levelNames: string[]; }
interface UserStats { coins: number; streak: number; }

const iconMap: Record<string, LucideIcon> = { HeartPulse, TreePine, Home, Dumbbell, Apple, Flame };

const defaultMedications: Medication[] = [
  { id: 1, name: "Metformina", time: "08:00", taken: false, reward: 20 },
  { id: 2, name: "Losartana", time: "20:00", taken: false, reward: 20 },
];

const defaultBuildings: Building[] = [
  { id: 1, name: "Centro de Bem-Estar", type: "HeartPulse", level: 1, maxLevel: 4, upgradeCost: 50, description: "Cuida da saúde da população da tua vila.", levelNames: ["Posto Médico", "Clínica Local", "Hospital Regional", "Centro de Pesquisa Médica"] },
  { id: 2, name: "Área Verde", type: "TreePine", level: 1, maxLevel: 4, upgradeCost: 30, description: "Um espaço para relaxar e respirar ar puro.", levelNames: ["Terreno Baldio", "Pequeno Jardim", "Parque Arborizado", "Jardim Botânico"] },
  { id: 3, name: "Bairro Residencial", type: "Home", level: 1, maxLevel: 4, upgradeCost: 40, description: "Acomoda os novos habitantes atraídos pela tua consistência.", levelNames: ["Acampamento", "Bairro de Madeira", "Vila de Tijolo", "Metrópole Moderna"] },
  { id: 4, name: "Centro de Treino", type: "Dumbbell", level: 1, maxLevel: 3, upgradeCost: 60, description: "Promove a atividade física na tua comunidade.", levelNames: ["Parque de Calistenia", "Ginásio Comunitário", "Complexo Desportivo"] },
  { id: 5, name: "Mercado de Nutrição", type: "Apple", level: 1, maxLevel: 3, upgradeCost: 45, description: "Garante alimentos frescos e saudáveis para todos.", levelNames: ["Banca de Fruta", "Mercado Biológico", "Supermercado Sustentável"] },
  { id: 6, name: "Farol da Esperança", type: "Flame", level: 1, maxLevel: 3, upgradeCost: 100, description: "Um monumento à tua resiliência e dedicação diária.", levelNames: ["Fogueira", "Torre de Vigia", "Farol Iluminado"] },
];

function getIconColor(level: number, maxLevel: number) {
  if (level >= maxLevel) return "text-yellow-500 animate-pulse";
  if (level === 3) return "text-purple-500";
  if (level === 2) return "text-blue-500";
  return "text-gray-400";
}

function getIconSize(level: number, maxLevel: number) {
  if (level >= maxLevel) return 48;
  if (level >= 3) return 42;
  if (level === 2) return 36;
  return 28;
}

export default function VilaSaudeGame({ customData }: { customData?: any }) {
  const { toast } = useToast();
  const initMeds = (customData?.medications || defaultMedications).map((m: any) => ({ ...m, taken: false }));
  const initBuilds = (customData?.buildings || defaultBuildings).map((b: any) => ({ ...b, level: 1 }));

  const [stats, setStats] = useState<UserStats>({ coins: 50, streak: 3 });
  const [medications, setMedications] = useState<Medication[]>(initMeds);
  const [buildings, setBuildings] = useState<Building[]>(initBuilds);

  const takenCount = medications.filter((m) => m.taken).length;
  const progressPercent = (takenCount / medications.length) * 100;

  const takeMed = useCallback((id: number) => {
    setMedications((prev) => prev.map((m) => (m.id === id ? { ...m, taken: true } : m)));
    const med = medications.find((m) => m.id === id);
    if (med) { setStats((s) => ({ ...s, coins: s.coins + med.reward })); toast({ title: "Muito bem! 💊", description: `Ganhaste ${med.reward} moedas por tomar ${med.name}!` }); }
  }, [medications, toast]);

  const upgradeBuilding = useCallback((id: number) => {
    const b = buildings.find((b) => b.id === id);
    if (!b || stats.coins < b.upgradeCost || b.level >= b.maxLevel) return;
    const newLevel = b.level + 1;
    const isMax = newLevel >= b.maxLevel;
    setStats((s) => ({ ...s, coins: s.coins - b.upgradeCost }));
    setBuildings((prev) => prev.map((item) => item.id === id ? { ...item, level: newLevel, upgradeCost: isMax ? item.upgradeCost : Math.round(item.upgradeCost * 1.2) } : item));
    toast({ title: "Construção melhorada! 🏗️", description: `${b.name} subiu para o nível ${newLevel}!` });
    if (isMax) { confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } }); }
  }, [buildings, stats.coins, toast]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm font-medium"><span>Progresso diário</span><span>{takenCount}/{medications.length} remédios</span></div>
        <Progress value={progressPercent} className="h-3" />
      </div>
      <div className="flex gap-4">
        <div className="flex items-center gap-2 rounded-xl bg-yellow-100 px-4 py-2 font-semibold text-yellow-700"><Coins className="h-5 w-5" /> {stats.coins}</div>
        <div className="flex items-center gap-2 rounded-xl bg-orange-100 px-4 py-2 font-semibold text-orange-600"><Flame className="h-5 w-5" /> {stats.streak} dias seguidos</div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-bold"><Pill className="h-5 w-5 text-emerald-600" /> Diário do Medicamento</h2>
          {medications.map((med) => (
            <Card key={med.id} className={med.taken ? "border-emerald-300 bg-emerald-50" : ""}>
              <CardContent className="flex items-center justify-between py-4">
                <div><p className="font-semibold">{med.name}</p><p className="text-sm text-muted-foreground">Horário: {med.time}</p></div>
                <Button disabled={med.taken} variant={med.taken ? "secondary" : "default"} className={med.taken ? "gap-1 bg-emerald-200 text-emerald-700" : "gap-1 bg-emerald-600 hover:bg-emerald-700"} onClick={() => takeMed(med.id)}>
                  {med.taken ? (<>Tomado <Check className="h-4 w-4" /></>) : (`Marcar como Tomado (+${med.reward} 🪙)`)}
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>
        <section className="space-y-3">
          <h2 className="text-lg font-bold">🏘️ A Tua Vila</h2>
          <div className="grid grid-cols-2 gap-3">
            {buildings.map((b) => {
              const Icon = iconMap[b.type] ?? Home;
              const isMax = b.level >= b.maxLevel;
              const displayName = b.levelNames[b.level - 1] ?? b.name;
              return (
                <div key={b.id} className="flex flex-col items-center rounded-2xl bg-white/60 p-4 text-center backdrop-blur-sm transition-transform hover:scale-[1.02]">
                  <Icon className={getIconColor(b.level, b.maxLevel)} size={getIconSize(b.level, b.maxLevel)} />
                  <p className="mt-2 text-sm font-bold leading-tight">{displayName}</p>
                  <p className="text-xs text-muted-foreground">{b.description}</p>
                  <p className="mt-1 text-xs font-medium">Nível {b.level}/{b.maxLevel}</p>
                  {isMax ? (<Badge className="mt-2 bg-yellow-400 text-yellow-900">Nível Máximo! ⭐</Badge>) : (
                    <Button size="sm" className="mt-2 gap-1" variant="outline" disabled={stats.coins < b.upgradeCost} onClick={() => upgradeBuilding(b.id)}>Melhorar ({b.upgradeCost} <Coins className="h-3 w-3" />)</Button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
