# HubCloud Compatibility Notes

## Why sandbox version failed in HubCloud
Observed in HubCloud:
- `Uncaught RangeError: Invalid string length` during `new Vue(...)`.
- In a later simplified build, raw `{{ ... }}` appeared in UI (Vue directives worked, moustache interpolation did not).

Most likely root causes (based on behavior and staged fixes):
1. HubCloud runtime uses an older/custom Vue + Bootstrap bundle with template-compiler limitations.
2. Advanced template features (`b-table` scoped slots, shorthand slot syntax, heavy inline template expressions) can break mount-time compilation.
3. `{{ ... }}` can conflict with platform-level templating/parsing in HubCloud pages.
4. Encoding corruption in JS/DSL identifiers can break datasource behavior even if UI mounts.

## Safe subset for HubCloud
Use these defaults for production transfer:
- Prefer `v-text` / `v-html` over `{{ ... }}`.
- Avoid `b-table` scoped slots; prefer plain `<table>` with `v-for`.
- Avoid Vue shorthand slot syntax (`#slot`, `v-slot`).
- Keep template expressions simple.
- Keep files UTF-8 and avoid mojibake (`Р...`, `С...`).
- Keep datasource mode default to `hubcloud`.

## Transfer checklist (before copy to HubCloud)
1. Run `node tools/hubcloud-compat-check.js`.
2. Ensure output has no `ERROR`.
3. Run local sanity:
   - `node --check script.js`
4. Copy only:
   - `index.html`
   - `script.js`
5. In HubCloud, open report with hard refresh (`Ctrl+F5`).

## Planned workflow going forward
1. Build feature in sandbox.
2. Run compat check.
3. If warnings appear, convert to HubCloud-safe pattern immediately.
4. Deploy small increments to HubCloud (one block per step).
