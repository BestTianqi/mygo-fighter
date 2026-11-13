# Ultimate media cue audit

Initial cue audit on 2026-11-08. Updated on 2026-11-14 for Tomori, Uika and short super playback. Times are milliseconds from decoded MP3 playback time zero. `releaseCueMs` is the absolute media time of the phrase or action that cues the first release. Recordings play at their original speed.

## Method and precision

Decoded every ultimate MP3 with FFmpeg; ran cached faster-whisper small Japanese word timestamps; inspected waveform energy for the whole roster. For Sakiko and Miyako also inspected spectrograms and video contact sheets. ASR absorbs silence into words and is not an authoritative onset detector: e.g. Sakiko ASR says 3.82 s, but her final phrase actually rises at 4.16–4.20 s. Ritsu ASR similarly assigns 3.16 s to a phrase whose strong voiced onset is about 3.80 s. Ordinary roster cues are approximate (around ±160 ms); Sakiko around ±40 ms, Miyako around ±40–60 ms. No direct listening tool was available; conclusions use visual waveform/spectral evidence plus source catalogs and ASR.

## Release cues

| Character / form | Move IDs                                    | releaseCueMs | Observed release cue                                                           |
| ---------------- | ------------------------------------------- | -----------: | ------------------------------------------------------------------------------ |
| anon             | super                                       |          620 | First strong voiced laugh                                                      |
| soyo             | soyoSuper                                   |         1580 | Final shouted phrase as she drops her hands                                    |
| tomori           | tomoriSuper                                 |         7080 | 「叫び」 in the selected speech                                                |
| rana             | ranaSuper                                   |         2900 | Bye-bye                                                                        |
| taki             | rikiSuper                                   |          280 | First 「は？」                                                                 |
| umiri            | mujica_5_normal_super, mujica_5_stage_super |         4630 | Second 「信用」                                                                |
| sakiko           | mujica_6_normal_super, mujica_6_stage_super |         4160 | Watashi ga: I will become a god                                                |
| uika             | mujica_7_normal_super, mujica_7_stage_super |         4430 | First 「さきちゃん」 after she starts crawling                                 |
| mutsumi          | mujica_8_normal_super                       |         6000 | Never, not even once                                                           |
| nyamu            | mujica_9_normal_super, mujica_9_stage_super |         5320 | Mask clears after her second line                                              |
| arale            | mewtype_10_virtual_super                    |          620 | 「力」 and raised arms                                                         |
| ritsu            | mewtype_11_virtual_super                    |          900 | Voiced onset of Ritsu's question in the P2 clip                                |
| miyako           | mewtype_12_virtual_super                    |            0 | Nine mantra beats, already starts at media zero                                |
| yuno             | mewtype_13_virtual_super                    |         2480 | Showtime in the opening solo rap                                              |
| nonoka           | mewtype_14_virtual_super                    |         2940 | Tsutawatta kana: did my feelings reach you                                     |
| viola            | mewtype_15_virtual_super                    |          540 | She opens her eyes and smiles while saying MewType                             |
| mortis           | mujica_8_stage_super                        |           50 | First strong scream onset                                                      |
| penguin          | penguinSuper                                |           50 | First of five waves with the restored penguin call                            |

## Sakiko detail

`assets/meme-media/sakiko-requiem/sakikoGodFull.mp3` is exactly 6.000 s; video is 6.000 s at 30 fps. Source interval is 34.45–40.45 for both. The sentence is 神様などいない。ですから、私が神になります。 Actual vocal groups are approximately 0.40–1.45, 2.46–2.91 and 4.16–5.50 s. The third group is the appropriate release after the first two build-up clauses. Its initial 私 ends around 4.38; 神 falls approximately 4.76–4.98. Recommended control wave begins 4160 ms (4200 ms is a valid rounded implementation choice); later waves can emphasize 神 around 4760 ms, then the concluding phrase around 5200–5420 ms. Keep playback running to the original 6000 ms ending. The source catalog’s older estimated sentence end near source40.26 is more conservative than the currently decoded vocal envelope, and must not be treated as frame-precise.

## Miyako nine beats

`assets/meme-media/recordings/miyako-p.mp3` decodes to 11.3001875 s; video is 11.33 s / 24 fps. Both start at source0.1. The nine attacks should follow speech syllable onsets, not nine evenly distributed points across the clip. The first syllable is already active at media zero; ninth begins about7.74 s, followed by sustained magic/music visuals until the clip ends.

