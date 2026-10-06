import { useState } from "react";
import { Accordion } from "../../components/admin/Accordion";
import { AreaField, TextField } from "../../components/admin/Field";
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
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);

  const update = (index: number, patch: Partial<CapabilityItem>) => {
    const next = items.map((item, i) => (i === index ? { ...item, ...patch } : item));
    replace({ ...content, capabilities: { ...content.capabilities, items: next } });
  };

  return (
    <div>
      <div className="editor-page-head">
        <div>
          <h1 className="display-lg">Capabilities editor</h1>
          <p className="lede">One open accordion at a time keeps the page short.</p>
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
          }}
        >
          Add capability
        </button>
      </div>
      <div className="editor-list">
        {items.map((item, i) => (
          <Accordion
            key={item.id}
            title={`${item.number} · ${item.title || "Untitled capability"}`}
            open={openId === item.id}
            onToggle={() => setOpenId((current) => (current === item.id ? null : item.id))}
            actions={
              <button
                type="button"
                onClick={() =>
                  replace({
                    ...content,
                    capabilities: {
                      ...content.capabilities,
                      items: items.filter((_, n) => n !== i),
                    },
                  })
                }
              >
                Remove
              </button>
            }
          >
            <div className="editor-section">
              <div className="editor-grid-2">
                <TextField label="Number" value={item.number} onChange={(number) => update(i, { number })} />
                <TextField label="Title" value={item.title} onChange={(title) => update(i, { title })} />
              </div>
              <AreaField label="Description" value={item.body} onChange={(body) => update(i, { body })} />
            </div>
          </Accordion>
        ))}
      </div>
    </div>
  );
}
