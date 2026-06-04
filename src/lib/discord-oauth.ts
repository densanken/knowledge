import { checkCurrentDiscordUserGuildMembership } from "./discord-guild";

import type { DiscordGuildMembershipResult } from "./discord-guild";
import type { ProviderOptions } from "better-auth/oauth2";
import type { GenericOAuthConfig } from "better-auth/plugins/generic-oauth";
import type { DiscordOptions, DiscordProfile } from "better-auth/social-providers";

type DiscordOAuthProfile = Pick<
  DiscordProfile,
  "avatar" | "discriminator" | "email" | "global_name" | "id" | "image_url" | "username" | "verified"
> & {
  name: string;
  emailVerified: boolean;
  guildAllowed: boolean;
  guildCheckedAt: number | null;
  guildCheckStatus: DiscordGuildMembershipResult["status"];
  provider: "discord";
  providerAccountId: string;
  providerUsername: string;
};

type DiscordOAuthOptions = ProviderOptions<DiscordOAuthProfile> & {
  authorizationEndpoint: string;
  clientId: string;
  clientSecret: string;
  mapProfileToUser: NonNullable<ProviderOptions<DiscordOAuthProfile>["mapProfileToUser"]>;
  overrideUserInfoOnSignIn: true;
  scope: string[];
};

type CreateDiscordOAuthProviderOptions = {
  allowedGuildId: string;
  clientId: string;
  clientSecret: string;
  prompt?: DiscordOptions["prompt"];
  providerId: "discord" | "discord_recheck";
};

type CreateGenericOAuthConfigOptions = {
  allowedGuildId: string;
  providerId: CreateDiscordOAuthProviderOptions["providerId"];
  providerOptions: DiscordOAuthOptions;
};

const DISCORD_API_BASE_URL = "https://discord.com/api/v10";
const DISCORD_OAUTH_BASE_URL = "https://discord.com/api/oauth2";
const DISCORD_OAUTH_SCOPES = ["identify", "email", "guilds.members.read"] as const;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

const getString = (value: Record<string, unknown>, key: string): string | null => {
  const field = value[key];
  return typeof field === "string" ? field : null;
};

const getBoolean = (value: Record<string, unknown>, key: string): boolean | null => {
  const field = value[key];
  return typeof field === "boolean" ? field : null;
};

const getNumber = (value: Record<string, unknown>, key: string): number | null => {
  const field = value[key];
  return typeof field === "number" && Number.isFinite(field) ? field : null;
};

const getGuildCheckStatus = (value: unknown): DiscordOAuthProfile["guildCheckStatus"] => {
  if (value === "allowed" || value === "not_member" || value === "misconfigured" || value === "api_error") return value;

  return "api_error";
};

const toDiscordOAuthProfileFromRecord = (value: Record<string, unknown>): DiscordOAuthProfile | null => {
  const id = getString(value, "id");
  const username = getString(value, "username");
  if (!id || !username) return null;

  const globalName = getString(value, "global_name");
  const verified = getBoolean(value, "verified") ?? getBoolean(value, "emailVerified") ?? false;

  return {
    id,
    name: getString(value, "name") ?? globalName ?? username,
    username,
    global_name: globalName,
    avatar: getString(value, "avatar"),
    image_url: getString(value, "image_url") ?? "",
    discriminator: getString(value, "discriminator") ?? "0",
    email: getString(value, "email"),
    verified,
    emailVerified: verified,
    provider: "discord",
    providerAccountId: getString(value, "providerAccountId") ?? id,
    providerUsername: getString(value, "providerUsername") ?? username,
    guildAllowed: getBoolean(value, "guildAllowed") ?? false,
    guildCheckedAt: getNumber(value, "guildCheckedAt"),
    guildCheckStatus: getGuildCheckStatus(value.guildCheckStatus),
  } satisfies DiscordOAuthProfile;
};

const toDiscordCurrentUser = (value: unknown): DiscordOAuthProfile | null => {
  if (!isRecord(value)) return null;

  return toDiscordOAuthProfileFromRecord(value);
};

const getDiscordAvatarUrl = (profile: DiscordOAuthProfile) => {
  // https://github.com/better-auth/better-auth/blob/main/packages/core/src/social-providers/discord.ts#L145-L154
  if (profile.avatar === null) {
    const defaultAvatarNumber =
      profile.discriminator === "0"
        ? Number(BigInt(profile.id) >> BigInt(22)) % 6
        : parseInt(profile.discriminator) % 5;
    return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarNumber.toString()}.png`;
  }

  const format = profile.avatar.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.${format}`;
};

