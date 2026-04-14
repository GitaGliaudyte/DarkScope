import { findActionButtons } from '../rules/findActionButtons';
import { getVisibilityScore } from '../rules/getVisibilityScore';
import { getLabelType } from '../rules/getLabelType';
import { getInteractionDepth } from '../rules/getInteractionDepth';

interface QuestionResult {
  probability: number;
  evidence: {
    optInText: string;
    optOutText: string;
    visibilityDifference: number;
    depth: number;
  };
  elements: {
    optIn: HTMLElement;
    optOut: HTMLElement;
  };
}

/**
 * Detects asymmetric effort dark pattern by comparing opt-in vs opt-out elements.
 * @returns QuestionResult | null - Question result or null if elements not found
 */
export function Q1_asymmetricEffort(): QuestionResult | null {
  const { optIn, optOut } = findActionButtons();

  if (!optIn || !optOut) {
    return null;
  }

  // Compute indicators
  const optInVisibility = getVisibilityScore(optIn);
  const optOutVisibility = getVisibilityScore(optOut);
  const visibilityDifference = optInVisibility - optOutVisibility; // Positive means opt-in is more visible

  console.log('Visibility scores:', { optIn: optInVisibility, optOut: optOutVisibility, difference: visibilityDifference });

  const optOutLabelType = getLabelType(optOut);
  const labelPenalty = optOutLabelType === "vague" ? 0.5 : 0; // Penalty for vague opt-out labels

  const depth = getInteractionDepth(optOut);

  // Compute probability using weighted formula
  // Weights: visibility difference (60%), label penalty (20%), depth (20%)
  const probability = Math.min(
    (visibilityDifference * 0.6) + (labelPenalty * 0.2) + (depth * 0.2),
    1
  );

  console.log('Q1_asymmetricEffort result:', {
    optInText: optIn.textContent || (optIn as HTMLInputElement).value || '',
    optOutText: optOut.textContent || (optOut as HTMLInputElement).value || '',
    visibilityDifference,
    labelPenalty,
    depth,
    probability
  });

  return {
    probability: Math.max(probability, 0), // Ensure non-negative
    evidence: {
      optInText: optIn.textContent || (optIn as HTMLInputElement).value || '',
      optOutText: optOut.textContent || (optOut as HTMLInputElement).value || '',
      visibilityDifference,
      depth
    },
    elements: {
      optIn,
      optOut
    }
  };
}