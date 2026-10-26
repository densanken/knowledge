import { getEntry, type CollectionEntry } from "astro:content";

export interface DocSummary {
  id: string;
  title: CollectionEntry<"docs">["data"]["title"];
  description: CollectionEntry<"docs">["data"]["description"];
}

export interface CategorySummary {
  id: string;
  categoryName: string;
  docSummaries: DocSummary[];
  nestedCategorySummaries: CategorySummary[];
}

export async function getCategorySummary(
  category: CollectionEntry<"categories">
): Promise<CategorySummary> {
  const docSummaries = await Promise.all(
    category.data.childDocIds.map(async (docId) => {
      const doc = await getEntry("docs", docId);

      if (!doc) {
        throw new Error(`Document not found: ${docId}`);
      }

      return {
        id: doc.id,
        title: doc.data.title,
        description: doc.data.description,
      };
    })
  );

  const nestedCategorySummaries = await Promise.all(
    category.data.childCategoryIds.map(async (childCategoryId) => {
      const childCategory = await getEntry("categories", childCategoryId);

      if (!childCategory) {
        throw new Error(`Category not found: ${childCategoryId}`);
      }

      return getCategorySummary(childCategory);
    })
  );

  return {
    id: category.id,
    categoryName: category.data.categoryName,
    docSummaries,
    nestedCategorySummaries,
  };
}
