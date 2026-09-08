import { useSite } from "../context/SiteContext";
import { Editable } from "./Editable";

type Props = {
  source?: "partners" | "proof";
  variant?: "light" | "hero";
};

export function LogoTicker({ source = "partners", variant = "light" }: Props) {
  const { content } = useSite();
  const group = content[source];
  const items = [...group.items, ...group.items];
  return (
    <div className={`ticker ticker-${variant}`} aria-label={group.title}>
      <div className="ticker-track">
        {items.map((item, i) => {
          const idx = i % group.items.length;
          const logo = group.items[idx].logo;
          const inner = logo ? (
            <span className="ticker-item ticker-logo-item">
              <img className="ticker-logo" src={logo} alt={group.items[idx].name} />
            </span>
          ) : (
            <span className="ticker-item">
              <Editable path={`${source}.items.${idx}.name`} />
            </span>
          );
          const href = group.items[idx].href;
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
