import { useEffect, useMemo, useRef, useState } from "react";
import { useSite } from "../context/SiteContext";
import { Editable } from "./Editable";
import { Reveal } from "./Reveal";

export function EcosystemOrbit() {
  const { content } = useSite();
  const stage = useRef<HTMLDivElement>(null);
  const world = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<string>("hub");
  const nodes = content.ecosystem.nodes;
  const progress = useRef(0);
  const mouse = useRef({ x: 0, y: 0 });

  const positions = useMemo(() => {
    return nodes.map((_, i) => {
      const angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
      return { angle };
    });
  }, [nodes]);

  useEffect(() => {
    const el = stage.current;
    const w = world.current;
    if (!el || !w) return;

    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      mouse.current = {
        x: (e.clientX - r.left) / r.width - 0.5,
        y: (e.clientY - r.top) / r.height - 0.5,
      };
    };

    const onScroll = () => {
      const r = el.getBoundingClientRect();
      const view = window.innerHeight || 1;
      progress.current = Math.min(1, Math.max(0, 1 - r.top / (view + r.height)));
    };

    let raf = 0;
    const sats = () => Array.from(el.querySelectorAll<HTMLElement>("[data-sat]"));
    const tick = () => {
      const rot = progress.current * 28 + mouse.current.x * 10;
      const tilt = 8 + mouse.current.y * 6;
      w.style.transform = `rotateX(${tilt}deg) rotateZ(${rot * 0.15}deg)`;
      sats().forEach((node, i) => {
        const base = positions[i];
        if (!base) return;
        const a = base.angle + progress.current * 1.15 + mouse.current.x * 0.25;
        const rx = 38 + Math.sin(progress.current * 3 + i) * 2;
        const ry = 26 + Math.cos(progress.current * 2 + i) * 1.5;
        const x = 50 + Math.cos(a) * rx;
        const y = 48 + Math.sin(a) * ry;
        node.style.left = `${x}%`;
        node.style.top = `${y}%`;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("mousemove", onMove);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      el.removeEventListener("mousemove", onMove);
    };
  }, [positions]);

  const activeNode = nodes.find((n) => n.id === active);

  return (
    <section className="section dark" id="ecosystem">
      <div className="wrap">
        <Reveal>
          <div className="section-head">
            <p className="eyebrow">
              <Editable path="ecosystem.eyebrow" />
            </p>
            <h2 className="display-lg">
              <Editable path="ecosystem.title" />
            </h2>
            <p>
              <Editable path="ecosystem.body" multiline />
            </p>
          </div>
        </Reveal>
        <div className="orbit-stage" ref={stage}>
          <div className="iso-floor" />
          <div className="orbit-ring" style={{ width: "72%", height: "46%" }} />
          <div className="orbit-ring" style={{ width: "48%", height: "30%" }} />
          <div className="orbit-world" ref={world} />
          <button type="button" className="hub" onClick={() => setActive("hub")}>
            <div>
              <strong>
                <Editable path="ecosystem.hubLabel" />
              </strong>
            </div>
          </button>
          {nodes.map((node, i) => (
            <div key={node.id} className={`sat ${active === node.id ? "is-active" : ""}`} data-sat>
              <button type="button" onClick={() => setActive(node.id)}>
                <small>
                  <Editable path={`ecosystem.nodes.${i}.role`} />
                </small>
                <strong>
                  <Editable path={`ecosystem.nodes.${i}.name`} />
                </strong>
              </button>
            </div>
          ))}
        </div>
        <div className="orbit-detail">
          {active === "hub" || !activeNode ? (
            <p>
              <Editable path="ecosystem.hubBody" multiline />
            </p>
          ) : (
            <>
              <p>
                <Editable
                  path={`ecosystem.nodes.${nodes.findIndex((n) => n.id === active)}.summary`}
                  multiline
                />
              </p>
              {activeNode.url ? (
                <a className="arrow-link" href={activeNode.url} target="_blank" rel="noreferrer">
                  Visit {activeNode.name} →
                </a>
              ) : null}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
