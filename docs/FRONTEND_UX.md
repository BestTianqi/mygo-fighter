# Frontend presentation and mobile play

The interface uses an Ave Mujica-inspired moonlit theater, charcoal surfaces, ivory text and crimson actions. Controls and widgets are borderless with square corners; color and spacing show hierarchy, and keyboard focus remains visible. A locally bundled Noto Serif SC family unifies the banner, headings, character names and interface text. The main menu displays all five members of the selected band, defaults to Ave Mujica and switches between MyGO!!!!!, Ave Mujica and 夢限大 MewType. The refactored page regions, shared controls, runtime and combat kernel keep their existing ownership boundaries.

## October 30 flow update

- The banner reads `武道馆当然要比武` without punctuation. Mode buttons use concise centered labels without navigation arrows. Help and main-menu navigation use the same filled Button as other controls. Continue appears only for an unfinished match.
- Selection shows the current ban/pick instruction and remaining slots. The portrait panel stretches to match the adjacent selection area. The central region still scrolls with its vertical scrollbar hidden; header and action footer remain visible. Lineup cards preserve square, centered faces; long teams scroll horizontally on phones and follow the active slot. Arena selection precedes optional collapsed custom rules.
- The LAN entry shows create/join pending feedback, copyable room codes and connection counts. Host controls, draft confirmation, missing players and readiness have explicit instructions.
- Pausing and final results use the existing overlay with clear resume/replay/selection/menu actions. Online guests wait for the host to restart; returning to the room and leaving the room are distinct actions. Battle HUD numbers and player identity remain readable with two or three players.
- Loading can be cancelled. Runtime request invalidation and renderer preparation generations prevent delayed loads from opening an abandoned match or trimming a newer match's artwork.
- Help prioritizes basic controls and uses expandable sections for detail. Dialog headers and close controls stay in the normal layout, preventing overlap with room settings.

The visual revision passed 69 browser checks across six viewport sizes, including all three band switches, complete roster retention, matching portrait/selection heights, hidden-scrollbar scrolling, borderless square controls, the local practice/pause flow, and mobile tap/hold and joystick release. The Pages build was also served under `/mygo-fighter/` with no failed resources or browser exceptions; evidence is in ignored `output/playwright/verify-ui.log` and `verify-published-touch.log`.

## Selection and battle flow

The October 30 update was checked in real Edge browsers at desktop, 390×844 portrait and 844×390 landscape sizes. Evidence under ignored `output/` includes:

- `ui-flow/main-report.json`: main-menu band switching, loading cancellation with delayed completion, asset-fetch failure and successful retry.
- `selection-ux-report.json`: incomplete/complete lineups, mobile 8v8, three-player teams, practice settings, alternating bans/picks and restarting the draft.
- `ui-flow-battle/report.json` and `report-final.json`: 12 battle checks including both orientations, actual combat results, replay/reselect/menu actions and native touch scrolling in short pause menus.
- `ui-flow-lan/report.json`: 17 checks through isolated edge/lobby/rooms services, including join failures, clipboard feedback, host permissions, 8v8, bans, two-/three-player real combat and five acknowledged leave requests with cleared browser sessions.

The UI update keeps the 160 illustrated touch action assets, all character art, combat rules and ultimate voice/video timing. The render-image checks now cover cancelled/superseded preload generations as well as disposal and resource release.

