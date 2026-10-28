import { useEffect, useState } from "react";

import { PAGEFIND_BUNDLE_DIR, PAGEFIND_TAG_FILTER } from "../../../lib/search";

type PagefindResultData = {
  url: string;
  excerpt: string;
  meta: Record<string, string | undefined>;
  filters: Record<string, string[] | undefined>;
};

type PagefindSearchResponse = {
  results: { id: string; data: () => Promise<PagefindResultData> }[];
} | null;

type Pagefind = {
  debouncedSearch: (term: string) => Promise<PagefindSearchResponse>;
  init: () => Promise<void>;
};

type SearchResult = PagefindResultData & { id: string };

// どの検索語に対する結果かを保持し、入力中の検索語と一致しない間は検索中として扱う
type SearchOutcome =
  { status: "error"; term: string } | { results: SearchResult[]; status: "done"; term: string; total: number };

const MAX_RESULTS = 20;

let pagefindPromise: Promise<Pagefind> | undefined;

// Pagefind のクライアントはビルド時に生成されるため、バンドルせず実行時に読み込む
const loadPagefind = () => {
  pagefindPromise ??= (async () => {
    const url = `/${PAGEFIND_BUNDLE_DIR}/pagefind.js`;
    const pagefind = (await import(/* @vite-ignore */ url)) as Pagefind;
    await pagefind.init();

    return pagefind;
  })().catch((error: unknown) => {
    pagefindPromise = undefined;
    throw error;
  });

  return pagefindPromise;
};

type Props = {
  initialQuery: string;
};

export const SearchPanel = ({ initialQuery }: Props) => {
  const [query, setQuery] = useState(initialQuery);
  const [outcome, setOutcome] = useState<SearchOutcome | null>(null);
  const term = query.trim();

  useEffect(() => {
    // 検索語を URL に反映し、リロードや共有で同じ検索結果を開けるようにする
    const url = new URL(window.location.href);
    if (term) url.searchParams.set("q", term);
    else url.searchParams.delete("q");
    window.history.replaceState(null, "", url);

    if (!term) return;

    const controller = new AbortController();
    const isStale = () => controller.signal.aborted;

    void (async () => {
      try {
        const pagefind = await loadPagefind();
        const search = await pagefind.debouncedSearch(term);
        // 後続の入力で破棄された検索は null になる
        if (!search || isStale()) return;

        const results = await Promise.all(
          search.results.slice(0, MAX_RESULTS).map(async (result) => ({ ...(await result.data()), id: result.id }))
        );
        if (!isStale()) setOutcome({ results, status: "done", term, total: search.results.length });
      } catch {
        if (!isStale()) setOutcome({ status: "error", term });
      }
    })();

    return () => {
      controller.abort();
    };
  }, [term]);

  const isLoading = term !== "" && outcome?.term !== term;
  const shownOutcome = term ? outcome : null;

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={(event) => {
          event.preventDefault();
        }}
        role="search"
      >
        <label className="sr-only" htmlFor="search-query">
          検索キーワード
        </label>
        <input
          // 検索ページを開いた直後に入力できるようにする
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 shadow-sm focus:border-blue-600 focus:outline-none"
          id="search-query"
          onChange={(event) => {
            setQuery(event.target.value);
          }}
          placeholder="キーワードを入力"
          type="search"
          value={query}
        />
      </form>

      <div aria-live="polite">
        {isLoading && <p className="mb-4 text-sm text-gray-500">検索中...</p>}
        {!isLoading && shownOutcome?.status === "error" && (
          <p className="text-red-600">検索インデックスを読み込めませんでした。時間をおいて再度お試しください。</p>
        )}
        {shownOutcome?.status === "done" && (
          <>
            {!isLoading && (
              <p className="mb-4 text-sm text-gray-500">
                {shownOutcome.total > 0
                  ? `${shownOutcome.total.toString()} 件見つかりました`
                  : "該当するドキュメントは見つかりませんでした"}
                {shownOutcome.total > MAX_RESULTS && `（上位 ${MAX_RESULTS.toString()} 件を表示）`}
              </p>
            )}
            <ul className="flex flex-col gap-4">
              {shownOutcome.results.map((result) => (
                <li className="rounded-lg border border-neutral-300/60 p-4" key={result.id}>
                  <a className="text-lg font-bold text-blue-600 hover:underline" href={result.url}>
                    {result.meta.title ?? result.url}
                  </a>
                  {(result.filters[PAGEFIND_TAG_FILTER] ?? []).length > 0 && (
                    <ul aria-label="タグ" className="mt-2 flex flex-wrap gap-2">
                      {result.filters[PAGEFIND_TAG_FILTER]?.map((tag) => (
                        <li className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700" key={tag}>
                          {tag}
                        </li>
                      ))}
                    </ul>
                  )}
                  <p
                    className="mt-2 text-sm text-gray-700 [&_mark]:bg-yellow-200"
                    // Pagefind が生成する抜粋は検索語を <mark> で囲んだ HTML になっている
                    dangerouslySetInnerHTML={{ __html: result.excerpt }}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
};
