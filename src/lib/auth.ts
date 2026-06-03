import { betterAuth } from "better-auth";

import { env } from "./env";

import type { DiscordOptions } from "better-auth/social-providers";

const { BETTER_AUTH_SECRET, BETTER_AUTH_URL, DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET } = env;

export const authSessionMaxAge = 60 * 60 * 24 * 30; // 30 days

export const auth = betterAuth({
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
      maxAge: authSessionMaxAge,
      refreshCache: {
        updateAge: authSessionMaxAge,
      },
      strategy: "jwe",
    },
    expiresIn: authSessionMaxAge,
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
    },
  },
  socialProviders: {
    discord: {
      clientId: DISCORD_CLIENT_ID,
      clientSecret: DISCORD_CLIENT_SECRET,
      prompt: "consent", // 毎回同意を求めることでアカウント選択を可能にする
      mapProfileToUser: (profile) => ({
        imageUrl: profile.image_url,
        provider: "discord",
        providerAccountId: profile.id,
        providerUsername: profile.username,
      }),
    } satisfies DiscordOptions,
  },
});
