// This file provides simple page relevance checks for rules that only apply on certain page types.
import { PageSnapshot } from './types';

export function defaultPageClassifier(snapshot: PageSnapshot, relevantOn?: string[]): boolean {
  if (relevantOn === undefined || relevantOn.length === 0) {
    return true;
  }

  const haystack = `${snapshot.url} ${snapshot.title}`.toLowerCase();
  return relevantOn.some((pattern) => haystack.includes(pattern.toLowerCase()));
}

export function createPageClassifier(patterns: string[]): (snapshot: PageSnapshot) => boolean {
  return (snapshot: PageSnapshot) => defaultPageClassifier(snapshot, patterns);
}
