import { WorkGrid } from "../components/WorkGrid";
import { Editable } from "../components/Editable";
import { PageHero } from "../components/PageHero";
import { useSite } from "../context/SiteContext";

export function WorkPage() {
  const { content } = useSite();
  const hero = content.work;

  return (
    <>
      <PageHero
        image={hero.image}
        imageAlt={hero.imageAlt}
        imagePosition={hero.imagePosition}
        imageCredit={hero.imageCredit}
      >
        <p className="eyebrow">
          <Editable path="work.eyebrow" />
        </p>
        <h1 className="display-lg">
          <Editable path="work.title" />
        </h1>
        <p className="lede">
          <Editable path="work.body" multiline />
        </p>
      </PageHero>
      <WorkGrid heading={false} />
    </>
  );
}
