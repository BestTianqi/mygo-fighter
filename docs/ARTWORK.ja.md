[简体中文](ARTWORK.md) | [English](ARTWORK.en.md) | **日本語**

# アートワークのワークフロー

`frontend/public/assets.json` は実行時マニフェストです。その `/media/...` 参照は `frontend/public/media/` にある内容アドレス方式のファイルを指します。これらのファイルは直接配信され、アプリケーションコードが base64 のメディアを埋め込むことはありません。

元の画稿、ソースシート、メタデータ、クレジットは `assets/` に保持しています。一部の過去の出典メモは、古い生成プレビューやスクリーンショットのパスに言及しています。それらは以前のアートワーク工程を説明したもので、現在のアプリケーションとチェックはルート README に記載しています。

フォルダの役割とパスの慣習は[ソースアセットカタログ](../assets/README.ja.md)を参照してください。MyGO のアクションシートとメタデータは `assets/characters/mygo/<character>/` に、ステージのジオメトリは背景と同じ場所の `assets/stages/stages.json` にあります。過去の設計メモは `assets/notes/` にまとめています。

通常のアプリケーション開発に必要なのは `npm ci` と `npm run build` だけです。Python や画像処理パッケージは不要です。

ソースシートを変更した後に実行時アートを再生成するには：

```sh
python3 -m pip install -r requirements.txt
python3 tools/build.py
npm run build
```

任意の Python ワークフローがソースアートを切り抜き、アンカーを取り、パックして、メディアファイル、マニフェスト、サーバーの地形カタログを書き出します。キャラクター用パッカーはアトラスとフレームマップを生成します。古い HTML プレビューの手順は、テンプレートが現存しないため削除されました。

生成されたレビュー用コンタクトシートと部分的なパックは Git 管理外の `output/artwork/` に置かれ、ソース側のバンド／キャラクターフォルダーを鏡写しにした構成になります。これらはアプリケーションや完全なアートワークビルドの入力ではありません。完全なソースシート、最終アトラス、フレームマップ、クレジットは `assets/` に残ります。ダウンロードした参考ページの HTML、JavaScript、CSS キャッシュは保持しません。MewType マニフェストの `review.proof` パスは `assets/` からの相対で `../output/artwork/` を指します。必要に応じて対応するキャラクターパッカーで再生成してください。

`python tools/build_riki_assets.py` は、立希のアクションソースが変わったときに、完全なエクスポートの前に選択済みのアトラスとフレームマップを再構築します。`python tools/build_rana_assets.py` は楽奈の選択ポーズをパックします。`python tools/build_mujica_assets.py --character umiri --form normal` と `python tools/build_mewtype_assets.py --character arale` は個別の形態をパックします。これらのコマンドはソースアトラスを更新するだけで、実行時マニフェストへ書き出すには `python tools/build.py` を実行します。

`node scripts/check-assets.mjs` を実行すると、アートを再生成せずに内容ハッシュ、マニフェスト参照、MyGO／ステージのソースパスを検査できます。ソースファイルを移動した場合は、そのアクションカタログとパッカーのパスも更新する必要があります。実行時の `/media/` 名はソースの位置ではなく内容に依存します。

## MyGO 立ち絵の更新

レビュー済みの正常な体型の MyGO 画稿 5 枚は `assets/characters/mygo/portraits-v1/` にあります。各透明 `*-source-v1.png` は全身立ち絵、正方形の顔クロップ、接地した待機フレームを提供し、Mujica の立ち絵工程と揃えています。`crops.json` は、タイトに切り抜いた人物に対するレビュー済みの顔のフレーミングを記録します。既存の攻撃・移動・変身シートはそれぞれ独立して残ります。

これらのソースを更新した後は、MyGO の立ち絵だけを再生成します：

```sh
python tools/build_mygo_portraits.py
node scripts/check-assets.mjs
```

エクスポーターは参照済みの実行時ファイルをすべて保持し、内容アドレス方式の立ち絵ファイルを追加し、マニフェストから参照されなくなった生成メディアだけを退役させます。通常の完全なアートワークビルドにもこれらの立ち絵が含まれます。メニュー、選択プレビュー、通常のフィニッシュ立ち絵はキャラクター立ち絵を使い、選択カードと HUD は明示的な顔クロップを使います。そよと初華の動画フィニッシュ静止画はそのまま維持します。

MewType は `assets/characters/mewtype/portraits-v1/` で同じワークフローを使い、各キャラクターの最初の仮想衣装を用います。`python tools/build_mewtype_portraits.py` を実行すると、5 枚の立ち絵、正方形の顔クロップ、待機アトラスを更新します。既存の移動・攻撃シートは独立して制作されたアセットのままです。
