import { useSite } from "../context/SiteContext";
import { bookingHref } from "../lib/api";
import { Editable } from "./Editable";
import { Reveal } from "./Reveal";

export function ContactBlock() {
  const { content } = useSite();
  return (
    <section className="section dark" id="contact">
      <div className="wrap contact-panel">
        <Reveal>
          <p className="eyebrow">
            <Editable path="contact.eyebrow" />
          </p>
          <h2 className="display-lg">
            <Editable path="contact.title" />
          </h2>
          <p>
            <Editable path="contact.body" multiline />
          </p>
          <p>
            <Editable path="founder.blurb" multiline />
          </p>
          <a className="btn btn-primary" href={bookingHref(content.contact.bookingUrl, content.contact.email)}>
            <Editable path="contact.cta" />
          </a>
        </Reveal>
        <Reveal>
          <div className="contact-meta">
            <p className="eyebrow">
              <Editable path="contact.emailLabel" />
            </p>
            <a href={`mailto:${content.contact.email}`}>
              <Editable path="contact.email" />
            </a>
            <p className="eyebrow" style={{ marginTop: "1.4rem" }}>
              <Editable path="contact.phoneLabel" />
            </p>
            <a href={`tel:${content.contact.phone.replace(/[^\d+]/g, "")}`}>
              <Editable path="contact.phone" />
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
