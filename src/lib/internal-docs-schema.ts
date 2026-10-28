import { z } from "astro/zod";

export const basicDocsSchema = z
  .object({
    title: z.string(),
    description: z.string().optional(),
  })
  .strict();

export const categorySchema = z
  .object({
    id: z.string(),
    categoryName: z.string(),
    childDocIds: z.array(z.string()),
    childCategoryIds: z.array(z.string()),
  })
  .strict();

export const metaDataSchema = z
  .object({
    categoryName: z.string(),
  })
  .strict();

export type CategoryEntry = z.infer<typeof categorySchema>;

export type MetaDataEntry = z.infer<typeof metaDataSchema>;
