import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useSite } from "../context/SiteContext";
import { BookingCta } from "./BookingCta";
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
            <NavLink key={link.href} to={link.href}>
              <Editable path={`nav.links.${i}.label`} />
            </NavLink>
          ))}
        </div>
        <BookingCta className="btn btn-primary" path="nav.cta" />
      </nav>
    </header>
  );
}
