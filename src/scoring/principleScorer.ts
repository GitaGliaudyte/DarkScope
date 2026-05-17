import {
  RuleResult,
  KQuestion,
  PrincipleId,
  ViolationStrength
} from '../engine/types';
import { PrincipleScoreMap } from './types';

/**
 * Computes principle violation scores based on rule detection results.
 *
 * For each principle (P1-P7), calculates:
 * - V: Sum of detected violations weighted by strength, question weight, and rule probability
 * - Vmax: Theoretical maximum (sum of s*w for all associated questions)
 * - VmaxPrime: Corrected maximum (sum of s*w excluding not_applicable questions)
 * - score: Percentage (0-100) or null if no applicable questions
 *
 * @param results - Array of rule evaluation results
 * @param questions - Array of knowledge questions with principle mappings
 * @returns Map of principle scores indexed by principle ID
 */
export function computePrincipleScores(
  results: RuleResult[],
  questions: KQuestion[]
): PrincipleScoreMap {
  // All possible principles
  const allPrinciples: PrincipleId[] = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'];

  // Create a map for quick result lookup by ruleId
  const resultMap = new Map<string, RuleResult>();
  for (const result of results) {
    // Use first occurrence if duplicates exist
    if (!resultMap.has(result.ruleId)) {
      resultMap.set(result.ruleId, result);
    }
  }

  // Initialize the principle scores map
  const scoreMap: PrincipleScoreMap = {} as PrincipleScoreMap;

  // Compute scores for each principle
  for (const principleId of allPrinciples) {
    // Find all questions that have this principle
    const questionsForPrinciple = questions.filter(
      (q) => principleId in q.principles
    );

    if (questionsForPrinciple.length === 0) {
      // No questions associated with this principle
      scoreMap[principleId] = {
        principleId,
        V: 0,
        Vmax: 0,
        VmaxPrime: 0,
        score: null,
      };
      continue;
    }

    // Calculate V, Vmax, and VmaxPrime
    let V = 0;
    let Vmax = 0;
    let VmaxPrime = 0;

    for (const question of questionsForPrinciple) {
      const s = question.principles[principleId] as ViolationStrength;
      const w = question.weight;

      // Find matching result, or treat as not_applicable if missing
      const result = resultMap.get(question.id);
      const a = determineAnswerValue(result);
      const weightedValue = s * w;

      // Vmax includes all questions
      Vmax += weightedValue;

      // Only count non-not_applicable questions
      if (a !== 'not_applicable') {
        V += weightedValue * a;
        VmaxPrime += weightedValue;
      }

    }

    // Calculate score as percentage, or null if VmaxPrime === 0
    const score = VmaxPrime === 0 ? null : (V / VmaxPrime) * 100;

    scoreMap[principleId] = {
      principleId,
      V,
      Vmax,
      VmaxPrime,
      score,
    };
  }

  return scoreMap;
}

/**
 * Determines the answer value for a question based on its rule result.
 *
 * - probability (0-1) if the rule detected the dark pattern
 * - 0 if the rule did not detect it
 * - 'not_applicable' if the rule did not run or is not applicable
 *
 * @param result - The rule result, or undefined if no result exists
 * @returns The answer value: probability, 0, or 'not_applicable'
 */
function determineAnswerValue(
  result: RuleResult | undefined
): number | 'not_applicable' {
  if (!result) {
    return 'not_applicable';
  }

  if (result.status === 'not_applicable') {
    return 'not_applicable';
  }

  if (!result.detected) {
    return 0;
  }

  return Math.max(0, Math.min(1, result.probability));
}
