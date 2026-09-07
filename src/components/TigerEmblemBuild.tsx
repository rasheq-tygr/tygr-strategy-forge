import { useEffect, useRef } from "react";
import { EMBLEM_BLOCKS, EMBLEM_CENTER, EMBLEM_VIEWBOX } from "../lib/emblem";

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

type BlockMeta = { dx: number; dy: number; cx: number; cy: number; angle: number; start: number };

/**
 * The emblem's geometric blocks start scattered, snap together into the
 * finished logo as the user scrolls, then the mark recedes into a watermark.
 */
export function TigerEmblemBuild({ className }: { className?: string }) {
  const canvas = useRef<SVGSVGElement>(null);
  const blocks = useRef<(SVGPathElement | null)[]>([]);

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
    const DIST = 220;

    // Peak while assembling, settle to a faint watermark once assembled.
    const WATERMARK = 0.16;
    const PEAK = 1;

    // Luminance of the first opaque background behind a screen point, walking up
    // the DOM. Returns 1 (treat as light) when nothing opaque is found, so the
    // emblem hides rather than muddies transparent/light content.
    const luminanceBehind = (px: number, py: number) => {
      let node = document.elementFromPoint(px, py) as HTMLElement | null;
      while (node) {
        const nums = getComputedStyle(node).backgroundColor.match(/[\d.]+/g);
        if (nums && nums.length >= 3) {
          const alpha = nums.length >= 4 ? Number(nums[3]) : 1;
          if (alpha > 0.5) {
            const [r, g, b] = nums.map(Number);
            return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
          }
        }
        node = node.parentElement;
      }
      return 1;
    };

    // The emblem only reads well over dark backgrounds. Sample several points
    // spanning the mark's actual bounding box (not one fixed point) and treat it
    // as dark only when *every* covered point is dark. This kills bleed in
    // dark↔light transition zones where the tall mark straddles two sections.
    const isDarkBehind = () => {
      const el = canvas.current;
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return false;
      const px = Math.max(2, Math.min(window.innerWidth - 2, rect.left + rect.width / 2));
      const fracs = [0.12, 0.32, 0.5, 0.68, 0.88];
      let checked = 0;
      for (const f of fracs) {
        const py = rect.top + rect.height * f;
        if (py < 2 || py > window.innerHeight - 2) continue;
        checked += 1;
        if (luminanceBehind(px, py) >= 0.4) return false;
      }
      return checked > 0;
    };

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      paths.forEach((p) => {
        p.removeAttribute("transform");
        p.style.opacity = "1";
      });
    }

    let raf = 0;
    let frame = 0;
    let overDark = true;
    let cur = 0;
    const render = () => {
      const vh = window.innerHeight || 800;
      const p = clamp(window.scrollY / (vh * 0.7));
      if (!reduce) {
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
          path.style.opacity = String(clamp(0.42 + local * 0.58));
        });
      }

      if (frame % 6 === 0) overDark = isDarkBehind();
      frame += 1;
      // Target opacity: 0 over light sections; peak-while-building then a faint
      // watermark over dark sections. Lerp to avoid flicker at section edges.
      let target = 0;
      if (overDark) {
        const fade = clamp((window.scrollY / vh - 0.72) / 0.5);
        target = PEAK - fade * (PEAK - WATERMARK);
      }
      cur += (target - cur) * 0.18;
      if (canvas.current) canvas.current.style.opacity = cur.toFixed(3);
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className={`emblem-build ${className ?? ""}`}>
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
    </div>
  );
}
