import { splitSetCookieHeader } from "better-auth/cookies";

import { auth } from "./auth";

type AuthSessionData = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

export const GUILD_RECHECK_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export type PublicAuthUser = {
  id: string;
  name: string;
  username: string | null;
  imageUrl: string | null;
  provider: string | null;
  providerId: string | null;
  guildAllowed: boolean | null;
  guildCheckedAt: number | null;
  guildCheckStatus: string | null;
};

export type ServerAuthState =
  | { status: "signed_out"; user: null }
  | { status: "allowed"; user: PublicAuthUser }
  | { status: "needs_recheck"; reason: "guild_check_expired"; user: PublicAuthUser }
  | { status: "forbidden"; reason: "not_guild_member"; user: PublicAuthUser }
  | { status: "auth_error"; reason: "discord_api_error" | "misconfigured"; user: PublicAuthUser | null };

type UserWithProviderProfile = AuthSessionData["user"] & {
  imageUrl?: string;
  provider?: string;
  providerAccountId?: string;
  providerUsername?: string;
  guildAllowed?: boolean;
  guildCheckedAt?: number;
  guildCheckStatus?: string;
};

type HeadersWithSetCookie = Headers & {
  getSetCookie?: () => string[];
};

const toPublicUser = (sessionData: AuthSessionData): PublicAuthUser => {
  const { guildAllowed, guildCheckedAt, guildCheckStatus, imageUrl, provider, providerAccountId, providerUsername } =
    sessionData.user as UserWithProviderProfile;

  return {
    id: sessionData.user.id,
    name: sessionData.user.name,
    username: providerUsername ?? null,
    imageUrl: imageUrl ?? null,
    provider: provider ?? null,
    providerId: providerAccountId ?? null,
    guildAllowed: guildAllowed ?? null,
    guildCheckedAt: guildCheckedAt ?? null,
    guildCheckStatus: guildCheckStatus ?? null,
  };
};

const getSetCookieHeaders = (headers: Headers) => {
  const getSetCookie = (headers as HeadersWithSetCookie).getSetCookie;
  if (typeof getSetCookie === "function") return getSetCookie.call(headers);

  const setCookie = headers.get("set-cookie");
  return setCookie ? splitSetCookieHeader(setCookie) : [];
};

const appendSetCookieHeaders = (source: Headers, target: Headers) => {
  for (const setCookie of getSetCookieHeaders(source)) {
    target.append("set-cookie", setCookie);
  }
};

const isGuildCheckExpired = (guildCheckedAt: number | null) =>
  typeof guildCheckedAt !== "number" ||
  !Number.isFinite(guildCheckedAt) ||
  Date.now() - guildCheckedAt > GUILD_RECHECK_MAX_AGE * 1000;

export const getServerAuthState = async (headers: Headers, responseHeaders: Headers): Promise<ServerAuthState> => {
  const sessionResult = await auth.api.getSession({ headers, returnHeaders: true });
  appendSetCookieHeaders(sessionResult.headers, responseHeaders);

  const { response: sessionData } = sessionResult;
  if (!sessionData) return { status: "signed_out", user: null };

  const user = toPublicUser(sessionData);

  if (user.provider !== "discord" || !user.providerId) {
    return {
      status: "forbidden",
      reason: "not_guild_member",
      user,
    };
  }

  if (user.guildCheckStatus === "misconfigured") {
    return {
      status: "auth_error",
      reason: "misconfigured",
      user,
    };
  }

  if (user.guildCheckStatus === "api_error") {
    return {
      status: "auth_error",
      reason: "discord_api_error",
      user,
    };
  }

  if (user.guildCheckStatus === "not_member" || user.guildAllowed !== true) {
    return {
      status: "forbidden",
      reason: "not_guild_member",
      user,
    };
  }

  if (isGuildCheckExpired(user.guildCheckedAt)) {
    return {
      status: "needs_recheck",
      reason: "guild_check_expired",
      user,
    };
  }

  return { status: "allowed", user };
};
