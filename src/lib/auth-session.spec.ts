import { beforeEach, describe, expect, it, vi } from "vitest";

import { GUILD_RECHECK_MAX_AGE, getServerAuthState } from "./auth-session";

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));

vi.mock("./auth", () => ({
  auth: { api: { getSession } },
}));

type SessionUser = {
  guildAllowed?: boolean;
  guildCheckedAt?: number;
  guildCheckStatus?: string;
  id: string;
  imageUrl?: string;
  name: string;
  provider?: string;
  providerAccountId?: string;
  providerUsername?: string;
};

const allowedUser: SessionUser = {
  guildAllowed: true,
  guildCheckedAt: Date.now(),
  id: "user-id",
  imageUrl: "https://cdn.example.com/avatar.png",
  name: "Test User",
  provider: "discord",
  providerAccountId: "12345678901234567",
  providerUsername: "testuser",
};

const mockSession = (user: SessionUser | null, headers = new Headers()) => {
  getSession.mockResolvedValue({ headers, response: user ? { user } : null });
};

const resolveAuthState = () => getServerAuthState(new Headers(), new Headers());

beforeEach(() => {
  getSession.mockReset();
});

describe("getServerAuthState access control", () => {
  it("returns signed_out when there is no session", async () => {
    mockSession(null);

    await expect(resolveAuthState()).resolves.toMatchObject({ status: "signed_out", user: null });
  });

  it("allows a guild member with a fresh guild check", async () => {
    mockSession(allowedUser);

    const state = await resolveAuthState();
    expect(state.status).toBe("allowed");
    expect(state.user?.username).toBe("testuser");
  });

  it("forbids a user whose provider is not discord", async () => {
    mockSession({ ...allowedUser, provider: "github" });

    await expect(resolveAuthState()).resolves.toMatchObject({ reason: "not_guild_member", status: "forbidden" });
  });

  it("forbids a user who is not a guild member", async () => {
    mockSession({ ...allowedUser, guildAllowed: false, guildCheckStatus: "not_member" });

    await expect(resolveAuthState()).resolves.toMatchObject({ reason: "not_guild_member", status: "forbidden" });
  });

  it("requires a recheck when the guild check is expired", async () => {
    mockSession({ ...allowedUser, guildCheckedAt: Date.now() - (GUILD_RECHECK_MAX_AGE * 1000 + 1000) });

    await expect(resolveAuthState()).resolves.toMatchObject({ reason: "guild_check_expired", status: "needs_recheck" });
  });

  it("requires a recheck when guildCheckedAt is missing", async () => {
    mockSession({ ...allowedUser, guildCheckedAt: undefined });

    await expect(resolveAuthState()).resolves.toMatchObject({ reason: "guild_check_expired", status: "needs_recheck" });
  });

  it("reports an auth error when the guild check is misconfigured", async () => {
    mockSession({ ...allowedUser, guildCheckStatus: "misconfigured" });

    await expect(resolveAuthState()).resolves.toMatchObject({ reason: "misconfigured", status: "auth_error" });
  });

  it("reports an auth error on a discord api failure", async () => {
    mockSession({ ...allowedUser, guildCheckStatus: "api_error" });

    await expect(resolveAuthState()).resolves.toMatchObject({ reason: "discord_api_error", status: "auth_error" });
  });

  it("propagates refreshed session cookies to the response headers", async () => {
    const sessionHeaders = new Headers();
    sessionHeaders.append("set-cookie", "__Secure-better-auth.session_data=refreshed; Path=/");
    getSession.mockResolvedValue({ headers: sessionHeaders, response: { user: allowedUser } });

    const responseHeaders = new Headers();
    await getServerAuthState(new Headers(), responseHeaders);

    expect(responseHeaders.get("set-cookie")).toContain("__Secure-better-auth.session_data=refreshed");
  });

  it("splits a combined set-cookie header when getSetCookie is unavailable", async () => {
    // Cloudflare Workers の Headers が getSetCookie を持たない場合のフォールバック経路
    const sessionHeaders = {
      get: (name: string) => (name === "set-cookie" ? "first=1; Path=/, second=2; Path=/" : null),
    };
    getSession.mockResolvedValue({ headers: sessionHeaders, response: { user: allowedUser } });

    const responseHeaders = new Headers();
    await getServerAuthState(new Headers(), responseHeaders);

    expect(responseHeaders.getSetCookie()).toEqual(["first=1; Path=/", "second=2; Path=/"]);
  });
});
