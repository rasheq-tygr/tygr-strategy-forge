import { useEffect, useRef, useState } from "react";
import {
  EMBLEM_BLOCKS,
  EMBLEM_HEIGHT,
  EMBLEM_VIEWBOX,
  EMBLEM_WIDTH,
  sampleEmblemShards,
  type EmblemShard,
} from "../lib/emblem";

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

function scrollMetrics() {
  const dest = document.getElementById("ecosystem");
  const vh = window.innerHeight || 1;
  // Solid after about half a screen — not the whole journey to Orbit.
  const assemble = clamp(window.scrollY / (vh * 0.45));
  let migrate = 0;
  if (dest) {
    const r = dest.getBoundingClientRect();
    // Stay big on the right while Orbit is in view; slide left as we leave it.
    const start = vh * 0.35;
    const end = -r.height * 0.25;
    migrate = clamp((start - r.top) / Math.max(1, start - end));
  }
  return { assemble, migrate, dest };
}

/**
 * Scatter in the hero, lock into a big solid mark by The Orbit, then
 * migrate left into the navbar as you keep scrolling.
 */
export function TigerEmblemBuild({ className }: { className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<SVGSVGElement>(null);
  const solid = useRef<SVGGElement>(null);
  const shardsRef = useRef<(SVGPolygonElement | null)[]>([]);
  const [shards, setShards] = useState<EmblemShard[]>([]);

  useEffect(() => {
    setShards(sampleEmblemShards(340));
  }, []);

  useEffect(() => {
    if (shards.length === 0) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const applyShard = (el: SVGPolygonElement, shard: EmblemShard, p: number, shardFade: number) => {
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
      el.style.opacity = String((0.4 + local * 0.6) * shardFade);
    };

    const brand = () => document.querySelector<SVGElement>(".header .brand-mark");

    if (reduce) {
      shards.forEach((shard, i) => {
        const el = shardsRef.current[i];
        if (el) applyShard(el, shard, 1, 0);
      });
      if (solid.current) solid.current.style.opacity = "1";
      brand()?.classList.add("is-home");
      if (wrap.current) wrap.current.style.opacity = "0";
    }

    let raf = 0;
    const render = () => {
      const { assemble, migrate, dest } = scrollMetrics();
      const p = reduce ? 1 : assemble;
      const fuse = reduce ? 1 : clamp((p - 0.08) / 0.32);
      const down = reduce ? 1 : easeOut(p);
      const dock = reduce ? 1 : easeOut(migrate);
      const shardFade = 1 - fuse;

      if (!reduce) {
        shards.forEach((shard, i) => {
          const el = shardsRef.current[i];
          if (el) applyShard(el, shard, p, shardFade);
        });
      }
      if (solid.current) solid.current.style.opacity = fuse.toFixed(3);

      const mark = brand();
      const el = wrap.current;
      if (el && mark) {
        const b = mark.getBoundingClientRect();
        const vw = window.innerWidth;
        const max = 1180;
        const inset = Math.max(24, (vw - max) / 2 + 12);
        const startW = Math.min(420, vw * 0.36);
        const startX = Math.max(inset, vw - inset - startW);
        const startY = window.scrollY + window.innerHeight * 0.14;
        const orbitY = dest
          ? dest.getBoundingClientRect().top + window.scrollY + 40
          : startY + window.innerHeight * 0.6;
        const midX = startX;
        const midY = startY + (orbitY - startY) * down;
        const destX = b.left;
        const destY = b.top + window.scrollY;
        const destW = Math.max(28, b.width);
        const x = midX + (destX - midX) * dock;
        const y = midY + (destY - midY) * dock;
        const w = startW + (destW - startW) * dock;
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.style.right = "auto";
        el.style.width = `${w}px`;
        el.style.transform = "none";
      }

      if (canvas.current) {
        // Big and readable in Orbit; brighter as he docks in the nav.
        const vis = 0.72 + dock * 0.28;
        canvas.current.style.opacity = vis.toFixed(3);
        const glow = 8 + (1 - fuse) * 10 + dock * 6;
        const glowA = 0.12 + (1 - fuse) * 0.12 + dock * 0.35;
        canvas.current.style.filter = `drop-shadow(0 0 ${glow.toFixed(1)}px rgba(235, 132, 0, ${clamp(glowA).toFixed(3)}))`;
      }

      mark?.classList.toggle("is-home", dock > 0.92);
      if (wrap.current) wrap.current.style.opacity = dock > 0.97 ? "0" : "1";

      const hint = document.querySelector<HTMLElement>(".scroll-hint");
      if (hint) hint.classList.toggle("is-away", window.scrollY > 48);

      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(raf);
      brand()?.classList.remove("is-home");
    };
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
        <g className="emblem-solid" ref={solid} style={{ opacity: 0 }}>
          {EMBLEM_BLOCKS.map((d) => (
            <path key={d.slice(0, 24)} d={d} fill="currentColor" fillRule="evenodd" />
          ))}
        </g>
      </svg>
    </div>
  );
}
