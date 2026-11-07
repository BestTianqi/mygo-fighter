[简体中文](README.md) | [English](README.en.md) | **日本語**

# 素材ディレクトリと呼び出しマップ

美術、ボイス、動画、またはそれらのゲーム内バインディングを変更するときは、ここから始めてください。ソースはこのディレクトリにあり、実行時マニフェストは `frontend/public/assets.json` です。

## フォルダの役割

| フォルダ                                 | 役割                                                                                                       |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `characters/mygo/<character>/`           | MyGO のソース分解シート、アクション選定、フレームマップ、パック済みソースアトラス                          |
| `characters/mygo/tomori/voices/`         | ペンギンのボイスクリップと `penguin-voices.json` のタイミング／出典カタログ                                |
| `characters/mygo/soyo/haruhikage/`       | 長崎そよの必殺技ボイス、カットイン動画、フィニッシュ静止画、出典                                           |
| `characters/mygo/jab-actions.json`       | 千早愛音、長崎そよ、高松燈が共有する弱攻撃コンボの選定                                                     |
| `characters/mujica/<character>/`         | 通常／ステージ形態のアクションシートとキャラクター別マニフェスト                                           |
| `characters/mujica/mask-transformation/` | 共有のマスク変身アート                                                                                     |
| `characters/mewtype/<character>/`        | 仮想形態のシート、アクションマニフェスト、薇欧拉（Viola）のアート                                          |
| `characters/*/portraits-v*/`             | レビュー済みの立ち絵ソース、顔クロップ、クロップメタデータ                                                 |
| `characters/poppinparty/`                | オフラインのキャラクター下書き、立ち絵、キーポーズ、ボイス。プレイ可能なキャラクターとしては登録されません |
| `meme-media/<feature>/`                  | キャラクター横断のスキル録画、カットイン、抽出ポーズ、出典                                                 |
| `finish-art/`                            | KO アートと `v2/` の奥義アート、ボイス／動画ソース、カタログ                                               |
| `stages/`                                | 背景と `stages.json` のジオメトリ、キャンパスの出典を含みます                                              |
| `fonts/`                                 | ローカル UI フォントとライセンス。`frontend/src/styles.css` から直接読み込みます                           |
| `reference/`                             | 共有のビジュアルリファレンスと顔修正ガイド                                                                 |
| `notes/`                                 | 過去の設計・実装ノート。実行時設定ではありません                                                           |

キャラクターのファイル名は接頭辞を保持するため、書き出し物を識別できます。`riki` は椎名立希（Taki）のアートワークキーです。実行時のロスターでは `taki` を使います。以前のソース改訂を残しているのは、選定済みのポーズやレビュー済みの比率がそれらに依存する場合があるためです。

## ソースがゲームに届くまで

```text
assets/ source files + selection/provenance catalogs
  -> tools/build.py and specialized packers
  -> frontend/public/assets.json: semantic keys -> /media/<content hash>.<ext>
  -> frontend/src/assets/loadAssets.ts: resolve deployment base + hydrate band forms
  -> frontend/src/assets/bandArt.ts and GamePage runtime/components
```

マニフェストが実行時バインディングの正です。ゲームコードは `penguinVoices.penguinKick` のような意味的なエントリを選び、手書きのコンテンツハッシュやこのソースフォルダへのパスを使うことはありません。フォントは CSS から直接読み込む例外です。共有の戦闘カーネルと Scala バックエンドはソースアートを読みません。`tools/build.py` はステージ地形カタログも `scripts/stages.json` に書き出します。

