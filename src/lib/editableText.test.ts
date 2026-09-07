import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readEditableText, writeEditableText } from "./editableText.ts";

describe("readEditableText", () => {
  it("uses textContent for single-line fields", () => {
    const node = { textContent: "Helloworld", innerText: "Hello\nworld" } as HTMLElement;
    assert.equal(readEditableText(node, false), "Helloworld");
  });

  it("uses innerText so br and block splits keep their newlines", () => {
    const node = { textContent: "Helloworld", innerText: "Hello\n\nworld\n" } as HTMLElement;
    assert.equal(readEditableText(node, true), "Hello\n\nworld");
  });
});

describe("writeEditableText", () => {
  it("assigns innerText for multiline copy so newlines become breaks", () => {
    const node = { innerText: "", textContent: "" } as HTMLElement;
    writeEditableText(node, "Hello\nworld", true);
    assert.equal(node.innerText, "Hello\nworld");
  });

  it("assigns textContent for single-line copy", () => {
    const node = { innerText: "", textContent: "old" } as HTMLElement;
    writeEditableText(node, "next", false);
    assert.equal(node.textContent, "next");
  });
});
