/**
 * frontend/components/results/AnalysisNarrative.tsx
 *
 * Fields come straight from analysis_agent.py's return dict:
 * analysis_executive_summary (string), analysis_key_findings,
 * analysis_likely_causes, analysis_recommendations (string[]).
 */

type AnalysisNarrativeProps = {
  executiveSummary?: string | null;
  keyFindings?: string[] | null;
  likelyCauses?: string[] | null;
  recommendations?: string[] | null;
};

function NarrativeGroup({
  title,
  items,
}: {
  title: string;
  items?: string[] | null;
}) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <div className="narrative-group">
      <h3>{title}</h3>

      <ul>
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export default function AnalysisNarrative({
  executiveSummary,
  keyFindings,
  likelyCauses,
  recommendations,
}: AnalysisNarrativeProps) {
  const hasAnything =
    executiveSummary ||
    (keyFindings && keyFindings.length > 0) ||
    (likelyCauses && likelyCauses.length > 0) ||
    (recommendations && recommendations.length > 0);

  if (!hasAnything) {
    return (
      <p className="narrative-empty">
        No written analysis was generated for this run.
      </p>
    );
  }

  return (
    <div className="analysis-narrative">
      {executiveSummary && (
        <p className="narrative-summary">{executiveSummary}</p>
      )}

      <div className="narrative-groups">
        <NarrativeGroup title="Key findings" items={keyFindings} />
        <NarrativeGroup title="Likely causes" items={likelyCauses} />
        <NarrativeGroup title="Recommendations" items={recommendations} />
      </div>
    </div>
  );
}