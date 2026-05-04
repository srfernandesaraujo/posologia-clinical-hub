import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { DoorOpen, Plus, Copy, Trash2, Users, EyeOff, Calendar, Lock, ArrowUp, ArrowDown, X, ClipboardList, FlaskConical, Cpu, Edit3, Target, Pencil, RotateCcw, Gamepad2 } from "lucide-react";
import { useFeatureGating } from "@/hooks/useFeatureGating";
import { UpgradeModal } from "@/components/UpgradeModal";
import ChallengeEditor, { EditableChallengeSet } from "@/components/simulators/ChallengeEditor";
import { getNativeCases } from "@/data/nativeCaseCatalog";
import { VIRTUAL_ROOM_GAMES, VIRTUAL_ROOM_GAME_CATEGORIES, isGameSlug } from "@/data/virtualRoomGames";

interface ToolOption {
  slug: string;
  label: string;
  category: string;
}

type ToolType = "simulator" | "laboratory" | "game";

const SIMULATOR_OPTIONS: ToolOption[] = [
  // Farmácia Clínica
  { slug: "prm", label: "PRM – Problemas Relacionados a Medicamentos", category: "Farmácia Clínica" },
  { slug: "metodo-soap", label: "Simulador do Método SOAP", category: "Farmácia Clínica" },
  { slug: "mai", label: "Simulador MAI", category: "Farmácia Clínica" },
  { slug: "cascata-prescricao", label: "Cascata de Prescrição", category: "Farmácia Clínica" },
  { slug: "acompanhamento", label: "Acompanhamento Farmacoterapêutico", category: "Farmácia Clínica" },
  { slug: "dispensacao-344", label: "Dispensação — Portaria 344/98", category: "Farmácia Clínica" },
  // Infectologia
  { slug: "antimicrobianos", label: "Antimicrobianos / Stewardship", category: "Infectologia" },
  // Farmacocinética
  { slug: "tdm", label: "TDM – Monitoramento Terapêutico", category: "Farmacocinética" },
  // Endocrinologia
  { slug: "insulina", label: "Dose de Insulina", category: "Endocrinologia" },
  // Enfermagem / UTI
  { slug: "bomba-infusao", label: "Bomba de Infusão", category: "Enfermagem / UTI" },
  // Psiquiatria
  { slug: "desmame-benzo", label: "Desmame de Benzodiazepínicos", category: "Psiquiatria" },
  // Farmacologia Clínica
  { slug: "interacoes", label: "Interações Medicamentosas", category: "Farmacologia Clínica" },
  { slug: "manejo-dor", label: "Manejo da Dor e Analgesia", category: "Farmacologia Clínica" },
  { slug: "inflamacao-aines", label: "Inflamação e Anti-inflamatórios", category: "Farmacologia Clínica" },
  { slug: "infeccoes-antibioticos", label: "Infecções e Antibioticoterapia", category: "Farmacologia Clínica" },
  { slug: "tratamento-asma", label: "Tratamento da Asma", category: "Farmacologia Clínica" },
  // Fisiologia Humana
  { slug: "sna", label: "Sistema Nervoso Autônomo", category: "Fisiologia Humana" },
  { slug: "eletrofisiologia-cardiaca", label: "Eletrofisiologia Cardíaca", category: "Fisiologia Humana" },
  { slug: "depuracao-renal", label: "Depuração Renal e TFG", category: "Fisiologia Humana" },
  { slug: "equilibrio-acido-base", label: "Equilíbrio Ácido-Base", category: "Fisiologia Humana" },
  { slug: "regulacao-glicemica", label: "Regulação Glicêmica", category: "Fisiologia Humana" },
  { slug: "eixo-hpa", label: "Eixo HPA", category: "Fisiologia Humana" },
  { slug: "cinetica-enzimatica", label: "Cinética Enzimática", category: "Fisiologia Humana" },
  { slug: "secrecao-gastrica", label: "Secreção Ácida Gástrica", category: "Fisiologia Humana" },
  { slug: "cascata-coagulacao", label: "Cascata de Coagulação", category: "Fisiologia Humana" },
  { slug: "compartimentos-adme", label: "Compartimentos ADME", category: "Fisiologia Humana" },
  // Bioquímica
  { slug: "cadeia-eletrons", label: "Cadeia de Transporte de Eletrões", category: "Bioquímica" },
  { slug: "dissociacao-hemoglobina", label: "Dissociação da Hemoglobina", category: "Bioquímica" },
  { slug: "glicolise-gliconeogenese", label: "Glicólise vs. Gliconeogénese", category: "Bioquímica" },
  { slug: "cinetica-avancada", label: "Cinética Enzimática Avançada", category: "Bioquímica" },
  { slug: "ciclo-ureia", label: "Ciclo da Ureia", category: "Bioquímica" },
  { slug: "acido-araquidonico", label: "Cascata do Ácido Araquidónico", category: "Bioquímica" },
  { slug: "lipoproteinas", label: "Metabolismo das Lipoproteínas", category: "Bioquímica" },
  { slug: "pentoses-fosfato", label: "Via das Pentoses Fosfato e G6PD", category: "Bioquímica" },
  { slug: "titulacao-aminoacidos", label: "Titulação de Aminoácidos", category: "Bioquímica" },
  { slug: "operon-lac", label: "Operão Lac", category: "Bioquímica" },
  // Farmacologia Básica
  { slug: "dose-resposta", label: "Curva Dose-Resposta", category: "Farmacologia Básica" },
  { slug: "transducao-sinal", label: "Transdução de Sinal", category: "Farmacologia Básica" },
  { slug: "janela-terapeutica-farma", label: "Janela Terapêutica", category: "Farmacologia Básica" },
  { slug: "vias-administracao", label: "Vias de Administração", category: "Farmacologia Básica" },
  { slug: "bloqueio-neuromuscular", label: "Bloqueio Neuromuscular", category: "Farmacologia Básica" },
  { slug: "farmaco-autonomica", label: "Farmacologia Autonômica", category: "Farmacologia Básica" },
  { slug: "tolerancia-dependencia", label: "Tolerância e Dependência", category: "Farmacologia Básica" },
  { slug: "farmacogenomica", label: "Farmacogenômica CYP", category: "Farmacologia Básica" },
  // Farmacotécnica
  { slug: "estabilidade", label: "Estabilidade e Prazo de Validade", category: "Farmacotécnica" },
  { slug: "liberacao-farmacos", label: "Sistemas de Liberação", category: "Farmacotécnica" },
  { slug: "diluicao", label: "Diluição e Concentração", category: "Farmacotécnica" },
  { slug: "reologia", label: "Reologia e Viscosidade", category: "Farmacotécnica" },
  { slug: "hlb-emulsoes", label: "Equilíbrio HLB e Emulsões", category: "Farmacotécnica" },
  { slug: "granulometria", label: "Granulometria", category: "Farmacotécnica" },
  { slug: "compressao", label: "Compressão de Comprimidos", category: "Farmacotécnica" },
  { slug: "tampao-farmaceutico", label: "Tampão Farmacêutico", category: "Farmacotécnica" },
  // Química Farmacêutica
  { slug: "sar-explorer", label: "Relação Estrutura-Atividade (SAR)", category: "Química Farmacêutica" },
  { slug: "lipinski", label: "Regra de Lipinski", category: "Química Farmacêutica" },
  { slug: "bioisosterismo", label: "Bioisosterismo", category: "Química Farmacêutica" },
  { slug: "metabolismo-farmacos", label: "Metabolismo de Fármacos", category: "Química Farmacêutica" },
  { slug: "docking-simplificado", label: "Docking Fármaco-Receptor", category: "Química Farmacêutica" },
  { slug: "quiralidade", label: "Quiralidade e Estereoquímica", category: "Química Farmacêutica" },
  { slug: "pka-absorcao", label: "pKa, Ionização e Absorção", category: "Química Farmacêutica" },
  { slug: "qsar-simplificado", label: "QSAR (Hansch)", category: "Química Farmacêutica" },
  // Formação Docente
  { slug: "feedback-formativo", label: "Feedback Formativo", category: "Formação Docente" },
  { slug: "elaboracao-questoes", label: "Elaboração de Questões (Bloom)", category: "Formação Docente" },
  { slug: "conducao-caso-pbl", label: "Condução de Caso (PBL/TBL)", category: "Formação Docente" },
  { slug: "planejamento-aula", label: "Planejamento de Aula", category: "Formação Docente" },
  { slug: "gestao-sala", label: "Gestão de Sala", category: "Formação Docente" },
  { slug: "avaliacao-rubrica-osce", label: "Avaliação por Rubrica (OSCE)", category: "Formação Docente" },
  { slug: "preceptoria-clinica", label: "Preceptoria Clínica", category: "Formação Docente" },
  // Odontologia
  { slug: "odontograma", label: "Odontograma Interativo", category: "Odontologia" },
  { slug: "anatomia-endodontia", label: "Anatomia Dental (Endodontia)", category: "Odontologia" },
  { slug: "periodontograma", label: "Periodontograma", category: "Odontologia" },
  { slug: "anestesiologia-odonto", label: "Anestesiologia Odontológica", category: "Odontologia" },
  { slug: "cefalometria", label: "Cefalometria", category: "Odontologia" },
  { slug: "radiografia-odonto", label: "Radiografia Odontológica", category: "Odontologia" },
  { slug: "farmacologia-odonto", label: "Farmacologia Odontológica", category: "Odontologia" },
  { slug: "cirurgia-exodontia", label: "Cirurgia e Exodontia", category: "Odontologia" },
  // Fisioterapia
  { slug: "goniometria", label: "Goniometria Articular", category: "Fisioterapia" },
  { slug: "avaliacao-postural", label: "Avaliação Postural", category: "Fisioterapia" },
  { slug: "forca-muscular", label: "Força Muscular (Oxford/MRC)", category: "Fisioterapia" },
  { slug: "dermatomos", label: "Dermátomos e Avaliação Sensitiva", category: "Fisioterapia" },
  { slug: "respiratorio", label: "Fisioterapia Respiratória", category: "Fisioterapia" },
  { slug: "eletroterapia", label: "Eletroterapia", category: "Fisioterapia" },
  { slug: "testes-ortopedicos", label: "Testes Ortopédicos Especiais", category: "Fisioterapia" },
  { slug: "berg", label: "Escala de Equilíbrio de Berg", category: "Fisioterapia" },
  // Nutrição
  { slug: "avaliacao-nutricional", label: "Avaliação Nutricional Antropométrica", category: "Nutrição" },
  { slug: "triagem-nutricional", label: "Triagem Nutricional (NRS-2002)", category: "Nutrição" },
  { slug: "necessidades-energeticas", label: "Necessidades Energéticas", category: "Nutrição" },
  { slug: "tne", label: "Terapia Nutricional Enteral (TNE)", category: "Nutrição" },
  { slug: "tnp", label: "Terapia Nutricional Parenteral (TNP)", category: "Nutrição" },
  { slug: "disfagia", label: "Avaliação de Disfagia", category: "Nutrição" },
  { slug: "nutricao-renal", label: "Nutrição Renal Crônica", category: "Nutrição" },
  { slug: "nutricao-materno-infantil", label: "Nutrição Materno-Infantil", category: "Nutrição" },
  // Genética
  { slug: "sequenciamento-dna", label: "Sequenciamento de DNA (Sanger e NGS)", category: "Genética" },
  { slug: "snp-farmacogenetica", label: "SNPs e Farmacogenética", category: "Genética" },
  { slug: "cariotipo", label: "Cariótipo e Anomalias Cromossômicas", category: "Genética" },
  { slug: "heranca-mendeliana", label: "Herança Mendeliana e Heredogramas", category: "Genética" },
  { slug: "pcr-eletroforese", label: "PCR e Eletroforese em Gel", category: "Genética" },
  { slug: "epigenetica", label: "Epigenética e Regulação Gênica", category: "Genética" },
  { slug: "mutacoes-reparo", label: "Mutações e Reparo de DNA", category: "Genética" },
  { slug: "genetica-populacoes", label: "Genética de Populações (Hardy-Weinberg)", category: "Genética" },
];

