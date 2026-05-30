import type { APIRoute } from "astro";

export const prerender = false;

const toPublicAuthError = (error: string | null) => {
  switch (error) {
    case "access_denied": // ユーザーが認証画面で許可せず、認証をキャンセル・拒否したとき
      return "oauth_cancelled";

    case "state_not_found": // OAuth callback に state が含まれていないとき
    case "state_invalid": // cookie に保存された state の復号, parse に失敗したとき
    case "state_mismatch": // state が一致しない, 期限切れ, cookie が消えた, 別ブラウザで戻ってきた等のとき
      return "auth_session_expired";

    case "oAuth_code_missing": // Generic OAuth callback に code がないとき
    case "no_code": // OAuth callback に authorization code が含まれていないとき
      return "auth_failed";

    case "invalid_code": // authorization code の検証に失敗したとき
    case "oauth_code_verification_failed": // Generic OAuth で token exchange に失敗したとき
      return "auth_failed";

    case "issuer_mismatch": // OAuth/OIDC provider の issuer が期待値と一致しないとき
    case "issuer_missing": // issuer validation 必須なのに iss が返ってこなかったとき
      return "auth_failed";

    default:
      return "auth_failed";
  }
};

export const GET: APIRoute = ({ url, redirect }) => {
  const error = url.searchParams.get("error");
  const publicError = toPublicAuthError(error);

  return redirect(`/sign-in?error=${encodeURIComponent(publicError)}&raw=${encodeURIComponent(error ?? "")}`, 302);
};
