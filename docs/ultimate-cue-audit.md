# Ultimate media cue audit

Audited 2026-11-08 against original local assets. Production assets were not modified. All times below are milliseconds relative to decoded MP3 playback time zero. `releaseCueMs` means an absolute media-time release at the dramatic keyword/phrase, not the end of the entire clip. These are editorial sync cues; do not replace dialogue with synthesized audio or change playback speed.

## Method and precision

Decoded every ultimate MP3 with FFmpeg; ran cached faster-whisper small Japanese word timestamps; inspected waveform energy for the whole roster. For Sakiko and Miyako also inspected spectrograms and video contact sheets. ASR absorbs silence into words and is not an authoritative onset detector: e.g. Sakiko ASR says 3.82 s, but her final phrase actually rises at 4.16–4.20 s. Ritsu ASR similarly assigns 3.16 s to a phrase whose strong voiced onset is about 3.80 s. Ordinary roster cues are approximate (around ±160 ms); Sakiko around ±40 ms, Miyako around ±40–60 ms. No direct listening tool was available; conclusions use visual waveform/spectral evidence plus source catalogs and ASR.

## Release cues

| Character / form | Move IDs                                    | releaseCueMs | Observed release cue                                                           |
| ---------------- | ------------------------------------------- | -----------: | ------------------------------------------------------------------------------ |
| anon             | super                                       |          620 | First strong voiced laugh                                                      |
| soyo             | soyoSuper                                   |         1450 | Final shouted phrase                                                           |
| tomori           | tomoriSuper                                 |         6800 | Heart / scream climax                                                          |
| rana             | ranaSuper                                   |         2900 | Bye-bye                                                                        |
| taki             | rikiSuper                                   |         1440 | I will write the song                                                          |
| umiri            | mujica_5_normal_super, mujica_5_stage_super |         6280 | Want to trust each other                                                       |
| sakiko           | mujica_6_normal_super, mujica_6_stage_super |         4160 | Watashi ga: I will become a god                                                |
| uika             | mujica_7_normal_super, mujica_7_stage_super |          960 | First Sakki-chan call                                                          |
| mutsumi          | mujica_8_normal_super                       |         6000 | Never, not even once                                                           |
| nyamu            | mujica_9_normal_super, mujica_9_stage_super |         5160 | Final forceful sentence                                                        |
| arale            | mewtype_10_virtual_super                    |         5960 | Band-name declaration                                                          |
| ritsu            | mewtype_11_virtual_super                    |         3800 | Kakawaranai kara: forceful refusal                                             |
| miyako           | mewtype_12_virtual_super                    |            0 | Nine mantra beats, already starts at media zero                                |
| yuno             | mewtype_13_virtual_super                    |         4240 | Ongaku de: through music                                                       |
| nonoka           | mewtype_14_virtual_super                    |         2940 | Tsutawatta kana: did my feelings reach you                                     |
| viola            | mewtype_15_virtual_super                    |          600 | MewType question                                                               |
| mortis           | mujica_8_stage_super                        |            0 | Scream already active at audio zero                                            |
| penguin          | penguinSuper                                |            0 | Singing already active at audio zero; video is an unrelated visual performance |

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

## Video offsets and source caveats

Define `videoOffsetMs` as `video.currentTime = audioTime + videoOffsetMs`. All ordinary same-source cuts recommend0. These videos contain no embedded audio track, so direct cross-correlation against video audio is unavailable; matching source cut boundaries and Sakiko/Miyako visual review support zero.

- Mortis stage: audio `assets/meme-media/mortis-stage-voices/meme_8_stage_o.mp3` takes source0.95–3.05; video `assets/meme-media/mortis-stage-voices/mortis-scream-super.mp4` takes source0–2.1, per explicit `videoSource` metadata. To align retained overlapping content, start video at0.95 s: offset+950 ms. The encoded video is onlyabout2.07 s and starts at33 ms, leaving roughly1.12 s of aligned footage. It cannot visually cover the full2.1 s audio at1x speed; hold its last frame or leave the cut-in after aligned footage ends. Do not loop/stretch it while claiming sync.
- Penguin: audio `assets/meme-media/penguin-mortis/penguin-super-tongtou.mp3` is a5 s song excerpt from BV1SbHC6ZEAn source0–5. Video `assets/meme-media/recordings/penguin-p.mp4` is2.92 s from a different source BV1mTXKB4EjG source4.25–7.15. There is no meaningful lip-sync offset. Offset0 is only choreography, and a held last frame can preserve coverage without speed changes.
- Soyo: manifest duration says2.8 s, actual MP3 decodes to2.6 s; do not derive its clock from that metadata alone.
- Viola: source metadata explicitly says identity was not lip-sync verified. This audit measures its selected audio cue; it does not establish speaker identity.

## Reproducible local evidence

The ignored `output/ultimate-sync/` folder contains `cue-recommendations.json` (paths, hashes, duration, offsets, all22 move IDs), each character’s `*-asr.json`, `sakiko-waveform.png`, `sakiko-frames.jpg`, `miyako-waveform.png`, `miyako-onsets.png`, `miyako-frames.jpg`, and `roster-waveforms.png`. The `*-prompted-small-asr.json` files use the same cached small model, with a nine-syllable prompt for Miyako. An attempted large-v3 load failed because the cached model weight file was absent; no result is represented as large-model output. Raw recognition errors are preserved as evidence rather than silently corrected.

## Implemented playback contract

All 22 playable ultimate forms now carry a shared simulation-owned media clock. The release cue above includes the move's existing startup: the frozen opening adds a 320 ms blackout and video reveal to `max(0, releaseCueMs - firstReleaseMs)`. When audio starts after the move starts (Anon, Penguin, Mortis), negative media time delays playback instead of changing the attack timing. An accepted cinematic cast freezes every fighter, projectiles, summons, cooldowns, respawns and the round countdown. The interrupted combat tick completes once after the intro, preserving simultaneous transformation bursts and release-point buffs. Concurrent casts stagger media starts to release together; an existing super's media pauses during another intro.

Sakiko's control releases at media 4160 ms; three rain impacts follow at 4760, 5160 and 5560 ms. Miyako's nine attacks use the onset table above and still total 50 damage. Timed supers suppress combat hit-stop so impacts do not accumulate delay against the recorded score. Visual hit feedback remains.

The stage and HUD fade to black, then the video fills the battle frame. At the end of the frozen opening, the stage and HUD fade back in over the same video while combat resumes. During match preparation the loading bar tracks character art, the stage and the first decoded frames of the selected roster’s ultimate videos, including reserves and enabled forms. The browser reuses those video elements in combat.

Local and LAN playback use the same serialized cast identity and clock (protocol 27). LAN voice starts only after an authoritative cast is received; matching prediction can supply the current playback position. Delayed decoding and reconnect seek to that position. Audio/video remain at 1x; drift over 80 ms triggers a position correction. Pause stops both. Short source videos end without looping while their voice continues; the existing finish presentation waits for its queued complete voice. Existing originals and skill damage/costs are retained.
