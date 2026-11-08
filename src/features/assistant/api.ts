import { toPart } from '@/features/parts/api';
import { request } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { isRecord } from '@/lib/api/guards';
import type { HistoryEntry, HistoryItem } from '@/features/assistant/types';
import type { Part } from '@/features/parts/types';

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function unexpected(): ApiError {
  return new ApiError(502, 'Unexpected response from the server.');
}

/** Narrows the payload; Go serializes an empty slice as `null`, which becomes `[]`. */
function toEntry(payload: unknown): HistoryEntry {
  if (!isRecord(payload) || typeof payload.answer !== 'string') throw unexpected();
  const rawParts: unknown[] = Array.isArray(payload.parts) ? (payload.parts as unknown[]) : [];
  const rawTools: unknown[] = Array.isArray(payload.tools_used) ? (payload.tools_used as unknown[]) : [];
  return {
    id: isString(payload.id) ? payload.id : '',
    question: isString(payload.question) ? payload.question : '',
    answer: payload.answer,
    parts: rawParts.map(toPart).filter((part: Part | null): part is Part => part !== null),
    partsTruncated: payload.parts_truncated === true,
    toolsUsed: rawTools.filter(isString),
    createdAt: isString(payload.created_at) ? payload.created_at : '',
  };
}

function toItem(value: unknown): HistoryItem | null {
  if (!isRecord(value) || !isString(value.id) || !isString(value.question)) return null;
  return { id: value.id, question: value.question, createdAt: isString(value.created_at) ? value.created_at : '' };
}

/** Asks a question. The server saves the answer to the caller's history and returns it as an entry. */
export async function askAssistant(question: string, signal?: AbortSignal): Promise<HistoryEntry> {
  const payload: unknown = await request('/ask', { method: 'POST', body: { question }, signal });
  return toEntry(payload);
}

/** The caller's saved questions, newest first. */
export async function fetchHistory(signal?: AbortSignal): Promise<HistoryItem[]> {
  const payload: unknown = await request('/ask/history', { signal });
  if (!isRecord(payload)) throw unexpected();
  const rawList: unknown[] = Array.isArray(payload.list) ? (payload.list as unknown[]) : [];
  return rawList.map(toItem).filter((item: HistoryItem | null): item is HistoryItem => item !== null);
}

/** One saved conversation, exactly as it was. Nothing is sent to the model. */
export async function fetchHistoryEntry(id: string, signal?: AbortSignal): Promise<HistoryEntry> {
  const payload: unknown = await request(`/ask/history/${encodeURIComponent(id)}`, { signal });
  return toEntry(payload);
}

export async function deleteHistoryEntry(id: string): Promise<void> {
  await request(`/ask/history/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
