import { useEffect } from "react";
import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { useSite } from "../../context/SiteContext";
import { googleClientId } from "../../lib/google";
import { AdminLogin } from "./AdminLogin";

export function AdminLayout() {
  const { unlocked, dirty, status, save, lock, content, error } = useSite();
  const location = useLocation();

  // GIS treats 127.0.0.1 and localhost as different origins. Bounce so Sign in
  // with Google uses the registered localhost origin.
  useEffect(() => {
    if (!googleClientId()) return;
    if (window.location.hostname !== "127.0.0.1") return;
    const next = new URL(window.location.href);
    next.hostname = "localhost";
    window.location.replace(next.toString());
  }, []);

  if (!unlocked) {
    return (
      <div className="admin">
        <div className="wrap">
          <AdminLogin />
        </div>
      </div>
    );
  }

  if (location.pathname === "/admin/login") {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="admin">
      <div className="wrap">
        <nav className="admin-nav">
          <Link to="/">Site</Link>
          <Link to="/admin">Overview</Link>
          <Link to="/admin/insights">Blog</Link>
          <Link to="/admin/work">Case studies</Link>
          <Link to="/admin/capabilities">Capabilities</Link>
          <button type="button" onClick={() => void save()}>
            {status === "saving" ? content.admin.saving : dirty ? content.admin.unsaved : content.admin.save}
          </button>
          <button type="button" onClick={lock}>
            Lock
          </button>
        </nav>
        {error ? <p style={{ color: "#b45309" }}>{error}</p> : null}
        <Outlet />
      </div>
    </div>
  );
}
