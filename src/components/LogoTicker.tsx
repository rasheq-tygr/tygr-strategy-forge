import { useState } from "react";
import { useSite } from "../context/SiteContext";
import { safeHref } from "../lib/security";
import { Editable } from "./Editable";

type Props = {
  source?: "partners" | "proof";
  variant?: "light" | "hero";
};

export function LogoTicker({ source = "partners", variant = "light" }: Props) {
  const { content } = useSite();
  const [paused, setPaused] = useState(false);
  const group = content[source];
  const loop = [0, 1];
  return (
    <div className={`ticker ticker-${variant} ${paused ? "is-paused" : ""}`} aria-label={group.title}>
      <button
        type="button"
        className="ticker-pause"
        aria-pressed={paused}
        aria-label={`${paused ? "Play" : "Pause"} ${group.title}`}
        onClick={() => setPaused((value) => !value)}
      >
        {paused ? "Play" : "Pause"}
      </button>
      <div className="ticker-track">
        {loop.map((copy) =>
          group.items.map((item, idx) => {
            const hidden = copy === 1;
            const logo = item.logo;
            const inner = logo ? (
              <span className="ticker-item ticker-logo-item">
                <img className="ticker-logo" src={logo} alt={hidden ? "" : item.name} />
              </span>
            ) : (
              <span className="ticker-item">
                <Editable path={`${source}.items.${idx}.name`} />
              </span>
            );
            const key = `${item.name}-${copy}-${idx}`;
            const href = safeHref(item.href);
            return href ? (
              <a
                key={key}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-hidden={hidden || undefined}
                tabIndex={hidden ? -1 : undefined}
              >
                {inner}
              </a>
            ) : (
              <span key={key} aria-hidden={hidden || undefined}>
                {inner}
              </span>
            );
          }),
        )}
      </div>
    </div>
  );
}
