import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeTextSize, typeSizeClass } from "./textSize.ts";

describe("textSize", () => {
  it("defaults unknown values to medium", () => {
    assert.equal(normalizeTextSize(undefined), "m");
    assert.equal(normalizeTextSize(""), "m");
    assert.equal(normalizeTextSize("xl"), "m");
  });

  it("keeps small and large", () => {
    assert.equal(normalizeTextSize("s"), "s");
    assert.equal(normalizeTextSize("l"), "l");
  });

  it("builds a type-size class name", () => {
    assert.equal(typeSizeClass("l", "lede"), "lede type-size-l");
    assert.equal(typeSizeClass(undefined, "article-copy"), "article-copy type-size-m");
  });
});
