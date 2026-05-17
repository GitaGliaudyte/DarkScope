import { CSSProperties, useEffect, useState } from 'react';
import { ArrowLeft, BarChart3, ChevronDown, LocateFixed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getRuleColor } from '@/engine/ruleColors';
import { RuleResult } from '@/engine/types';
import { getKQuestion, getOrderedPrincipleViolations } from '@/rules/kQuestions';
import { AudienceMode } from '../types';
import { PopupBackButton, PopupResultsCard, PopupResultsCardBody } from './PopupPrimitives';

interface PopupResultsDetailsScreenProps {
  audienceMode: AudienceMode;
  results: RuleResult[];
  onBack: () => void;
  onOpenPrincipleScores: () => void;
  onFocusIssue: (ruleId: string) => void;
}

function getExplanationText(result: RuleResult): string {
  return result.explanation.trim().length > 0
    ? result.explanation.trim()
    : 'Explanation unavailable for this detected pattern.';
}

function getRecommendationText(result: RuleResult): string {
  return result.recommendation.trim().length > 0
    ? result.recommendation.trim()
    : 'Suggestion unavailable for this detected pattern.';
}

function getCardStyles(ruleId: string): {
  ruleId: CSSProperties;
} {
  const color = getRuleColor(ruleId);

  return {
    ruleId: {
      color: color.label,
    },
  };
}

export function PopupResultsDetailsScreen({
  audienceMode,
  results,
  onBack,
  onOpenPrincipleScores,
  onFocusIssue
}: PopupResultsDetailsScreenProps) {
  const detectedResults = results.filter((result) => result.detected);
  const [openRuleId, setOpenRuleId] = useState<string | null>(detectedResults[0]?.ruleId ?? null);
  const isDesignerAudience = audienceMode === 'designer';

  useEffect(() => {
    if (detectedResults.length === 0) {
      setOpenRuleId(null);
      return;
    }

    if (openRuleId === null || !detectedResults.some((result) => result.ruleId === openRuleId)) {
      setOpenRuleId(detectedResults[0].ruleId);
    }
  }, [detectedResults, openRuleId]);

  return (
    <PopupResultsCard>
      <PopupResultsCardBody className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <PopupBackButton tone="inline" onClick={onBack}>
            <ArrowLeft className="size-4" />
            Go back
          </PopupBackButton>
          <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
            <span>Impact by principle</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950"
              aria-label="Open principle scores"
              title="Open principle scores"
              onClick={onOpenPrincipleScores}
            >
              <BarChart3 className="size-4" />
            </Button>
          </div>
        </div>

        {detectedResults.length === 0 ? (
          <div className="rounded-xl bg-slate-100 px-4 py-5 text-sm text-slate-600">
            No detected issues to explain for this scan.
          </div>
        ) : (
          <div className="h-[340px] overflow-y-auto">
            <div className="space-y-3 pr-3">
              {detectedResults.map((result) => {
                const isOpen = openRuleId === result.ruleId;
                const violations = getOrderedPrincipleViolations(result.ruleId);
                const cardStyles = getCardStyles(result.ruleId);
                const question = getKQuestion(result.ruleId);
                const canFocusIssue = result.visualTarget.type !== 'none' && result.visualTarget.selectors.length > 0;

                return (
                  <article key={result.ruleId} className="overflow-hidden rounded-xl bg-slate-100">
                    <div className="flex items-center gap-2 px-4 py-3">
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        onClick={() => setOpenRuleId(isOpen ? null : result.ruleId)}
                      >
                        <h3 className="min-w-0 flex-1 text-[1.05rem] font-semibold leading-5 text-slate-950">
                          <span style={cardStyles.ruleId}>{result.ruleId}</span>
                          {question ? ` ${question.displayLabel}` : ''}
                        </h3>
                      </button>
                      {canFocusIssue ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 shrink-0 rounded-md text-slate-700 hover:bg-slate-200 hover:text-slate-950"
                          aria-label={`Go to first ${result.ruleId} occurrence`}
                          title={`Go to first ${result.ruleId} occurrence`}
                          onClick={() => onFocusIssue(result.ruleId)}
                        >
                          <LocateFixed className="size-4" />
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0 rounded-md text-slate-700 hover:bg-slate-200 hover:text-slate-950"
                        aria-label={isOpen ? `Collapse ${result.ruleId}` : `Expand ${result.ruleId}`}
                        title={isOpen ? `Collapse ${result.ruleId}` : `Expand ${result.ruleId}`}
                        onClick={() => setOpenRuleId(isOpen ? null : result.ruleId)}
                      >
                        <ChevronDown className={`size-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </Button>
                    </div>

                    {isOpen ? (
                      <div className="space-y-2 px-4 pb-4 text-sm leading-5 text-slate-800">
                        <div className="border-t border-slate-400/60 pt-2 text-[0.92rem] text-slate-600">
                          Confidence: {Math.round(result.probability * 100)}% | Violation:{' '}
                          {violations.length > 0 ? violations.join(', ') : 'None listed'}
                        </div>
                        <p>
                          <span className="font-medium">Explanation:</span> {getExplanationText(result)}
                        </p>
                        {isDesignerAudience ? (
                          <div className="border-t border-slate-400/60 pt-2">
                            <p>
                              <span className="font-medium">Suggestion:</span> {getRecommendationText(result)}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </PopupResultsCardBody>
    </PopupResultsCard>
  );
}
