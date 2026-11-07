[简体中文](CHARACTER_CLARITY_2026-10-28.md) | **English** | [日本語](CHARACTER_CLARITY_2026-10-28.ja.md)

# Character display clarity improvements

2026-10-28: fixed the blur affecting every character, caused by the battle canvas not matching the actual display size. The original character art, faces, colours, actions and effects are preserved.

## Measured changes

| Display scenario                        | Old canvas pixels | New canvas pixels |
| --------------------------------------- | ----------------- | ----------------- |
| 1920×1080, device pixel ratio 1         | 960×540           | 1920×1080         |
| 1440×810, device pixel ratio 2          | 1920×1080         | 2560×1440         |
| Phone 390×219.375, device pixel ratio 3 | 1920×1080         | 1170×658          |

Previously an ordinary large screen simply upscaled a 960×540 frame; the render resolution is now derived from the canvas's actual CSS size and the device pixel ratio. Phones draw only what they need, avoiding useless oversized buffers. The size is tracked by a ResizeObserver, which is released when leaving the game.

The automatic quality adjustment stays: sustained frame drops lower the resolution, and it recovers once the frame rate is stable. The buffer is capped at about 2560×1440; very high resolution screens are limited by that cap. The character cache keeps its 64 entries and 8-megapixel budget.

Cache scale steps now round up, so an image is not shrunk too far and then stretched again. At the original pixel density the source texture is used directly. High-quality image sampling is re-enabled after a canvas reset, preserving hair, facial features and clothing lines.

The offline Poppin'Party action preview also draws at the display size and pixel ratio, and the band still is not on the official roster. The original PNGs and every runtime asset file are byte-for-byte unchanged.

## Verification

- Cache and resolution checks: canvas pixel cap, upsampling, original anchors and world size, cache reuse and the memory cap.
- Real browsers: 16 playable characters, five Mujica transformations, Tomori's penguin and Anon's milk-dragon, 23 display states in total; automatic quality drops and recoveries do not change battle state.
- Ordinary large screens, high-DPI screens, phones and Pages subpath loading; all assets load normally.
- Five Poppin'Party previews: ordinary screen, high-DPI screen, phone, window resizing and action switching, with no canvas-observer errors.
- `npm run check`, `npm run build`, `npm run build:pages`.

Test scripts, clarity comparison screenshots and detailed results are kept in the ignored `output/clarity/`.
