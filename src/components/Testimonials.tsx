import { useSite } from "../context/SiteContext";
import { Editable } from "./Editable";
import { Reveal } from "./Reveal";

export function Testimonials() {
  const { content } = useSite();
  const items = content.testimonials.items;
  if (!items.length) return null;

  return (
    <section className="section cream" id="testimonials">
      <div className="wrap">
        <Reveal>
          <div className="section-head">
            <p className="eyebrow">
              <Editable path="testimonials.eyebrow" />
            </p>
            <h2 className="display-lg">
              <Editable path="testimonials.title" />
            </h2>
          </div>
        </Reveal>
        <div className="quotes-grid">
          {items.map((item, i) => (
            <Reveal key={item.id}>
              <blockquote className="quote-card">
                <p className="quote-text">
                  <Editable path={`testimonials.items.${i}.quote`} multiline />
                </p>
                <footer>
                  <cite>
                    <Editable path={`testimonials.items.${i}.name`} />
                  </cite>
                  <span>
                    <Editable path={`testimonials.items.${i}.role`} />
                    {item.company ? " · " : ""}
                    {item.company ? <Editable path={`testimonials.items.${i}.company`} /> : null}
                  </span>
                </footer>
              </blockquote>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
