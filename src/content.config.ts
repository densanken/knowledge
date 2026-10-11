import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { defineCollection } from "astro:content";

import { readdir, readFile } from "node:fs/promises";
import { join, parse } from "node:path";

interface CategoryData {
  id: string;
  categoryName: string;
  docs: string[];
  subCategories: string[];
}

async function getCategories(directoryPath: string, relativePath = ""): Promise<CategoryData[]> {
  const entries = await readdir(directoryPath, { withFileTypes: true });

  const dirs = entries.filter((entry) => entry.isDirectory());

  const nestedCategories = (
    await Promise.all(
      dirs.map((dir) =>
        getCategories(join(directoryPath, dir.name), relativePath ? join(relativePath, dir.name) : dir.name)
      )
    )
  ).flat();

  if (relativePath === "") {
    return nestedCategories;
  }

  const meta = JSON.parse(await readFile(join(directoryPath, "meta.json"), { encoding: "utf8" }));

  const docs = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => `${relativePath}/${parse(entry.name).name}`);

  const ids = new Set(nestedCategories.map((nestedCategory) => nestedCategory.id));

  const subCategories = dirs.map((dir) => `${relativePath}/${dir.name}`).filter((childId) => ids.has(childId));

  return [
    {
      id: relativePath,
      categoryName: meta.categoryName,
      docs,
      subCategories,
    },
    ...nestedCategories,
  ];
}

export const basicDocsSchema = z
  .object({
    title: z.string(),
    description: z.string().optional(),
  })
  .strict();

export const metaDataSchema = z
  .object({
    categoryName: z.string(),
  })
  .strict();

export const CategorySchema = z
  .object({
    id: z.string(),
    categoryName: z.string(),
    docs: z.array(z.string()),
    subCategories: z.array(z.string()),
  })
  .strict();

// 一応アンダースコア始まりのファイルはフィルターから外れる仕様になっています。
const docs = defineCollection({
  loader: glob({
    pattern: "**/[^_]*.{md,mdx}",
    base: "./internal-docs/docs",
  }),
  schema: basicDocsSchema,
});

const metaData = defineCollection({
  loader: glob({
    pattern: "**/meta.json",
    base: "./internal-docs/docs",
  }),
  schema: metaDataSchema,
});

const categories = defineCollection({
  loader: async () => getCategories("./internal-docs/docs"),
  schema: CategorySchema,
});

export const collections = {
  docs,
  metaData,
  categories,
};
