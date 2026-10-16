// Flow contract: reuse shared test fixtures and canonical types; do not introduce duplicated literals.
import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { TerminologyAutocomplete } from '../dist/index.js';

const dom = new JSDOM('<body></body>');
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const React = await import('react');
const { act } = React;
const { createRoot } = await import('react-dom/client');

test('filters through the supplied local facade by flat claim and returns the selected coding', async (t) => {
  document.body.innerHTML = '<div id="root"></div>';
  const calls = [];
  const selected = [];
  const entered = [];
  const terminology = {
    search: (_snapshotId, input) => {
      calls.push(input);
      return input.text.includes('gripe') ? [{
        entryId: 'https://terminology.example/ValueSet/conditions',
        entryType: 'terminology-value-set', language: 'es',
        system: 'http://hl7.org/fhir/sid/icd-10', versionId: '2026', sources: ['ICD10'],
        code: 'J10', value: 'Gripe estacional',
      }] : [];
    },
  };
  const container = document.getElementById('root');
  const root = createRoot(container);
  t.after(() => act(() => root.unmount()));

  await act(async () => root.render(React.createElement(TerminologyAutocomplete, {
    terminology,
    snapshotId: 'health-care::ES::R4::2026-09',
    claim: 'Condition.code',
    language: 'es',
    label: 'Diagnóstico',
    onInputChange: (value) => entered.push(value),
    onSelect: (value) => selected.push(value),
  })));

  const input = container.querySelector('input[role="combobox"]');
  await act(async () => {
    input.focus();
    setNativeInputValue(input, 'gripe');
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  });

  assert.equal(calls.at(-1).claim, 'Condition.code');
  assert.equal(entered.at(-1), 'gripe');
  assert.equal(calls.at(-1).language, 'es');
  assert.equal(container.querySelector('[role="option"]').textContent.includes('Gripe estacional'), true);

  await act(async () => {
    container.querySelector('[role="option"]').dispatchEvent(new dom.window.MouseEvent('mousedown', { bubbles: true }));
  });
  assert.equal(selected[0].system, 'http://hl7.org/fhir/sid/icd-10');
  assert.equal(selected[0].code, 'J10');
  assert.equal(input.value, 'Gripe estacional');
});

test('does no search before the minimum text length and exposes accessible combobox state', async (t) => {
  document.body.innerHTML = '<div id="root"></div>';
  let calls = 0;
  const container = document.getElementById('root');
  const root = createRoot(container);
  t.after(() => act(() => root.unmount()));
  await act(async () => root.render(React.createElement(TerminologyAutocomplete, {
    terminology: { search: () => { calls += 1; return []; } },
    snapshotId: 'snapshot', claim: 'Observation.category', language: 'es',
    label: 'Categoría', minQueryLength: 2, onSelect: () => undefined,
  })));
  const input = container.querySelector('input');
  await act(async () => {
    input.focus();
    setNativeInputValue(input, 'r');
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  });
  assert.equal(calls, 0);
  assert.equal(input.getAttribute('aria-expanded'), 'false');
  assert.equal(input.getAttribute('aria-autocomplete'), 'list');
});

test('waits for an asynchronous governed search and exposes progress without showing stale results', async (t) => {
  document.body.innerHTML = '<div id="root"></div>';
  let resolveSearch;
  const terminology = {
    search: () => new Promise((resolve) => { resolveSearch = resolve; }),
  };
  const container = document.getElementById('root');
  const root = createRoot(container);
  t.after(() => act(() => root.unmount()));
  await act(async () => root.render(React.createElement(TerminologyAutocomplete, {
    terminology,
    snapshotId: 'remote-service', claim: 'Condition.code', language: 'es',
    label: 'Diagnostico', loadingLabel: 'Buscando codigos', onSelect: () => undefined,
  })));

  const input = container.querySelector('input');
  await act(async () => {
    input.focus();
    setNativeInputValue(input, 'ulcera corneal');
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  });
  assert.equal(container.querySelector('[role="status"]').textContent, 'Buscando codigos');
  assert.equal(container.querySelector('[role="option"]'), null);

  await act(async () => resolveSearch([{
    entryId: 'http://hl7.org/fhir/sid/icd-10', entryType: 'terminology-system',
    language: 'es', system: 'http://hl7.org/fhir/sid/icd-10', versionId: '2026',
    sources: ['ICD10'], code: 'H16.0', value: 'Ulcera corneal',
  }]));
  assert.equal(container.querySelector('[role="status"]'), null);
  assert.equal(container.querySelector('[role="option"]').textContent.includes('H16.0'), true);
});

function setNativeInputValue(input, value) {
  Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(input, value);
}
