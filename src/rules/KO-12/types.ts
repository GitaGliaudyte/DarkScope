export interface ProductCard {
  element: HTMLElement;
  selector: string;
  text: string;
  boundingBox: DOMRect;
}

export interface ProductCountResult {
  count: number;
  countLabel: string;
  products: ProductCard[];
  hasMoreThanLimit: boolean;
}

export interface ControlDetection {
  found: boolean;
  selector: string | null;
  text: string;
  boundingBox: DOMRect | null;
  score?: number;
  debugElement?: HTMLElement | null;
}
