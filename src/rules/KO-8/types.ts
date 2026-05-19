export type OverlayClassification = 'LARGE' | 'DOMINANT' | 'FULL_TAKEOVER';

export interface CoverageMeasurement {
  element: HTMLElement;
  selector: string;
  rect: DOMRect;
  coverageRatio: number;
  isAboveFold: boolean;
  blocksContent: boolean;
  hasDismissMechanism: boolean;
  classification: OverlayClassification;
  text: string;
}
