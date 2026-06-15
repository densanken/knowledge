import { defineMiddleware } from "astro:middleware";

import { appendSetCookieHeaders, getServerAuthState } from "./lib/auth-session";

// trailing slash の有無で判定がぶれないよう pathname を正規化する
const normalizePathname = (pathname: string) => (pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname);

// OAuth callback を含む better-auth handler は認証ガードから除外し、認証ループを避ける
const isAuthApiPath = (pathname: string) => pathname.startsWith("/api/auth/");

// middleware に到達しうる静的アセットは許可リストで除外する
const PUBLIC_ASSET_PATHS = new Set(["/favicon.ico", "/robots.txt"]);
const isAssetPath = (pathname: string) => pathname.startsWith("/_astro/") || PUBLIC_ASSET_PATHS.has(pathname);

// 認証ループを避けるため、認証ガードの対象外にする公開ページ
const PUBLIC_PAGES = new Set(["/sign-in", "/sign-out", "/access-denied"]);
const isPublicPage = (pathname: string) => PUBLIC_PAGES.has(pathname);

export const onRequest = defineMiddleware(async (context, next) => {
  const pathname = normalizePathname(context.url.pathname);

  if (isAuthApiPath(pathname) || isAssetPath(pathname)) return next();

  // session cookie の再発行を取りこぼさないよう、認証状態の判定で得た set-cookie を保持する
  const cookieHeaders = new Headers();
  const authState = await getServerAuthState(context.request.headers, cookieHeaders);
  context.locals.auth = authState;

  const finalizeResponse = (response: Response) => {
    appendSetCookieHeaders(cookieHeaders, response.headers);
    // 認証状態に依存する応答は共有キャッシュやブラウザ履歴に残さない
    response.headers.set("cache-control", "private, no-store");
    return response;
  };

  // 公開ページは認証状態をページ側で参照できるようにしつつ、リダイレクトは行わない
  if (isPublicPage(pathname)) return finalizeResponse(await next());

  const callbackURL = encodeURIComponent(`${context.url.pathname}${context.url.search}`);

  switch (authState.status) {
    case "signed_out":
      return finalizeResponse(context.redirect(`/sign-in?callbackURL=${callbackURL}`, 302));
    case "needs_recheck":
      return finalizeResponse(context.redirect(`/sign-in?mode=recheck&callbackURL=${callbackURL}`, 302));
    case "forbidden":
    case "auth_error":
      return finalizeResponse(context.redirect(`/access-denied?reason=${authState.reason}`, 302));
    default:
      return finalizeResponse(await next());
  }
});
