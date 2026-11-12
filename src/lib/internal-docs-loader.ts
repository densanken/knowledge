import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { slug as githubSlug } from "github-slugger";

import { metaDataSchema } from "./internal-docs-schema";

import type { CategoryEntry } from "./internal-docs-schema";

// カテゴリの階層からカテゴリIDを生成する
function createCategoryId(segments: string[]): string {
  return segments.map((segment) => githubSlug(segment)).join("/");
}

// ドキュメントの階層からドキュメントIDを生成する
function createDocId(segments: string[]): string {
  const pathSegments = [...segments];
  const filename = pathSegments.pop();

  if (!filename) {
    throw new Error("ドキュメントのファイル名が指定されていません");
  }

  const name = filename.replace(/\.(?:md|mdx)$/, "");

  return createCategoryId([...pathSegments, name]).replace(/\/index$/, "");
}

export async function getCategories(directoryPath: string, categorySegments: string[] = []): Promise<CategoryEntry[]> {
  const childEntries = await readdir(directoryPath, { withFileTypes: true });

  // ルート以外で meta.json がなければ探索を終了する
  if (categorySegments.length > 0 && !childEntries.some((entry) => entry.isFile() && entry.name === "meta.json")) {
    return [];
  }

  const childDirs = childEntries.filter((entry) => entry.isDirectory());

  // 下位カテゴリを再帰的に取得する
  // 後で meta.json 持ちか判断するためにflatにする前のものも保持
  const childCategoryGroups = await Promise.all(
    childDirs.map((dir) => getCategories(join(directoryPath, dir.name), [...categorySegments, dir.name]))
  );

  // 一列に並べる
  const descendantCategoryEntries = childCategoryGroups.flat();

  // ルートディレクトリはカテゴリとして登録しない
  if (categorySegments.length === 0) {
    return descendantCategoryEntries;
  }

  const id = createCategoryId(categorySegments);

  const meta = metaDataSchema.parse(JSON.parse(await readFile(join(directoryPath, "meta.json"), { encoding: "utf8" })));

  // 直下のドキュメントIDを取得する
  const childDocIds = childEntries
    .filter((entry) => entry.isFile() && /\.(?:md|mdx)$/.test(entry.name))
    .map((entry) => createDocId([...categorySegments, entry.name]));

  // 直下のカテゴリIDを取得する
  const childCategoryIds = childCategoryGroups.filter((entries) => entries.length > 0).map((entries) => entries[0].id);

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
