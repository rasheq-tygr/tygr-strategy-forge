export type ContentCollection = "insights" | "work" | "capabilities";

export const CONTENT_COLLECTIONS: ContentCollection[] = ["insights", "work", "capabilities"];

export function isContentCollection(value: unknown): value is ContentCollection {
  return typeof value === "string" && (CONTENT_COLLECTIONS as string[]).includes(value);
}

type ItemRecord = { id?: unknown } & Record<string, unknown>;

/** Upsert one collection item into a site content object (by id). */
export function upsertCollectionItem(
  content: Record<string, unknown>,
  collection: ContentCollection,
  item: ItemRecord,
  options?: { prependNew?: boolean },
): Record<string, unknown> {
  const id = typeof item.id === "string" ? item.id.trim() : "";
  if (!id) throw new Error("Item id is required");
  const normalized = { ...item, id };

  const section = (content[collection] ?? {}) as Record<string, unknown>;
  const items = Array.isArray(section.items) ? ([...section.items] as ItemRecord[]) : [];
  const index = items.findIndex(
    (entry) => entry && typeof entry.id === "string" && entry.id.trim() === id,
  );
  if (index >= 0) {
    items[index] = normalized;
  } else if (options?.prependNew ?? collection !== "capabilities") {
    items.unshift(normalized);
  } else {
    items.push(normalized);
  }

  return {
    ...content,
    [collection]: {
      ...section,
      items,
    },
  };
}

/** Remove one collection item by id. */
export function deleteCollectionItem(
  content: Record<string, unknown>,
  collection: ContentCollection,
  deleteId: string,
): Record<string, unknown> {
  const id = deleteId.trim();
  if (!id) throw new Error("deleteId is required");

  const section = (content[collection] ?? {}) as Record<string, unknown>;
  const items = Array.isArray(section.items) ? (section.items as ItemRecord[]) : [];

  return {
    ...content,
    [collection]: {
      ...section,
      items: items.filter((entry) => !entry || entry.id !== id),
    },
  };
}
