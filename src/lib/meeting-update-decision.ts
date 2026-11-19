export type StoredMeeting = {
  id: string;
  status: string;
  agentId: string;
  scheduledAt: Date | null;
  name: string;
  instructions: string | null;
};

export type MeetingUpdateInput = {
  name?: string;
  agentId?: string;
  instructions?: string;
  scheduledAt?: Date | null;
};

export type UpdateDecision =
  | { kind: "noop" }
  | { kind: "updates"; data: Record<string, unknown>; statusGuarded: boolean }
  | { kind: "error"; code: "BAD_REQUEST"; message: string };

export function evaluateMeetingUpdate(
  stored: StoredMeeting,
  input: MeetingUpdateInput,
): UpdateDecision {
  const data: Record<string, unknown> = {};

  if (input.name !== undefined && input.name !== stored.name) data.name = input.name;
  if (input.instructions !== undefined && input.instructions !== stored.instructions) data.instructions = input.instructions;

  const agentIdChanged =
    input.agentId !== undefined && input.agentId !== stored.agentId;
  const scheduledAtChanged =
    input.scheduledAt !== undefined &&
    (input.scheduledAt?.getTime() ?? null) !== (stored.scheduledAt?.getTime() ?? null);

  const statusGuarded = agentIdChanged || scheduledAtChanged;

  if (statusGuarded && stored.status !== "scheduled") {
    return { kind: "error", code: "BAD_REQUEST", message: "Meeting can no longer be rescheduled" };
  }

  if (agentIdChanged) data.agentId = input.agentId;
  if (scheduledAtChanged) data.scheduledAt = input.scheduledAt;

  if (Object.keys(data).length === 0) return { kind: "noop" };
  return { kind: "updates", data, statusGuarded };
}