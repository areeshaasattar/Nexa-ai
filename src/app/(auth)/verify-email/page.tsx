import React, { Suspense } from "react";
import { Loader2 } from "lucide-react";
import VerifyEmailView from "@/modules/auth/ui/views/verify-email-view";

/**
 * Handles `${baseURL}/verify-email?token=...&callbackURL=...` — the link users
 * click from the verification email. Better-Auth's own `/verify-email` endpoint
 * does the actual verification server-side; this page just calls that endpoint
 * via the client and reflects the outcome.
 *
 * Unlike the other (auth) pages we intentionally do NOT redirect-away when a
 * session exists: the user is typically not signed in yet when they click the
 * link, and autoSignInAfterVerification logs them in as part of the call.
 *
 * The view reads the token with useSearchParams(), and this page is statically
 * prerendered, so the client component must sit inside a Suspense boundary.
 */
const Page = async () => {
  return (
    <div>
      <Suspense
        fallback={
          <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gray-50 p-4">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="size-20 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                <Loader2 className="size-10 text-emerald-600 animate-spin" />
              </div>
              <p className="text-sm text-gray-500">Verifying your email…</p>
            </div>
          </div>
        }
      >
        <VerifyEmailView />
      </Suspense>
    </div>
  );
};

export default Page;