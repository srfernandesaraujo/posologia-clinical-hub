// Casa alunos cadastrados numa turma com as linhas de room_participants de suas salas,
// cobrindo tanto ingresso solo quanto ingresso em grupo (onde o aluno pode ser o líder —
// participant_email — ou aparecer apenas dentro de group_members). Usado para consolidar,
// por aluno, todas as notas tiradas independentemente do grupo em que ele estava.

export function normalizeStudentName(s: string) {
  return (s || "").trim().toLowerCase().normalize("NFD").replace(new RegExp("[\\u0300-\\u036f]", "g"), "");
}

export interface StudentLike {
  full_name: string;
  email: string;
}

export interface ParticipantMatch {
  participantId: string;
  roomId: string;
  isGroup: boolean;
  groupLabel: string | null;
}

/** Mapa email do aluno (lowercase) -> participações (linhas de room_participants) que lhe pertencem. */
export function matchStudentsToParticipants(students: StudentLike[], participants: any[]): Map<string, ParticipantMatch[]> {
  const byEmail = new Map<string, StudentLike>();
  const byName = new Map<string, StudentLike>();
  students.forEach((s) => {
    if (s.email) byEmail.set(s.email.toLowerCase(), s);
    if (s.full_name) byName.set(normalizeStudentName(s.full_name), s);
  });

  const resolve = (name?: string | null, email?: string | null): StudentLike | null => {
    const e = (email || "").toLowerCase();
    if (e && byEmail.has(e)) return byEmail.get(e)!;
    if (name) {
      const match = byName.get(normalizeStudentName(name));
      if (match) return match;
    }
    return null;
  };

  const result = new Map<string, ParticipantMatch[]>();
  const push = (student: StudentLike, match: ParticipantMatch) => {
    const key = student.email.toLowerCase();
    const arr = result.get(key) || [];
    arr.push(match);
    result.set(key, arr);
  };

  participants.forEach((p: any) => {
    if (p.is_group) {
      const leader = resolve(p.participant_name, p.participant_email);
      if (leader) push(leader, { participantId: p.id, roomId: p.room_id, isGroup: true, groupLabel: p.participant_name });
      (p.group_members as any[] || []).forEach((m: any) => {
        const name = typeof m === "string" ? m : m?.name;
        const email = typeof m === "string" ? null : m?.email;
        const member = resolve(name, email);
        if (member) push(member, { participantId: p.id, roomId: p.room_id, isGroup: true, groupLabel: p.participant_name });
      });
    } else {
      const student = resolve(p.participant_name, p.participant_email);
      if (student) push(student, { participantId: p.id, roomId: p.room_id, isGroup: false, groupLabel: null });
    }
  });

  return result;
}
