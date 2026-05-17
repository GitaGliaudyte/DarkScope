import {
  DECISION_BUTTON_SELECTOR,
  DECISION_CTA_TERMS,
  FORM_SUBMIT_SELECTOR,
  NEUTRAL_INPUT_PATTERNS,
  PERSISTENT_LOGIN_NAME_REGEXES,
  PROXIMITY_THRESHOLD_PX,
  SUSPICIOUS_LABEL_REGEXES,
  SUSPICIOUS_NAME_REGEXES
} from './constants';
import { buildNativeInputCandidate, shouldExcludeElement } from './candidateDetection';
import {
  extractPriceValues,
  getActionElementText,
  getRectDistance,
  getReferenceRect,
  includesAny,
  isVisibleElement,
  matchesAnyRegex,
  normalizeToken
} from './domUtils';
import { CategorySignals, ClassifiedInput, PreselectedInput } from './types';

const GROUP_CONTAINER_SELECTOR = 'fieldset, [role="group"], [role="radiogroup"], [class*="group"], [id*="group"], form';

function isInRequiredFieldset(candidate: PreselectedInput): boolean {
  const fieldset = candidate.control.closest('fieldset');

  if (!(fieldset instanceof HTMLFieldSetElement)) {
    return false;
  }

  const legend = fieldset.querySelector('legend');
  return legend instanceof HTMLElement && includesAny(normalizeToken(legend.textContent ?? ''), NEUTRAL_INPUT_PATTERNS.requiredLegend);
}

function isSoleCheckboxInGroup(candidate: PreselectedInput): boolean {
  if (candidate.isRadio) {
    return false;
  }

  const group = candidate.control.closest(GROUP_CONTAINER_SELECTOR) ?? candidate.control.parentElement;

  if (!(group instanceof HTMLElement)) {
    return true;
  }

  const checkboxCount = Array.from(group.querySelectorAll('input[type="checkbox"], [role="checkbox"]')).filter(
    (element): element is HTMLElement => element instanceof HTMLElement && !shouldExcludeElement(element)
  ).length;

  return checkboxCount <= 1;
}

function getRadioGroupElements(candidate: PreselectedInput, doc: Document): HTMLInputElement[] {
  if (!(candidate.control instanceof HTMLInputElement) || candidate.control.type !== 'radio' || candidate.name.length === 0) {
    return [];
  }

  const root: ParentNode = candidate.control.form ?? doc;
  const selector = `input[type="radio"][name="${CSS.escape(candidate.name)}"]`;

  return Array.from(root.querySelectorAll<HTMLInputElement>(selector)).filter(
    (input) => !shouldExcludeElement(input) && input.isConnected
  );
}

function isHighestPricedRadio(candidate: PreselectedInput, doc: Document): boolean {
  const group = getRadioGroupElements(candidate, doc);

  if (group.length < 2) {
    return false;
  }

  const selectedPrice = Math.max(...extractPriceValues(candidate.labelText), Number.NEGATIVE_INFINITY);

  if (!Number.isFinite(selectedPrice)) {
    return false;
  }

  const groupPrices = group
    .map((input) => {
      const probe = buildNativeInputCandidate(input, doc);

      if (probe === null) {
        return null;
      }

      const values = extractPriceValues(probe.labelText);

      if (values.length === 0) {
        return null;
      }

      return Math.max(...values);
    })
    .filter((value): value is number => value !== null);

  if (groupPrices.length < 2) {
    return false;
  }

  const highestPrice = Math.max(...groupPrices);
  const lowestPrice = Math.min(...groupPrices);

  return highestPrice > lowestPrice && selectedPrice >= highestPrice;
}

function getCategory(candidate: PreselectedInput): CategorySignals {
  const labelText = candidate.normalizedLabelText;
  const nameBlob = normalizeToken(`${candidate.name} ${candidate.id}`);
  const isPaidAddon = matchesAnyRegex(labelText, SUSPICIOUS_LABEL_REGEXES.paidAddOns) || candidate.hasPriceInLabel;
  const isMarketing =
    matchesAnyRegex(labelText, SUSPICIOUS_LABEL_REGEXES.marketing) || matchesAnyRegex(nameBlob, SUSPICIOUS_NAME_REGEXES);
  const isSubscription = matchesAnyRegex(labelText, SUSPICIOUS_LABEL_REGEXES.subscriptions);
  const isDonation = matchesAnyRegex(labelText, SUSPICIOUS_LABEL_REGEXES.donations);
  const isDataSharing = matchesAnyRegex(labelText, SUSPICIOUS_LABEL_REGEXES.dataSharing);
  const isLegalConsent = matchesAnyRegex(labelText, SUSPICIOUS_LABEL_REGEXES.legalConsent);
  const isPersistentLogin =
    matchesAnyRegex(labelText, SUSPICIOUS_LABEL_REGEXES.persistentLogin) ||
    ((labelText.includes('signed in') || labelText.includes('logged in')) &&
      matchesAnyRegex(nameBlob, PERSISTENT_LOGIN_NAME_REGEXES)) ||
    matchesAnyRegex(nameBlob, PERSISTENT_LOGIN_NAME_REGEXES);

  let category: CategorySignals['category'] = null;

  if (isSubscription) {
    category = 'subscription';
  } else if (isPaidAddon) {
    category = 'paid_addon';
  } else if (isMarketing) {
    category = 'marketing';
  } else if (isDonation) {
    category = 'donation';
  } else if (isDataSharing) {
    category = 'data_sharing';
  } else if (isLegalConsent) {
    category = 'legal_consent';
  } else if (isPersistentLogin) {
    category = 'persistent_login';
  }

  return {
    category,
    isPaidAddon,
    isMarketing,
    isSubscription,
    isDonation,
    isDataSharing,
    isLegalConsent,
    isPersistentLogin
  };
}

