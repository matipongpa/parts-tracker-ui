export const ACCEPTED_EXTENSIONS: ReadonlyArray<string> = ['.xlsm', '.xlsx'];

/** Mirrors the backend limit (10 MB), so an oversized file is refused before it is uploaded. */
export const MAX_UPLOAD_BYTES: number = 10 * 1024 * 1024;

/** The part fields a BOM column can feed. The names are the backend's. */
export type FieldKey =
  | 'designator'
  | 'part_number'
  | 'description'
  | 'footprint'
  | 'fit'
  | 'manufacturer'
  | 'value'
  | 'project_name'
  | 'pcb_ref';

/** Where a field's value comes from: a column of every row, one fixed cell, or text typed by the user. Row and column are zero-based. */
export type SourceKind = 'column' | 'cell' | 'text';

export interface FieldSource {
  kind: SourceKind;
  column: number;
  row: number;
  text: string;
}

/** Sent to the backend as is. A field with no entry is not mapped. */
export interface Mapping {
  header_row: number;
  fields: Partial<Record<FieldKey, FieldSource>>;
}

/** How a mapped field was found; anything but exact or saved deserves a second look. */
export type Confidence = 'exact' | 'partial' | 'content' | 'label' | 'saved';

export type MappingOrigin = 'saved' | 'detected' | 'given';

export interface PreviewSummary {
  rows: number;
  valid: number;
  skipped: number;
}

export interface Preview {
  sheets: string[];
  sheet: string;
  headerDetected: boolean;
  totalRows: number;
  columns: number;
  /** The top of the sheet as a rectangle (every row has `columns` cells). */
  rows: string[][];
  mapping: Mapping;
  origin: MappingOrigin;
  confidence: Partial<Record<FieldKey, Confidence>>;
  missing: FieldKey[];
  /** What the project name and PCB ref come out as, so the user sees the effect of the mapping. */
  resolved: { project_name: string; pcb_ref: string };
  summary: PreviewSummary;
}

/** What the user chose to look at; undefined means "let the server decide". */
export interface PreviewRequest {
  sheet?: string;
  headerRow?: number;
  mapping?: Mapping;
}

export interface ImportRequest {
  sheet: string;
  mapping: Mapping;
  saveMapping: boolean;
}

/** Counts returned by POST /bom/import. Skipped rows have an unknown designator or a missing field; duplicates already exist. */
export interface ImportResult {
  total: number;
  inserted: number;
  skipped: number;
  duplicates: number;
  mappingSaved: boolean;
}
