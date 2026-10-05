import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Editable } from "../components/Editable";
import { useSite } from "../context/SiteContext";
import type { InsightPhoto } from "../types/content";

type StagePhoto = {
  src: string;
  alt: string;
  caption?: string;
  layout?: InsightPhoto["layout"];
  position?: string;
};

function paragraphs(body: string) {
  return body.split(/\n\n+/).map((part) => part.trim()).filter(Boolean);
}

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
  const { content, editMode } = useSite();
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
  const grafs = paragraphs(item.body);
  const embeds = new Map<number, InsightPhoto[]>();
  for (const photo of gallery) {
    if (photo.after == null) continue;
    const list = embeds.get(photo.after) ?? [];
    list.push(photo);
    embeds.set(photo.after, list);
  }

  return (
    <>
      <section className="page-hero">
        <div className="wrap">
          <p className="eyebrow">
            <Editable path={`insights.items.${index}.date`} />
          </p>
          <h1 className="display-lg">
            <Editable path={`insights.items.${index}.title`} />
          </h1>
          <p className="lede">
            <Editable path={`insights.items.${index}.excerpt`} multiline />
          </p>
          <p className="article-byline">
            By <Editable path={`insights.items.${index}.author`} />
          </p>
        </div>
      </section>
      <article className="article">
        {hero ? (
          <div className="article-stage">
            <button type="button" className="article-hero" onClick={() => setOpen(hero)}>
              <img
                src={hero.src}
                alt={hero.alt}
                style={hero.position ? { objectPosition: hero.position } : undefined}
              />
            </button>
            {hero.caption || hero.alt ? (
              <p className="article-caption">
                {hero.caption || hero.alt}
                {item.imageCredit ? <span>{item.imageCredit}</span> : null}
              </p>
            ) : null}
            {thumbs.length > 1 ? (
              <div className="article-thumbs">
                {thumbs.map((photo, i) => (
                  <button
                    key={photo.src}
                    type="button"
                    className={`article-thumb${i === active ? " is-on" : ""}`}
                    aria-label={photo.alt || `Photo ${i + 1}`}
                    aria-pressed={i === active}
                    onClick={() => setActive(i)}
                  >
                    <img src={photo.src} alt="" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        {gallery.length && !editMode ? (
          grafs.map((graf, i) => (
            <div key={i}>
              <p className="article-graf">{graf}</p>
              {embeds.get(i)?.map((photo) => (
                <ArticleFigure key={photo.src} photo={photo} onOpen={() => setOpen(photo)} />
              ))}
            </div>
          ))
        ) : (
          <p className="article-body">
            <Editable path={`insights.items.${index}.body`} multiline />
          </p>
        )}
        <p>
          <Link className="arrow-link" to="/insights">
            All insights →
          </Link>
        </p>
      </article>
      <Lightbox photo={open} onClose={() => setOpen(null)} />
    </>
  );
}
