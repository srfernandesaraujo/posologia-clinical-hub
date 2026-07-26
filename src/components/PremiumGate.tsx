import { ReactNode } from "react";
import { Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UpgradeModal } from "@/components/UpgradeModal";
import { useFeatureGating } from "@/hooks/useFeatureGating";

interface PremiumGateProps {
  title: string;
  feature: string;
  icon?: ReactNode;
  children: ReactNode;
}

/**
 * Blocks rendering of `children` (and therefore any data-fetching / edge-function
 * calls they'd trigger) unless the user has full access, showing an upsell card
 * instead. Route-level pages should wrap themselves with this rather than relying
 * only on hub-page card locks, which don't stop direct/deep-link navigation.
 */
export function PremiumGate({ title, feature, icon, children }: PremiumGateProps) {
  const { isPremium: isFullAccess, upgradeOpen, setUpgradeOpen, upgradeFeature, showUpgrade } = useFeatureGating();

  if (isFullAccess) return <>{children}</>;

  return (
    <div className="max-w-3xl mx-auto">
      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} feature={upgradeFeature} />
      <div className="flex items-center gap-3 mb-8">
        {icon}
        <h1 className="text-3xl font-bold">{title}</h1>
      </div>
      <Card>
        <CardContent className="py-12 text-center space-y-4">
          <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">
            {feature} é um recurso exclusivo do plano <strong>Posologia Premium</strong>.
          </p>
          <Button onClick={() => showUpgrade(feature)}>Assinar Premium</Button>
        </CardContent>
      </Card>
    </div>
  );
}
