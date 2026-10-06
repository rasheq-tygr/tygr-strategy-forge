import { useState } from "react";
import { Accordion } from "../../components/admin/Accordion";
import { AreaField, TextField } from "../../components/admin/Field";
import { RichBodyEditor } from "../../components/admin/RichBodyEditor";
import { SectionHeroFields } from "../../components/admin/SectionHeroFields";
import { Tabs } from "../../components/admin/Tabs";
import { MediaPicker } from "../../components/MediaPicker";
import { useSite } from "../../context/SiteContext";
import { deleteCollectionItem, saveCollectionItem } from "../../lib/api";
import { slugify } from "../../lib/paths";
import type { WorkItem } from "../../types/content";

type ItemStatus = "idle" | "saving" | "saved" | "error";

const emptyStudy = (): WorkItem => ({
  id: `work-${Date.now()}`,
  slug: "new-case-study",
  client: "Client",
  title: "New case study",
  summary: "",
  body: "",
  outcome: "",
  year: String(new Date().getFullYear()),
  tags: [],
  image: "",
  imageAlt: "",
  imagePosition: "",
  imageCredit: "",
  url: "",
});

export function CaseStudyEditor() {
  const { content, replace, markClean } = useSite();
  const items = content.work.items;
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);
  const [heroOpen, setHeroOpen] = useState(false);
  const [sectionByItem, setSectionByItem] = useState<Record<string, string>>({});
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

  const update = (index: number, patch: Partial<WorkItem>) => {
    const item = items[index];
    const next = items.map((entry, i) => (i === index ? { ...entry, ...patch } : entry));
    markDirty(item.id);
    replace({ ...content, work: { ...content.work, items: next } });
  };

  const saveItem = async (id: string) => {
    const item = content.work.items.find((entry) => entry.id === id);
    if (!item) return;
    setStatusById((prev) => ({ ...prev, [id]: "saving" }));
    try {
      await saveCollectionItem("work", item);
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
          <h1 className="display-lg">Case studies editor</h1>
          <p className="lede">Save each study on its own accordion when you are done editing it. The work page hero photo uses Save in the admin bar.</p>
        </div>
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => {
            const study = emptyStudy();
            replace({ ...content, work: { ...content.work, items: [study, ...items] } });
            setOpenId(study.id);
            setNewIds((prev) => new Set(prev).add(study.id));
            markDirty(study.id);
          }}
        >
          New case study
        </button>
      </div>
      <div className="editor-list">
        <Accordion
          title="Page hero"
          subtitle={content.work.image ? "photo set" : "no photo"}
          open={heroOpen}
          onToggle={() => setHeroOpen((value) => !value)}
        >
          <SectionHeroFields
            value={content.work}
            onChange={(patch) =>
              replace({
                ...content,
                work: { ...content.work, ...patch },
              })
            }
          />
        </Accordion>
        {items.map((item, i) => {
          const section = sectionByItem[item.id] ?? "details";
          const isDirty = dirtyIds.has(item.id) || newIds.has(item.id);
          const status = statusById[item.id] ?? "idle";
          return (
            <Accordion
              key={item.id}
              title={item.title || "Untitled case study"}
              subtitle={`${item.client} · ${item.year}${isDirty ? " · unsaved" : status === "saved" ? " · saved" : ""}`}
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
                    {status === "saving" ? "Saving…" : status === "saved" && !isDirty ? "Saved" : "Save study"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void (async () => {
                        if (!window.confirm(`Remove “${item.title || "Untitled case study"}”?`)) return;
                        if (!newIds.has(item.id)) {
                          try {
                            await deleteCollectionItem("work", item.id);
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
                          work: { ...content.work, items: items.filter((_, n) => n !== i) },
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
              <Tabs
                activeId={section}
                onChange={(id) => setSectionByItem((prev) => ({ ...prev, [item.id]: id }))}
                tabs={[
                  {
                    id: "details",
                    label: "Details",
                    panel: (
                      <div className="editor-section">
                        <div className="editor-grid-2">
                          <TextField label="Client" value={item.client} onChange={(client) => update(i, { client })} />
                          <TextField label="Year" value={item.year} onChange={(year) => update(i, { year })} />
                          <TextField
                            label="Title"
                            value={item.title}
                            onChange={(title) => update(i, { title, slug: slugify(title) })}
                          />
                          <TextField
                            label="Slug"
                            value={item.slug}
                            onChange={(slug) => update(i, { slug: slugify(slug) })}
                          />
                          <TextField
                            label="Live URL"
                            value={item.url ?? ""}
                            onChange={(url) => update(i, { url })}
                            hint="Optional public app or product URL."
                            placeholder="https://"
                          />
                        </div>
                        <TextField
                          label="Tags"
                          value={item.tags.join(", ")}
                          onChange={(value) =>
                            update(i, {
                              tags: value
                                .split(",")
                                .map((tag) => tag.trim())
                                .filter(Boolean),
                            })
                          }
                          hint="Comma-separated."
                        />
                        <AreaField label="Summary" value={item.summary} onChange={(summary) => update(i, { summary })} />
                        <AreaField label="Outcome" value={item.outcome} onChange={(outcome) => update(i, { outcome })} />
                      </div>
                    ),
                  },
                  {
                    id: "body",
                    label: "Body",
                    panel: <RichBodyEditor value={item.body} onChange={(body) => update(i, { body })} />,
                  },
                  {
                    id: "image",
                    label: "Image",
                    panel: (
                      <div className="editor-section">
                        <MediaPicker
                          compact
                          label="Case study image"
                          value={item.image}
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
                            value={item.imageCredit}
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
                    ),
                  },
                ]}
              />
            </Accordion>
          );
        })}
      </div>
    </div>
  );
}
