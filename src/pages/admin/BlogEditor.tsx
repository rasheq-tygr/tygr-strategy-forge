import { useState } from "react";
import { Accordion } from "../../components/admin/Accordion";
import { GalleryEditor } from "../../components/admin/GalleryEditor";
import { AreaField, TextField } from "../../components/admin/Field";
import { RichBodyEditor } from "../../components/admin/RichBodyEditor";
import { Tabs } from "../../components/admin/Tabs";
import { useSite } from "../../context/SiteContext";
import { deleteCollectionItem, saveCollectionItem } from "../../lib/api";
import { countBodyBlocks } from "../../lib/richText";
import { slugify } from "../../lib/paths";
import type { InsightItem } from "../../types/content";

type ItemStatus = "idle" | "saving" | "saved" | "error";

const emptyPost = (): InsightItem => ({
  id: `post-${Date.now()}`,
  slug: "new-insight",
  title: "New insight",
  excerpt: "",
  body: "",
  date: new Date().toISOString().slice(0, 10),
  author: "Rasheq Rahman",
  tags: [],
  image: "",
  imageAlt: "",
  imageCredit: "",
  gallery: [],
});

export function BlogEditor() {
  const { content, replace, markClean } = useSite();
  const items = content.insights.items;
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);
  const [sectionByPost, setSectionByPost] = useState<Record<string, string>>({});
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(() => new Set());
  const [newIds, setNewIds] = useState<Set<string>>(() => new Set());
  const [statusById, setStatusById] = useState<Record<string, ItemStatus>>({});
  const [errorById, setErrorById] = useState<Record<string, string>>({});

  const markDirty = (id: string) => {
    setDirtyIds((prev) => new Set(prev).add(id));
    setStatusById((prev) => ({ ...prev, [id]: "idle" }));
    setErrorById((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const clearDirty = (id: string) => {
    setDirtyIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      if (next.size === 0) markClean();
      return next;
    });
  };

  const update = (index: number, patch: Partial<InsightItem>) => {
    const item = items[index];
    const next = items.map((entry, i) => (i === index ? { ...entry, ...patch } : entry));
    markDirty(item.id);
    replace({ ...content, insights: { ...content.insights, items: next } });
  };

  const add = () => {
    const post = emptyPost();
    replace({ ...content, insights: { ...content.insights, items: [post, ...items] } });
    setOpenId(post.id);
    setSectionByPost((prev) => ({ ...prev, [post.id]: "details" }));
    setNewIds((prev) => new Set(prev).add(post.id));
    markDirty(post.id);
  };

  const savePost = async (id: string) => {
    const item = content.insights.items.find((entry) => entry.id === id);
    if (!item) return;
    setStatusById((prev) => ({ ...prev, [id]: "saving" }));
    setErrorById((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    try {
      await saveCollectionItem("insights", item);
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

  const remove = async (index: number) => {
    const removed = items[index];
    if (!removed) return;
    if (!window.confirm(`Remove “${removed.title || "Untitled post"}”?`)) return;

    if (!newIds.has(removed.id)) {
      setStatusById((prev) => ({ ...prev, [removed.id]: "saving" }));
      try {
        await deleteCollectionItem("insights", removed.id);
      } catch (err) {
        setStatusById((prev) => ({ ...prev, [removed.id]: "error" }));
        setErrorById((prev) => ({
          ...prev,
          [removed.id]: err instanceof Error ? err.message : "Delete failed",
        }));
        return;
      }
    }

    replace({
      ...content,
      insights: { ...content.insights, items: items.filter((_, i) => i !== index) },
    });
    setNewIds((prev) => {
      const next = new Set(prev);
      next.delete(removed.id);
      return next;
    });
    clearDirty(removed.id);
    if (openId === removed.id) setOpenId(items[index + 1]?.id ?? items[index - 1]?.id ?? null);
  };

  const saveLabel = (id: string) => {
    const status = statusById[id];
    if (status === "saving") return "Saving…";
    if (status === "saved" && !dirtyIds.has(id)) return "Saved";
    if (dirtyIds.has(id) || newIds.has(id)) return "Save post";
    return "Save post";
  };

  return (
    <div>
      <div className="editor-page-head">
        <div>
          <h1 className="display-lg">Insights editor</h1>
          <p className="lede">Edit a post, then click Save post on that accordion to write it to the host.</p>
        </div>
        <button className="btn btn-primary" type="button" onClick={add}>
          New post
        </button>
      </div>
      <div className="editor-list">
        {items.map((item, i) => {
          const section = sectionByPost[item.id] ?? "details";
          const isDirty = dirtyIds.has(item.id) || newIds.has(item.id);
          const status = statusById[item.id] ?? "idle";
          return (
            <Accordion
              key={item.id}
              title={item.title || "Untitled post"}
              subtitle={`${item.date} · ${(item.gallery ?? []).length} gallery image${(item.gallery ?? []).length === 1 ? "" : "s"}${isDirty ? " · unsaved" : status === "saved" ? " · saved" : ""}`}
              open={openId === item.id}
              onToggle={() => setOpenId((current) => (current === item.id ? null : item.id))}
              actions={
                <>
                  <button
                    type="button"
                    className={isDirty ? "btn btn-primary" : "btn btn-ghost"}
                    disabled={status === "saving" || (!isDirty && status !== "error")}
                    onClick={() => void savePost(item.id)}
                  >
                    {saveLabel(item.id)}
                  </button>
                  <button type="button" onClick={() => void remove(i)}>
                    Remove
                  </button>
                </>
              }
            >
              {errorById[item.id] ? <p className="editor-error">{errorById[item.id]}</p> : null}
              <Tabs
                activeId={section}
                onChange={(id) => setSectionByPost((prev) => ({ ...prev, [item.id]: id }))}
                tabs={[
                  {
                    id: "details",
                    label: "Details",
                    panel: (
                      <div className="editor-section">
                        <div className="editor-grid-2">
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
                            label="Date"
                            type="date"
                            value={item.date}
                            onChange={(date) => update(i, { date })}
                          />
                          <TextField
                            label="Author"
                            value={item.author}
                            onChange={(author) => update(i, { author })}
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
                        <AreaField
                          label="Excerpt"
                          value={item.excerpt}
                          onChange={(excerpt) => update(i, { excerpt })}
                        />
                      </div>
                    ),
                  },
                  {
                    id: "body",
                    label: "Body",
                    panel: (
                      <RichBodyEditor
                        value={item.body}
                        onChange={(body) => update(i, { body })}
                        showBlockHint
                      />
                    ),
                  },
                  {
                    id: "images",
                    label: `Images (${1 + (item.gallery ?? []).length})`,
                    panel: (
                      <GalleryEditor
                        photos={item.gallery ?? []}
                        paragraphCount={countBodyBlocks(item.body)}
                        onChange={(gallery) => update(i, { gallery })}
                        hero={{
                          image: item.image,
                          imageAlt: item.imageAlt ?? "",
                          imageCredit: item.imageCredit,
                          imagePosition: item.imagePosition ?? "",
                          onChange: (patch) => update(i, patch),
                        }}
                      />
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
