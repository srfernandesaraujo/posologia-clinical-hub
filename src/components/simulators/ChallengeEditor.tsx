import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, ArrowUp, ArrowDown, Edit3, Copy, Target, GripVertical } from "lucide-react";

export interface EditableMCQ {
  type: "mcq";
  question: string;
  context?: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  reference?: string;
}

export interface EditableAdjust {
  type: "adjust";
  question: string;
  context?: string;
  targetParams: Record<string, { min: number; max: number; label: string }>;
  explanation: string;
  reference?: string;
  // Validator can't be serialized; store validation rules instead
  validationRules?: { paramName: string; operator: "lt" | "lte" | "gt" | "gte" | "between"; value: number; value2?: number }[];
}

export type EditableChallenge = EditableMCQ | EditableAdjust;

export interface EditableChallengeSet {
  title: string;
  description: string;
  challenges: EditableChallenge[];
}

interface ChallengeEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialChallenges?: EditableChallengeSet | null;
  onSave: (challenges: EditableChallengeSet) => void;
  simulatorLabel?: string;
}

function emptyMCQ(): EditableMCQ {
  return {
    type: "mcq",
    question: "",
    context: "",
    options: ["", "", "", ""],
    correctIndex: 0,
    explanation: "",
    reference: "",
  };
}

function emptyAdjust(): EditableAdjust {
  return {
    type: "adjust",
    question: "",
    context: "",
    targetParams: {},
    explanation: "",
    reference: "",
    validationRules: [],
  };
}