const LAB_OPTIONS: ToolOption[] = [
  { slug: "lab-farmacos", label: "Desenvolvimento de Fármacos", category: "Laboratório Virtual" },
  { slug: "lab-microbiologia", label: "Microbiologia", category: "Laboratório Virtual" },
  { slug: "lab-toxicologia", label: "Toxicologia", category: "Laboratório Virtual" },
  { slug: "lab-farmacogenomica", label: "Farmacogenômica", category: "Laboratório Virtual" },
  { slug: "lab-estabilidade", label: "Estabilidade", category: "Laboratório Virtual" },
  { slug: "lab-controle-qualidade", label: "Controle de Qualidade", category: "Laboratório Virtual" },
  { slug: "lab-epidemiologia", label: "Epidemiologia", category: "Laboratório Virtual" },
  { slug: "lab-biotecnologia", label: "Biotecnologia", category: "Laboratório Virtual" },
  { slug: "lab-simulacao-realistica", label: "Simulação Realística", category: "Laboratório Virtual" },
  { slug: "lab-pericia-forense", label: "Perícia Forense", category: "Laboratório Virtual" },
  { slug: "lab-modelagem-molecular", label: "Modelagem Molecular", category: "Laboratório Virtual" },
];

const GAME_OPTIONS: ToolOption[] = VIRTUAL_ROOM_GAMES.map(g => ({
  slug: g.slug,
  label: g.label,
  category: g.category,
}));

const ALL_OPTIONS = [...SIMULATOR_OPTIONS, ...LAB_OPTIONS, ...GAME_OPTIONS];
const SIMULATOR_CATEGORIES = [...new Set(SIMULATOR_OPTIONS.map(s => s.category))];
const LAB_CATEGORIES = [...new Set(LAB_OPTIONS.map(s => s.category))];
const GAME_CATEGORIES = VIRTUAL_ROOM_GAME_CATEGORIES as string[];

interface ActivityItem {
  category: string;
  simulatorSlug: string;
  caseId: string;
  instruction: string;
  customChallenges?: any;
}

