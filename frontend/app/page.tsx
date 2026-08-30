import Link from "next/link";

const metrics = [
  ["Analysis runs", "—", "Run your first analysis"],
  ["Production", "—", "Calculated from verified data"],
  ["Fulfillment", "—", "Calculated from verified data"],
  ["Rejection", "—", "Calculated from verified data"],
];

export default function Home() {
  return (
    <div className="page">
      <section>
        <div className="eyebrow">
          Production intelligence
        </div>

        <h1 className="page-title serif">
          Turn factory data
          <br />
          into decisions.
        </h1>

        <p className="page-description">
          Fibrion transforms raw manufacturing data into
          verified KPIs, operational insights, anomalies,
          visualizations and decision-ready reports.
        </p>

        <div className="hero-actions">
          <Link
            href="/analyze"
            className="button button-primary"
          >
            Analyze a dataset →
          </Link>

          <Link
            href="/reports"
            className="button button-secondary"
          >
            View reports
          </Link>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <h2 className="section-title">
              Workspace
            </h2>
            <div className="section-meta">
              Your production intelligence at a glance.
            </div>
          </div>
        </div>

        <div className="grid grid-4">
          {metrics.map(([label, value, note]) => (
            <div
              className="card metric"
              key={label}
            >
              <div className="metric-label">
                {label}
              </div>

              <div className="metric-value">
                {value}
              </div>

              <div className="metric-note">
                {note}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="grid grid-2">
          <div className="card card-pad">
            <div className="eyebrow">
              Fibrion engine
            </div>

            <h2 className="section-title">
              From raw data to verified intelligence.
            </h2>

            <p className="page-description">
              Upload production data and Fibrion runs
              ingestion, validation, KPI computation,
              AI analysis, visualization, reporting and
              verification as one workflow.
            </p>

            <div style={{ marginTop: 20 }}>
              <Link
                href="/analyze"
                className="button button-primary"
              >
                Start an analysis →
              </Link>
            </div>
          </div>

          <div className="activity">
            <div className="activity-label">
              System
            </div>

            <div className="activity-message">
              Fibrion is ready for a production dataset.
            </div>

            <div
              style={{
                marginTop: 25,
                color: "#7d8c85",
                fontSize: 12,
              }}
            >
              Weaving analysis is currently the
              first supported production module.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}