- Local selection and online rooms have a viewport-sized shell, a scrollable central region and a persistent action footer. All roster cards remain together; stage thumbnails scroll horizontally. Short landscape layouts reduce descriptions before reducing usable controls.
- Lineup slots show compact face portraits and readable names. Online bans and picks use the same persistent footer as readiness, so confirming a draft never requires finding a button below a long character description.
- Starting a local match, resuming from the menu or marking an online player ready requests fullscreen in the click handler, before asynchronous loading. Browsers require a player gesture. Fullscreen and landscape locking are best effort; denied or unsupported requests still leave a playable viewport-filling battle.
- Escape and the floating exit button leave fullscreen. Native fullscreen changes are observed, so exiting through browser controls also restores the game toolbar. Menus release orientation locking and fullscreen.
- Touch controls use a square, unlabeled thumb stick and square illustrated action buttons. The large lower-right attack button sends J on a short tap or K after a 300 ms hold; a straight progress bar and heavy-attack artwork show the hold state. U/I/O occupy the surrounding slots, P is on the right, and L sits beside the joystick at the bottom. Transformation keeps a fixed optional slot. Normal attack is 88–110 CSS pixels, skills are 48–60 pixels, and auxiliary targets are at least 44 pixels. Safe-area padding and a compact short-landscape layout keep targets clear of each other.
- Existing action frames and finish artwork follow the active character and form. Static crops share cached source images, with portrait fallback; they do not add an animation loop. Diagonal input, movement plus attacks, pointer cancellation, lost capture, blur and unmount have explicit release paths. Pending J/K gestures also cancel on pause, round, character or form changes. The stick's shaded lower zone supports holding to crouch without a swipe. Non-passive touch listeners cancel page gestures only for touches starting on the stick. Chinese accessible names remain available without visible action labels or joystick text.
- Navigation uses labeled, filled buttons without decorative arrows. The game logo appears once in the main-menu header. Mobile battles have no fullscreen or landscape guidance overlays; fullscreen and orientation requests still run through the existing battle flow.
- Both health bars use equal-width grid columns and matching safe-area padding. Fullscreen shortcuts have a separate row above the HUD; resonance labels reserve equal space so both resonance rails also remain the same length.
- The battle latency badge remains outside the hidden toolbar. Online values are the existing measured round-trip time (RTT), not estimated one-way delay. Local play, initial measurement, reconnecting and stalled updates have separate labels.

On an ultimate KO, the winning super's background continues while its sentence finishes. The queued finish voice starts the finish video and its one-second art entrance together, so the result does not clear the super into a blank screen or let the art exit before the finish video begins. The finish video stays through its complete sentence, then exits before the next entrance. The last 300 ms of the shared round-end clock waits for presentation completion; online rooms require both authenticated players to acknowledge that KO tick, so slower audio cannot leave one player fighting early. Normal KO timing and reserve-entry energy are unchanged. Silent finish-background videos use the same reviewed source segments as the finish voices, retain original speed and follow the actual voice position. Pause freezes both; sound-off uses the clip duration, and unavailable video leaves the illustration visible.

## Browser toolbar limits

The game requests fullscreen with `navigationUI: "hide"` when supported. A page cannot guarantee removal of browser chrome. The web manifest uses relative `start_url`, `scope` and icon paths with `display: "standalone"`, and Apple web-app metadata is included. On supported mobile browsers, **Add to Home Screen** and launching that shortcut provide a toolbar-free app window. Installation does not enable offline play, and online matches continue to require the server.

On iPad Safari, native pan gestures can dismiss fullscreen independently of page scrolling. Holding the joystick’s shaded lower zone lets players crouch without starting that downward swipe; the browser’s explicit fullscreen exit stays available. See the [WebKit fullscreen gesture report](https://bugs.webkit.org/show_bug.cgi?id=227387).

References: [Fullscreen API requirements](https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullscreen), [web manifest display modes](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/display).

## Verification

Temporary verification scripts and screenshots live under ignored `output/playwright/`; no test directory or new testing dependency is added. Browser checks cover desktop selection and default fullscreen/Escape, 320×568 and 390×844 phones, 844×390 landscape and 1024×768 tablet layouts, simultaneous touch movement and attacks, cancellation, and two independent clients completing online 1v1 play and a 3v3 ban/pick draft. Browser emulation does not establish physical iPhone/iPad toolbar or orientation behavior; those remain subject to the installed browser and OS.
