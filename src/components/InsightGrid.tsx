import { Link } from "react-router-dom";
import { useSite } from "../context/SiteContext";
import { Editable } from "./Editable";
import { Reveal } from "./Reveal";

export function InsightGrid({ limit, heading = true }: { limit?: number; heading?: boolean }) {
  const { content } = useSite();
  const items = limit ? content.insights.items.slice(0, limit) : content.insights.items;

  return (
    <section className="section cool" id="insights">
      <div className="wrap">
        {heading ? (
          <Reveal>
            <div className="section-head">
              <p className="eyebrow">
                <Editable path="insights.eyebrow" />
              </p>
              <h2 className="display-lg">
                <Editable path="insights.title" />
              </h2>
              <p>
                <Editable path="insights.body" multiline />
              </p>
            </div>
          </Reveal>
        ) : null}
        <div className="insight-grid">
          {items.map((item, i) => (
            <Reveal key={item.id}>
              <Link to={`/insights/${item.slug}`} className="card lift-border">
                <div className="media">
                  <img src={item.image} alt={item.title} />
                </div>
                <div className="meta-row">
                  <Editable path={`insights.items.${i}.date`} />
                  <Editable path={`insights.items.${i}.author`} />
                </div>
                <h3>
                  <Editable path={`insights.items.${i}.title`} />
                </h3>
                <p>
                  <Editable path={`insights.items.${i}.excerpt`} multiline />
                </p>
              </Link>
            </Reveal>
          ))}
        </div>
        {limit ? (
          <p style={{ marginTop: "1.6rem" }}>
            <Link className="arrow-link" to="/insights">
              <Editable path="insights.cta" /> →
            </Link>
          </p>
        ) : null}
      </div>
    </section>
  );
}
