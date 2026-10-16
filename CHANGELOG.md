# Changelog

## 0.2.0 - 2026-10-15

- Add the opt-in `TerminologyCodePickerV2` for explicit BFF-backed searches.
- Use canonical `param` input and preserve localized `text` plus English
  `display` on the selected `system|code`.
- Keep URLs, credentials, authorization and service policy outside React.

## 0.1.1 - 2026-09-29

- Accept asynchronous terminology facades with stale-result cancellation,
  accessible progress/error feedback and an optional remote-search debounce.

## 0.1.0

- Add an accessible, keyboard-operable terminology combobox for React and Next.js.
- Filter the already loaded local index by canonical flat claim and language.
- Defer search rendering so typing remains responsive and never fetch per keystroke.
- Return the selected coding system, code, value, version, source and entry identity.
