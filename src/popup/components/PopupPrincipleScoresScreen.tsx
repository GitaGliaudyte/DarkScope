import { RuleResult } from '@/engine/types';
import { buildPrincipleScoreRows } from '../principleScores';
import { PopupResultsCard, PopupResultsCardBody, PopupScreenHeader } from './PopupPrimitives';

interface PopupPrincipleScoresScreenProps {
  results: RuleResult[];
  onBack: () => void;
}

export function PopupPrincipleScoresScreen({ results, onBack }: PopupPrincipleScoresScreenProps) {
  const scores = buildPrincipleScoreRows(results);

  return (
    <PopupResultsCard>
      <PopupScreenHeader
        title="Impact by principle"
        description="See how detected issues impact each of the 7 ethical design principles."
        onBack={onBack}
        backTone="raised"
      />

      <PopupResultsCardBody className="space-y-3 pt-2">
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
          <div className="space-y-3">
            {scores.map((score) => (
              <div
                key={score.principleId}
                className="grid grid-cols-[minmax(0,1.8fr)_minmax(150px,1fr)_44px] items-center gap-x-2"
              >
                <h3 className="truncate text-sm font-semibold text-slate-950">
                  {score.principleId}. {toTitleCase(score.label)}
                </h3>
                <div className="h-4 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full transition-[width,background-color]"
                    style={{
                      width: `${score.percentage}%`,
                      backgroundColor: getScoreColor(score.percentage)
                    }}
                  />
                </div>
                <span
                  className="text-right text-sm font-semibold"
                  style={{ color: getScoreTextColor(score.percentage) }}
                >
                  {score.percentage}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </PopupResultsCardBody>
    </PopupResultsCard>
  );
}

function toTitleCase(value: string): string {
  return value.replace(/\b\w/g, (match) => match.toUpperCase());
}

function getScoreColor(percentage: number): string {
  if (percentage <= 0) {
    return 'rgb(148 163 184)';
  }

  const normalizedPercentage = Math.max(0, Math.min(100, percentage));
  const hue = 52 - (normalizedPercentage / 100) * 52;
  return `hsl(${hue} 82% 52%)`;
}

function getScoreTextColor(percentage: number): string {
  if (percentage <= 0) {
    return 'rgb(22 163 74)';
  }

  return getScoreColor(percentage);
}
