import { z } from "zod";
import { emailSchema, passwordSchema } from "@/modules/auth/schemas";

/**
 * Shared validation for the settings module.
 *
 * Reuses the auth module's `emailSchema` / `passwordSchema` so the email and
 * password rules can never drift from sign-up / sign-in / reset-password.
 */

export const MAX_NAME_LENGTH = 60;
export const MAX_BIO_LENGTH = 240;

/** Personal-info edits (display name + bio). */
export const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: "Name must be at least 2 characters" })
    .max(MAX_NAME_LENGTH, {
      message: `Name must be ${MAX_NAME_LENGTH} characters or fewer`,
    }),
  bio: z
    .string()
    .trim()
    .max(MAX_BIO_LENGTH, {
      message: `Bio must be ${MAX_BIO_LENGTH} characters or fewer`,
    })
    .optional(),
});

export type ProfileValues = z.infer<typeof profileSchema>;

/** Email change — same rule as everywhere else in the app. */
export const emailChangeSchema = z.object({
  newEmail: emailSchema,
});

export type EmailChangeValues = z.infer<typeof emailChangeSchema>;

/**
 * Password change — the current password is required (confirmed server-side by
 * Better-Auth), the new one reuses the shared min-8 rule, and confirm must match.
 */
export const passwordChangeSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, { message: "Current password is required" }),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "New password must be different from your current password",
    path: ["newPassword"],
  });

export type PasswordChangeValues = z.infer<typeof passwordChangeSchema>;