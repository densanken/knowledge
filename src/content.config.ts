import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

// なんとなくinternal-docs側で定義していても使えそうな形でテスト
export const testSchema = z
  .object({
    title: z.string(),
    description: z.string().optional(),
  })
  .strict();

const test = defineCollection({
  loader: glob({
    pattern: "**\/[^_]*.{md,mdx}",
    base: "./internal-docs/docs",
  }),
  schema: testSchema,
});

export const collections = {
  test,
};
