import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { defineCollection } from "astro:content";

export const basicDocsSchema = z
  .object({
    title: z.string(),
    description: z.string().optional(),
  })
  .strict();

const docs = defineCollection({
  loader: glob({
    pattern: "**/[^_]*.{md,mdx}",
    base: "./internal-docs/docs",
  }),
  schema: basicDocsSchema,
});

export const collections = {
  docs,
};
