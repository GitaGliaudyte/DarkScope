import { ParsedDiscountLabel } from './parsing';
import { ScoreableGroupEvaluation } from './scoring';

export interface PriceCandidate {
  element: HTMLElement;
  selector: string;
  text: string;
  priceText: string;
  priceValue: number;
  boundingBox: DOMRect;
  priority: number;
  hasFinalHint: boolean;
}

export interface DiscountLabelCandidate {
  element: HTMLElement;
  selector: string;
  text: string;
  parsedLabel: ParsedDiscountLabel;
  boundingBox: DOMRect;
}

export interface PriceGroup {
  original: PriceCandidate;
  final: PriceCandidate;
  percentageLabel: DiscountLabelCandidate | null;
  absoluteLabel: DiscountLabelCandidate | null;
  container: HTMLElement | null;
  selector: string;
  boundingBox: DOMRect | null;
}

export interface PercentageOnlyGroup {
  percentageLabel: DiscountLabelCandidate;
  final: PriceCandidate | null;
}

export interface PriceGroupSearchResult {
  groups: PriceGroup[];
  hasAnyPrice: boolean;
  hasOriginalPrice: boolean;
  percentageOnlyGroups: PercentageOnlyGroup[];
}

export interface GroupEvaluation extends ScoreableGroupEvaluation {
  selector: string;
  visualSelector: string;
  boundingBox: DOMRect | null;
  text: string;
  reason: string;
}

