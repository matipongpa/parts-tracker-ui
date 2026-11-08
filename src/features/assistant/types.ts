import type { Part } from '@/features/parts/types';

/** The backend rejects questions outside 1-1000 characters (counted as Unicode code points). */
export const MAX_QUESTION_LENGTH: number = 1000;

export interface AskResult {
  /** The model's summary. Plain text: render it as text, never as HTML. */
  answer: string;
  /** Rows the lookup tools returned, taken from the database rather than from the model's words. */
  parts: Part[];
  /** True when more rows matched than the backend returns (it caps at 200). */
  partsTruncated: boolean;
  toolsUsed: string[];
}

/**
 * One question and its answer as saved on the server: the exact text and the parts as they were at
 * that moment. `id` is empty when the answer came back but could not be saved to history.
 */
export interface HistoryEntry extends AskResult {
  id: string;
  question: string;
  /** ISO timestamp. */
  createdAt: string;
}

/** A row in the history list; open it for the full answer. */
export interface HistoryItem {
  id: string;
  question: string;
  createdAt: string;
}
