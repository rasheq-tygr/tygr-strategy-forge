import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useSite } from "../context/SiteContext";
import { bookingHref } from "../lib/api";
import { Editable } from "./Editable";
import { TigerMark } from "./TigerMark";

export function Header() {
  const { content } = useSite();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (open) return;
    const nav = navRef.current;
    const toggle = toggleRef.current;
    if (!nav || !toggle || !nav.contains(document.activeElement)) return;
    if (getComputedStyle(nav).display === "none") toggle.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className={`header ${scrolled || open ? "scrolled" : ""} ${open ? "menu-open" : ""}`}>
      <a className="skip-link" href="#content">
        Skip to content
      </a>
      <Link to="/" className="brand">
        <TigerMark className="brand-mark" size={48} />
        <Editable path="brand.name" className="wordmark" />
      </Link>
      <button
        type="button"
        ref={toggleRef}
        className="nav-toggle"
        aria-expanded={open}
        aria-controls="site-nav"
        onClick={() => setOpen((value) => !value)}
      >
        <span />
        <span />
        <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
      </button>
      <nav id="site-nav" ref={navRef} className={`header-nav ${open ? "is-open" : ""}`} aria-label="Primary">
        <div className="nav-links">
          {content.nav.links.map((link, i) => (
            <NavLink
              key={link.href}
              to={link.href}
              onClick={(event) => {
                setOpen(false);
                const hashIndex = link.href.indexOf("#");
                if (hashIndex < 0) return;
                const hash = link.href.slice(hashIndex);
                if (location.pathname !== "/" || location.hash !== hash) return;
                event.preventDefault();
                const id = decodeURIComponent(hash.slice(1));
                document.getElementById(id)?.scrollIntoView({
                  behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
                  block: "start",
                });
              }}
            >
              <Editable path={`nav.links.${i}.label`} />
            </NavLink>
          ))}
        </div>
        <a className="btn btn-primary" href={bookingHref(content.contact)} target="_blank" rel="noreferrer">
          <Editable path="nav.cta" />
        </a>
      </nav>
    </header>
  );
}
