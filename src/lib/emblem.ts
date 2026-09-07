/** Authentic TYGR Ventures tiger — the 8 geometric pieces from the brand mark. */
export const EMBLEM_VIEWBOX = "0 0 549.75 499";
export const EMBLEM_RATIO = 499 / 549.75;
/** Approximate center of the emblem in viewBox units. */
export const EMBLEM_CENTER = { x: 274.88, y: 249.5 };
export const EMBLEM_WIDTH = 549.75;
export const EMBLEM_HEIGHT = 499;

/**
 * Discrete geometric blocks of the brand mark:
 * body, brow, forehead triangle, outer frame, then the four jaw/stripe shards.
 */
export const EMBLEM_BLOCKS = [
  "M344.24,298.04v58.8l127.67,64.75-19.27,15.94-120.77-60.73-45.29,16.19v63.36l20.41,14.2c10.03,7,23.34,7.1,33.47.2l37.94-25.77,22.59,13.06-46.43,31.53c-18.67,12.71-43.25,12.56-61.77-.35l-17.93-12.51-17.88,12.51c-18.52,12.91-43.1,13.06-61.77.35l-46.48-31.53,22.59-13.06,37.99,25.77c10.13,6.9,23.44,6.8,33.47-.2l20.36-14.2v-63.36l-45.29-16.19-120.77,58.94-19.27-15.94,127.67-62.97v-58.8l-127.67-73.64v-82.68l151.11,87.75v27.11l-127.67-74.14v28.4l127.67,73.69v71.56l45.93,16.59,45.93-16.59v-71.56l127.67-73.69v-28.4l-127.67,74.14v-27.11l151.11-87.75v82.68l-127.67,73.64Z",
  "M480.96,92.15l-206.08,124.25L68.79,92.15c-5.51-3.33-7.3-10.58-3.97-16.09,2.18-3.67,6.11-5.71,10.03-5.71,2.09,0,4.17.55,6.06,1.69l193.97,116.95,193.97-116.95c1.89-1.14,3.97-1.69,6.06-1.69,3.92,0,7.85,2.04,10.03,5.71,3.33,5.51,1.54,12.76-3.97,16.09Z",
  "M346.93,92.05 L274.88,143.55 L202.82,92.05 Z",
  "M549.64,67.67l-5.61,94.05v123.62l-23.44-13.56v-110.42l5.66-95.1c.89-15.49-6.51-29.4-19.86-37.24-13.36-7.85-29.15-7.5-42.21.84l-70.07,44.84-119.23-34.96-119.23,34.96L85.58,29.88c-13.06-8.34-28.85-8.69-42.21-.84-13.36,7.85-20.76,21.75-19.86,37.24l5.66,95.1v110.42l-23.44,13.56v-123.62L.12,67.67C-1.32,43.59,10.69,21.04,31.5,8.83c20.81-12.22,46.38-11.72,66.69,1.29l61.13,39.08,115.56-33.87,115.56,33.87,61.13-39.08c20.31-13.01,45.88-13.51,66.69-1.29,20.81,12.22,32.82,34.76,31.38,58.85Z",
  "M181.26,312.74 L181.26,339.85 L180.76,339.55 L157.47,326.04 L77.82,279.76 L77.82,252.65 Z",
  "M154.49,352.81 L129.12,365.17 L105.13,351.27 L77.82,335.38 L77.82,308.27 L130.41,338.81 Z",
  "M368.47,312.74 L368.47,339.85 L368.97,339.55 L392.26,326.04 L471.91,279.76 L471.91,252.65 Z",
  "M395.24,352.81 L420.61,365.17 L444.6,351.27 L471.91,335.38 L471.91,308.27 L419.32,338.81 Z",
];

/** Combined mark for single-path consumers (favicon, lockups). */
export const EMBLEM_PATH = EMBLEM_BLOCKS.join(" ");

export type EmblemShard = {
  x: number;
  y: number;
  size: number;
  dx: number;
  dy: number;
  rot0: number;
  rot1: number;
  start: number;
  span: number;
  points: string;
};

const fract = (n: number) => n - Math.floor(n);
const hash = (n: number) => fract(Math.sin(n * 127.1 + 311.7) * 43758.5453);

function emblemPath2D() {
  const path = new Path2D();
  for (const d of EMBLEM_BLOCKS) path.addPath(new Path2D(d));
  return path;
}

/**
 * Sample the filled tiger mark on a grid and turn each hit into a small
 * scattered shard. Returns hundreds of blocks that lerp back into the silhouette.
 */
export function sampleEmblemShards(target = 320): EmblemShard[] {
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(EMBLEM_WIDTH);
  canvas.height = Math.ceil(EMBLEM_HEIGHT);
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];

  const path = emblemPath2D();
  const hits: { x: number; y: number }[] = [];
  const step = 16;
  for (let y = step / 2; y < EMBLEM_HEIGHT; y += step) {
    for (let x = step / 2; x < EMBLEM_WIDTH; x += step) {
      if (ctx.isPointInPath(path, x, y, "evenodd")) hits.push({ x, y });
    }
  }

  if (hits.length === 0) return [];

  const stride = Math.max(1, Math.floor(hits.length / target));
  const shards: EmblemShard[] = [];
  for (let i = 0; i < hits.length; i += stride) {
    const n = shards.length;
    const h0 = hash(n + 1);
    const h1 = hash(n + 19);
    const h2 = hash(n + 47);
    const h3 = hash(n + 73);
    const h4 = hash(n + 101);
    const angle = h0 * Math.PI * 2;
    const dist = 160 + h1 * 420;
    const size = 11 + h2 * 10;
    const half = size / 2;
    const skew = (h3 - 0.5) * 4;
    shards.push({
      x: hits[i].x,
      y: hits[i].y,
      size,
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist,
      rot0: (h2 - 0.5) * 220,
      rot1: (h3 - 0.5) * 14,
      start: h4 * 0.22,
      span: 0.34 + h1 * 0.14,
      points: `${half + skew},0 ${size},${half - skew * 0.4} ${half - skew},${size} 0,${half + skew * 0.3}`,
    });
  }
  return shards;
}
