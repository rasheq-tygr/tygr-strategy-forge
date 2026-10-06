import { useState } from "react";
import { Accordion } from "../../components/admin/Accordion";
import { AreaField, SelectField, TextField } from "../../components/admin/Field";
import { SectionHeroFields } from "../../components/admin/SectionHeroFields";
import { MediaPicker } from "../../components/MediaPicker";
import { useSite } from "../../context/SiteContext";
import { deleteCollectionItem, saveCollectionItem } from "../../lib/api";
import { normalizeTextSize, type TextSize } from "../../lib/textSize";
import type { CapabilityItem } from "../../types/content";

type ItemStatus = "idle" | "saving" | "saved" | "error";

const SIZE_OPTIONS = [
  { value: "s", label: "Small" },
  { value: "m", label: "Medium" },
  { value: "l", label: "Large" },
];

const emptyCap = (): CapabilityItem => ({
  id: `cap-${Date.now()}`,
  number: String(Date.now()).slice(-2),
  title: "New capability",
  body: "",
  image: "",
  imageAlt: "",
  imageCredit: "",
  imagePosition: "",
});

export function CapabilitiesEditor() {
  const { content, replace, markClean } = useSite();
  const items = content.capabilities.items;
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);
  const [heroOpen, setHeroOpen] = useState(false);
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(() => new Set());
  const [newIds, setNewIds] = useState<Set<string>>(() => new Set());
  const [statusById, setStatusById] = useState<Record<string, ItemStatus>>({});
  const [errorById, setErrorById] = useState<Record<string, string>>({});

  const markDirty = (id: string) => {
    setDirtyIds((prev) => new Set(prev).add(id));
    setStatusById((prev) => ({ ...prev, [id]: "idle" }));
  };

  const clearDirty = (id: string) => {
    setDirtyIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      if (next.size === 0) markClean();
      return next;
    });
  };

  const update = (index: number, patch: Partial<CapabilityItem>) => {
    const item = items[index];
    const next = items.map((entry, i) => (i === index ? { ...entry, ...patch } : entry));
    markDirty(item.id);
    replace({ ...content, capabilities: { ...content.capabilities, items: next } });
  };

  const saveItem = async (id: string) => {
    const item = content.capabilities.items.find((entry) => entry.id === id);
    if (!item) return;
    setStatusById((prev) => ({ ...prev, [id]: "saving" }));
    try {
      await saveCollectionItem("capabilities", item);
      setNewIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      clearDirty(id);
      setStatusById((prev) => ({ ...prev, [id]: "saved" }));
    } catch (err) {
      setStatusById((prev) => ({ ...prev, [id]: "error" }));
      setErrorById((prev) => ({
        ...prev,
        [id]: err instanceof Error ? err.message : "Save failed",
      }));
    }
  };

  return (
    <div>
      <div className="editor-page-head">
        <div>
          <h1 className="display-lg">Capabilities editor</h1>
          <p className="lede">
            Save each capability from its accordion when you are ready. Tile photo and type sizes are also editable inline on the public page when unlocked.
          </p>
        </div>
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => {
            const cap = emptyCap();
            replace({
              ...content,
              capabilities: { ...content.capabilities, items: [...items, cap] },
            });
            setOpenId(cap.id);
            setNewIds((prev) => new Set(prev).add(cap.id));
            markDirty(cap.id);
          }}
        >
          Add capability
        </button>
      </div>
      <div className="editor-list">
        <Accordion
          title="Page hero"
          subtitle={content.capabilities.image ? "photo set" : "no photo"}
          open={heroOpen}
          onToggle={() => setHeroOpen((value) => !value)}
        >
          <SectionHeroFields
            value={content.capabilities}
            onChange={(patch) =>
              replace({
                ...content,
                capabilities: { ...content.capabilities, ...patch },
              })
            }
          />
        </Accordion>
        {items.map((item, i) => {
          const isDirty = dirtyIds.has(item.id) || newIds.has(item.id);
          const status = statusById[item.id] ?? "idle";
          return (
            <Accordion
              key={item.id}
              title={`${item.number} · ${item.title || "Untitled capability"}`}
              subtitle={isDirty ? "unsaved" : status === "saved" ? "saved" : undefined}
              open={openId === item.id}
              onToggle={() => setOpenId((current) => (current === item.id ? null : item.id))}
              actions={
                <>
                  <button
                    type="button"
                    className={isDirty ? "btn btn-primary" : "btn btn-ghost"}
                    disabled={status === "saving" || (!isDirty && status !== "error")}
                    onClick={() => void saveItem(item.id)}
                  >
                    {status === "saving" ? "Saving…" : status === "saved" && !isDirty ? "Saved" : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void (async () => {
                        if (!window.confirm(`Remove “${item.title || "Untitled capability"}”?`)) return;
                        if (!newIds.has(item.id)) {
                          try {
                            await deleteCollectionItem("capabilities", item.id);
                          } catch (err) {
                            setErrorById((prev) => ({
                              ...prev,
                              [item.id]: err instanceof Error ? err.message : "Delete failed",
                            }));
                            return;
                          }
                        }
                        replace({
                          ...content,
                          capabilities: {
                            ...content.capabilities,
                            items: items.filter((_, n) => n !== i),
                          },
                        });
                        clearDirty(item.id);
                      })();
                    }}
                  >
                    Remove
                  </button>
                </>
              }
            >
              {errorById[item.id] ? <p className="editor-error">{errorById[item.id]}</p> : null}
              <div className="editor-section">
                <div className="editor-grid-2">
                  <TextField label="Number" value={item.number} onChange={(number) => update(i, { number })} />
                  <TextField label="Title" value={item.title} onChange={(title) => update(i, { title })} />
                </div>
                <AreaField label="Description" value={item.body} onChange={(body) => update(i, { body })} />
                <div className="editor-grid-2">
                  <SelectField
                    label="Eyebrow size"
                    value={normalizeTextSize(item.numberSize)}
                    onChange={(numberSize) => update(i, { numberSize: numberSize as TextSize })}
                    options={SIZE_OPTIONS}
                    hint="Also editable inline on the public page when unlocked."
                  />
                  <SelectField
                    label="Title size"
                    value={normalizeTextSize(item.titleSize)}
                    onChange={(titleSize) => update(i, { titleSize: titleSize as TextSize })}
                    options={SIZE_OPTIONS}
                  />
                  <SelectField
                    label="Body size"
                    value={normalizeTextSize(item.bodySize)}
                    onChange={(bodySize) => update(i, { bodySize: bodySize as TextSize })}
                    options={SIZE_OPTIONS}
                  />
                </div>
                <MediaPicker
                  compact
                  label="Tile photo"
                  value={item.image ?? ""}
                  onChange={(url, credit) =>
                    update(i, { image: url, imageCredit: credit || item.imageCredit })
                  }
                />
                <div className="editor-grid-2">
                  <TextField
                    label="Image alt text"
                    value={item.imageAlt ?? ""}
                    onChange={(imageAlt) => update(i, { imageAlt })}
                  />
                  <TextField
                    label="Image credit"
                    value={item.imageCredit ?? ""}
                    onChange={(imageCredit) => update(i, { imageCredit })}
                  />
                  <TextField
                    label="Object position"
                    value={item.imagePosition ?? ""}
                    onChange={(imagePosition) => update(i, { imagePosition })}
                    hint='Optional, e.g. "center top".'
                    placeholder="center top"
                  />
                </div>
              </div>
            </Accordion>
          );
        })}
      </div>
    </div>
  );
}
