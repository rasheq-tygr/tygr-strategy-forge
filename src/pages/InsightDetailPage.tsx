import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Editable } from "../components/Editable";
import { RichText } from "../components/RichText";
import { TypeSizeControl } from "../components/TypeSizeControl";
import { useSite } from "../context/SiteContext";
import { splitBodyBlocks } from "../lib/richText";
import { typeSizeClass } from "../lib/textSize";
import type { InsightPhoto } from "../types/content";

type StagePhoto = {
  src: string;
  alt: string;
  caption?: string;
  layout?: InsightPhoto["layout"];
  position?: string;
};

function Lightbox({
  photo,
  onClose,
}: {
  photo: StagePhoto | null;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !photo || dialog.open) return;
    dialog.showModal();
  }, [photo]);

  return (
    <dialog
      ref={dialogRef}
      className="article-lightbox"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
    >
      {photo ? (
        <>
          <img src={photo.src} alt={photo.alt} />
          <button type="button" className="article-lightbox-close" onClick={() => dialogRef.current?.close()}>
            Close
          </button>
        </>
      ) : null}
    </dialog>
  );
}

function ArticleFigure({
  photo,
  onOpen,
}: {
  photo: InsightPhoto;
  onOpen: () => void;
}) {
  return (
    <figure className={`article-figure${photo.layout === "wide" || photo.layout === "band" ? " is-wide" : ""}${photo.layout === "band" ? " is-band" : ""}`}>
      <button type="button" className="article-figure-shot" onClick={onOpen}>
        <img src={photo.src} alt={photo.alt} />
      </button>
      <figcaption>
        {photo.caption ?? photo.alt}
      </figcaption>
    </figure>
  );
}

export function InsightDetailPage() {
  const { slug } = useParams();
  const { content } = useSite();
  const index = content.insights.items.findIndex((item) => item.slug === slug);
  const item = content.insights.items[index];
  const gallery = item?.gallery ?? [];
  const thumbs = useMemo<StagePhoto[]>(() => {
    if (!item) return [];
    const next: StagePhoto[] = [];
    if (item.image) {
      next.push({
        src: item.image,
        alt: item.imageAlt ?? "",
        caption: item.imageAlt,
        position: item.imagePosition,
      });
    }
    for (const photo of gallery) {
      if (next.some((entry) => entry.src === photo.src)) continue;
      next.push(photo);
    }
    return next;
  }, [gallery, item]);
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState<StagePhoto | null>(null);

  useEffect(() => {
    setActive(0);
  }, [item?.id]);

  if (!item) {
    return (
      <section className="page-hero">
        <div className="wrap">
          <h1>Not found</h1>
          <Link to="/insights">Back to insights</Link>
        </div>
      </section>
    );
  }

  const hero = thumbs[active] ?? thumbs[0];
  const blocks = splitBodyBlocks(item.body);
  const embeds = new Map<number, InsightPhoto[]>();
  for (const photo of gallery) {
    if (photo.after == null) continue;
    const list = embeds.get(photo.after) ?? [];
    list.push(photo);
    embeds.set(photo.after, list);
  }

  return (
    <>
      <section className={hero ? "page-hero is-photo" : "page-hero"}>
        {hero ? (
          <>
            <button
              type="button"
              className="page-hero-media"
              onClick={() => setOpen(hero)}
              aria-label={hero.alt ? `View ${hero.alt}` : "View cover photo"}
            >
              <img
                src={hero.src}
                alt=""
                style={hero.position ? { objectPosition: hero.position } : undefined}
              />
            </button>
            <div className="page-hero-veil" aria-hidden />
          </>
        ) : null}
        <div className="wrap page-hero-copy">
          <p className="eyebrow">
            <Editable path={`insights.items.${index}.date`} />
          </p>
          <h1 className="display-lg">
            <Editable path={`insights.items.${index}.title`} />
          </h1>
          <div className="type-size-field">
            <TypeSizeControl path={`insights.items.${index}.excerptSize`} label="Subtitle size" />
            <p className={typeSizeClass(item.excerptSize, "lede")}>
              <Editable path={`insights.items.${index}.excerpt`} multiline />
            </p>
          </div>
          <p className="article-byline">
            By <Editable path={`insights.items.${index}.author`} />
          </p>
          {hero?.caption || hero?.alt ? (
            <p className="page-hero-caption">
              {hero.caption || hero.alt}
              {item.imageCredit ? <span>{item.imageCredit}</span> : null}
            </p>
          ) : null}
        </div>
      </section>
      <div className="wrap">
        <article className="article">
          {thumbs.length > 1 ? (
            <div className="article-picker" role="tablist" aria-label="Gallery">
              {thumbs.map((photo, i) => (
                <button
                  key={photo.src}
                  type="button"
                  className={`article-pick${i === active ? " is-on" : ""}`}
                  aria-label={photo.alt || `Photo ${i + 1}`}
                  aria-pressed={i === active}
                  onClick={() => setActive(i)}
                >
                  <img src={photo.src} alt="" />
                </button>
              ))}
            </div>
          ) : null}
          <div className="type-size-field">
            <TypeSizeControl path={`insights.items.${index}.bodySize`} label="Body size" />
            <div className={typeSizeClass(item.bodySize, "article-copy")}>
              {blocks.map((block, i) => (
                <div key={i} className="article-block">
                  <RichText source={block} className="article-rich article-graf" />
                  {embeds.get(i)?.map((photo) => (
                    <ArticleFigure key={photo.src} photo={photo} onOpen={() => setOpen(photo)} />
                  ))}
                </div>
              ))}
            </div>
          </div>
          <p>
            <Link className="arrow-link" to="/insights">
              All insights →
            </Link>
          </p>
        </article>
      </div>
      <Lightbox photo={open} onClose={() => setOpen(null)} />
    </>
  );
}
