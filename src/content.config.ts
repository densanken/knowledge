import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { defineCollection } from "astro:content";

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

export const collections = {
  docs,
  metaData,
};
