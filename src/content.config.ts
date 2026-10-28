import { glob } from "astro/loaders";
import { defineCollection } from "astro:content";

import { basicDocsSchema, metaDataSchema } from "./lib/internal-docs-schema";

const docs = defineCollection({
  loader: glob({
    pattern: "**/*.{md,mdx}",
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
