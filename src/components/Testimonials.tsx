import { useSite } from "../context/SiteContext";
import { Editable } from "./Editable";
import { Reveal } from "./Reveal";

export function Testimonials() {
  const { content } = useSite();
  const items = content.testimonials.items;
  if (!items.length) return null;
  const rest = items.slice(1);

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
        <Reveal>
          <blockquote className="quote-lead">
            <p className="quote-text">
              <Editable path="testimonials.items.0.quote" multiline />
            </p>
            <footer>
              <cite>
                <Editable path="testimonials.items.0.name" />
              </cite>
              <span>
                <Editable path="testimonials.items.0.role" />
                {items[0].company ? " · " : ""}
                {items[0].company ? <Editable path="testimonials.items.0.company" /> : null}
              </span>
            </footer>
          </blockquote>
        </Reveal>
        {rest.length ? (
          <div className="quote-rest">
            {rest.map((item, index) => {
              const i = index + 1;
              return (
                <blockquote className="quote-aside" key={item.id}>
                  <p>
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
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}
