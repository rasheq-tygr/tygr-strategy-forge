import { useSite } from "../context/SiteContext";
import { safeHref } from "../lib/security";
import { Editable } from "./Editable";

export function LogoTicker({ source = "partners" }: { source?: "partners" | "proof" }) {
  const { content } = useSite();
  const group = content[source];
  const items = [...group.items, ...group.items];
  return (
    <div className="ticker" aria-label={group.title}>
      <div className="ticker-track">
        {items.map((item, i) => {
          const idx = i % group.items.length;
          const inner = (
            <span className="ticker-item">
              <Editable path={`${source}.items.${idx}.name`} />
            </span>
          );
          const href = safeHref(group.items[idx].href);
          return href ? (
            <a key={`${item.name}-${i}`} href={href} target="_blank" rel="noreferrer">
              {inner}
            </a>
          ) : (
            <span key={`${item.name}-${i}`}>{inner}</span>
          );
        })}
      </div>
    </div>
  );
}
