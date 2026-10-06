import { useState } from "react";
import { Accordion } from "../../components/admin/Accordion";
import { TextField } from "../../components/admin/Field";
import { SectionHeroFields } from "../../components/admin/SectionHeroFields";
import { useSite } from "../../context/SiteContext";
import type { EcosystemApp } from "../../types/content";

const emptyApp = (): EcosystemApp => ({
  id: `app-${Date.now()}`,
  name: "New app",
  role: "Studio product",
  url: "",
});

export function EcosystemEditor() {
  const { content, replace } = useSite();
  const [open, setOpen] = useState<"hero" | "nodes" | "apps" | null>("hero");
  const hero = content.ecosystem;
  const nodes = hero.nodes;
  const apps = hero.apps ?? [];

  return (
    <div>
      <div className="editor-page-head">
        <div>
          <h1 className="display-lg">Ecosystem editor</h1>
          <p className="lede">
            The page hero photo sits behind the navbar, same as insights. Company sites and studio
            apps save from the admin bar.
          </p>
        </div>
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => {
            const app = emptyApp();
            replace({
              ...content,
              ecosystem: { ...content.ecosystem, apps: [app, ...apps] },
            });
            setOpen("apps");
          }}
        >
          New studio app
        </button>
      </div>
      <div className="editor-list">
        <Accordion
          title="Page hero"
          subtitle={hero.image ? "photo set" : "no photo"}
          open={open === "hero"}
          onToggle={() => setOpen((value) => (value === "hero" ? null : "hero"))}
        >
          <SectionHeroFields
            value={hero}
            onChange={(patch) =>
              replace({
                ...content,
                ecosystem: { ...content.ecosystem, ...patch },
              })
            }
          />
        </Accordion>
        <Accordion
          title="Company nodes"
          subtitle={`${nodes.length} in orbit`}
          open={open === "nodes"}
          onToggle={() => setOpen((value) => (value === "nodes" ? null : "nodes"))}
        >
          <div className="editor-section">
            {nodes.map((node, i) => (
              <div key={node.id} className="editor-grid-2">
                <TextField
                  label={`${node.name} URL`}
                  value={node.url}
                  onChange={(url) =>
                    replace({
                      ...content,
                      ecosystem: {
                        ...content.ecosystem,
                        nodes: nodes.map((entry, index) => (index === i ? { ...entry, url } : entry)),
                      },
                    })
                  }
                  placeholder="https://"
                />
              </div>
            ))}
          </div>
        </Accordion>
        <Accordion
          title="Studio apps"
          subtitle={`${apps.length} live links`}
          open={open === "apps"}
          onToggle={() => setOpen((value) => (value === "apps" ? null : "apps"))}
        >
          <div className="editor-section">
            <div className="editor-grid-2">
              <TextField
                label="Apps eyebrow"
                value={hero.appsEyebrow ?? ""}
                onChange={(appsEyebrow) =>
                  replace({ ...content, ecosystem: { ...content.ecosystem, appsEyebrow } })
                }
              />
              <TextField
                label="Apps title"
                value={hero.appsTitle ?? ""}
                onChange={(appsTitle) =>
                  replace({ ...content, ecosystem: { ...content.ecosystem, appsTitle } })
                }
              />
            </div>
            {apps.map((app, i) => (
              <div key={app.id} className="editor-grid-2">
                <TextField
                  label="Name"
                  value={app.name}
                  onChange={(name) =>
                    replace({
                      ...content,
                      ecosystem: {
                        ...content.ecosystem,
                        apps: apps.map((entry, index) => (index === i ? { ...entry, name } : entry)),
                      },
                    })
                  }
                />
                <TextField
                  label="Role"
                  value={app.role}
                  onChange={(role) =>
                    replace({
                      ...content,
                      ecosystem: {
                        ...content.ecosystem,
                        apps: apps.map((entry, index) => (index === i ? { ...entry, role } : entry)),
                      },
                    })
                  }
                />
                <TextField
                  label="Live URL"
                  value={app.url}
                  onChange={(url) =>
                    replace({
                      ...content,
                      ecosystem: {
                        ...content.ecosystem,
                        apps: apps.map((entry, index) => (index === i ? { ...entry, url } : entry)),
                      },
                    })
                  }
                  placeholder="https://"
                />
                <div className="editor-field">
                  <span className="editor-field-label">Remove</span>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() =>
                      replace({
                        ...content,
                        ecosystem: {
                          ...content.ecosystem,
                          apps: apps.filter((_, index) => index !== i),
                        },
                      })
                    }
                  >
                    Remove {app.name || "app"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Accordion>
      </div>
    </div>
  );
}
