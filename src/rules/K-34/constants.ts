export const RULE_ID = 'K-34';
export const MAX_SAMPLES = 40;
export const MAX_SAMPLES_PER_REGION = 3;
export const MAX_SAMPLE_LENGTH = 200;
export const MIN_SAMPLE_WORDS = 4;
export const MIN_REQUIRED_SAMPLES = 5;
export const MIN_CONFIDENCE_SAMPLE_COVERAGE = 10;
export const LLM_TIMEOUT_MS = 10_000;
export const LLM_MAX_TOKENS = 800;
export const LLM_THINKING_BUDGET = 0;

export const REGION_SELECTORS = [
  {
    region: 'navigation',
    selector: 'nav, [role="navigation"]'
  },
  {
    region: 'heading',
    selector: 'h1, h2, h3'
  },
  {
    region: 'description',
    selector: '[class*="description"], [class*="about"], p'
  },
  {
    region: 'pricing',
    selector: '[class*="price"], [class*="fee"], [class*="cost"]'
  },
  {
    region: 'legal',
    selector: '[class*="legal"], [class*="terms"], [class*="disclaimer"], small, footer p'
  },
  {
    region: 'button',
    selector: 'button, [type="submit"], a[class*="btn"]'
  },
  {
    region: 'form',
    selector: 'label, [class*="form"]'
  },
  {
    region: 'consent',
    selector: '[class*="cookie"], [class*="consent"], [class*="gdpr"]'
  },
  {
    region: 'error',
    selector: '[role="alert"], [class*="error"], [class*="warning"]'
  }
] as const;

export const HIGH_SEVERITY_REGIONS = ['legal', 'pricing', 'consent', 'error'] as const;
