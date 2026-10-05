import { AreaField, TextField } from "../../components/admin/Field";
import { ParagraphEditor } from "../../components/admin/ParagraphEditor";
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

  const update = (index: number, patch: Partial<WorkItem>) => {
    const next = items.map((item, i) => (i === index ? { ...item, ...patch } : item));
    replace({ ...content, work: { ...content.work, items: next } });
  };

  return (
    <div>
      <div className="editor-page-head">
        <div>
          <h1 className="display-lg">Case studies editor</h1>
          <p className="lede">Client, story, outcome, and the image that leads the study.</p>
        </div>
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => replace({ ...content, work: { ...content.work, items: [emptyStudy(), ...items] } })}
        >
          New case study
        </button>
      </div>
      <div className="editor-list">
        {items.map((item, i) => (
          <article className="editor-card" key={item.id}>
            <div className="editor-section-head">
              <h2>{item.title || "Untitled case study"}</h2>
              <button
                type="button"
                onClick={() =>
                  replace({
                    ...content,
                    work: { ...content.work, items: items.filter((_, n) => n !== i) },
                  })
                }
              >
                Remove study
              </button>
            </div>

            <div className="editor-section">
              <h3>Study details</h3>
              <div className="editor-grid-2">
                <TextField label="Client" value={item.client} onChange={(client) => update(i, { client })} />
                <TextField label="Year" value={item.year} onChange={(year) => update(i, { year })} />
                <TextField
                  label="Title"
                  value={item.title}
                  onChange={(title) => update(i, { title, slug: slugify(title) })}
                />
                <TextField label="Slug" value={item.slug} onChange={(slug) => update(i, { slug: slugify(slug) })} />
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

            <div className="editor-section">
              <h3>Lead image</h3>
              <MediaPicker
                label="Case study image"
                value={item.image}
                onChange={(url, credit) => update(i, { image: url, imageCredit: credit || item.imageCredit })}
              />
              <TextField
                label="Image credit"
                value={item.imageCredit}
                onChange={(imageCredit) => update(i, { imageCredit })}
              />
            </div>

            <div className="editor-section">
              <ParagraphEditor value={item.body} onChange={(body) => update(i, { body })} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
