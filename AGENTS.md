# terminology-components-react

- Use red-green-refactor TDD and begin every test with the flow-contract comment.
- Components accept high-level local search facades; never accept tokens, internal routes or upstream credentials.
- Never fetch on keystrokes. Catalog synchronization belongs to the application/BFF SDK boundary.
- Keep components accessible, unstyled by default and usable from React and Next.js.
- Use deferred local filtering and preserve the selected coding system, code, version and value.
