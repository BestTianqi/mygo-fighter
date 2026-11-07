[简体中文](README.md) | [English](README.en.md) | **日本語**

# インターフェース書体

3 つの `noto-serif-sc-ui-*.woff2` は **Noto Serif SC** のローカルな可変ウェイトのサブセット（ウェイト 400–900）です。鋭くコントラストの高いセリフ体で、メインバナー、見出し、キャラクター名、ボタンなどのインターフェース文字に共通して使われています。Vite がこれらのソースをバンドルするため、インターフェースは外部フォントに依存しません。

サブセットは、ビジュアル改訂の時点で `frontend/src/` に存在した CJK 文字に、ラテン文字、数字、インターフェース用の句読点を加えたものです。新しい文言や文字を追加したときは、サブセットとその CSS unicode range を拡張してください。それまでの間、不足するグリフは Songti/SimSun/serif のフォールバックで補われます。

- 書体：https://fonts.google.com/noto/specimen/Noto+Serif+SC
- 上流：https://github.com/google/fonts/tree/main/ofl/notoserifsc
- 著作権：2017–2024 Adobe
- ライセンス：SIL Open Font License 1.1。ゲームと一緒に `frontend/public/licenses/noto-serif-sc-OFL.txt` で配布しています。
