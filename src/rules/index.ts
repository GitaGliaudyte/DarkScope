// This file exports the active DarkScope rule set in execution order.
import { RuleDefinition } from '../engine/types';
import K04Rule from './K-04';
import K02Rule from './K-02';
import K05Rule from './K-05';
import K06Rule from './K-06';
import K55Rule from './K-55';
import K59Rule from './K-59';

export const rules: RuleDefinition[] = [K02Rule, K04Rule, K05Rule, K06Rule, K55Rule, K59Rule];

export default rules;
