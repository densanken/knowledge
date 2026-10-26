import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { slug as githubSlug } from "github-slugger";

import type { CategoryEntry } from "./internal-docs-schema";

// ディレクトリパスからカテゴリIDを生成する
function createCategoryId(path: string): string {
  return path.split("/").map((segment) => githubSlug(segment)).join("/");
}

// MarkdownファイルのパスからドキュメントIDを生成する
function createDocId(path: string): string {
  const withoutExtension = path.replace(/\.(?:md|mdx)$/, "");
  return createCategoryId(withoutExtension).replace(/\/index$/, "");
}

export async function getCategories(directoryPath: string, relativePath = ""): Promise<CategoryEntry[]> {
  const childEntries = await readdir(directoryPath, { withFileTypes: true });

  const childDirs = childEntries.filter((entry) => entry.isDirectory());

  const descendantCategoryEntries = (
    await Promise.all(
      childDirs.map((dir) =>
        getCategories(join(directoryPath, dir.name), relativePath ? join(relativePath, dir.name) : dir.name)
      )
    )
  ).flat();

  if (relativePath === "") {
    return descendantCategoryEntries;
  }

  const id = createCategoryId(relativePath);

  const meta = JSON.parse(await readFile(join(directoryPath, "meta.json"), { encoding: "utf8" }));

  const childDocIds = childEntries
    .filter((entry) => entry.isFile() && /\.(?:md|mdx)$/.test(entry.name))
    .map((entry) => createDocId(`${relativePath}/${entry.name}`));

  const ids = new Set(descendantCategoryEntries.map((entry) => entry.id));

  const childCategoryIds = childDirs
    .map((dir) => createCategoryId(`${relativePath}/${dir.name}`))
    .filter((childId) => ids.has(childId));

  return [
    {
      id,
      categoryName: meta.categoryName,
      childDocIds,
      childCategoryIds,
    },
    ...descendantCategoryEntries,
  ];
}
