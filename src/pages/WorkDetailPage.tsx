import { Link, useParams } from "react-router-dom";
import { Editable } from "../components/Editable";
import { useSite } from "../context/SiteContext";

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
      <section className="page-hero">
        <div className="wrap">
          <p className="eyebrow">
            <Editable path={`work.items.${index}.client`} />
          </p>
          <h1 className="display-lg">
            <Editable path={`work.items.${index}.title`} />
          </h1>
          <p className="lede">
            <Editable path={`work.items.${index}.summary`} multiline />
          </p>
        </div>
      </section>
      <article className="article">
        {item.image ? <img src={item.image} alt={item.title} style={{ marginBottom: "1.5rem" }} /> : null}
        <p>
          <Editable path={`work.items.${index}.body`} multiline />
        </p>
        <p>
          <strong>Outcome. </strong>
          <Editable path={`work.items.${index}.outcome`} multiline />
        </p>
        <p>
          <Link className="arrow-link" to="/work">
            All work →
          </Link>
        </p>
      </article>
    </>
  );
}
