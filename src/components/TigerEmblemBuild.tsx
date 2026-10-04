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

function backdropIsLight(x: number, y: number) {
  const nodes = document.elementsFromPoint(x, y);
  for (const node of nodes) {
    if (!(node instanceof Element) || node.closest(".page-emblem, .header")) continue;
    const match = getComputedStyle(node).backgroundColor.match(
      /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/,
    );
    if (!match) continue;
    const alpha = match[4] === undefined ? 1 : Number(match[4]);
    if (alpha < 0.45) continue;
    const luminance = (0.2126 * Number(match[1]) + 0.7152 * Number(match[2]) + 0.0722 * Number(match[3])) / 255;
    return luminance > 0.72;
  }
  return false;
}

/**
 * Home: the page loads as scattered shards. Scrolling draws them into the
 * tiger through the One hub section, then turns the finished mark. It stays
 * on screen until that section has scrolled past. The navbar tiger stays put.
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
      const eco = document.querySelector<HTMLElement>("#ecosystem");
      const vh = window.innerHeight || 1;
      const scrollY = window.scrollY;
      const ecoRect = eco?.getBoundingClientRect();
      const journeyEnd = ecoRect ? ecoRect.bottom + scrollY - vh * 0.2 : (hero?.offsetHeight || vh) * 1.6;
      const progress = clamp(scrollY / Math.max(journeyEnd, 1));
      const build = clamp(progress / 0.72) * 0.45;
      const fuse = clamp((build - 0.22) / 0.2);
      const shardFade = 1 - fuse;
      const formed = fuse > 0.98;
      const tiltT = formed ? clamp((progress - 0.55) / 0.35) : 0;
      const depth = 1 - clamp((progress - 0.9) / 0.1);

      shards.forEach((shard, i) => {
        const el = shardsRef.current[i];
        if (el) applyShard(el, shard, build, shardFade);
      });
      if (solid.current) solid.current.style.opacity = fuse.toFixed(3);

      brandMark()?.classList.add("is-home");

      const el = wrap.current;
      const plane = tilt.current;
      if (el && plane) {
        const vw = window.innerWidth;
        const narrow = vw < 980;
        const startW = narrow ? Math.min(210, vw * 0.46) : Math.min(380, vw * 0.3);
        const pitch = 10 * tiltT;
        const yaw = 16 * tiltT;
        el.style.position = "fixed";
        el.style.top = narrow ? "6.2rem" : "18vh";
        el.style.width = `${startW}px`;
        el.style.right = "auto";
        el.style.zIndex = "2";
        el.style.transform = narrow ? "translateX(-50%)" : "none";
        if (narrow) {
          el.style.left = "50%";
        } else {
          const inset = Math.max(24, (vw - 1180) / 2 + 12);
          el.style.left = `${Math.max(inset, vw - inset - startW)}px`;
        }
        const box = el.getBoundingClientRect();
        const midY = box.top + box.height * 0.45;
        const light =
          (backdropIsLight(box.left + box.width * 0.3, midY) ? 1 : 0) +
          (backdropIsLight(box.left + box.width * 0.6, midY) ? 1 : 0) +
          (backdropIsLight(box.left + box.width * 0.5, box.top + box.height * 0.7) ? 1 : 0);
        const onLight = light / 3;
        el.style.opacity = (depth * (1 - onLight * 0.88)).toFixed(3);
        el.classList.toggle("is-on-light", onLight > 0.5);
        plane.style.transform = formed
          ? `rotateX(${pitch.toFixed(2)}deg) rotateY(${yaw.toFixed(2)}deg)`
          : "none";
      }

      const hint = document.querySelector<HTMLElement>(".scroll-hint");
      if (hint) hint.classList.toggle("is-away", window.scrollY > 48);

      // The pointer grid is the field the shards cross. It is gone once they fuse into the mark.
      const grid = hero?.querySelector<HTMLElement>(".hero-layers");
      if (grid) grid.style.opacity = (1 - clamp(build / 0.42)).toFixed(3);

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
