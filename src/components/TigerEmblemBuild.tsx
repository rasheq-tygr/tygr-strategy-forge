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
  const doc = document.documentElement;
  const maxScroll = Math.max(1, doc.scrollHeight - window.innerHeight);
  const travel = clamp(window.scrollY / maxScroll);
  let assemble = travel;
  if (dest) {
    const destY = dest.getBoundingClientRect().top + window.scrollY;
    assemble = clamp(window.scrollY / Math.max(1, destY - window.innerHeight * 0.32));
  }
  return { travel, assemble, dest };
}

/**
 * Scatter in the hero (right), fuse while dropping toward The Orbit, then
 * dock into the navbar lockup — bright and small — which is his home.
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
      const { assemble, dest } = scrollMetrics();
      const p = reduce ? 1 : assemble;
      const fuse = reduce ? 1 : clamp((p - 0.45) / 0.28);
      const down = reduce ? 1 : easeOut(clamp(p / 0.5));
      const dock = reduce ? 1 : easeOut(clamp((p - 0.42) / 0.58));
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
        const startW = Math.min(380, vw * 0.32);
        const startX = Math.max(inset, vw - inset - startW);
        const startY = window.scrollY + window.innerHeight * 0.16;
        const orbitY = dest
          ? dest.getBoundingClientRect().top + window.scrollY + 56
          : startY + window.innerHeight;
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
        // Quiet while crossing The Orbit, then bright once he lives in the nav.
        const vis = dock < 0.55 ? 0.95 - dock * 1.1 : 0.35 + (dock - 0.55) * 1.45;
        canvas.current.style.opacity = clamp(vis).toFixed(3);
        const glow = dock < 0.7 ? (1 - fuse) * 20 : 6 + dock * 6;
        const glowA = dock < 0.7 ? (1 - fuse) * 0.24 : 0.15 + dock * 0.4;
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
