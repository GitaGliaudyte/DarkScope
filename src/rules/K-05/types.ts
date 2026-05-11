export type ElementZone = 'primary' | 'supplemental';

export interface ProbeCandidate {
  element: HTMLElement;
  selector: string;
  label: string;
  priority: number;
  index: number;
  zone: ElementZone;
  passwordField: boolean;
  paymentField: boolean;
  emailOrUsernameField: boolean;
}

export interface CandidateSignals {
  pasteBlocked: boolean;
  copyBlocked: boolean;
  inlineOnPasteBlocked: boolean;
  inlineOnCopyBlocked: boolean;
  autocompleteOff: boolean;
  dragFillBlocked: boolean;
}

export interface FlaggedElement extends ProbeCandidate {
  signals: CandidateSignals;
  score: number;
}
