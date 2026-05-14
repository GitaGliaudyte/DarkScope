import { RuleResult } from '../../engine/types';

export interface RuleCandidate {
  element: HTMLAnchorElement;
  selector: string;
  href: string;
  hostname: string;
  text: string;
  title: string;
  inChrome: boolean;
}

export interface RuleSignals {
  hasCardLayout: boolean;
  hasContentClassPattern: boolean;
  isButtonLike: boolean;
  hasCtaPattern: boolean;
}

export interface RuleFinding extends RuleSignals {
  candidate: RuleCandidate;
  reasons: string[];
}

export type K12RuleResult = RuleResult & {
  score?: number;
};
