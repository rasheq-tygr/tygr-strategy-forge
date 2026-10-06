import { useEffect, useRef, useState } from "react";
import { MediaPicker } from "../MediaPicker";
import type { InsightPhoto } from "../../types/content";
import { SelectField, TextField } from "./Field";
import { Tabs } from "./Tabs";

const emptyPhoto = (): InsightPhoto => ({
  src: "",
  alt: "",
  caption: "",
  layout: "wide",
});

let nextRowId = 0;
const makeRowId = () => `gallery-row-${++nextRowId}`;

type Props = {
  photos: InsightPhoto[];
  paragraphCount: number;
  onChange: (photos: InsightPhoto[]) => void;
  /** Optional hero cover fields rendered as the first image tab. */
  hero?: {
    image: string;
    imageAlt: string;
    imageCredit: string;
    imagePosition: string;
    onChange: (patch: {
      image?: string;
      imageAlt?: string;
      imageCredit?: string;
      imagePosition?: string;
    }) => void;
  };
};

export function GalleryEditor({ photos, paragraphCount, onChange, hero }: Props) {
  const rowIds = useRef<string[]>([]);
  const [activeId, setActiveId] = useState(hero ? "hero" : "img-0");

  if (rowIds.current.length < photos.length) {
    rowIds.current = [
      ...rowIds.current,
      ...Array.from({ length: photos.length - rowIds.current.length }, makeRowId),
    ];
  } else if (rowIds.current.length > photos.length) {
    rowIds.current = rowIds.current.slice(0, photos.length);
  }

  useEffect(() => {
    if (activeId === "hero" && hero) return;
    if (activeId.startsWith("img-")) {
      const index = Number(activeId.slice(4));
      if (Number.isFinite(index) && index >= 0 && index < photos.length) return;
    }
    setActiveId(hero ? "hero" : photos.length ? "img-0" : "hero");
  }, [activeId, hero, photos.length]);

  const update = (index: number, patch: Partial<InsightPhoto>) => {
    onChange(photos.map((photo, i) => (i === index ? { ...photo, ...patch } : photo)));
  };

  const move = (index: number, delta: number) => {
    const next = [...photos];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    const ids = [...rowIds.current];
    [ids[index], ids[target]] = [ids[target], ids[index]];
    rowIds.current = ids;
    onChange(next);
    setActiveId(`img-${target}`);
  };

  const remove = (index: number) => {
    rowIds.current = rowIds.current.filter((_, i) => i !== index);
    const next = photos.filter((_, i) => i !== index);
    onChange(next);
    if (!next.length) {
      setActiveId(hero ? "hero" : "img-0");
      return;
    }
    setActiveId(`img-${Math.min(index, next.length - 1)}`);
  };

  const addImage = () => {
    rowIds.current = [...rowIds.current, makeRowId()];
    onChange([...photos, emptyPhoto()]);
    setActiveId(`img-${photos.length}`);
  };

  const afterOptions = [
    { value: "", label: "Hero strip only (not in the article)" },
    ...Array.from({ length: Math.max(paragraphCount, 1) }, (_, i) => ({
      value: String(i),
      label: `After block ${i + 1}`,
    })),
  ];

  const tabs = [
    ...(hero
      ? [
          {
            id: "hero",
            label: "Hero",
            panel: (
              <div className="editor-image-panel">
                <MediaPicker
                  compact
                  label="Cover photo"
                  value={hero.image}
                  onChange={(url, credit) =>
                    hero.onChange({ image: url, imageCredit: credit || hero.imageCredit })
                  }
                />
                <div className="editor-grid-2">
                  <TextField
                    label="Cover alt text"
                    value={hero.imageAlt}
                    onChange={(imageAlt) => hero.onChange({ imageAlt })}
                  />
                  <TextField
                    label="Cover credit"
                    value={hero.imageCredit}
                    onChange={(imageCredit) => hero.onChange({ imageCredit })}
                  />
                  <TextField
                    label="Object position"
                    value={hero.imagePosition}
                    onChange={(imagePosition) => hero.onChange({ imagePosition })}
                    hint='Optional, e.g. "center top".'
                    placeholder="center top"
                  />
                </div>
              </div>
            ),
          },
        ]
      : []),
    ...photos.map((photo, index) => ({
      id: `img-${index}`,
      label: (
        <span className="editor-tab-with-thumb">
          {photo.src ? <img src={photo.src} alt="" /> : null}
          <span>{index + 1}</span>
        </span>
      ),
      panel: (
        <div className="editor-image-panel" key={rowIds.current[index]}>
          <div className="editor-section-head">
            <strong>Image {index + 1}</strong>
            <div className="editor-inline-actions">
              <button type="button" disabled={index === 0} onClick={() => move(index, -1)}>
                Left
              </button>
              <button
                type="button"
                disabled={index === photos.length - 1}
                onClick={() => move(index, 1)}
              >
                Right
              </button>
              <button type="button" onClick={() => remove(index)}>
                Remove
              </button>
            </div>
          </div>
          <MediaPicker
            compact
            label="Photo"
            value={photo.src}
            onChange={(url, credit) =>
              update(index, {
                src: url,
                alt: photo.alt || credit || "",
              })
            }
          />
          <div className="editor-grid-2">
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
              value={photo.layout ?? "wide"}
              onChange={(layout) => update(index, { layout: layout as InsightPhoto["layout"] })}
              options={[
                { value: "inline", label: "Inline (article width)" },
                { value: "wide", label: "Wide" },
                { value: "band", label: "Band (short wide crop)" },
              ]}
            />
          </div>
        </div>
      ),
    })),
  ];

  return (
    <div className="editor-gallery">
      <p className="editor-field-hint">
        Switch image tabs to edit one photo at a time. Every gallery image appears in the thumbnail strip;
        set “Place in article” to embed after a body block.
      </p>
      {!hero && photos.length === 0 ? (
        <p className="editor-empty">No gallery yet. Add an image to start.</p>
      ) : null}
      <Tabs
        tabs={tabs}
        activeId={activeId}
        onChange={setActiveId}
        trailing={
          <button type="button" className="btn btn-ghost" onClick={addImage}>
            {photos.length ? "Add image" : "Add gallery"}
          </button>
        }
      />
    </div>
  );
}
