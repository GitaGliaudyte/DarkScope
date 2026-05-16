import { AnalysisContext, RuleResult } from '../../engine/types';
import { createRuleResult, clampProbability, buildVisualTarget } from '../../rules-utilities/resultUtils';
import { generateUniqueSelector, isVisibleElement } from '../../engine/normalizedElements';
import {
  RULE_ID,
  SIGNUP_FORM_SELECTORS,
  EMAIL_FIELD_PATTERNS,
  PASSWORD_FIELD_PATTERNS,
  EXTRA_SENSITIVE_FIELD_PATTERNS
} from './constants';

function matchesAnyPattern(value: string | null | undefined, patterns: RegExp[]): boolean {
  if (!value) return false;
  const v = value.toLowerCase();
  return patterns.some((p) => p.test(v));
}

function getInputLabelText(input: HTMLElement): string {
  const id = input.id;
  if (id) {
    const label = document.querySelector<HTMLLabelElement>(`label[for="${id}"]`);
    if (label?.textContent) return label.textContent.trim();
  }

  const parentLabel = input.closest('label');
  if (parentLabel?.textContent) return parentLabel.textContent.trim();

  const ariaLabel = input.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel.trim();

  const placeholder = input.getAttribute('placeholder');
  if (placeholder) return placeholder.trim();

  return '';
}

function isRequiredField(input: HTMLElement): boolean {
  if (input.hasAttribute('required')) return true;
  if (input.getAttribute('aria-required') === 'true') return true;

  const label = getInputLabelText(input);
  if (label.includes('*')) return true;

  return false;
}

function isEmailField(input: HTMLElement): boolean {
  const type = (input.getAttribute('type') || '').toLowerCase();
  const name = input.getAttribute('name') || '';
  const id = input.id || '';
  const label = getInputLabelText(input);

  if (type === 'email') return true;

  const combined = `${name} ${id} ${label}`;
  return matchesAnyPattern(combined, EMAIL_FIELD_PATTERNS);
}

function isPasswordField(input: HTMLElement): boolean {
  const type = (input.getAttribute('type') || '').toLowerCase();
  const name = input.getAttribute('name') || '';
  const id = input.id || '';
  const label = getInputLabelText(input);

  if (type === 'password') return true;

  const combined = `${name} ${id} ${label}`;
  return matchesAnyPattern(combined, PASSWORD_FIELD_PATTERNS);
}

function isExtraSensitiveField(input: HTMLElement): boolean {
  const type = (input.getAttribute('type') || '').toLowerCase();
  const name = input.getAttribute('name') || '';
  const id = input.id || '';
  const label = getInputLabelText(input);
  const autocomplete = input.getAttribute('autocomplete') || '';

  const combined = `${type} ${name} ${id} ${label} ${autocomplete}`;
  return matchesAnyPattern(combined, EXTRA_SENSITIVE_FIELD_PATTERNS);
}

export function detectSignupDataIssues(context: AnalysisContext): RuleResult {
  const evidence: RuleResult['evidence'] = [];
  const selectors = new Set<string>();

  let forms = Array.from(
    document.querySelectorAll<HTMLFormElement>(SIGNUP_FORM_SELECTORS.join(', '))
  ).filter((f) => f.isConnected && isVisibleElement(f));

  if (forms.length === 0) {
    const passwordInput = document.querySelector('input[type="password"]');
    if (passwordInput) {
      const pseudoForm =
        passwordInput.closest('form') ||
        passwordInput.closest('[class*="sign"]') ||
        passwordInput.closest('[class*="account"]') ||
        passwordInput.closest('[class*="login"]') ||
        passwordInput.parentElement;

      if (pseudoForm) {
        forms = [pseudoForm as HTMLFormElement];
      }
    }
  }

  let highestSeverity = 0;
  let occurrenceCount = 0;

  for (const form of forms) {
    const inputs = Array.from(
      form.querySelectorAll<HTMLElement>('input, select, textarea')
    ).filter((el) => isVisibleElement(el));

    if (inputs.length === 0) continue;

    const emailFields: HTMLElement[] = [];
    const passwordFields: HTMLElement[] = [];
    const extraFields: HTMLElement[] = [];

    for (const input of inputs) {
      const required = isRequiredField(input);

      if (isEmailField(input)) {
        if (required) emailFields.push(input);
        continue;
      }

      if (isPasswordField(input)) {
        if (required) passwordFields.push(input);
        continue;
      }

      if (isExtraSensitiveField(input) && required) {
        extraFields.push(input);
      }
    }

    if (emailFields.length > 0 && passwordFields.length > 0 && extraFields.length > 0) {
      const severity = Math.min(3 + extraFields.length, 10);
      highestSeverity = Math.max(highestSeverity, severity);
      occurrenceCount += extraFields.length;

      for (const field of extraFields) {
        const sel = generateUniqueSelector(field);
        selectors.add(sel);

        evidence.push({
          selector: sel,
          text: getInputLabelText(field).slice(0, 200),
          reason: 'Registration form asks for required personal data beyond email and password.',
          boundingBox: field.getBoundingClientRect()
        });
      }
    }
  }

  const detected = evidence.length > 0;
  const probability = detected ? clampProbability(highestSeverity / 10) : 0;
  const confidence: RuleResult['confidence'] =
    highestSeverity >= 7 ? 'high' : highestSeverity >= 4 ? 'medium' : detected ? 'low' : 'low';

  return createRuleResult({
    ruleId: RULE_ID,
    detected,
    probability,
    confidence,
    impact: 'medium',
    evidence,
    visualTarget: buildVisualTarget(Array.from(selectors)),
    occurrenceCount
  });
}
