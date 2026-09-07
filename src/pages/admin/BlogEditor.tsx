import { MediaPicker } from "../../components/MediaPicker";
import { useSite } from "../../context/SiteContext";
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
  imageCredit: "",
});

export function BlogEditor() {
  const { content, replace } = useSite();
  const items = content.insights.items;

  const update = (index: number, patch: Partial<InsightItem>) => {
    const next = items.map((item, i) => (i === index ? { ...item, ...patch } : item));
    replace({ ...content, insights: { ...content.insights, items: next } });
  };

  const add = () => {
    replace({ ...content, insights: { ...content.insights, items: [emptyPost(), ...items] } });
  };

  const remove = (index: number) => {
    replace({
      ...content,
      insights: { ...content.insights, items: items.filter((_, i) => i !== index) },
    });
  };

  return (
    <div>
      <h1 className="display-lg">Insights editor</h1>
      <p>
        <button className="btn btn-primary" type="button" onClick={add}>
          New post
        </button>
      </p>
      <div className="editor-list">
        {items.map((item, i) => (
          <article className="editor-card" key={item.id}>
            <input value={item.title} onChange={(e) => update(i, { title: e.target.value, slug: slugify(e.target.value) })} />
            <input value={item.slug} onChange={(e) => update(i, { slug: slugify(e.target.value) })} />
            <input value={item.date} onChange={(e) => update(i, { date: e.target.value })} />
            <input value={item.author} onChange={(e) => update(i, { author: e.target.value })} />
            <input
              value={item.tags.join(", ")}
              onChange={(e) => update(i, { tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })}
            />
            <textarea value={item.excerpt} onChange={(e) => update(i, { excerpt: e.target.value })} />
            <textarea value={item.body} onChange={(e) => update(i, { body: e.target.value })} />
            <MediaPicker
              value={item.image}
              onChange={(url, credit) => update(i, { image: url, imageCredit: credit || item.imageCredit })}
            />
            <button type="button" onClick={() => remove(i)}>
              Remove
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
