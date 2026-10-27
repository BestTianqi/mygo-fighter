# Frontend presentation and mobile play

The visual direction uses the warm ivory, ink typography, open spacing and quiet accents of [the supplied Notes reference](https://12chasse-neige.github.io/notes/), combined with the original BanG Dream character artwork. Menus, selection, room setup and help share borderless, square-cornered surfaces and muted rose/teal accents. Battles retain their dark concert stages and existing combat effects, transformations, videos and finish cut-ins. Styling stays in Tailwind utilities; the React frontend, Scala backend and shared combat kernel remain separate.

## Selection and battle flow

- Local selection and online rooms have a viewport-sized shell, a scrollable central region and a persistent action footer. All roster cards remain together; stage thumbnails scroll horizontally. Short landscape layouts reduce descriptions before reducing usable controls.
- Lineup slots show compact face portraits and readable names. Online bans and picks use the same persistent footer as readiness, so confirming a draft never requires finding a button below a long character description.
- Starting a local match, resuming from the menu or marking an online player ready requests fullscreen in the click handler, before asynchronous loading. Browsers require a player gesture. Fullscreen and landscape locking are best effort; denied or unsupported requests still leave a playable viewport-filling battle.
- Escape and the floating exit button leave fullscreen. Native fullscreen changes are observed, so exiting through browser controls also restores the game toolbar. Menus release orientation locking and fullscreen.
- Touch controls use a captured sliding thumb stick and independent square action buttons. Diagonal input, movement plus attacks, pointer cancellation, lost capture, blur and unmount all have explicit release paths. Transformation remains conditional on the selected fighter.
- The battle latency badge remains outside the hidden toolbar. Online values are the existing measured round-trip time (RTT), not estimated one-way delay. Local play, initial measurement, reconnecting and stalled updates have separate labels.

## Browser toolbar limits

The game requests fullscreen with `navigationUI: "hide"` when supported. A page cannot guarantee removal of browser chrome. The web manifest uses relative `start_url`, `scope` and icon paths with `display: "standalone"`, and Apple web-app metadata is included. On supported mobile browsers, **Add to Home Screen** and launching that shortcut provide a toolbar-free app window. A dismissible hint explains this when fullscreen is unavailable. Installation does not enable offline play, and online matches continue to require the server.

References: [Fullscreen API requirements](https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullscreen), [web manifest display modes](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/display).

## Verification

Temporary verification scripts and screenshots live under ignored `output/playwright/`; no test directory or new testing dependency is added. Browser checks cover desktop selection and default fullscreen/Escape, 320×568 and 390×844 phones, 844×390 landscape and 1024×768 tablet layouts, simultaneous touch movement and attacks, cancellation, and two independent clients completing online 1v1 play and a 3v3 ban/pick draft. Browser emulation does not establish physical iPhone/iPad toolbar or orientation behavior; those remain subject to the installed browser and OS.