function buildReason(candidate: ClassifiedInput): string {
  const categoryLabel =
    candidate.category === 'subscription'
      ? 'subscription'
      : candidate.category === 'paid_addon'
        ? 'paid add-on'
        : candidate.category === 'marketing'
          ? 'marketing consent'
          : candidate.category === 'donation'
            ? 'donation'
            : candidate.category === 'legal_consent'
              ? 'legal/privacy consent'
            : candidate.category === 'persistent_login'
              ? 'remembered account/device'
              : 'data-sharing preference';
  const reasonParts = [`Pre-selected ${categoryLabel} option`];

  if (candidate.hasPriceInLabel) {
    reasonParts.push('label includes a price');
  }

  if (candidate.isHighestPricedRadio) {
    reasonParts.push('selected radio is the highest-priced option in its group');
  }

  if (candidate.adjacency === 'DECISION_ADJACENT') {
    reasonParts.push('sits near a purchase or submit action');
  } else {
    reasonParts.push('appears away from the main decision action');
  }

  return reasonParts.join('; ');
}

/**
 * Determines whether a suspicious pre-selected input is adjacent to a purchase or submit decision point.
 */
export function isDecisionAdjacent(candidate: PreselectedInput, doc: Document = document): boolean {
  if (candidate.associatedForm !== null) {
    const submitButton = candidate.associatedForm.querySelector(FORM_SUBMIT_SELECTOR);

    if (submitButton instanceof HTMLElement) {
      return true;
    }
  }

  const candidateRect = getReferenceRect(candidate);

  if (candidateRect === null) {
    return false;
  }

  const decisionButtons = Array.from(doc.querySelectorAll<HTMLElement>(DECISION_BUTTON_SELECTOR)).filter((element) => {
    if (shouldExcludeElement(element) || !isVisibleElement(element)) {
      return false;
    }

    return includesAny(normalizeToken(getActionElementText(element)), DECISION_CTA_TERMS);
  });

  return decisionButtons.some((element) => getRectDistance(candidateRect, element.getBoundingClientRect()) <= PROXIMITY_THRESHOLD_PX);
}

/**
 * Classifies a pre-selected input as suspicious or neutral using the rule-specific heuristics.
 */
export function classifyInput(candidate: PreselectedInput, doc: Document = document): ClassifiedInput {
  if (isInRequiredFieldset(candidate)) {
    return {
      ...candidate,
      classification: 'NEUTRAL',
      category: null,
      adjacency: 'ISOLATED',
      isPaidAddon: false,
      isMarketing: false,
      isSubscription: false,
      isDonation: false,
      isDataSharing: false,
      isLegalConsent: false,
      isPersistentLogin: false,
      isHighestPricedRadio: false,
      reason: 'Required form control'
    };
  }

  const categorySignals = getCategory(candidate);

  if (
    categorySignals.category === null ||
    (!candidate.isRadio &&
      !candidate.hasPriceInLabel &&
      isSoleCheckboxInGroup(candidate) &&
      !categorySignals.isMarketing &&
      !categorySignals.isDonation &&
      !categorySignals.isDataSharing &&
      !categorySignals.isLegalConsent &&
      !categorySignals.isSubscription &&
      !categorySignals.isPersistentLogin)
  ) {
    return {
      ...candidate,
      classification: 'NEUTRAL',
      adjacency: 'ISOLATED',
      isHighestPricedRadio: false,
      reason: 'No optional paid, consent, subscription, donation, or sharing signal detected',
      ...categorySignals
    };
  }

  const highestPricedRadio = candidate.isRadio ? isHighestPricedRadio(candidate, doc) : false;

  if (candidate.isRadio && !highestPricedRadio) {
    return {
      ...candidate,
      classification: 'NEUTRAL',
      adjacency: 'ISOLATED',
      isHighestPricedRadio: false,
      reason: 'Radio selection is not the highest-priced option in its group',
      ...categorySignals
    };
  }

  const classified: ClassifiedInput = {
    ...candidate,
    classification: 'SUSPICIOUS',
    adjacency: isDecisionAdjacent(candidate, doc) ? 'DECISION_ADJACENT' : 'ISOLATED',
    isHighestPricedRadio: highestPricedRadio,
    reason: '',
    ...categorySignals
  };

  classified.reason = buildReason(classified);
  return classified;
}
