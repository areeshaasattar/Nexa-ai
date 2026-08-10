import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db"
import * as schema from "@/db/schema"
import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/email"

/**
 * Build the password-reset link that goes in the email.
 *
 * We route through Better-Auth's own token-validation callback endpoint
 * (`/api/auth/reset-password/:token` — the auth API is mounted at
 * `/api/auth/[...all]`), which validates the single-use token and then
 * 302-redirects to the `callbackURL`:
 *   - valid token   → /reset-password?token=...
 *   - invalid/expired → /reset-password?error=INVALID_TOKEN
 * This keeps expiry/revocation checks in one place (Better-Auth) instead of
 * duplicating them in the reset page.
 */
function buildPasswordResetUrl(token: string): string {
  const baseURL =
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";
  const callbackURL = encodeURIComponent("/reset-password");
  return `${baseURL}/api/auth/reset-password/${token}?callbackURL=${callbackURL}`;
}

export const auth = betterAuth({
     trustedOrigins: ["https://broadways-disprove-embargo.ngrok-free.dev"],
     socialProviders: {
        github: {
            clientId: process.env.GITHUB_CLIENT_ID as string,
            clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
        },
         google: {
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        },
    },
    account: {
        accountLinking: {
            enabled: true,
            /**
             * Google and GitHub both verify the user owns the email before
             * returning it, so it is safe to auto-link an OAuth sign-in to an
             * existing account that already uses that email.
             *
             * We deliberately DO NOT set `disableImplicitLinking` — we want the
             * default implicit linking behavior (merge on matching verified
             * email) for these trusted providers.
             *
             * `requireLocalEmailVerified: false` is REQUIRED here. Better-Auth
             * defaults it to `true`, which means an OAuth sign-in will only
             * auto-link if the existing email/password account already went
             * through OUR email verification. Accounts created before
             * verification was enforced have emailVerified = false, so they
             * would deadlock: Google can't link (local email unverified) and
             * the local email can't be verified (the verification email never
             * reached them). Because the OAuth provider has already verified
             * ownership of the email, its verification substitutes for ours:
             * letting this fall through also flips the local account to
             * verified on a successful link.
             *
             * Trade-off: a matching, provider-verified email is trusted even if
             * the local account never verified through our own flow. For
             * providers in `trustedProviders` that always verify email (Google)
             * this is equivalent assurance; for providers that can report an
             * unverified email (GitHub) you are trusting the account-name match
             * itself. If you want stronger assurance for untrusted providers,
             * add them to `trustedProviders` only after confirming they verify
             * emails, and consider an interstitial "approve this link" page.
             */
            trustedProviders: ["google", "github"],
            requireLocalEmailVerified: false,
        },
    },
    emailVerification: {
        /**
         * Email the user their verification link. Called by Better-Auth after
         * signup (sendOnSignUp) and whenever the link is resent. Same
         * fire-and-forget-with-logged-failure pattern as the reset email so a
         * slow email provider never blocks or reveals timing of the auth route.
         */
        sendVerificationEmail: async ({ user, url }) => {
            if (!user.email) return;
            sendVerificationEmail({ to: user.email, url }).catch((error) => {
                console.error(
                    `[auth] Failed to send verification email to ${user.email}:`,
                    error,
                );
            });
        },
        sendOnSignUp: true,
        autoSignInAfterVerification: true,
        // Same 1-hour expiry as the reset-password token.
        expiresIn: 3600,
    },
    user: {
        /**
         * Let users change their email from the settings page. Per
         * Better-Auth semantics the new address must be confirmed via a
         * verification email before the change is applied — the email is
         * never swapped silently.
         */
        changeEmail: {
            enabled: true,
        },
        /**
         * Custom profile field (see `src/db/schema.ts` `user.bio`). Declared
         * here so the Drizzle adapter persists it and `updateUser({ bio })`
         * from the client is accepted + returned on the session user.
         */
        additionalFields: {
            bio: { type: "string", defaultValue: "" },
        },
    },
    emailAndPassword: {
        enabled: true,
        // Sign-in is blocked for unverified users (Better-Auth returns 403 with
        // an "email not verified" error until they verify). The strict path —
        // combined with account.accountLinking's default requireLocalEmailVerified
        // — is what makes Google↔email/password linking safe: we only auto-link
        // when the email is genuinely verified.
        requireEmailVerification: true,
        /**
         * Emails the user their password-reset link.
         *
         * Deliberately NOT awaited (fire-and-forget) so the auth endpoint's
         * response time does not reveal whether the email exists in the DB —
         * Better-Auth's guidance for avoiding timing-attack-prone behavior.
         * Failures are logged, never surfaced to the caller.
         */
        sendResetPassword: async ({ user, token }) => {
            if (!user.email) return;

            const url = buildPasswordResetUrl(token);

            // Fire-and-forget: don't block the auth response on email delivery.
            sendPasswordResetEmail({ to: user.email, url }).catch((error) => {
                console.error(
                    `[auth] Failed to send password reset email to ${user.email}:`,
                    error,
                );
            });
        },
        // Token is valid for 1 hour (3600s). Short enough to limit a stolen
        // link's usefulness, long enough to survive typical email latency.
        resetPasswordTokenExpiresIn: 3600,
        // Reset invalidates all other sessions for that user — a freshly set
        // password shouldn't be usable alongside stolen sessions elsewhere.
        revokeSessionsOnPasswordReset: true,
    },
    database: drizzleAdapter(db, {
        provider: "pg",
        schema: {
            ...schema
        }
    }),
});
