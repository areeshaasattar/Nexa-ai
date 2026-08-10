"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { ArrowLeft, ArrowRight, Loader2, MailCheck, Mail } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
} from "@/components/ui/field";
import { forgotPasswordSchema } from "../../schemas";

type FormValues = z.infer<typeof forgotPasswordSchema>;

const ForgotPasswordView = () => {
  const [loading, setLoading] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  useEffect(() => {
    form.setFocus("email");
  }, [form]);

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    try {
      const { error } = await authClient.requestPasswordReset({
        email: data.email,
        redirectTo: "/reset-password",
      });

      if (error) {
        setLoading(false);
        toast.error("Request Failed", {
          description: error.message || "Could not request a password reset.",
          duration: 5000,
        });
        return;
      }

      // Show the same message whether or not the account exists — never
      // reveal account existence to the requester.
      setLoading(false);
      setSubmittedEmail(data.email);
    } catch (error) {
      setLoading(false);
      toast.error("Unexpected Error", {
        description: "An unexpected error occurred. Please try again later.",
      });
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gray-50 p-4 font-sans">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col md:flex-row min-h-[650px]">
        <div className="w-full md:w-1/2 p-8 lg:p-16 flex flex-col justify-center">
          <div className="mb-10 text-center md:text-left">
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight text-center">
              Forgot Password
            </h1>
            <p className="text-gray-500 text-lg text-center">
              {submittedEmail
                ? "Check your inbox"
                : "We'll email you a reset link"}
            </p>
          </div>

          {submittedEmail ? (
            /* ---- Success state: replace the form with a check-your-email message ---- */
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="size-20 rounded-2xl bg-green-50 border border-green-100 flex items-center justify-center">
                <MailCheck className="size-10 text-green-700" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-bold text-gray-900">
                  Check your email
                </h2>
                <p className="text-sm text-gray-500 max-w-sm">
                  If an account exists for{" "}
                  <span className="font-semibold text-gray-700">
                    {submittedEmail}
                  </span>
                  , we've sent you a link to reset your password. It expires in
                  1 hour.
                </p>
              </div>
              <Button
                variant="outline"
                className="h-12 rounded-xl border-gray-200 hover:bg-gray-50 text-gray-600 font-semibold transition-all"
                onClick={() => setSubmittedEmail(null)}
              >
                Use a different email
              </Button>
            </div>
          ) : (
            /* ---- Form state ---- */
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
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                        <Input
                          {...field}
                          disabled={loading}
                          placeholder="name@company.com"
                          className="h-12 pl-11 pr-4 rounded-xl border-gray-200 focus:ring-2 focus:ring-green-900/10 focus:border-green-800 transition-all disabled:opacity-50"
                          type="email"
                          autoComplete="email"
                        />
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
                disabled={loading}
                className="w-full h-12 rounded-xl bg-green-800 hover:bg-green-900 text-white font-bold text-lg shadow-lg shadow-green-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  "Send Reset Link"
                )}
              </Button>

              <Link
                href="/sign-in"
                className="mt-6 flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-green-800 font-semibold transition-colors group"
              >
                <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
                Back to sign in
              </Link>
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
                <MailCheck className="size-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-widest text-green-200">
                  Secure Reset
                </p>
                <p className="text-sm font-medium">Links expire after 1 hour</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="mt-8 text-center text-gray-400 text-xs max-w-sm px-4">
        <Link
          href="/sign-in"
          className="inline-flex items-center gap-1 underline underline-offset-4 hover:text-gray-600 transition-colors"
        >
          Back to sign in
          <ArrowRight className="size-3" />
        </Link>
      </footer>
    </div>
  );
};

export default ForgotPasswordView;
