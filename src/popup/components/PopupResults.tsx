import { Eye, EyeOff, Info, Menu, RefreshCcw } from 'lucide-react';
import { RuleResult } from '@/engine/types';
import { buildPrincipleScoreRows, computeImpactScore, getMostAffectedPrinciple } from '../principleScores';
import { AudienceMode } from '../types';
import { PopupActionButton, PopupCompactSummaryPanel, PopupResultsCard, PopupResultsCardBody, PopupSummaryPanel } from './PopupPrimitives';

interface PopupResultsProps {
  audienceMode: AudienceMode;
  overlayEnabled: boolean;
  results: RuleResult[];
  onLearnMore: () => void;
  onToggleOverlay: () => void;
  onStartOver: () => void;
}

const USER_RISK_LEVELS = [
  { maxImpactScore: 20, label: 'LOW', textClassName: 'text-emerald-600' },
  { maxImpactScore: 40, label: 'MODERATE', textClassName: 'text-lime-600' },
  { maxImpactScore: 60, label: 'ELEVATED', textClassName: 'text-amber-500' },
  { maxImpactScore: 80, label: 'HIGH', textClassName: 'text-orange-500' },
  { maxImpactScore: 100, label: 'SEVERE', textClassName: 'text-red-600' }
] as const;

export function PopupResults({
  audienceMode,
  overlayEnabled,
  results,
  onLearnMore,
  onToggleOverlay,
  onStartOver
}: PopupResultsProps) {
  const detectedCount = results.filter((result) => result.detected).length;
  const isDesignerMode = audienceMode === 'designer';
  const hasDetectedIssues = detectedCount > 0;
  const principleScores = buildPrincipleScoreRows(results);
  const impactScore = computeImpactScore(principleScores);
  const mostAffectedPrinciple = getMostAffectedPrinciple(principleScores);
  const userRiskLevel = getUserRiskLevel(impactScore);

  return (
    <PopupResultsCard>
      <PopupResultsCardBody>
        {isDesignerMode ? (
          <PopupSummaryPanel>
            <div className="grid grid-cols-2">
              <div className="px-4 py-5 text-center">
                <p className="text-[12px] font-medium tracking-[0.02em] text-slate-600">Detected Issues</p>
                <p className="mt-2 text-[1.75rem] font-semibold leading-none text-slate-950">{detectedCount}</p>
              </div>
              <div className="border-l border-slate-200 px-4 py-5 text-center">
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
                    <div className="pointer-events-none absolute left-auto right-0 top-full z-[200] w-44 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-[11px] font-normal leading-4 text-slate-600 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                      Indicates how strongly this page may influence user decisions, based on detected interface patterns.
                    </div>
                  </div>
                </div>
                <p className={`mt-2 text-[1.75rem] font-semibold leading-none ${userRiskLevel.textClassName}`}>{impactScore}%</p>
              </div>
            </div>
            {hasDetectedIssues && mostAffectedPrinciple ? (
              <div className="border-t border-slate-200 px-4 py-4 text-center text-sm text-slate-800">
                <span>
                  Most affected principle:
                  <br />
                </span>
                <span className="font-semibold">{mostAffectedPrinciple.label}</span>
              </div>
            ) : null}
          </PopupSummaryPanel>
        ) : (
          <PopupCompactSummaryPanel>
            <div className="grid grid-cols-2">
              <div className="px-4 py-5 text-center">
                <p className="text-[12px] font-medium tracking-[0.02em] text-slate-600">Detected Issues</p>
                <p className="mt-2 text-[1.75rem] font-semibold leading-none text-slate-950">{detectedCount}</p>
              </div>
              <div className="border-l border-slate-200 px-4 py-5 text-center">
                <p className="text-[12px] font-medium tracking-[0.02em] text-slate-600">Risk Level</p>
                <p className={`mt-2 flex items-baseline justify-center gap-1 font-semibold leading-none ${userRiskLevel.textClassName}`}>
                  <span className="text-[1.75rem]">{userRiskLevel.label}</span>
                  <span className="text-[0.875rem] font-medium">({impactScore}%)</span>
                </p>
              </div>
            </div>
          </PopupCompactSummaryPanel>
        )}

        <div className="grid grid-cols-3 gap-2">
          <PopupActionButton onClick={onLearnMore}>
            <span>Learn more</span>
            <Menu className="size-4" />
          </PopupActionButton>
          <PopupActionButton onClick={onToggleOverlay}>
            <span>{overlayEnabled ? 'Hide overlay' : 'Show overlay'}</span>
            {overlayEnabled ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </PopupActionButton>
          <PopupActionButton onClick={onStartOver}>
            <span>Start over</span>
            <RefreshCcw className="size-4" />
          </PopupActionButton>
        </div>
      </PopupResultsCardBody>
    </PopupResultsCard>
  );
}

function getUserRiskLevel(impactScore: number): (typeof USER_RISK_LEVELS)[number] {
  return USER_RISK_LEVELS.find((level) => impactScore <= level.maxImpactScore) ?? USER_RISK_LEVELS[USER_RISK_LEVELS.length - 1];
}
