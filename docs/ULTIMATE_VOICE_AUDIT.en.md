[简体中文](ULTIMATE_VOICE_AUDIT.md) | **English** | [日本語](ULTIMATE_VOICE_AUDIT.ja.md)

## Nonoka super immediate-voice adjustment (2026-11-07)

Nonoka's P now uses about 4.2 seconds of her own close-up with the complete line 「ののちゃんの気持ち、伝わったかな？」; the old version's silent 4.2-second headbutt opening was removed, so her own original voice starts the moment it triggers. Video and the independent audio track are cut in sync at original speed, and the Chinese subtitle timecodes shift forward with them. Both normal P and the matching move alias use the new material; the battle values and the kill-settlement material are unchanged.

The original 8.4-second cut is kept in `nonoka-super.mp4` / `nonoka-super.mp3`, and the new material is `nonoka-super-immediate.mp4` / `nonoka-super-immediate.mp3` in the same directory. `sources.json` records the old and new checksums and `derivedFrom.trimStart=4.2`; each can be rebuilt with `ffmpeg -ss 4.2 -i <原素材>`, using `-an -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -movflags +faststart` for video and `-map_metadata -1 -c:a libmp3lame -b:a 128k` for audio. The earlier cut records are kept below.

## MewType four-member super landscape adjustment (2026-11-02)

This round only handles the P move audio and video of Arale, Ritsu, Yuno and Nonoka; Miyako and Viola stay as they are. All four use original animation frames with the characters' own voices, standardised to 960×540, 24 fps, 16:9 full-frame, with no black-bar padding and no speed change; the matching Chinese subtitles sit below the health bar so the ground does not cover them. Each clip checks the speaker's lip sync, continuous dialogue and complete sentence endings, and the independent audio tracks are standardised to about −18 LUFS.

| Character | Clip                                                                 | Source and processing                                                                                                                                                                                                                                                                                    |
| --------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Arale     | Text-overlay naming + 「无论多少次都会做梦，我们就是梦限大」, 7.65 s | BV1313v6UExo 3520.10–3527.75; the old 5-second vertical-cut declaration is extended with the original landscape context, keeping the phone text overlay and the front-facing composition and excluding the previous Ritsu interjection.                                                                  |
| Ritsu     | 「我不会再和小阿拉蕾有任何关系」, 5 s                                | BV173tU6ME92 132.25–137.25; herself going from head down to an angry front face, replacing the old hungry clip.                                                                                                                                                                                          |
| Yuno      | 「我要和这帮家伙一起，靠音乐活下去」, 5.65 s                         | BV1tNMW6iES1 536.05–541.70; her close-up connected to the stage declaration holding the bass, keeping 「音楽で」 in full.                                                                                                                                                                                |
| Nonoka    | Voluntary headbutt on Arale + 「感受到小野乃的心意了吗」, 8.4 s      | Official episode 2, BV1SMTY6hEfY, the two ranges 856.6–860.8 and 872.2–876.4 cut together at original speed. The first range contains someone else's hit cry, so the audio's first 4.2 seconds are silent; the second range keeps Nonoka's own on-set voice, and the game still plays its own hit sound. |

The build sources, segment timecodes, cut rationale, subtitles and SHA-256 are kept in `assets/meme-media/mewtype-super-scenes/sources.json`. The four P moves use independent voice keys so the old recording shared by U/I/O is not replaced. The post-kill finish art and settlement audio/video are unchanged; Nonoka's single 50-damage advancing headbutt and its verification range are in [COMBAT_TUNING.md](COMBAT_TUNING.en.md). Full decoding of the original audio and video passes, and spot checks find no persistent black bars.

## Local source-scene move adjustments (2026-11-02)

As the user requested, the three P moves below replace the video and voice of the move. The material is located in the local full episodes the user provided by the embedded English subtitles, continuous shots and the speaker's lip sync and actions, keeping complete sentence endings, original voice and original speed, and adding matching Chinese subtitles. The video is silent H.264 and the original voice plays from an independent MP3; this round does not change the move's speed, damage, skill effect, or the post-kill finish art and settlement material.

