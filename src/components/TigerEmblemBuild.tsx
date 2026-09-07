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

function buildTarget() {
  const dest = document.getElementById("ecosystem");
  if (!dest) return null;
  const destY = dest.getBoundingClientRect().top + window.scrollY;
  return { destY, range: Math.max(1, destY - window.innerHeight * 0.28) };
}

/**
 * Shards scatter in the hero, then fuse into the solid brand mark by the
 * Orbit section (the second full section after the hero).
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
    let frame = 0;
    let overDark = true;
    let cur = 0;
    const render = () => {
      const target = buildTarget();
      const p = reduce ? 1 : target ? clamp(window.scrollY / target.range) : 1;
      const fuse = reduce ? 1 : clamp((p - 0.72) / 0.22);
      const shardFade = 1 - fuse;

      const wrapH = wrap.current?.offsetHeight ?? 0;
      if (wrap.current && target) {
        const endTop = Math.max(0, target.destY - wrapH * 0.12);
        wrap.current.style.top = `${p * endTop}px`;
      }

      if (!reduce) {
        shards.forEach((shard, i) => {
          const el = shardsRef.current[i];
          if (el) applyShard(el, shard, p, shardFade);
        });
      }
      if (solid.current) solid.current.style.opacity = fuse.toFixed(3);

      if (frame % 6 === 0) overDark = isDarkBehind();
      frame += 1;
      const vis = overDark ? 0.98 : 0.22;
      cur += (vis - cur) * 0.18;
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
        <g className="emblem-solid" ref={solid} style={{ opacity: 0 }}>
          {EMBLEM_BLOCKS.map((d) => (
            <path key={d.slice(0, 24)} d={d} fill="currentColor" fillRule="evenodd" />
          ))}
        </g>
      </svg>
    </div>
  );
}
