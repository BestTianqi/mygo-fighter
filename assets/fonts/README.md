# Interface typeface

The three `noto-serif-sc-ui-*.woff2` files are local variable-weight subsets of
**Noto Serif SC** (weights 400–900). The sharp, high-contrast serif family is shared
by the main banner, headings, character names, buttons and other interface text.
Vite bundles these sources, so the interface has no external font dependency.

The subsets cover the CJK characters present in `frontend/src/` at the time of the
visual revision, plus Latin letters, numbers and interface punctuation. When new
copy or characters are added, extend the subsets and their CSS unicode ranges;
Songti/SimSun/serif fallbacks cover any missing glyphs in the meantime.

- Typeface: https://fonts.google.com/noto/specimen/Noto+Serif+SC
- Upstream: https://github.com/google/fonts/tree/main/ofl/notoserifsc
- Copyright: 2017–2024 Adobe
- License: SIL Open Font License 1.1, distributed with the game at
  `frontend/public/licenses/noto-serif-sc-OFL.txt`.
