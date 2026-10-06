import DOMPurify from "isomorphic-dompurify";
import { marked } from "marked";

marked.setOptions({
  gfm: true,
  breaks: false,
});

const purifyConfig = {
  USE_PROFILES: { html: true },
  FORBID_TAGS: ["style", "script", "iframe", "object", "embed", "form"],
  FORBID_ATTR: ["style", "onerror", "onclick", "onload"],
};

/** Blank-line-separated body blocks (gallery placement uses these indices). */
export function splitBodyBlocks(body: string): string[] {
  if (!body.trim()) return [];
  return body
    .split(/\n\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function countBodyBlocks(body: string): number {
  return Math.max(splitBodyBlocks(body).length, 1);
}

/** Parse Markdown (and passthrough HTML) then sanitize for safe rendering. */
export function renderRichHtml(source: string): string {
  if (!source.trim()) return "";
  const parsed = marked.parse(source, { async: false });
  const html = typeof parsed === "string" ? parsed : "";
  return DOMPurify.sanitize(html, purifyConfig);
}

/** Render each blank-line block, matching public insight pages + gallery placement. */
export function renderRichBlocksHtml(source: string): string {
  const blocks = splitBodyBlocks(source);
  if (!blocks.length) return "";
  return blocks.map((block) => renderRichHtml(block)).join("");
}
