import { useEffect, useState } from "react";
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
        className="nav-toggle"
        aria-expanded={open}
        aria-controls="site-nav"
        onClick={() => setOpen((value) => !value)}
      >
        <span />
        <span />
        <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
      </button>
      <nav id="site-nav" className={`header-nav ${open ? "is-open" : ""}`}>
        <div className="nav-links">
          {content.nav.links.map((link, i) => (
            <NavLink key={link.href} to={link.href}>
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
