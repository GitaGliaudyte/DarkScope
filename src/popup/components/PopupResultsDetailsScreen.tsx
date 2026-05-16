import { ShieldAlert, ShieldCheck, TriangleAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RuleResult } from '@/engine/types';
import { AudienceMode } from '../types';
import { PopupDetailPanel, PopupResultsCard, PopupResultsCardBody, PopupScreenHeader } from './PopupPrimitives';

interface PopupResultsDetailsScreenProps {
  audienceMode: AudienceMode;
  results: RuleResult[];
  onBack: () => void;
}

function statusBadge(result: RuleResult): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (result.status === 'error') {
    return 'destructive';
  }

  if (result.detected) {
    return 'destructive';
  }

  if (result.status === 'not_detected') {
    return 'default';
  }

  return 'outline';
}

export function PopupResultsDetailsScreen({
  audienceMode,
  results,
  onBack
}: PopupResultsDetailsScreenProps) {
  const sortedResults = [...results].sort((left, right) => Number(right.detected) - Number(left.detected));
  const isUserAudience = audienceMode === 'user';

  return (
    <PopupResultsCard>
      <PopupScreenHeader
        title="Analysis details"
        description="Rule-by-rule results for this scan."
        onBack={onBack}
        backTone="raised"
      />

      <PopupResultsCardBody>
        <ScrollArea className="h-[320px] rounded-lg border border-slate-200 bg-slate-50 p-1">
          <div className="space-y-3 p-3">
            {sortedResults.map((result) => {
              const Icon = result.status === 'error' ? TriangleAlert : result.detected ? ShieldAlert : ShieldCheck;
              return (
                <PopupDetailPanel key={result.ruleId}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Icon
                          className={`size-4 ${
                            result.status === 'error'
                              ? 'text-rose-600'
                              : result.detected
                                ? 'text-amber-600'
                                : 'text-emerald-600'
                          }`}
                        />
                        <h3 className="text-sm font-semibold text-slate-950">{result.ruleId}</h3>
                      </div>
                      <p className="text-xs text-slate-500">
                        {result.detected
                          ? 'Potentially manipulative pattern found.'
                          : result.status === 'error'
                            ? 'This rule could not complete.'
                            : 'No concerning signal was detected for this rule.'}
                      </p>
                    </div>
                    <Badge variant={statusBadge(result)} className="capitalize">
                      {result.status.replace('_', ' ')}
                    </Badge>
                  </div>

                  <div className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                    {result.explanation ? <p>{result.explanation}</p> : null}
                    {result.recommendation ? <p className="text-slate-500">{result.recommendation}</p> : null}
                    {isUserAudience ? null : (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                        Confidence {result.confidence} | Probability {Math.round(result.probability * 100)}% | Evidence {result.evidence.length} | Occurrences {result.occurrenceCount}
                      </div>
                    )}
                  </div>
                </PopupDetailPanel>
              );
            })}
          </div>
        </ScrollArea>
      </PopupResultsCardBody>
    </PopupResultsCard>
  );
}
