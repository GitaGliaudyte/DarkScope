// This file converts per-rule detections into the methodology's principle-level violation profile.

// WORK IN PROGRESS - NOT USED YET
import { KQuestion, PrincipleId, RuleResult, ViolationProfile } from './types';

const PRINCIPLE_IDS: PrincipleId[] = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'];

function createEmptyProfile(): ViolationProfile {
  return {
    P1: 0,
    P2: 0,
    P3: 0,
    P4: 0,
    P5: 0,
    P6: 0,
    P7: 0
  };
}

export function computeProfile(results: RuleResult[], questions: KQuestion[]): ViolationProfile {
  const violations = createEmptyProfile();
  const maxViolations = createEmptyProfile();
  const resultMap = new Map(results.map((result) => [result.ruleId, result]));

  for (const question of questions) {
    const result = resultMap.get(question.id);

    if (result === undefined || result.status === 'not_applicable') {
      continue;
    }

    const answer = result.detected ? 1 : 0;

    for (const principleId of PRINCIPLE_IDS) {
      const strength = question.principles[principleId];

      if (strength === undefined) {
        continue;
      }

      violations[principleId] += strength * question.weight * answer;
      maxViolations[principleId] += strength * question.weight;
    }
  }

  return PRINCIPLE_IDS.reduce<ViolationProfile>((profile, principleId) => {
    const maxValue = maxViolations[principleId];
    profile[principleId] = maxValue === 0 ? 0 : Math.round((violations[principleId] / maxValue) * 100);
    return profile;
  }, createEmptyProfile());
}