interface AuthorizedStudent {
  student_name: string;
  email: string;
}

function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function parseStudentList(text: string): AuthorizedStudent[] {
  const out: AuthorizedStudent[] = [];
  const lines = text.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    // Accept: "Name,email" / "Name;email" / "Name<TAB>email" / "Name email"
    const parts = line.split(/[,;\t]/).map(s => s.trim()).filter(Boolean);
    let name = "", email = "";
    if (parts.length >= 2) {
      // detect which one is the email
      const emailIdx = parts.findIndex(p => /\S+@\S+\.\S+/.test(p));
      if (emailIdx >= 0) {
        email = parts[emailIdx];
        name = parts.filter((_, i) => i !== emailIdx).join(" ");
      } else {
        name = parts[0];
        email = parts[1];
      }
    } else {
      // single token: maybe just email
      if (/\S+@\S+\.\S+/.test(line)) {
        email = line;
        name = line.split("@")[0];
      } else continue;
    }
    if (email && /\S+@\S+\.\S+/.test(email)) {
      out.push({ student_name: name || email.split("@")[0], email: email.toLowerCase() });
    }
  }
  // dedupe by email
  const seen = new Set<string>();
  return out.filter(s => {
    if (seen.has(s.email)) return false;
    seen.add(s.email);
    return true;
  });
}

interface RestrictedAccessSectionProps {
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  students: AuthorizedStudent[];
  onStudentsChange: (s: AuthorizedStudent[]) => void;
  newName: string;
  onNewNameChange: (v: string) => void;
  newEmail: string;
  onNewEmailChange: (v: string) => void;
  bulkText: string;
  onBulkTextChange: (v: string) => void;
}

