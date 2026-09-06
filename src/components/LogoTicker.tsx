import { useSite } from "../context/SiteContext";
import { Editable } from "./Editable";

export function LogoTicker() {
  const { content } = useSite();
  const items = [...content.partners.items, ...content.partners.items];
  return (
    <div className="ticker" aria-label={content.partners.title}>
      <div className="ticker-track">
        {items.map((item, i) => {
          const idx = i % content.partners.items.length;
          const inner = (
            <span className="ticker-item">
              <Editable path={`partners.items.${idx}.name`} />
            </span>
          );
          const href = content.partners.items[idx].href;
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
