import { useEffect, useState } from "react";

const SCRIPT_SRC = "https://tidycal.com/js/embed.js";

/**
 * Official TidyCal embed. Used when the REST proxy is missing, unconfigured,
 * or unreachable so visitors still get a working booking calendar.
 */
export function TidyCalEmbed({ path, className }: { path?: string; className?: string }) {
  const [scriptFailed, setScriptFailed] = useState(false);

  useEffect(() => {
    if (!path) return;
    document.querySelectorAll(`script[src="${SCRIPT_SRC}"]`).forEach((el) => el.remove());
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onerror = () => setScriptFailed(true);
    document.body.appendChild(script);
    const timer = window.setTimeout(() => {
      if (!document.querySelector(".tidycal-embed iframe")) setScriptFailed(true);
    }, 8000);
    return () => {
      window.clearTimeout(timer);
      script.remove();
    };
  }, [path]);

  if (!path) return null;
  return (
    <>
      <div className={`tidycal-embed ${className ?? ""}`.trim()} data-path={path} />
      {scriptFailed ? (
        <p className="tc-muted" style={{ padding: "0.75rem 1rem" }}>
          The hosted calendar could not be embedded here. Use the link below to open it.
        </p>
      ) : null}
    </>
  );
}
