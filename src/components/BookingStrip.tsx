import { useSite } from "../context/SiteContext";
import { bookingHref } from "../lib/api";
import { Editable } from "./Editable";

export function BookingStrip() {
  const { content } = useSite();
  return (
    <section className="booking-strip">
      <div className="wrap booking-strip-inner">
        <div>
          <p className="eyebrow">
            <Editable path="contact.eyebrow" />
          </p>
          <p className="booking-strip-title">
            <Editable path="contact.title" />
          </p>
        </div>
        <a className="btn btn-primary" href={bookingHref(content.contact)} target="_blank" rel="noreferrer">
          <Editable path="contact.cta" />
        </a>
      </div>
    </section>
  );
}