| ソースグループ               | `tools/` 配下のパック入口                                                                            | 実行時マニフェストキー                                                                                                                                                | `frontend/src/` 配下のゲーム側消費コード                                                                                                                  |
| ---------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MyGO のアクションシート      | `build.py`。ソースアトラス更新：`build_riki_assets.py`、`build_rana_assets.py`                       | `characters`, `anonNormals`, `anonActions`, `soyoActions`, `tomoriActions`, `penguin`, `jabActions`, `milkDragon`, `soyoTensora`, `ranaParfaitActions`, `ranaParfait` | `assets/bandArt.ts`, `pages/GamePage/runtime/rendering/`                                                                                                  |
| Mujica／MewType のアクション | `build_mujica_assets.py`、`build_mewtype_assets.py`、`build_viola_assets.py`、`build_mask_assets.py` | `mujicaForms`, `mewtypeForms`, `mujicaMaskForms`                                                                                                                      | `assets/bandArt.ts`, `pages/GamePage/runtime/rendering/battleScene/`                                                                                      |
| 立ち絵と顔クロップ           | `build_mygo_portraits.py`、`build_portrait_assets.py`、`build_mewtype_portraits.py`                  | `mygoPortraits`, `mujicaPortraits`, `mewtypePortraits`, `characters.*.portrait`                                                                                       | `assets/bandArt.ts`, `pages/GamePage/components/CharacterPortraitPreview.tsx`, `pages/GamePage/runtime/rendering/drawEntrances.ts`                        |
| スキル録画とカットイン       | `build_meme_assets.py`。ペンギンと春日影は `build.py` からも接続されます                             | `memeSkills`, `memeVoices`, `penguinVoices`, `soyoVoices`, `summonVoices`, `transformMusic`, `memeCrawlForms`, `sakikoCustomerActions`, `soyoSuperVideo`              | `pages/GamePage/runtime/audio/AudioDirector.ts`, `pages/GamePage/runtime/rendering/`, `pages/GamePage/components/BattlePanel/UltimateBackgroundVideo.tsx` |
| フィニッシュ演出             | `build_finish_assets.py`、`build_finish_videos.py`                                                   | `finishArts`, `ultimateFinishes`, `finishVoices`, `soyoFinishArt`, `uikaFinishArt`                                                                                    | `pages/GamePage/components/BattlePanel/FinishOverlay.tsx`, `pages/GamePage/runtime/audio/AudioDirector.ts`                                                |
| ステージ背景とジオメトリ     | `build.py` 経由で `build_stage_assets.py`                                                            | `backgrounds`, `stages`                                                                                                                                               | `pages/GamePage/runtime/rendering/createStageRenderer.ts`、キャラクター選択                                                                               |

## ファイルやバインディングを探す

リポジトリのルートで実行します：

```sh
npm run assets:find -- penguin
npm run assets:find -- mujicaForms.6
npm run assets:find -- ultimateFinishes
```

このコマンドはソースのファイル名と実行時マニフェストのパスを検索し、一致した各バインディングについて実際にデプロイされるメディアのファイル名を表示します。メディアハッシュも指定できます。結果はそれぞれ独立した検索であり、ソースファイルがクロップ済みまたはパック済みの書き出し物とバイト単位で同一であることを主張するものではありません。マニフェストの数値キーは 0 始まりのロスター ID です。識別情報には `frontend/src/game/data/roster.ts` を、バンドや形態の選択には `assets/bandArt.ts` を使ってください。

## パスの規則と素材の更新

- アクションカタログの `file`、`overrides`、`sourceFiles` エントリは `assets/` からの相対パスです。例：`characters/mygo/anon/anon-extra-mobility-v1.png`。
- ステージの `file` エントリはリポジトリからの相対パスです：`assets/stages/...`。
- 録画カタログは、それぞれ定められたリポジトリ相対またはカタログ相対の規則を保ちます。これらのパスを編集する前に、所有するパッカーの解決処理を確認してください。
- 実行時の `/media/` URL はデプロイされたアプリケーションのベースからの相対です。プロジェクトのサブパスは `loadAssets.ts` が扱います。
- MewType マニフェストの `review.proof` エントリは、`../output/artwork/` を指す `assets/` 相対のパスです。任意のレビューファイル、コンタクトシート、スクリーンショットは無視対象の `output/` に置きます。

ソースを編集したら、必要に応じて対応するソースパッカーを実行し、その後 `python3 tools/build.py` で書き出します。対象を絞った立ち絵／フィニッシュ用スクリプトは既存のマニフェストを更新できます。[美術ワークフロー](../docs/ARTWORK.md) を参照してください。通常のアプリケーションビルドはアートを再パックせず、Python 依存も必要としません。

バインディングを変更したら `npm run check` と `npm run build` を実行してください。アセット検査は、実行時コンテンツハッシュ、バンド横断のソースアクショングループ、ペンギンボイスのパス、ステージソースを検証します。ソースを移動するときは出典と元メディアを保ち、カタログのパス、パッカー、下書きの参照、この呼び出しマップをまとめて更新してください。
