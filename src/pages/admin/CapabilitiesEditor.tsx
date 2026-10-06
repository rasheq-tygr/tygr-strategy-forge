import { useState } from "react";
import { Accordion } from "../../components/admin/Accordion";
import { AreaField, TextField } from "../../components/admin/Field";
import { useSite } from "../../context/SiteContext";
import { deleteCollectionItem, saveCollectionItem } from "../../lib/api";
import type { CapabilityItem } from "../../types/content";

type ItemStatus = "idle" | "saving" | "saved" | "error";

const emptyCap = (): CapabilityItem => ({
  id: `cap-${Date.now()}`,
  number: String(Date.now()).slice(-2),
  title: "New capability",
  body: "",
});

export function CapabilitiesEditor() {
  const { content, replace, markClean } = useSite();
  const items = content.capabilities.items;
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);
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

  const update = (index: number, patch: Partial<CapabilityItem>) => {
    const item = items[index];
    const next = items.map((entry, i) => (i === index ? { ...entry, ...patch } : entry));
    markDirty(item.id);
    replace({ ...content, capabilities: { ...content.capabilities, items: next } });
  };

  const saveItem = async (id: string) => {
    const item = content.capabilities.items.find((entry) => entry.id === id);
    if (!item) return;
    setStatusById((prev) => ({ ...prev, [id]: "saving" }));
    try {
      await saveCollectionItem("capabilities", item);
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
          <h1 className="display-lg">Capabilities editor</h1>
          <p className="lede">Save each capability from its accordion when you are ready.</p>
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
            setNewIds((prev) => new Set(prev).add(cap.id));
            markDirty(cap.id);
          }}
        >
          Add capability
        </button>
      </div>
      <div className="editor-list">
        {items.map((item, i) => {
          const isDirty = dirtyIds.has(item.id) || newIds.has(item.id);
          const status = statusById[item.id] ?? "idle";
          return (
            <Accordion
              key={item.id}
              title={`${item.number} · ${item.title || "Untitled capability"}`}
              subtitle={isDirty ? "unsaved" : status === "saved" ? "saved" : undefined}
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
                    {status === "saving" ? "Saving…" : status === "saved" && !isDirty ? "Saved" : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void (async () => {
                        if (!window.confirm(`Remove “${item.title || "Untitled capability"}”?`)) return;
                        if (!newIds.has(item.id)) {
                          try {
                            await deleteCollectionItem("capabilities", item.id);
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
                          capabilities: {
                            ...content.capabilities,
                            items: items.filter((_, n) => n !== i),
                          },
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
              <div className="editor-section">
                <div className="editor-grid-2">
                  <TextField label="Number" value={item.number} onChange={(number) => update(i, { number })} />
                  <TextField label="Title" value={item.title} onChange={(title) => update(i, { title })} />
                </div>
                <AreaField label="Description" value={item.body} onChange={(body) => update(i, { body })} />
              </div>
            </Accordion>
          );
        })}
      </div>
    </div>
  );
}