export default function ChallengeEditor({
  open,
  onOpenChange,
  initialChallenges,
  onSave,
  simulatorLabel,
}: ChallengeEditorProps) {
  const [title, setTitle] = useState(initialChallenges?.title || "Desafio Customizado");
  const [description, setDescription] = useState(initialChallenges?.description || "");
  const [challenges, setChallenges] = useState<EditableChallenge[]>(
    initialChallenges?.challenges || [emptyMCQ()]
  );

  const updateChallenge = useCallback((index: number, updated: EditableChallenge) => {
    setChallenges(prev => prev.map((c, i) => (i === index ? updated : c)));
  }, []);

  const addChallenge = (type: "mcq" | "adjust") => {
    setChallenges(prev => [...prev, type === "mcq" ? emptyMCQ() : emptyAdjust()]);
  };

  const removeChallenge = (index: number) => {
    if (challenges.length <= 1) return;
    setChallenges(prev => prev.filter((_, i) => i !== index));
  };

  const moveChallenge = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= challenges.length) return;
    setChallenges(prev => {
      const copy = [...prev];
      [copy[index], copy[j]] = [copy[j], copy[index]];
      return copy;
    });
  };

  const handleSave = () => {
    const valid = challenges.filter(c => c.question.trim());
    if (valid.length === 0) return;
    onSave({ title, description, challenges: valid });
    onOpenChange(false);
  };

  const handleClear = () => {
    setTitle("Desafio Customizado");
    setDescription("");
    setChallenges([emptyMCQ()]);
  };

  // Initialize from props when dialog opens
  const handleOpenChange = (o: boolean) => {
    if (o && initialChallenges) {
      setTitle(initialChallenges.title);
      setDescription(initialChallenges.description);
      setChallenges(initialChallenges.challenges.length > 0 ? initialChallenges.challenges : [emptyMCQ()]);
    }
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Editor de Desafios {simulatorLabel ? `— ${simulatorLabel}` : ""}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Título do Desafio</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título do desafio" />
            </div>
            <div>
              <Label className="text-xs">Descrição</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Breve descrição" />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{challenges.length} questões</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => addChallenge("mcq")} className="gap-1">
                <Plus className="h-3 w-3" />Múltipla Escolha
              </Button>
              <Button variant="outline" size="sm" onClick={() => addChallenge("adjust")} className="gap-1">
                <Plus className="h-3 w-3" />Ajuste
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {challenges.map((ch, i) => (
              <Card key={i} className="border-dashed">
                <CardContent className="pt-4 pb-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <Badge variant={ch.type === "mcq" ? "default" : "secondary"} className="text-xs">
                        {i + 1}. {ch.type === "mcq" ? "Múltipla Escolha" : "Ajuste"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveChallenge(i, -1)} disabled={i === 0}>
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveChallenge(i, 1)} disabled={i === challenges.length - 1}>
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                      {challenges.length > 1 && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeChallenge(i)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">Pergunta</Label>
                    <Textarea
                      value={ch.question}
                      onChange={e => updateChallenge(i, { ...ch, question: e.target.value })}
                      placeholder="Digite a pergunta..."
                      className="min-h-[50px] text-sm"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Contexto (opcional)</Label>
                    <Input
                      value={ch.context || ""}
                      onChange={e => updateChallenge(i, { ...ch, context: e.target.value })}
                      placeholder="Dica ou contexto para o aluno"
                      className="text-sm"
                    />
                  </div>

                  {ch.type === "mcq" && (
                    <MCQEditor
                      challenge={ch as EditableMCQ}
                      onChange={updated => updateChallenge(i, updated)}
                    />
                  )}

                  {ch.type === "adjust" && (
                    <AdjustEditor
                      challenge={ch as EditableAdjust}
                      onChange={updated => updateChallenge(i, updated)}
                    />
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Explicação (feedback)</Label>
                      <Textarea
                        value={ch.explanation}
                        onChange={e => updateChallenge(i, { ...ch, explanation: e.target.value })}
                        placeholder="Explicação exibida após a resposta"
                        className="min-h-[40px] text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Referência (opcional)</Label>
                      <Input
                        value={ch.reference || ""}
                        onChange={e => updateChallenge(i, { ...ch, reference: e.target.value })}
                        placeholder="Ex: Goodman & Gilman, Cap. 5"
                        className="text-sm"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" size="sm" onClick={handleClear}>Limpar Tudo</Button>
          <Button onClick={handleSave} disabled={challenges.every(c => !c.question.trim())}>
            Salvar Desafio ({challenges.filter(c => c.question.trim()).length} questões)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MCQEditor({ challenge, onChange }: { challenge: EditableMCQ; onChange: (c: EditableMCQ) => void }) {
  const updateOption = (index: number, value: string) => {
    const opts = [...challenge.options];
    opts[index] = value;
    onChange({ ...challenge, options: opts });
  };

  const addOption = () => {
    if (challenge.options.length >= 6) return;
    onChange({ ...challenge, options: [...challenge.options, ""] });
  };

  const removeOption = (index: number) => {
    if (challenge.options.length <= 2) return;
    const opts = challenge.options.filter((_, i) => i !== index);
    const newCorrect = challenge.correctIndex >= opts.length ? 0 : (challenge.correctIndex > index ? challenge.correctIndex - 1 : challenge.correctIndex);
    onChange({ ...challenge, options: opts, correctIndex: newCorrect });
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs">Alternativas</Label>
      {challenge.options.map((opt, j) => (
        <div key={j} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChange({ ...challenge, correctIndex: j })}
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 shrink-0 transition-colors ${
              challenge.correctIndex === j
                ? "border-green-500 bg-green-500/20 text-green-700 dark:text-green-400"
                : "border-border text-muted-foreground hover:border-primary/50"
            }`}
          >
            {String.fromCharCode(65 + j)}
          </button>
          <Input
            value={opt}
            onChange={e => updateOption(j, e.target.value)}
            placeholder={`Alternativa ${String.fromCharCode(65 + j)}`}
            className="text-sm"
          />
          {challenge.options.length > 2 && (
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeOption(j)}>
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          )}
        </div>
      ))}
      {challenge.options.length < 6 && (
        <Button variant="ghost" size="sm" onClick={addOption} className="text-xs gap-1">
          <Plus className="h-3 w-3" />Adicionar alternativa
        </Button>
      )}
      <p className="text-[10px] text-muted-foreground">Clique na letra para marcar a alternativa correta (verde = correta)</p>
    </div>
  );
}

function AdjustEditor({ challenge, onChange }: { challenge: EditableAdjust; onChange: (c: EditableAdjust) => void }) {
  const params = Object.entries(challenge.targetParams);

  const addParam = () => {
    const key = `param_${Object.keys(challenge.targetParams).length + 1}`;
    onChange({
      ...challenge,
      targetParams: {
        ...challenge.targetParams,
        [key]: { min: 0, max: 100, label: "Novo Parâmetro" },
      },
    });
  };

  const removeParam = (key: string) => {
    const copy = { ...challenge.targetParams };
    delete copy[key];
    onChange({ ...challenge, targetParams: copy });
  };

  const updateParam = (key: string, field: string, value: string | number) => {
    onChange({
      ...challenge,
      targetParams: {
        ...challenge.targetParams,
        [key]: { ...challenge.targetParams[key], [field]: value },
      },
    });
  };

  const renameParam = (oldKey: string, newKey: string) => {
    if (newKey === oldKey || !newKey.trim()) return;
    const copy = { ...challenge.targetParams };
    copy[newKey] = copy[oldKey];
    delete copy[oldKey];
    onChange({ ...challenge, targetParams: copy });
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs">Parâmetros Alvo (faixas que o aluno deve atingir)</Label>
      {params.map(([key, spec]) => (
        <div key={key} className="flex items-center gap-2 flex-wrap">
          <Input
            value={key}
            onChange={e => renameParam(key, e.target.value)}
            className="w-28 text-xs"
            placeholder="chave"
          />
          <Input
            value={spec.label}
            onChange={e => updateParam(key, "label", e.target.value)}
            className="w-32 text-xs"
            placeholder="Label"
          />
          <Input
            type="number"
            value={spec.min}
            onChange={e => updateParam(key, "min", Number(e.target.value))}
            className="w-20 text-xs"
            placeholder="Min"
          />
          <span className="text-xs text-muted-foreground">–</span>
          <Input
            type="number"
            value={spec.max}
            onChange={e => updateParam(key, "max", Number(e.target.value))}
            className="w-20 text-xs"
            placeholder="Max"
          />
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeParam(key)}>
            <Trash2 className="h-3 w-3 text-destructive" />
          </Button>
        </div>
      ))}
      <Button variant="ghost" size="sm" onClick={addParam} className="text-xs gap-1">
        <Plus className="h-3 w-3" />Adicionar parâmetro
      </Button>
    </div>
  );
}
