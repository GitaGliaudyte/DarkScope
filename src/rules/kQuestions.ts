// This file defines the static K-question weights and principle mappings used for profile scoring.
import { KQuestion, PageType, PrincipleMeta } from '../engine/types';

// const ALL_PAGE_CONTEXTS: PageType[] = ['product', 'cart', 'checkout', 'registration', 'account_settings', 'generic'];

// TODO: Add real values of P1-P7 to the question entries)
export const K_QUESTIONS: KQuestion[] = [
  {
    id: 'K-02',
    label: 'Is the account deletion function missing from account settings?',
    weight: 3,
    principles: { P3: 1, P5: 1, P7: 1 },
    relevantContexts: ['account_settings']
  },
  {
    id: 'K-04',
    label: 'Are there links on the page returning 4xx or 5xx HTTP status codes?',
    weight: 2,
    principles: { P4: 0.5, P7: 1 },
    relevantContexts: ['product', 'registration', 'account_settings', 'checkout', 'cart']
  },
  {
    id: 'K-05',
    label: 'Does the system block text copy functionality on informational content?',
    weight: 2,
    principles: { P3: 1, P4: 0.5 },
    relevantContexts: ['product', 'generic', 'account_settings']
  },
  {
    id: 'K-06',
    label: 'Does the system prevent users from copying and pasting in input fields?',
    weight: 2,
    principles: { P3: 1, P4: 0.5 },
    relevantContexts: ['account_settings', 'checkout', 'registration']
  },
  {
    id: 'K-59',
    label: 'Is there a countdown timer in the interface showing limited-time access or a discount for a product or service?',
    weight: 2,
    principles: { P2: 0.5, P3: 0.5, P6: 0.5 },
    relevantContexts: ['product', 'cart', 'checkout']
  }
];

export const PRINCIPLE_META: PrincipleMeta[] = [
  { id: 'P1', label: 'Transparency' },
  { id: 'P2', label: 'Informed consent' },
  { id: 'P3', label: 'Autonomy' },
  { id: 'P4', label: 'Fairness' },
  { id: 'P5', label: 'Privacy' },
  { id: 'P6', label: 'Wellbeing' },
  { id: 'P7', label: 'Accountability' }
];
