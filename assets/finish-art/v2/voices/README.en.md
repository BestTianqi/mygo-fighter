[简体中文](README.md) | **English** | [日本語](README.ja.md)

# Finish ultimate voices v2

One finish voice for each of the 16 base characters. On 2026-10-30 the result videos and voices of Anon, Soyo, Tomori and Sakiko were replaced with sources the user specified; the material used to unleash the super and the illustrations are unchanged. The binding keys are `finish_0` through `finish_15`; the source, original line, speaker verification evidence and start/end times are in `sources-voices.json` in the parent directory.

All audio keeps its original speed, mono MP3, loudness around -18 LUFS. The identity verification of the old anime lines is kept; this time Anon and Tomori are user-specified memes, and no official voice-actor original is claimed. Sakiko uses the last eight seconds of the source clip, and the user explicitly approved keeping the tail of Soyo's preceding line plus Sakiko's complete original line, so it is marked as mixed; Soyo is still one complete line from the anime itself.

Apart from the mixed dialogue segment the user specified for Sakiko, Mujica still shares each character's own base voice; the Mutsumi entry is the ordinary Mutsumi, and it is not labelled as a Mortis-exclusive line. The penguin and the normal Tomori share the Tomori meme clip specified this time. These tracks are selected by the knockout finish event and do not affect the super move's own audio.

Temporary web search results, downloaded source clips, source metadata, word-level ASR alignment results and verification frames are kept in the ignored directory `output/finish-art-v2/voices/` and do not go into the runtime assets. The source clip check is the basis for character identity; ASR only helps with alignment. Uika's line is the anime's own reflection/inner dialogue and is still the character's own voice.

The 2-second silence padding of the earlier Anon and Soyo clips has been replaced by the sources specified this time; Yuno's complete 1.50-second reply gets another 0.50 seconds of silence, with the background frozen on the last frame; the characters' speaking speed is left as it was.

| ID  | Character | Line                                                                  | Duration |
| --- | --------- | --------------------------------------------------------------------- | -------- |
| 0   | anon      | user-specified 唐笑 laugh, one complete loop                          | 7.2s     |
| 1   | soyo      | 既然如此，我来亲手结束它。                                            | 5.0s     |
| 2   | tomori    | user-specified 哒啦／bibi meme, first eight seconds                   | 8.0s     |
| 3   | rana      | 归处啊，还会有人重新创造出来的。                                      | 3.8s     |
| 4   | taki      | 我现在就很幸福啊。                                                    | 2.9s     |
| 5   | umiri     | 凭绝佳的表演把闲话一扫而空，实在精彩。                                | 3.6s     |
| 6   | sakiko    | last eight seconds of the source clip, Soyo and Sakiko original audio | 8.0s     |
| 7   | uika      | 你很擅长假装悲剧来博取同情吧。                                        | 3.43s    |
| 8   | mutsumi   | 你做的每件事都不是我期望的。我不需要你。                              | 3.82s    |
| 9   | nyamu     | 你真正的面孔，是什么样的？                                            | 2.35s    |
| 10  | arale     | 就算可能被误解，沉默下去也无法传达！                                  | 4.38s    |
| 11  | ritsu     | 能站上舞台，多亏了大家。                                              | 2.56s    |
| 12  | miyako    | 能做的事情，我全都会去做！                                            | 2.52s    |
| 13  | yuno      | 早就表现出来了吧。                                                    | 2.0s     |
| 14  | nonoka    | 没有弹错，弹出来啦！                                                  | 3.15s    |
| 15  | viola     | 律已经没用了呢。                                                      | 2.8s     |
