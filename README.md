# knowledge

CCS のドキュメントサイトのリポジトリです。

## セットアップ

```bash
# pnpm セットアップ
corepack enable

# submodule 取得
git submodule update --init --recursive

# 依存関係インストール
pnpm i

# 開発サーバー起動
pnpm dev
```

## 全文検索

[Pagefind](https://pagefind.app/) による全文検索を `/search` で提供しています。

- 検索インデックスは `pnpm build` 時に `internal-docs` のドキュメントから生成され、`dist/client/pagefind/` に出力されます。
- 検索インデックスへのアクセスにも認証が必要なため、`wrangler.jsonc` の `assets.run_worker_first` で `/pagefind/*` を Worker (middleware) 経由にしています。
- `pnpm dev` ではインデックスが生成されないため、検索を確認する場合は `pnpm build` の後に `pnpm preview` を実行してください。
