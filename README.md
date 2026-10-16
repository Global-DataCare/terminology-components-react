# terminology-components-react

Accessible React and Next.js terminology components backed by a local index.

Copyright 2026 Connecting Solution & Applications Ltd. (ConnectHealth.info).

`TerminologyAutocomplete` receives a high-level search facade. It does not
receive URLs, credentials, terminology sources or flat-claim construction
logic. The facade may use a verified local index or an authenticated portal
BFF; remote facades set `searchDelayMs` to debounce requests.

```tsx
'use client';

import { TerminologyAutocomplete } from 'terminology-components-react/autocomplete';

<TerminologyAutocomplete
  terminology={terminologyClient}
  snapshotId={snapshotId}
  claim="Condition.code"
  language="es"
  label="Diagnóstico"
  placeholder="Escribe gripe, fiebre…"
  searchDelayMs={300}
  onSelect={({ system, code, value, versionId }) => {
    setSelectedCoding({ system, code, display: value, version: versionId });
  }}
/>
```

The application may synchronize a catalog once through the browser SDK or
search through its authenticated BFF. The component uses `useDeferredValue`,
cancels stale asynchronous results and exposes accessible loading/error state.
The selected result retains
the terminology entry, system, code, version, source and language so the
resource editor can map it through its existing JSON Schema/flat-claim layer.

The component is intentionally unstyled and exposes class names for React,
Next.js or a design-system wrapper. React Native/Expo, Vue and Angular adapters
can reuse the same framework-neutral SDK contract without copying this DOM UI.

## Explicit BFF search (V2)

`TerminologyCodePickerV2` is the opt-in field used by shared portal V2 editors.
Typing never calls the service: search starts only when the user presses the
button. The portal supplies small `search` and `loadSources` adapters that call
its authenticated BFF; the component never receives a service URL, API key or
OIDC token.

```tsx
import { TerminologyCodePickerV2 } from 'terminology-components-react/code-picker-v2';

<TerminologyCodePickerV2
  resourceType="Condition"
  param="Condition.code"
  language="es"
  label="Diagnóstico"
  text={coding.text}
  code={coding.code}
  display={coding.display}
  copy={copy}
  search={input => portalBff.searchCodeCandidates(input)}
  loadSources={input => portalBff.loadCodingSystems(input)}
  onChange={setCoding}
/>
```

Existing `TerminologyAutocomplete` consumers remain unchanged. Shared portal
V2 components compose the picker through an adapter while retaining their
existing public props and CSS classes.
