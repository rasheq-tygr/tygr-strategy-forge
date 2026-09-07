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
      <h1 className="display-lg">Case studies editor</h1>
      <p>
        <button className="btn btn-primary" type="button" onClick={() => replace({ ...content, work: { ...content.work, items: [emptyStudy(), ...items] } })}>
          New case study
        </button>
      </p>
      <div className="editor-list">
        {items.map((item, i) => (
          <article className="editor-card" key={item.id}>
            <input value={item.client} onChange={(e) => update(i, { client: e.target.value })} />
            <input
              value={item.title}
              placeholder="Title"
              onChange={(e) => update(i, { title: e.target.value })}
            />
            <input
              value={item.slug}
              placeholder="Slug"
              onChange={(e) => update(i, { slug: slugify(e.target.value) })}
            />
            <input value={item.year} onChange={(e) => update(i, { year: e.target.value })} />
            <input
              value={item.tags.join(", ")}
              onChange={(e) => update(i, { tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })}
            />
            <textarea value={item.summary} onChange={(e) => update(i, { summary: e.target.value })} />
            <textarea value={item.body} onChange={(e) => update(i, { body: e.target.value })} />
            <textarea value={item.outcome} onChange={(e) => update(i, { outcome: e.target.value })} />
            <MediaPicker
              value={item.image}
              onChange={(url, credit) => update(i, { image: url, imageCredit: credit || item.imageCredit })}
            />
            <button type="button" onClick={() => replace({ ...content, work: { ...content.work, items: items.filter((_, n) => n !== i) } })}>
              Remove
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
