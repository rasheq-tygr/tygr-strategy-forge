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

function footerMark() {
  return document.querySelector<SVGElement>(".footer-mark, .footer .brand svg");
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
 * tiger through the One hub section, then holds the finished mark flat on
 * the right. Over a light section it only drops back. As the footer enters,
 * the mark flies in a straight line onto the footer emblem and stays there.
 * The navbar tiger stays put.
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
        const restW = narrow ? Math.min(210, vw * 0.46) : Math.min(380, vw * 0.3);
        const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
        const restTop = narrow ? 6.2 * rootPx : vh * 0.18;
        const inset = Math.max(24, (vw - 1180) / 2 + 12);
        const restLeft = narrow ? (vw - restW) / 2 : Math.max(inset, vw - inset - restW);
        const footer = document.querySelector<HTMLElement>(".footer");
        const dock = footerMark();
        const footerTop = footer?.getBoundingClientRect().top ?? vh + 1;
        const footerHeight = footer?.offsetHeight ?? vh * 0.4;
        // Starts as the footer enters. Lands before the footer scroll runs out, then sticks.
        const fly = clamp((vh - footerTop) / Math.max(footerHeight * 0.72, 1));
        const dockRect = dock?.getBoundingClientRect();
        const left = dockRect ? restLeft + (dockRect.left - restLeft) * fly : restLeft;
        const top = dockRect ? restTop + (dockRect.top - restTop) * fly : restTop;
        const width = dockRect ? restW + (dockRect.width - restW) * fly : restW;
        el.style.position = "fixed";
        el.style.right = "auto";
        el.style.transform = "none";
        el.style.top = `${top}px`;
        el.style.left = `${left}px`;
        el.style.width = `${width}px`;
        el.style.zIndex = fly > 0 ? "8" : "2";
        if (dock) dock.style.opacity = String(1 - clamp((fly - 0.82) / 0.18));
        const box = el.getBoundingClientRect();
        const midY = box.top + box.height * 0.45;
        const light =
          (backdropIsLight(box.left + box.width * 0.3, midY) ? 1 : 0) +
          (backdropIsLight(box.left + box.width * 0.6, midY) ? 1 : 0) +
          (backdropIsLight(box.left + box.width * 0.5, box.top + box.height * 0.7) ? 1 : 0);
        const onLight = light / 3;
        // Full strength on navy. On cream, stay visible and only go faint.
        const rested = 1 - onLight * 0.58;
        const opacity = rested + (1 - rested) * fly;
        el.style.opacity = opacity.toFixed(3);
        el.classList.toggle("is-on-light", onLight > 0.5 && fly < 0.85);
        el.classList.toggle("is-docked", fly > 0.85);
        plane.style.transform = "none";
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
      const dock = footerMark();
      if (dock) dock.style.opacity = "";
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
