export type ApplicabilitySignal = 'main' | 'subsection' | 'ambiguous';

export interface UrlAssessment {
  signal: ApplicabilitySignal;
  isPrivacyPage: boolean;
}

export interface NavigationAnalysis {
  container: HTMLElement | null;
  categories: string[];
  privacyMatches: HTMLElement[];
  signal: ApplicabilitySignal;
}

export interface PrivacySearchResult {
  hasPrivacyInNavigation: boolean;
  hasPrivacyInBody: boolean;
}

export interface RuleSignals {
  hasPrivacyInNavigation: boolean;
  hasPrivacyInBodyOnly: boolean;
  navigationCategoryCount: number;
  urlSignal: ApplicabilitySignal;
  navigationSignal: ApplicabilitySignal;
}
