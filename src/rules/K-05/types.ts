export type RuleZone = 'primary' | 'supplemental';

export interface RuleCandidate {
  element: HTMLElement;
  selector: string;
  text: string;
  zone: RuleZone;
}

export interface RuleSignals {
  copyEventBlocked: boolean;
  cssSelectionBlocked: boolean;
  inlineOnCopyBlocked: boolean;
  inlineOnSelectStartBlocked: boolean;
  inlineStyleSelectionBlocked: boolean;
}

export interface RuleFinding extends RuleCandidate {
  signals: RuleSignals;
  score: number;
}
