import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Calculator, FlaskConical, ArrowRight, Trophy, Flame, Star, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGamification } from "@/hooks/useGamification";

const WELCOME_DISMISSED_KEY = "posologia_welcome_dismissed";

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [profileName, setProfileName] = useState("");
  const { totalPoints, streak, earnedBadges } = useGamification();
  const [showWelcome, setShowWelcome] = useState(false);

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

      // Show welcome banner only on first visit
      const dismissed = localStorage.getItem(WELCOME_DISMISSED_KEY);
      if (!dismissed) {
        setShowWelcome(true);
      }
    }
  }, [user]);

  const dismissWelcome = () => {
    setShowWelcome(false);
    localStorage.setItem(WELCOME_DISMISSED_KEY, "true");
  };

  const firstName = profileName?.split(" ")[0] || user?.user_metadata?.full_name?.split(" ")[0] || "Profissional";

  const hasActivity = totalPoints > 0 || streak > 0 || earnedBadges.length > 0;

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

      {/* Welcome Banner - First visit only */}
      {showWelcome && (
        <div className="mb-8 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5 p-6 relative">
          <button
            onClick={dismissWelcome}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground text-sm"
            aria-label="Fechar"
          >
            ✕
          </button>
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-primary/10 p-3">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-bold">{t("dashboard.welcomeTitle")}</h2>
              <p className="text-sm text-muted-foreground">{t("dashboard.welcomeDesc")}</p>
              <div className="flex items-center gap-3 pt-1">
                <Link to="/calculadoras" className="text-sm font-medium text-primary hover:underline">
                  {t("dashboard.tryCaclulator")} →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gamification Mini Widget - only show if user has some activity */}
      {hasActivity && (
        <Link
          to="/gamificacao"
          className="mb-8 flex items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-5 hover:bg-primary/10 transition-colors group"
        >
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" />
              <span className="text-lg font-bold text-primary">{totalPoints.toLocaleString("pt-BR")} pts</span>
            </div>
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">{streak} {streak === 1 ? t("dashboard.dayStreak") : t("dashboard.daysStreak")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">{earnedBadges.length} badges</span>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-primary group-hover:translate-x-1 transition-transform" />
        </Link>
      )}

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
