[简体中文](ultimate-voice-audit-mujica-2026-10-28.md) | **English** | [日本語](ultimate-voice-audit-mujica-2026-10-28.ja.md)

# Mujica super speaker audit (2026-10-28)

The scope is characters 5–9's normal supers, stage-form supers and finish ultimates. Identity is based on continuous lip sync, character appearance, subtitles and dialogue context in the downloaded original clip or the existing cut video; the actually exported MP3s were additionally re-transcribed at word level in Japanese with the small model. The transcription only helps check sentences and boundaries and is not used to identify the speaker on its own.

## Fixes

- Nyamu's normal/stage super originally used 0.35–3.75 s of BV1XM62YsEgE, which is actually blue-haired, golden-eyed Sakiko/Oblivionis saying 「よくご覧になって、この完璧な笑顔」. Changed to **8.45–13.05 s** of the same clip, where Nyamu/Amoris says the complete 「こんな張り付いた笑顔なんて、誰も欲しくない！」. At 9.8 s and 12.0 s the purple short hair, pink-purple eyes, lip sync and Chinese/Japanese subtitles all match. The newly exported MP3 transcription contains the complete sentence and no preceding Sakiko line.
- Nyamu's U had the same root cause and originally used 0.35–1.75 s, also Sakiko. Changed to **3.82–5.05 s** of the same clip, Nyamu replying 「完璧？」; the close-up of Nyamu's mouth at 3.95 s matches the word-level alignment of 3.92–4.72 s. The normal and stage U bindings are updated together.
- Umiri's normal/stage super originally used 59.65–63.05 s of BV1s65fzcEi2, with the start of the next sentence 「あれとは」 mixed in at the end. Changed to **59.55–62.80 s**, keeping Umiri's complete sentence 「喧嘩でしたら、練習の後で好きなだけどうぞ」. At 61.5 s and 62.4 s her mouth movement matches the bilingual subtitles; the new export's transcription no longer has 「あれとは」. The matching silent video is re-cut in sync.

Only the matching audio/video and directory metadata are updated; character skills and damage behaviour are unchanged. The source directory and the generated manifest are updated together so the next packing does not restore the wrong range.

## Audit results for all supers

| Character        | Form and material                  | Original range               | Speaker evidence / actual MP3 content                                                                                                                                                                                                                                     |
| ---------------- | ---------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Umiri 5          | Normal/stage super `meme_5_p`      | BV1s65fzcEi2 59.55–62.80     | Umiri speaking continuously in a close-up at the stairs, the complete 「喧嘩でしたら、練習の後で好きなだけどうぞ」. The next person's sentence opening has been removed.                                                                                                  |
| Umiri 5          | Both forms' finish `finish_5`      | BV1s65fzcEi2 120.05–123.65   | Umiri with black short hair and blue-green eyes stands at the dining table talking; at 120.5/121.5/122.5 s the subtitles and mouth movement match. The MP3 is only 「圧倒的なパフォーマンスで雑音を消し去ったのはお見事でした」.                                          |
| Sakiko 6         | Normal/stage super `sakikoGodFull` | BV13KXeYpEcL 34.45–40.45     | Sakiko in the tea room in continuous close-up, the complete 「神様などいない。ですから、私が神になります」. The next person's 「神？」 reaction is at about 41.08 s and is not included.                                                                                  |
| Sakiko 6         | Both forms' finish `finish_6`      | BV13KXeYpEcL 30.70–34.18     | The same tea-room Sakiko close-up with bilingual subtitles, the complete 「運命を甘んじて受け入れる必要はない」.                                                                                                                                                          |
| Uika 7           | Normal/stage super `meme_7_p`      | BV1oLVXzFEUW 50.20–54.90     | Uika crawling forward on the empty stage, the subtitles repeating 「小祥」; the actual MP3 only has her own repeated call 「さきちゃん」.                                                                                                                                 |
| Uika 7           | Both forms' finish `finish_7`      | BV1oLVXzFEUW 24.02–27.45     | In the same scene Uika talks with her own reflection/inner self; no second character speaks. The original subtitles and the exported content are 「悲劇ぶって同情集めるの、得意だよね」.                                                                                  |
| Mutsumi 8        | Normal super `meme_8_p`            | BV15W4y1A71C 7.10–15.20      | The existing cut first shows Taki as a listener shot, then turns to green-haired, golden-eyed Mutsumi speaking continuously at the piano; the actual MP3 is only Mutsumi's 「私、バンド楽しいって思ったこと一度もない」.                                                  |
| Mutsumi/Mortis 8 | Stage super `meme_8_stage_p`       | BV1uPf5YCE73 audio 0.95–3.05 | The existing cut is Mortis's red out-of-control scene, mouth open in a scream, then a cut to black; the actual MP3 is a continuous scream with no other person's lines. As previously required, the video uses 0.00–2.10 s of the original, and that offset is unchanged. |
| Mutsumi 8        | Both forms' finish `finish_8`      | BV1iPRXYpEmD 209.62–213.44   | Mutsumi sits on the sofa confronting Mortis, close-up with golden eyes, speaking continuously 「やってほしくないことばかりだった。あなたなんかいらない」. The next, Mortis, starts replying at about 213.75 s and is not included.                                        |
| Nyamu 9          | Normal/stage super `meme_9_p`      | BV1XM62YsEgE 8.45–13.05      | Nyamu speaking continuously front-facing at 9.8 s and 12.0 s, the complete 「こんな張り付いた笑顔なんて、誰も欲しくない！」; the previously misused Sakiko sentence has been removed.                                                                                     |
| Nyamu 9          | Both forms' finish `finish_9`      | BV1XM62YsEgE 32.35–34.70     | Nyamu with pink-purple short hair leans in to speak to the light-haired, masked Mutsumi; at 32.4/33.3/34.5 s the lip sync matches the subtitles. The actual MP3 is the complete 「本当のお顔はどんな顔？」.                                                               |

## Review records

Temporary evidence is in the ignored directory `output/ultimate-speaker-audit/`:

- `mujica-export-verification.json`: duration, SHA-256 and latest word-level transcription of the 12 actually exported recordings, covering the 11 unique super/finish recordings above and Nyamu's U that was fixed along the way.
- `nyamu-context.jpg`, `nyamu.jpg`: continuous frames of Sakiko's wrong sentence, Nyamu's reply and the newly chosen complete sentence, and Nyamu's finish line.
- `umiri-p.jpg`, `umiri-finish.jpg`, `sakiko.jpg`, `uika-p.jpg`, `uika-finish.jpg`, `mutsumi-p.jpg`, `mortis-p.jpg`: reference images for character, lip sync and subtitles.
- `nyamu-p-focus.json`, `umiri-p-focus.json`, `nyamu-finish-focus.json`: word-level timestamps of adjacent lines in the original clip.

The existing `output/finish-art-v2/voices/mutsumi-revised-proof.jpg` shows the cut point between Mutsumi's own two refusal lines and Mortis's reply afterwards. The original clips and reference frames of the other finish recordings are also in the same directory.

Mujica's finish ultimates share the character's own base recording across both forms; Mutsumi's finish voice is normal Mutsumi herself, while the stage super additionally uses Mortis's scream. The personality distinction is recorded explicitly here, and the normal Mutsumi lines are not labelled as Mortis-exclusive lines.
