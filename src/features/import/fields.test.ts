import { describe, expect, it } from 'vitest';

import { cellSource, columnLetter, columnSource, fieldsByColumn, formatCellRef, parseCellRef, pruneIncomplete, textSource, withSource } from '@/features/import/fields';
import type { Mapping } from '@/features/import/types';

describe('columnLetter', (): void => {
  it('counts like a spreadsheet', (): void => {
    expect([0, 1, 25, 26, 27, 51, 52, 701, 702].map(columnLetter)).toEqual(['A', 'B', 'Z', 'AA', 'AB', 'AZ', 'BA', 'ZZ', 'AAA']);
  });
});

describe('parseCellRef', (): void => {
  it('reads A1-style references as zero-based row and column', (): void => {
    expect(parseCellRef('B1')).toEqual({ row: 0, column: 1 });
    expect(parseCellRef(' aa12 ')).toEqual({ row: 11, column: 26 });
  });

  it('rejects anything else', (): void => {
    for (const text of ['', 'B', '12', 'B0', '1B', 'B 1', 'ABCD1']) expect(parseCellRef(text)).toBeNull();
  });

  it('round-trips with formatCellRef', (): void => {
    expect(formatCellRef(11, 26)).toBe('AA12');
    expect(parseCellRef(formatCellRef(99, 700))).toEqual({ row: 99, column: 700 });
  });
});

const BASE: Mapping = { header_row: 2, fields: { designator: columnSource(0), part_number: columnSource(1) } };

describe('withSource', (): void => {
  it('replaces or removes one field without touching the original', (): void => {
    const changed: Mapping = withSource(BASE, 'value', columnSource(4));
    expect(changed.fields.value).toEqual(columnSource(4));
    expect(BASE.fields.value).toBeUndefined();
    expect(withSource(changed, 'value', null).fields.value).toBeUndefined();
    expect(changed.header_row).toBe(2);
  });
});

describe('fieldsByColumn', (): void => {
  it('lists the fields that read each column, ignoring cells and typed text', (): void => {
    const mapping: Mapping = {
      header_row: 0,
      fields: { designator: columnSource(0), value: columnSource(0), project_name: cellSource(0, 1), pcb_ref: textSource('X') },
    };
    expect(fieldsByColumn(mapping)).toEqual(new Map([[0, ['designator', 'value']]]));
  });
});

describe('pruneIncomplete', (): void => {
  it('drops typed values that are still blank and keeps the rest', (): void => {
    const mapping: Mapping = { header_row: 0, fields: { designator: columnSource(0), fit: textSource('  '), pcb_ref: textSource('PCB-1') } };
    expect(pruneIncomplete(mapping).fields).toEqual({ designator: columnSource(0), pcb_ref: textSource('PCB-1') });
  });
});
