"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, KeyRound, Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
} from "@/components/ui/field";
import { SettingsSection } from "./settings-section";
import { passwordChangeSchema, type PasswordChangeValues } from "../../schemas";

const inputClass =
  "h-10 rounded-xl border-slate-200 bg-white shadow-sm pr-10";

type Strength = 0 | 1 | 2 | 3 | 4;

/** Rough heuristic: length + character variety. Not a real entropy check. */
function passwordStrength(password: string): Strength {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[^A-Za-z]/.test(password)) score++;
  return Math.min(4, score) as Strength;
}

const STRENGTH_LABELS = ["", "Weak", "Fair", "Good", "Strong"];
// 0 stays slate; 1 red; 2 amber; 3 emerald; 4 strong emerald.
const STRENGTH_COLORS = [
  "",
  "bg-red-400",
  "bg-amber-400",
  "bg-emerald-400",
  "bg-emerald-500",
];
const STRENGTH_TEXT = [
  "",
  "text-red-500",
  "text-amber-500",
  "text-emerald-600",
  "text-emerald-700",
];

export function SecurityTab() {
  const router = useRouter();
  const [showPasswords, setShowPasswords] = React.useState(false);

  const form = useForm<PasswordChangeValues>({
    resolver: zodResolver(passwordChangeSchema),
    mode: "onChange",
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const strength = passwordStrength(form.watch("newPassword") ?? "");
  const newPasswordVisible = !!form.watch("newPassword");

  const submitPassword = async (values: PasswordChangeValues) => {
    try {
      const { error } = await authClient.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        revokeOtherSessions: true,
      });
      if (error) {
        const message = error.message || "Could not change password";
        // The overwhelmingly common failure is a wrong current password.
        if (/incorrect|current password|invalid password/i.test(message)) {
          form.setError("currentPassword", {
            type: "server",
            message,
          });
        }
        toast.error("Could not change password", { description: message });
        return;
      }
      form.reset();
      toast.success("Password updated", {
        description:
          "You're all set — use your new password next time you sign in.",
      });
    } catch (err) {
      toast.error("Unexpected error", {
        description:
          err instanceof Error ? err.message : "Please try again later.",
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            toast.success("Signed out successfully");
            router.push("/sign-in");
          },
        },
      });
    } catch {
      toast.error("Sign out failed", {
        description: "Please try again later.",
      });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ---------- Password ---------- */}
      <SettingsSection
        title="Password"
        description="Use a strong password you don't use anywhere else."
      >
        <form
          onSubmit={form.handleSubmit(submitPassword)}
          className="max-w-lg space-y-5"
        >
          <Field>
            <FieldLabel>Current password</FieldLabel>
            <div className="relative">
              <Input
                type={showPasswords ? "text" : "password"}
                autoComplete="current-password"
                className={inputClass}
                {...form.register("currentPassword")}
              />
            </div>
            <FieldError>
              {form.formState.errors.currentPassword?.message}
            </FieldError>
          </Field>

          <Field>
            <FieldLabel>New password</FieldLabel>
            <div className="relative">
              <Input
                type={showPasswords ? "text" : "password"}
                autoComplete="new-password"
                className={inputClass}
                {...form.register("newPassword")}
              />
              <button
                type="button"
                onClick={() => setShowPasswords((v) => !v)}
                aria-label={showPasswords ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 transition-colors hover:text-slate-600"
              >
                {showPasswords ? (
                  <EyeOff className="size-4" aria-hidden />
                ) : (
                  <Eye className="size-4" aria-hidden />
                )}
              </button>
            </div>
            <FieldDescription>
              At least 8 characters. A mix of upper/lowercase, numbers, and
              symbols makes it stronger.
            </FieldDescription>
            <FieldError>{form.formState.errors.newPassword?.message}</FieldError>

            {newPasswordVisible && (
              <div className="space-y-1.5">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={cn(
                        "h-1 flex-1 rounded-full transition-colors duration-200",
                        i <= strength ? STRENGTH_COLORS[strength] : "bg-slate-200",
                      )}
                    />
                  ))}
                </div>
                <p
                  className={cn(
                    "text-[11px] font-medium",
                    STRENGTH_TEXT[strength],
                  )}
                >
                  {STRENGTH_LABELS[strength]}
                </p>
              </div>
            )}
          </Field>

          <Field>
            <FieldLabel>Confirm new password</FieldLabel>
            <div className="relative">
              <Input
                type={showPasswords ? "text" : "password"}
                autoComplete="new-password"
                className={inputClass}
                {...form.register("confirmPassword")}
              />
            </div>
            <FieldError>
              {form.formState.errors.confirmPassword?.message}
            </FieldError>
          </Field>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={form.formState.isSubmitting || !form.formState.isValid}
              className="min-w-[10rem] gap-2 rounded-xl bg-emerald-600 text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:pointer-events-none disabled:opacity-50"
            >
              {form.formState.isSubmitting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <KeyRound className="size-4" aria-hidden />
              )}
              {form.formState.isSubmitting
                ? "Updating…"
                : "Update password"}
            </Button>
          </div>
        </form>
      </SettingsSection>

      {/* ---------- Sign out ---------- */}
      <SettingsSection
        title="Sign out"
        description="End your session on this device."
      >
        <p className="mb-4 text-xs text-slate-500">
          You'll be returned to the sign-in page. Your data stays safe on your
          account — you can sign back in anytime.
        </p>
        <Button
          type="button"
          onClick={handleSignOut}
          variant="outline"
          className="gap-2 rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          <LogOut className="size-4" aria-hidden />
          Sign out
        </Button>
      </SettingsSection>
    </div>
  );
}