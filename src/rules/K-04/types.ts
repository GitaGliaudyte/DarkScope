export type ElementZone = 'primary' | 'supplemental';

export interface LinkCheckRequest {
  type: 'link_check_request';
  payload: {
    url: string;
  };
}

export interface LinkCheckSuccessResponse {
  status: number;
  finalUrl: string;
  redirected: boolean;
}

export interface LinkCheckErrorResponse {
  error: string;
  code: 'invalid_url' | 'network_error' | 'runtime_error' | 'empty_response';
}

export type LinkCheckResponse = LinkCheckSuccessResponse | { status: 'timeout' } | LinkCheckErrorResponse;

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
