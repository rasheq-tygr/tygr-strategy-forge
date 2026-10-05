import { MediaPicker } from "../MediaPicker";
import type { InsightPhoto } from "../../types/content";
import { SelectField, TextField } from "./Field";

const emptyPhoto = (): InsightPhoto => ({
  src: "",
  alt: "",
  caption: "",
  layout: "wide",
});

type Props = {
  photos: InsightPhoto[];
  paragraphCount: number;
  onChange: (photos: InsightPhoto[]) => void;
};

export function GalleryEditor({ photos, paragraphCount, onChange }: Props) {
  const update = (index: number, patch: Partial<InsightPhoto>) => {
    onChange(photos.map((photo, i) => (i === index ? { ...photo, ...patch } : photo)));
  };

  const move = (index: number, delta: number) => {
    const next = [...photos];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const afterOptions = [
    { value: "", label: "Hero strip only (not in the article)" },
    ...Array.from({ length: Math.max(paragraphCount, 1) }, (_, i) => ({
      value: String(i),
      label: `After paragraph ${i + 1}`,
    })),
  ];

  const addImage = () => onChange([...photos, emptyPhoto()]);

  return (
    <div className="editor-gallery">
      <div className="editor-section-head">
        <h3>Gallery</h3>
        <div className="editor-inline-actions">
          {photos.length === 0 ? (
            <button type="button" className="btn btn-primary" onClick={addImage}>
              Add gallery
            </button>
          ) : (
            <button type="button" className="btn btn-ghost" onClick={addImage}>
              Add image
            </button>
          )}
        </div>
      </div>
      <p className="editor-field-hint">
        Add a gallery, then add individual image objects. Every image appears in the thumbnail strip. Set
        “Place in article” to embed one after a body paragraph.
      </p>
      {photos.length === 0 ? (
        <p className="editor-empty">No gallery yet. Add a gallery, then add photos one by one.</p>
      ) : null}
      {photos.map((photo, index) => (
        <div className="editor-gallery-item" key={`${photo.src || "new"}-${index}`}>
          <div className="editor-section-head">
            <strong>Image {index + 1}</strong>
            <div className="editor-inline-actions">
              <button type="button" disabled={index === 0} onClick={() => move(index, -1)}>
                Up
              </button>
              <button type="button" disabled={index === photos.length - 1} onClick={() => move(index, 1)}>
                Down
              </button>
              <button type="button" onClick={() => onChange(photos.filter((_, i) => i !== index))}>
                Remove
              </button>
            </div>
          </div>
          <MediaPicker
            label="Photo"
            value={photo.src}
            onChange={(url, credit) =>
              update(index, {
                src: url,
                alt: photo.alt || credit || "",
              })
            }
          />
          <TextField label="Alt text" value={photo.alt} onChange={(alt) => update(index, { alt })} />
          <TextField
            label="Caption"
            value={photo.caption ?? ""}
            onChange={(caption) => update(index, { caption })}
            hint="Shown under the photo in the article."
          />
          <SelectField
            label="Place in article"
            value={photo.after == null ? "" : String(photo.after)}
            onChange={(value) =>
              update(index, {
                after: value === "" ? undefined : Number(value),
              })
            }
            options={afterOptions}
          />
          <SelectField
            label="Layout"
            value={photo.layout ?? "inline"}
            onChange={(layout) => update(index, { layout: layout as InsightPhoto["layout"] })}
            options={[
              { value: "inline", label: "Inline (article width)" },
              { value: "wide", label: "Wide" },
              { value: "band", label: "Band (short wide crop)" },
            ]}
          />
        </div>
      ))}
    </div>
  );
}
