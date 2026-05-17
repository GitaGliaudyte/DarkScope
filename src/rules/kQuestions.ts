// This file defines the static K-question weights and principle mappings used for profile scoring.
import { KQuestion, PageType, PrincipleMeta } from '../engine/types';

// const ALL_PAGE_CONTEXTS: PageType[] = ['product', 'cart', 'checkout', 'registration', 'account_settings', 'generic'];

// TODO: Add real values of P1-P7 to the question entries)
export const K_QUESTIONS: KQuestion[] = [
  {
    id: 'K-02',
    label: 'Is the account deletion function missing from account settings?',
    weight: 2,
    principles: { P1: 1, P2: 0.5, P3: 0, P4: 0, P5: 0, P6: 1, P7: 0 },
    relevantContexts: ['account_settings']
  },
  {
    id: 'K-04',
    label: 'Are there links on the page returning 4xx or 5xx HTTP status codes?',
    weight: 1,
    principles: { P1: 1, P2: 0.5, P3: 0, P4: 0, P5: 0, P6: 1, P7: 0 },
    relevantContexts: ['product', 'registration', 'account_settings', 'checkout', 'cart']
  },
  {
    id: 'K-05',
    label: 'Does the system block text copy functionality on informational content?',
    weight: 2,
    principles: { P1: 0.5, P2: 0.5, P3: 0, P4: 0, P5: 0, P6: 1, P7: 1 },
    relevantContexts: ['product', 'generic', 'account_settings']
  },
  {
    id: 'K-06',
    label: 'Does the system prevent users from copying and pasting in input fields?',
    weight: 2,
    principles: { P1: 0.5, P2: 0.5, P3: 0, P4: 0, P5: 0, P6: 1, P7: 1 },
    relevantContexts: ['account_settings', 'checkout', 'registration']
  },
  {
    id: 'K-11',
    label: 'Are privacy settings reachable from the main account settings page?',
    weight: 2,
    principles: { P1: 0.5, P2: 0, P3: 0, P4: 0, P5: 0.5, P6: 1, P7: 0 },
    relevantContexts: ['account_settings']
  },
  {
    id: 'K-13',
    label: 'Are the advertising labels of an element not visually distinguished?',
    weight: 1,
    principles: { P1: 0.5, P2: 0.5, P3: 0, P4: 0, P5: 0, P6: 1, P7: 0.5 },
    relevantContexts: ['product']
  },
  {
    id: 'K-16',
    label: 'Are the displayed discount numbers deceptive - either an implausibly large discount (>70%) or a mathematically inconsistent price?',
    weight: 2,
    principles: { P1: 0.5, P2: 0.5, P3: 0, P4: 0, P5: 0, P6: 1, P7: 0.5 },
    relevantContexts: ['product', 'cart']
  },
  {
    id: 'K-20',
    label: 'Does an element in the top layer occupy more than 50% of the total screen size?',
    weight: 1,
    principles: { P1: 0.5, P2: 0, P3: 0.5, P4: 0, P5: 0, P6: 1, P7: 1 },
    relevantContexts: ['product', 'checkout', 'cart', 'account_settings']
  },
  {
    id: 'K-23',
    label: 'Does the more expensive option have greater visual weight than the others?',
    weight: 1,
    principles: { P1: 0.5, P2: 0, P3: 0.5, P4: 0, P5: 0, P6: 1, P7: 1 },
    relevantContexts: ['product']
  },
  {
    id: 'K-24',
    label: 'Are options pre-selected by default?',
    weight: 2,
    principles: { P1: 0.5, P2: 0, P3: 0, P4: 0.5, P5: 0.5, P6: 1, P7: 0 },
    relevantContexts: ['product', 'registration', 'account_settings', 'cart']
  },
  {
    id: 'K-30',
    label: 'Is there no filtering or sorting functionality?',
    weight: 2,
    principles: { P1: 0.5, P2: 0, P3: 0.5, P4: 0, P5: 0, P6: 1, P7: 1 },
    relevantContexts: ['product']
  },
  {
    id: 'K-34',
    label: "Is important information on the page presented in a different language than the rest of the system's content?",
    weight: 2,
    principles: { P1: 0, P2: 0, P3: 0.5, P4: 0, P5: 0.5, P6: 1, P7: 0.5 },
    relevantContexts: ['product', 'checkout', 'registration', 'generic']
  },
  {
    id: 'K-38',
    label: 'Are there any automatic pop-ups or modals that appear without user interaction?',
    weight: 2,
    principles: { P2: 1, P3: 0.5 },
    relevantContexts: ['product', 'checkout', 'cart', 'account_settings', 'generic']
  },
  {
    id: 'K-46',
    label: 'Are the newsletter and marketing checkboxes checked by default?',
    weight: 2,
    principles: { P2: 1, P3: 0.5 },
    relevantContexts: ['checkout', 'account_settings', 'registration', 'generic']
  },
  {
    id: 'K-42',
    label: "Are you asked to provide more than just your email and password when registering?",
    weight: 2,
    principles: { P1: 0.5, P2: 0, P3: 0, P4: 1, P5: 0, P6: 0.5, P7: 0 },
    relevantContexts: ['registration']
  },
  {
    id: 'K-51',
    label: 'Are videos or other content playing automatically?',
    weight: 3,
    principles: { P1: 1, P2: 0, P3: 0, P4: 0, P5: 0, P6: 1, P7: 0.5 },
    relevantContexts: ['product']
  },
  {
    id: 'K-53',
    label: 'Does the page contain text about high demand (for example, "High demand," "selling out quickly")?',
    weight: 1,
    principles: { P1: 0.5, P2: 0, P3: 0, P4: 0, P5: 0, P6: 0.5, P7: 0 },
    relevantContexts: ['product', 'cart', 'checkout']
  },
  {
    id: 'K-55',
    label: 'Is there a visually highlighted information provided with the product that its quantity is limited (e.g. the statement "only 5 left", highlighted in red)?',
    weight: 1,
    principles: { P1: 0, P2: 0.5, P3: 0.5, P4: 0, P5: 0, P6: 0.5, P7: 0 },
    relevantContexts: ['product', 'cart', 'checkout']
  },
  {
    id: 'K-57',
    label: 'Are there frequently repeated words among the reviews? Are there no user identifications in the reviews?',
    weight: 1,
    principles: { P1: 0, P2: 0.5, P3: 0.5, P4: 0, P5: 0, P6: 0.5, P7: 0.5 },
    relevantContexts: ['product']
  },
  {
    id: 'K-58',
    label: 'Does the interface provide information about the activity of other (real or fictional) users (e.g. "X just bought Y", "N users are viewing this item")?',
    weight: 1,
    principles: { P1: 0, P2: 0, P3: 0, P4: 0, P5: 0, P6: 0.5, P7: 0.5 },
    relevantContexts: ['product', 'cart', 'checkout']
  },
  {
    id: 'K-59',
    label: 'Is there a countdown timer in the interface showing limited-time access or a discount for a product or service?',
    weight: 1,
    principles: { P1: 0, P2: 0, P3: 0, P4: 0, P5: 0, P6: 0.5, P7: 0.5 },
    relevantContexts: ['product', 'cart', 'checkout']
  },
  {
    id: 'K-60',
    label: 'Does the product or service indicate that it is a limited-time offer and will end soon (e.g. "Limited-time offer")?',
    weight: 1,
    principles: { P1: 0, P2: 0, P3: 0, P4: 0, P5: 0, P6: 0.5, P7: 0.5 },
    relevantContexts: ['product', 'cart', 'checkout']
  },
  {
    id: 'K-61',
    label: 'Are there words next to the refusal discouraging the user from completing the action (e.g. "don\'t miss it," "you\'ll regret it," "shame," "no, I want to overpay")?',
    weight: 1,
    principles: { P1: 0.5, P2: 0, P3: 0, P4: 0, P5: 0, P6: 1, P7: 0 },
    relevantContexts: ['product', 'cart', 'checkout', 'registration', 'account_settings']
  },
  {
    id: 'K-63',
    label: 'Can a user only see personalized content? Can a user disable content personalization?',
    weight: 2,
    principles: { P2: 0.5, P3: 0.5, P6: 0.5 },
    relevantContexts: ['product', 'account_settings', 'generic']
  }
];

export const PRINCIPLE_META: PrincipleMeta[] = [
  { id: 'P1', label: 'Intent clarity' },
  { id: 'P2', label: 'Ethical intent' },
  { id: 'P3', label: 'No forced persuasion' },
  { id: 'P4', label: 'Privacy' },
  { id: 'P5', label: 'Third-party sharing' },
  { id: 'P6', label: 'Unbiased outcomes' },
  { id: 'P7', label: 'Designer responsibility' }
];
