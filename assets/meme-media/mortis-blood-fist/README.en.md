[简体中文](README.md) | **English** | [日本語](README.ja.md)

# Mortis · My Fist Wants Blood

The skill is only available in Mutsumi's Ave Mujica stage form; press ↓＋O and spend 60 resonance. She first steps forward into a punch that deals 20 base damage (24 after the stage form's existing 1.2× multiplier); once the fist is released, she gains 40% lifesteal for 10 seconds whether it hits or whiffs. The first punch resolves before the new effect is granted, and an existing lifesteal still applies to that punch.

Normal attacks, skills and supers heal 40% of the health the opponent actually lost, affected by guard, shields, damage reduction, combos and remaining health. No healing occurs when a shield absorbs everything, during invulnerability, when no health is lost, or when only a summon is hit. Healing is capped at 200 health, and both the display and the calculation keep one decimal place. Recasting refreshes the 10 seconds without stacking the ratio; pause and hitstop follow the existing battle timing. Ending the transformation keeps the part of the 10 seconds that has not run out; knockdown, round settlement and restart clear the effect, and a relay switch does not carry the lifesteal over. The cooldown is 3 seconds, and the energy requirement still applies.

The action uses a forward step, a fist wind-up, a straight punch and a fist retract, with red fist energy, a persistent lifesteal aura and a HUD countdown; the actual healing reuses the health-recovery pop-up text. U/I/O, 我只有两岁, 我要吃汉堡 and the super are all kept.

The voice comes from the [Chinese fan-made meme video](https://www.bilibili.com/video/BV1Nxt96AERy/) the user specified, trimmed from 4.55–7.1 s: “注意，我的拳头想喝血了”. It is the dub version from that video and is not presented as an anime or voice-actor original; nothing was re-voiced or sped up for this entry. The original line, the subtitle check, the time range and the audio hash are in sources.json; the temporary frame check and the word-level alignment stay in the ignored directory output/mortis-blood-fist/.

To re-export: `python tools/build_mortis_blood_fist.py --source-video <原片.mp4>`; omit the argument to only repack the existing audio. The full asset build also feeds the same material in through `tools/build_meme_assets.py`.
