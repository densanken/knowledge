import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { defineCollection } from "astro:content";

// なんとなくinternal-docs側で定義していても使えそうな形でテスト
export const basicPostSchema = z
  .object({
    title: z.string(),
    description: z.string().optional(),
  })
  .strict();

const allPosts = defineCollection({
  loader: glob({
    pattern: "**/[^_]*.{md,mdx}",
    base: "./internal-docs/docs",
  }),
  schema: basicPostSchema,
});

export const collections = {
  allPosts,
};
