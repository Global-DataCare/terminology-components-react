// Flow contract: a V2 portal field loads governed systems, searches only after an explicit button press, and returns text plus canonical system|code without owning BFF credentials.
import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { TerminologyCodePickerV2 } from '../dist/index.js';

const dom = new JSDOM('<body></body>');
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const React = await import('react');
const { act } = React;
const { createRoot } = await import('react-dom/client');

test('uses a parameter-governed BFF facade and selects a complete candidate', async (t) => {
  document.body.innerHTML = '<div id="root"></div>';
  const searches = [];
  const changes = [];
  const root = createRoot(document.getElementById('root'));
  t.after(() => act(() => root.unmount()));
  await act(async () => root.render(React.createElement(TerminologyCodePickerV2, {
    resourceType: 'Condition', param: 'Condition.code', language: 'es', label: 'Diagnóstico',
    text: '', code: '', display: '',
    copy: { search: 'Buscar código', loading: 'Buscando', unavailable: 'No disponible', empty: 'Sin resultados', sources: 'Sistemas', select: 'Seleccionar', clear: 'Limpiar', canonicalCode: 'Código', canonicalDisplay: 'Display' },
    loadSources: async () => [{ id: 'ICD10', label: 'ICD-10', default: true }],
    search: async (input) => {
      searches.push(input);
      return [{ system: 'http://hl7.org/fhir/sid/icd-10', code: 'H16.0', text: 'Úlcera corneal', display: 'Corneal ulcer', language: 'es' }];
    },
    onChange: value => changes.push(value),
  })));
  await act(async () => {});
  const input = document.querySelector('input[aria-label="Diagnóstico"]');
  await act(async () => {
    setNativeInputValue(input, 'úlcera');
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  });
  assert.equal(searches.length, 0);
  await act(async () => document.querySelector('button[aria-label="Buscar código"]').click());
  assert.deepEqual(searches[0], { resourceType: 'Condition', param: 'Condition.code', language: 'es', text: 'úlcera', limit: 20, sources: ['ICD10'] });
  await act(async () => {
    const select = document.querySelector('select[aria-label="Seleccionar"]');
    select.value = 'http://hl7.org/fhir/sid/icd-10|H16.0';
    select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  });
  assert.deepEqual(changes.at(-1), { text: 'Úlcera corneal', code: 'http://hl7.org/fhir/sid/icd-10|H16.0', display: 'Corneal ulcer' });
});

function setNativeInputValue(input, value) {
  Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(input, value);
}
