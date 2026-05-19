export interface RuleColor {
  border: string;
  background: string;
  label: string;
}

const RULE_COLORS: Record<string, RuleColor> = {
  'KO-1': { border: 'rgba(230,126,34,0.8)', background: 'rgba(230,126,34,0.08)', label: 'rgba(230,126,34,0.9)' },
  'KO-2': { border: 'rgba(226,75,74,0.8)', background: 'rgba(226,75,74,0.08)', label: 'rgba(226,75,74,0.9)' },
  'KO-3': { border: 'rgba(234,147,40,0.8)', background: 'rgba(234,147,40,0.08)', label: 'rgba(234,147,40,0.9)' },
  'KO-4': { border: 'rgba(52,168,83,0.8)', background: 'rgba(52,168,83,0.08)', label: 'rgba(52,168,83,0.9)' },
  'KO-5': { border: 'rgba(66,133,244,0.8)', background: 'rgba(66,133,244,0.08)', label: 'rgba(66,133,244,0.9)' },
  'KO-6': { border: 'rgba(26,188,156,0.8)', background: 'rgba(26,188,156,0.08)', label: 'rgba(26,188,156,0.9)' },
  'KO-7': { border: 'rgba(39,174,96,0.8)', background: 'rgba(39,174,96,0.08)', label: 'rgba(39,174,96,0.9)' },
  'KO-8': { border: 'rgba(231,76,60,0.8)', background: 'rgba(231,76,60,0.08)', label: 'rgba(231,76,60,0.9)' },
  'KO-9': { border: 'rgba(52,73,94,0.8)', background: 'rgba(52,73,94,0.08)', label: 'rgba(52,73,94,0.9)' },
  'KO-10': { border: 'rgba(22,160,133,0.8)', background: 'rgba(22,160,133,0.08)', label: 'rgba(22,160,133,0.9)' },
  'KO-11': { border: 'rgba(155,89,182,0.8)', background: 'rgba(155,89,182,0.08)', label: 'rgba(155,89,182,0.9)' },
  'KO-12': { border: 'rgba(243,156,18,0.8)', background: 'rgba(243,156,18,0.08)', label: 'rgba(243,156,18,0.9)' },
  'KO-13': { border: 'rgba(142,68,173,0.8)', background: 'rgba(142,68,173,0.08)', label: 'rgba(142,68,173,0.9)' },
  'KO-14': { border: 'rgba(46,204,113,0.8)', background: 'rgba(46,204,113,0.08)', label: 'rgba(46,204,113,0.9)' },
  'KO-15': { border: 'rgba(52,152,219,0.8)', background: 'rgba(52,152,219,0.08)', label: 'rgba(52,152,219,0.9)' },
  'KO-16': { border: 'rgba(231,76,60,0.8)', background: 'rgba(231,76,60,0.08)', label: 'rgba(231,76,60,0.9)' },
  'KO-17': { border: 'rgba(52,152,219,0.8)', background: 'rgba(52,152,219,0.08)', label: 'rgba(52,152,219,0.9)' },
  'KO-18': { border: 'rgba(241,90,36,0.8)', background: 'rgba(241,90,36,0.08)', label: 'rgba(241,90,36,0.9)' },
  'KO-19': { border: 'rgba(192,57,43,0.8)', background: 'rgba(192,57,43,0.08)', label: 'rgba(192,57,43,0.9)' },
  'KO-20': { border: 'rgba(241,196,15,0.8)', background: 'rgba(241,196,15,0.08)', label: 'rgba(241,196,15,0.9)' },
  'KO-21': { border: 'rgba(127,140,141,0.8)', background: 'rgba(127,140,141,0.08)', label: 'rgba(127,140,141,0.9)' },
  'KO-22': { border: 'rgba(211,84,0,0.8)', background: 'rgba(211,84,0,0.08)', label: 'rgba(211,84,0,0.9)' },
  'KO-23': { border: 'rgba(41,128,185,0.8)', background: 'rgba(41,128,185,0.08)', label: 'rgba(41,128,185,0.9)' },
  'KO-24': { border: 'rgba(142,68,173,0.8)', background: 'rgba(142,68,173,0.08)', label: 'rgba(142,68,173,0.9)' },
  'KO-25': { border: 'rgba(230,126,34,0.8)', background: 'rgba(230,126,34,0.08)', label: 'rgba(230,126,34,0.9)' },
};

const FALLBACK_COLOR: RuleColor = {
  border: 'rgba(149,165,166,0.8)',
  background: 'rgba(149,165,166,0.08)',
  label: 'rgba(149,165,166,0.9)',
};

export function getRuleColor(ruleId: string): RuleColor {
  return RULE_COLORS[ruleId] ?? FALLBACK_COLOR;
}
