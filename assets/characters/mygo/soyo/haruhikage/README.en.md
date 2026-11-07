[简体中文](README.md) | **English** | [日本語](README.ja.md)

# Soyo's Super Asset: Why Did You Play Haruhikage?

Search and verification date: 2026-10-19. The landscape video and the original audio track are already wired into the offline web version of Soyo's super.

## Organized files

| File                                     | Purpose                         | Contents                                                                                                                                                     |
| ---------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `soyo-haruhikage-cutin.mp4`              | Landscape super cut-in clip     | 58.8–61.4 s of the original scene, 2.6 s, 852×480 encoded resolution / 30 fps, with the original audio track                                                 |
| `soyo-haruhikage-voice.mp3`              | Plays the super line on its own | The same original audio, 44.1 kHz mono / 96 kbps; loudness normalized with a very short fade in and out, keeping the scene ambience                          |
| `soyo-haruhikage-portrait-reference.mp4` | Alternative footage reference   | The vertical short video uploaded by MyGO_AveMujica, with the original video and audio encoding kept                                                         |
| `soyo-haruhikage-finish.webp`            | Round-victory ultimate art      | Close-up of the open-mouth shout at 1.8 s of the landscape super clip (60.6 s of the source video), lossless frame grab, original picture and subtitles kept |

At round end, Soyo uses this video frame in place of the action portrait. The banner image fades out on the right to connect with the victory text, and the originally dark video is brightened while it is shown; the source image is not recolored, and it is embedded offline and preloaded before the match starts.

If you use the landscape video's own audio track, do not play the MP3 at the same time, or the line will be doubled. When wiring into the existing Web Audio voice system, a muted video plus the MP3 can be used.

## Online sources

1. **Preferred landscape footage and audio**: [【Source of all evil / 4K60fps】Why did you play Haruhikage?!](https://www.bilibili.com/video/BV1Va67YjEPr/), uploaded by 编新述旧. The page is 90 seconds long, and the 58.8–61.4 s shot of Soyo turning and shouting plus the Chinese subtitles were verified. The title says 4K60, but the material the public playback API actually served this time is **852×480**, and the delivered file is labeled with the actual resolution.
2. **Vertical alternative**: [Why did you play Haruhikage (なんで春日影やったの)](https://www.bilibili.com/video/BV19F411y7FA/), uploaded by MyGO_AveMujica. The page is labeled 8 seconds; the actual media duration depends on the player. It already carries a project mark and the picture is narrower, so it is kept as a reference.
3. **Green-screen candidate, link only**: [Why did you play Haruhikage.GB + usage examples](https://www.bilibili.com/video/BV1Hx4y1X7VF/), uploaded by 跃亮. The page explicitly labels GB material and usage examples, which suits later keying experiments; this video was not extracted this time, its green-screen timing was not verified, and it is not the source of any existing file.

## Verification

- The landscape source clip was checked frame by frame; the line's subtitle reads “为什么要演奏春日影” (“Why did you play Haruhikage”).
- All three delivered files were fully decoded and checked; the web playback and audio decoding results are recorded in `verification.json`.
- The exact crop ranges, source links and file checksums are in `sources.json`.

## In-game integration

Pick Soyo (长崎素世), and at 100 resonance press P (2P numpad −, or the “春日影大招” button on touch). With sound effects on, the original audio plays; the video stays muted to avoid doubling the line. The three hits deal 8/12/28, usually 41 in total after combo scaling; the last hit knocks down. Pause also pauses the video and voice, and resuming continues from the paused position; a hit interruption, round end or restart clears playback. Both video and audio are embedded in `index.html` and need no network.
