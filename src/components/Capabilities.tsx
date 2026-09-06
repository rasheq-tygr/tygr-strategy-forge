import { Link } from "react-router-dom";
import { useSite } from "../context/SiteContext";
import { Editable } from "./Editable";
import { Reveal } from "./Reveal";

export function Capabilities({ limit, heading = true }: { limit?: number; heading?: boolean }) {
  const { content } = useSite();
  const items = limit ? content.capabilities.items.slice(0, limit) : content.capabilities.items;

  return (
    <section className="section cream" id="capabilities">
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
        <div className="cap-grid">
          {items.map((item, i) => (
            <Reveal key={item.id}>
              <article className="card">
                <div className="cap-number">
                  <Editable path={`capabilities.items.${i}.number`} />
                </div>
                <h3>
                  <Editable path={`capabilities.items.${i}.title`} />
                </h3>
                <p>
                  <Editable path={`capabilities.items.${i}.body`} multiline />
                </p>
              </article>
            </Reveal>
          ))}
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
