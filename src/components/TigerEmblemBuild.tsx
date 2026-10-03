import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  EMBLEM_HEIGHT,
  EMBLEM_MARK_PATH,
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

/**
 * Home: the navbar tiger stays put. The hero tiger is the same mark,
 * turned a few degrees in perspective, and levels out as the hero scrolls
 * away. Other pages: only the navbar mark.
 */
export function TigerEmblemBuild({ className }: { className?: string }) {
  const { pathname } = useLocation();
  const isHome = pathname === "/";
  const wrap = useRef<HTMLDivElement>(null);
  const tilt = useRef<HTMLDivElement>(null);
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
    brandMark()?.classList.add("is-home");
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
      const hero = document.querySelector<HTMLElement>(".hero");
      const rect = hero?.getBoundingClientRect();
      const travel = rect ? clamp(-rect.top / (rect.height * 0.8)) : 1;
      const depth = 1 - clamp((travel - 0.58) / 0.36);

      if (solid.current) solid.current.style.opacity = "1";

      brandMark()?.classList.add("is-home");

      const el = wrap.current;
      const plane = tilt.current;
      if (el && plane) {
        const vw = window.innerWidth;
        const narrow = vw < 980;
        const startW = narrow ? Math.min(210, vw * 0.46) : Math.min(380, vw * 0.3);
        const stand = clamp(travel / 0.9);
        const pitch = 12 * (1 - stand);
        const yaw = 22 * (1 - stand);
        const scale = 0.9 + stand * 0.1;
        const lift = (1 - stand) * (narrow ? 12 : 20);
        el.style.position = "fixed";
        el.style.top = narrow ? "6.2rem" : "18vh";
        el.style.width = `${startW}px`;
        el.style.right = "auto";
        el.style.opacity = depth.toFixed(3);
        el.style.zIndex = "2";
        el.style.transform = narrow ? "translateX(-50%)" : "none";
        if (narrow) {
          el.style.left = "50%";
        } else {
          const inset = Math.max(24, (vw - 1180) / 2 + 12);
          el.style.left = `${Math.max(inset, vw - inset - startW)}px`;
        }
        plane.style.transform = `translateY(${lift.toFixed(1)}px) rotateX(${pitch.toFixed(2)}deg) rotateY(${yaw.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
      }

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
      <div className="emblem-tilt" ref={tilt}>
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
        <g className="emblem-solid" ref={solid} style={{ opacity: 0 }} transform="scale(3.3318181818)">
          <path d={EMBLEM_MARK_PATH} fill="currentColor" fillRule="evenodd" clipRule="evenodd" />
        </g>
      </svg>
      </div>
    </div>
  );
}
