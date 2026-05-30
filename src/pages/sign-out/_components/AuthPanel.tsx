import { useEffect, useRef, useCallback } from "react";

import { authClient } from "../../../lib/auth-client";

export const AuthPanel = () => {
  const startedRef = useRef(false);

  const signOut = useCallback(async () => {
    if (startedRef.current) return;
    startedRef.current = true;

    try {
      const { error } = await authClient.signOut();

      if (error) window.location.assign("/api/auth/error?error=redirect_failed");
      window.location.assign("/sign-in?error=signed_out");
    } catch {
      // サインアウト失敗時はなにもしない
    }
  }, []);

  useEffect(() => {
    void signOut();
  }, [signOut]);

  return (
    <div className="flex flex-col items-center">
      <p className="text-center text-sm font-medium text-gray-700">サインアウトしています...</p>
      <div className="mt-4 flex gap-4">
        <a
          className="inline-block rounded-lg bg-gray-200 px-6 py-3 text-center text-lg font-medium text-gray-700"
          href="/"
        >
          ホームに戻る
          <span className="mt-0.5 block text-xs font-normal">サインアウトはしません</span>
        </a>
        <button
          className="inline-block rounded-lg bg-red-500 px-6 py-3 text-center text-lg font-medium text-white"
          onClick={() => void signOut()}
          type="button"
        >
          Sign out
          <span className="mt-0.5 block text-xs font-normal">サインアウトを完了する</span>
        </button>
      </div>
    </div>
  );
};
