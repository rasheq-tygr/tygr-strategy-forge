import { Link } from "react-router-dom";
import { useSite } from "../context/SiteContext";
import { Editable } from "./Editable";
import { Reveal } from "./Reveal";

export function WorkGrid({ limit, heading = true }: { limit?: number; heading?: boolean }) {
  const { content } = useSite();
  const items = limit ? content.work.items.slice(0, limit) : content.work.items;

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
        <div className="work-grid">
          {items.map((item, i) => (
            <Reveal key={item.id}>
              <Link to={`/work/${item.slug}`} className="card lift-border">
                <div className="media">
                  <img src={item.image} alt={item.title} />
                </div>
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
              </Link>
            </Reveal>
          ))}
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
