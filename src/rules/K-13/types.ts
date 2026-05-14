export type CandidateMatchType = 'attribute' | 'iframe' | 'known_script';
export type DisclosureStatus = 'disclosed' | 'machine_only' | 'undisclosed';

export interface CandidateMatch {
  container: HTMLElement;
  selector: string;
  matchType: CandidateMatchType;
  network: string | null;
  boundingBox: DOMRect | null;
}

export interface RuleFinding {
  container: HTMLElement;
  selector: string;
  visualSelector: string;
  disclosure: Exclude<DisclosureStatus, 'disclosed'>;
  network: string | null;
  aboveFold: boolean;
  text: string;
  boundingBox: DOMRect | null;
}

export interface RuleSignals {
  undisclosedCount: number;
  machineOnlyCount: number;
  hasAboveFoldUndisclosed: boolean;
  hasMajorNetworkUndisclosed: boolean;
  hasThreeOrMoreUndisclosed: boolean;
}
