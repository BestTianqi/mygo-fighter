[简体中文](README.md) | **English** | [日本語](README.ja.md)

# Viola: Anime Voices

The voices for U / I / O / ↓＋U come from the [Viola character CM](https://www.bilibili.com/video/BV11uK36xEs2/) released by the official MewType channel, CID `39994722827`. The character card at 4 s reads 「薇欧拉 / Viola」「CV 本渡楓」; the close-ups that follow let you check the dark green hime cut, the side bun, the gold-green eyes and the hair clip. All chosen segments are Viola's own anime voice, with no streamer narration or synthesized speech. P's voice and background picture are the only exception, and both come from TV anime episode 3: see “P Super Picture and Voice” below.

| Entry | Clip range                       | Official subtitle / line meaning                                                  | Game adaptation theme |
| ----- | -------------------------------- | --------------------------------------------------------------------------------- | --------------------- |
| U     | 0.00–3.15 s                      | I'm everyone's little sister Viola                                                | 镜头闪拍              |
| I     | 4.72–8.17 s                      | I see, it didn't get through                                                      | 剪辑陷阱              |
| O     | 9.05–13.65 s                     | Then Arale can just stay like that                                                | 话术推击              |
| ↓＋U  | 24.70–26.48 s                    | You did well                                                                      | 剪辑声波              |
| P     | Episode 3, 22:39.000–22:44.046 s | Was it MewType? (official English subtitle; the speaker was not lip-sync checked) | 剪辑放送              |

P now plays the anime's own audio from 22:39 of episode 3 directly (5.05 s, original speed, not sped up to the battle's cast duration). The old CM voice (16.85–20.90 s, 「这个数字，感觉会成为不错的引爆点呢」) is archived in `violaAnimeIgnition.mp3` and no longer installed. That stretch of the anime has English subtitles only, and neither a Japanese transcript nor lip sync was checked, so the metadata does not treat its speaker as verified evidence.

## P Super Picture and Voice (changed 2026-10-30)

P's picture and voice were both changed to the same continuous shot at **22:39.000–22:44.046** of TV anime 《BanG Dream! YUME∞MITA》 episode 3 (source file `[SubsPlease] BanG Dream! Yumemita - 03 (1080p) [3931E49D].mkv`, length 23:40). Between 22:35 and 22:50 there is no shot change above the 0.3 threshold, so the range is one continuous shot; frame-by-frame brightness and saturation are normal, with no black frames or fades. The official English subtitle for 22:39.48–22:42.36 is “Was it MewType?”.

- Picture: `viola-ep3-2239-cutin.mp4`, 1138×640, H.264 CRF 24, 24000/1001 fps, `setsar=1`, AAC 96k stereo, about 5.05 s, original speed. The in-game background element is still `<video muted>`.
- Voice: `violaAnimeMewtype.mp3`, the same 22:39.000 start, 5.046 s, 44.1 kHz mono 96 kbps. After decoding, the cross-correlation with the picture's audio track is 0.994 at a 0-sample offset, i.e. the audio and the picture are in sync.
- Loudness: the anime's original mix measures -24.6 LUFS, raised by +6 dB to -18.6 LUFS, matching Viola's other voices (-18.0 to -19.7 LUFS); 12 ms / 25 ms fades were added at the start and the end to avoid boundary pops.
- The old P material is archived and no longer installed: the previous version of the picture `viola-ep3-2239-cutin.mp4` was `viola-ignition-cutin.mp4` (CM 16.85–20.90 s), and the voice was `violaAnimeIgnition.mp3` (the same CM lines).
- The picture content and the speaker were not verified by the build script: the current working model cannot read images, so only the timecodes, the shot continuity and the subtitles were checked. If the picture or the speaker is wrong, please point it out and the timecodes will be changed.

The finish art is a close-up of Viola at 20.10 s of the same scene, stored at `assets/finish-art/viola-anime-ignition.webp`. The source, timings, speaker evidence and the SHA-256 of every source medium are in `sources.json`; `install.json` provides the slot and variant wiring reference for character 15. The camera, editing and broadcast attack effects are this game's adaptation design for an anime character, not the original work's superpower setting.

At install time, add `viola` to the end of `CHARACTERS` in `tools/build_meme_assets.py`, then use `normalize_clip(row, catalog, 15, row['slot'], row['voice'])` to read this directory's `sources.json` clips and write them into character 15's `slots` and `variants` respectively; `throw` reuses O. Finally install the runtime media and the finish art through the existing packing flow. Do not overwrite or remake the original character material.
