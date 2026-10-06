import { EcosystemOrbit } from "../components/EcosystemOrbit";
import { Editable } from "../components/Editable";
import { PageHero } from "../components/PageHero";
import { useSite } from "../context/SiteContext";

export function EcosystemPage() {
  const { content } = useSite();
  const hero = content.ecosystem;

  return (
    <>
      <PageHero
        image={hero.image}
        imageAlt={hero.imageAlt}
        imagePosition={hero.imagePosition}
        imageCredit={hero.imageCredit}
      >
        <p className="eyebrow">
          <Editable path="ecosystem.eyebrow" />
        </p>
        <h1 className="display-lg">
          <Editable path="ecosystem.title" />
        </h1>
        <p className="lede">
          <Editable path="ecosystem.body" multiline />
        </p>
      </PageHero>
      <EcosystemOrbit heading={false} />
    </>
  );
}
