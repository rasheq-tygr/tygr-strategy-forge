import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { slugify } from "./paths.ts";

describe("title vs slug", () => {
  it("slugify still produces a stable path from an explicit slug field", () => {
    assert.equal(slugify("from-idea-to-done"), "from-idea-to-done");
    assert.equal(slugify("From Idea To Done"), "from-idea-to-done");
  });

  it("a title edit does not have to rewrite the stored slug", () => {
    const item = { title: "Launch", slug: "tygr-ventures-launch" };
    const titlePatch = { title: "TYGR Ventures launch post" };
    const next = { ...item, ...titlePatch };
    assert.equal(next.slug, "tygr-ventures-launch");
    assert.equal(slugify(next.title), "tygr-ventures-launch-post");
  });
});
