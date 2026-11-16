# Desktop shell mockup (throwaway reference)

Reference for `docs/superpowers/specs/2026-11-16-desktop-shell-design.md`. It is not part of the app and never ships. The owner approved this look on 2026-11-16.

- `shots/` holds the screenshots the owner saw: Home, Find gyms, the ⌘K modal (empty and typed "slaute"), My week, the Send button states, and the phone Home and search sheet. `shots/win-button-hover.webm` shows the Send button hover loop.
- Open any `*.html` here in a browser (1440 px wide for the desktop pages, 390 px for `m-*`). `build.cjs` generates them; `contours.cjs` generates the texture; `icons.cjs` renders the Lucide icons to `icons.json`; `shoot.cjs` takes the screenshots with Playwright.
- The map in Find gyms is a real screenshot of the live site. Distances, the Saved count and the "Start session" button are sample content: the app has no such button (see the spec), and distances depend on the visitor.
- Where this mockup and the spec differ, the spec wins: no "G then F" key chords, the texture must be at most 60 KB (this one is 317 KB), and My week keeps its real actions.
