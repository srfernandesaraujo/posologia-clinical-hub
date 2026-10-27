import { supabase } from "@/integrations/supabase/client";
import type { GroupMemberView, GroupRole } from "@/components/simulators/GroupRoleBanner";

// Contexto de grupo gravado em sessionStorage("virtualRoom").group por SalaVirtualAluno.
export interface GroupContext {
  mode: "leader" | "collective";
  memberId: string;
  memberName: string;
  role: GroupRole;
  leaderId: string | null;
  leaderName: string | null;
  members: GroupMemberView[];
}

export interface GroupSyncResponse {
  leaderId: string | null;
  leaderName: string | null;
  leaderStale: boolean;
  members: GroupMemberView[];
  state: any | null;
  stateUpdatedAt: string | null;
}

export async function groupSync(p: { participantId: string; activityId: string; memberId: string; memberName?: string }) {
  const { data, error } = await supabase.functions.invoke("room-access", {
    body: { action: "group-sync", participant_id: p.participantId, activity_id: p.activityId, member_id: p.memberId, member_name: p.memberName },
  });
  if (error || !data) return null;
  return data as GroupSyncResponse;
}

export async function groupPush(p: { participantId: string; activityId: string; memberId: string; state: Record<string, unknown> }) {
  const { error } = await supabase.functions.invoke("room-access", {
    body: { action: "group-push", participant_id: p.participantId, activity_id: p.activityId, member_id: p.memberId, state: p.state },
  });
  return !error;
}

export async function groupClaim(p: { participantId: string; memberId: string; memberName?: string }) {
  const { data } = await supabase.functions.invoke("room-access", {
    body: { action: "group-claim", participant_id: p.participantId, member_id: p.memberId, member_name: p.memberName },
  });
  return data as ({ claimed: boolean } & Partial<GroupSyncResponse>) | null;
}

export async function groupPass(p: { participantId: string; memberId: string; toMemberId: string }) {
  const { data } = await supabase.functions.invoke("room-access", {
    body: { action: "group-pass", participant_id: p.participantId, member_id: p.memberId, to_member_id: p.toMemberId },
  });
  return data as Partial<GroupSyncResponse> | null;
}
