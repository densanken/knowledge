import { genericOAuth } from "better-auth/plugins/generic-oauth";

import { createDiscordOAuthProvider } from "./discord-oauth";

import type { BetterAuthOptions } from "better-auth";

export const AUTH_SESSION_MAX_AGE = 60 * 60 * 24 * 60; // 60 days

type AuthEnvironment = {
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  DISCORD_ALLOWED_GUILD_ID: string;
  DISCORD_CLIENT_ID: string;
  DISCORD_CLIENT_SECRET: string;
};

export const createAuthOptions = ({
  BETTER_AUTH_SECRET,
  BETTER_AUTH_URL,
  DISCORD_ALLOWED_GUILD_ID,
  DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET,
}: AuthEnvironment) =>
  ({
    baseURL: BETTER_AUTH_URL,
    secret: BETTER_AUTH_SECRET,
    advanced: {
      cookies: {
        account_data: {
          attributes: {
            maxAge: 60 * 5,
          },
        },
      },
    },
    account: {
      storeAccountCookie: true,
      storeStateStrategy: "cookie",
    },
    session: {
      cookieCache: {
        enabled: true,
        maxAge: AUTH_SESSION_MAX_AGE,
        strategy: "jwe",
      },
      expiresIn: AUTH_SESSION_MAX_AGE,
    },
    user: {
      additionalFields: {
        imageUrl: {
          input: false,
          required: false,
          returned: true,
          type: "string",
        },
        provider: {
          input: false,
          required: false,
          returned: true,
          type: "string",
        },
        providerAccountId: {
          input: false,
          required: false,
          returned: true,
          type: "string",
        },
        providerUsername: {
          input: false,
          required: false,
          returned: true,
          type: "string",
        },
        guildAllowed: {
          input: false,
          required: false,
          returned: true,
          type: "boolean",
        },
        guildCheckedAt: {
          input: false,
          required: false,
          returned: true,
          type: "number",
        },
        guildCheckStatus: {
          input: false,
          required: false,
          returned: true,
          type: "string",
        },
      },
    },
    plugins: [
      genericOAuth({
        config: [
          createDiscordOAuthProvider({
            clientId: DISCORD_CLIENT_ID,
            clientSecret: DISCORD_CLIENT_SECRET,
            allowedGuildId: DISCORD_ALLOWED_GUILD_ID,
            prompt: "consent", // 毎回同意を求めることでアカウント選択を可能にする
            providerId: "discord",
          }),
          createDiscordOAuthProvider({
            clientId: DISCORD_CLIENT_ID,
            clientSecret: DISCORD_CLIENT_SECRET,
            allowedGuildId: DISCORD_ALLOWED_GUILD_ID,
            prompt: "none",
            providerId: "discord_recheck",
          }),
        ],
      }),
    ],
  }) satisfies BetterAuthOptions;
