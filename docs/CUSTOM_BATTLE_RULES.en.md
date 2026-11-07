[简体中文](CUSTOM_BATTLE_RULES.md) | **English** | [日本語](CUSTOM_BATTLE_RULES.ja.md)

# Custom battle rules

Open 「自定义对战规则」 (custom battle rules) from local character select or in an online room. Online, the host sets them for both sides, and the two players ready up (准备开战) after confirming the rules.

| Option                                      | Range or effect                                                                                                                                        |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 出战人数 (fighters per side)                | 1–8 per side; with 2 or more, they fight in entry order as a relay                                                                                     |
| 每方禁用角色数 (characters banned per side) | 0–7, automatically limited by the current team size and the roster                                                                                     |
| 生命值 (health)                             | 50–2000 per character, default 200                                                                                                                     |
| 禁用大招 (disable supers)                   | Disables P and supers triggered by other inputs                                                                                                        |
| 无限能量 (infinite energy)                  | Resonance stays at 100; skills, transformation and blink cost no resonance                                                                             |
| 禁用普攻 (disable normals)                  | Disables J/K, including the three-hit normal chain, heavy attack, crouching and airborne normals                                                       |
| 禁用变身 (disable transformation)           | Disables H, including Mujica's stage outfits and Tomori's penguin form                                                                                 |
| 无冷却 (no cooldown)                        | Removes the cooldown before a skill can be used again; start-up, recovery, hitstun and each skill's own effect conditions remain                       |
| 无限时间 (infinite time)                    | No round countdown; knocks out still resolve and swap fighters normally                                                                                |
| 回合时长 (round length)                     | 30–300 seconds per round, default 60; this setting is suspended while infinite time is on                                                              |
| 初始共鸣 (starting resonance)               | 0–100, default 0; later relay members start with at least 30, and the winner keeps remaining resonance                                                 |
| 伤害倍率 (damage multiplier)                | 0.5 / 1 / 1.5 / 2 / 3×, applied to attacks, guard chip damage and damage to summons                                                                    |
| 移速倍率 (movement speed multiplier)        | 0.75 / 1 / 1.25 / 1.5 / 2×, applied to walking, air movement, dash speed and blink distance                                                            |
| 一击决胜 (one-hit knockout)                 | An unguarded attack that deals actual damage knocks down immediately; a fully absorbed shield hit, a successful guard or a counter does not trigger it |
| 吸血对战 (lifesteal battle)                 | Restores 25% of the actual HP damage dealt; the higher ratio applies against a character's own lifesteal skill, without stacking, capped by max HP     |
| 低重力 (low gravity)                        | Character gravity becomes 60%; jumps are higher and airtime longer, and CPU pathing uses the same physics parameters                                   |
| 无限空中跳跃 (infinite air jumps)           | Jumps can be repeated in the air, still limited by hitstun, attack animations and the map's upper bound                                                |
| 禁用防御 (disable guard)                    | Space and back-step no longer trigger the normal guard; shields and counter skills remain usable                                                       |

「默认」 (Default) restores the standard rules; 「仅技能」 (Skills only) turns on infinite energy and disables normals; 「无限火力」 (Infinite firepower) turns on infinite time, infinite energy and no cooldown. The fun presets 「一击决胜」 (one-hit knockout), 「月面乱斗」 (moon brawl) and 「吸血拉锯」 (lifesteal tug-of-war) are also available, and parameters can still be tuned individually after applying one. A preset resets health, the other fun switches and the zero-Ban-slot state.

With zero ban slots, both teams may use the same characters, but a team cannot repeat a character. With bans on, the two sides take turns banning first, then take turns picking characters that are unique across the whole match. With the current 16 characters, 5v5 allows at most 3 bans per side, and 8v8 has no ban slots. Practice mode is still 1v1 with no picks or bans, and the other battle switches remain available.

Changing the team size or ban slots resets an in-progress pick/ban. Online, changing health or a fun rule keeps the lineup but cancels both players' ready state, so a match cannot start right after the rules change. Rules are locked once the battle starts; go back to character select or the room to change them.

The health cap applies to the opening fighter, later relay members, healing, lifesteal and the health bar display. In an ordinary relay, later members enter with the larger of the starting resonance and 30, or 100 under infinite energy.

The rules are executed by the shared TypeScript combat core; browser-local battle, online prediction and the Scala authoritative simulation use the same implementation. The room protocol is 22, so after updating, restart the host service and have both players refresh their pages.

Verification: `npm run check` covers custom health, healing, relay progress, disabling moves for all fighters, CPU opponents, energy/cooldown, infinite time, damage/movement multipliers, one-hit knockout, lifesteal and air rules; online permissions and the pick/ban flow are additionally verified through real HTTP/WebSocket rooms.

Design basis: on 2026-10-28 the user confirmed 「按此方案直接实现，后续无需逐步确认」 (implement this plan directly, no step-by-step confirmation afterwards) and chose to edit in the current directory.
