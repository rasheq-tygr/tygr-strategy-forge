import { Link } from "react-router-dom";
import { useSite } from "../context/SiteContext";
import { Editable } from "./Editable";
import { Reveal } from "./Reveal";

export function InsightGrid({ limit, heading = true }: { limit?: number; heading?: boolean }) {
  const { content } = useSite();
  const items = limit ? content.insights.items.slice(0, limit) : content.insights.items;
  const [feature, ...rest] = items;

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
        {feature ? (
          <Link to={`/insights/${feature.slug}`} className="insight-feature">
            <div className="insight-feature-media">
              <img src={feature.image} alt="" style={feature.imagePosition ? { objectPosition: feature.imagePosition } : undefined} />
            </div>
            <div>
              <div className="meta-row">
                <Editable path="insights.items.0.date" />
                <Editable path="insights.items.0.author" />
              </div>
              <h3>
                <Editable path="insights.items.0.title" />
              </h3>
              <p>
                <Editable path="insights.items.0.excerpt" multiline />
              </p>
            </div>
          </Link>
        ) : null}
        {rest.length ? (
          <div className="insight-list">
            {rest.map((item, index) => {
              const i = index + 1;
              return (
                <Link key={item.id} to={`/insights/${item.slug}`} className="insight-row">
                  <span className="meta-row">
                    <Editable path={`insights.items.${i}.date`} />
                    <Editable path={`insights.items.${i}.author`} />
                  </span>
                  <h3>
                    <Editable path={`insights.items.${i}.title`} />
                  </h3>
                  <p>
                    <Editable path={`insights.items.${i}.excerpt`} multiline />
                  </p>
                </Link>
              );
            })}
          </div>
        ) : null}
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
