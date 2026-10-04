import { useSite } from "../context/SiteContext";
import { BookingCta } from "./BookingCta";
import { Editable } from "./Editable";
import { Reveal } from "./Reveal";

export function ContactBlock() {
  const { content } = useSite();
  return (
    <section className="section dark" id="contact">
      <div className="wrap contact-panel">
        <Reveal>
          <div className="contact-lead">
            <div>
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
              <p>
                <BookingCta className="btn btn-primary" path="contact.cta" />
              </p>
            </div>
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
          </div>
        </Reveal>
      </div>
    </section>
  );
}
