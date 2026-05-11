import { AnalysisContext, Confidence } from '../../engine/types';
import { PROFILE_FIELD_PATTERN, EMAIL_TEXT_SIGNALS, NOTIFICATION_TEXT_SIGNALS, PASSWORD_TEXT_SIGNALS } from './constants';
import { DeletionSignal, HiddenDeletionSignal, getInteractiveElementCount } from './signals';

function normalizeValue(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function snapshotTextIncludes(snapshot: AnalysisContext['snapshot'], phrases: readonly string[]): boolean {
  const haystack = snapshot.text.toLowerCase();
  return phrases.some((phrase) => haystack.includes(phrase));
}

function hasPasswordControls(snapshot: AnalysisContext['snapshot']): boolean {
  return (
    snapshot.elements.some(
      (element) => element.tag === 'input' && normalizeValue(element.attributes.type) === 'password'
    ) || snapshotTextIncludes(snapshot, PASSWORD_TEXT_SIGNALS)
  );
}

function hasEmailControls(snapshot: AnalysisContext['snapshot']): boolean {
  return (
    snapshot.elements.some((element) => element.tag === 'input' && normalizeValue(element.attributes.type) === 'email') ||
    snapshotTextIncludes(snapshot, EMAIL_TEXT_SIGNALS)
  );
}

function hasNotificationControls(snapshot: AnalysisContext['snapshot']): boolean {
  return snapshotTextIncludes(snapshot, NOTIFICATION_TEXT_SIGNALS);
}

function hasProfileEditControls(snapshot: AnalysisContext['snapshot']): boolean {
  return snapshot.elements.some(
    (element) =>
      element.tag === 'input' &&
      normalizeValue(element.attributes.type) === 'text' &&
      PROFILE_FIELD_PATTERN.test(
        `${normalizeValue(element.attributes.name)} ${normalizeValue(element.attributes.placeholder)}`
      )
  );
}

export function scoreSignals(
  deletionSignals: DeletionSignal[],
  hiddenSignals: HiddenDeletionSignal[],
  snapshot: AnalysisContext['snapshot']
): number {
  if (getInteractiveElementCount(snapshot) < 3) {
    return 0;
  }

  if (deletionSignals.some((signal) => signal.visible)) {
    return 0;
  }

  if (hiddenSignals.length > 0) {
    return 4 + Math.min(hiddenSignals.length, 3);
  }

  if (deletionSignals.length > 0) {
    return 4;
  }

  let score = 5;

  if (hasPasswordControls(snapshot)) {
    score += 2;
  }

  if (hasEmailControls(snapshot)) {
    score += 2;
  }

  if (hasNotificationControls(snapshot)) {
    score += 2;
  }

  if (hasProfileEditControls(snapshot)) {
    score += 1;
  }

  return score;
}

export function getConfidence(score: number): Confidence {
  if (score >= 10) {
    return 'high';
  }

  if (score >= 7) {
    return 'medium';
  }

  return 'low';
}
