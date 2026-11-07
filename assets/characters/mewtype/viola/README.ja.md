[简体中文](README.md) | [English](README.en.md) | **日本語**

# 薇欧拉／Viola（id 15）

『BanG Dream! YUME∞MITA』薇欧拉の、通常体型による初版 2D 対戦格闘素材です。内蔵の **imagegen** で描画しています。透過原画はこのディレクトリに残し、パッケージ時は完全に連結した人物だけを切り出して統一したワールド高に縮小し、足裏アンカーを設定します。手足の接ぎ合わせやポーズの引き伸ばしは行いません。

## 公式デザイン参考

- [MewType 公式『キャラクター CM：薇欧拉』](https://www.bilibili.com/video/BV11uK36xEs2/)、31 秒、cid `39994722827`。
- 4 秒のプロフィールカードで衣装全体、8 秒と 20 秒で顔を確認できます。元動画と照合コンタクトシートは `output/viola-art/` にキャッシュしています。
- 深いフォレストグリーンの長髪、左側に単一のお団子と姫カット、右側に黒のクロスピン、左側に銀白の三角ピンとバー型ピン。オリーブゴールドの瞳、口の右下に小さなほくろ。チャコールブラウンの制服、クリーム色の長方形チェストパネルと花形バッジ、灰紫の細プリーツスタンドカラー、金色のパイピングと 4 つの腰ボタン、短いプリーツスカート、黒の短靴下、オリーブ色のローファー。
- アニメ版の制服姿を採用しています。コード上の `virtual` は既存キャラクター素材のグルーピングキーであり、バーチャル演出用の衣装を新たに追加したという意味ではありません。

## 実際の作画とパッケージ

| ファイル                                             | 内容                                                                                                                                        |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `portrait-source-v1.png`                             | 1024×1536 の透過全身立ち絵。待機原画も兼ねます                                                                                              |
| `actions-locomotion-source-v1.png`                   | 1536×1024、4×2 で計 8 枚：歩行 2 コマ、ダッシュ、立ちガード、しゃがみガード、ジャンプ、被弾、ダウン                                         |
| `actions-combat-source-v2.png`                       | 1536×1024、4×2 で計 8 枚：J1 掌打、J2 横薙ぎ、J3 昇龍アッパー、K サイドキック、U スマホ撮影、I しゃがみ編集、O 前押し、P スマホを掲げて配信 |
| `actions-combat-source-v1.png`                       | 向き修正前の原稿アーカイブ。実行時には使用しません                                                                                          |
| `manifest.json`                                      | 17 枚の実作画の出典、SHA-256、正規フレーム名エイリアス、参考資料                                                                            |
| `virtual-runtime.webp` / `virtual-frames.json`       | 17 枚の完全な作画の実行時アトラスと命名フレーム                                                                                             |
| `portrait.webp` / `face.webp` / `idle-runtime.webp`  | キャラ選択の立ち絵、正方形の顔、単体の待機画像                                                                                              |
| `../../../../output/artwork/mewtype/viola/proof.png` | 17 枚の独立作画の照合コンタクトシート（パッケージ用スクリプトが生成、バージョン管理外）                                                     |

J の 3 段、強攻撃、U/I/O/P はいずれも異なる原画を使用しています。発生・硬直・低姿勢・空中などの移行フレームは、`manifest.json` 内の明示的なエイリアスでこれらの完全な作画を再利用しており、エイリアスは新しい作画として数えていません。人物のすべての部位に実際の透過余白があり、両方の靴も完全で、アクションはアトラス単位のフレーム切り替えで表現します。

再ビルド：`python tools/build_viola_assets.py`。ゲーム全体のビルドは出力前に `install_viola_assets(assets)` を呼び、`characters[15]`、`mewtypeForms['15']`、`mewtypePortraits['15']` だけをインストールし、既存キャラクターは上書きしません。奥義アートは既存の finish 素材ビルダーがインストールします。

## 描画プロンプト群

以下は今回の内蔵 imagegen で使用した制作制約と最終プロンプトの要点です。今後の一貫性のために残します：

1. **全身立ち絵**：`Production full-body portrait and idle sprite of Viola / ビオラ from BanG Dream! YUME∞MITA, matching the official profile and close-up references. Normal seven-head-tall anatomy, slim human proportions, not chibi. Preserve dark forest-green waist-length hair, single left bun, hime-cut bangs, black crossed right clips and silver triangular/bar left clips, olive-gold eyes and tiny right beauty mark. Exact charcoal/ivory/lavender/gold school outfit, pleated skirt, black ankle socks, olive loafers. Composed sly smile, small dark smartphone, complete head/hair/hands/shoes. Clean cel-shaded anime line art, consistent subdued palette. Centered isolated whole figure, genuine transparent background, no text, instruments, floor, shadow or glow.`
2. **移動・防御シート**：`Eight independent complete full-body poses of the same reference Viola, 4 columns × 2 rows, transparent gutters, facing screen right. Top: walking contact, walking passing, forward dash, standing guard. Bottom: crouching guard, rising jump, recoiling hit reaction, side-lying knockout. Normal anatomy, consistent face/outfit and palette, no cropped body, no labels or shared effects.`
3. **攻撃シート**：`Eight different complete attack poses, same exact character, outfit and normal proportions, 4 × 2 transparent grid. Top: short open-palm first jab, twisting horizontal backhand second jab, rising elbow third finisher, forward side kick heavy. Bottom: eye-level smartphone recording U, crouching smartphone edit I, long lunging dismissal palm O, raised-smartphone commanding P. All target screen right, fully visible hair/hands/shoes, no extra instruments, glow, text or background.`
4. **向き修正**：`Precise sprite sheet correction: redraw only row1/column1 and row2/column1 toward screen right, with back/hair at left and forward palm or phone at right. Preserve six other figures, cell layout, character identity, colors, full bodies and real alpha background. Keep the rejected v1 as archive; install corrected v2.`

スキル道具と発動ポーズは対戦格闘ゲーム向けの翻案であり、アニメ本編でキャラクターが超能力を持つという設定ではありません。
