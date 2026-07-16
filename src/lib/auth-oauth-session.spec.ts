import { betterAuth } from "better-auth";
import { splitSetCookieHeader } from "better-auth/cookies";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAuthOptions } from "./auth-options";

const BASE_URL = "https://example.com/api/auth";
const ALLOWED_GUILD_ID = "12345678901234567";
const DISCORD_USER_ID = "23456789012345678";
const TEST_ENV = {
  BETTER_AUTH_SECRET: "test-secret-with-at-least-thirty-two-characters",
  BETTER_AUTH_URL: BASE_URL,
  DISCORD_ALLOWED_GUILD_ID: ALLOWED_GUILD_ID,
  DISCORD_CLIENT_ID: "34567890123456789",
  DISCORD_CLIENT_SECRET: "12345678901234567890123456789012",
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

const getSetCookies = (response: Response) => {
  if (typeof response.headers.getSetCookie === "function") return response.headers.getSetCookie();

  const setCookie = response.headers.get("set-cookie");
  return setCookie ? splitSetCookieHeader(setCookie) : [];
};

const toCookieHeader = (setCookies: string[]) =>
  setCookies
    .filter((cookie) => !/Max-Age=0(?:;|$)/i.test(cookie))
    .map((cookie) => cookie.split(";", 1)[0])
    .join("; ");

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Discord OAuth session", () => {
  it("restores provider and guild claims from the JWE issued by the OAuth callback", async () => {
    const auth = betterAuth(createAuthOptions(TEST_ENV));
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

      if (url === "https://discord.com/api/oauth2/token") {
        return Response.json({
          access_token: "discord-access-token",
          expires_in: 3600,
          scope: "identify email guilds.members.read",
          token_type: "Bearer",
        });
      }

      if (url === "https://discord.com/api/v10/users/@me") {
        return Response.json({
          avatar: null,
          discriminator: "0",
          email: "discord-user@example.com",
          global_name: "Discord User",
          id: DISCORD_USER_ID,
          username: "discord-user",
          verified: true,
        });
      }

      if (url === `https://discord.com/api/v10/users/@me/guilds/${ALLOWED_GUILD_ID}/member`) {
        return Response.json({ user: { id: DISCORD_USER_ID } });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const signInResponse = await auth.handler(
      new Request(`${BASE_URL}/sign-in/oauth2`, {
        body: JSON.stringify({ callbackURL: "https://example.com/", providerId: "discord" }),
        headers: { "content-type": "application/json", origin: "https://example.com" },
        method: "POST",
      })
    );
    expect(signInResponse.status).toBe(200);

    const signInBody: unknown = await signInResponse.json();
    if (!isRecord(signInBody) || typeof signInBody.url !== "string") throw new Error("Authorization URL is missing");

    const authorizationUrl = signInBody.url;
    const state = new URL(authorizationUrl).searchParams.get("state");
    expect(state).toBeTruthy();

    const callbackResponse = await auth.handler(
      new Request(`${BASE_URL}/oauth2/callback/discord?code=test-code&state=${encodeURIComponent(state ?? "")}`, {
        headers: { cookie: toCookieHeader(getSetCookies(signInResponse)) },
      })
    );
    expect(callbackResponse.status).toBe(302);
    expect(callbackResponse.headers.get("location")).toBe("https://example.com/");

    const sessionDataCookies = getSetCookies(callbackResponse).filter((cookie) =>
      cookie.startsWith("__Secure-better-auth.session_data=")
    );
    expect(sessionDataCookies).toHaveLength(1);
    const sessionCookies = getSetCookies(callbackResponse).filter(
      (cookie) =>
        cookie.startsWith("__Secure-better-auth.session_data=") ||
        cookie.startsWith("__Secure-better-auth.session_token=")
    );
    expect(sessionCookies).toHaveLength(2);

    const sessionResponse = await auth.handler(
      new Request(`${BASE_URL}/get-session`, {
        headers: { cookie: toCookieHeader(sessionCookies) },
      })
    );
    expect(sessionResponse.status).toBe(200);

    const session: unknown = await sessionResponse.json();
    if (!isRecord(session) || !isRecord(session.user)) throw new Error("Session user is missing");

    expect(session.user).toMatchObject({
      guildAllowed: true,
      guildCheckStatus: "allowed",
      provider: "discord",
      providerAccountId: DISCORD_USER_ID,
      providerUsername: "discord-user",
    });
    expect(typeof session.user.guildCheckedAt).toBe("number");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("rejects every public update-user request", async () => {
    const auth = betterAuth(createAuthOptions(TEST_ENV));

    const response = await auth.handler(
      new Request(`${BASE_URL}/update-user`, {
        body: JSON.stringify({ guildAllowed: true, name: "Changed" }),
        headers: { "content-type": "application/json", origin: "https://example.com" },
        method: "POST",
      })
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ message: "User profile updates are disabled." });
  });
});
