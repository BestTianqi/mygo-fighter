[简体中文](CUSTOM_PLAY_EXPANSION_2026-10-29.md) | **English** | [日本語](CUSTOM_PLAY_EXPANSION_2026-10-29.ja.md)

# Battle play and presentation expansion

User goal: add more CPU difficulty levels and more custom play, improve the portrait scale of the three-player entrance, and remove the blur from the ultimate super result. Continue the previous authorization to 「直接实现、无需逐步确认、当前目录修改」 (implement directly, no step-by-step confirmation, edit in the current directory).

Scope:

- Keep the existing CPU difficulty tiers and add an advanced tier with faster decisions, more active defense and linked attacks; base damage and health rules stay consistent.
- Add energy regeneration per second, health regeneration per second, free blink and a knockback multiplier, combinable with the existing rules and paired with matching presets. Local and online use the same rules; online, the host sets them.
- The three-player entrance cards use proportionally enlarged portraits with upper-body cropping, centered characters and names in a separate bottom bar, removing the horizontal stretching.
- The ultimate finish video removes blur, darkening and extra zoom, and is shown in full at its original proportion. Keep the existing flow: a one-second ultimate cut-in, the voice finishing before the next round, synchronized pause and the Baidu-banned video handling.

Acceptance covers difficulty selection and in-match behavior, rule normalization and actual effects, online transmission and authoritative simulation, three-player entrance screenshots, result video styling and playback sync, plus the full check and build.

Six tiers are implemented: 轻松、标准、认真、专家、大师、噩梦 (relaxed, standard, serious, expert, master, nightmare). The new tiers react in 105–175, 65–110 and 35–60 milliseconds respectively, and strengthen guarding, hit-confirm combos, distance judgement and approach. Against the fixed-script opponent, the 16 characters' cumulative output is 2140／2617／2725 with damage taken of 1562／1254／1167; this result shows that the tiers have real behavioral differences and does not represent a win rate against all players.

Automatic energy regeneration and health regeneration can each be set to 0–20 per second, and the knockback multiplier is 0.5／1／1.5／2／3. Free dash keeps its interval. Three new presets are added: 「游击充能」「再生拉锯」「弹珠乱斗」 (guerrilla charging, regeneration tug-of-war, marble brawl). New rules are off by default, the protocol is upgraded to 24, and the online host must be updated and restarted.

Verification record: real combat with all 16 characters × 6 tiers, fixed-seed replays, three-player CPU, move-ban and guard checks pass; rule checks cover no regeneration during rounds and pause, no revival after knockdown, three-way and substitutes, knockback and floating, and 500-tick consistency between local and server simulation. A real two-client WebSocket battle received the same four rules, and energy grew as configured in the authoritative state. The six tiers and preset input on the character-select page, desktop and landscape three-player entrance screenshots, and the ultimate cut-in exiting after one second with the video playing without filters at normal speed were all checked in a browser. Temporary evidence is stored in the ignored `output/custom-expansion/`.
