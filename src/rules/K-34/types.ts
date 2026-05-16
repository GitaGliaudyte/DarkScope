import { ScoreableFlaggedRegion } from './scoring';

export interface TextSample {
  region: string;
  text: string;
}

export interface CollectedTextSample extends TextSample {
  selector: string;
  boundingBox: DOMRect | null;
}

export interface FlaggedRegion extends ScoreableFlaggedRegion {
  sampleNumber?: number;
  text: string;
  detectedLanguage: string;
}

export interface ParsedLlmResponse {
  dominantLanguage: string;
  flaggedRegions: FlaggedRegion[];
  confidence: 'high' | 'medium' | 'low';
}

export interface ParseAttemptResult {
  parsed: ParsedLlmResponse | null;
  reason: string;
  candidate: string;
}
