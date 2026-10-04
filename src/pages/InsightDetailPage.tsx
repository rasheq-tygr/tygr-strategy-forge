import { Link, useParams } from "react-router-dom";
import { Editable } from "../components/Editable";
import { useSite } from "../context/SiteContext";

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
        {item.gallery?.length ? (
          <div className="article-gallery">
            {item.gallery.map((photo) => (
              <img key={photo.src} src={photo.src} alt={photo.alt} />
            ))}
          </div>
        ) : null}
        <p>
          <Link className="arrow-link" to="/insights">
            All insights →
          </Link>
        </p>
      </article>
    </>
  );
}
