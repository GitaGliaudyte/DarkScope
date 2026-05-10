// This file defines the static K-question weights and principle mappings used for profile scoring.
import { KQuestion, PageType, PrincipleMeta } from '../engine/types';

const ALL_PAGE_CONTEXTS: PageType[] = ['product', 'cart', 'checkout', 'registration', 'account_settings', 'generic'];

// TODO: Add real values of P1-P7 to the question entries)
export const K_QUESTIONS: KQuestion[] = [
  {
    id: 'K-02',
    label: 'Ar paskyros nustatymuose nėra paskyros ištrynimo funkcijos?',
    weight: 3,
    principles: { P3: 1, P5: 1, P7: 1 },
    relevantContexts: ['account_settings']
  },
  {
    id: 'K-59',
    label: 'Ar sąsajoje yra atgalinio skaičiavimo laikmatis, rodantis riboto laiko prieigą ar nuolaidą prekei ar paslaugai?',
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
