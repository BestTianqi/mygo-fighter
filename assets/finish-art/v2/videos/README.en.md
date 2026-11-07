[简体中文](README.md) | **English** | [日本語](README.ja.md)

# Ultimate finish background videos

Silent clips for 16 characters, using the source clips and start/end times already verified in `../sources-voices.json`; the matching records are in `../sources-videos.json`. The speaker is never swapped, nothing is sped up or repeated, and the original audio line and its original speed are kept.

The videos are exported as 640×360, 24 fps H.264 with no audio track. At runtime they are shown blurred below the ultimate illustration and follow the actual playback position of the finish voice; any tail where the original audio is padded with silence is filled in with a freeze frame. If a video fails to load, the ultimate illustration is still shown, and the scene change is driven by the voice's completion state.

To re-cut them, run `python tools/build_finish_videos.py --source-dir <包含BV编号.mp4的原片目录>`, then run `python tools/build_finish_assets.py` to pack them. The source clips do not need to go into the runtime assets.
