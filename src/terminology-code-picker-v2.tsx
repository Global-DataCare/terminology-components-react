'use client';

import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';

export type TerminologyCodeCandidateV2 = Readonly<{
  source?: string;
  system: string;
  code: string;
  text: string;
  display: string;
  language?: string;
  terminologyVersion?: string;
  fallbackUsed?: boolean;
}>;

export type TerminologyCodeSearchInputV2 = Readonly<{
  resourceType: string;
  param: string;
  language: string;
  text: string;
  taxonomyId?: string;
  limit: number;
  sources?: readonly string[];
}>;

export type TerminologyCodeSourceV2 = Readonly<{ id: string; label?: string; default?: boolean }>;

export type TerminologyCodePickerV2Props = Readonly<{
  resourceType: string;
  param: string;
  language: string;
  taxonomyId?: string;
  label: string;
  text: string;
  code: string;
  display: string;
  required?: boolean;
  copy: Readonly<{ search: string; loading: string; unavailable: string; empty?: string; sources: string; select: string; clear: string; canonicalCode: string; canonicalDisplay: string }>;
  search?: (input: TerminologyCodeSearchInputV2) => Promise<readonly TerminologyCodeCandidateV2[]>;
  loadSources?: (input: Readonly<{ resourceType: string; param: string; language: string; taxonomyId?: string }>) => Promise<readonly TerminologyCodeSourceV2[]>;
  onChange: (value: Readonly<{ text: string; code: string; display: string }>) => void;
  headingAction?: ReactNode;
  classNames?: Readonly<{ root?: string; heading?: string; query?: string; searchButton?: string; clearButton?: string; sources?: string; selected?: string }>;
}>;

/** Explicit BFF-backed V2 picker. It owns presentation state, never credentials or authorization. */
export function TerminologyCodePickerV2(props: TerminologyCodePickerV2Props) {
  const [query, setQuery] = useState(props.text || props.display);
  const [sources, setSources] = useState<readonly TerminologyCodeSourceV2[]>([]);
  const [selectedSources, setSelectedSources] = useState<readonly string[]>([]);
  const [candidates, setCandidates] = useState<readonly TerminologyCodeCandidateV2[]>([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputId = useId();

  useEffect(() => {
    if (!props.loadSources) return;
    let current = true;
    void props.loadSources(sourceInput(props)).then(next => {
      if (!current) return;
      setSources(next);
      setSelectedSources(defaultSources(next));
    }).catch(() => current && setSources([]));
    return () => { current = false; };
  }, [props.loadSources, props.resourceType, props.param, props.language, props.taxonomyId]);

  const selectedToken = useMemo(() => props.code, [props.code]);
  const search = async () => {
    if (!props.search || query.trim().length < 2 || busy) return;
    setBusy(true); setFailed(false); setSearched(false);
    try {
      let governedSources = selectedSources;
      if (!governedSources.length && props.loadSources) {
        const loaded = await props.loadSources(sourceInput(props));
        governedSources = defaultSources(loaded);
        setSources(loaded); setSelectedSources(governedSources);
      }
      setCandidates(await props.search({
        resourceType: props.resourceType, param: props.param, language: props.language,
        text: query.trim(), limit: 20,
        ...(props.taxonomyId ? { taxonomyId: props.taxonomyId } : {}),
        ...(governedSources.length ? { sources: governedSources } : {}),
      }));
      setSearched(true);
    } catch {
      setCandidates([]); setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return <div className={props.classNames?.root} data-terminology-code-picker-v2>
    <span className={props.classNames?.heading}><label htmlFor={inputId}>{props.label}{props.required ? ' *' : ''}</label>{props.headingAction}</span>
    <div className={props.classNames?.query}>
      <input id={inputId} aria-label={props.label} required={props.required} readOnly={Boolean(props.code)} value={props.code ? (props.text || query || props.display) : query} onChange={event => { const value = event.currentTarget.value; setQuery(value); setCandidates([]); setSearched(false); setFailed(false); props.onChange({ text: value, code: '', display: '' }); }}/>
      <button type="button" className={props.classNames?.searchButton} aria-label={props.copy.search} title={props.copy.search} disabled={Boolean(props.code) || busy || query.trim().length < 2} onClick={() => void search()}><svg aria-hidden="true" viewBox="0 0 24 24"><path d="m21 21-4.35-4.35m1.35-5.65a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"/></svg></button>
      {props.code ? <button type="button" className={props.classNames?.clearButton} aria-label={props.copy.clear} title={props.copy.clear} onClick={() => { setQuery(''); setCandidates([]); props.onChange({ text: '', code: '', display: '' }); }}>×</button> : null}
    </div>
    {sources.length ? <fieldset className={props.classNames?.sources}><legend>{props.copy.sources}</legend>{sources.map(source => <label key={source.id}><input type="checkbox" checked={selectedSources.includes(source.id)} onChange={event => { const checked = event.currentTarget.checked; setSelectedSources(current => checked ? [...new Set([...current, source.id])] : current.filter(value => value !== source.id)); setCandidates([]); setSearched(false); setFailed(false); }}/>{source.label || source.id}</label>)}</fieldset> : null}
    {busy ? <small role="status">{props.copy.loading}</small> : null}
    {failed ? <small role="alert">{props.copy.unavailable}</small> : null}
    {searched && !busy && !failed && candidates.length === 0 ? <small role="status">{props.copy.empty || props.copy.unavailable}</small> : null}
    {candidates.length ? <label>{props.copy.select}<select aria-label={props.copy.select} value={selectedToken} onChange={event => { const candidate = candidates.find(value => `${value.system}|${value.code}` === event.currentTarget.value); if (!candidate) return; const localText = candidate.text || query || candidate.display; setQuery(localText); props.onChange({ text: localText, code: `${candidate.system}|${candidate.code}`, display: candidate.display }); setCandidates([]); }}><option value=""></option>{candidates.map(candidate => <option key={`${candidate.system}|${candidate.code}`} value={`${candidate.system}|${candidate.code}`}>{candidate.text && candidate.text !== candidate.display ? `${candidate.text} — ${candidate.display}` : candidate.display} ({candidate.code})</option>)}</select></label> : null}
    {props.code ? <div className={props.classNames?.selected}><label>{props.copy.canonicalCode}<input aria-label={props.copy.canonicalCode} readOnly value={props.code}/></label><label>{props.copy.canonicalDisplay}<input aria-label={props.copy.canonicalDisplay} readOnly value={props.display}/></label></div> : null}
  </div>;
}

function sourceInput(props: TerminologyCodePickerV2Props) {
  return { resourceType: props.resourceType, param: props.param, language: props.language, ...(props.taxonomyId ? { taxonomyId: props.taxonomyId } : {}) };
}

function defaultSources(sources: readonly TerminologyCodeSourceV2[]): readonly string[] {
  const defaults = sources.filter(source => source.default).map(source => source.id);
  return defaults.length ? defaults : sources[0] ? [sources[0].id] : [];
}
