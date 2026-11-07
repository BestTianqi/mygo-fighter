[简体中文](README.md) | **English** | [日本語](README.ja.md)

# Miyako · Giant Yokan

The story comes from episode 12 of 《BanG Dream! YUME∞MITA》: faced with Viola, Miyako draws out from her back the giant yokan that Ritsu gave her and shouts 「我说的就是，这样太无聊了」. The reference keeps the original's bamboo-sheath wrapper, off-white paper band, black lettering and dark red bean-paste cross-section. The game adapts the scene of drawing the yokan out to intimidate into a forward sweep that knocks the opponent down; the damage the sweep deals is game design.

The new skill 「巨羊羹·这样太无聊了」 uses ↓＋I, costs 25 resonance, deals 28 base damage, with a 310 forward range, 240 ms startup and a 3.2 s cooldown; it is subject to the shared combo and guard rules. Normal I, the other skills and the nine-hit super are kept. The character uses the existing heavy-attack charge, swing and recovery actions, with a full yokan and a swing arc layered on top.

The voice is cut from 0–8.4 s of an [animation clip](https://www.bilibili.com/video/BV1Zttf6KEzU/), spoken in full at original speed, without the other animation frames inserted later in that clip. The start and end times, the original sentence, the speaker check and the audio hash are in `sources.json`; the temporary frame-by-frame proof and the word-level alignment results are kept in the ignored directory `output/miyako-yokan/`.

To re-export: `python tools/build_miyako_yokan.py --source-video <原片.mp4>`; omit the argument to only repack the existing audio. The full asset build also feeds the same material in through `tools/build_meme_assets.py`, and runtime files are named by content hash.
