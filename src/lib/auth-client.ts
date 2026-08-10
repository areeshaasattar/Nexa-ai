import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "./auth";

/**
 * The bare client. `inferAdditionalFields` is a type-only-ish plugin that pulls
 * the server's `user.additionalFields` (e.g. `bio`) into the client so
 * `authClient.updateUser({ bio })` type-checks and the field is returned on the
 * session user — no risk of the client and server field lists drifting.
 */
export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof auth>()],
});