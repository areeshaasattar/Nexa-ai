/**
 * Central cost-protection and abuse limits for Nexa AI.
 * All numeric limits live here; update this file to tune behavior.
 */

export const LIMITS = {
  chat: {
    /** Per-user sliding window to prevent short bursts against /api/chat (kept at existing 15/min). */
    perMinute: 15,
    /** Per-user daily cap for /api/chat to bound Mistral spend. */
    perDay: 300,
  },
  createCall: {
    /** Per-user hourly cap on Stream call creation/join provisioning. */
    perHour: 15,
    /** Per-user daily cap on Stream call creation/join provisioning. */
    perDay: 40,
  },
  getToken: {
    /** Per-user hourly cap on Stream call token issuance. */
    perHour: 60,
  },
  retrySummary: {
    /** Per-user hourly cap on manual summary retry ATTEMPTS (provider-busy retries allowed, loosely capped). */
    perHourPerUser: 15,
    /** Per-meeting daily cap on manual summary retries that are not provider-busy outcomes. */
    perDayPerMeeting: 3,
  },
  feedback: {
    /** Per-user hourly cap on feedback submissions. */
    createPerHour: 5,
  },
  quickStart: {
    /** Per-user hourly cap on one-click template meeting creation. */
    perHour: 10,
  },
  logVoiceInteraction: {
    /** Per-user hourly cap on voice interaction metric writes. */
    perHour: 120,
  },
  email: {
    /** Per-user/email cooldown for verification resend (seconds). */
    resendVerificationWindowSeconds: 60,
    /** Per-user/email daily cap for verification resend attempts. */
    resendVerificationPerDay: 10,
    /** Global Brevo send budget per UTC day across the whole app (margin under 300/day free cap). */
    globalPerDay: 250,
  },
  quotas: {
    /** Maximum agents a user may own. */
    maxAgentsPerUser: 25,
    /** Maximum meetings a user may own. */
    maxMeetingsPerUser: 200,
  },
  textCaps: {
    /** Maximum agent name length for create/update input. */
    agentName: 80,
    /** Maximum agent instruction length for create/update input. */
    agentInstruction: 4000,
    /** Maximum meeting name length for create/update input. */
    meetingName: 120,
    /** Maximum meeting instructions length for create/update input. */
    meetingInstructions: 2000,
    /** Existing feedback message bounds kept as-is. */
    feedbackMessageMin: 5,
    feedbackMessageMax: 1000,
  },
  mistral: {
    /** Max completion tokens for /api/chat (voice replies are 1-3 short spoken sentences). */
    chatMaxTokens: 250,
  },
  stream: {
    /** Call duration cap in minutes when supported by the installed Stream SDK. */
    callMaxDurationMinutes: 60,
  },
} as const;

export type Limits = typeof LIMITS;