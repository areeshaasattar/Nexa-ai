"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { ArrowRight, Loader2, MailCheck, User, Mail, Lock } from "lucide-react";
import { toast } from "sonner";
import { FaGithub, FaGoogle } from "react-icons/fa";
import { authClient } from "@/lib/auth-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
} from "@/components/ui/field";
import { signUpSchema } from "../../schemas";

const formSchema = signUpSchema;

type FormValues = z.infer<typeof formSchema>;

const SignUpView = () => {
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  // Set once signup succeeds — flips the view to a "check your email" screen.
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    form.setFocus("name");
  }, [form]);

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    try {
      await authClient.signUp.email(
        {
          email: data.email,
          password: data.password,
          name: data.name,
          callbackURL: "/",
        },
        {
          onRequest: () => setLoading(true),
          onSuccess: () => {
            setLoading(false);
            // With requireEmailVerification the user is NOT signed in yet (no
            // session is created), so redirecting to "/" would drop them on a
            // page they can't use. Show the check-your-email state instead and
            // let them finish verification from their inbox.
            setSubmittedEmail(data.email);
          },
          onError: (ctx) => {
            setLoading(false);
            toast.error("Registration Failed", {
              description:
                ctx.error.message || "Something went wrong during sign up.",
              duration: 5000,
            });
          },
        },
      );
    } catch (error) {
      setLoading(false);
      toast.error("Unexpected Error", {
        description: "An unexpected error occurred. Please try again later.",
      });
    }
  };

  const handleSocialSignIn = async (provider: "google" | "github") => {
    setSocialLoading(provider);
    try {
      await authClient.signIn.social(
        {
          provider,
          callbackURL: "/",
        },
        {
          onRequest: () => setSocialLoading(provider),
          onError: (ctx) => {
            setSocialLoading(null);
            toast.error(
              `${provider.charAt(0).toUpperCase() + provider.slice(1)} Error`,
              {
                description:
                  ctx.error.message ||
                  "Could not complete social authentication.",
              },
            );
          },
        },
      );
    } catch (error) {
      setSocialLoading(null);
      toast.error("Connection Error", {
        description: `Failed to connect to ${provider}.`,
      });
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gray-50 p-4 font-sans">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col md:flex-row min-h-[700px]">
        <div className="w-full md:w-1/2 p-8 lg:p-12 flex flex-col justify-center">
          <div className="mb-8 text-center md:text-left">
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight text-center">
              Create Account
            </h1>
            <p className="text-gray-500 text-lg text-center">
              {submittedEmail ? "Check your inbox" : "Join the future of AI with Nexa"}
            </p>
          </div>

          {submittedEmail ? (
            /* ---- Success state: user must verify email before they can sign in ---- */
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="size-20 rounded-2xl bg-green-50 border border-green-100 flex items-center justify-center">
                <MailCheck className="size-10 text-green-700" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-bold text-gray-900">
                  Check your email
                </h2>
                <p className="text-sm text-gray-500 max-w-sm">
                  We&apos;ve sent a verification link to{" "}
                  <span className="font-semibold text-gray-700">
                    {submittedEmail}
                  </span>
                  . Click it to verify your account — you&apos;ll be signed in
                  automatically. The link expires in 1 hour.
                </p>
              </div>
              <Button
                asChild
                className="h-12 rounded-xl bg-green-800 hover:bg-green-900 text-white font-bold shadow-lg shadow-green-900/20 transition-all active:scale-[0.98]"
              >
                <Link href="/sign-in">Back to sign in</Link>
              </Button>
            </div>
          ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FieldGroup>
              <Controller
                name="name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field orientation="vertical">
                    <FieldLabel className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <User className="size-4 text-gray-400" /> Full Name
                    </FieldLabel>
                    <Input
                      {...field}
                      disabled={loading || !!socialLoading}
                      placeholder="John Doe"
                      className="h-12 px-4 rounded-xl border-gray-200 focus:ring-2 focus:ring-green-900/10 focus:border-green-800 transition-all disabled:opacity-50"
                    />
                    {fieldState.error && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name="email"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field orientation="vertical">
                    <FieldLabel className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Mail className="size-4 text-gray-400" /> Email Address
                    </FieldLabel>
                    <Input
                      {...field}
                      disabled={loading || !!socialLoading}
                      placeholder="name@company.com"
                      className="h-12 px-4 rounded-xl border-gray-200 focus:ring-2 focus:ring-green-900/10 focus:border-green-800 transition-all disabled:opacity-50"
                      type="email"
                    />
                    {fieldState.error && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Controller
                  name="password"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field orientation="vertical">
                      <FieldLabel className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Lock className="size-4 text-gray-400" /> Password
                      </FieldLabel>
                      <Input
                        {...field}
                        disabled={loading || !!socialLoading}
                        placeholder="••••••••"
                        className="h-12 px-4 rounded-xl border-gray-200 focus:ring-2 focus:ring-green-900/10 focus:border-green-800 transition-all disabled:opacity-50"
                        type="password"
                      />
                      {fieldState.error && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />

                <Controller
                  name="confirmPassword"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field orientation="vertical">
                      <FieldLabel className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Lock className="size-4 text-gray-400" /> Confirm
                      </FieldLabel>
                      <Input
                        {...field}
                        disabled={loading || !!socialLoading}
                        placeholder="••••••••"
                        className="h-12 px-4 rounded-xl border-gray-200 focus:ring-2 focus:ring-green-900/10 focus:border-green-800 transition-all disabled:opacity-50"
                        type="password"
                      />
                      {fieldState.error && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              </div>
            </FieldGroup>

            <Button
              type="submit"
              disabled={loading || !!socialLoading}
              className="w-full h-12 rounded-xl bg-green-800 hover:bg-green-900 text-white font-bold text-lg shadow-lg shadow-green-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                "Sign Up"
              )}
            </Button>

            <div className="relative flex items-center gap-4 my-6">
              <Separator className="flex-1 h-px bg-gray-300" />

              <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest whitespace-nowrap">
                or sign up with
              </span>

              <Separator className="flex-1 h-px bg-gray-300" />
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

            <p className="mt-6 text-center text-gray-500 text-sm">
              Already have an account?{" "}
              <Link
                href="/sign-in"
                className="text-green-800 font-bold hover:text-green-900 transition-colors inline-flex items-center gap-1 group"
              >
                Sign in instead
                <ArrowRight className="size-3 group-hover:translate-x-1 transition-transform" />
              </Link>
            </p>
          </form>
          )}
        </div>

        <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-green-950 via-green-900 to-emerald-950 p-12 relative overflow-hidden flex-col items-center justify-center text-white">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-green-700 rounded-full blur-[100px] opacity-20 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-emerald-800 rounded-full blur-[100px] opacity-20 animate-pulse delay-700"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.1)_100%)]"></div>

          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="">
              <Image
                src="/logo.svg"
                alt="Logo"
                width={80}
                height={80}
                className="invert brightness-0"
              />
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
                  Community Choice
                </p>
                <p className="text-sm font-medium">
                  Top rated AI platform 2026
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="mt-8 text-center text-gray-400 text-xs px-4">
        By clicking continue, you agree to our{" "}
        <Link
          href="#"
          className="underline underline-offset-4 hover:text-gray-600 transition-colors"
        >
          Terms & Conditions
        </Link>{" "}
        and{" "}
        <Link
          href="#"
          className="underline underline-offset-4 hover:text-gray-600 transition-colors"
        >
          Privacy Policy
        </Link>
        .
      </footer>
    </div>
  );
};

export default SignUpView;
