import { z } from "zod";
import { meetingStatus } from "@/db/schema";
import { LIMITS } from "@/lib/limits";

const meetingInstructionsSchema = z
  .string()
  .max(
    LIMITS.textCaps.meetingInstructions,
    `Instructions must be ${LIMITS.textCaps.meetingInstructions} characters or fewer`,
  )
  .optional();

export const meetingsInsertSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(LIMITS.textCaps.meetingName, `Name must be ${LIMITS.textCaps.meetingName} characters or fewer`),
  agentId: z.string().min(1, "Agent is required"),
  instructions: meetingInstructionsSchema,
  status: z.enum(meetingStatus).default("scheduled"),
  startedAt: z.coerce.date().optional(),
  endedAt: z.coerce.date().optional(),
  transcriptUrl: z.string().url().optional().or(z.literal("")),
  summary: z.string().optional(),
  recordingUrl: z.string().url().optional().or(z.literal("")),
});

export const meetingsUpdateSchema = meetingsInsertSchema.partial().extend({
  id: z.string().min(1),
});
