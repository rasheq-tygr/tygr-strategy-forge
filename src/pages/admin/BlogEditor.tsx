import { GalleryEditor } from "../../components/admin/GalleryEditor";
import { AreaField, TextField } from "../../components/admin/Field";
import { RichBodyEditor } from "../../components/admin/RichBodyEditor";
import { MediaPicker } from "../../components/MediaPicker";
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
      <div className="editor-page-head">
        <div>
          <h1 className="display-lg">Insights editor</h1>
          <p className="lede">Write the post, set the hero image, and attach gallery photos for the story.</p>
        </div>
        <button className="btn btn-primary" type="button" onClick={add}>
          New post
        </button>
      </div>
      <div className="editor-list">
        {items.map((item, i) => (
          <article className="editor-card" key={item.id}>
            <div className="editor-section-head">
              <h2>{item.title || "Untitled post"}</h2>
              <button type="button" onClick={() => remove(i)}>
                Remove post
              </button>
            </div>

            <div className="editor-section">
              <h3>Post details</h3>
              <div className="editor-grid-2">
                <TextField
                  label="Title"
                  value={item.title}
                  onChange={(title) => update(i, { title, slug: slugify(title) })}
                />
                <TextField label="Slug" value={item.slug} onChange={(slug) => update(i, { slug: slugify(slug) })} />
                <TextField label="Date" type="date" value={item.date} onChange={(date) => update(i, { date })} />
                <TextField label="Author" value={item.author} onChange={(author) => update(i, { author })} />
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
              <AreaField label="Excerpt" value={item.excerpt} onChange={(excerpt) => update(i, { excerpt })} />
            </div>

            <div className="editor-section">
              <h3>Hero image</h3>
              <MediaPicker
                label="Cover photo"
                value={item.image}
                onChange={(url, credit) => update(i, { image: url, imageCredit: credit || item.imageCredit })}
              />
              <div className="editor-grid-2">
                <TextField
                  label="Cover alt text"
                  value={item.imageAlt ?? ""}
                  onChange={(imageAlt) => update(i, { imageAlt })}
                />
                <TextField
                  label="Cover credit"
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

            <div className="editor-section">
              <RichBodyEditor
                value={item.body}
                onChange={(body) => update(i, { body })}
                showBlockHint
              />
            </div>

            <div className="editor-section">
              <GalleryEditor
                photos={item.gallery ?? []}
                paragraphCount={countBodyBlocks(item.body)}
                onChange={(gallery) => update(i, { gallery })}
              />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
