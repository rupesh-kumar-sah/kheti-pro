
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_NEON_AUTH_URL || "https://ep-restless-resonance-anhgy5fr.neonauth.c-6.us-east-1.aws.neon.tech/neondb/auth",
});
