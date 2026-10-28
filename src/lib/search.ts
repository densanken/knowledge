// Pagefind のバンドル (検索インデックスとクライアント JS) を配置・配信するディレクトリ
export const PAGEFIND_BUNDLE_DIR = "pagefind";

// 検索インデックスの生成元となる HTML を prerender するディレクトリ
// インデックス生成後にビルド成果物から削除し、静的アセットとして公開されないようにする
export const PAGEFIND_SOURCE_DIR = "pagefind-source";

// 検索結果でタグとして表示する Pagefind のフィルター名 (data-pagefind-filter="tag")
export const PAGEFIND_TAG_FILTER = "tag";

export const isPagefindSourcePath = (pathname: string) =>
  pathname === `/${PAGEFIND_SOURCE_DIR}` || pathname.startsWith(`/${PAGEFIND_SOURCE_DIR}/`);

/**
 * PAGEFIND_SOURCE_DIR からの相対 HTML パスを、検索結果の遷移先となる SSR ページの URL に変換する
 * @example toSearchResultUrl("docs/foo/index.html") // => "/docs/foo"
 */
export const toSearchResultUrl = (relativeHtmlPath: string) => {
  const segments = relativeHtmlPath.split(/[\\/]+/).filter(Boolean);
  const fileName = segments.pop() ?? "";

  if (fileName !== "index.html") segments.push(fileName.replace(/\.html$/, ""));

  return `/${segments.map(encodeURIComponent).join("/")}`;
};
