export interface RuleFinding {
  selector: string;
  element: HTMLElement;
  score: number;
  text: string;
  boundingBox: DOMRect | null;
}
