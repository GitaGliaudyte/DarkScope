// This file exports the active DarkScope rule set in execution order.
import { RuleDefinition } from '../engine/types';
import K02Rule from './K-02';
import K59Rule from './K-59';

export const rules: RuleDefinition[] = [K02Rule, K59Rule];

export default rules;
