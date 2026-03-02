import { useTranslation } from "react-i18next";
import { Gamepad2, Brain } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useState } from "react";
import RpgTccGame from "@/components/games/RpgTccGame";
import { Button } from "@/components/ui/button";

export default function JogosClinicos() {
  const { t } = useTranslation();
  const [activeGame, setActiveGame] = useState<string | null>(null);

  if (activeGame === "rpg-tcc") {
    return (
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" className="mb-4 gap-2" onClick={() => setActiveGame(null)}>
          ← Voltar aos jogos
        </Button>
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">RPG de Texto Clínico — TCC</h1>
          <p className="text-muted-foreground">Combata distorções cognitivas usando pensamento racional.</p>
        </div>
        <RpgTccGame />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t("games.title")}</h1>
        <p className="text-muted-foreground text-lg">{t("games.subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary/40"
          onClick={() => setActiveGame("rpg-tcc")}
        >
          <CardHeader className="pb-3">
            <div className="inline-flex rounded-xl bg-purple-100 p-3 mb-2 w-fit">
              <Brain className="h-6 w-6 text-purple-600" />
            </div>
            <CardTitle className="text-lg">RPG Clínico — TCC</CardTitle>
            <CardDescription>
              Combata monstros de distorções cognitivas usando lógica e pensamento racional.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded-full">
              7 batalhas
            </span>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
