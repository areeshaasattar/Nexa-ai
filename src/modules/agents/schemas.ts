import { z } from "zod";
import { LIMITS } from "@/lib/limits";

export const agentNameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(LIMITS.textCaps.agentName, `Name must be ${LIMITS.textCaps.agentName} characters or fewer`);

export const agentInstructionSchema = z
  .string()
  .trim()
  .min(1, "Instruction is required")
  .max(
    LIMITS.textCaps.agentInstruction,
    `Instruction must be ${LIMITS.textCaps.agentInstruction} characters or fewer`,
  );

export const agentsInsertSchema = z.object({
  name: agentNameSchema,
  instruction: agentInstructionSchema,
  userId: z.string().min(1, "User ID is required"),
});

export const agentsUpdateSchema = z.object({
  id: z.string().min(1),
  name: agentNameSchema.optional(),
  instruction: agentInstructionSchema.optional(),
});
