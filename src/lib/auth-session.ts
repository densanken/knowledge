import { splitSetCookieHeader } from "better-auth/cookies";

import { auth } from "./auth";

type AuthSessionData = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

export type PublicAuthUser = {
  id: string;
  name: string;
  username: string | null;
  imageUrl: string | null;
  provider: string | null;
  providerId: string | null;
};

export type ServerAuthState = {
  user: PublicAuthUser | null;
};

type UserWithProviderProfile = AuthSessionData["user"] & {
  imageUrl?: string;
  provider?: string;
  providerAccountId?: string;
  providerUsername?: string;
};

type HeadersWithSetCookie = Headers & {
  getSetCookie?: () => string[];
};

const toPublicUser = (sessionData: AuthSessionData): PublicAuthUser => {
  const { imageUrl, provider, providerAccountId, providerUsername } = sessionData.user as UserWithProviderProfile;

  return {
    id: sessionData.user.id,
    name: sessionData.user.name,
    username: providerUsername ?? null,
    imageUrl: imageUrl ?? null,
    provider: provider ?? null,
    providerId: providerAccountId ?? null,
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

export const getServerAuthState = async (headers: Headers, responseHeaders: Headers): Promise<ServerAuthState> => {
  const sessionResult = await auth.api.getSession({ headers, returnHeaders: true });
  appendSetCookieHeaders(sessionResult.headers, responseHeaders);

  const { response: sessionData } = sessionResult;

  return {
    user: sessionData ? toPublicUser(sessionData) : null,
  };
};
