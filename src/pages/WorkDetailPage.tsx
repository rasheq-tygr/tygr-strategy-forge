import { Link, useParams } from "react-router-dom";
import { Editable } from "../components/Editable";
import { PageHero } from "../components/PageHero";
import { RichText } from "../components/RichText";
import { TypeSizeControl } from "../components/TypeSizeControl";
import { useSite } from "../context/SiteContext";
import { safeHref } from "../lib/security";
import { typeSizeClass } from "../lib/textSize";

export function WorkDetailPage() {
  const { slug } = useParams();
  const { content } = useSite();
  const index = content.work.items.findIndex((item) => item.slug === slug);
  const item = content.work.items[index];

  if (!item) {
    return (
      <section className="page-hero">
        <div className="wrap">
          <h1>Not found</h1>
          <Link to="/work">Back to work</Link>
        </div>
      </section>
    );
  }

  return (
    <>
      <PageHero
        image={item.image}
        imageAlt={item.imageAlt}
        imagePosition={item.imagePosition}
        imageCredit={item.imageCredit}
      >
        <p className="eyebrow">
          <Editable path={`work.items.${index}.client`} />
        </p>
        <h1 className="display-lg">
          <Editable path={`work.items.${index}.title`} />
        </h1>
        <div className="type-size-field">
          <TypeSizeControl path={`work.items.${index}.summarySize`} label="Subtitle size" />
          <p className={typeSizeClass(item.summarySize, "lede")}>
            <Editable path={`work.items.${index}.summary`} multiline />
          </p>
        </div>
      </PageHero>
      <div className="wrap">
        <article className="article">
          <div className="type-size-field">
            <TypeSizeControl path={`work.items.${index}.bodySize`} label="Body size" />
            <div className={typeSizeClass(item.bodySize, "article-copy")}>
              <RichText source={item.body} />
              <p>
                <strong>Outcome. </strong>
                <Editable path={`work.items.${index}.outcome`} multiline />
              </p>
            </div>
          </div>
          {safeHref(item.url) ? (
            <p>
              <a className="arrow-link" href={safeHref(item.url)} target="_blank" rel="noreferrer">
                Open live app →
              </a>
            </p>
          ) : null}
          <p>
            <Link className="arrow-link" to="/work">
              All work →
            </Link>
          </p>
        </article>
      </div>
    </>
  );
}
