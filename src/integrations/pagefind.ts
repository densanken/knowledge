import { readdir, readFile, rm } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import * as pagefind from "pagefind";

import { PAGEFIND_BUNDLE_DIR, PAGEFIND_SOURCE_DIR, toSearchResultUrl } from "../lib/search";

import type { AstroIntegration, AstroIntegrationLogger } from "astro";

const findHtmlFiles = async (dir: string) => {
  try {
    const entries = await readdir(dir, { recursive: true, withFileTypes: true });

    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".html"))
      .map((entry) => join(entry.parentPath, entry.name));
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return [];
    throw error;
  }
};

const throwIfErrors = (errors: string[], action: string) => {
  if (errors.length > 0) throw new Error(`Pagefind failed to ${action}:\n${errors.join("\n")}`);
};

/**
 * PAGEFIND_SOURCE_DIR に prerender された HTML から Pagefind の検索インデックスを生成する
 * @param clientDir 静的アセットの出力先ディレクトリ
 */
export const buildSearchIndex = async (clientDir: string, logger?: AstroIntegrationLogger) => {
  const sourceDir = join(clientDir, PAGEFIND_SOURCE_DIR);

  try {
    const { errors, index } = await pagefind.createIndex({ forceLanguage: "ja" });
    throwIfErrors(errors, "create the index");
    if (!index) throw new Error("Pagefind failed to create the index");

    const htmlFiles = await findHtmlFiles(sourceDir);
    for (const file of htmlFiles) {
      const response = await index.addHTMLFile({
        content: await readFile(file, "utf-8"),
        url: toSearchResultUrl(relative(sourceDir, file)),
      });
      throwIfErrors(response.errors, `index ${file}`);
    }

    // 検索対象が無い場合も空のインデックスを出力し、検索 UI がエラーにならないようにする
    const written = await index.writeFiles({ outputPath: join(clientDir, PAGEFIND_BUNDLE_DIR) });
    throwIfErrors(written.errors, "write the index");

    logger?.info(`Indexed ${htmlFiles.length.toString()} page(s) into /${PAGEFIND_BUNDLE_DIR}/`);
  } finally {
    await pagefind.close();
    // インデックス生成用の HTML は認証を経ずに配信されてしまうため、成否にかかわらず成果物から取り除く
    await rm(sourceDir, { force: true, recursive: true });
  }
};

export const pagefindIntegration = (): AstroIntegration => ({
  name: "pagefind",
  hooks: {
    "astro:build:done": async ({ dir, logger }) => {
      await buildSearchIndex(fileURLToPath(dir), logger);
    },
  },
});
