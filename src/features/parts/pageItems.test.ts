import { describe, expect, it } from 'vitest';

import { getPageItems } from '@/features/parts/pageItems';
import type { PageItem } from '@/features/parts/pageItems';

describe('getPageItems', (): void => {
  it('shows every page when there are few', (): void => {
    expect(getPageItems(0, 5)).toEqual([0, 1, 2, 3, 4]);
    expect(getPageItems(3, 7)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('collapses the middle with gaps', (): void => {
    const items: PageItem[] = getPageItems(10, 30);
    expect(items).toEqual([0, 'gap', 9, 10, 11, 'gap', 29]);
  });

  it('has no leading gap near the start and no trailing gap near the end', (): void => {
    expect(getPageItems(0, 30)).toEqual([0, 1, 'gap', 29]);
    expect(getPageItems(29, 30)).toEqual([0, 'gap', 28, 29]);
  });

  it('does not insert a gap for a single hidden page', (): void => {
    expect(getPageItems(2, 20)).toEqual([0, 1, 2, 3, 'gap', 19]);
  });
});
