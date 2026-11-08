import { describe, expect, it } from 'vitest';

import { typeTone } from '@/features/parts/typeTone';
import type { TypeTone } from '@/features/parts/typeTone';

describe('typeTone', (): void => {
  it.each<[string, TypeTone]>([
    ['Resistor', 'amber'],
    ['Resistor network', 'amber'],
    ['Capacitor', 'sky'],
    ['Inductor', 'violet'],
    ['Diode', 'rose'],
    ['Zener diode', 'rose'],
    ['Photodiode', 'rose'],
    ['Transistor', 'emerald'],
    ['Integrated circuit (IC)', 'indigo'],
    ['Jack connector', 'teal'],
    ['Fiducial', 'slate'],
    ['', 'slate'],
  ])('maps "%s" to %s', (type: string, tone: TypeTone): void => {
    expect(typeTone(type)).toBe(tone);
  });
});
