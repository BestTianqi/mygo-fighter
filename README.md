# MyGO!!!!! Fighter

A TypeScript + React fighting game with a Scala 3 LAN server. The rewrite preserves the 15-character combat rules, transformations, 15 stages, local versus, CPU, practice and local 3v3 relay battles. LAN battles support two devices in 1v1 or 3v3 relay.

## Run

Install Node.js 24 LTS (22.12+ also works), a JDK 21 or newer, and sbt. Then, from this folder:

```sh
npm ci
npm run lan
```

The first build downloads JavaScript and JVM dependencies. Keep the server window open. The launcher prints the local address and the computer's LAN addresses. The default port is **8080**.

On Windows, double-click `启动局域网联机.cmd` or `start-lan.cmd`. Both use the same launcher and keep the window open when startup finishes or fails, so errors remain visible. On macOS/Linux, run `./start-lan.sh`. These launchers build the application and start the same Scala server. Java handles HTTP, static files, rooms, WebSockets and authoritative matches. Node is a build and launch tool.

All launch commands, including `npm start`, reuse an existing portable JDK and sbt launcher under `output/toolchain/`, when available. A compatible `JAVA_HOME` takes priority; an older system Java does not prevent use of the portable JDK. That optional local cache is not included in Git downloads; otherwise install the dependencies listed above.

Windows launchers use `output/java-tmp/` for Java temporary files, including JLine's console DLL. This avoids startup errors when the Windows user temporary folder denies access; no administrator launch or system folder permission changes are needed.

After building once, `npm start` starts the server without rebuilding. It prints playable addresses after the backend responds. If a MyGO server already exists, it prints its addresses and leaves that backend running in its original window. Close the original server before restarting to load changed combat rules. Set `PORT` to use another port. Set `JAVA_HOME` to select a JDK; the launcher also detects the usual Homebrew JDK 21 installation on macOS.

## LAN play

1. Start the game on the host computer. Open the printed **LAN address** on both devices, for example `http://192.168.1.20:8080`. Other devices cannot use the host's `localhost` address.
2. Choose **局域网联机**. One player creates a room; the other enters its six-character code.
3. The host chooses 1v1 or 3v3, stage and terrain. Each player selects one character, or three different characters in fighting order. Both press **准备开战**. The server waits for both clients to finish loading their artwork.
4. Both players use the **1P keys** to control their own character.

Both devices must be able to reach the host on the same network. Allow the chosen port through the host's local firewall if needed. Guest Wi-Fi that isolates devices will prevent connections.

On Windows, the firewall must allow the **Java executable that actually runs the backend**, on the active network profile and game TCP port. Allowing Node alone does not cover the Scala server. Campus and dorm networks may isolate devices even on the same Wi-Fi; if the host can open its LAN address but the other device cannot, try connecting both devices to the same phone hotspot or personal router.

A disconnect pauses both players. The page reconnects automatically, and refreshing the same tab restores its session. Resume after both players reconnect. Leaving a room revokes that session. Rooms are temporary and disappear after a server restart or 30 minutes without player activity.

## Controls

| Action                    | 1P / LAN          | 2P on the same keyboard |
| ------------------------- | ----------------- | ----------------------- |
| Move                      | A / D             | ← / →                   |
| Jump / crouch             | W / S             | ↑ / ↓                   |
| Three-hit light chain     | J                 | Numpad 1                |
| Heavy attack              | K                 | Numpad 2                |
| Blink                     | L                 | Numpad 3                |
| Base skills               | U / I / O         | Numpad 4 / 5 / 6        |
| Transform, when available | H                 | Numpad 7                |
| Super                     | P                 | Numpad 8                |
| Move list                 | F1 or page button | Shared                  |

Hold back to guard, back + crouch to guard low, and back + U or forward + O to throw. Direction + skill selects character-specific variants. Jump twice for a double jump; down + jump drops through platforms. Touch controls support simultaneous directions and attacks. Page buttons pause, restart and return to selection.

