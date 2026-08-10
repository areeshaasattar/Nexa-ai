"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  Mail,
  MailCheck,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type VerifyStatus = "verifying" | "success" | "error";

const VerifyEmailView = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<VerifyStatus>("verifying");
  const [resendEmail, setResendEmail] = useState("");
  const [resending, setResending] = useState(false);

  const token = searchParams.get("token");
  const callbackURL = searchParams.get("callbackURL") || "/";

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        // Better-Auth validates the token server-side and, because
        // autoSignInAfterVerification is on, creates a session (sets the cookie)
        // in the same call. On success the user is already logged in.
        const { error } = await authClient.verifyEmail({
          query: { token, callbackURL },
        });
        if (cancelled) return;
        if (error) {
          setStatus("error");
          return;
        }
        setStatus("success");
        // Drop them back to the app once the success state has been seen.
        setTimeout(() => router.push(callbackURL), 1500);
      } catch (err) {
        if (cancelled) return;
        console.error("Email verification error:", err);
        setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, callbackURL, router]);

  const handleResend = async () => {
    if (!resendEmail.trim()) return;
    setResending(true);
    try {
      const { error } = await authClient.sendVerificationEmail({
        email: resendEmail.trim(),
        callbackURL: "/",
      });
      setResending(false);
      if (error) {
        toast.error("Could not resend verification email", {
          description:
            error.message || "Please check your email and try again.",
          duration: 5000,
        });
        return;
      }
      toast.success("Verification email sent!", {
        description: `Check ${resendEmail.trim()} for the link. It expires in 1 hour.`,
      });
    } catch (error) {
      setResending(false);
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
              Email Verification
            </h1>
            <p className="text-gray-500 text-lg text-center">
              {status === "success"
                ? "You're all set"
                : status === "error"
                  ? "Something went wrong"
                  : "Verifying your email"}
            </p>
          </div>

          {status === "verifying" && (
            /* ---- Verifying state ---- */
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="size-20 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                <Loader2 className="size-10 text-emerald-600 animate-spin" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-bold text-gray-900">
                  Verifying your email…
                </h2>
                <p className="text-sm text-gray-500 max-w-sm">
                  This should only take a moment. Please wait while we confirm
                  your email address.
                </p>
              </div>
            </div>
          )}

          {status === "success" && (
            /* ---- Success state: auto-redirect after a beat ---- */
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="size-20 rounded-2xl bg-green-50 border border-green-100 flex items-center justify-center">
                <MailCheck className="size-10 text-green-700" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-bold text-gray-900 flex items-center justify-center gap-2">
                  Email verified!
                  <CheckCircle2 className="size-5 text-green-600" />
                </h2>
                <p className="text-sm text-gray-500 max-w-sm">
                  You&apos;re signed in. Redirecting you to the app…
                </p>
              </div>
            </div>
          )}

          {status === "error" && (
            /* ---- Error state: invalid/expired token + resend ---- */
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="size-20 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center">
                <ShieldAlert className="size-10 text-red-500" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-bold text-gray-900">
                  This verification link is invalid or has expired
                </h2>
                <p className="text-sm text-gray-500 max-w-sm">
                  For security, verification links are single-use and expire
                  after 1 hour. Enter your email below to get a fresh link.
                </p>
              </div>

              <div className="w-full max-w-xs flex flex-col gap-3">
                <div className="relative w-full">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                  <Input
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    disabled={resending}
                    placeholder="name@company.com"
                    className="h-12 pl-11 pr-4 rounded-xl border-gray-200 focus:ring-2 focus:ring-green-900/10 focus:border-green-800 transition-all disabled:opacity-50"
                    type="email"
                    autoComplete="email"
                  />
                </div>
                <Button
                  onClick={handleResend}
                  disabled={resending || !resendEmail.trim()}
                  className="h-12 rounded-xl bg-green-800 hover:bg-green-900 text-white font-bold shadow-lg shadow-green-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {resending ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    "Resend verification email"
                  )}
                </Button>
              </div>
            </div>
          )}

          <Link
            href="/sign-in"
            className="mt-8 flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-green-800 font-semibold transition-colors group"
          >
            Back to sign in
          </Link>
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
                  Secure Verification
                </p>
                <p className="text-sm font-medium">
                  Links expire after 1 hour
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailView;
