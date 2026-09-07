import { Link } from "react-router-dom";
import { useSite } from "../../context/SiteContext";

export function AdminHome() {
  const { content } = useSite();
  return (
    <div>
      <h1 className="display-lg">Editors</h1>
      <p className="lede">
        Dedicated editors for blog posts, case studies, and capabilities. Public pages stay
        inline-editable once unlocked. Password matches <code>EDIT_PASSWORD</code>.
      </p>
      <div className="cap-grid" style={{ marginTop: "1.5rem" }}>
        <Link className="card lift-border" to="/admin/insights">
          <h3>Insights / blog</h3>
          <p>{content.insights.items.length} posts</p>
        </Link>
        <Link className="card lift-border" to="/admin/work">
          <h3>Case studies</h3>
          <p>{content.work.items.length} studies</p>
        </Link>
        <Link className="card lift-border" to="/admin/capabilities">
          <h3>Capabilities</h3>
          <p>{content.capabilities.items.length} items</p>
        </Link>
      </div>
    </div>
  );
}
