import { glob } from "astro/loaders";
import { defineCollection } from "astro:content";

import { getCategories } from "./lib/internal-docs-loader";
import { basicDocsSchema, categorySchema, metaDataSchema } from "./lib/internal-docs-schema";

const docs = defineCollection({
  loader: glob({
    pattern: "**/*.{md,mdx}",
    base: "./internal-docs/docs",
  }),
  schema: basicDocsSchema,
});

const categories = defineCollection({
  loader: async () => getCategories("./internal-docs/docs"),
  schema: categorySchema,
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
  categories,
  metaData,
};
