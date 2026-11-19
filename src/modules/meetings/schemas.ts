import { z } from "zod";
import { LIMITS } from "@/lib/limits";

const meetingInstructionsSchema = z
  .string()
  .max(
    LIMITS.textCaps.meetingInstructions,
    `Instructions must be ${LIMITS.textCaps.meetingInstructions} characters or fewer`,
  )
  .optional();

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export const scheduledAtSchema = z.preprocess(
  (value) => (value === "" || value === undefined ? null : value),
  z
    .union([z.null(), z.coerce.date()])
    .refine(
      (value) => {
        if (value == null) return true;
        const now = Date.now();
        if (value.getTime() > now + ONE_YEAR_MS) return false;
        return true;
      },
      { message: "scheduledAt must be at most 1 year ahead" },
    ),
)
  .optional()
  .nullable();

export function assertScheduledAtNotPast(date: Date | null | undefined, now: Date = new Date()): void {
  if (!date) return;
  const FIVE_MINUTES_MS = 5 * 60 * 1000;
  if (date.getTime() < now.getTime() - FIVE_MINUTES_MS) {
    throw new Error("scheduledAt may not be more than 5 minutes in the past");
  }
}

export const meetingsInsertSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Name is required")
      .max(LIMITS.textCaps.meetingName, `Name must be ${LIMITS.textCaps.meetingName} characters or fewer`),
    agentId: z.string().min(1, "Agent is required"),
    instructions: meetingInstructionsSchema,
    scheduledAt: scheduledAtSchema,
  })
  .strict();

export const meetingsUpdateSchema = z
  .object({
    id: z.string().min(1),
    name: z
      .string()
      .trim()
      .min(1, "Name is required")
      .max(LIMITS.textCaps.meetingName, `Name must be ${LIMITS.textCaps.meetingName} characters or fewer`)
      .optional(),
    agentId: z.string().min(1, "Agent is required").optional(),
    instructions: meetingInstructionsSchema,
    scheduledAt: scheduledAtSchema,
  })
  .strict();