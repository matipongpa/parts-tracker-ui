const FORMAT: Intl.DateTimeFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

/** Formats an ISO timestamp in the viewer's locale; an empty or unparseable value yields an empty string. */
export function formatAskedAt(iso: string): string {
  const date: Date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : FORMAT.format(date);
}
