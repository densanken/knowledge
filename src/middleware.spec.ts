import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PublicAuthUser, ServerAuthState } from "./lib/auth-session";

const { getServerAuthState } = vi.hoisted(() => ({ getServerAuthState: vi.fn() }));

vi.mock("astro:middleware", () => ({
  defineMiddleware: (handler: unknown) => handler,
}));

vi.mock("./lib/auth-session", () => ({
  appendSetCookieHeaders: (source: Headers, target: Headers) => {
    for (const cookie of source.getSetCookie()) target.append("set-cookie", cookie);
  },
  getServerAuthState,
}));

const { onRequest } = await import("./middleware");

type Ctx = Parameters<typeof onRequest>[0];

const user: PublicAuthUser = {
  guildAllowed: true,
  guildCheckStatus: null,
  guildCheckedAt: Date.now(),
  id: "user-id",
  imageUrl: null,
  name: "Test User",
  provider: "discord",
  providerId: "12345678901234567",
  username: "testuser",
};

const REFRESHED_COOKIE = "__Secure-better-auth.session_data=refreshed; Path=/";

const mockAuthState = (state: ServerAuthState) => {
  getServerAuthState.mockImplementation((_headers: Headers, cookieHeaders: Headers) => {
    cookieHeaders.append("set-cookie", REFRESHED_COOKIE);
    return Promise.resolve(state);
  });
};

const createContext = (path: string) => {
  const url = new URL(path, "https://example.com");
  const redirect = vi.fn(
    (location: string, status: number): Response => new Response(null, { headers: { location }, status })
  );
  const context = { locals: {} as Ctx["locals"], redirect, request: new Request(url), url };

  return context;
};

const next = vi.fn(() => Promise.resolve(new Response("page", { status: 200 })));

const run = async (context: ReturnType<typeof createContext>) => {
  const response = await onRequest(context as unknown as Ctx, next);
  if (!(response instanceof Response)) throw new Error("middleware did not return a response");

  return response;
};

beforeEach(() => {
  getServerAuthState.mockReset();
  next.mockClear();
});

describe("auth guard middleware", () => {
  it.each(["/_astro/index.123.js", "/favicon.ico", "/api/auth/callback/discord"])(
    "skips the auth guard for %s",
    async (path) => {
      const context = createContext(path);

      const response = await run(context);

      expect(getServerAuthState).not.toHaveBeenCalled();
      expect(context.redirect).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledTimes(1);
      // バイパスした静的アセットにはキャッシュ制御を強制しない
      expect(response.headers.get("cache-control")).toBeNull();
    }
  );

  it("redirects a signed out user to sign-in with the current path as callbackURL", async () => {
    mockAuthState({ status: "signed_out", user: null });
    const context = createContext("/docs?q=astro");

    const response = await run(context);

    expect(next).not.toHaveBeenCalled();
    expect(context.redirect).toHaveBeenCalledWith("/sign-in?callbackURL=%2Fdocs%3Fq%3Dastro", 302);
    expect(response.headers.get("set-cookie")).toContain(REFRESHED_COOKIE);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("guards a protected page even when the path ends with an extension", async () => {
    mockAuthState({ status: "signed_out", user: null });
    const context = createContext("/docs/foo.md");

    await run(context);

    expect(context.redirect).toHaveBeenCalledWith("/sign-in?callbackURL=%2Fdocs%2Ffoo.md", 302);
    expect(next).not.toHaveBeenCalled();
  });

  it("redirects a stale session to the recheck flow", async () => {
    mockAuthState({ reason: "guild_check_expired", status: "needs_recheck", user });
    const context = createContext("/");

    await run(context);

    expect(context.redirect).toHaveBeenCalledWith("/sign-in?mode=recheck&callbackURL=%2F", 302);
  });

  it.each([
    { expected: "/access-denied?reason=not_guild_member", state: { reason: "not_guild_member", status: "forbidden" } },
    { expected: "/access-denied?reason=misconfigured", state: { reason: "misconfigured", status: "auth_error" } },
  ] as const)("redirects $state.status to access-denied", async ({ expected, state }) => {
    mockAuthState({ ...state, user });
    const context = createContext("/docs");

    await run(context);

    expect(context.redirect).toHaveBeenCalledWith(expected, 302);
    expect(next).not.toHaveBeenCalled();
  });

  it("lets an allowed user through and exposes the user via locals", async () => {
    mockAuthState({ status: "allowed", user });
    const context = createContext("/docs");

    const response = await run(context);

    expect(next).toHaveBeenCalledTimes(1);
    expect(context.locals.auth).toMatchObject({ status: "allowed" });
    expect(response.headers.get("set-cookie")).toContain(REFRESHED_COOKIE);
  });

  it("does not redirect on public pages but still exposes the auth state", async () => {
    mockAuthState({ status: "signed_out", user: null });
    const context = createContext("/sign-in");

    await run(context);

    expect(context.redirect).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    expect(context.locals.auth).toMatchObject({ status: "signed_out" });
  });

  it("treats a public page with a trailing slash as public", async () => {
    mockAuthState({ status: "signed_out", user: null });
    const context = createContext("/sign-in/");

    await run(context);

    expect(context.redirect).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });
});
