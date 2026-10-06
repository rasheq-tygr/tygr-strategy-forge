import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deleteCollectionItem, upsertCollectionItem } from "./contentItems.ts";

describe("contentItems", () => {
  it("upserts a new insight at the front", () => {
    const next = upsertCollectionItem(
      { insights: { items: [{ id: "a", title: "A" }] } },
      "insights",
      { id: "b", title: "B" },
    );
    const items = (next.insights as { items: { id: string }[] }).items;
    assert.deepEqual(
      items.map((item) => item.id),
      ["b", "a"],
    );
  });

  it("replaces an existing item by id", () => {
    const next = upsertCollectionItem(
      { insights: { items: [{ id: "a", title: "Old" }] } },
      "insights",
      { id: "a", title: "New" },
    );
    const items = (next.insights as { items: { title: string }[] }).items;
    assert.equal(items.length, 1);
    assert.equal(items[0].title, "New");
  });

  it("appends new capabilities", () => {
    const next = upsertCollectionItem(
      { capabilities: { items: [{ id: "a" }] } },
      "capabilities",
      { id: "b" },
    );
    const items = (next.capabilities as { items: { id: string }[] }).items;
    assert.deepEqual(
      items.map((item) => item.id),
      ["a", "b"],
    );
  });

  it("deletes an item by id", () => {
    const next = deleteCollectionItem(
      { work: { items: [{ id: "a" }, { id: "b" }] } },
      "work",
      "a",
    );
    const items = (next.work as { items: { id: string }[] }).items;
    assert.deepEqual(
      items.map((item) => item.id),
      ["b"],
    );
  });
});