All five MewType characters have an additional **down + U** projectile costing **20 resonance** (2P: down + Numpad 4). Arale fires a heart sound wave, Ritsu a blue bear chord, Miyako an ink-panel wave, Yuno an electronic pulse and Nonoka a rabbit-ear pick. Their base U/I/O skills remain available. Waves can be guarded, collide with opposing projectiles and stop at raised ground. A skill hit restores 2 resonance; both HUD bars show the current value out of 100.

Mujica's **H transformation** costs 50 resonance and lasts 20 seconds. It releases one close-range burst for 10 damage (2 if guarded), then grants **1.2× damage** and **1.1× movement speed** while a colored aura surrounds the stage outfit. The burst does not restore resonance. Both bonuses end with the transformation.

## Development

```sh
npm run dev            # Vite frontend, port 5173; API/WebSocket proxy to port 8080
npm run build          # Strict TypeScript check, production UI and shared combat kernel
npm run build:pages    # Static browser version for GitHub Pages; no JVM server required
npm start              # Scala server serving the production build
npm run check          # TypeScript and runtime media integrity checks
npm run check:backend  # Scala compilation and formatting checks
npm run format         # Format frontend, scripts and documentation
npm run format:backend # Format Scala sources
```

Use a second terminal running `npm start` for the API while developing with Vite. Rebuild after editing shared combat rules to update the kernel embedded by the JVM, then restart the backend.

## Review map

- `frontend/src/pages/GamePage/index.tsx`: page skeleton. Page components, hooks, state objects and effects live nearby.
- `frontend/src/game/engine.ts`: match state and the public combat API. `game/match/` separates rule implementations by responsibility; `game/data/`, `game/mujica/` and `game/mewtype/` organize roster and move definitions. Animation lives under `game/animation/`. The shared combat kernel has no browser globals, network calls or Node dependencies.
- `frontend/src/pages/GamePage/functions/rendering/`: image loading, the battle frame pipeline, character effects, projectiles and scenery. Audio, input and page coordination stay in the parent folder.
- `frontend/src/apis/rooms/`: one HTTP caller per registered Scala room message, plus the persistent socket connection.
- `backend/src/main/scala/services/rooms/`: room messages, domain objects, registration and private runtime helpers.
- `backend/src/main/scala/services/system/`: Cats Effect startup, application resources, shared routing and static serving.
- `frontend/public/`: media manifest and cacheable runtime assets.
- `assets/`: source artwork grouped by band, character or feature, with design notes under `assets/notes/`. See the [asset catalog](assets/README.md).
- `scripts/` and `tools/`: application build/start commands and optional Python artwork packers. See [artwork workflow](docs/ARTWORK.md).

The Scala backend embeds the **same TypeScript combat kernel** in a restricted GraalJS context inside the JVM. Rooms, trusted session resolution, authorization, lifecycle, concurrency and transport are Scala. Sharing the battle rules avoids two divergent implementations for the 15 characters. This is an explicit architecture choice, not a native Scala port of every combat calculation.

See [architecture and review guide](docs/ARCHITECTURE.md), [course guidance](docs/COURSE_GUIDANCE.md), and [LAN protocol and timing](docs/LAN.md). The supplied style rules are preserved in [STYLE_RULES.txt](docs/STYLE_RULES.txt).

GitHub Pages publishes the React build from `frontend/dist` automatically after a push to `main`. The static build supports local play, CPU, practice and 3v3; LAN rooms require the local Scala server. All original runtime media are retained, with paths resolved relative to the app so project URLs also work.

The test suites have been removed. Before publishing, run the checks and both builds above, then verify project-path loading, recorded audio, character transformations, supers and menu flow in a browser. For LAN changes, also check two clients joining, loading, playing, pausing and reconnecting against the same Scala server. Keep any local reports and screenshots in the ignored `output/` folder.
