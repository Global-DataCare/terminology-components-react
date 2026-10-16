'use client';

import {
  useDeferredValue,
  useEffect,
  useId,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react';
import type { TerminologyMatch, TerminologySearchInput } from 'terminology-sdk-core-ts';

export type TerminologySearchFacade = Readonly<{
  search(
    snapshotId: string,
    input: TerminologySearchInput,
  ): readonly TerminologyMatch[] | Promise<readonly TerminologyMatch[]>;
}>;

export type TerminologyAutocompleteProps = Readonly<{
  terminology: TerminologySearchFacade;
  snapshotId: string;
  claim: string;
  language: string;
  label: string;
  onSelect(value: TerminologyMatch): void;
  onInputChange?(value: string): void;
  initialText?: string;
  placeholder?: string;
  minQueryLength?: number;
  limit?: number;
  /** Optional debounce for a BFF-backed facade. Local indexes normally use zero. */
  searchDelayMs?: number;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  inputClassName?: string;
  listClassName?: string;
  loadingLabel?: string;
  errorLabel?: string;
  onSearchError?(error: unknown): void;
}>;

/** Accessible autocomplete; catalog synchronization and authenticated BFF access remain outside the component. */
export function TerminologyAutocomplete(props: TerminologyAutocompleteProps) {
  const [query, setQuery] = useState(props.initialText ?? '');
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [results, setResults] = useState<readonly TerminologyMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const deferredQuery = useDeferredValue(query);
  const inputId = useId();
  const listId = `${inputId}-listbox`;
  const minQueryLength = props.minQueryLength ?? 2;
  useEffect(() => {
    let current = true;
    if (deferredQuery.trim().length < minQueryLength) {
      setResults([]);
      setLoading(false);
      setFailed(false);
      return () => { current = false; };
    }
    setLoading(true);
    setFailed(false);
    setResults([]);
    const timer = window.setTimeout(() => void Promise.resolve(props.terminology.search(props.snapshotId, {
        claim: props.claim,
        language: props.language,
        text: deferredQuery,
        limit: props.limit ?? 20,
      }))
      .then((matches) => {
        if (current) setResults(matches);
      })
      .catch((error: unknown) => {
        if (!current) return;
        setFailed(true);
        props.onSearchError?.(error);
      })
      .finally(() => {
        if (current) setLoading(false);
      }), props.searchDelayMs ?? 0);
    return () => {
      current = false;
      window.clearTimeout(timer);
    };
  }, [
    deferredQuery,
    minQueryLength,
    props.claim,
    props.language,
    props.limit,
    props.searchDelayMs,
    props.snapshotId,
    props.terminology,
  ]);
  const open = focused && results.length > 0;
  const boundedActiveIndex = results.length ? Math.min(activeIndex, results.length - 1) : 0;

  const select = (match: TerminologyMatch) => {
    setQuery(match.value);
    setFocused(false);
    props.onSelect(match);
  };

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    setQuery(event.currentTarget.value);
    props.onInputChange?.(event.currentTarget.value);
    setActiveIndex(0);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const match = results[boundedActiveIndex];
      if (match) select(match);
    } else if (event.key === 'Escape') {
      setFocused(false);
    }
  };

  return (
    <div className={props.className}>
      <label htmlFor={inputId}>{props.label}</label>
      <input
        id={inputId}
        className={props.inputClassName}
        role="combobox"
        type="text"
        value={query}
        placeholder={props.placeholder}
        disabled={props.disabled}
        required={props.required}
        autoComplete="off"
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={open}
        aria-activedescendant={open ? `${listId}-${boundedActiveIndex}` : undefined}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={onKeyDown}
      />
      {loading ? <span role="status">{props.loadingLabel ?? 'Searching terminology...'}</span> : null}
      {failed ? <span role="alert">{props.errorLabel ?? 'Terminology search is unavailable.'}</span> : null}
      {open ? (
        <ul id={listId} className={props.listClassName} role="listbox">
          {results.map((match, index) => (
            <li
              id={`${listId}-${index}`}
              key={`${match.entryId}|${match.language}|${match.code}`}
              role="option"
              aria-selected={index === boundedActiveIndex}
              onMouseDown={(event) => {
                event.preventDefault();
                select(match);
              }}
            >
              <span>{match.value}</span>
              <span aria-hidden="true"> — {match.code}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
