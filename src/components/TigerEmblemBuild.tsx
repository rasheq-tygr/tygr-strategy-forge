import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
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

function brandMark() {
  return document.querySelector<SVGElement>(".header .brand-mark");
}

function scrollMetrics() {
  const dest = document.getElementById("ecosystem");
  const hub = document.querySelector<HTMLElement>("#ecosystem .hub");
  const vh = window.innerHeight || 1;
  const assemble = clamp(window.scrollY / (vh * 0.45));
  let migrate = 0;
  const trigger = hub ?? dest;
  if (trigger) {
    const r = trigger.getBoundingClientRect();
    const point = hub ? r.bottom : r.top + r.height * 0.55;
    // Fly once the hub has been passed — one short beat, not a long drift.
    const start = vh * 0.42;
    const end = vh * 0.06;
    migrate = clamp((start - point) / Math.max(1, start - end));
  }
  return { assemble, migrate, dest };
}

/**
 * Home: scatter in the hero, solid in The Orbit, then fly to the navbar
 * once you pass the hub. Other pages: skip the build; he already lives in the nav.
 */
export function TigerEmblemBuild({ className }: { className?: string }) {
  const { pathname } = useLocation();
  const isHome = pathname === "/";
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<SVGSVGElement>(null);
  const solid = useRef<SVGGElement>(null);
  const shardsRef = useRef<(SVGPolygonElement | null)[]>([]);
  const [shards, setShards] = useState<EmblemShard[]>([]);

  useEffect(() => {
    if (!isHome) {
      setShards([]);
      brandMark()?.classList.add("is-home");
      return;
    }
    brandMark()?.classList.remove("is-home");
    setShards(sampleEmblemShards(340));
  }, [isHome]);

  useEffect(() => {
    if (!isHome) {
      if (wrap.current) wrap.current.style.opacity = "0";
      brandMark()?.classList.add("is-home");
      return;
    }
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

    if (reduce) {
      shards.forEach((shard, i) => {
        const el = shardsRef.current[i];
        if (el) applyShard(el, shard, 1, 0);
      });
      if (solid.current) solid.current.style.opacity = "1";
      brandMark()?.classList.add("is-home");
      if (wrap.current) wrap.current.style.opacity = "0";
      return;
    }

    let raf = 0;
    const render = () => {
      const { assemble, migrate, dest } = scrollMetrics();
      const fuse = clamp((assemble - 0.08) / 0.32);
      const down = easeOut(assemble);
      const dock = easeOut(migrate);
      const shardFade = 1 - fuse;

      shards.forEach((shard, i) => {
        const el = shardsRef.current[i];
        if (el) applyShard(el, shard, assemble, shardFade);
      });
      if (solid.current) solid.current.style.opacity = fuse.toFixed(3);

      const mark = brandMark();
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
        const vis = 0.82 + dock * 0.18;
        canvas.current.style.opacity = vis.toFixed(3);
        canvas.current.style.filter = "drop-shadow(0 0 10px rgba(235, 132, 0, 0.45))";
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
      if (!isHome) brandMark()?.classList.add("is-home");
    };
  }, [shards, isHome]);

  if (!isHome) return null;

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
