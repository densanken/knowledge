import { useCallback, useEffect, useRef } from "react";

import { authClient } from "../../../lib/auth-client";

type Props = {
  authError: null | string;
};

const signOutErrorPath = "/sign-out?error=failed";

export const AuthPanel = ({ authError }: Props) => {
  const startedRef = useRef(false);

  const signOut = useCallback(async () => {
    if (startedRef.current) return;
    startedRef.current = true;

    try {
      const { error } = await authClient.signOut();

      if (error) {
        window.location.replace(signOutErrorPath);
        return;
      }

      window.location.replace("/sign-in?error=signed_out");
    } catch {
      window.location.replace(signOutErrorPath);
    } finally {
      startedRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (authError) return;

    void signOut();
  }, [authError, signOut]);

  return (
    <div className="flex flex-col items-center">
      {authError ? (
        <p className="text-center text-sm font-medium text-red-600">
          サインアウトに失敗しました。もう一度お試しください。
        </p>
      ) : (
        <p className="text-center text-sm font-medium text-gray-700">サインアウトしています...</p>
      )}
      <div className="mt-4 flex gap-4">
        <a
          className="flex items-center rounded-lg bg-gray-200 px-6 py-3 text-center text-lg font-medium text-gray-700"
          href="/"
        >
          ホームに戻る
        </a>
        <button
          className="inline-block rounded-lg bg-red-500 px-6 py-3 text-center text-lg font-medium text-white"
          onClick={() => void signOut()}
          type="button"
        >
          Sign out
          <span className="mt-0.5 block text-xs font-normal">
            {authError ? "もう一度試す" : "サインアウトを完了する"}
          </span>
        </button>
      </div>
    </div>
  );
};
