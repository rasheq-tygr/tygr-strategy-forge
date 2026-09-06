import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useSite } from "../context/SiteContext";
import { bookingHref } from "../lib/api";
import { toRouterLocation } from "../lib/navHref";
import { Editable } from "./Editable";
import { TigerMark } from "./TigerMark";

export function Header() {
  const { content } = useSite();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`header ${scrolled ? "scrolled" : ""}`}>
      <Link to="/" className="brand">
        <TigerMark />
        <Editable path="brand.name" />
      </Link>
      <nav className="header-nav">
        <div className="nav-links" style={{ display: "flex", gap: "1.4rem" }}>
          {content.nav.links.map((link, i) => (
            <NavLink key={link.href} to={toRouterLocation(link.href)}>
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
