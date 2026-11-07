[简体中文](README.md) | **English** | [日本語](README.ja.md)

# Poppin'Party Original Voices

30 clips in total, 6 per member, for entry, U/I/O/P and the finish respectively. Backward derivatives reuse the voice of the corresponding base skill. For now they are only used by the offline asset pack and the preview page and are not yet wired into the game roster.

The sources are the character self-introductions and “1-minute intro” videos posted by the official Bilibili account “BanGDream梦想协奏曲”; the content is the original voice of characters from BanG Dream! Girls Band Party. These are not newly recorded lines, nor generated or voice-changed audio. The original background sound is kept, and some clips include musical accompaniment.

`sources.json` records each clip's original video BV number, title, uploader, speaker, voice actor, original line, Chinese meaning, start and end seconds and playback duration. Everything was cross-checked against the official character marks, the original picture and subtitles, and per-clip transcription. Errors in names, band names and the like from automatic transcription were corrected against the original video; answers from different characters are never mixed into one person's skill voices.

All clips play at original speed, mono 44.1 kHz MP3 80 kbps, loudness target -18 LUFS, with 8/20 ms fades at the edges. Kasumi's P uses the “star beat” narration from the self-introduction, excluding the song section mixed into the retrospective video. Rimi's finish keeps the complete sentence asking for support.

Run this in the project root:

```powershell
python tools/build_poppinparty_voices.py --source-dir output/poppinparty
node tools/build_poppinparty_drafts.mjs
```

The source videos are named `BV号.mp4` and placed in the ignored `output/`; the full source videos are not put into the game assets. Open `preview.html` one level up to audition each clip; only one plays at a time.
