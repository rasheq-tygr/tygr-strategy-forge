import { Link } from "react-router-dom";
import { useSite } from "../context/SiteContext";
import { Editable } from "./Editable";
import { SocialLinks } from "./SocialLinks";
import { TigerMark } from "./TigerMark";

export function Footer() {
  const { content } = useSite();
  const tel = content.contact.phone.replace(/[^\d+]/g, "");

  return (
    <footer className="footer">
      <div className="wrap footer-grid">
        <div className="footer-brand">
          <Link to="/" className="brand">
            <TigerMark size={48} />
            <Editable path="brand.name" className="wordmark" />
          </Link>
          <p className="footer-blurb">
            <Editable path="footer.blurb" multiline />
          </p>
        </div>
        <div className="footer-col">
          <p className="eyebrow">Contact</p>
          <a href={`mailto:${content.contact.email}`}>
            <Editable path="contact.email" />
          </a>
          <a href={`tel:${tel}`}>
            <Editable path="contact.phone" />
          </a>
          <p className="footer-founder">
            <Editable path="founder.name" /> · <Editable path="founder.role" />
          </p>
        </div>
        <div className="footer-col footer-elsewhere">
          <p className="eyebrow">Elsewhere</p>
          <SocialLinks />
        </div>
      </div>
      <div className="wrap footer-bottom">
        <small>
          <Editable path="footer.copyright" />
        </small>
        <Link to="/admin" className="footer-edit">
          <Editable path="footer.editHint" />
        </Link>
      </div>
    </footer>
  );
}
