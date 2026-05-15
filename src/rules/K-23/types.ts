export type BiasClassification = 'WEAK_BIAS' | 'MODERATE_BIAS' | 'STRONG_BIAS';

export interface PriceData {
  element: HTMLElement;
  displayElement: HTMLElement;
  text: string;
  value: number;
}

export interface ProductCard {
  element: HTMLElement;
  selector: string;
  text: string;
  price: PriceData;
  boundingBox: DOMRect;
}

export interface ProductGroup {
  container: HTMLElement;
  cards: ProductCard[];
  priority: number;
}

export interface CheapestBaseline {
  cards: ProductCard[];
  averageArea: number;
  averageWidth: number;
  averageHeight: number;
  averagePriceFontSize: number;
  averagePriceFontWeight: number;
  averagePriceDisplayArea: number;
  averagePriceDisplayHeight: number;
  backgroundColors: string[];
  maxBorderWidth: number;
  priceColors: string[];
  hasShadow: boolean;
}

export interface CardMeasurement {
  card: ProductCard;
  score: number;
  signals: string[];
  hasStrongEmphasis: boolean;
  hasStyleEmphasis: boolean;
}

export interface CardFinding {
  classification: BiasClassification;
  selector: string;
  visualSelector: string;
  boundingBox: DOMRect;
  text: string;
  reason: string;
}
