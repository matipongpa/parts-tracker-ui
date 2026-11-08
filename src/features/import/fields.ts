import type { FieldKey, FieldSource, Mapping } from '@/features/import/types';

export interface FieldDef {
  key: FieldKey;
  label: string;
  required: boolean;
  /** The designator decides the part type, so it must be a column. */
  columnOnly: boolean;
}

/** In the order the form shows them. `required` mirrors what the backend refuses to store without. */
export const FIELD_DEFS: ReadonlyArray<FieldDef> = [
  { key: 'designator', label: 'Designator', required: true, columnOnly: true },
  { key: 'part_number', label: 'Part number', required: true, columnOnly: false },
  { key: 'value', label: 'Value', required: true, columnOnly: false },
  { key: 'manufacturer', label: 'Manufacturer', required: true, columnOnly: false },
  { key: 'fit', label: 'Fit / not fit', required: true, columnOnly: false },
  { key: 'project_name', label: 'Project name', required: true, columnOnly: false },
  { key: 'pcb_ref', label: 'PCB ref', required: true, columnOnly: false },
  { key: 'description', label: 'Description', required: false, columnOnly: false },
  { key: 'footprint', label: 'Footprint', required: false, columnOnly: false },
];

const LETTERS = 26;
const CHAR_CODE_A = 65;

/** 0 -> "A", 25 -> "Z", 26 -> "AA". */
export function columnLetter(index: number): string {
  let rest: number = index;
  let letters = '';
  do {
    letters = String.fromCharCode(CHAR_CODE_A + (rest % LETTERS)) + letters;
    rest = Math.floor(rest / LETTERS) - 1;
  } while (rest >= 0);
  return letters;
}

/** "B3" -> { row: 2, column: 1 } (zero-based), or null when the text is not a cell reference. */
export function parseCellRef(text: string): { row: number; column: number } | null {
  const match: RegExpMatchArray | null = /^([A-Za-z]{1,3})(\d{1,7})$/.exec(text.trim());
  if (match === null) return null;
  const letters: string = (match[1] ?? '').toUpperCase();
  const rowNumber: number = Number(match[2]);
  if (rowNumber < 1) return null;
  let column = 0;
  for (const letter of letters) column = column * LETTERS + (letter.charCodeAt(0) - CHAR_CODE_A + 1);
  return { row: rowNumber - 1, column: column - 1 };
}

export function formatCellRef(row: number, column: number): string {
  return `${columnLetter(column)}${row + 1}`;
}

/** Returns a copy with one field's source replaced, or removed when `source` is null. */
export function withSource(mapping: Mapping, key: FieldKey, source: FieldSource | null): Mapping {
  const fields: Mapping['fields'] = { ...mapping.fields };
  if (source === null) delete fields[key];
  else fields[key] = source;
  return { ...mapping, fields };
}

export function columnSource(column: number): FieldSource {
  return { kind: 'column', column, row: 0, text: '' };
}

export function cellSource(row: number, column: number): FieldSource {
  return { kind: 'cell', column, row, text: '' };
}

export function textSource(text: string): FieldSource {
  return { kind: 'text', column: 0, row: 0, text };
}

/** Which fields read each column, so the table can label the columns. */
export function fieldsByColumn(mapping: Mapping): Map<number, FieldKey[]> {
  const byColumn: Map<number, FieldKey[]> = new Map<number, FieldKey[]>();
  for (const def of FIELD_DEFS) {
    const source: FieldSource | undefined = mapping.fields[def.key];
    if (source?.kind !== 'column') continue;
    byColumn.set(source.column, [...(byColumn.get(source.column) ?? []), def.key]);
  }
  return byColumn;
}

export function labelOf(key: FieldKey): string {
  return FIELD_DEFS.find((def: FieldDef): boolean => def.key === key)?.label ?? key;
}

/**
 * Drops sources that are not finished yet (blank text), because the server refuses them. A mapping with
 * such gaps is a work in progress, and the server reports the field as missing instead.
 */
export function pruneIncomplete(mapping: Mapping): Mapping {
  const fields: Mapping['fields'] = {};
  for (const def of FIELD_DEFS) {
    const source: FieldSource | undefined = mapping.fields[def.key];
    if (source === undefined) continue;
    if (source.kind === 'text' && source.text.trim() === '') continue;
    fields[def.key] = source;
  }
  return { ...mapping, fields };
}
