# 工作约定

- 修改前先同步远端：获取 `origin/main`，查看新增提交，再合入当前分支；保留用户和其他贡献者的工作。
- 修改完成后先检查和验证，再提交、推送，并确认本地与远端同步。推送前若远端又有新提交，先合入并复验。不要使用强制推送或丢弃未提交改动。
- 保留 React / TypeScript 前端、Scala 联机后端和共享 TypeScript 战斗内核的现有架构。
- 保留原版人物、动作、地图、特效和音视频。`assets/` 是素材源，`frontend/public/` 是运行素材；清理前检查引用。生成输出和测试截图放在已忽略的输出目录。
- 基础检查使用 `npm run check`、`npm run build`；涉及网页发布时另用 `npm run build:pages` 和 `python tests/pages_browser.py` 检查项目子路径。
