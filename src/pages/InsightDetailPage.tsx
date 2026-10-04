import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Editable } from "../components/Editable";
import { useSite } from "../context/SiteContext";
import type { InsightPhoto } from "../types/content";

function ArticleGallery({ photos }: { photos: InsightPhoto[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || open == null || dialog.open) return;
    dialog.showModal();
  }, [open]);

  return (
    <>
      <div className="article-gallery">
        {photos.map((photo, i) => (
          <button
            key={photo.src}
            type="button"
            className={`article-shot article-shot-${photo.frame ?? "solo"}`}
            onClick={() => setOpen(i)}
          >
            <img src={photo.src} alt={photo.alt} />
          </button>
        ))}
      </div>
      <dialog
        ref={dialogRef}
        className="article-lightbox"
        onClose={() => setOpen(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
      >
        {open != null ? (
          <>
            <img src={photos[open].src} alt={photos[open].alt} />
            <button type="button" className="article-lightbox-close" onClick={() => dialogRef.current?.close()}>
              Close
            </button>
          </>
        ) : null}
      </dialog>
    </>
  );
}

export function InsightDetailPage() {
  const { slug } = useParams();
  const { content } = useSite();
  const index = content.insights.items.findIndex((item) => item.slug === slug);
  const item = content.insights.items[index];

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
        </div>
      </section>
      <article className="article">
        {item.image ? <img className="article-cover" src={item.image} alt={item.imageAlt ?? ""} /> : null}
        <p>
          <Editable path={`insights.items.${index}.body`} multiline />
        </p>
        {item.gallery?.length ? <ArticleGallery photos={item.gallery} /> : null}
        <p>
          <Link className="arrow-link" to="/insights">
            All insights →
          </Link>
        </p>
      </article>
    </>
  );
}
