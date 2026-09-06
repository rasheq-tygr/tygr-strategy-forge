import { useEffect, useRef } from "react";
import {
  BUILD_STAGES,
  EMBLEM_BLOCKS,
  EMBLEM_CENTER,
  EMBLEM_VIEWBOX,
} from "../lib/emblem";

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

type BlockMeta = { dx: number; dy: number; cx: number; cy: number; angle: number; start: number };

/**
 * "From idea to done": the emblem's geometric blocks start scattered (the raw
 * idea), snap together into the finished logo as the user scrolls, then the
 * whole mark recedes into the background as they continue down the page.
 */
export function TigerEmblemBuild({ className }: { className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<SVGSVGElement>(null);
  const stepper = useRef<HTMLDivElement>(null);
  const blocks = useRef<(SVGPathElement | null)[]>([]);
  const steps = useRef<(HTMLSpanElement | null)[]>([]);
  const fill = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const paths = blocks.current.filter(Boolean) as SVGPathElement[];
    const n = paths.length;

    const meta: BlockMeta[] = paths.map((p, i) => {
      let cx = EMBLEM_CENTER.x;
      let cy = EMBLEM_CENTER.y;
      try {
        const b = p.getBBox();
        cx = b.x + b.width / 2;
        cy = b.y + b.height / 2;
      } catch {
        /* getBBox can throw for empty paths; fall back to center */
      }
      let dx = cx - EMBLEM_CENTER.x;
      let dy = cy - EMBLEM_CENTER.y;
      const len = Math.hypot(dx, dy) || 1;
      dx /= len;
      dy /= len;
      const angle = (i % 2 === 0 ? 1 : -1) * (16 + ((i * 17) % 34));
      return { dx, dy, cx, cy, angle, start: (i / n) * 0.5 };
    });

    const SPAN = 0.55;
    const DIST = 96;

    const setStage = (p: number) => {
      const idx = p < 0.3 ? 0 : p < 0.6 ? 1 : p < 0.9 ? 2 : 3;
      steps.current.forEach((el, i) => {
        if (!el) return;
        el.classList.toggle("is-active", i === idx);
        el.classList.toggle("is-done", i < idx);
      });
      if (fill.current) fill.current.style.width = `${clamp(p) * 100}%`;
    };

    // Assembled emblem stays as a faint watermark that travels with the page.
    const WATERMARK = 0.06;
    const PEAK = 1;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      paths.forEach((p) => {
        p.removeAttribute("transform");
        p.style.opacity = "1";
      });
      setStage(1);
      if (canvas.current) canvas.current.style.opacity = String(WATERMARK);
      if (stepper.current) stepper.current.style.opacity = "0";
      return;
    }

    let raf = 0;
    const render = () => {
      const vh = window.innerHeight || 800;
      const p = clamp(window.scrollY / (vh * 0.7));
      paths.forEach((path, i) => {
        const m = meta[i];
        const local = clamp((p - m.start) / SPAN);
        const e = easeOut(local);
        const off = (1 - e) * DIST;
        const rot = (1 - e) * m.angle;
        path.setAttribute(
          "transform",
          `translate(${(m.dx * off).toFixed(2)} ${(m.dy * off).toFixed(2)}) rotate(${rot.toFixed(2)} ${m.cx.toFixed(2)} ${m.cy.toFixed(2)})`,
        );
        // Blocks are already visible while scattered (the raw "idea"), then
        // firm up to full opacity as they lock into place ("done").
        path.style.opacity = String(clamp(0.42 + local * 0.58));
      });
      setStage(p);
      // Once assembled ("done"), recede to a faint watermark that keeps
      // travelling with the viewport as the reader continues down the page.
      const fade = clamp((window.scrollY / vh - 0.72) / 0.5);
      if (canvas.current) {
        canvas.current.style.opacity = String(PEAK - fade * (PEAK - WATERMARK));
      }
      if (stepper.current) {
        stepper.current.style.opacity = String(1 - clamp((window.scrollY / vh - 0.66) / 0.25));
      }
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className={`emblem-build ${className ?? ""}`} ref={wrap}>
      <svg className="emblem-canvas" viewBox={EMBLEM_VIEWBOX} fill="none" aria-hidden="true" ref={canvas}>
        {EMBLEM_BLOCKS.map((d, i) => (
          <path
            key={i}
            ref={(el) => {
              blocks.current[i] = el;
            }}
            d={d}
            fill="currentColor"
            fillRule="evenodd"
            style={{ opacity: 0 }}
          />
        ))}
      </svg>
      <div className="emblem-stepper" aria-hidden="true" ref={stepper}>
        <span className="emblem-stepper-eyebrow">From idea to done</span>
        <div className="emblem-stepper-track">
          <span className="emblem-stepper-fill" ref={fill} />
        </div>
        <div className="emblem-stepper-steps">
          {BUILD_STAGES.map((label, i) => (
            <span
              key={label}
              className="emblem-step"
              ref={(el) => {
                steps.current[i] = el;
              }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