| Character and form     | Source location                                         | Continuous lines and tension                                                                                                                                                                                           |
| ---------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tomori normal P        | MyGO episode 7, 15:31.958–15:40.417, about 8.46 s       | From 「只能拼尽全力去做」 it moves to 「因为我的歌是内心的呐喊」. Tomori holds the mic in close-up throughout, and it ends after her mouth closes at the sentence end.                                                 |
| Umiri everyday/stage P | Ave Mujica episode 9, 21:03.600–21:11.900, about 8.30 s | 「这样也不能信任我吗」「我也是认真的」「想让 Ave Mujica 重聚」「想彼此信任」; the wide shot of the speech matches the closing close-up of her continuously.                                                            |
| Nyamu everyday/stage P | Ave Mujica episode 4, 18:49.750–18:58.600, about 8.85 s | 「以为能一起登顶」 → sarcastic 「把人生交给我」 → 「没空陪大小姐过家家」. Nyamu's lip sync first confirms whose turn it is; the second half is Sakiko reacting to her outburst, and does not switch to Sakiko's lines. |

The source file names, the original's SHA-256, exact start and end, subtitles, speaker-verification basis and the product's SHA-256 are in `assets/meme-media/local-anime-supers/sources.json`. The builder reads already-cut resources directly, so other developers do not need to own the local full collection. Tomori's penguin P still uses the first 5 seconds of the user-specified cover from the previous round, and the two forms' kill settlements stay bound independently. The records below are kept as the history of earlier adjustments.

## Penguin-form move voice adjustment (2026-11-02)

As the user specified, Tomori's penguin form now uses the first 0–5 seconds of [BV1SbHC6ZEAn](https://www.bilibili.com/video/BV1SbHC6ZEAn/) for the P super, cut at original speed with matched loudness. This is the user-specified 凑企鹅 cover meme clip and is not certified as the character's own original dialogue. The move video, the illustration, the five-layer sound wave effect, and the normal-form Tomori P and both forms' kill finish-art settlement material all keep their existing configuration. The audio source, timing and SHA-256 are recorded under `audioSource` in `assets/meme-media/recordings/sources-penguin-p.json`, and the asset builder and runtime binding each read that independent audio source.

## Tomori clip adjustment (2026-10-30)

As the user later requested, Tomori's normal and penguin forms now share the 0–8 second video and its on-set original audio from BV18nHz6mEKc for the finish-art settlement. The other three characters' settlement material, the super cast material and all illustrations are unchanged. The earlier 18.8-second playback verification record is history only; this browser test measured video 8.0 s and audio track decode about 8.0 s, in sync at original speed with no material error, and the next round begins about 369 ms after the voice ends.

# 2026-10-30 user-specified finish-art settlement material

This round replaces only the post-kill voice and background video; the original finish-art illustration, the super cast voice/video and the skill effects are unchanged. Tomori's normal/penguin forms share Tomori's new clip; Sakiko's normal/stage forms share the new clip.

