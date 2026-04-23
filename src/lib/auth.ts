import { getSecret } from "astro:env/server";
import { betterAuth } from "better-auth";

const betterAuthUrl = getSecret("BETTER_AUTH_URL");
const betterAuthSecret = getSecret("BETTER_AUTH_SECRET");
const discordClientId = getSecret("DISCORD_CLIENT_ID");
const discordClientSecret = getSecret("DISCORD_CLIENT_SECRET");

export const auth = betterAuth({
  ...(betterAuthUrl ? { baseURL: betterAuthUrl } : {}),
  ...(betterAuthSecret ? { secret: betterAuthSecret } : {}),
  ...(discordClientId && discordClientSecret
    ? {
        socialProviders: {
          discord: {
            clientId: discordClientId,
            clientSecret: discordClientSecret,
          },
        },
      }
    : {}),
});
