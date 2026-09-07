import { useEffect } from "react";

const SCRIPT_SRC = "https://tidycal.com/js/embed.js";

/**
 * Official TidyCal embed. Used when the REST proxy is missing, unconfigured,
 * or unreachable so visitors still get a working booking calendar.
 */
export function TidyCalEmbed({ path, className }: { path?: string; className?: string }) {
  useEffect(() => {
    if (!path) return;
    document.querySelectorAll(`script[src="${SCRIPT_SRC}"]`).forEach((el) => el.remove());
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    document.body.appendChild(script);
    return () => {
      script.remove();
    };
  }, [path]);

  if (!path) return null;
  return <div className={`tidycal-embed ${className ?? ""}`.trim()} data-path={path} />;
}
