import { useSite } from "../../context/SiteContext";
import type { CapabilityItem } from "../../types/content";

const emptyCap = (): CapabilityItem => ({
  id: `cap-${Date.now()}`,
  number: String(Date.now()).slice(-2),
  title: "New capability",
  body: "",
});

export function CapabilitiesEditor() {
  const { content, replace } = useSite();
  const items = content.capabilities.items;

  const update = (index: number, patch: Partial<CapabilityItem>) => {
    const next = items.map((item, i) => (i === index ? { ...item, ...patch } : item));
    replace({ ...content, capabilities: { ...content.capabilities, items: next } });
  };

  return (
    <div>
      <h1 className="display-lg">Capabilities editor</h1>
      <p>
        <button className="btn btn-primary" type="button" onClick={() => replace({ ...content, capabilities: { ...content.capabilities, items: [...items, emptyCap()] } })}>
          Add capability
        </button>
      </p>
      <div className="editor-list">
        {items.map((item, i) => (
          <article className="editor-card" key={item.id}>
            <input value={item.number} onChange={(e) => update(i, { number: e.target.value })} />
            <input value={item.title} onChange={(e) => update(i, { title: e.target.value })} />
            <textarea value={item.body} onChange={(e) => update(i, { body: e.target.value })} />
            <button type="button" onClick={() => replace({ ...content, capabilities: { ...content.capabilities, items: items.filter((_, n) => n !== i) } })}>
              Remove
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
