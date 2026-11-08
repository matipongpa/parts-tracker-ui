import { useState } from 'react';
import { AlertCircle, Loader2, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { TextArea } from '@/components/ui/TextArea';
import { AnswerView } from '@/features/assistant/AnswerView';
import { MAX_QUESTION_LENGTH } from '@/features/assistant/types';
import { useAskAssistant } from '@/features/assistant/useAssistantHistory';
import { ApiError } from '@/lib/api/errors';
import type { HistoryEntry } from '@/features/assistant/types';
import type { UseMutationResult } from '@tanstack/react-query';
import type { FormEvent, KeyboardEvent, ReactElement } from 'react';

const EXAMPLES: ReadonlyArray<string> = [
  'Which projects use part GRM188?',
  'List the 0402 capacitors',
  'How does LM358 differ between projects?',
];

const NUMBER_FORMAT: Intl.NumberFormat = new Intl.NumberFormat();

/** The backend counts Unicode code points, not UTF-16 units, so emoji and CJK count once. */
function countCharacters(text: string): number {
  return Array.from(text).length;
}

function validate(question: string): string | null {
  const length: number = countCharacters(question.trim());
  if (length === 0) return 'Type a question first.';
  if (length > MAX_QUESTION_LENGTH) return `Keep it under ${MAX_QUESTION_LENGTH} characters.`;
  return null;
}

function describeError(error: Error): string {
  if (error instanceof ApiError) {
    // The route only exists when the server has an AI key configured.
    if (error.status === 404) return 'The AI assistant is not enabled on this server.';
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}

interface AskFormProps {
  /** Called with the id of the saved entry, so the panel can show it from the saved copy. */
  onSaved: (id: string) => void;
}

export function AskForm({ onSaved }: AskFormProps): ReactElement {
  const [question, setQuestion] = useState<string>('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const ask: UseMutationResult<HistoryEntry, Error, string> = useAskAssistant();

  function submit(): void {
    if (ask.isPending) return;
    const problem: string | null = validate(question);
    setFieldError(problem);
    if (problem !== null) return;
    ask.mutate(question.trim(), {
      // A saved answer is shown from the saved copy. An unsaved one stays in this form.
      onSuccess: (entry: HistoryEntry): void => {
        if (entry.id === '') return;
        setQuestion('');
        onSaved(entry.id);
      },
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      submit();
    }
  }

  const used: number = countCharacters(question);

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">
        Ask about your parts in plain language. The answer is based on a live lookup of your catalogue, and the matching
        parts are listed beneath it.
      </p>

      <form
        onSubmit={(event: FormEvent<HTMLFormElement>): void => {
          event.preventDefault();
          submit();
        }}
        noValidate
        className="space-y-3"
      >
        <TextArea
          label="Your question"
          placeholder="e.g. Which projects use part GRM188?"
          value={question}
          onChange={(event): void => setQuestion(event.target.value)}
          onKeyDown={handleKeyDown}
          error={fieldError ?? undefined}
          hint={`${NUMBER_FORMAT.format(used)} / ${NUMBER_FORMAT.format(MAX_QUESTION_LENGTH)}`}
        />
        <div className="flex flex-wrap items-center gap-2">
          {EXAMPLES.map((example: string): ReactElement => (
            <button
              key={example}
              type="button"
              onClick={(): void => {
                setQuestion(example);
                setFieldError(null);
              }}
              className="rounded-full border border-border bg-surface px-3 py-1 text-left text-xs text-muted transition-colors hover:border-border-strong hover:text-fg"
            >
              {example}
            </button>
          ))}
        </div>
        <Button type="submit" variant="primary" loading={ask.isPending} className="w-full">
          <Sparkles className="size-4" aria-hidden="true" />
          {ask.isPending ? 'Looking it up…' : 'Ask'}
        </Button>
      </form>

      {ask.isPending && (
        <p role="status" className="flex items-center gap-2 text-sm text-muted">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Searching your parts. This can take up to a minute.
        </p>
      )}

      {ask.isError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-danger/30 bg-danger-soft p-3 text-sm text-danger"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {describeError(ask.error)}
        </div>
      )}

      {ask.isSuccess && ask.data.id === '' && <AnswerView entry={ask.data} />}
    </div>
  );
}
