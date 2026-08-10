import { z } from "zod";

/**
 * Shared validation for the auth module.
 *
 * The password rules below are intentionally shared between sign-up and the
 * reset-password flow so they can never drift out of sync.
 */

/** Minimum password rule used by sign-up and reset-password. */
export const passwordSchema = z
  .string()
  .min(8, { message: "Password must be at least 8 characters" });

/** Email rule reused across sign-in / sign-up / forgot-password. */
export const emailSchema = z
  .string()
  .email({ message: "Please enter a valid email address" });

/** Sign-up form: name + email + password + matching confirm. */
export const signUpSchema = z
  .object({
    name: z.string().min(2, { message: "Name must be at least 2 characters" }),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

/** Forgot-password form: just an email. */
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

/** Reset-password form: new password + matching confirm (same rules as sign-up). */
export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
