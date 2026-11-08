import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ImportPage } from '@/features/import/ImportPage';
import { installApiMock, jsonResponse } from '@/test/apiMock';
import { completePreview, incompletePreview } from '@/test/bomFixtures';
import type { ApiMock, RecordedCall } from '@/test/apiMock';
import type { UserEvent } from '@testing-library/user-event';

interface Rendered {
  user: UserEvent;
  client: QueryClient;
}

function renderPage(applyAccept: boolean = true): Rendered {
  const user: UserEvent = userEvent.setup({ applyAccept });
  const client: QueryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ImportPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { user, client };
}

function pick(user: UserEvent, name: string = 'bom.xlsx'): Promise<void> {
  return user.upload(screen.getByLabelText('BOM file'), new File([new Uint8Array(2048)], name));
}

function formsOf(calls: RecordedCall[]): FormData[] {
  return calls.map((call: RecordedCall): FormData => call.init?.body as FormData);
}

function field(name: string): HTMLElement {
  return screen.getByRole('combobox', { name: new RegExp(`^${name}`) });
}

describe('ImportPage', (): void => {
  let api: ApiMock;

  beforeEach((): void => {
    api = installApiMock();
  });

  afterEach((): void => {
    api.restore();
  });

  it('refuses a file that is not a workbook without calling the API', async (): Promise<void> => {
    const { user } = renderPage(false);
    await pick(user, 'bom.csv');

    expect(screen.getByRole('alert')).toHaveTextContent('Choose an Excel workbook');
    expect(api.callsTo('/bom/preview')).toHaveLength(0);
  });

  it('previews the file and shows how each column was matched, before anything is stored', async (): Promise<void> => {
    api.on('POST', '/bom/preview', (): Response => jsonResponse(completePreview()));
    const { user } = renderPage();
    await pick(user);

    expect(await screen.findByRole('region', { name: 'Field mapping' })).toBeInTheDocument();
    const table: HTMLElement = screen.getByRole('table');
    expect(within(table).getByText('Manufacturer part no.', { selector: 'td' })).toBeInTheDocument();
    expect(field('Part number')).toHaveDisplayValue('Column B — Manufacturer part no.');
    expect(field('Project name')).toHaveDisplayValue('One cell for every row…');
    expect(screen.getByLabelText('Project name cell')).toHaveValue('B1');
    expect(screen.getByText('2 of 2 rows are ready to import', { exact: false })).toBeInTheDocument();
    expect(api.callsTo('/bom/import')).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Import' })).toBeEnabled();
  });

  it('will not import while a required field is unmapped, and says which', async (): Promise<void> => {
    api.on('POST', '/bom/preview', (): Response => jsonResponse(incompletePreview()));
    const { user } = renderPage();
    await pick(user);

    expect(await screen.findByText('Still needed: Value, Fit / not fit.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import' })).toBeDisabled();
  });

  it('re-checks the layout with the user\'s edit and then allows the import', async (): Promise<void> => {
    api.on('POST', '/bom/preview', (init: RequestInit | undefined): Response => {
      const mapping: FormDataEntryValue | null = (init?.body as FormData).get('mapping');
      return mapping === null ? jsonResponse(incompletePreview()) : jsonResponse(completePreview({ mapping_source: 'given' }));
    });
    const { user } = renderPage();
    await pick(user);
    await screen.findByText('Still needed: Value, Fit / not fit.');

    await user.selectOptions(field('Value'), 'column:2');
    await user.selectOptions(field('Fit'), 'column:3');

    await waitFor((): void => {
      expect(screen.getByRole('button', { name: 'Import' })).toBeEnabled();
    }, { timeout: 3000 });
    const sent: FormData | undefined = formsOf(api.callsTo('/bom/preview')).at(-1);
    const mapping: { fields: Record<string, { kind: string; column: number }> } = JSON.parse(String(sent?.get('mapping')));
    expect(mapping.fields.value).toMatchObject({ kind: 'column', column: 2 });
    expect(mapping.fields.fit).toMatchObject({ kind: 'column', column: 3 });
  });

  it('keeps the cursor in a typed value while the layout is re-checked', async (): Promise<void> => {
    api.on('POST', '/bom/preview', (init: RequestInit | undefined): Response => {
      const mapping: FormDataEntryValue | null = (init?.body as FormData).get('mapping');
      return mapping === null ? jsonResponse(incompletePreview()) : jsonResponse(completePreview({ mapping_source: 'given' }));
    });
    const { user } = renderPage();
    await pick(user);
    await screen.findByText('Still needed: Value, Fit / not fit.');

    await user.selectOptions(field('Fit'), 'text');
    const box: HTMLElement = screen.getByLabelText('Fit / not fit value');
    await user.type(box, 'FI');
    // Wait for the re-check triggered by that edit to come back...
    await waitFor((): void => {
      expect(formsOf(api.callsTo('/bom/preview')).length).toBeGreaterThan(1);
      expect(screen.queryByText('Checking…')).not.toBeInTheDocument();
    }, { timeout: 3000 });
    // ...and the same box must still be there, focused, so typing can go on.
    expect(screen.getByLabelText('Fit / not fit value')).toBe(box);
    await user.type(box, 'T');
    expect(box).toHaveValue('FIT');
  });

  it('imports with the confirmed mapping, remembers it, shows the counts and refreshes the parts list', async (): Promise<void> => {
    api.on('POST', '/bom/preview', (): Response => jsonResponse(completePreview()));
    api.on('POST', '/bom/import', (): Response =>
      jsonResponse({ total: 120, inserted: 100, skipped: 5, duplicates: 15, mapping_saved: true }),
    );
    const { user, client } = renderPage();
    const invalidate: ReturnType<typeof vi.spyOn> = vi.spyOn(client, 'invalidateQueries');
    await pick(user);
    await screen.findByRole('region', { name: 'Field mapping' });

    await user.click(screen.getByRole('button', { name: 'Import' }));

    const result: HTMLElement = await screen.findByRole('region', { name: 'Import result' });
    expect(result).toHaveTextContent('Added 100 parts.');
    expect(result).toHaveTextContent('15');
    expect(result).toHaveTextContent('layout is saved');
    expect(screen.getByRole('link', { name: 'View parts' })).toHaveAttribute('href', '/parts');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['parts'] });

    const form: FormData = formsOf(api.callsTo('/bom/import'))[0] as FormData;
    expect(form.get('save_mapping')).toBe('true');
    expect(form.get('sheet')).toBe('Sheet1');
    expect(JSON.parse(String(form.get('mapping'))).header_row).toBe(2);
    // The old preview is gone: nothing is left to import.
    expect(screen.queryByRole('region', { name: 'Field mapping' })).not.toBeInTheDocument();
  });

  it('does not save the layout when the box is cleared', async (): Promise<void> => {
    api.on('POST', '/bom/preview', (): Response => jsonResponse(completePreview()));
    api.on('POST', '/bom/import', (): Response => jsonResponse({ total: 2, inserted: 2, skipped: 0, duplicates: 0, mapping_saved: false }));
    const { user } = renderPage();
    await pick(user);
    await screen.findByRole('region', { name: 'Field mapping' });

    await user.click(screen.getByRole('checkbox', { name: /Remember this layout/ }));
    await user.click(screen.getByRole('button', { name: 'Import' }));

    await screen.findByRole('region', { name: 'Import result' });
    expect(formsOf(api.callsTo('/bom/import'))[0]?.get('save_mapping')).toBe('false');
    expect(screen.queryByText(/layout is saved/)).not.toBeInTheDocument();
  });

  it('says so when nothing new was added, without offering to view parts or refreshing the list', async (): Promise<void> => {
    api.on('POST', '/bom/preview', (): Response => jsonResponse(completePreview()));
    api.on('POST', '/bom/import', (): Response => jsonResponse({ total: 4, inserted: 0, skipped: 0, duplicates: 4, mapping_saved: false }));
    const { user, client } = renderPage();
    const invalidate: ReturnType<typeof vi.spyOn> = vi.spyOn(client, 'invalidateQueries');
    await pick(user);
    await screen.findByRole('region', { name: 'Field mapping' });
    await user.click(screen.getByRole('button', { name: 'Import' }));

    expect(await screen.findByText('No new parts were added.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'View parts' })).not.toBeInTheDocument();
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ['parts'] });
  });

  it('tells the user when the layout came from the team\'s saved mapping', async (): Promise<void> => {
    api.on('POST', '/bom/preview', (): Response => jsonResponse(completePreview({ mapping_source: 'saved', confidence: { designator: 'saved' } })));
    const { user } = renderPage();
    await pick(user);

    expect(await screen.findByText(/same columns as one your team confirmed before/)).toBeInTheDocument();
    expect(screen.getAllByText('Saved layout').length).toBeGreaterThan(0);
  });

  it('asks the server again when another row is chosen as the header', async (): Promise<void> => {
    api.on('POST', '/bom/preview', (): Response => jsonResponse(completePreview()));
    const { user } = renderPage();
    await pick(user);
    await screen.findByRole('region', { name: 'Field mapping' });

    await user.click(screen.getByRole('button', { name: 'Use row 1 as the header' }));

    await waitFor((): void => {
      expect(formsOf(api.callsTo('/bom/preview')).at(-1)?.get('header_row')).toBe('0');
    }, { timeout: 3000 });
  });

  it('lets the user pick another sheet when the workbook has several', async (): Promise<void> => {
    api.on('POST', '/bom/preview', (): Response => jsonResponse(completePreview({ sheets: ['Notes', 'Sheet1'] })));
    const { user } = renderPage();
    await pick(user);
    await screen.findByRole('region', { name: 'Field mapping' });

    await user.selectOptions(screen.getByLabelText('Sheet'), 'Notes');

    await waitFor((): void => {
      expect(formsOf(api.callsTo('/bom/preview')).at(-1)?.get('sheet')).toBe('Notes');
    }, { timeout: 3000 });
  });

  it('explains an unreadable workbook (422) and offers no import', async (): Promise<void> => {
    api.on('POST', '/bom/preview', (): Response => jsonResponse({ error: 'File is not a valid BOM workbook' }, 422));
    const { user } = renderPage();
    await pick(user);

    expect(await screen.findByRole('alert')).toHaveTextContent('not a readable Excel workbook');
    expect(screen.queryByRole('button', { name: 'Import' })).not.toBeInTheDocument();
  });

  it('shows the server\'s reason when the import is refused', async (): Promise<void> => {
    api.on('POST', '/bom/preview', (): Response => jsonResponse(completePreview()));
    api.on('POST', '/bom/import', (): Response => jsonResponse({ error: 'invalid mapping: missing value' }, 422));
    const { user } = renderPage();
    await pick(user);
    await screen.findByRole('region', { name: 'Field mapping' });
    await user.click(screen.getByRole('button', { name: 'Import' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('invalid mapping: missing value');
  });

  it('explains a file the proxy rejected as too large (413)', async (): Promise<void> => {
    api.on('POST', '/bom/preview', (): Response => new Response('<html>Request Entity Too Large</html>', { status: 413 }));
    const { user } = renderPage();
    await pick(user);

    expect(await screen.findByRole('alert')).toHaveTextContent('too large');
  });
});
