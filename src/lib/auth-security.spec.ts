import { getCookieCache, getCookies } from "better-auth/cookies";
import { symmetricEncodeJWT } from "better-auth/crypto";
import { describe, expect, it } from "vitest";

import { AUTH_SESSION_MAX_AGE, createAuthOptions } from "./auth-options";

const SECRET = "test-secret-with-at-least-thirty-two-characters";
const SESSION_COOKIE_NAME = "__Secure-better-auth.session_data";
const TEST_ENV = {
  BETTER_AUTH_SECRET: SECRET,
  BETTER_AUTH_URL: "https://example.com",
  DISCORD_ALLOWED_GUILD_ID: "12345678901234567",
  DISCORD_CLIENT_ID: "12345678901234567",
  DISCORD_CLIENT_SECRET: "12345678901234567890123456789012",
};
const SESSION_PAYLOAD = {
  session: {
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + AUTH_SESSION_MAX_AGE * 1000).toISOString(),
    id: "session-id",
    token: "session-token",
    updatedAt: new Date().toISOString(),
    userId: "user-id",
  },
  updatedAt: Date.now(),
  user: {
    createdAt: new Date().toISOString(),
    email: "user@example.com",
    emailVerified: true,
    id: "user-id",
    name: "Test User",
    updatedAt: new Date().toISOString(),
  },
};

const readSessionJwe = (token: string) => {
  const headers = new Headers({
    cookie: `${SESSION_COOKIE_NAME}=${token}`,
  });

  return getCookieCache(headers, {
    isSecure: true,
    secret: SECRET,
    strategy: "jwe",
  });
};

describe("stateless session security", () => {
  it("rejects an expired session JWE", async () => {
    const token = await symmetricEncodeJWT(SESSION_PAYLOAD, SECRET, "better-auth-session", -16);

    await expect(readSessionJwe(token)).resolves.toBeNull();
  });

  it("rejects a tampered session JWE", async () => {
    const token = await symmetricEncodeJWT(SESSION_PAYLOAD, SECRET, "better-auth-session", 60);
    const segments = token.split(".");
    const authenticationTag = segments.at(-1);

    if (!authenticationTag) throw new Error("JWE authentication tag is missing");
    segments[segments.length - 1] = `${authenticationTag.startsWith("A") ? "B" : "A"}${authenticationTag.slice(1)}`;

    await expect(readSessionJwe(segments.join("."))).resolves.toBeNull();
  });

  it("uses secure production cookie attributes", () => {
    const cookies = getCookies(createAuthOptions(TEST_ENV));

    expect(cookies.sessionData.name).toBe(SESSION_COOKIE_NAME);
    expect(cookies.sessionData.attributes.httpOnly).toBe(true);
    expect(cookies.sessionData.attributes.maxAge).toBe(AUTH_SESSION_MAX_AGE);
    expect(cookies.sessionData.attributes.path).toBe("/");
    expect(cookies.sessionData.attributes.sameSite).toBe("lax");
    expect(cookies.sessionData.attributes.secure).toBe(true);

    expect(cookies.sessionToken.attributes.httpOnly).toBe(true);
    expect(cookies.sessionToken.attributes.maxAge).toBe(AUTH_SESSION_MAX_AGE);
    expect(cookies.sessionToken.attributes.path).toBe("/");
    expect(cookies.sessionToken.attributes.sameSite).toBe("lax");
    expect(cookies.sessionToken.attributes.secure).toBe(true);

    expect(cookies.accountData.attributes.httpOnly).toBe(true);
    expect(cookies.accountData.attributes.maxAge).toBe(60 * 5);
    expect(cookies.accountData.attributes.path).toBe("/");
    expect(cookies.accountData.attributes.sameSite).toBe("lax");
    expect(cookies.accountData.attributes.secure).toBe(true);
  });
});
