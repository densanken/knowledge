import { useCallback, useEffect, useRef } from "react";

import { authClient } from "../../../lib/auth-client";

type Props = {
  authError: null | string;
  callbackURL: null | string;
  mode: "recheck" | "sign-in";
};

const authErrorMessages: Record<string, string> = {
  oauth_cancelled: "認証がキャンセルされました。",
  auth_session_expired: "認証セッションの有効期限が切れました。もう一度お試しください。",
  auth_failed: "認証に失敗しました。もう一度お試しください。",
  guild_recheck_failed: "アクセス権の再確認に失敗しました。もう一度お試しください。",
  signed_out: "サインアウトしました。",
} as const;

const getSafeCallbackURL = (callbackURL: null | string) => {
  if (!callbackURL?.startsWith("/")) return "/";
  if (callbackURL.startsWith("//")) return "/";

  return callbackURL;
};

export const AuthPanel = ({ authError, callbackURL, mode }: Props) => {
  const startedRef = useRef(false);
  const isRecheck = mode === "recheck";

  const signIn = useCallback(async () => {
    if (startedRef.current) return;
    startedRef.current = true;

    try {
      const { error } = await authClient.signIn.oauth2({
        callbackURL: getSafeCallbackURL(callbackURL),
        errorCallbackURL: "/api/auth/error",
        providerId: isRecheck ? "discord_recheck" : "discord",
      });

      if (error) window.location.replace("/api/auth/error?error=redirect_failed");
    } catch {
      window.location.replace("/api/auth/error?error=redirect_failed");
    } finally {
      startedRef.current = false;
    }
  }, [callbackURL, isRecheck]);

  useEffect(() => {
    if (authError) return;

    void signIn();
  }, [authError, signIn]);

  return (
    <div>
      <h1 className="mb-4 text-center text-lg font-medium text-gray-700">
        {isRecheck ? "Access check" : "Sign in"} - CCS Internal Docs
      </h1>
      <div className="flex flex-col items-center">
        {authError ? (
          <div className="mb-6 rounded-lg bg-red-100 p-4 text-red-700 md:mb-0">
            {authErrorMessages[authError] ?? "認証処理でエラーが発生しました。"}
          </div>
        ) : (
          <p className="text-center text-sm font-medium text-gray-700">
            {isRecheck ? "アクセス権を再確認しています..." : "Discord にリダイレクトしています..."}
          </p>
        )}
        <div className="mt-4 flex flex-col-reverse gap-x-4 gap-y-2 md:flex-row">
          <a
            className="flex items-center justify-center rounded-xl bg-gray-200 px-6 py-3 text-lg font-medium text-gray-700"
            href="/"
          >
            ホームに戻る
          </a>
          <button
            className="rounded-xl bg-[#5865F2] px-6 py-3 text-lg font-medium text-white"
            onClick={() => void signIn()}
            type="button"
          >
            {isRecheck ? "Recheck with Discord" : "Sign in with Discord"}
            <span className="mt-0.5 block text-xs font-normal">
              {authError
                ? authError === "signed_out"
                  ? "再度サインインする"
                  : "もう一度試す"
                : "リダイレクトされない場合はこちら"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
