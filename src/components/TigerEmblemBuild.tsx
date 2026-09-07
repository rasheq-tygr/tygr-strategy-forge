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
    assemble = clamp(window.scrollY / Math.max(1, destY - window.innerHeight * 0.35));
  }
  return { travel, assemble };
}

/**
 * Shards scatter in the hero, fuse into the solid brand mark by The Orbit,
 * then the finished emblem keeps traveling down to the footer.
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

    if (reduce) {
      shards.forEach((shard, i) => {
        const el = shardsRef.current[i];
        if (el) applyShard(el, shard, 1, 0);
      });
      if (solid.current) solid.current.style.opacity = "1";
    }

    let raf = 0;
    const render = () => {
      const { travel, assemble } = scrollMetrics();
      const p = reduce ? 1 : assemble;
      const fuse = reduce ? 1 : clamp((p - 0.62) / 0.28);
      const shardFade = 1 - fuse;

      const shell = wrap.current?.parentElement;
      const shellH = shell?.scrollHeight ?? document.documentElement.scrollHeight;
      const wrapH = wrap.current?.offsetHeight ?? 0;
      if (wrap.current) {
        wrap.current.style.top = `${(reduce ? 1 : travel) * Math.max(0, shellH - wrapH)}px`;
      }

      if (!reduce) {
        shards.forEach((shard, i) => {
          const el = shardsRef.current[i];
          if (el) applyShard(el, shard, p, shardFade);
        });
      }
      if (solid.current) solid.current.style.opacity = fuse.toFixed(3);
      if (canvas.current) {
        // Bright while building in the hero; a quiet watermark from Orbit through footer.
        const rest = 0.2 - travel * 0.04;
        const vis = 0.92 - fuse * (0.92 - rest);
        canvas.current.style.opacity = vis.toFixed(3);
        const glow = (1 - fuse) * 22;
        const glowA = (1 - fuse) * 0.26;
        canvas.current.style.filter = `drop-shadow(0 0 ${glow.toFixed(1)}px rgba(235, 132, 0, ${glowA.toFixed(3)}))`;
      }

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
        <g className="emblem-solid" ref={solid} style={{ opacity: 0 }}>
          {EMBLEM_BLOCKS.map((d) => (
            <path key={d.slice(0, 24)} d={d} fill="currentColor" fillRule="evenodd" />
          ))}
        </g>
      </svg>
    </div>
  );
}