const fetchDiscordCurrentUser = async (
  accessToken: string,
  fetcher: typeof fetch
): Promise<DiscordOAuthProfile | null> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 10_000);

  try {
    const response = await fetcher(`${DISCORD_API_BASE_URL}/users/@me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      signal: controller.signal,
    });

    if (!response.ok) return null;

    const body: unknown = await response.json();
    return toDiscordCurrentUser(body);
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
};

const toDiscordOAuthUserInfo = (
  profile: DiscordOAuthProfile,
  guildMembership: DiscordGuildMembershipResult
): DiscordOAuthProfile => {
  const guildAllowed = guildMembership.status === "allowed";
  const imageUrl = getDiscordAvatarUrl(profile);

  return {
    ...profile,
    image_url: imageUrl,
    name: profile.global_name ?? profile.username,
    guildAllowed,
    guildCheckedAt:
      guildMembership.status === "api_error" || guildMembership.status === "misconfigured" ? null : Date.now(),
    guildCheckStatus: guildMembership.status,
  };
};

const getDiscordOAuthUserInfo = async (
  accessToken: string | undefined,
  allowedGuildId: string
): Promise<DiscordOAuthProfile | null> => {
  if (!accessToken) return null;

  const profile = await fetchDiscordCurrentUser(accessToken, fetch);
  if (!profile) return null;

  const guildMembership = await checkCurrentDiscordUserGuildMembership({
    accessToken,
    allowedGuildId,
  });

  return toDiscordOAuthUserInfo(profile, guildMembership);
};

const getKnownDiscordOAuthUserInfo = (value: unknown): DiscordOAuthProfile => {
  const profile = toDiscordOAuthProfileFromRecord(isRecord(value) ? value : {});
  if (profile) return profile;

  throw new Error("Discord OAuth profile could not be parsed.");
};

const mapDiscordProfileToUser = ((profile) => ({
  id: profile.id,
  name: profile.name,
  email: profile.email ?? undefined,
  emailVerified: profile.emailVerified,
  imageUrl: profile.image_url,
  provider: "discord",
  providerAccountId: profile.providerAccountId,
  providerUsername: profile.providerUsername,
  guildAllowed: profile.guildAllowed,
  guildCheckedAt: profile.guildCheckedAt,
  guildCheckStatus: profile.guildCheckStatus,
})) satisfies NonNullable<DiscordOAuthOptions["mapProfileToUser"]>;

const toGenericOAuthConfig = ({
  allowedGuildId,
  providerId,
  providerOptions,
}: CreateGenericOAuthConfigOptions): GenericOAuthConfig => {
  return {
    providerId,
    authorizationUrl: providerOptions.authorizationEndpoint,
    tokenUrl: `${DISCORD_OAUTH_BASE_URL}/token`,
    clientId: providerOptions.clientId,
    clientSecret: providerOptions.clientSecret,
    authentication: "post",
    overrideUserInfo: providerOptions.overrideUserInfoOnSignIn,
    scopes: providerOptions.scope,
    prompt: providerOptions.prompt,
    getUserInfo: (tokens) => getDiscordOAuthUserInfo(tokens.accessToken, allowedGuildId),
    mapProfileToUser: async (profile) => {
      const user = await providerOptions.mapProfileToUser(getKnownDiscordOAuthUserInfo(profile));

      return {
        ...user,
        email: user.email ?? undefined,
      };
    },
  };
};

export const createDiscordOAuthProvider = ({
  allowedGuildId,
  clientId,
  clientSecret,
  prompt,
  providerId,
}: CreateDiscordOAuthProviderOptions): GenericOAuthConfig =>
  toGenericOAuthConfig({
    allowedGuildId,
    providerId,
    providerOptions: {
      authorizationEndpoint: `${DISCORD_OAUTH_BASE_URL}/authorize`,
      clientId,
      clientSecret,
      mapProfileToUser: mapDiscordProfileToUser,
      overrideUserInfoOnSignIn: true,
      prompt,
      scope: [...DISCORD_OAUTH_SCOPES],
    } satisfies DiscordOAuthOptions,
  });
