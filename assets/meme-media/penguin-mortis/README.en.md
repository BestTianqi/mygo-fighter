[简体中文](README.md) | **English** | [日本語](README.ja.md)

# 凑企鹅 (penguin) Haruhikage and Mortis Skill Adjustments

Date: 2026-10-22. The full sources, part numbers, start and end times and checksums are in `sources.json`.

## 凑企鹅 (penguin form)

- The audio comes from [川崎仁仁菜：🐧春日影 | 司凤版🐧](https://www.bilibili.com/video/BV1XTad6oE8F/?p=1), part 1, cid 42329377775, trimmed to 80.0–88.1 s. Part 2 on that page is the Tomori cover, which was not used this time.
- The audio is the fan cover the page labels 司凤版: 44.1 kHz mono MP3, 96 kbps, with matched loudness and short fades. The penguin's existing video illustration, action atlas and victory finish art were not replaced.
- P costs 100 and lasts 8.3 seconds, emitting 5 circular sound waves from the centre of her torso at 0.5 / 1.7 / 2.9 / 4.1 / 5.3 s. Each wave expands to a radius of 650 and can cross height layers, and each target is hit only once per wave. The unguarded damage is a fixed 10, unaffected by combo scaling or the Counter bonus; the guard, 钢板 and invulnerable-dodge rules are kept. The waves are not consumed by summons or ordinary projectiles.
- The normal form's U/I/O are still 诗句回声, 微光音符 and 迷途之歌; the penguin's U is 糖哭反击, I is the close-range hey 震慑 and O is a three-hit forward charge. The penguin keeps 前＋U flying kick and ↓＋I 唐笑. The form restriction is isolated in both the simulation layer and the move table, and the duplicate transformation entry is hidden while in penguin form.

## Mortis stage form

H still costs 50 and lasts 20 seconds, the existing stage-costume material is kept, and the school-uniform form's skills are unchanged.

| Key | Move                  | Resonance | Behaviour                                                                                                                                                             |
| --- | --------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| U   | Mortis·替身代演       | 20        | Retreat 100, the stand-in in front follows with two attacks, base damage 8 / 12                                                                                       |
| I   | 我不会弹吉他·装死反击 | 25        | 0.1–0.65 s counter window; successfully blocking one frontal attack sends back a 22-damage counter. Throws and back attacks break it                                  |
| O   | 不要解散·牵线留人     | 30        | After a warning at the target position ahead, strings fall; deals 18 damage within range on the same support surface and pulls the target back, as an overhead attack |
| P   | Mortis·双生剧场       | 100       | Puppets on both sides of the body, hanging strings and a three-act attack; the first two acts pull in, the finale launches, base damage 8 / 12 / 28                   |

The design draws on Mortis's stand-in performances, her protectiveness and her fear of the band breaking up; these are original game moves and do not mean the anime gives her these combat abilities. Official character reference: [Mutsumi / Mortis](https://anime.bang-dream.com/avemujica/character/mutsumi/); official episode 4 synopsis: [Bushiroad press release](https://bushiroad.com/media/36ab2fe8e377b1ba).

Mortis's stage-form P uses [月夜-涙's original clip](https://www.bilibili.com/video/BV1j8f5YdE6n/?p=2), part 2, 39.29–46.28 s; a Japanese transcript helped locate it, and the actual footage of her speaking to Sakiko was checked. The video is muted and paired with an independent voice track so the audio does not double up; the normal form still uses the original 「不曾觉得乐队开心」clip.

All new media is embedded in the offline HTML; the sound toggle, pause and resume, and hit/round cleanup keep using the existing systems.
