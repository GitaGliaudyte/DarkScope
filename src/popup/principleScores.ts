import { PrincipleId, RuleResult } from '@/engine/types';
import { PRINCIPLE_META, K_QUESTIONS } from '@/rules/kQuestions';
import { computePrincipleScores } from '@/scoring/principleScorer';

export interface PrincipleScoreRow {
  principleId: PrincipleId;
  label: string;
  percentage: number;
}

const PRINCIPLE_IDS: PrincipleId[] = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'];

export function buildPrincipleScoreRows(results: RuleResult[]): PrincipleScoreRow[] {
  const scoreMap = computePrincipleScores(results, K_QUESTIONS);

  return PRINCIPLE_META.map((meta) => ({
    principleId: meta.id,
    label: meta.label,
    percentage: Math.max(0, Math.min(100, Math.round(scoreMap[meta.id].score ?? 0)))
  }));
}

export function computeImpactScore(scores: PrincipleScoreRow[]): number {
  if (scores.length === 0) {
    return 0;
  }

  const average = scores.reduce((sum, score) => sum + score.percentage, 0) / scores.length;
  const max = scores.reduce((highest, score) => Math.max(highest, score.percentage), 0);

  return Math.round(0.7 * average + 0.3 * max);
}

export function getMostAffectedPrinciple(scores: PrincipleScoreRow[]): PrincipleScoreRow | null {
  if (scores.length === 0) {
    return null;
  }

  return scores.reduce((highest, score) => (score.percentage > highest.percentage ? score : highest));
}
