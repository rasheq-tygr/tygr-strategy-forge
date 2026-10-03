import { useState } from "react";
import { Link } from "react-router-dom";
import { useSite } from "../context/SiteContext";
import { Editable } from "./Editable";
import { Reveal } from "./Reveal";

export function WorkGrid({ limit, heading = true }: { limit?: number; heading?: boolean }) {
  const { content } = useSite();
  const items = limit ? content.work.items.slice(0, limit) : content.work.items;
  const [active, setActive] = useState(0);
  const current = items[Math.min(active, Math.max(items.length - 1, 0))];

  return (
    <section className="section cream" id="work">
      <div className="wrap">
        {heading ? (
          <Reveal>
            <div className="section-head">
              <p className="eyebrow">
                <Editable path="work.eyebrow" />
              </p>
              <h2 className="display-lg">
                <Editable path="work.title" />
              </h2>
              <p>
                <Editable path="work.body" multiline />
              </p>
            </div>
          </Reveal>
        ) : null}
        <div className="work-stage">
          <div className="work-list">
            {items.map((item, i) => (
              <Link
                key={item.id}
                to={`/work/${item.slug}`}
                className={i === active ? "work-row is-active" : "work-row"}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
              >
                <div className="work-index">{String(i + 1).padStart(2, "0")}</div>
                <div className="work-copy">
                  <div className="meta-row">
                    <Editable path={`work.items.${i}.client`} />
                    <Editable path={`work.items.${i}.year`} />
                  </div>
                  <h3>
                    <Editable path={`work.items.${i}.title`} />
                  </h3>
                  <p>
                    <Editable path={`work.items.${i}.summary`} multiline />
                  </p>
                </div>
              </Link>
            ))}
          </div>
          {current ? (
            <figure className="work-preview">
              <img src={current.image} alt="" />
              <figcaption>{current.client}</figcaption>
            </figure>
          ) : null}
        </div>
        {limit ? (
          <p style={{ marginTop: "1.6rem" }}>
            <Link className="arrow-link" to="/work">
              <Editable path="work.cta" /> →
            </Link>
          </p>
        ) : null}
      </div>
    </section>
  );
}
