// This file defines the static K-question weights and principle mappings used for profile scoring.
import { KQuestion, PageType, PrincipleMeta } from '../engine/types';

const ALL_PAGE_CONTEXTS: PageType[] = ['product', 'cart', 'checkout', 'registration', 'account_settings', 'generic'];

// TODO: Add real values of P1-P7 to the question entries
export const K_QUESTIONS: KQuestion[] = [
  {
    id: 'K-12',
    label: 'Hidden fees at checkout',
    weight: 3,
    principles: { P1: 1, P2: 1, P4: 0.5 },
    relevantContexts: ALL_PAGE_CONTEXTS
  },
  {
    id: 'K-23',
    label: 'Pre-checked subscriptions',
    weight: 2,
    principles: { P1: 0.5, P3: 1, P4: 1 },
    relevantContexts: ALL_PAGE_CONTEXTS
  },
  {
    id: 'K-31',
    label: 'Artificial urgency (non-timer)',
    weight: 2,
    principles: { P2: 0.5, P3: 0.5, P6: 1 },
    relevantContexts: ['product', 'cart', 'checkout']
  },
  {
    id: 'K-44',
    label: 'Roach motel / hard to cancel',
    weight: 3,
    principles: { P1: 0.5, P3: 1, P5: 0.5, P7: 1 },
    relevantContexts: ALL_PAGE_CONTEXTS
  },
  {
    id: 'K-59',
    label: 'Countdown timer',
    weight: 2,
    principles: { P2: 0.5, P3: 0.5, P6: 0.5 },
    relevantContexts: ['product', 'cart', 'checkout']
  },
  {
    id: 'K-67',
    label: 'Forced account creation',
    weight: 2,
    principles: { P1: 0.5, P3: 1, P5: 1 },
    relevantContexts: ALL_PAGE_CONTEXTS
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
