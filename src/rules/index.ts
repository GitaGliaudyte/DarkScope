// This file exports the active DarkScope rule set in execution order.
import { RuleDefinition } from '../engine/types';
import K04Rule from './K-04';
import K02Rule from './K-02';
import K05Rule from './K-05';
import K06Rule from './K-06';
import K11Rule from './K-11';
import K13Rule from './K-13';
import K51Rule from './K-51';
import K53Rule from './K-53';
import K55Rule from './K-55';
import K58Rule from './K-58';
import K59Rule from './K-59';
import K60Rule from './K-60';
import K61Rule from './K-61';

export const rules: RuleDefinition[] = [K02Rule, K04Rule, K05Rule, K06Rule, K11Rule, K13Rule, K51Rule, K53Rule, K55Rule, K58Rule, K59Rule, K60Rule, K61Rule];

export default rules;
