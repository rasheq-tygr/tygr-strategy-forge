import { Capabilities } from "../components/Capabilities";
import { Editable } from "../components/Editable";

export function CapabilitiesPage() {
  return (
    <>
      <section className="page-hero">
        <div className="wrap">
          <p className="eyebrow">
            <Editable path="capabilities.eyebrow" />
          </p>
          <h1 className="display-lg">
            <Editable path="capabilities.title" />
          </h1>
          <p className="lede">
            <Editable path="capabilities.body" multiline />
          </p>
        </div>
      </section>
      <Capabilities heading={false} />
    </>
  );
}
