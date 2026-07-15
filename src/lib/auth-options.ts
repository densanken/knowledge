import { APIError, createAuthMiddleware } from "better-auth/api";
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
    // OAuth プロファイルの追加フィールドは input を true にしないとユーザーと JWE へ保存されない
    // input を true にすると公開 API からも更新可能になるため update-user を全面拒否する
    hooks: {
      before: createAuthMiddleware((context) => {
        if (context.path !== "/update-user") return Promise.resolve();

        return Promise.reject(
          new APIError("FORBIDDEN", {
            message: "User profile updates are disabled.",
          })
        );
      }),
    },
    user: {
      additionalFields: {
        imageUrl: {
          input: true,
          required: false,
          returned: true,
          type: "string",
        },
        provider: {
          input: true,
          required: false,
          returned: true,
          type: "string",
        },
        providerAccountId: {
          input: true,
          required: false,
          returned: true,
          type: "string",
        },
        providerUsername: {
          input: true,
          required: false,
          returned: true,
          type: "string",
        },
        guildAllowed: {
          input: true,
          required: false,
          returned: true,
          type: "boolean",
        },
        guildCheckedAt: {
          input: true,
          required: false,
          returned: true,
          type: "number",
        },
        guildCheckStatus: {
          input: true,
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
