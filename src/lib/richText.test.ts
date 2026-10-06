import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { countBodyBlocks, renderRichHtml, splitBodyBlocks } from "./richText.ts";

describe("richText", () => {
  it("splits blank-line body blocks", () => {
    assert.deepEqual(splitBodyBlocks("One.\n\nTwo.\n\nThree."), ["One.", "Two.", "Three."]);
    assert.equal(countBodyBlocks(""), 1);
    assert.equal(countBodyBlocks("Only."), 1);
  });

  it("renders markdown emphasis and links", () => {
    const html = renderRichHtml("Hello **world** and [TYGR](https://tygrventures.com).");
    assert.match(html, /<strong>world<\/strong>/);
    assert.match(html, /<a href="https:\/\/tygrventures\.com"/);
  });

  it("allows safe HTML passthrough", () => {
    const html = renderRichHtml("<p>Plain <em>HTML</em> block.</p>");
    assert.match(html, /<em>HTML<\/em>/);
  });

  it("strips script and event-handler XSS", () => {
    const html = renderRichHtml('<p onclick="alert(1)">Hi</p><script>alert(2)</script>');
    assert.doesNotMatch(html, /script/i);
    assert.doesNotMatch(html, /onclick/i);
    assert.match(html, /Hi/);
  });
});
