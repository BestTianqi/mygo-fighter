**简体中文** | [English](WEB_ASSETS.en.md) | [日本語](WEB_ASSETS.ja.md)

# Web 发布素材

`frontend/public/` 仍是开发与 `npm run check` 使用的原始运行素材。源美术保留在 `assets/` 下。

用下面的命令生成体积更小的发布图片：

```sh
python tools/optimize_web_assets.py
```

请提交生成的 `assets/optimized-web/manifest.json` 及其 `media/` 文件。清单记录原始与优化后的 SHA-256 哈希、体积、尺寸和质量。只有被更小版本替换的图片才会出现在清单里。

生成器保留完整图像分辨率，图集使用 WebP 质量 74，其他图片使用 94，编码方式为 4。透明度使用 17 个档位：完全透明与完全不透明的像素保持不变，中间透明度的变化最多 8/255。这会略微降低图像保真度，但不改变精灵图的几何。

`npm run build` 与 `npm run build:pages` 会校验这些哈希，把原始 public 文件复制到被忽略的 `output/web-public/`，替换选中的图片，并把所有嵌套 `assets.json` 的引用改写为新的内容哈希 URL。音频、视频、尺寸、帧坐标与原始文件都保持不变。Vite 生产构建使用这个准备好的目录，开发构建使用原始 public 文件。请使用 npm 构建命令，以确保预处理在 Vite 之前运行。

改动原始媒体或素材引用后，请重新运行优化命令。替换文件过期或缺失会让构建失败并给出该提示。每次前端构建还会拒绝大于 **50,000,000 字节** 的 `frontend/dist/`，其中包含脚本、样式、HTML 与全部媒体。现有的模拟与后端构建步骤保持不变。
