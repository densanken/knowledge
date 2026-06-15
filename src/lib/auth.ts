import { betterAuth } from "better-auth";

import { createAuthOptions } from "./auth-options";
import { env } from "./env";

export { AUTH_SESSION_MAX_AGE } from "./auth-options";

export const auth = betterAuth(createAuthOptions(env));
