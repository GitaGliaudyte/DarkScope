import { PrincipleId } from '../engine/types';

/**
 * Represents the computed violation score for a single principle.
 * 
 * @property principleId - The principle identifier (P1-P7)
 * @property V - Sum of detected violations weighted by strength and question weight
 * @property Vmax - Theoretical maximum (sum of s*w for all applicable questions)
 * @property VmaxPrime - Corrected maximum (sum of s*w excluding not_applicable questions)
 * @property score - Percentage score (0-100), or null if VmaxPrime === 0 (no applicable questions)
 */
export interface PrincipleScore {
  principleId: PrincipleId;
  V: number;
  Vmax: number;
  VmaxPrime: number;
  score: number | null;
}

/**
 * Map of all principle scores, indexed by principle ID.
 */
export type PrincipleScoreMap = Record<PrincipleId, PrincipleScore>;
