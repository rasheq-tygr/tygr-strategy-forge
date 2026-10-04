import { useSite } from "../context/SiteContext";
import { bookingHref } from "../lib/api";
import { Editable } from "./Editable";
import { LogoTicker } from "./LogoTicker";

export function Hero() {
  const { content } = useSite();

  return (
    <section className="hero">
      <div className="wrap hero-content">
        <div className="hero-copy">
          <p className="eyebrow">
            <Editable path="hero.eyebrow" />
          </p>
          <h1 className="display-xl">
            <Editable path="hero.titleLead" />
            <br />
            <span className="accent-italic">
              <Editable path="hero.titleAccent" />
            </span>
          </h1>
          <p>
            <Editable path="hero.body" multiline />
          </p>
          <div className="hero-actions">
            <a className="btn btn-primary" href={bookingHref(content.contact)} target="_blank" rel="noreferrer">
              <Editable path="hero.primaryCta" />
            </a>
            <a className="btn btn-ghost" href="#ecosystem">
              <Editable path="hero.secondaryCta" />
            </a>
          </div>
        </div>
      </div>
      <div className="scroll-hint">
        <Editable path="hero.scrollHint" />
        <span className="arrow" />
      </div>
      <div className="hero-rail">
        <LogoTicker source="proof" variant="hero" />
      </div>
    </section>
  );
}
