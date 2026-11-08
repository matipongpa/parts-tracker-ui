import { request } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { isRecord } from '@/lib/api/guards';
import { FIELD_DEFS } from '@/features/import/fields';
import { ACCEPTED_EXTENSIONS, MAX_UPLOAD_BYTES } from '@/features/import/types';
import type {
  Confidence,
  FieldKey,
  FieldSource,
  ImportRequest,
  ImportResult,
  Mapping,
  MappingOrigin,
  Preview,
  PreviewRequest,
  PreviewSummary,
  SourceKind,
} from '@/features/import/types';

const UPLOAD_FIELD = 'file';
const FIELD_KEYS: ReadonlyArray<string> = FIELD_DEFS.map((def): string => def.key);
const SOURCE_KINDS: ReadonlyArray<string> = ['column', 'cell', 'text'];
const CONFIDENCES: ReadonlyArray<string> = ['exact', 'partial', 'content', 'label', 'saved'];
const ORIGINS: ReadonlyArray<string> = ['saved', 'detected', 'given'];

/** Returns a message when the file cannot be a BOM, or null when it is worth uploading. */
export function validateFile(file: File): string | null {
  const name: string = file.name.toLowerCase();
  if (!ACCEPTED_EXTENSIONS.some((extension: string): boolean => name.endsWith(extension))) {
    return 'Choose an Excel workbook (.xlsm or .xlsx).';
  }
  if (file.size === 0) return 'That file is empty.';
  if (file.size > MAX_UPLOAD_BYTES) return 'That file is larger than 10 MB.';
  return null;
}

function unexpected(): ApiError {
  return new ApiError(502, 'Unexpected response from the server.');
}

function count(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;
}

function isFieldKey(value: unknown): value is FieldKey {
  return typeof value === 'string' && FIELD_KEYS.includes(value);
}

function toSource(value: unknown): FieldSource | null {
  if (!isRecord(value) || typeof value.kind !== 'string' || !SOURCE_KINDS.includes(value.kind)) return null;
  return {
    kind: value.kind as SourceKind,
    column: count(value.column) ?? 0,
    row: count(value.row) ?? 0,
    text: typeof value.text === 'string' ? value.text : '',
  };
}

function toMapping(value: unknown): Mapping {
  if (!isRecord(value)) throw unexpected();
  const headerRow: number | null = count(value.header_row);
  if (headerRow === null) throw unexpected();
  const fields: Mapping['fields'] = {};
  if (isRecord(value.fields)) {
    for (const [key, raw] of Object.entries(value.fields)) {
      const source: FieldSource | null = toSource(raw);
      if (isFieldKey(key) && source !== null) fields[key] = source;
    }
  }
  return { header_row: headerRow, fields };
}

function toSummary(value: unknown): PreviewSummary {
  if (!isRecord(value)) throw unexpected();
  const rows: number | null = count(value.rows);
  const valid: number | null = count(value.valid);
  const skipped: number | null = count(value.skipped);
  if (rows === null || valid === null || skipped === null) throw unexpected();
  return { rows, valid, skipped };
}

function toStrings(value: unknown): string[] {
  return Array.isArray(value) ? (value as unknown[]).filter((item: unknown): item is string => typeof item === 'string') : [];
}

function toConfidence(value: unknown): Preview['confidence'] {
  const out: Preview['confidence'] = {};
  if (!isRecord(value)) return out;
  for (const [key, raw] of Object.entries(value)) {
    if (isFieldKey(key) && typeof raw === 'string' && CONFIDENCES.includes(raw)) out[key] = raw as Confidence;
  }
  return out;
}

/** Narrows the payload; Go serializes an empty slice as `null`, which becomes `[]`. */
export function toPreview(payload: unknown): Preview {
  if (!isRecord(payload) || typeof payload.sheet !== 'string' || typeof payload.mapping_source !== 'string') throw unexpected();
  if (!ORIGINS.includes(payload.mapping_source)) throw unexpected();
  const totalRows: number | null = count(payload.total_rows);
  const columns: number | null = count(payload.columns);
  if (totalRows === null || columns === null) throw unexpected();
  const resolved: Record<string, unknown> = isRecord(payload.resolved) ? payload.resolved : {};
  return {
    sheets: toStrings(payload.sheets),
    sheet: payload.sheet,
    headerDetected: payload.header_detected === true,
    totalRows,
    columns,
    rows: Array.isArray(payload.rows) ? (payload.rows as unknown[]).map(toStrings) : [],
    mapping: toMapping(payload.mapping),
    origin: payload.mapping_source as MappingOrigin,
    confidence: toConfidence(payload.confidence),
    missing: toStrings(payload.missing).filter(isFieldKey),
    resolved: {
      project_name: typeof resolved.project_name === 'string' ? resolved.project_name : '',
      pcb_ref: typeof resolved.pcb_ref === 'string' ? resolved.pcb_ref : '',
    },
    summary: toSummary(payload.summary),
  };
}

function toImportResult(payload: unknown): ImportResult {
  if (isRecord(payload)) {
    const total: number | null = count(payload.total);
    const inserted: number | null = count(payload.inserted);
    const skipped: number | null = count(payload.skipped);
    const duplicates: number | null = count(payload.duplicates);
    if (total !== null && inserted !== null && skipped !== null && duplicates !== null) {
      return { total, inserted, skipped, duplicates, mappingSaved: payload.mapping_saved === true };
    }
  }
  throw unexpected();
}

function uploadForm(file: File): FormData {
  const form: FormData = new FormData();
  form.append(UPLOAD_FIELD, file, file.name);
  return form;
}

/**
 * Reads the workbook and asks the server how it would map the columns. Nothing is stored. With no
 * mapping the server detects one (or finds the one the team saved); with a mapping it checks that instead.
 */
export async function previewBom(file: File, query: PreviewRequest = {}, signal?: AbortSignal): Promise<Preview> {
  const form: FormData = uploadForm(file);
  if (query.sheet !== undefined) form.append('sheet', query.sheet);
  if (query.headerRow !== undefined) form.append('header_row', String(query.headerRow));
  if (query.mapping !== undefined) form.append('mapping', JSON.stringify(query.mapping));
  const payload: unknown = await request('/bom/preview', { method: 'POST', body: form, signal });
  return toPreview(payload);
}

/** Uploads a BOM with the confirmed mapping. The server stores the valid rows in one transaction and skips duplicates. */
export async function importBom(file: File, input: ImportRequest): Promise<ImportResult> {
  const form: FormData = uploadForm(file);
  form.append('sheet', input.sheet);
  form.append('mapping', JSON.stringify(input.mapping));
  form.append('save_mapping', String(input.saveMapping));
  const payload: unknown = await request('/bom/import', { method: 'POST', body: form });
  return toImportResult(payload);
}
