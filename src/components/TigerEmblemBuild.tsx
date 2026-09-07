import { useEffect, useRef, useState } from "react";
import {
  EMBLEM_HEIGHT,
  EMBLEM_VIEWBOX,
  EMBLEM_WIDTH,
  sampleEmblemShards,
  type EmblemShard,
} from "../lib/emblem";

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Hundreds of geometric shards start scattered, then lock into the tiger mark
 * as the visitor scrolls the full page. The cluster itself travels from the
 * hero down to the footer so the build lasts the whole site, not one screen.
 */
export function TigerEmblemBuild({ className }: { className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<SVGSVGElement>(null);
  const shardsRef = useRef<(SVGPolygonElement | null)[]>([]);
  const [shards, setShards] = useState<EmblemShard[]>([]);

  useEffect(() => {
    setShards(sampleEmblemShards(340));
  }, []);

  useEffect(() => {
    if (shards.length === 0) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

    const isDarkBehind = () => {
      const el = canvas.current;
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return false;
      const px = Math.max(2, Math.min(window.innerWidth - 2, rect.left + rect.width / 2));
      const fracs = [0.18, 0.5, 0.82];
      let checked = 0;
      for (const f of fracs) {
        const py = rect.top + rect.height * f;
        if (py < 2 || py > window.innerHeight - 2) continue;
        checked += 1;
        if (luminanceBehind(px, py) >= 0.4) return false;
      }
      return checked > 0;
    };

    const applyShard = (el: SVGPolygonElement, shard: EmblemShard, p: number) => {
      const local = reduce ? 1 : easeOut(clamp((p - shard.start) / shard.span));
      const ox = (1 - local) * shard.dx;
      const oy = (1 - local) * shard.dy;
      const rot = shard.rot1 + (1 - local) * (shard.rot0 - shard.rot1);
      const x = shard.x - shard.size / 2 + ox;
      const y = shard.y - shard.size / 2 + oy;
      el.setAttribute(
        "transform",
        `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${rot.toFixed(2)} ${shard.size / 2} ${shard.size / 2})`,
      );
      el.style.opacity = String(0.38 + local * 0.62);
    };

    if (reduce) {
      shards.forEach((shard, i) => {
        const el = shardsRef.current[i];
        if (el) applyShard(el, shard, 1);
      });
    }

    let raf = 0;
    let frame = 0;
    let overDark = true;
    let cur = 0;
    const render = () => {
      const doc = document.documentElement;
      const max = Math.max(1, doc.scrollHeight - window.innerHeight);
      const p = clamp(window.scrollY / max);

      const shell = wrap.current?.parentElement;
      const shellH = shell?.scrollHeight ?? doc.scrollHeight;
      const wrapH = wrap.current?.offsetHeight ?? 0;
      if (wrap.current) {
        wrap.current.style.top = `${p * Math.max(0, shellH - wrapH)}px`;
      }

      if (!reduce) {
        shards.forEach((shard, i) => {
          const el = shardsRef.current[i];
          if (el) applyShard(el, shard, p);
        });
      }

      if (frame % 6 === 0) overDark = isDarkBehind();
      frame += 1;
      // Stay readable on navy; keep a faint watermark on cream so the build
      // is visible all the way to the footer.
      const target = overDark ? 0.96 : 0.26;
      cur += (target - cur) * 0.18;
      if (canvas.current) canvas.current.style.opacity = cur.toFixed(3);

      const hint = document.querySelector<HTMLElement>(".scroll-hint");
      if (hint) hint.classList.toggle("is-away", window.scrollY > 48);

      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [shards]);

  return (
    <div className={`emblem-build ${className ?? ""}`} ref={wrap}>
      <svg
        className="emblem-canvas"
        viewBox={EMBLEM_VIEWBOX}
        width={EMBLEM_WIDTH}
        height={EMBLEM_HEIGHT}
        fill="none"
        aria-hidden="true"
        overflow="visible"
        ref={canvas}
      >
        {shards.map((shard, i) => (
          <polygon
            key={`${shard.x}-${shard.y}-${i}`}
            ref={(el) => {
              shardsRef.current[i] = el;
            }}
            points={shard.points}
            fill="currentColor"
            style={{ opacity: 0 }}
          />
        ))}
      </svg>
    </div>
  );
}
