import { useState } from "react";
import { Accordion } from "../../components/admin/Accordion";
import { GalleryEditor } from "../../components/admin/GalleryEditor";
import { AreaField, TextField } from "../../components/admin/Field";
import { RichBodyEditor } from "../../components/admin/RichBodyEditor";
import { Tabs } from "../../components/admin/Tabs";
import { useSite } from "../../context/SiteContext";
import { countBodyBlocks } from "../../lib/richText";
import { slugify } from "../../lib/paths";
import type { InsightItem } from "../../types/content";

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
  const { content, replace } = useSite();
  const items = content.insights.items;
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);
  const [sectionByPost, setSectionByPost] = useState<Record<string, string>>({});

  const update = (index: number, patch: Partial<InsightItem>) => {
    const next = items.map((item, i) => (i === index ? { ...item, ...patch } : item));
    replace({ ...content, insights: { ...content.insights, items: next } });
  };

  const add = () => {
    const post = emptyPost();
    replace({ ...content, insights: { ...content.insights, items: [post, ...items] } });
    setOpenId(post.id);
    setSectionByPost((prev) => ({ ...prev, [post.id]: "details" }));
  };

  const remove = (index: number) => {
    const removed = items[index];
    replace({
      ...content,
      insights: { ...content.insights, items: items.filter((_, i) => i !== index) },
    });
    if (openId === removed?.id) setOpenId(items[index + 1]?.id ?? items[index - 1]?.id ?? null);
  };

  return (
    <div>
      <div className="editor-page-head">
        <div>
          <h1 className="display-lg">Insights editor</h1>
          <p className="lede">Accordion posts, section tabs, and one image tab at a time.</p>
        </div>
        <button className="btn btn-primary" type="button" onClick={add}>
          New post
        </button>
      </div>
      <div className="editor-list">
        {items.map((item, i) => {
          const section = sectionByPost[item.id] ?? "details";
          return (
            <Accordion
              key={item.id}
              title={item.title || "Untitled post"}
              subtitle={`${item.date} · ${(item.gallery ?? []).length} gallery image${(item.gallery ?? []).length === 1 ? "" : "s"}`}
              open={openId === item.id}
              onToggle={() => setOpenId((current) => (current === item.id ? null : item.id))}
              actions={
                <button type="button" onClick={() => remove(i)}>
                  Remove
                </button>
              }
            >
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