| Syllable | Absolute onset ms | Evidence                                                                             |
| -------- | ----------------: | ------------------------------------------------------------------------------------ |
| 临       |                 0 | Immediate initial voiced attack                                                      |
| 兵       |               860 | Midband envelope rises0.85–0.88; ASR identifies second syllable                      |
| 斗       |              1640 | Consonant/energy rise1.63–1.68                                                       |
| 者       |              2560 | Weak consonant2.55–2.60, main vowel2.64–2.70; prompted ASR restores omitted syllable |
| 皆       |              3480 | Initial consonant around3.48; main vowel rises3.66–3.70, so peak is not onset        |
| 阵       |              4560 | Envelope increases4.56–4.60, vowel4.64–4.68                                          |
| 列       |              5520 | Voicing builds5.52–5.60, stronger peak5.64                                           |
| 在       |              6480 | Voicing rises6.48–6.56, magic-star already visible                                   |
| 前       |              7740 | Strong final sustained onset7.74–7.78, subtitle switches to final character          |

If a startup freeze needs a minimum duration, treat it separately from this audio-relative schedule. Do not add per-hit delay/hit-stop to the absolute audio clock, or later syllables will drift. All nine cues must stay in this one media timeline.

## Source alignment

The muted video and independent audio share the same source interval for all forms except the restored penguin meme. [The source catalog](../assets/meme-media/selected-ultimate-backgrounds/sources.json) records each speaker, interval and cue.

- Mortis retains the first scream from BV1uPf5YCE73. Both tracks use source 0.27–3.05 s. The first wave lands on the strong vocal onset at 50 ms and the five-wave schedule stays within one second.
- Penguin uses the legacy 4.25–7.15 s footage and the 「咕咕嘎嘎」 call from 14.40–16.85 s of the same meme source. Fighters and HUD stay visible over the video and the first wave releases at 50 ms.
- Normal Tomori fires one 20-damage sound wave. On an unguarded hit against a vulnerable fighter, it inflicts 2000 ms of hard stun.
- Uika retains her opening line, then cuts to the repeated calls and crawl. Her first hit cues at 4430 ms and her five hits remain in the original one-second combat sequence.
- Soyo uses the existing 58.80–61.40 s cut. The independent MP3 matches the original embedded audio at zero offset. The muted version removes the duplicate audio stream.
- Viola uses the episode 3 close-up trimmed to her question. The official character CM repeats that shot and confirms her identity. The export cuts before Ritsu's reaction.

## Reproducible local evidence

The ignored `output/ultimate-sync/` folder contains `cue-recommendations.json` (paths, hashes, duration, offsets, all22 move IDs), each character’s `*-asr.json`, `sakiko-waveform.png`, `sakiko-frames.jpg`, `miyako-waveform.png`, `miyako-onsets.png`, `miyako-frames.jpg`, and `roster-waveforms.png`. The `*-prompted-small-asr.json` files use the same cached small model, with a nine-syllable prompt for Miyako. An attempted large-v3 load failed because the cached model weight file was absent; no result is represented as large-model output. Raw recognition errors are preserved as evidence rather than silently corrected.

## Implemented playback contract

All 22 playable ultimate forms carry a shared simulation-owned media clock. A media lead-in of at least 1000 ms gets the 320 ms blackout and video cut-in. Shorter lead-ins play their voice against the regular arena, with the requested penguin video playing behind the arena as an exception. When media starts after the move starts, negative media time delays playback while preserving attack timing. A timed intro freezes every fighter, projectile, summon, cooldown, respawn and the round countdown. The interrupted combat tick completes once after the intro, preserving simultaneous transformation bursts and release-point buffs. Concurrent casts share the frozen interval. A new long super takes over the video layer and cuts off other skill audio. On simultaneous long supers, the longer lead-in gets the screen, with side order breaking ties.

Sakiko's control releases at media 4160 ms; three rain impacts follow at 4760, 5160 and 5560 ms. Miyako's nine attacks use the onset table above and still total 50 damage. Timed supers suppress combat hit-stop so impacts do not accumulate delay against the recorded score. Visual hit feedback remains.

The stage and HUD fade to black, then the video fills the battle frame. At the end of the frozen opening, the stage and HUD fade back in over the same video while combat resumes. During match preparation the loading bar tracks character art, the stage and the first decoded frames of the selected roster’s ultimate videos, including reserves and enabled forms. The browser reuses those video elements in combat.

Local and LAN playback use the same serialized cast identity and clock (protocol 33). LAN voice starts only after an authoritative cast is received; matching prediction can supply the current playback position. Delayed decoding and reconnect seek to that position. Audio/video remain at 1x; drift over 80 ms triggers a position correction. Pause stops both. Short source videos end without looping while their voice continues; the existing finish presentation waits for its queued complete voice. Existing originals and skill damage/costs are retained.

The eight selected scenes use independent recordings cut from the same source interval as their muted video. [The source catalog](../assets/meme-media/selected-ultimate-backgrounds/sources.json) records the speaker, source interval and release cue. Ritsu uses her earlier question in the same P2 because Viola speaks over the previous close-up. Yuno uses her opening solo from the same concert with the original instrumental backing. Taki retains the original 「は？」 and its 280 ms first-strike cue.
