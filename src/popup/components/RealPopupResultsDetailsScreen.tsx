import { ArrowLeft, ShieldAlert, ShieldCheck, TriangleAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RuleResult } from '@/engine/types';
import { AudienceMode } from '../types';

interface RealPopupResultsDetailsScreenProps {
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

export function RealPopupResultsDetailsScreen({
  audienceMode,
  results,
  onBack
}: RealPopupResultsDetailsScreenProps) {
  const sortedResults = [...results].sort((left, right) => Number(right.detected) - Number(left.detected));
  const isUserAudience = audienceMode === 'user';

  return (
    <Card className="overflow-hidden border-white/70 bg-white/88 shadow-[0_22px_54px_-30px_rgba(15,23,42,0.55)] backdrop-blur">
      <CardHeader className="gap-4 pb-4">
        <div className="space-y-4">
          <Button
            variant="ghost"
            className="w-fit rounded-full border border-slate-200 bg-white/75 px-3 text-sm text-slate-600 shadow-[0_10px_22px_-20px_rgba(15,23,42,0.5)] hover:bg-white hover:text-slate-950"
            onClick={onBack}
          >
            <ArrowLeft className="size-4" />
            Go back
          </Button>
          <div className="space-y-1">
            <CardTitle className="text-xl text-slate-950">Analysis details</CardTitle>
            <CardDescription className="text-sm text-slate-600">Rule-by-rule results for this scan.</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[320px] rounded-[1.5rem] border border-slate-200/90 bg-[linear-gradient(180deg,rgba(248,250,252,0.95),rgba(241,245,249,0.82))] p-1">
          <div className="space-y-3 p-3">
            {sortedResults.map((result) => {
              const Icon = result.status === 'error' ? TriangleAlert : result.detected ? ShieldAlert : ShieldCheck;
              return (
                <article
                  key={result.ruleId}
                  className="rounded-2xl border border-white/90 bg-white/96 p-4 shadow-[0_16px_30px_-26px_rgba(15,23,42,0.5)]"
                >
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
                      <div className="rounded-xl border border-slate-200 bg-slate-50/85 p-3 text-xs text-slate-600">
                        Confidence {result.confidence} | Probability {Math.round(result.probability * 100)}% | Evidence {result.evidence.length} | Occurrences {result.occurrenceCount}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
