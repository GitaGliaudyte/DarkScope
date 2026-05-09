// This file exports the active DarkScope rule set in execution order.
import { RuleDefinition } from '../engine/types';
import K59Rule from './K-59';

export const rules: RuleDefinition[] = [K59Rule];

export default rules;
