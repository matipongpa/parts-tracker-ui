import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { importBom, previewBom, toPreview, validateFile } from '@/features/import/api';
import { columnSource } from '@/features/import/fields';
import { setAccessToken } from '@/lib/api/session';
import { installApiMock, jsonResponse } from '@/test/apiMock';
import { incompletePreview } from '@/test/bomFixtures';
import type { ImportResult, Mapping, Preview } from '@/features/import/types';
import type { ApiMock } from '@/test/apiMock';

function workbook(name: string, size: number = 10): File {
  return new File([new Uint8Array(size)], name);
}

const PREVIEW_PAYLOAD: Record<string, unknown> = incompletePreview({ confidence: { designator: 'exact', project_name: 'label', bogus: 'exact', part_number: 'nonsense' }, missing: ['value', 'fit', 'not_a_field'], summary: { rows: 1, valid: 0, skipped: 1 } });

const MAPPING: Mapping = { header_row: 2, fields: { designator: columnSource(0) } };

describe('validateFile', (): void => {
  it('accepts .xlsm and .xlsx in any letter case', (): void => {
    expect(validateFile(workbook('bom.xlsm'))).toBeNull();
    expect(validateFile(workbook('BOM.XLSX'))).toBeNull();
  });

  it('rejects other extensions, empty files and files over 10 MB', (): void => {
    expect(validateFile(workbook('bom.csv'))).toMatch(/\.xlsm or \.xlsx/);
    expect(validateFile(workbook('bom.xlsx', 0))).toBe('That file is empty.');
    expect(validateFile(workbook('bom.xlsx', 10 * 1024 * 1024 + 1))).toBe('That file is larger than 10 MB.');
  });
});

describe('toPreview', (): void => {
  it('keeps what the contract defines and drops unknown fields and confidences', (): void => {
    const preview: Preview = toPreview(PREVIEW_PAYLOAD);
    expect(preview.confidence).toEqual({ designator: 'exact', project_name: 'label' });
    expect(preview.missing).toEqual(['value', 'fit']);
    expect(preview.mapping.fields.project_name).toEqual({ kind: 'cell', column: 1, row: 0, text: '' });
    expect(preview.origin).toBe('detected');
    expect(preview.summary).toEqual({ rows: 1, valid: 0, skipped: 1 });
    expect(preview.mapping.fields.value).toBeUndefined();
  });

  it('treats the backend\'s null lists as empty', (): void => {
    const preview: Preview = toPreview({ ...PREVIEW_PAYLOAD, missing: null, sheets: null, rows: null, confidence: null });
    expect(preview).toMatchObject({ missing: [], sheets: [], rows: [], confidence: {} });
  });

  it('rejects a payload that does not match the contract', (): void => {
    expect((): Preview => toPreview({ nope: true })).toThrow(/Unexpected response/);
    expect((): Preview => toPreview({ ...PREVIEW_PAYLOAD, mapping_source: 'magic' })).toThrow(/Unexpected response/);
    expect((): Preview => toPreview({ ...PREVIEW_PAYLOAD, summary: null })).toThrow(/Unexpected response/);
  });
});

describe('previewBom and importBom', (): void => {
  let api: ApiMock;

  beforeEach((): void => {
    api = installApiMock();
  });

  afterEach((): void => {
    api.restore();
  });

  function formOf(path: string): FormData {
    return api.callsTo(path)[0]?.init?.body as FormData;
  }

  it('previews with only the file when nothing else is chosen', async (): Promise<void> => {
    setAccessToken('jwt-1');
    api.on('POST', '/bom/preview', (): Response => jsonResponse(PREVIEW_PAYLOAD));

    await previewBom(workbook('bom.xlsm'));

    const init: RequestInit | undefined = api.callsTo('/bom/preview')[0]?.init;
    const headers: Headers = init?.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer jwt-1');
    expect(headers.has('Content-Type')).toBe(false);
    const form: FormData = formOf('/bom/preview');
    expect((form.get('file') as File).name).toBe('bom.xlsm');
    expect([...form.keys()]).toEqual(['file']);
  });

  it('sends the sheet, header row and mapping it is given', async (): Promise<void> => {
    api.on('POST', '/bom/preview', (): Response => jsonResponse(PREVIEW_PAYLOAD));

    await previewBom(workbook('bom.xlsm'), { sheet: 'Data', headerRow: 4, mapping: MAPPING });

    const form: FormData = formOf('/bom/preview');
    expect(form.get('sheet')).toBe('Data');
    expect(form.get('header_row')).toBe('4');
    expect(JSON.parse(String(form.get('mapping')))).toEqual(MAPPING);
  });

  it('posts the import with the confirmed mapping and whether to save it', async (): Promise<void> => {
    api.on('POST', '/bom/import', (): Response =>
      jsonResponse({ total: 5, inserted: 3, skipped: 1, duplicates: 1, mapping_saved: true }),
    );

    const result: ImportResult = await importBom(workbook('bom.xlsm'), { sheet: 'Data', mapping: MAPPING, saveMapping: true });

    expect(result).toEqual({ total: 5, inserted: 3, skipped: 1, duplicates: 1, mappingSaved: true });
    const form: FormData = formOf('/bom/import');
    expect(form.get('sheet')).toBe('Data');
    expect(form.get('save_mapping')).toBe('true');
    expect(JSON.parse(String(form.get('mapping')))).toEqual(MAPPING);
  });

  it('surfaces the server error with its status', async (): Promise<void> => {
    api.on('POST', '/bom/import', (): Response => jsonResponse({ error: 'invalid mapping: missing value' }, 422));
    await expect(importBom(workbook('bom.xlsm'), { sheet: 'Data', mapping: MAPPING, saveMapping: false })).rejects.toMatchObject({
      status: 422,
      message: 'invalid mapping: missing value',
    });
  });

  it('rejects an import payload that does not match the contract', async (): Promise<void> => {
    api.on('POST', '/bom/import', (): Response => jsonResponse({ total: 'many' }));
    await expect(importBom(workbook('bom.xlsm'), { sheet: 'Data', mapping: MAPPING, saveMapping: false })).rejects.toMatchObject({ status: 502 });
  });
});
