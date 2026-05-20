export interface RuleColor {
  border: string;
  background: string;
  label: string;
}

const RULE_COLORS: Record<string, RuleColor> = {
  'K-02': { border: 'rgba(230,126,34,0.8)', background: 'rgba(230,126,34,0.08)', label: 'rgba(230,126,34,0.9)' },
  'K-04': { border: 'rgba(226,75,74,0.8)', background: 'rgba(226,75,74,0.08)', label: 'rgba(226,75,74,0.9)' },
  'K-05': { border: 'rgba(234,147,40,0.8)', background: 'rgba(234,147,40,0.08)', label: 'rgba(234,147,40,0.9)' },
  'K-06': { border: 'rgba(52,168,83,0.8)', background: 'rgba(52,168,83,0.08)', label: 'rgba(52,168,83,0.9)' },
  'K-11': { border: 'rgba(66,133,244,0.8)', background: 'rgba(66,133,244,0.08)', label: 'rgba(66,133,244,0.9)' },
  'K-12': { border: 'rgba(155,89,182,0.8)', background: 'rgba(155,89,182,0.08)', label: 'rgba(155,89,182,0.9)' },
  'K-13': { border: 'rgba(26,188,156,0.8)', background: 'rgba(26,188,156,0.08)', label: 'rgba(26,188,156,0.9)' },
  'K-16': { border: 'rgba(39,174,96,0.8)', background: 'rgba(39,174,96,0.08)', label: 'rgba(39,174,96,0.9)' },
  'K-18': { border: 'rgba(241,196,15,0.8)', background: 'rgba(241,196,15,0.08)', label: 'rgba(241,196,15,0.9)' },
  'K-20': { border: 'rgba(231,76,60,0.8)', background: 'rgba(231,76,60,0.08)', label: 'rgba(231,76,60,0.9)' },
  'K-23': { border: 'rgba(52,73,94,0.8)', background: 'rgba(52,73,94,0.08)', label: 'rgba(52,73,94,0.9)' },
  'K-24': { border: 'rgba(22,160,133,0.8)', background: 'rgba(22,160,133,0.08)', label: 'rgba(22,160,133,0.9)' },
  'K-26': { border: 'rgba(160, 22, 116, 0.8)', background: 'rgba(22,160,133,0.08)', label: 'rgba(160, 22, 116, 0.8)' },
  'K-30': { border: 'rgba(243,156,18,0.8)', background: 'rgba(243,156,18,0.08)', label: 'rgba(243,156,18,0.9)' },
  'K-34': { border: 'rgba(142,68,173,0.8)', background: 'rgba(142,68,173,0.08)', label: 'rgba(142,68,173,0.9)' },
  'K-38': { border: 'rgba(255, 70, 193, 0.8)', background: 'rgba(52,152,219,0.08)', label: 'rgba(255, 70, 193, 0.8)' },
  'K-42': { border: 'rgba(184, 70, 255, 0.8)', background: 'rgba(52,152,219,0.08)', label: 'rgba(184, 70, 255, 0.8)' },
  'K-46': { border: 'rgba(70, 88, 255, 0.8)', background: 'rgba(52,152,219,0.08)', label: 'rgba(70, 88, 255, 0.8)' },
  'K-51': { border: 'rgba(52,152,219,0.8)', background: 'rgba(52,152,219,0.08)', label: 'rgba(52,152,219,0.9)' },
  'K-53': { border: 'rgba(241,90,36,0.8)', background: 'rgba(241,90,36,0.08)', label: 'rgba(241,90,36,0.9)' },
  'K-55': { border: 'rgba(192,57,43,0.8)', background: 'rgba(192,57,43,0.08)', label: 'rgba(192,57,43,0.9)' },
  'K-57': { border: 'rgba(0, 137, 242, 0.8)', background: 'rgba(127,140,141,0.08)', label: 'rgba(0, 137, 242, 0.8)' },
  'K-58': { border: 'rgba(15, 192, 205, 0.9)', background: 'rgba(127,140,141,0.08)', label: 'rgba(15, 192, 205, 0.9)' },
  'K-59': { border: 'rgba(211,84,0,0.8)', background: 'rgba(211,84,0,0.08)', label: 'rgba(211,84,0,0.9)' },
  'K-60': { border: 'rgba(41,128,185,0.8)', background: 'rgba(41,128,185,0.08)', label: 'rgba(41,128,185,0.9)' },
  'K-61': { border: 'rgba(142,68,173,0.8)', background: 'rgba(142,68,173,0.08)', label: 'rgba(142,68,173,0.9)' },
  'K-63': { border: 'rgba(182, 65, 15, 0.8)', background: 'rgba(142,68,173,0.08)', label: 'rgba(182, 65, 15, 0.8)' },
};

const FALLBACK_COLOR: RuleColor = {
  border: 'rgba(149,165,166,0.8)',
  background: 'rgba(149,165,166,0.08)',
  label: 'rgba(149,165,166,0.9)',
};

export function getRuleColor(ruleId: string): RuleColor {
  return RULE_COLORS[ruleId] ?? FALLBACK_COLOR;
}
