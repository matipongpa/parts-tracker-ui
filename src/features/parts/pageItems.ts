export type PageItem = number | 'gap';

/**
 * Page buttons to render for a zero-based `current` page: always the first and
 * last page, the current page with one neighbour each side, and gaps between.
 */
export function getPageItems(current: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_: unknown, index: number): number => index);

  const wanted: Set<number> = new Set<number>([0, totalPages - 1, current - 1, current, current + 1]);
  const pages: number[] = [...wanted]
    .filter((page: number): boolean => page >= 0 && page < totalPages)
    .sort((a: number, b: number): number => a - b);

  const items: PageItem[] = [];
  pages.forEach((page: number, index: number): void => {
    const previous: number | undefined = pages[index - 1];
    if (previous !== undefined && page - previous > 1) items.push('gap');
    items.push(page);
  });
  return items;
}
