import { useTranslation } from "react-i18next";
import { Gamepad2, Construction } from "lucide-react";

export default function JogosClinicos() {
  const { t } = useTranslation();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t("games.title")}</h1>
        <p className="text-muted-foreground text-lg">{t("games.subtitle")}</p>
      </div>

      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="inline-flex rounded-2xl bg-primary/10 p-6 mb-6">
          <Construction className="h-12 w-12 text-primary" />
        </div>
        <h2 className="text-xl font-bold mb-2">{t("games.comingSoon")}</h2>
        <p className="text-muted-foreground max-w-md">
          {t("games.comingSoonDesc")}
        </p>
      </div>
    </div>
  );
}
