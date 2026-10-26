import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { defineCollection } from "astro:content";

import { getCategories } from "./lib/internal-docs-loader";
import { basicDocsSchema, CategorySchema } from "./lib/internal-docs-schema";

const docs = defineCollection({
  loader: glob({
    pattern: "**/*.{md,mdx}",
    base: "./internal-docs/docs",
  }),
  schema: basicDocsSchema,
});

const categories = defineCollection({
  loader: async () => getCategories("./internal-docs/docs"),
  schema: CategorySchema,
});

export const collections = {
  docs,
  categories,
};
