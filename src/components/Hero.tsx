import { useEffect, useRef } from "react";
import { useSite } from "../context/SiteContext";
import { bookingHref } from "../lib/api";
import { Editable } from "./Editable";

export function Hero() {
  const { content } = useSite();
  const root = useRef<HTMLElement>(null);
  const layers = useRef<HTMLDivElement>(null);
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const el = root.current;
    const layer = layers.current;
    if (!el || !layer) return;

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      target.current = {
        x: ((e.clientX - rect.left) / rect.width - 0.5) * 28,
        y: ((e.clientY - rect.top) / rect.height - 0.5) * 18,
      };
    };

    let raf = 0;
    const tick = () => {
      current.current.x += (target.current.x - current.current.x) * 0.08;
      current.current.y += (target.current.y - current.current.y) * 0.08;
      const { x, y } = current.current;
      layer.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    el.addEventListener("mousemove", onMove);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("mousemove", onMove);
    };
  }, []);

  return (
    <section className="hero" ref={root}>
      <div className="hero-layers" ref={layers}>
        <svg className="hero-chevrons" viewBox="0 0 1200 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <path fill="#f97316" d="M0 80 L600 -40 L1200 80 L1200 200 L600 80 L0 200Z" />
          <path fill="#0a0f1a" d="M0 200 L600 80 L1200 200 L1200 320 L600 200 L0 320Z" />
          <path fill="#f97316" d="M0 320 L600 200 L1200 320 L1200 440 L600 320 L0 440Z" />
          <path fill="#0a0f1a" d="M0 440 L600 320 L1200 440 L1200 560 L600 440 L0 560Z" />
          <path fill="#f97316" d="M0 560 L600 440 L1200 560 L1200 680 L600 560 L0 680Z" />
          <path fill="#0a0f1a" d="M0 680 L600 560 L1200 680 L1200 800 L600 680 L0 800Z" />
          <path fill="#f97316" d="M0 800 L600 680 L1200 800 L1200 920 L600 800 L0 920Z" />
        </svg>
        <div className="hero-grid" />
        <div className="block-wave" aria-hidden="true">
          {Array.from({ length: 14 }, (_, i) => (
            <span
              key={i}
              className="cube"
              style={{
                left: `${8 + ((i * 17) % 84)}%`,
                top: `${18 + ((i * 23) % 52)}%`,
                opacity: 0.18 + (i % 5) * 0.08,
              }}
            />
          ))}
        </div>
      </div>
      <div className="wrap hero-content">
        <div className="hero-copy">
          <p className="eyebrow">
            <Editable path="hero.eyebrow" />
          </p>
          <h1 className="display-xl">
            <Editable path="hero.titleLead" />
            <br />
            <span className="accent-italic">
              <Editable path="hero.titleAccent" />
            </span>
          </h1>
          <p>
            <Editable path="hero.body" multiline />
          </p>
          <div className="hero-actions">
            <a className="btn btn-primary" href={bookingHref(content.contact.bookingUrl, content.contact.email)}>
              <Editable path="hero.primaryCta" />
            </a>
            <a className="btn btn-ghost" href="#ecosystem">
              <Editable path="hero.secondaryCta" />
            </a>
          </div>
        </div>
      </div>
      <div className="scroll-hint">
        <Editable path="hero.scrollHint" />
        <span className="arrow" />
      </div>
      <div className="hero-rail">
        <div className="wrap">
          <Editable path="hero.eyebrow" />
        </div>
      </div>
    </section>
  );
}
