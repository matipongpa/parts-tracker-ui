export type TypeTone = 'amber' | 'sky' | 'violet' | 'rose' | 'emerald' | 'indigo' | 'teal' | 'slate';

// Ordered: first match wins, so "Zener diode" / "Photodiode" land on diode, not a broader rule.
const RULES: ReadonlyArray<readonly [RegExp, TypeTone]> = [
  [/resistor|thermistor|varistor/i, 'amber'],
  [/capacitor/i, 'sky'],
  [/inductor|ferrite|transformer/i, 'violet'],
  [/diode|rectifier/i, 'rose'],
  [/transistor/i, 'emerald'],
  [/integrated circuit|\bic\b|regulator/i, 'indigo'],
  [/connector|jumper/i, 'teal'],
];

export function typeTone(type: string): TypeTone {
  const match: readonly [RegExp, TypeTone] | undefined = RULES.find(
    ([pattern]: readonly [RegExp, TypeTone]): boolean => pattern.test(type),
  );
  return match ? match[1] : 'slate';
}
