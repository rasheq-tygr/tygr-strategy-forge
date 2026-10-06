import { useMemo, useRef, useState } from "react";
import { countBodyBlocks, renderRichHtml, splitBodyBlocks } from "../../lib/richText";

type Props = {
  value: string;
  onChange: (value: string) => void;
  /** When true, show how many gallery placement blocks the body produces. */
  showBlockHint?: boolean;
};

type Mode = "write" | "preview";

function wrapSelection(value: string, start: number, end: number, before: string, after: string) {
  const selected = value.slice(start, end) || "text";
  const next = value.slice(0, start) + before + selected + after + value.slice(end);
  const cursor = start + before.length + selected.length + after.length;
  return { next, cursor };
}

export function RichBodyEditor({ value, onChange, showBlockHint = false }: Props) {
  const [mode, setMode] = useState<Mode>("write");
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const blocks = useMemo(() => splitBodyBlocks(value), [value]);
  const previewHtml = useMemo(() => renderRichHtml(value), [value]);

  const insertAtCursor = (before: string, after = "") => {
    const textarea = areaRef.current;
    if (!textarea) {
      onChange(value + before + after);
      return;
    }
    const { next, cursor } = wrapSelection(value, textarea.selectionStart, textarea.selectionEnd, before, after);
    onChange(next);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  return (
    <div className="editor-rich-body">
      <div className="editor-section-head">
        <h3>Body</h3>
        <div className="editor-inline-actions">
          <button
            type="button"
            className={mode === "write" ? "btn btn-ghost is-active" : "btn btn-ghost"}
            onClick={() => setMode("write")}
          >
            Write
          </button>
          <button
            type="button"
            className={mode === "preview" ? "btn btn-ghost is-active" : "btn btn-ghost"}
            onClick={() => setMode("preview")}
          >
            Preview
          </button>
        </div>
      </div>
      <p className="editor-field-hint">
        Markdown and HTML. Separate blocks with a blank line
        {showBlockHint ? ` — gallery placement uses those ${countBodyBlocks(value)} block(s).` : "."}
      </p>

      {mode === "write" ? (
        <>
          <div className="editor-rich-toolbar">
            <button type="button" onClick={() => insertAtCursor("**", "**")}>
              Bold
            </button>
            <button type="button" onClick={() => insertAtCursor("_", "_")}>
              Italic
            </button>
            <button type="button" onClick={() => insertAtCursor("[", "](https://)")}>
              Link
            </button>
            <button type="button" onClick={() => insertAtCursor("## ", "")}>
              Heading
            </button>
            <button type="button" onClick={() => insertAtCursor("- ", "")}>
              List
            </button>
            <button type="button" onClick={() => onChange(value.trim() ? `${value.trimEnd()}\n\n` : "")}>
              New block
            </button>
          </div>
          <label className="editor-field">
            <span className="editor-field-label">Markdown / HTML</span>
            <textarea
              ref={areaRef}
              className="editor-rich-source"
              value={value}
              spellCheck
              onChange={(event) => onChange(event.target.value)}
              placeholder={
                "Write in Markdown or HTML.\n\n**Bold**, _italic_, [links](https://…), lists, and headings all work."
              }
            />
          </label>
          {showBlockHint && blocks.length ? (
            <ol className="editor-rich-blocks">
              {blocks.map((block, index) => (
                <li key={index}>
                  <strong>Block {index + 1}</strong>
                  <span>
                    {block.replace(/\s+/g, " ").slice(0, 80)}
                    {block.length > 80 ? "…" : ""}
                  </span>
                </li>
              ))}
            </ol>
          ) : null}
        </>
      ) : (
        <div className="editor-rich-preview">
          {previewHtml ? (
            <div className="article-rich" dangerouslySetInnerHTML={{ __html: previewHtml }} />
          ) : (
            <p className="editor-empty">Nothing to preview yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
