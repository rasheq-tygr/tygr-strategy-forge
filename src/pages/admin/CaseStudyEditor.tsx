import { useState } from "react";
import { Accordion } from "../../components/admin/Accordion";
import { AreaField, TextField } from "../../components/admin/Field";
import { RichBodyEditor } from "../../components/admin/RichBodyEditor";
import { Tabs } from "../../components/admin/Tabs";
import { MediaPicker } from "../../components/MediaPicker";
import { useSite } from "../../context/SiteContext";
import { slugify } from "../../lib/paths";
import type { WorkItem } from "../../types/content";

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
  imageCredit: "",
});

export function CaseStudyEditor() {
  const { content, replace } = useSite();
  const items = content.work.items;
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);
  const [sectionByItem, setSectionByItem] = useState<Record<string, string>>({});

  const update = (index: number, patch: Partial<WorkItem>) => {
    const next = items.map((item, i) => (i === index ? { ...item, ...patch } : item));
    replace({ ...content, work: { ...content.work, items: next } });
  };

  return (
    <div>
      <div className="editor-page-head">
        <div>
          <h1 className="display-lg">Case studies editor</h1>
          <p className="lede">Accordion studies with Details, Body, and Image tabs.</p>
        </div>
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => {
            const study = emptyStudy();
            replace({ ...content, work: { ...content.work, items: [study, ...items] } });
            setOpenId(study.id);
          }}
        >
          New case study
        </button>
      </div>
      <div className="editor-list">
        {items.map((item, i) => {
          const section = sectionByItem[item.id] ?? "details";
          return (
            <Accordion
              key={item.id}
              title={item.title || "Untitled case study"}
              subtitle={`${item.client} · ${item.year}`}
              open={openId === item.id}
              onToggle={() => setOpenId((current) => (current === item.id ? null : item.id))}
              actions={
                <button
                  type="button"
                  onClick={() =>
                    replace({
                      ...content,
                      work: { ...content.work, items: items.filter((_, n) => n !== i) },
                    })
                  }
                >
                  Remove
                </button>
              }
            >
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
                        <TextField
                          label="Image credit"
                          value={item.imageCredit}
                          onChange={(imageCredit) => update(i, { imageCredit })}
                        />
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
