export type DiscordGuildMembershipResult =
  | { status: "allowed" }
  | { status: "not_member" }
  | { status: "misconfigured"; reason: "invalid_guild_id" | "missing_access_token" | "missing_env" }
  | { status: "api_error"; retryAfter?: number; statusCode?: number };

type CheckDiscordGuildMembershipInput = {
  accessToken: string | undefined;
  allowedGuildId: string;
  fetch?: typeof fetch;
};

type DiscordRateLimitResponse = {
  retry_after?: unknown;
};

const DISCORD_API_BASE_URL = "https://discord.com/api/v10";
const discordSnowflakePattern = /^[1-9]\d{16,18}$/;

export const isDiscordSnowflake = (value: string): boolean => discordSnowflakePattern.test(value);

const isDiscordRateLimitResponse = (value: unknown): value is DiscordRateLimitResponse =>
  typeof value === "object" && value !== null && "retry_after" in value;

const getRetryAfter = async (response: Response): Promise<number | undefined> => {
  const retryAfterHeader = response.headers.get("retry-after");

  if (retryAfterHeader) {
    const retryAfterSeconds = Number(retryAfterHeader);
    if (Number.isFinite(retryAfterSeconds)) return retryAfterSeconds;
  }

  try {
    const body: unknown = JSON.parse(await response.clone().text());

    if (isDiscordRateLimitResponse(body) && typeof body.retry_after === "number" && Number.isFinite(body.retry_after)) {
      return body.retry_after;
    }
  } catch {
    return undefined;
  }

  return undefined;
};

export const checkCurrentDiscordUserGuildMembership = async ({
  accessToken,
  allowedGuildId,
  fetch: fetcher = fetch,
}: CheckDiscordGuildMembershipInput): Promise<DiscordGuildMembershipResult> => {
  if (!allowedGuildId) return { status: "misconfigured", reason: "missing_env" };
  if (!accessToken) return { status: "misconfigured", reason: "missing_access_token" };
  if (!isDiscordSnowflake(allowedGuildId)) return { status: "misconfigured", reason: "invalid_guild_id" };

  try {
    const response = await fetcher(`${DISCORD_API_BASE_URL}/users/@me/guilds/${allowedGuildId}/member`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.status === 200) return { status: "allowed" };
    if (response.status === 404) return { status: "not_member" };

    if (response.status === 429) {
      return {
        status: "api_error",
        retryAfter: await getRetryAfter(response),
        statusCode: response.status,
      };
    }

    return {
      status: "api_error",
      statusCode: response.status,
    };
  } catch {
    return { status: "api_error" };
  }
};
