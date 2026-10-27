# 奥义终结背景视频

16个角色的静音片段，直接使用 `../sources-voices.json` 中已核对的原片和起止时间；对应记录见 `../sources-videos.json`。未更换说话人、加速或重复播放，音频原句和原速保持不变。

视频以640×360、24帧H.264导出，不包含音轨。运行时在奥义插图下方虚化显示，并跟随终结语音的实际播放位置；原音频补静音的尾部用定格补齐。视频加载失败时仍展示奥义插图，换场由语音完成状态控制。

重新剪取时执行 `python tools/build_finish_videos.py --source-dir <包含BV编号.mp4的原片目录>`，然后执行 `python tools/build_finish_assets.py` 打包。原片无需进入运行文件。
