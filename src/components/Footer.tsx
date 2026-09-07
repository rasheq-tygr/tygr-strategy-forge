import { Link } from "react-router-dom";
import { useSite } from "../context/SiteContext";
import { safeHref } from "../lib/security";
import { Editable } from "./Editable";
import { TigerMark } from "./TigerMark";

export function Footer() {
  const { content } = useSite();

  return (
    <footer className="footer">
      <div className="wrap footer-grid">
        <div>
          <div className="brand" style={{ marginBottom: "1rem" }}>
            <TigerMark />
            <Editable path="brand.name" />
          </div>
          <p>
            <Editable path="footer.blurb" multiline />
          </p>
        </div>
        <div>
          <p className="eyebrow">Contact</p>
          <a href={`mailto:${content.contact.email}`}>
            <Editable path="contact.email" />
          </a>
          <a href={`tel:${content.contact.phone.replace(/[^\d+]/g, "")}`}>
            <Editable path="contact.phone" />
          </a>
          <p>
            <Editable path="founder.name" /> · <Editable path="founder.role" />
          </p>
        </div>
        <div>
          <p className="eyebrow">Elsewhere</p>
          <a href={safeHref(content.social.linkedin) || undefined} target="_blank" rel="noreferrer">
            LinkedIn
          </a>
          <br />
          <a href={safeHref(content.social.x) || undefined} target="_blank" rel="noreferrer">
            X
          </a>
          <br />
          <a href={safeHref(content.social.instagram) || undefined} target="_blank" rel="noreferrer">
            Instagram
          </a>
          <p style={{ marginTop: "1.2rem" }}>
            <Link to="/admin">
              <Editable path="footer.editHint" />
            </Link>
          </p>
        </div>
      </div>
      <div className="wrap" style={{ marginTop: "2rem" }}>
        <small>
          <Editable path="footer.copyright" />
        </small>
      </div>
    </footer>
  );
}
