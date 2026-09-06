import { InsightGrid } from "../components/InsightGrid";
import { Editable } from "../components/Editable";

export function InsightsPage() {
  return (
    <>
      <section className="page-hero">
        <div className="wrap">
          <p className="eyebrow">
            <Editable path="insights.eyebrow" />
          </p>
          <h1 className="display-lg">
            <Editable path="insights.title" />
          </h1>
          <p className="lede">
            <Editable path="insights.body" multiline />
          </p>
        </div>
      </section>
      <InsightGrid heading={false} />
    </>
  );
}
