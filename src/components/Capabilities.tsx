import { Link } from "react-router-dom";
import { useSite } from "../context/SiteContext";
import { typeSizeClass } from "../lib/textSize";
import { Editable } from "./Editable";
import { InlineImageControl } from "./InlineImageControl";
import { Reveal } from "./Reveal";
import { TypeSizeControl } from "./TypeSizeControl";

function mosaicClass(count: number) {
  if (count <= 4) return "is-four";
  if (count <= 6) return "is-six";
  return "is-many";
}

export function Capabilities({ limit, heading = true }: { limit?: number; heading?: boolean }) {
  const { content, editMode } = useSite();
  const items = limit ? content.capabilities.items.slice(0, limit) : content.capabilities.items;

  return (
    <section className={`section cream${heading ? "" : " is-flush"}`} id="capabilities">
      <div className="wrap">
        {heading ? (
          <Reveal>
            <div className="section-head">
              <p className="eyebrow">
                <Editable path="capabilities.eyebrow" />
              </p>
              <h2 className="display-lg">
                <Editable path="capabilities.title" />
              </h2>
              <p>
                <Editable path="capabilities.body" multiline />
              </p>
            </div>
          </Reveal>
        ) : null}
        <div className={`cap-mosaic ${mosaicClass(items.length)}`}>
          {items.map((item, i) => {
            const objectStyle = item.imagePosition ? { objectPosition: item.imagePosition } : undefined;
            return (
              <Reveal
                key={item.id}
                className={`cap-tile cap-tone-${i % 4}${item.image ? " has-media" : ""}${editMode ? " is-editing" : ""}`}
              >
                {item.image ? (
                  <div className="cap-tile-media" {...(item.imageAlt ? {} : { "aria-hidden": true })}>
                    <img src={item.image} alt={item.imageAlt || ""} style={objectStyle} />
                  </div>
                ) : null}
                {editMode ? (
                  <div className="cap-tile-controls" role="group" aria-label={`Edit ${item.title || "capability"}`}>
                    <InlineImageControl
                      path={`capabilities.items.${i}.image`}
                      creditPath={`capabilities.items.${i}.imageCredit`}
                      label="Tile photo"
                    />
                    <TypeSizeControl path={`capabilities.items.${i}.numberSize`} label="Eyebrow" />
                    <TypeSizeControl path={`capabilities.items.${i}.titleSize`} label="Title" />
                    <TypeSizeControl path={`capabilities.items.${i}.bodySize`} label="Body" />
                  </div>
                ) : null}
                <p className={typeSizeClass(item.numberSize, "cap-number")}>
                  <Editable path={`capabilities.items.${i}.number`} />
                </p>
                <div className="cap-copy">
                  <h3 className={typeSizeClass(item.titleSize)}>
                    <Editable path={`capabilities.items.${i}.title`} />
                  </h3>
                  <p className={typeSizeClass(item.bodySize)}>
                    <Editable path={`capabilities.items.${i}.body`} multiline />
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>
        {limit ? (
          <p style={{ marginTop: "1.6rem" }}>
            <Link className="arrow-link" to="/capabilities">
              All capabilities →
            </Link>
          </p>
        ) : null}
      </div>
    </section>
  );
}
