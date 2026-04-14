interface EvaluationParams {
  probability: number;
  threshold: number;
  score: number;
}

interface EvaluationResult {
  triggered: boolean;
  score: number;
  probability: number;
}

/**
 * Evaluates a question result against a threshold and score.
 * @param params - { probability, threshold, score }
 * @returns EvaluationResult - { triggered: boolean, score: number, probability: number }
 */
export function evaluateQuestion(params: EvaluationParams): EvaluationResult {
  const { probability, threshold, score } = params;
  const triggered = probability >= threshold;
  const finalScore = triggered ? score : 0;

  return {
    triggered,
    score: finalScore,
    probability
  };
}