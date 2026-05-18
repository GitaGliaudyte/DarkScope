import { ScoreablePreselectedInput } from './scoring';

export type CandidateKind = 'checkbox' | 'radio' | 'option' | 'custom_checkbox' | 'custom_radio' | 'custom_toggle';

export type SuspiciousCategory =
  | 'paid_addon'
  | 'marketing'
  | 'subscription'
  | 'donation'
  | 'data_sharing'
  | 'legal_consent'
  | 'persistent_login';

export type Classification = 'SUSPICIOUS' | 'NEUTRAL';

export interface LabelResolution {
  text: string;
  element: HTMLElement | null;
}

export interface PreselectedInput {
  source: HTMLElement;
  control: HTMLElement;
  referenceElement: HTMLElement;
  selector: string;
  kind: CandidateKind;
  name: string;
  id: string;
  inputType: string;
  labelText: string;
  normalizedLabelText: string;
  displayText: string;
  isRadio: boolean;
  hasPriceInLabel: boolean;
  associatedForm: HTMLFormElement | null;
}

export interface CategorySignals {
  category: SuspiciousCategory | null;
  isPaidAddon: boolean;
  isMarketing: boolean;
  isSubscription: boolean;
  isDonation: boolean;
  isDataSharing: boolean;
  isLegalConsent: boolean;
  isPersistentLogin: boolean;
}

export interface ClassifiedInput extends PreselectedInput, ScoreablePreselectedInput, CategorySignals {
  classification: Classification;
  reason: string;
}
