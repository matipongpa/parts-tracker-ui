import { useId, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, FileSpreadsheet, Info, RotateCcw, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { validateFile } from '@/features/import/api';
import { FieldRow } from '@/features/import/FieldRow';
import { FIELD_DEFS, labelOf, pruneIncomplete, withSource } from '@/features/import/fields';
import { PreviewTable } from '@/features/import/PreviewTable';
import { ACCEPTED_EXTENSIONS } from '@/features/import/types';
import { useImportBom } from '@/features/import/useImportBom';
import { usePreviewBom } from '@/features/import/usePreviewBom';
import { useDebounce } from '@/hooks/useDebounce';
import { ApiError } from '@/lib/api/errors';
import type { FieldDef } from '@/features/import/fields';
import type { FieldKey, FieldSource, ImportResult, Mapping, Preview, PreviewRequest } from '@/features/import/types';
import type { ImportVariables } from '@/features/import/useImportBom';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import type { ChangeEvent, FormEvent, ReactElement, RefObject } from 'react';

const NUMBER_FORMAT: Intl.NumberFormat = new Intl.NumberFormat();
const PREVIEW_DEBOUNCE_MS = 400;

function describeError(error: Error): string {
  if (error instanceof ApiError) {
    if (error.status === 413) return 'That file is too large for the server (10 MB maximum).';
    if (error.status === 422) return error.message.startsWith('File is not') ? 'That file is not a readable Excel workbook.' : error.message;
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface StatProps {
  label: string;
  value: number;
  hint: string;
}

function Stat({ label, value, hint }: StatProps): ReactElement {
  return (
    <div className="rounded-lg border border-border bg-surface-2 px-4 py-3">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tabular-nums">{NUMBER_FORMAT.format(value)}</dd>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </div>
  );
}

function ResultView({ result }: { result: ImportResult }): ReactElement {
  return (
    <section aria-label="Import result" className="space-y-4 rounded-xl border border-border bg-surface p-5 shadow-card">
      <p className="flex items-center gap-2 font-medium">
        <CheckCircle2 className="size-5 text-accent" aria-hidden="true" />
        {result.inserted > 0
          ? `Added ${NUMBER_FORMAT.format(result.inserted)} ${result.inserted === 1 ? 'part' : 'parts'}.`
          : 'No new parts were added.'}
      </p>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Rows read" value={result.total} hint="Parts found in the file" />
        <Stat label="Added" value={result.inserted} hint="New parts stored" />
        <Stat label="Duplicates" value={result.duplicates} hint="Already in this project" />
        <Stat label="Skipped" value={result.skipped} hint="Unknown designator or missing field" />
      </dl>
      {result.mappingSaved && <p className="text-sm text-muted">This column layout is saved. The next file with the same columns will be filled in for you.</p>}
      {result.inserted > 0 && (
        <Link to="/parts" className="inline-block text-sm font-medium text-accent hover:underline">
          View parts
        </Link>
      )}
    </section>
  );
}

interface MappingStepProps {
  preview: Preview;
  mapping: Mapping;
  /** True while the shown answer is out of date with the latest edit. */
  updating: boolean;
  headerRow: number;
  onHeaderRowChange: (row: number) => void;
  onSheetChange: (sheet: string) => void;
  onFieldChange: (key: FieldKey, source: FieldSource | null) => void;
  onReset: () => void;
}

function MappingStep({ preview, mapping, updating, headerRow, onHeaderRowChange, onSheetChange, onFieldChange, onReset }: MappingStepProps): ReactElement {
  const sheetId: string = useId();
  const headerId: string = useId();
  return (
    <div className="space-y-5 rounded-xl border border-border bg-surface p-5 shadow-card">
      <div className="flex items-start gap-2 rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p>
          {preview.origin === 'saved'
            ? 'This file has the same columns as one your team confirmed before, so the layout is filled in. Check it, then import.'
            : 'The columns were matched by their headers. Check each field below and fix anything that is wrong.'}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        {preview.sheets.length > 1 && (
          <div>
            <label htmlFor={sheetId} className="mb-1.5 block text-sm font-medium">
              Sheet
            </label>
            <select
              id={sheetId}
              value={preview.sheet}
              onChange={(event: ChangeEvent<HTMLSelectElement>): void => onSheetChange(event.target.value)}
              className="h-9 rounded-lg border border-border bg-surface px-2 text-sm shadow-sm hover:border-border-strong"
            >
              {preview.sheets.map((name: string): ReactElement => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label htmlFor={headerId} className="mb-1.5 block text-sm font-medium">
            Header row
          </label>
          <input
            id={headerId}
            type="number"
            min={1}
            max={Math.max(1, preview.totalRows)}
            value={headerRow + 1}
            onChange={(event: ChangeEvent<HTMLInputElement>): void => {
              const row: number = Math.floor(Number(event.target.value));
              if (Number.isFinite(row) && row >= 1) onHeaderRowChange(row - 1);
            }}
            className="h-9 w-24 rounded-lg border border-border bg-surface px-2 text-sm shadow-sm hover:border-border-strong"
          />
        </div>
        <Button variant="ghost" size="sm" onClick={onReset}>
          <RotateCcw className="size-4" aria-hidden="true" />
          Re-detect
        </Button>
      </div>

      {!preview.headerDetected && (
        <p role="alert" className="text-sm text-danger">
          No header row was found. Press the number of the row that names the columns, or type it above.
        </p>
      )}

      <section aria-label="Sheet preview" className="space-y-2">
        <h2 className="text-sm font-semibold">Preview</h2>
        <PreviewTable preview={preview} mapping={mapping} onHeaderRowChange={onHeaderRowChange} />
      </section>

      <section aria-label="Field mapping">
        <h2 className="text-sm font-semibold">Where is each field?</h2>
        <div className="divide-y divide-border">
          {FIELD_DEFS.map((def: FieldDef): ReactElement => (
            <FieldRow
              key={def.key}
              def={def}
              source={mapping.fields[def.key]}
              confidence={preview.confidence[def.key]}
              preview={preview}
              resolved={def.key === 'project_name' || def.key === 'pcb_ref' ? preview.resolved[def.key] : undefined}
              onChange={(source: FieldSource | null): void => onFieldChange(def.key, source)}
            />
          ))}
        </div>
      </section>

      <p className="text-sm text-muted" aria-live="polite">
        {updating
          ? 'Checking…'
          : preview.missing.length > 0
            ? `Still needed: ${preview.missing.map(labelOf).join(', ')}.`
            : `${NUMBER_FORMAT.format(preview.summary.valid)} of ${NUMBER_FORMAT.format(preview.summary.rows)} rows are ready to import; ${NUMBER_FORMAT.format(preview.summary.skipped)} will be skipped (unknown designator or an empty required field). Duplicates are checked when you import.`}
      </p>
    </div>
  );
}

export function ImportPage(): ReactElement {
  const inputId: string = useId();
  const inputRef: RefObject<HTMLInputElement | null> = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<string | undefined>(undefined);
  const [headerRow, setHeaderRow] = useState<number | undefined>(undefined);
  // null means "whatever the server proposed"; once the user edits a field this holds the edited copy.
  const [mapping, setMapping] = useState<Mapping | null>(null);
  const [remember, setRemember] = useState<boolean>(true);
  const importBom: UseMutationResult<ImportResult, Error, ImportVariables> = useImportBom();

  // The server is asked again whenever the sheet, header row or mapping changes, but not on every keystroke.
  const request: PreviewRequest = useMemo<PreviewRequest>(
    (): PreviewRequest => ({ sheet, headerRow, mapping: mapping === null ? undefined : pruneIncomplete(mapping) }),
    [sheet, headerRow, mapping],
  );
  const settledRequest: PreviewRequest = useDebounce<PreviewRequest>(request, PREVIEW_DEBOUNCE_MS);
  const query: UseQueryResult<Preview> = usePreviewBom(file, settledRequest);

  const preview: Preview | undefined = query.data;
  const shown: Mapping | undefined = mapping ?? preview?.mapping;
  const updating: boolean = settledRequest !== request || query.isFetching;
  const ready: boolean = preview !== undefined && shown !== undefined && !updating && preview.missing.length === 0 && !importBom.isPending;

  function handleFile(event: ChangeEvent<HTMLInputElement>): void {
    const chosen: File | null = event.target.files?.item(0) ?? null;
    importBom.reset();
    setSheet(undefined);
    setHeaderRow(undefined);
    setMapping(null);
    const problem: string | null = chosen === null ? null : validateFile(chosen);
    setFileError(problem);
    setFile(problem === null ? chosen : null);
  }

  function handleSheet(name: string): void {
    setSheet(name);
    setHeaderRow(undefined);
    setMapping(null);
  }

  function handleHeaderRow(row: number): void {
    setHeaderRow(row);
    setMapping(null);
  }

  function handleField(key: FieldKey, source: FieldSource | null): void {
    if (shown === undefined) return;
    setMapping(withSource(shown, key, source));
  }

  function handleReset(): void {
    setHeaderRow(undefined);
    setMapping(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!ready || file === null || preview === undefined || shown === undefined) return;
    importBom.mutate(
      { file, sheet: preview.sheet, mapping: pruneIncomplete(shown), saveMapping: remember },
      {
        // Clear the picker so choosing the same file again re-triggers onChange.
        onSuccess: (): void => {
          setFile(null);
          setSheet(undefined);
          setHeaderRow(undefined);
          setMapping(null);
          if (inputRef.current) inputRef.current.value = '';
        },
      },
    );
  }

  const errorMessage: string | null = fileError ?? (importBom.isError ? describeError(importBom.error) : null);
  const previewError: string | null = query.isError && !preview ? describeError(query.error) : null;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Import a BOM</h1>
        <p className="mt-1 text-sm text-muted">
          Upload an Excel BOM ({ACCEPTED_EXTENSIONS.join(' or ')}, up to 10 MB). You will see how its columns map to part fields
          before anything is stored. Parts already stored for the same project and PCB are skipped, so importing a file twice is safe.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div className="space-y-3 rounded-xl border border-border bg-surface p-5 shadow-card">
          <label htmlFor={inputId} className="block text-sm font-medium">
            BOM file
          </label>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={ACCEPTED_EXTENSIONS.join(',')}
            onChange={handleFile}
            disabled={importBom.isPending}
            aria-invalid={fileError ? true : undefined}
            className="block w-full cursor-pointer rounded-lg border border-dashed border-border-strong bg-surface-2 p-3 text-sm file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-accent-fg"
          />
          {file && (
            <p className="flex items-center gap-2 text-sm text-muted">
              <FileSpreadsheet className="size-4" aria-hidden="true" />
              {file.name} · {formatSize(file.size)}
            </p>
          )}
        </div>

        {file !== null && previewError === null && preview === undefined && <Skeleton className="h-64" />}

        {preview !== undefined && shown !== undefined && (
          <MappingStep
            preview={preview}
            mapping={shown}
            updating={updating}
            headerRow={headerRow ?? preview.mapping.header_row}
            onHeaderRowChange={handleHeaderRow}
            onSheetChange={handleSheet}
            onFieldChange={handleField}
            onReset={handleReset}
          />
        )}

        {(errorMessage ?? previewError) && (
          <p role="alert" className="flex items-start gap-2 text-sm text-danger">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {errorMessage ?? previewError}
          </p>
        )}

        {preview !== undefined && (
          <div className="flex flex-wrap items-center gap-4">
            <Button type="submit" variant="primary" loading={importBom.isPending} disabled={!ready}>
              {!importBom.isPending && <Upload className="size-4" aria-hidden="true" />}
              {importBom.isPending ? 'Importing…' : 'Import'}
            </Button>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={remember}
                onChange={(event: ChangeEvent<HTMLInputElement>): void => setRemember(event.target.checked)}
              />
              Remember this layout for the whole team
            </label>
          </div>
        )}
      </form>

      {importBom.data && <ResultView result={importBom.data} />}
    </div>
  );
}
