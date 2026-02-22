import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Calculator, FlaskConical, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [profileName, setProfileName] = useState("");

  useEffect(() => {
    if (user) {
      supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => {
          if (data?.full_name) setProfileName(data.full_name);
        });
    }
  }, [user]);

  const firstName = profileName?.split(" ")[0] || user?.user_metadata?.full_name?.split(" ")[0] || "Profissional";

  const cards = [
    {
      title: t("dashboard.clinicalCalculators"),
      description: t("dashboard.calcDesc"),
      icon: Calculator,
      to: "/calculadoras",
      gradient: "from-primary to-primary/70",
    },
    {
      title: t("dashboard.clinicalSimulators"),
      description: t("dashboard.simDesc"),
      icon: FlaskConical,
      to: "/simuladores",
      gradient: "from-accent to-accent/70",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-2">{t("dashboard.hello", { name: firstName })}</h1>
        <p className="text-muted-foreground text-lg">
          {t("dashboard.welcome")} <span className="font-semibold text-foreground">{t("common.brand")}</span>. {t("dashboard.chooseCategory")}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cards.map((card) => (
          <Link
            key={card.to}
            to={card.to}
            className="group relative overflow-hidden rounded-2xl border border-border bg-card p-8 hover:shadow-xl hover:shadow-primary/5 transition-all hover:-translate-y-1"
          >
            <div className={`inline-flex rounded-xl bg-gradient-to-br ${card.gradient} p-4 mb-6`}>
              <card.icon className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-3">{card.title}</h2>
            <p className="text-muted-foreground mb-6">{card.description}</p>
            <div className="flex items-center gap-2 text-primary font-semibold text-sm">
              {t("dashboard.explore")}
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
