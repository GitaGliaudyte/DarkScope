export interface DeletionCandidate {
  element: Element;
  selector: string;
  text: string;
  matchedGroup: 'A' | 'B' | 'C' | 'D';
  visible: boolean;
}

export interface HiddenDeletionCandidate {
  element: Element;
  reason: 'display_none' | 'aria_hidden' | 'visually_hidden';
}
