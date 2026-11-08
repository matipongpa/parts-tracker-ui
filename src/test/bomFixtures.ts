const col = (column: number): { kind: string; column: number; row: number; text: string } => ({ kind: 'column', column, row: 0, text: '' });

/** A /bom/preview answer where every required field is mapped, for a sheet with the header on row 3. */
export function completePreview(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    sheets: ['Sheet1'],
    sheet: 'Sheet1',
    header_detected: true,
    total_rows: 6,
    columns: 5,
    rows: [
      ['Project Name :', 'Widget', '', '', ''],
      ['PCB Ref:', 'PCB-1', '', '', ''],
      ['Designator', 'Manufacturer part no.', 'Value', 'FIT/NFIT', 'Manufacturer'],
      ['C1', 'PN-C', '100n', 'FIT', 'Murata'],
      ['R1', 'PN-R', '10k', 'FIT', 'Yageo'],
    ],
    mapping: {
      header_row: 2,
      fields: {
        designator: col(0),
        part_number: col(1),
        value: col(2),
        fit: col(3),
        manufacturer: col(4),
        project_name: { kind: 'cell', column: 1, row: 0, text: '' },
        pcb_ref: { kind: 'cell', column: 1, row: 1, text: '' },
      },
    },
    mapping_source: 'detected',
    confidence: { designator: 'exact', part_number: 'exact', value: 'exact', fit: 'exact', manufacturer: 'exact', project_name: 'label', pcb_ref: 'label' },
    missing: [],
    resolved: { project_name: 'Widget', pcb_ref: 'PCB-1' },
    summary: { rows: 2, valid: 2, skipped: 0 },
    ...overrides,
  };
}

/** The same sheet, but the Value and Fit columns were not recognised. */
export function incompletePreview(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const full: Record<string, unknown> = completePreview();
  const mapping = full.mapping as { header_row: number; fields: Record<string, unknown> };
  const fields: Record<string, unknown> = Object.fromEntries(
    Object.entries(mapping.fields).filter(([key]: [string, unknown]): boolean => key !== 'value' && key !== 'fit'),
  );
  return {
    ...full,
    mapping: { header_row: 2, fields },
    confidence: {},
    missing: ['value', 'fit'],
    summary: { rows: 0, valid: 0, skipped: 0 },
    ...overrides,
  };
}
