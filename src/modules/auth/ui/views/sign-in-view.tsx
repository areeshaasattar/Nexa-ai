"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { BrandLogo } from "@/components/brand-logo";
import Link from "next/link";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { ArrowRight, Loader2, MailCheck, RefreshCw, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { FaGithub, FaGoogle } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
} from "@/components/ui/field";
import { useResendCooldown } from "@/hooks/use-resend-cooldown";

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
});

type FormValues = z.infer<typeof formSchema>;

const SignInView = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  // Set when sign-in returns 403 (email not verified) — flips on the
  // "verify your email" panel with a resend button.
  const [verifyEmail, setVerifyEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const resendCooldown = useResendCooldown(
    `resend-cooldown:sign-in:${verifyEmail ?? "pending"}`,
  );
  // Toggles password visibility in the sign-in form (eye icon).
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    try {
      await authClient.signIn.email(
        {
          email: data.email,
          password: data.password,
          callbackURL: "/dashboard",
        },
        {
          onRequest: () => setLoading(true),
          onSuccess: () => {
            router.push("/dashboard");            setLoading(false);
            toast.success("Welcome back!", {
              description: "You have successfully signed in.",
            });
          },
          onError: (ctx) => {
            setLoading(false);
            // 403 = requireEmailVerification blocked the sign-in because the
            // email isn't verified yet. Surface a distinct "verify your email"
            // panel (with a resend button) instead of the generic toast.
            if (ctx.error.status === 403) {
              setVerifyEmail(data.email);
              return;
            }
            toast.error("Authentication Failed", {
              description: ctx.error.message || "Invalid email or password.",
              duration: 5000,
            });
          },
        },
      );
    } catch {
      setLoading(false);
      toast.error("Unexpected Error", {
        description: "An unexpected error occurred. Please try again later.",
      });
    }
  };

  // Resend the verification email for the address that was blocked by 403.
  const handleResendVerification = async () => {
    if (!verifyEmail || resending || resendCooldown.active) return;
    setResending(true);
    try {
      const { error } = await authClient.sendVerificationEmail({
        email: verifyEmail,
        callbackURL: "/dashboard",
      });
      if (error) {
        toast.error("Could not send verification email. Please try again.");
        return;
      }
      resendCooldown.start();
      toast.success("Verification email sent. Check your inbox and spam folder.");
    } catch {
      toast.error("Could not send verification email. Please try again.");
    } finally {
      setResending(false);
    }
  };

  useEffect(() => {
    form.setFocus("email");
  }, [form]);

  const handleSocialSignIn = async (provider: "google" | "github") => {
    setSocialLoading(provider);
    try {
      await authClient.signIn.social(
        {
          provider,
          callbackURL: "/dashboard",
        },
        {
          onRequest: () => setSocialLoading(provider),
          onError: (ctx) => {
            setSocialLoading(null);
            toast.error(
              `${provider.charAt(0).toUpperCase() + provider.slice(1)} Error`,
              {
                description:
                  ctx.error.message || "Could not complete social sign in.",
              },
            );
          },
        },
      );
    } catch {
      setSocialLoading(null);
      toast.error("Connection Error", {
        description: `Failed to connect to ${provider}.`,
      });
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gray-50 p-4 font-sans">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col md:flex-row min-h-[650px]">
        <div className="w-full md:w-1/2 p-8 lg:p-16 flex flex-col justify-center">
          <div className="mb-10 text-center md:text-left">
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight text-center">
              Welcome Back
            </h1>
            <p className="text-gray-500 text-lg text-center">
              Login to your account
            </p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FieldGroup>
              <Controller
                name="email"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field orientation="vertical">
                    <FieldLabel className="text-sm font-semibold text-gray-700">
                      Email Address
                    </FieldLabel>
                    <Input
                      {...field}
                      disabled={loading || !!socialLoading}
                      placeholder="name@company.com"
                      className="h-12 px-4 rounded-xl border-gray-200 focus:ring-2 focus:ring-green-900/10 focus:border-green-800 transition-all disabled:opacity-50"
                      type="email"
                      autoComplete="email"
                    />
                    {fieldState.error && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name="password"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field orientation="vertical">
                    <div className="flex justify-between items-center">
                      <FieldLabel className="text-sm font-semibold text-gray-700">
                        Password
                      </FieldLabel>
                      <Link
                        href="/forgot-password"
                        className="text-xs text-green-800 hover:text-green-900 font-medium"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative">
                      <Input
                        {...field}
                        disabled={loading || !!socialLoading}
                        placeholder="••••••••"
                        className="h-12 px-4 pr-11 rounded-xl border-gray-200 focus:ring-2 focus:ring-green-900/10 focus:border-green-800 transition-all disabled:opacity-50"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 transition-colors hover:text-gray-600"
                      >
                        {showPassword ? (
                          <EyeOff className="size-4" aria-hidden />
                        ) : (
                          <Eye className="size-4" aria-hidden />
                        )}
                      </button>
                    </div>
                    {fieldState.error && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </FieldGroup>

            <Button
              type="submit"
              disabled={loading || !!socialLoading}
              className="w-full h-12 rounded-xl bg-green-800 hover:bg-green-900 text-white font-bold text-lg shadow-lg shadow-green-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                "Sign In"
              )}
            </Button>

            {verifyEmail && (
              /* ---- Unverified email: distinct panel with resend ---- */
              <div className="flex flex-col items-start gap-3 px-4 py-3.5 bg-amber-50 border border-amber-200 rounded-xl text-left">
                <div className="flex items-start gap-2.5">
                  <MailCheck className="size-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">
                      Please verify your email before signing in
                    </p>
                    <p className="text-xs text-amber-700/90 mt-0.5">
                      We sent a verification link to{" "}
                      <span className="font-semibold">{verifyEmail}</span>.
                      Check your inbox, or resend the link below.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={resending || resendCooldown.active}
                    onClick={handleResendVerification}
                    className="h-10 rounded-xl border-amber-300 hover:bg-amber-100 text-amber-800 font-semibold text-sm transition-all flex items-center justify-center gap-2"
                  >
                    {resending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <RefreshCw className="size-4" />
                    )}
                    {resendCooldown.active
                      ? `Resend in ${resendCooldown.remaining}s`
                      : "Resend email"}
                  </Button>
                  <p className="text-xs text-amber-700/90">
                    Didn&apos;t get it? Check your spam folder.
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-4 my-8">
              <div className="flex-1 h-px bg-gray-300" />

              <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest whitespace-nowrap">
                or continue with
              </span>

              <div className="flex-1 h-px bg-gray-300" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                type="button"
                disabled={loading || !!socialLoading}
                onClick={() => handleSocialSignIn("google")}
                className="h-12 rounded-xl border-gray-200 hover:bg-gray-50 flex items-center justify-center gap-2 font-semibold transition-all disabled:opacity-50"
              >
                {socialLoading === "google" ? (
                  <Loader2 className="size-5 animate-spin text-green-800" />
                ) : (
                  <FaGoogle className="size-5 text-gray-600" />
                )}
              </Button>
              <Button
                variant="outline"
                type="button"
                disabled={loading || !!socialLoading}
                onClick={() => handleSocialSignIn("github")}
                className="h-12 rounded-xl border-gray-200 hover:bg-gray-50 flex items-center justify-center gap-2 font-semibold transition-all disabled:opacity-50"
              >
                {socialLoading === "github" ? (
                  <Loader2 className="size-5 animate-spin text-green-800" />
                ) : (
                  <FaGithub className="size-5 text-gray-600" />
                )}
              </Button>
            </div>

            <p className="mt-8 text-center text-gray-500 text-sm">
              Don’t have an account?{" "}
              <Link
                href="/sign-up"
                className="text-green-800 font-bold hover:text-green-900 transition-colors inline-flex items-center gap-1 group"
              >
                Sign up now
                <ArrowRight className="size-3 group-hover:translate-x-1 transition-transform" />
              </Link>
            </p>
          </form>
        </div>

        <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-green-950 via-green-900 to-emerald-950 p-12 relative overflow-hidden flex-col items-center justify-center text-white">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-green-700 rounded-full blur-[100px] opacity-20 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-emerald-800 rounded-full blur-[100px] opacity-20 animate-pulse delay-700"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.1)_100%)]"></div>

          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="">
              <BrandLogo variant="onDark" width={80} height={80} />
            </div>

            <h2 className="text-5xl font-black tracking-tighter mb-4 drop-shadow-sm">
              Nexa AI
            </h2>
            <div className="h-1 w-16 bg-green-500 rounded-full mb-8 shadow-[0_0_20px_rgba(34,197,94,0.5)]"></div>
          </div>

          <div className="absolute bottom-12 left-12 right-12">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex items-center gap-4 transition-all hover:bg-white/10 cursor-default">
              <div className="size-10 rounded-full bg-green-800/50 flex items-center justify-center">
                <div className="size-2 rounded-full bg-white animate-ping"></div>
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-widest text-green-200">
                  System Status
                </p>
                <p className="text-sm font-medium">All systems operational</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="mt-8 text-center text-gray-400 text-xs max-w-sm px-4">
        By clicking continue, you agree to our{" "}
        <Link
          href="/terms"
          className="underline underline-offset-4 hover:text-gray-600 transition-colors"
        >
          Terms & Conditions
        </Link>{" "}
        and{" "}
        <Link
          href="/privacy"
          className="underline underline-offset-4 hover:text-gray-600 transition-colors"
        >
          Privacy Policy
        </Link>
        .
      </footer>
    </div>
  );
};

export default SignInView;
