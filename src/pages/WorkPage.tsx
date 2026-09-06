import { WorkGrid } from "../components/WorkGrid";
import { Editable } from "../components/Editable";

export function WorkPage() {
  return (
    <>
      <section className="page-hero">
        <div className="wrap">
          <p className="eyebrow">
            <Editable path="work.eyebrow" />
          </p>
          <h1 className="display-lg">
            <Editable path="work.title" />
          </h1>
          <p className="lede">
            <Editable path="work.body" multiline />
          </p>
        </div>
      </section>
      <WorkGrid heading={false} />
    </>
  );
}