function RestrictedAccessSection({
  enabled, onEnabledChange, students, onStudentsChange,
  newName, onNewNameChange, newEmail, onNewEmailChange,
  bulkText, onBulkTextChange,
}: RestrictedAccessSectionProps) {
  const addManual = () => {
    const name = newName.trim();
    const email = newEmail.trim().toLowerCase();
    if (!name || !email) { toast.error("Preencha nome e e-mail"); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { toast.error("E-mail inválido"); return; }
    if (students.some(s => s.email === email)) { toast.error("E-mail já cadastrado"); return; }
    onStudentsChange([...students, { student_name: name, email }]);
    onNewNameChange(""); onNewEmailChange("");
  };

  const addBulk = () => {
    const parsed = parseStudentList(bulkText);
    if (parsed.length === 0) { toast.error("Nenhum e-mail válido encontrado"); return; }
    const existing = new Set(students.map(s => s.email));
    const merged = [...students];
    let added = 0;
    for (const p of parsed) {
      if (!existing.has(p.email)) { merged.push(p); existing.add(p.email); added++; }
    }
    onStudentsChange(merged);
    onBulkTextChange("");
    toast.success(`${added} aluno(s) adicionado(s)`);
  };

  const removeStudent = (email: string) => {
    onStudentsChange(students.filter(s => s.email !== email));
  };

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-sm flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" />Acesso restrito por e-mail</p>
          <p className="text-xs text-muted-foreground">Apenas alunos cadastrados poderão entrar com seu PIN + e-mail.</p>
        </div>
        <Switch checked={enabled} onCheckedChange={onEnabledChange} />
      </div>

      {enabled && (
        <div className="space-y-3 pt-2 border-t border-border">
          <div className="space-y-2">
            <Label className="text-xs">Adicionar aluno individualmente</Label>
            <div className="flex gap-2">
              <Input placeholder="Nome do aluno" value={newName} onChange={e => onNewNameChange(e.target.value)} className="flex-1" />
              <Input placeholder="email@exemplo.com" type="email" value={newEmail} onChange={e => onNewEmailChange(e.target.value)} className="flex-1"
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addManual(); } }} />
              <Button type="button" variant="outline" size="sm" onClick={addManual}><Plus className="h-3.5 w-3.5" /></Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Ou cole uma lista (Nome, email — um por linha)</Label>
            <Textarea value={bulkText} onChange={e => onBulkTextChange(e.target.value)}
              placeholder={"Maria Silva, maria@exemplo.com\nJoão Souza, joao@exemplo.com"}
              className="min-h-[80px] text-xs font-mono" />
            <Button type="button" variant="outline" size="sm" onClick={addBulk} disabled={!bulkText.trim()}>Importar lista</Button>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium">Alunos autorizados ({students.length})</p>
            {students.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Nenhum aluno cadastrado ainda.</p>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-1 rounded border border-border p-2 bg-muted/30">
                {students.map(s => (
                  <div key={s.email} className="flex items-center justify-between gap-2 text-xs py-1">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{s.student_name}</p>
                      <p className="text-muted-foreground truncate">{s.email}</p>
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeStudent(s.email)}>
                      <X className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SalasVirtuais() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [isExamMode, setIsExamMode] = useState(false); // false = unitária, true = atividade simulada
  const [toolType, setToolType] = useState<ToolType>("simulator");
  const [activities, setActivities] = useState<ActivityItem[]>([{ category: "", simulatorSlug: "", caseId: "", instruction: "" }]);
  const [detailRoom, setDetailRoom] = useState<any>(null);
  const [editRoom, setEditRoom] = useState<any>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editExpiresAt, setEditExpiresAt] = useState("");
  const [editSimulatorSlug, setEditSimulatorSlug] = useState("");
  const [editCaseId, setEditCaseId] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editToolType, setEditToolType] = useState<ToolType>("simulator");
  const [challengeEditorIndex, setChallengeEditorIndex] = useState<number | null>(null);

  // Restricted access state (create dialog)
  const [restrictedAccess, setRestrictedAccess] = useState(false);
  const [authorizedStudents, setAuthorizedStudents] = useState<AuthorizedStudent[]>([]);
  const [bulkStudentText, setBulkStudentText] = useState("");
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentEmail, setNewStudentEmail] = useState("");

  // Restricted access state (edit dialog)
  const [editRestrictedAccess, setEditRestrictedAccess] = useState(false);
  const [editAuthorizedStudents, setEditAuthorizedStudents] = useState<AuthorizedStudent[]>([]);
  const [editBulkStudentText, setEditBulkStudentText] = useState("");
  const [editNewStudentName, setEditNewStudentName] = useState("");
  const [editNewStudentEmail, setEditNewStudentEmail] = useState("");

  const { canUseVirtualRooms, upgradeOpen, setUpgradeOpen, upgradeFeature, showUpgrade } = useFeatureGating();

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ["virtual-rooms", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("virtual_rooms")
        .select("*")
        .eq("created_by", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: roomActivities = [] } = useQuery({
    queryKey: ["room-activities", detailRoom?.id],
    enabled: !!detailRoom,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_activities")
        .select("*")
        .eq("room_id", detailRoom.id)
        .order("position");
      if (error) throw error;
      return data;
    },
  });

  const uniqueSlugs = useMemo(() => [...new Set(activities.map(a => a.simulatorSlug).filter(Boolean))], [activities]);
  const { data: allCases = [] } = useQuery({
    queryKey: ["simulator-cases-for-rooms", uniqueSlugs],
    enabled: uniqueSlugs.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("simulator_cases")
        .select("id, title, difficulty, simulator_slug")
        .in("simulator_slug", uniqueSlugs)
        .order("title");
      if (error) throw error;
      return data;
    },
  });

  const { data: participants = [] } = useQuery({
    queryKey: ["room-participants", detailRoom?.id],
    enabled: !!detailRoom,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_participants")
        .select("*")
        .eq("room_id", detailRoom.id)
        .order("joined_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ["room-submissions", detailRoom?.id],
    enabled: !!detailRoom,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_submissions")
        .select("*")
        .eq("room_id", detailRoom.id)
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: authorizedStudentsForDetail = [] } = useQuery({
    queryKey: ["room-authorized-emails", detailRoom?.id],
    enabled: !!detailRoom && !!detailRoom.restricted_access,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_authorized_emails" as any)
        .select("student_name, email")
        .eq("room_id", detailRoom.id)
        .order("student_name");
      if (error) throw error;
      return ((data as any[]) || []).map(d => ({ student_name: d.student_name, email: (d.email || "").toLowerCase() }));
    },
  });

  const createRoom = useMutation({
    mutationFn: async () => {
      const validActivities = activities.filter(a => a.simulatorSlug);
      if (validActivities.length === 0) throw new Error("Adicione pelo menos uma atividade");

      const pin = generatePin();
      const isLegacy = validActivities.length === 1;

      // For native cases, don't store in case_id (UUID FK). Store in description or custom field.
      const getDbCaseId = (caseId: string) => caseId && !caseId.startsWith("native:") ? caseId : null;
      const getNativeCaseIndex = (caseId: string) => caseId?.startsWith("native:") ? parseInt(caseId.replace("native:", "")) : null;

      if (restrictedAccess && authorizedStudents.length === 0) {
        throw new Error("Acesso restrito ativado: cadastre ao menos um aluno autorizado.");
      }

      const { data: roomData, error: roomError } = await supabase
        .from("virtual_rooms")
        .insert({
          pin,
          title,
          simulator_slug: isLegacy ? validActivities[0].simulatorSlug : null,
          case_id: isLegacy ? getDbCaseId(validActivities[0].caseId) : null,
          created_by: user!.id,
          expires_at: expiresAt || null,
          description: isLegacy ? validActivities[0].instruction || null : null,
          restricted_access: restrictedAccess,
        } as any)
        .select("id")
        .single();
      if (roomError) throw roomError;

      const activityRows = validActivities.map((a, i) => ({
        room_id: roomData.id,
        simulator_slug: a.simulatorSlug,
        case_id: getDbCaseId(a.caseId),
        position: i,
        custom_challenges: a.customChallenges
          ? { ...a.customChallenges, nativeCaseIndex: getNativeCaseIndex(a.caseId) }
          : getNativeCaseIndex(a.caseId) !== null
            ? { nativeCaseIndex: getNativeCaseIndex(a.caseId) }
            : null,
      }));

      const { error: actError } = await supabase
        .from("room_activities")
        .insert(activityRows);
      if (actError) throw actError;

      if (restrictedAccess && authorizedStudents.length > 0) {
        const rows = authorizedStudents.map(s => ({
          room_id: roomData.id,
          student_name: s.student_name,
          email: s.email.toLowerCase(),
        }));
        const { error: emailErr } = await supabase.from("room_authorized_emails" as any).insert(rows);
        if (emailErr) throw emailErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["virtual-rooms"] });
      toast.success("Sala criada com sucesso!");
      resetForm();
    },
    onError: (err: any) => toast.error(err.message || "Erro ao criar sala"),
  });

  const toggleRoom = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("virtual_rooms").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["virtual-rooms"] }),
  });

  const reactivateRoom = useMutation({
    mutationFn: async (room: any) => {
      const currentExpiration = room.expires_at ? new Date(room.expires_at) : null;
      const updateData: Record<string, any> = {
        is_active: true,
        reactivated_at: new Date().toISOString(),
      };

      if (!currentExpiration || currentExpiration < new Date()) {
        updateData.expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      }

      const { error } = await supabase.from("virtual_rooms").update(updateData).eq("id", room.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["virtual-rooms"] });
      toast.success("Sala reativada");
    },
    onError: (err: any) => toast.error(err.message || "Erro ao reativar sala"),
  });

  const deleteRoom = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("virtual_rooms").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["virtual-rooms"] });
      toast.success("Sala excluída");
    },
  });

  // Cases for the simulator currently selected in edit dialog
  const { data: editCases = [] } = useQuery({
    queryKey: ["edit-room-cases", editSimulatorSlug],
    enabled: !!editSimulatorSlug && editToolType === "simulator",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("simulator_cases")
        .select("id, title, difficulty, simulator_slug")
        .eq("simulator_slug", editSimulatorSlug)
        .order("title");
      if (error) throw error;
      return data;
    },
  });

  const updateRoom = useMutation({
    mutationFn: async () => {
      if (!editRoom) throw new Error("Sem sala");
      if (!editTitle.trim()) throw new Error("Título obrigatório");

      const isExam = !editRoom.simulator_slug;
      const updates: any = {
        title: editTitle,
        description: editDescription || null,
        expires_at: editExpiresAt || null,
        restricted_access: editRestrictedAccess,
      };

      if (editRestrictedAccess && editAuthorizedStudents.length === 0) {
        throw new Error("Acesso restrito ativado: cadastre ao menos um aluno autorizado.");
      }

      // Only allow simulator/case change for non-exam (single-activity) rooms
      if (!isExam) {
        if (!editSimulatorSlug) throw new Error("Selecione um simulador");
        updates.simulator_slug = editSimulatorSlug;
        updates.case_id = editCaseId && !editCaseId.startsWith("native:") ? editCaseId : null;
      }

      const { error } = await supabase
        .from("virtual_rooms")
        .update(updates)
        .eq("id", editRoom.id);
      if (error) throw error;

      // Update single-activity row if it exists (non-exam mode)
      if (!isExam) {
        const nativeIdx = editCaseId?.startsWith("native:")
          ? parseInt(editCaseId.replace("native:", ""))
          : null;
        const { data: existingActs } = await supabase
          .from("room_activities")
          .select("id")
          .eq("room_id", editRoom.id)
          .order("position");

        const payload = {
          simulator_slug: editSimulatorSlug,
          case_id: editCaseId && !editCaseId.startsWith("native:") ? editCaseId : null,
          custom_challenges: nativeIdx !== null ? { nativeCaseIndex: nativeIdx } : null,
        };

        if (existingActs && existingActs.length > 0) {
          await supabase.from("room_activities").update(payload).eq("id", existingActs[0].id);
        } else {
          await supabase.from("room_activities").insert({ ...payload, room_id: editRoom.id, position: 0 });
        }
      }

      // Sync authorized emails: delete all and re-insert (simple approach)
      await supabase.from("room_authorized_emails" as any).delete().eq("room_id", editRoom.id);
      if (editRestrictedAccess && editAuthorizedStudents.length > 0) {
        const rows = editAuthorizedStudents.map(s => ({
          room_id: editRoom.id,
          student_name: s.student_name,
          email: s.email.toLowerCase(),
        }));
        const { error: emailErr } = await supabase.from("room_authorized_emails" as any).insert(rows);
        if (emailErr) throw emailErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["virtual-rooms"] });
      toast.success("Sala atualizada");
      setEditRoom(null);
    },
    onError: (err: any) => toast.error(err.message || "Erro ao atualizar sala"),
  });

  const openEdit = async (room: any) => {
    setEditRoom(room);
    setEditTitle(room.title || "");
    setEditDescription(room.description || "");
    setEditExpiresAt(room.expires_at ? new Date(room.expires_at).toISOString().slice(0, 16) : "");
    setEditSimulatorSlug(room.simulator_slug || "");

    // Pre-select case: prefer room.case_id; if absent, look up native case index in activity row
    let preselectedCaseId = room.case_id || "";
    if (!preselectedCaseId && room.simulator_slug) {
      const { data: actRows } = await supabase
        .from("room_activities")
        .select("case_id, custom_challenges")
        .eq("room_id", room.id)
        .order("position")
        .limit(1);
      const act: any = actRows?.[0];
      if (act?.case_id) {
        preselectedCaseId = act.case_id;
      } else {
        const nativeIdx = act?.custom_challenges?.nativeCaseIndex;
        if (typeof nativeIdx === "number") preselectedCaseId = `native:${nativeIdx}`;
      }
    }
    setEditCaseId(preselectedCaseId);

    const slug = room.simulator_slug;
    if (slug) {
      const detected: ToolType = isGameSlug(slug)
        ? "game"
        : LAB_OPTIONS.some(l => l.slug === slug)
          ? "laboratory"
          : "simulator";
      setEditToolType(detected);
      setEditCategory(ALL_OPTIONS.find(o => o.slug === slug)?.category || "");
    } else {
      setEditToolType("simulator");
      setEditCategory("");
    }
    setEditRestrictedAccess(!!room.restricted_access);
    setEditBulkStudentText("");
    setEditNewStudentName("");
    setEditNewStudentEmail("");
    // Load authorized students
    const { data: emails } = await supabase
      .from("room_authorized_emails" as any)
      .select("student_name, email")
      .eq("room_id", room.id)
      .order("student_name");
    setEditAuthorizedStudents(((emails as any[]) || []).map(e => ({ student_name: e.student_name, email: e.email })));
  };

  const resetForm = () => {
    setCreateOpen(false);
    setTitle("");
    setActivities([{ category: "", simulatorSlug: "", caseId: "", instruction: "", customChallenges: null }]);
    setExpiresAt("");
    setIsExamMode(false);
    setToolType("simulator");
    setChallengeEditorIndex(null);
    setRestrictedAccess(false);
    setAuthorizedStudents([]);
    setBulkStudentText("");
    setNewStudentName("");
    setNewStudentEmail("");
  };

  const copyPin = (pin: string) => {
    navigator.clipboard.writeText(pin);
    toast.success(`PIN ${pin} copiado!`);
  };

  const addActivity = () => setActivities([...activities, { category: "", simulatorSlug: "", caseId: "", instruction: "", customChallenges: null }]);
  const removeActivity = (i: number) => {
    if (activities.length <= 1) return;
    setActivities(activities.filter((_, idx) => idx !== i));
  };
  const updateActivity = (i: number, field: keyof ActivityItem, value: string) => {
    const copy = [...activities];
    if (field === "category") {
      copy[i] = { ...copy[i], category: value, simulatorSlug: "", caseId: "", instruction: copy[i].instruction };
    } else if (field === "simulatorSlug") {
      copy[i] = { ...copy[i], simulatorSlug: value, caseId: "" };
    } else {
      copy[i] = { ...copy[i], [field]: value };
    }
    setActivities(copy);
  };
  const moveActivity = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= activities.length) return;
    const copy = [...activities];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    setActivities(copy);
  };

  const isLabTool = (slug: string) => LAB_OPTIONS.some(l => l.slug === slug);
  const isGameTool = (slug: string) => isGameSlug(slug);
  const activeOptions = toolType === "simulator" ? SIMULATOR_OPTIONS : toolType === "laboratory" ? LAB_OPTIONS : GAME_OPTIONS;
  const activeCategories = toolType === "simulator" ? SIMULATOR_CATEGORIES : toolType === "laboratory" ? LAB_CATEGORIES : GAME_CATEGORIES;

  const getCasesForSlug = (slug: string) => allCases.filter((c: any) => c.simulator_slug === slug);
  const getToolsForCategory = (cat: string) => activeOptions.filter(s => s.category === cat);

  const getToolLabel = (slug: string) =>
    ALL_OPTIONS.find(s => s.slug === slug)?.label || slug;

  const isRoomExam = (room: any) => !room.simulator_slug;

  const isRoomLab = (room: any) => {
    if (room.simulator_slug) return isLabTool(room.simulator_slug);
    return false; // for exam rooms, check activities later
  };

  // When switching modes, reset activities
  const handleModeChange = (exam: boolean) => {
    setIsExamMode(exam);
    setActivities([{ category: "", simulatorSlug: "", caseId: "", instruction: "", customChallenges: null }]);
  };

  const handleToolTypeChange = (type: ToolType) => {
    setToolType(type);
    setActivities([{ category: "", simulatorSlug: "", caseId: "", instruction: "", customChallenges: null }]);
  };

  if (!canUseVirtualRooms) {
    return (
      <div className="max-w-6xl mx-auto">
        <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} feature={upgradeFeature} />
        <div className="flex items-center gap-3 mb-8">
          <DoorOpen className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-bold">Salas Virtuais</h1>
        </div>
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">Salas Virtuais são um recurso exclusivo do plano <strong>Posologia Premium</strong>.</p>
            <Button onClick={() => showUpgrade("Salas virtuais ilimitadas são exclusivas do plano Premium")}>
              Assinar Premium
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} feature={upgradeFeature} />
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <DoorOpen className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-bold">Salas Virtuais</h1>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />Nova Sala
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : rooms.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhuma sala criada ainda. Clique em "Nova Sala" para começar.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room: any) => (
            <Card key={room.id} className="relative">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={room.is_active ? "default" : "secondary"}>{room.is_active ? "Ativa" : "Inativa"}</Badge>
                    {isRoomExam(room) && (
                      <Badge variant="outline" className="text-xs">
                        <ClipboardList className="h-3 w-3 mr-1" />Prova
                      </Badge>
                    )}
                    {room.restricted_access && (
                      <Badge variant="outline" className="text-xs">
                        <Lock className="h-3 w-3 mr-1" />Restrita
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(room)} title="Editar sala">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {room.is_active ? (
                      <Button variant="ghost" size="icon" onClick={() => toggleRoom.mutate({ id: room.id, is_active: false })} title="Desativar sala">
                        <EyeOff className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button variant="ghost" size="icon" onClick={() => reactivateRoom.mutate(room)} title="Reativar sala">
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => deleteRoom.mutate(room.id)} title="Excluir">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <CardTitle className="text-lg">{room.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">PIN:</span>
                  <code className="text-2xl font-mono font-bold tracking-widest text-primary">{room.pin}</code>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyPin(room.pin)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                {room.simulator_slug ? (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    {isLabTool(room.simulator_slug) ? (
                      <><FlaskConical className="h-3 w-3" /> Lab: {getToolLabel(room.simulator_slug)}</>
                    ) : isGameTool(room.simulator_slug) ? (
                      <><Gamepad2 className="h-3 w-3" /> Jogo: {getToolLabel(room.simulator_slug)}</>
                    ) : (
                      <>Simulador: {getToolLabel(room.simulator_slug)}</>
                    )}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Prova com múltiplas atividades
                  </p>
                )}
                {room.expires_at && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Expira: {new Date(room.expires_at).toLocaleDateString("pt-BR")}
                  </p>
                )}
                <Button variant="outline" size="sm" className="w-full" onClick={() => setDetailRoom(room)}>
                  <Users className="h-4 w-4 mr-2" />Ver Participantes
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Room Dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => { if (!open) resetForm(); else setCreateOpen(true); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Criar Nova Sala Virtual</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título da Sala</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Turma 2025.1 – Farmácia Clínica" />
            </div>

            <Separator />

            {/* Tool Type Selector */}
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <p className="font-medium text-sm">Tipo de Ferramenta</p>
                <p className="text-xs text-muted-foreground">
                  {toolType === "simulator"
                    ? "Simuladores clínicos com casos"
                    : toolType === "laboratory"
                      ? "Laboratórios virtuais de pesquisa"
                      : "Jogos clínicos interativos"}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <Button
                  size="sm"
                  variant={toolType === "simulator" ? "default" : "outline"}
                  onClick={() => handleToolTypeChange("simulator")}
                  className="gap-1.5 h-8"
                >
                  <Cpu className="h-3.5 w-3.5" />
                  Simuladores
                </Button>
                <Button
                  size="sm"
                  variant={toolType === "laboratory" ? "default" : "outline"}
                  onClick={() => handleToolTypeChange("laboratory")}
                  className="gap-1.5 h-8"
                >
                  <FlaskConical className="h-3.5 w-3.5" />
                  Laboratórios
                </Button>
                <Button
                  size="sm"
                  variant={toolType === "game" ? "default" : "outline"}
                  onClick={() => handleToolTypeChange("game")}
                  className="gap-1.5 h-8"
                >
                  <Gamepad2 className="h-3.5 w-3.5" />
                  Jogos
                </Button>
              </div>
            </div>

            {/* Mode Toggle */}
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <p className="font-medium text-sm">Tipo de Atividade</p>
                <p className="text-xs text-muted-foreground">
                  {(() => {
                    const plural = toolType === "laboratory" ? "laboratórios" : toolType === "game" ? "jogos" : "simuladores";
                    const singular = toolType === "laboratory" ? "um laboratório" : toolType === "game" ? "um jogo clínico" : "um simulador e um caso clínico";
                    return isExamMode
                      ? `Atividade Simulada — múltiplos ${plural} com enunciados`
                      : `Atividade Unitária — ${singular}`;
                  })()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium ${!isExamMode ? "text-primary" : "text-muted-foreground"}`}>Unitária</span>
                <Switch checked={isExamMode} onCheckedChange={handleModeChange} />
                <span className={`text-xs font-medium ${isExamMode ? "text-primary" : "text-muted-foreground"}`}>Simulada</span>
              </div>
            </div>

            {/* Activities */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold">
                  {isExamMode ? "Atividades da Prova" : (toolType === "laboratory" ? "Laboratório" : toolType === "game" ? "Jogo Clínico" : "Simulador")}
                </Label>
                {isExamMode && (
                  <Button variant="outline" size="sm" onClick={addActivity}>
                    <Plus className="h-4 w-4 mr-1" />Adicionar Atividade
                  </Button>
                )}
              </div>
              <div className="space-y-3">
                {activities.map((act, i) => {
                  const toolsInCategory = getToolsForCategory(act.category);
                  const casesForSlug = getCasesForSlug(act.simulatorSlug);
                  return (
                    <Card key={i} className="border-dashed">
                      <CardContent className="pt-4 pb-3">
                        {isExamMode && (
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-muted-foreground">Atividade {i + 1}</span>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveActivity(i, -1)} disabled={i === 0}>
                                <ArrowUp className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveActivity(i, 1)} disabled={i === activities.length - 1}>
                                <ArrowDown className="h-3 w-3" />
                              </Button>
                              {activities.length > 1 && (
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeActivity(i)}>
                                  <X className="h-3 w-3 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="space-y-3">
                          {/* Step 1: Category */}
                          <div>
                            <Label className="text-xs">Categoria</Label>
                            <Select value={act.category} onValueChange={v => updateActivity(i, "category", v)}>
                              <SelectTrigger><SelectValue placeholder="Selecione a categoria" /></SelectTrigger>
                              <SelectContent>
                                {activeCategories.map(cat => (
                                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Step 2: Tool (only after category) */}
                          {act.category && (
                            <div>
                              <Label className="text-xs">{toolType === "laboratory" ? "Laboratório" : toolType === "game" ? "Jogo Clínico" : "Simulador"}</Label>
                              <Select value={act.simulatorSlug} onValueChange={v => updateActivity(i, "simulatorSlug", v)}>
                                <SelectTrigger><SelectValue placeholder={toolType === "laboratory" ? "Selecione o laboratório" : toolType === "game" ? "Selecione o jogo" : "Selecione o simulador"} /></SelectTrigger>
                                <SelectContent>
                                  {toolsInCategory.map(s => (
                                    <SelectItem key={s.slug} value={s.slug}>{s.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          {/* Step 3: Case (only for simulators, not labs) */}
                          {act.simulatorSlug && toolType === "simulator" && (() => {
                            const nativeCasesForSlug = getNativeCases(act.simulatorSlug);
                            const hasAnyCases = casesForSlug.length > 0 || nativeCasesForSlug.length > 0;
                            return (
                              <div>
                                <Label className="text-xs">Caso Clínico</Label>
                                {hasAnyCases ? (
                                  <Select value={act.caseId} onValueChange={v => updateActivity(i, "caseId", v)}>
                                    <SelectTrigger><SelectValue placeholder="Selecione o caso clínico (opcional)" /></SelectTrigger>
                                    <SelectContent>
                                      {nativeCasesForSlug.length > 0 && (
                                        <>
                                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Casos Nativos</div>
                                          {nativeCasesForSlug.map(nc => (
                                            <SelectItem key={`native:${nc.index}`} value={`native:${nc.index}`}>
                                              📋 {nc.title} ({nc.difficulty})
                                            </SelectItem>
                                          ))}
                                        </>
                                      )}
                                      {casesForSlug.length > 0 && (
                                        <>
                                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Casos Criados / IA</div>
                                          {casesForSlug.map((c: any) => (
                                            <SelectItem key={c.id} value={c.id}>🤖 {c.title} ({c.difficulty})</SelectItem>
                                          ))}
                                        </>
                                      )}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <p className="text-xs text-muted-foreground italic py-2">Nenhum caso clínico disponível para este simulador.</p>
                                )}
                              </div>
                            );
                          })()}

                          {/* Step 4: Instruction (only in exam mode, after simulator selected) */}
                          {isExamMode && act.simulatorSlug && (
                            <div>
                              <Label className="text-xs">Enunciado / Comando para o aluno</Label>
                              <Textarea
                                value={act.instruction}
                                onChange={e => updateActivity(i, "instruction", e.target.value)}
                                placeholder="Ex: Analise o caso clínico a seguir e identifique os PRMs..."
                                className="min-h-[60px] text-sm"
                              />
                            </div>
                          )}

                          {/* Challenge customization - for simulators only */}
                          {act.simulatorSlug && toolType === "simulator" && (
                            <div className="flex items-center gap-2 pt-1">
                              <Button
                                variant={act.customChallenges ? "default" : "outline"}
                                size="sm"
                                className="gap-1.5 text-xs"
                                onClick={() => setChallengeEditorIndex(i)}
                              >
                                {act.customChallenges ? (
                                  <><Edit3 className="h-3 w-3" />Editar Desafio Customizado ({act.customChallenges.challenges?.length || 0} questões)</>
                                ) : (
                                  <><Target className="h-3 w-3" />Customizar Desafio</>
                                )}
                              </Button>
                              {act.customChallenges && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs text-destructive"
                                  onClick={() => {
                                    const copy = [...activities];
                                    copy[i] = { ...copy[i], customChallenges: null };
                                    setActivities(copy);
                                  }}
                                >
                                  <X className="h-3 w-3 mr-1" />Remover
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            <Separator />

            <div>
              <Label>Data de Expiração (opcional)</Label>
              <Input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
            </div>

            <RestrictedAccessSection
              enabled={restrictedAccess}
              onEnabledChange={setRestrictedAccess}
              students={authorizedStudents}
              onStudentsChange={setAuthorizedStudents}
              newName={newStudentName}
              onNewNameChange={setNewStudentName}
              newEmail={newStudentEmail}
              onNewEmailChange={setNewStudentEmail}
              bulkText={bulkStudentText}
              onBulkTextChange={setBulkStudentText}
            />
          </div>
          <DialogFooter>
            <Button
              onClick={() => createRoom.mutate()}
              disabled={!title || activities.every(a => !a.simulatorSlug) || createRoom.isPending}
            >
              {createRoom.isPending ? "Criando..." : "Criar Sala"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Room Detail Dialog */}
      <Dialog open={!!detailRoom} onOpenChange={() => setDetailRoom(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{detailRoom?.title} – Detalhes</DialogTitle></DialogHeader>

          {detailRoom && isRoomExam(detailRoom) && roomActivities.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold mb-2">Atividades da Prova</h3>
              <div className="space-y-1">
                {roomActivities.map((act: any, i: number) => (
                  <div key={act.id} className="flex items-center gap-2 text-sm">
                    <Badge variant="outline" className="text-xs">{i + 1}</Badge>
                    <span>{getToolLabel(act.simulator_slug)}</span>
                  </div>
                ))}
              </div>
              <Separator className="mt-3" />
            </div>
          )}

          {(() => {
            const isRestricted = !!detailRoom?.restricted_access;
            // Build set of joined emails (lowercased) — both leader and group members emails
            const joinedEmails = new Set<string>();
            participants.forEach((p: any) => {
              if (p.participant_email) joinedEmails.add(String(p.participant_email).toLowerCase());
              if (Array.isArray(p.group_members)) {
                p.group_members.forEach((m: any) => {
                  const e = typeof m === "string" ? null : m?.email;
                  if (e) joinedEmails.add(String(e).toLowerCase());
                });
              }
            });
            const pendingAuthorized = isRestricted
              ? authorizedStudentsForDetail.filter((a: any) => !joinedEmails.has(a.email))
              : [];

            return (
              <>
                {isRestricted && (
                  <div className="mb-3 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/40">Ingressou</Badge> entrou na sala</span>
                    <span className="flex items-center gap-1.5"><Badge variant="outline" className="border-primary/40 text-primary"><Lock className="h-2.5 w-2.5 mr-1" />Cadastrado</Badge> autorizado por e-mail</span>
                    <span className="flex items-center gap-1.5"><Badge variant="outline" className="border-amber-500/40 text-amber-400">Aguardando</Badge> ainda não entrou</span>
                  </div>
                )}

                <h3 className="text-sm font-semibold mb-2">Participantes</h3>
                {participants.length === 0 && pendingAuthorized.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-4">Nenhum participante entrou na sala ainda.</p>
                ) : (
                  <div className="space-y-4">
                    {participants.length === 0 && (
                      <p className="text-muted-foreground text-sm">Ninguém ingressou ainda.</p>
                    )}
                    {participants.map((p: any) => {
                      const pSubmissions = submissions.filter((s: any) => s.participant_id === p.id);
                      const avgScore = pSubmissions.length > 0 ? Math.round(pSubmissions.reduce((a: number, s: any) => a + s.score, 0) / pSubmissions.length) : null;
                      const totalTime = pSubmissions.reduce((a: number, s: any) => a + (s.time_spent_seconds || 0), 0);
                      const pEmail = (p.participant_email || "").toLowerCase();
                      const isAuthorized = isRestricted && pEmail && authorizedStudentsForDetail.some((a: any) => a.email === pEmail);
                      return (
                        <Card key={p.id}>
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between mb-2 gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="font-medium">{p.participant_name}</p>
                                  <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/40 text-[10px] px-1.5 py-0">Ingressou</Badge>
                                  {isAuthorized && (
                                    <Badge variant="outline" className="border-primary/40 text-primary text-[10px] px-1.5 py-0">
                                      <Lock className="h-2.5 w-2.5 mr-1" />Cadastrado
                                    </Badge>
                                  )}
                                </div>
                                {p.participant_email && (
                                  <p className="text-xs text-muted-foreground truncate">{p.participant_email}</p>
                                )}
                                {p.is_group && (
                                  <p className="text-xs text-muted-foreground">
                                    Grupo: {(p.group_members as any[] || []).map((m: any) => typeof m === "string" ? m : (m?.name || m?.email)).join(", ")}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground">Entrou: {new Date(p.joined_at).toLocaleString("pt-BR")}</p>
                              </div>
                              <div className="text-right shrink-0">
                                {avgScore !== null ? (
                                  <Badge variant={avgScore >= 80 ? "secondary" : avgScore >= 50 ? "default" : "destructive"} className={avgScore >= 80 ? "bg-green-100 text-green-800" : ""}>
                                    {avgScore}% média
                                  </Badge>
                                ) : (
                                  <Badge variant="outline">Sem submissões</Badge>
                                )}
                              </div>
                            </div>
                            {pSubmissions.length > 0 && (
                              <>
                                <Separator className="my-2" />
                                <div className="space-y-1">
                                  {pSubmissions.map((s: any) => {
                                    const activity = roomActivities.find((a: any) => a.id === s.activity_id);
                                    const actLabel = activity
                                      ? `${getToolLabel(activity.simulator_slug)} (Ativ. ${activity.position + 1})`
                                      : `Etapa ${s.step_index + 1}`;
                                    return (
                                      <div key={s.id} className="flex items-center justify-between text-sm">
                                        <span>{actLabel}</span>
                                        <div className="flex items-center gap-3">
                                          <span className="text-muted-foreground">{Math.floor(s.time_spent_seconds / 60)}m{s.time_spent_seconds % 60}s</span>
                                          <Badge variant={s.score >= 80 ? "secondary" : "destructive"} className={s.score >= 80 ? "bg-green-100 text-green-800" : ""}>
                                            {s.score}%
                                          </Badge>
                                        </div>
                                      </div>
                                    );
                                  })}
                                  <p className="text-xs text-muted-foreground mt-1">Tempo total: {Math.floor(totalTime / 60)}m{totalTime % 60}s</p>
                                </div>
                              </>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}

                    {pendingAuthorized.length > 0 && (
                      <div>
                        <Separator className="my-2" />
                        <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Cadastrados aguardando ingresso ({pendingAuthorized.length})</h4>
                        <div className="space-y-1.5">
                          {pendingAuthorized.map((s: any) => (
                            <div key={s.email} className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-muted/20 px-3 py-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="text-sm font-medium truncate">{s.student_name}</p>
                                  <Badge variant="outline" className="border-primary/40 text-primary text-[10px] px-1.5 py-0">
                                    <Lock className="h-2.5 w-2.5 mr-1" />Cadastrado
                                  </Badge>
                                  <Badge variant="outline" className="border-amber-500/40 text-amber-400 text-[10px] px-1.5 py-0">Aguardando</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Edit Room Dialog */}
      <Dialog open={!!editRoom} onOpenChange={(open) => { if (!open) setEditRoom(null); }}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Sala Virtual</DialogTitle></DialogHeader>
          {editRoom && (() => {
            const isExam = !editRoom.simulator_slug;
            const editActiveOptions = editToolType === "simulator" ? SIMULATOR_OPTIONS : editToolType === "laboratory" ? LAB_OPTIONS : GAME_OPTIONS;
            const editActiveCategories = editToolType === "simulator" ? SIMULATOR_CATEGORIES : editToolType === "laboratory" ? LAB_CATEGORIES : GAME_CATEGORIES;
            const editToolsInCategory = editActiveOptions.filter(s => s.category === editCategory);
            const editNativeCases = editSimulatorSlug ? getNativeCases(editSimulatorSlug) : [];
            return (
              <div className="space-y-4">
                <div>
                  <Label>Título</Label>
                  <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Título da sala" />
                </div>
                <div>
                  <Label>Descrição / Enunciado (opcional)</Label>
                  <Textarea
                    value={editDescription}
                    onChange={e => setEditDescription(e.target.value)}
                    placeholder="Instruções para os alunos..."
                    className="min-h-[60px] text-sm"
                  />
                </div>

                {!isExam ? (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between rounded-lg border border-border p-3">
                      <p className="text-sm font-medium">Tipo</p>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant={editToolType === "simulator" ? "default" : "outline"}
                          onClick={() => { setEditToolType("simulator"); setEditCategory(""); setEditSimulatorSlug(""); setEditCaseId(""); }}
                          className="gap-1.5 h-8"
                        >
                          <Cpu className="h-3.5 w-3.5" />Simuladores
                        </Button>
                        <Button
                          size="sm"
                          variant={editToolType === "laboratory" ? "default" : "outline"}
                          onClick={() => { setEditToolType("laboratory"); setEditCategory(""); setEditSimulatorSlug(""); setEditCaseId(""); }}
                          className="gap-1.5 h-8"
                        >
                          <FlaskConical className="h-3.5 w-3.5" />Laboratórios
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs">Categoria</Label>
                      <Select value={editCategory} onValueChange={v => { setEditCategory(v); setEditSimulatorSlug(""); setEditCaseId(""); }}>
                        <SelectTrigger><SelectValue placeholder="Selecione a categoria" /></SelectTrigger>
                        <SelectContent>
                          {editActiveCategories.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {editCategory && (
                      <div>
                        <Label className="text-xs">{editToolType === "laboratory" ? "Laboratório" : "Simulador"}</Label>
                        <Select value={editSimulatorSlug} onValueChange={v => { setEditSimulatorSlug(v); setEditCaseId(""); }}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            {editToolsInCategory.map(s => (
                              <SelectItem key={s.slug} value={s.slug}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {editSimulatorSlug && editToolType === "simulator" && (editCases.length > 0 || editNativeCases.length > 0) && (
                      <div>
                        <Label className="text-xs">Caso Clínico</Label>
                        <Select value={editCaseId} onValueChange={v => setEditCaseId(v)}>
                          <SelectTrigger><SelectValue placeholder="Selecione o caso (opcional)" /></SelectTrigger>
                          <SelectContent>
                            {editNativeCases.length > 0 && (
                              <>
                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Casos Nativos</div>
                                {editNativeCases.map(nc => (
                                  <SelectItem key={`native:${nc.index}`} value={`native:${nc.index}`}>
                                    📋 {nc.title} ({nc.difficulty})
                                  </SelectItem>
                                ))}
                              </>
                            )}
                            {editCases.length > 0 && (
                              <>
                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Casos Criados / IA</div>
                                {editCases.map((c: any) => (
                                  <SelectItem key={c.id} value={c.id}>🤖 {c.title} ({c.difficulty})</SelectItem>
                                ))}
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
                    Esta é uma sala de <strong>Atividade Simulada</strong> com múltiplas atividades. Para alterar simuladores e casos, edite as atividades individualmente (em breve) ou recrie a sala.
                  </div>
                )}

                <Separator />
                <div>
                  <Label>Data de Expiração (opcional)</Label>
                  <Input type="datetime-local" value={editExpiresAt} onChange={e => setEditExpiresAt(e.target.value)} />
                </div>

                <RestrictedAccessSection
                  enabled={editRestrictedAccess}
                  onEnabledChange={setEditRestrictedAccess}
                  students={editAuthorizedStudents}
                  onStudentsChange={setEditAuthorizedStudents}
                  newName={editNewStudentName}
                  onNewNameChange={setEditNewStudentName}
                  newEmail={editNewStudentEmail}
                  onNewEmailChange={setEditNewStudentEmail}
                  bulkText={editBulkStudentText}
                  onBulkTextChange={setEditBulkStudentText}
                />
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRoom(null)}>Cancelar</Button>
            <Button onClick={() => updateRoom.mutate()} disabled={updateRoom.isPending || !editTitle.trim()}>
              {updateRoom.isPending ? "Salvando..." : "Salvar alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Challenge Editor Dialog */}
      {challengeEditorIndex !== null && (
        <ChallengeEditor
          open={challengeEditorIndex !== null}
          onOpenChange={(open) => { if (!open) setChallengeEditorIndex(null); }}
          initialChallenges={activities[challengeEditorIndex]?.customChallenges || null}
          simulatorLabel={getToolLabel(activities[challengeEditorIndex]?.simulatorSlug || "")}
          onSave={(challengeSet) => {
            const copy = [...activities];
            copy[challengeEditorIndex] = { ...copy[challengeEditorIndex], customChallenges: challengeSet };
            setActivities(copy);
            setChallengeEditorIndex(null);
          }}
        />
      )}
    </div>
  );
}