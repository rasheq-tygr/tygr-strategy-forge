import { useEffect } from "react";

const SCRIPT_SRC = "https://asset-tidycal.b-cdn.net/js/embed.js";

/**
 * Inline TidyCal scheduler. `path` is the `username/booking-type` slug from the
 * TidyCal booking link (e.g. "rasheqrahman/discovery-call"). The embed script
 * scans for `.tidycal-embed[data-path]` on load; we (re)append it on mount so
 * the widget also renders after client-side navigation.
 */
export function TidyCalEmbed({ path, className }: { path?: string; className?: string }) {
  useEffect(() => {
    if (!path) return;
    document.querySelectorAll(`script[src="${SCRIPT_SRC}"]`).forEach((el) => el.remove());
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    document.body.appendChild(script);
  }, [path]);

  if (!path) return null;
  return <div className={`tidycal-embed ${className ?? ""}`.trim()} data-path={path} />;
}
