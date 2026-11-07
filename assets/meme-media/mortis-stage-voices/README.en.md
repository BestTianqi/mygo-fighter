[简体中文](README.md) | **English** | [日本語](README.ja.md)

# Mortis Stage-Form Skill Voices

| Key          | Voice                  | Source and trim                                                                                                              |
| ------------ | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| U 替身代演   | Short scream           | [睦头人尖叫一小时纯享](https://www.bilibili.com/video/BV1uPf5YCE73/), cid 28039907968, 0–0.95 s                              |
| I 装死反击   | Trust me               | [Ave Mujica Mortis：「小睦已经死掉了」第2P](https://www.bilibili.com/video/BV1j8f5YdE6n/?p=2), cid 28038924686, 40.7–42.45 s |
| O 牵线留人   | Uncontrolled long howl | Scream video, 0.95–3.05 s                                                                                                    |
| H 戴面具变身 | I hate you             | Mortis clip, part 2, 36.5–39.8 s                                                                                             |

After transforming, P「Mortis·失控尖叫」uses the 0.95–3.05 s howl recording from O. As the user requested, the video trim starts 2 seconds earlier: since the original start of 0.95 s leaves less than 2 seconds, the clip runs from 0 s of the original video to 2.1 s, keeping the original segment length and speed. Five expanding sound waves fire within one second. The super's scream uses its own channel and is not cut off by a follow-up skill; after a pause it resumes from where it stopped. The original dialogue video 「睦和她的乐队由我守护」is kept in the source material directory.

Every frame was checked for Mortis's stage costume, lip sync, subtitles and the scream scene, with Japanese ASR helping to locate them. The scream is the out-of-control Mortis after the disbandment announcement in anime episode 4, and only the first 10 seconds of the source video were read. The author, exact timings and the SHA-256 are recorded in sources.json.

All four keep their original speed and pitch, matched to -19 LUFS with very short fades at both ends. H and the stage form's throw are matched to the form, and the normal form keeps its original voice; the ↓U two-years-old and ↓I burger material is kept. The channel is independent of the opponent's, supports muting and resuming after a pause, and is cleared on restart and round end. The original source files are kept, and runtime uses the already packaged local media files.
