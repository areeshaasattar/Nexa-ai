export class AgentNotOwnedError extends Error {
  constructor() {
    super("NOT_FOUND");
    this.name = "AgentNotOwnedError";
  }
}

/**
 * Pure ownership check: throws AgentNotOwnedError when the agent does not
 * belong to the user (or does not exist). `lookup` returns true only when
 * the agent is owned by the user.
 */
export async function assertAgentOwned(
  userId: string,
  agentId: string,
  lookup: (userId: string, agentId: string) => Promise<boolean>,
): Promise<void> {
  const ok = await lookup(userId, agentId);
  if (!ok) throw new AgentNotOwnedError();
}