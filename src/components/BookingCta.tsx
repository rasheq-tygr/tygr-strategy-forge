import { Link } from "react-router-dom";
import { useSite } from "../context/SiteContext";
import { bookingHref } from "../lib/api";
import { Editable } from "./Editable";

/** "Book a call" — stays on /contact when the in-site scheduler is available. */
export function BookingCta({ path, className }: { path: string; className?: string }) {
  const { content } = useSite();
  const href = bookingHref(content.contact);
  const label = <Editable path={path} />;
  if (href.startsWith("/") && !href.startsWith("//")) {
    return (
      <Link className={className} to={href}>
        {label}
      </Link>
    );
  }
  const extra = href.startsWith("mailto:") ? {} : { target: "_blank" as const, rel: "noreferrer" };
  return (
    <a className={className} href={href} {...extra}>
      {label}
    </a>
  );
}
