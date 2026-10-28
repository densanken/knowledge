import { env } from "cloudflare:workers";

import { PAGEFIND_BUNDLE_DIR } from "../../lib/search";

import type { APIRoute } from "astro";

export const prerender = false;

// 検索インデックスは静的アセットとして直接配信せず、middleware の認証を通過した場合のみ ASSETS から返す
// (wrangler.jsonc の assets.run_worker_first で /pagefind/* を Worker 経由にしている)
export const GET: APIRoute = async ({ params, url }) => {
  const assetURL = new URL(`/${PAGEFIND_BUNDLE_DIR}/${params.path ?? ""}`, url);
  if (!assetURL.pathname.startsWith(`/${PAGEFIND_BUNDLE_DIR}/`)) return new Response(null, { status: 404 });

  const asset = await env.ASSETS.fetch(assetURL);

  // ASSETS の応答ヘッダーは immutable なため、middleware がヘッダーを書き換えられるよう複製する
  return new Response(asset.body, asset);
};
