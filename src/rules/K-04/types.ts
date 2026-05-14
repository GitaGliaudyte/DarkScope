export type ElementZone = 'primary' | 'supplemental';

export interface LinkCheckRequest {
  type: 'link_check_request';
  payload: {
    url: string;
  };
}

export type LinkCheckResponse = { status: number } | { status: 'timeout' } | { error: string };

export interface LinkCandidate {
  selector: string;
  element: HTMLAnchorElement;
  url: string;
  text: string;
  path: string;
  keywordMatch: boolean;
  sameOrigin: boolean;
  zone: ElementZone;
}

export interface LinkGroup {
  url: string;
  sameOrigin: boolean;
  keywordMatch: boolean;
  anchors: LinkCandidate[];
}
