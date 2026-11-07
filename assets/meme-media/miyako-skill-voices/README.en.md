[简体中文](README.md) | **English** | [日本語](README.ja.md)

# Miyako Skill Voices

U, I and O now use three short lines from Miyako's own livestream, while super P continues to use the original 「临兵斗者皆阵列在前」 recording, video and finish art.

| Key          | Voice        | Clip time       |
| ------------ | ------------ | --------------- |
| U · 分镜飞页 | 完成啦！     | 1.60–4.38 s     |
| I · 伏笔机关 | 原谅一下啦～ | 66.70–68.12 s   |
| O · 截稿线   | 太棒了！     | 111.62–113.30 s |

Source: [草女士家的耳廓狐 ·【中字/藤都子】直播画了波堤巧克酱，对自己最新力作发表感想](https://www.bilibili.com/video/BV1Cbn66MEPj/); the original stream link is in the uploader's description: [藤都子绘画直播](https://www.youtube.com/watch?v=2h5SuCM4f1s). The Chinese subtitles and the avatar were used to check the lines and the speaker; ASR only helped locate them.

The recording keeps its original speed and is standardised to 44.1 kHz mono MP3, normalised with `loudnorm=I=-18:TP=-3:LRA=7`, with short fades at both ends; the finished level was checked. Source, CID, time ranges and the source fingerprint are kept in `sources.json`. The previous skill recordings remain in `assets/meme-media/recordings/`.

`tools/build_meme_assets.py` overwrites the U, I and O recordings from this directory; the throw still reuses O's voice alias, and the battle parameters are unchanged.