| Character | Specified source                                                   | Original cut    | Processing                                                                                                                                                                 |
| --------- | ------------------------------------------------------------------ | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Anon      | [唐笑纯享版](https://www.bilibili.com/video/BV1FgL9zgEQJ/)         | 0–7.2 s         | One complete laugh in a five-minute loop, with waveform autocorrelation confirming the 7.2-second period; no claim of the official CV                                      |
| Tomori    | [每天一遍，人都通透](https://www.bilibili.com/video/BV18nHz6mEKc/) | 0–8 s           | The first eight seconds of the meme short, original speed, no claim of the official CV                                                                                     |
| Soyo      | [幽默回旋镖合集](https://www.bilibili.com/video/BV1BzcGefE4d/)     | 123–128 s       | The complete 「既然如此，我来亲手结束它」, cross-checked against Chinese/Japanese subtitles, lip sync and ASR                                                              |
| Sakiko    | [惊世一跪](https://www.bilibili.com/video/BV1sf1uYWEV1/)           | 58.603–66.603 s | The last 8 seconds of the original; the user explicitly chose to keep all original audio of Soyo's preceding sentence ending and Sakiko's complete line, recorded as mixed |

The video has no audio track, and an independent original audio track drives the picture in sync; H.264, 24 fps, aspect ratio kept with black bars, no speed-up and no added blur. The MP3 decoded duration matches the cut segment; the encoding container may add tens of milliseconds of padding. Sakiko's source video is about 0.121 s shorter than the audio track, so the last frame is held to fill 8 seconds.

The production sources and SHA-256 are in `assets/finish-art/v2/sources-voices.json` and `sources-videos.json`; the temporary original clips, ASR, contact sheets and playback checks are in the ignored directory `output/ultimate-replacements-1030/`. The check script explicitly verifies the BV number, start and end and speaker label for these four specified sources, while other characters still enforce their own-voice constraint. Below are the earlier audit records; the descriptions of these four old finish voices are superseded by this section.

Browser verification of the four characters' actual finish playback: the decoded audio tracks are Anon 7.2 s, Soyo 5.0 s, Tomori 18.78494 s and Sakiko about 8.0 s, all at original speed with no blur in the picture; frame-rate quantisation may produce a duration difference of under one frame. All four next rounds begin about 315–359 ms after the matching audio track ends naturally. Anon was additionally verified for the super's original voice queuing before the finish art, and Sakiko for pause/resume mid-play. No page errors or 404s for material; all original illustrations, normal KO and other characters' media, and the P cast media are identical item by item to before the replacement.

# Super and finish voice audit (2026-10-28)

Audit scope: 16 playable characters, 22 normal/transformed supers, and 16 finish lines.
Each segment was compared against the original clip, continuous dialogue, lip sync and subtitles; the new transcription only helps determine sentence boundaries and cannot prove the speaker on its own.
File names, video titles, reacting characters on screen and old proof images were not used as identity evidence.

## Fixes in this round

| Item                      | Problem                                                 | Processing                                                                                                                                  |
| ------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Tomori normal P           | Anon's 「ん？」 was spliced in after the stutter        | BV1bg4y1e7Yb 3.65–7.35, keeping only Tomori's complete question 「一生、バンドしてくれる？」; video synced                                  |
| Tomori penguin P          | The processed cry cannot be confirmed as her            | Uses the above Tomori original question, keeping the penguin video and actions; audio and video sources recorded separately                 |
| Nyamu P (including stage) | It was actually Sakiko's 「よくご覧になって…」          | BV1XM62YsEgE 8.45–13.05, Nyamu's complete 「こんな張り付いた笑顔なんて、誰も欲しくない！」; video synced                                    |
| Nyamu U                   | Same root cause, mismatched to Sakiko                   | Same clip 3.82–5.05, Nyamu's own 「完璧？」                                                                                                 |
| Umiri P (including stage) | The tail carried the next sentence                      | BV1s65fzcEi2 59.55–62.80, keeping her complete sentence and dropping the next sentence's opening; video synced, see the Mujica audit record |
| Yuno finish               | It contained Nonoka's trailing voice and Ritsu's speech | BV1cWYx6bEM4 38.90–40.40, Yuno's 「とっくに出てるでしょ。」; 0.5 s of silence and the video's last frame added, total 2 seconds             |

## Audit results for the whole roster

The table below audits both P and the finish together. Real-character lines shared by normal and transformed forms are audited under the character they belong to; Mutsumi's transformation scream belongs to Mortis.

| Character       | P audit basis                                                                                                                                             | Finish audit basis                                                                                                                                                 |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Anon            | Anon's laugh from the original anime bathroom scene, original speed, not the 塔菲 version                                                                 | Anon's rebuttal in the naming argument; the shot is Rana reacting, the off-screen voice identified by the surrounding dialogue, with Taki's preceding line removed |
| Soyo            | Soyo herself shouting 「为什么要演奏春日影」, front-face lip sync and subtitles                                                                           | Soyo close-up, complete 「嫌だって言ってるよね」                                                                                                                   |
| Tomori          | The normal form's complete question with Tomori in close-up; the penguin shares that audited recording                                                    | Tomori in the computer classroom asking Anon to perform together, with body movement, bilingual subtitles and context                                              |
| Rana            | Character card, Rana's mouth and the parfait shot; 「バンド終わり」 and 「バイバイ」 are both the same person                                             | Rana's continuous close-up monologue 「居場所って…」                                                                                                               |
| Taki            | Character card, and continuous speech in the school-uniform/café close-ups 「わかった、曲は私が書く」                                                     | Taki at the stairway landing tells Tomori 「私は今、幸せだけど」                                                                                                   |
| Umiri           | Umiri's speech and complete sentence ending in the argument clip; shared by normal/stage                                                                  | Umiri at the dining table, with lip sync, subtitles and continuous sentences                                                                                       |
| Sakiko          | Sakiko's continuous speech in the god-declaration clip; no reaction lines included                                                                        | Sakiko close-up 「運命を甘んじて受け入れる必要はない」                                                                                                             |
| Uika            | Anime clips of Uika with her own reflection/inner self                                                                                                    | Uika/初音's own inner voice, not another character or a stream                                                                                                     |
| Mutsumi         | Normal-form Mutsumi's lines; the stage Mortis scream from the original clip, bound by transformation                                                      | Normal Mutsumi's complete refusal, cut before Mortis's rebuttal; shared by both forms                                                                              |
| Nyamu           | Changed to a complete sentence where Nyamu speaks continuously; Sakiko's reaction shot is not used to misidentify the speaker                             | Nyamu unmasking in that scene, her own 「本当のお顔はどんな顔？」                                                                                                  |
| Arale           | The blonde character speaking continuously in close-up                                                                                                    | Official anime Arale with yellow-pink twin tails speaking continuously                                                                                             |
| Ritsu           | Blue-haired Ritsu holding her stomach and speaking continuously; at the end Arale only reacts                                                             | Official character CM, Ritsu's front-facing monologue                                                                                                              |
| Miyako (藤都子) | Miyako running, making hand signs and chanting the nine syllables continuously                                                                            | Official character CM, her own declaration at the drawing desk                                                                                                     |
| Yuno            | The red-haired character opens front-facing then continues from behind, with bystanders' closed mouths checked at original resolution                     | Replaced with Yuno's spoken response; Ritsu's preceding line excluded                                                                                              |
| Nonoka          | Nonoka shouting continuously in profile, with Miyako only reacting at the end                                                                             | Official anime, her own cheer, ending before the next line starts                                                                                                  |
| Viola           | P changed to episode 3's 22:39 original audio, with only the official English subtitle and shot continuity, and no lip-sync check (see the section below) | Official character CM, Viola's facial lip sync and Chinese subtitles                                                                                               |

Per-clip sources and timings are kept in `assets/meme-media/manifest.json` and
`assets/finish-art/v2/sources-voices.json`. Detailed Mujica evidence is in the
[dedicated record](ultimate-voice-audit-mujica-2026-10-28.en.md). Temporary decoded frames, transcripts and browser results are kept in the ignored directory `output/`.
This round used cross-checking of picture, context and transcript, and did not treat automatic transcription as voice-print identification.

## Presentation and regression checks

The finish-art ending foreground's cut-in, hold and exit total 1000 ms, after which only the blurred background video remains.
The finish voice still plays out at original speed before the next match starts; on cut-in the loser's lines, summon sounds and transformation music stop, and the winner's complete move line and finish line play in order.
The settlement timing for a normal knockdown is unchanged. Baidu App/browsers still block video playback and keep the static finish art.

`npm run check` now also checks the actual file binding for 22 super forms and 16 finish lines, comparing the runtime MP3 with the content of the audited source file.
This check prevents wrong binding or missed updates in the runtime export; character identity still relies on the original-clip audit described above.

## 2026-10-30 Viola P changed to the anime's original audio (evidence note)

Viola's P voice and the super background video were both changed to the same shot at **22:39.000–22:44.046** of TV anime episode 3, playing the anime's own audio directly (5.05 s, original speed, loudness aligned to -18.6 LUFS like Viola's other voices).

This entry differs from the other rows in the table above: **no lip-sync/continuous-dialogue level check was completed**. The working model that made this change had no image input, so it could only check the timecodes, the shot continuity (no switch above the 0.3 threshold between 22:35 and 22:50) and the official English subtitle for 22:39.48–22:42.36, 「Was it MewType?」. The speaker of this segment therefore cannot be treated as a verified conclusion, and `sources.json` explicitly marks it as `Not lip-sync verified`. If a later browser or human review confirms the speaker is not Viola, the timecodes should be changed, or it should fall back to the archived CM material (`violaAnimeIgnition.mp3`, `viola-ignition-cutin.mp4`).

Export details: MP3 44.1 kHz mono 96 kbps, with the same start as the picture (decoded cross-correlation with the picture's audio 0.994 at a 0-sample offset); video 1138×640, 24000/1001 fps, CRF 24. The `npm run check` super-voice binding check still compares the SHA-256 of the runtime MP3 and the source MP3.
