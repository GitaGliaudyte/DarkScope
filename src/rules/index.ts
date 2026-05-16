// This file exports the active DarkScope rule set in execution order.
import { RuleDefinition } from '../engine/types';
import K04Rule from './K-04';
import K02Rule from './K-02';
import K05Rule from './K-05';
import K06Rule from './K-06';
import K11Rule from './K-11';
import K13Rule from './K-13';
import K16Rule from './K-16';
import K20Rule from './K-20';
import K23Rule from './K-23';
import K24Rule from './K-24';
import K30Rule from './K-30';
import K34Rule from './K-34';
import K38Rule from './K-38';
import K42Rule from './K-42';
import K51Rule from './K-51';
import K53Rule from './K-53';
import K55Rule from './K-55';
import K57Rule from './K-57';
import K58Rule from './K-58';
import K59Rule from './K-59';
import K60Rule from './K-60';
import K46Rule from './K-46';
import K61Rule from './K-61';
import K63Rule from './K-63';

export const rules: RuleDefinition[] = [
  K02Rule,
  K04Rule,
  K05Rule,
  K06Rule,
  K11Rule,
  K13Rule,
  K16Rule,
  K20Rule,
  K23Rule,
  K24Rule,
  K30Rule,
  K34Rule,
  K38Rule,
  K42Rule,
  K46Rule,
  K51Rule,
  K53Rule,
  K55Rule,
  K57Rule,
  K58Rule,
  K59Rule,
  K60Rule,
  K61Rule,
  K63Rule
];

export default rules;
