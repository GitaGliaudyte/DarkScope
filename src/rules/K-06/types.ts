export type RuleZone = 'primary' | 'supplemental';

export interface RuleCandidate {
  element: HTMLElement;
  selector: string;
  label: string;
  priority: number;
  index: number;
  zone: RuleZone;
  passwordField: boolean;
  paymentField: boolean;
  emailOrUsernameField: boolean;
}

export interface RuleSignals {
  pasteBlocked: boolean;
  copyBlocked: boolean;
  inlineOnPasteBlocked: boolean;
  inlineOnCopyBlocked: boolean;
  autocompleteOff: boolean;
  dragFillBlocked: boolean;
}

export interface RuleFinding extends RuleCandidate {
  signals: RuleSignals;
  score: number;
}
