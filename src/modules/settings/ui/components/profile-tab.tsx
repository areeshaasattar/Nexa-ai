"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
} from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { SettingsSection } from "./settings-section";
import { AvatarUpload } from "./avatar-upload";
import {
  profileSchema,
  emailChangeSchema,
  MAX_BIO_LENGTH,
  type ProfileValues,
  type EmailChangeValues,
} from "../../schemas";

/** The session user shape we depend on (pass the whole object through). */
interface SessionUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  bio?: string | null;
}

const inputClass =
  "h-10 rounded-xl border-slate-200 bg-white shadow-sm placeholder:text-slate-400";

export function ProfileTab({
  user,
  onSessionRefetch,
}: {
  user: SessionUser;
  onSessionRefetch: () => void;
}) {
  /*
   * --- Personal info (name + bio) ---
   */
  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user.name ?? "", bio: user.bio ?? "" },
    mode: "onChange",
  });

  // Keep the form in sync when the session user changes after a refetch.
  React.useEffect(() => {
    profileForm.reset({ name: user.name ?? "", bio: user.bio ?? "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.name, user.bio]);

  const bioLength = profileForm.watch("bio")?.length ?? 0;

  const submitProfile = async (values: ProfileValues) => {
    try {
      const { error } = await authClient.updateUser({
        name: values.name,
        bio: values.bio ?? "",
      });
      if (error) {
        throw new Error(error.message || "Failed to update profile");
      }
      profileForm.reset(values);
      toast.success("Profile updated");
      onSessionRefetch();
    } catch (err) {
      toast.error("Could not update profile", {
        description:
          err instanceof Error ? err.message : "Please try again.",
      });
    }
  };

  /*
   * --- Email change (verification-gated) ---
   */
  const emailForm = useForm<EmailChangeValues>({
    resolver: zodResolver(emailChangeSchema),
    defaultValues: { newEmail: "" },
    mode: "onChange",
  });
  const [emailSubmitting, setEmailSubmitting] = React.useState(false);

  const submitEmail = async ({ newEmail }: EmailChangeValues) => {
    setEmailSubmitting(true);
    try {
      const { error } = await authClient.changeEmail({
        newEmail,
        callbackURL: "/settings?tab=profile",
      });
      if (error) {
        throw new Error(error.message || "Could not change email");
      }
      emailForm.reset();
      // Better-Auth intentionally does not reveal whether an address is taken:
      // for an already-registered email it succeeds without sending. Be honest.
      toast.success("Verification email sent", {
        description:
          `We sent a confirmation link to ${newEmail}. Your email won't change ` +
          "until you click it — if that address is already on an account, no email was sent.",
      });
    } catch (err) {
      toast.error("Could not change email", {
        description:
          err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setEmailSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ---------- Personal info ---------- */}
      <SettingsSection
        title="Personal info"
        description="How you're known across your workspace."
      >
        <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-start">
          <AvatarUpload
            seed={user.email || user.id}
            src={user.image}
            onImageChanged={onSessionRefetch}
          />

          <form
            onSubmit={profileForm.handleSubmit(submitProfile)}
            className="w-full min-w-0 flex-1 space-y-5"
          >
            <Field>
              <FieldLabel>Display name</FieldLabel>
              <Input
                autoComplete="name"
                placeholder="Jane Doe"
                className={inputClass}
                {...profileForm.register("name")}
              />
              <FieldDescription>
                Your name appears in meetings, transcripts, and the header.
              </FieldDescription>
              <FieldError>
                {profileForm.formState.errors.name?.message}
              </FieldError>
            </Field>

            <Field>
              <FieldLabel>Bio</FieldLabel>
              <Textarea
                rows={3}
                placeholder="A short line about you…"
                className="rounded-xl border-slate-200 bg-white shadow-sm"
                {...profileForm.register("bio")}
              />
              <div className="flex items-center justify-between gap-2">
                <FieldDescription>
                  Optional. Shown on your profile card.
                </FieldDescription>
                <span
                  className={cn(
                    "text-[11px] tabular-nums",
                    bioLength > MAX_BIO_LENGTH
                      ? "font-semibold text-red-500"
                      : "text-slate-400",
                  )}
                >
                  {bioLength}/{MAX_BIO_LENGTH}
                </span>
              </div>
              <FieldError>
                {profileForm.formState.errors.bio?.message}
              </FieldError>
            </Field>

            <div className="flex items-center justify-end gap-3 pt-1">
              {profileForm.formState.isDirty && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    profileForm.reset({
                      name: user.name ?? "",
                      bio: user.bio ?? "",
                    })
                  }
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  Discard
                </Button>
              )}
              <Button
                type="submit"
                disabled={
                  !profileForm.formState.isDirty ||
                  profileForm.formState.isSubmitting ||
                  !profileForm.formState.isValid
                }
                className="min-w-[9rem] gap-2 rounded-xl bg-emerald-600 text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:pointer-events-none disabled:opacity-50"
              >
                {profileForm.formState.isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Check className="size-4" aria-hidden />
                )}
                {profileForm.formState.isSubmitting ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        </div>
      </SettingsSection>

      {/* ---------- Email ---------- */}
      <SettingsSection
        title="Email address"
        description="The verified address used for sign-in and security alerts."
      >
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">
                {user.email}
              </p>
              <p className="text-xs text-slate-500">Current address</p>
            </div>
            <Badge
              variant="outline"
              className={cn(
                "shrink-0 rounded-full",
                user.emailVerified
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-amber-200 bg-amber-50 text-amber-700",
              )}
            >
              {user.emailVerified ? "Verified" : "Unverified"}
            </Badge>
          </div>

          <form
            onSubmit={emailForm.handleSubmit(submitEmail)}
            className="space-y-5"
          >
            <Field>
              <FieldLabel>New email</FieldLabel>
              <Input
                type="email"
                autoComplete="email"
                placeholder="new@company.com"
                className={inputClass}
                {...emailForm.register("newEmail")}
              />
              <FieldDescription>
                Changing your email requires verification — we'll email a
                confirmation link to your new address. Your email won't change
                until you click it.
              </FieldDescription>
              <FieldError>
                {emailForm.formState.errors.newEmail?.message}
              </FieldError>
            </Field>

            <div className="flex justify-end">
              <Button
                type="submit"
                variant="outline"
                disabled={
                  emailSubmitting || emailForm.formState.isValid === false
                }
                className="min-w-[11rem] gap-2 rounded-xl border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
              >
                {emailSubmitting && (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                )}
                {emailSubmitting
                  ? "Sending…"
                  : "Send verification email"}
              </Button>
            </div>
          </form>
        </div>
      </SettingsSection>
    </div>
  );
}