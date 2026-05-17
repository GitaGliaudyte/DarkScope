// This file centralizes the shared types used across the DarkScope detection engine.
export type RuleStatus = 'detected' | 'not_detected' | 'not_applicable' | 'error';
export type Confidence = 'high' | 'medium' | 'low';
export type PageType = 'product' | 'cart' | 'checkout' | 'registration' | 'account_settings' | 'generic';
export type PrincipleId = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6' | 'P7';
export type ViolationStrength = 0 | 0.5 | 1;
export type QuestionWeight = 1 | 2 | 3;
export type AnswerValue = 'yes' | 'no' | 'na';

export interface NormalizedElement {
  selector: string;
  tag: string;
  text: string;
  attributes: Record<string, string>;
  visible: boolean;
  boundingBox: DOMRect | null;
}

export interface PageSnapshot {
  url: string;
  title: string;
  lang: string;
  text: string;
  elements: NormalizedElement[];
  links: NormalizedElement[];
  buttons: NormalizedElement[];
}

export interface PageContext {
  type: PageType;
  confidence: 'high' | 'medium' | 'low';
  signals: string[];
}

export interface AnalysisContext {
  snapshot: PageSnapshot;
  viewport: { width: number; height: number };
  pageContext: PageContext;
}

export interface Evidence {
  selector: string;
  text: string;
  reason: string;
  boundingBox: DOMRect | null;
}

export interface VisualTarget {
  type: 'single' | 'multiple' | 'none';
  selectors: string[];
}

export interface RuleResult {
  ruleId: string;
  detected: boolean;
  status: RuleStatus;
  probability: number;
  confidence: Confidence;
  impact: 'high' | 'medium' | 'low';
  evidence: Evidence[];
  explanation: string;
  recommendation: string;
  visualTarget: VisualTarget;
  occurrenceCount: number;
}

export interface RuleDefinition {
  id: string;
  pageClassifier: (snapshot: PageSnapshot, relevantOn?: string[]) => boolean;
  relevantOn?: string[];
  skipIfNotRelevant?: boolean;
  relevantContexts?: PageType[];
  detect: (context: AnalysisContext) => RuleResult | Promise<RuleResult>;
}

export interface KQuestion {
  id: string;
  label: string;
  displayLabel: string;
  weight: QuestionWeight;
  principles: Partial<Record<PrincipleId, ViolationStrength>>;
  relevantContexts: PageType[];
}

export interface PrincipleMeta {
  id: PrincipleId;
  label: string;
}

export type ViolationProfile = Record<PrincipleId, number>;

export interface LlmRequestPayload {
  prompt: string;
  maxTokens?: number;
  responseMimeType?: 'application/json';
  responseSchema?: Record<string, unknown>;
  thinkingBudget?: number;
}

export interface LlmProxyRequest {
  type: 'llm_request';
  payload: LlmRequestPayload;
}

export interface LlmProxySuccessResponse {
  text: string;
  finishReason?: string;
  promptTokenCount?: number;
  outputTokenCount?: number;
  thoughtsTokenCount?: number;
}

export interface LlmProxyErrorResponse {
  error: string;
}

export type LlmProxyResponse = LlmProxySuccessResponse | LlmProxyErrorResponse;
