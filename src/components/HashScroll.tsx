import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** React Router updates the hash without native fragment scrolling. */
export function HashScroll() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) return;
    const id = decodeURIComponent(hash.replace(/^#/, ""));
    if (!id) return;

    let cancelled = false;
    const scroll = () => {
      if (cancelled) return;
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    };

    scroll();
    const raf = requestAnimationFrame(scroll);
    const timer = window.setTimeout(scroll, 120);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [pathname, hash]);

  return null;
}
