import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, User, Users, Package } from "lucide-react";
import type { ForensicScenario } from "@/data/forensicScenarios";

interface ForensicCasePanelProps {
  scenario: ForensicScenario;
}

export function ForensicCasePanel({ scenario }: ForensicCasePanelProps) {
  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-destructive" />
            Caso: {scenario.title}
          </CardTitle>
          <Badge variant="outline" className="text-xs">{scenario.difficulty}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Narrative */}
        <div className="bg-background/80 rounded-lg p-3 border border-border/50">
          <p className="text-sm leading-relaxed">{scenario.narrative}</p>
        </div>

        {/* Crime scene */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Cena do Crime</h4>
          <p className="text-sm text-foreground/90">{scenario.crimeScene}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Victim */}
          <div className="bg-background rounded-lg p-3 border border-border/50">
            <div className="flex items-center gap-1.5 mb-1">
              <User className="h-3.5 w-3.5 text-destructive" />
              <span className="text-xs font-semibold uppercase text-muted-foreground">Vítima</span>
            </div>
            <p className="text-sm font-medium">{scenario.victim.name}{scenario.victim.age > 0 && `, ${scenario.victim.age} anos`}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{scenario.victim.description}</p>
          </div>

          {/* Suspects */}
          <div className="bg-background rounded-lg p-3 border border-border/50">
            <div className="flex items-center gap-1.5 mb-1">
              <Users className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs font-semibold uppercase text-muted-foreground">Suspeitos</span>
            </div>
            <div className="space-y-1">
              {scenario.suspects.map((s, i) => (
                <div key={i}>
                  <p className="text-sm font-medium">{s.name} <span className="text-xs text-muted-foreground">({s.relation})</span></p>
                  <p className="text-[11px] text-muted-foreground">{s.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Samples */}
          <div className="bg-background rounded-lg p-3 border border-border/50">
            <div className="flex items-center gap-1.5 mb-1">
              <Package className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold uppercase text-muted-foreground">Amostras Coletadas</span>
            </div>
            <div className="space-y-1">
              {scenario.samples.map((s) => (
                <div key={s.id}>
                  <p className="text-sm font-medium">{s.label}</p>
                  <p className="text-[11px] text-muted-foreground">{s.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
