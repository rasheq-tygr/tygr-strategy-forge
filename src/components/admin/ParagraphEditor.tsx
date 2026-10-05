function splitBody(body: string) {
  const parts = body.split(/\n\n+/).map((part) => part.trim());
  return parts.length ? parts : [""];
}

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export function ParagraphEditor({ value, onChange }: Props) {
  const paragraphs = splitBody(value);

  const commit = (next: string[]) => {
    onChange(
      next
        .map((part) => part.trim())
        .filter((part, _index, all) => part || all.length === 1)
        .join("\n\n"),
    );
  };

  return (
    <div className="editor-paragraphs">
      <div className="editor-section-head">
        <h3>Body</h3>
        <button type="button" className="btn btn-ghost" onClick={() => commit([...paragraphs, ""])}>
          Add paragraph
        </button>
      </div>
      <p className="editor-field-hint">
        Each block is one paragraph on the public page. Gallery photos can sit after a numbered paragraph.
      </p>
      {paragraphs.map((paragraph, index) => (
        <div className="editor-paragraph" key={index}>
          <div className="editor-section-head">
            <strong>Paragraph {index + 1}</strong>
            <div className="editor-inline-actions">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => {
                  const next = [...paragraphs];
                  [next[index - 1], next[index]] = [next[index], next[index - 1]];
                  commit(next);
                }}
              >
                Up
              </button>
              <button
                type="button"
                disabled={index === paragraphs.length - 1}
                onClick={() => {
                  const next = [...paragraphs];
                  [next[index + 1], next[index]] = [next[index], next[index + 1]];
                  commit(next);
                }}
              >
                Down
              </button>
              <button
                type="button"
                disabled={paragraphs.length === 1}
                onClick={() => commit(paragraphs.filter((_, i) => i !== index))}
              >
                Remove
              </button>
            </div>
          </div>
          <label className="editor-field">
            <span className="editor-field-label">Text</span>
            <textarea
              value={paragraph}
              onChange={(event) => {
                const next = [...paragraphs];
                next[index] = event.target.value;
                commit(next);
              }}
            />
          </label>
        </div>
      ))}
    </div>
  );
}
