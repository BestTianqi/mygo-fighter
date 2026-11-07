**简体中文** | [English](README.en.md) | [日本語](README.ja.md)

# 界面字体

三个 `noto-serif-sc-ui-*.woff2` 文件是 **Noto Serif SC** 的本地可变字重子集（字重 400–900）。这套笔画锐利、对比度高的衬线字族统一用于主横幅、标题、角色名、按钮等界面文字。Vite 会打包这些源文件，因此界面不依赖外部字体。

子集覆盖视觉改版时 `frontend/src/` 中出现的 CJK 字符，以及拉丁字母、数字和界面标点。新增文案或字符时，需要扩充子集及其 CSS unicode range；在此之前，缺失字形由 Songti/SimSun/serif 回退字体覆盖。

- 字体：https://fonts.google.com/noto/specimen/Noto+Serif+SC
- 上游仓库：https://github.com/google/fonts/tree/main/ofl/notoserifsc
- 版权：2017–2024 Adobe
- 许可：SIL Open Font License 1.1，随游戏一起分发于 `frontend/public/licenses/noto-serif-sc-OFL.txt`。
