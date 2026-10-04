import { Capabilities } from "../components/Capabilities";
import { ContactBlock } from "../components/ContactBlock";
import { EcosystemOrbit } from "../components/EcosystemOrbit";
import { Hero } from "../components/Hero";
import { InsightGrid } from "../components/InsightGrid";
import { LogoTicker } from "../components/LogoTicker";
import { StatBar } from "../components/StatBar";
import { Testimonials } from "../components/Testimonials";
import { WorkGrid } from "../components/WorkGrid";

export function HomePage() {
  return (
    <>
      <Hero />
      <StatBar />
      <EcosystemOrbit />
      <Capabilities />
      <Testimonials />
      <LogoTicker source="partners" />
      <WorkGrid limit={3} />
      <InsightGrid limit={3} />
      <ContactBlock />
    </>
  );
}
