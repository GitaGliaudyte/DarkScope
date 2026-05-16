import { Eye, EyeOff, Info, Menu, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RuleResult } from '@/engine/types';
import { AudienceMode } from '../types';

interface RealPopupResultsProps {
  audienceMode: AudienceMode;
  overlayEnabled: boolean;
  results: RuleResult[];
  onLearnMore: () => void;
  onToggleOverlay: () => void;
  onStartOver: () => void;
}

export function RealPopupResults({
  audienceMode,
  overlayEnabled,
  results,
  onLearnMore,
  onToggleOverlay,
  onStartOver
}: RealPopupResultsProps) {
  const detectedCount = results.filter((result) => result.detected).length;
  const isDesignerMode = audienceMode === 'designer';
  const hasDetectedIssues = detectedCount > 0;

  return (
    <Card className="overflow-visible border-white/70 bg-white/88 shadow-[0_22px_54px_-30px_rgba(15,23,42,0.55)] backdrop-blur">
      <CardContent className="space-y-5 overflow-visible p-5">
        {isDesignerMode ? (
          <section className="overflow-visible rounded-[2rem] border border-slate-300/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,248,250,0.96))] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_14px_34px_-28px_rgba(15,23,42,0.5)]">
            <div className="grid grid-cols-2">
              <div className="px-5 py-6 text-center">
                <p className="text-[12px] font-medium tracking-[0.02em] text-slate-600">Detected Issues</p>
                <p className="mt-2 text-[2rem] font-semibold leading-none text-slate-950">{detectedCount}</p>
              </div>
              <div className="border-l border-slate-300 px-5 py-6 text-center">
                <div className="flex items-center justify-center gap-1.5 text-[12px] font-medium tracking-[0.02em] text-slate-600">
                  <span>Impact Score</span>
                  <div className="group relative inline-flex">
                    <button
                      type="button"
                      aria-label="Impact score information"
                      className="inline-flex size-4 items-center justify-center rounded-full text-slate-500 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Info className="size-3.5" />
                    </button>
                    <div className="pointer-events-none absolute left-auto right-0 top-full z-[200] w-44 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-[11px] font-normal leading-4 text-slate-600 opacity-0 shadow-[0_18px_35px_-24px_rgba(15,23,42,0.55)] transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                      Indicates how strongly this page may influence user decisions, based on detected interface patterns.
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-[2rem] font-semibold leading-none text-slate-950">67%</p>
              </div>
            </div>
            {hasDetectedIssues ? (
              <div className="border-t border-slate-300 px-5 py-4 text-center text-[1.05rem] leading-none text-slate-800">
                <span>
                  Most affected principle:
                  <br />
                </span>
                <span className="font-semibold">Ethical intent</span>
              </div>
            ) : null}
          </section>
        ) : (
          <section className="overflow-hidden rounded-[2rem] border border-slate-300/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,248,250,0.96))] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_14px_34px_-28px_rgba(15,23,42,0.5)]">
            <div className="grid grid-cols-2">
              <div className="px-5 py-6 text-center">
                <p className="text-[12px] font-medium tracking-[0.02em] text-slate-600">Detected Issues</p>
                <p className="mt-2 text-[2rem] font-semibold leading-none text-slate-950">{detectedCount}</p>
              </div>
              <div className="border-l border-slate-300 px-5 py-6 text-center">
                <p className="text-[12px] font-medium tracking-[0.02em] text-slate-600">Risk Level</p>
                <p className="mt-2 text-[2rem] font-semibold leading-none tracking-[0.08em] text-emerald-700">LOW</p>
              </div>
            </div>
          </section>
        )}

        <div className="grid grid-cols-3 gap-3">
          <Button
            variant="secondary"
            className="h-12 rounded-xl border border-slate-300 bg-white/90 px-3 text-[11px] font-medium text-slate-900 shadow-[0_10px_22px_-20px_rgba(15,23,42,0.5)] hover:bg-slate-50"
            onClick={onLearnMore}
          >
            <span>Learn more</span>
            <Menu className="size-4" />
          </Button>
          <Button
            variant="secondary"
            className="h-12 rounded-xl border border-slate-300 bg-white/90 px-3 text-[11px] font-medium text-slate-900 shadow-[0_10px_22px_-20px_rgba(15,23,42,0.5)] hover:bg-slate-50"
            onClick={onToggleOverlay}
          >
            <span>{overlayEnabled ? 'Hide overlay' : 'Show overlay'}</span>
            {overlayEnabled ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </Button>
          <Button
            variant="secondary"
            className="h-12 rounded-xl border border-slate-300 bg-white/90 px-3 text-[11px] font-medium text-slate-900 shadow-[0_10px_22px_-20px_rgba(15,23,42,0.5)] hover:bg-slate-50"
            onClick={onStartOver}
          >
            <span>Start over</span>
            <RefreshCcw className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
