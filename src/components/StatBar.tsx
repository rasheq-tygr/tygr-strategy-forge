import { useSite } from "../context/SiteContext";
import { Editable } from "./Editable";

export function StatBar() {
  const { content } = useSite();
  return (
    <div className="stat-bar">
      {content.stats.items.map((_, i) => (
        <div className="stat" key={i}>
          <div className="stat-value">
            <Editable path={`stats.items.${i}.value`} />
          </div>
          <div className="stat-label">
            <Editable path={`stats.items.${i}.label`} />
          </div>
        </div>
      ))}
    </div>
  );
}
