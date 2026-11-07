[简体中文](BANDS.md) | [English](BANDS.en.md) | **日本語**

# バンド

再利用可能なキャラクター受け入れテンプレートと読み取り/作成コマンドについては、[新キャラクターのテンプレート](characters/README.ja.md) を参照してください。呼び出せるワークフローは `.agents/skills/mygo-add-character/SKILL.md` です。

**バンド（band）** は、独自のキャラクター、技、形態、プレイスタイルを持つ 1 つのロスターグループです。MyGO、Mujica、MewType はいずれもバンドであり、エンジンが特別扱いする「既定」のバンドはありません。戦闘カーネル、UI、サーバーはすべてのバンド判断を `frontend/src/game/bands/` のレジストリから導きます。

## レイアウト

```text
frontend/src/game/bands/
  index.ts                       registry: BANDS, bandFor(id), CHARACTERS
  contract.ts                    defineBand() defaults
  validation.ts                  validateBands(), validateCatalog()
  shared/                        cross-band commands, derived moves and templates
    superPulses.ts               common pulse spacing, without character choices
  <band>/
    index.ts                     defineBand({...})
    roster.ts, forms.ts           roster and form-selection rules
    moves.ts                     catalog assembly and registration order
    characters/
      <character-key>/
        <form>.ts                this character/form's authored move definitions
    shared/                      reusable normal, projectile and registrar templates
    ability.ts, tune.ts           band behavior and post-balance tuning
```

同じ所有ルールが登録済みのすべてのキャラクターに適用されます。MyGO の千早愛音、長崎そよ、高松燈、要楽奈、椎名立希は `characters/<key>/base.ts` を使います。燈の変身後の技は、基本の技と並んで `characters/tomori/penguin.ts` にあります。Mujica はキャラクターごとに `normal.ts` と `stage.ts` を持ちます。MewType は薇欧拉を含む各キャラクターに `virtual.ts` を持ちます。キャラクターモジュールは、自身が記述した通常攻撃名、スキル、必殺技、波のバリアント、後退スキルの出典、MyGO の J コンボの選択を所有します。共有テンプレートは、それらのモジュールが再利用する構築ロジックを含みます。

バンドの `moves.ts` は出荷時の登録順で形態を組み立てます。通常攻撃、スキル、必殺技、派生技はそれぞれ別の処理パスを必要とする場合があります。ソースファイルをキャラクターごとにまとめても、カタログの挿入順やコマンドリストの行順を変えてはいけません。MyGO の `chains.ts` も同様に、共有のスケーリング処理の周りでキャラクター固有のコンボ選択を組み立てます。キャラクターの形態は自身の他の形態や共有テンプレートを import できますが、別のキャラクターの実装に踏み込んではいけません。フロントエンドの所有チェックがその境界を強制します。

`data/` はバンド横断の組み立てだけを保ちます：`roster.ts`（フラットなリストと共有の速度/ジャンプスケーリング）、`createMoveCatalog.ts`（パスの順序）、`listMoves.ts`（ディスパッチ）、`moves/scale.ts`（共有の移動スケーリング）、`moves/balance.ts`（共有のチューニング）。`poppinparty/draftMoves.ts` のオーサリングファクトリーは未登録のままで、それらのキャラクターをプレイ可能にはしません。

## Band 契約

`defineBand(spec)` はすべての既定値を埋めるため、特別な仕組みを持たないバンドは `id`、`characters`、`moves` だけを宣言します。返される `Band` は次を公開します：

| フィールド                                    | 意味                                                 |
| --------------------------------------------- | ---------------------------------------------------- |
| `id`, `label`, `characters`, `moves`, `forms` | 識別情報とデータ                                     |
| `unified`                                     | コマンドテーブルではなく U/I/O スキル方式で遊ぶ      |
| `formFor`, `prefixFor`, `normalFor`           | 形態と技キーの命名                                   |
| `schemeFor`, `extraBindings`                  | 操作リストとゲーム内コマンドリスト                   |
| `movesFor(all, character, penguin)`           | そのファイターに表示する技リスト                     |
| `owns(f, move, name)`                         | このバンドでの技の合法性                             |
| `profileFor(f)`                               | 形態のバリアントを含む `Character` プロフィール      |
| `stanceLocked(f)`, `cancelDepth(f)`           | 構えの制限とキャンセル予算                           |
| `command(match, f, requested, input)`         | ボタン → 技名                                        |
| `skill(f, input, pressed, airborne)`          | 追加の統合モードスキル                               |
| `airCancel`, `extraCancel`                    | キャンセルの例外                                     |
| `beforeStart(match, f, name)`                 | 開始前に技を強化する（ビートブースト）               |
| `onStart(match, f, move, name, ground)`       | 技ごとの始動物理                                     |
| `ai(match, side, input)`                      | バンドの CPU 戦術                                    |
| `tune(moves)`                                 | バランス調整後の技の上書き                           |
| `transform`                                   | 任意の段階形態（`move`、`duration`、`energy`、倍率） |
| `presentation`                                | UI 向けの任意のアセットセクション指定                |

既定値：単一形態 `"base"`、キーは `<band>_<id>_<form>_<slot>`（またはバンドの `prefixFor`）、所有は `ownerCharacter`/汎用技、`stanceLocked` は true、キャンセル深度は 4、command/ai/tune/transform なし。

## バンドの追加

1. **フォルダを作成** `frontend/src/game/bands/<id>/`。連続した明示的な `id` を持つ `roster.ts` を追加します。ID はレジストリ全体で連続している必要があります（現在のロスターは 15 で終わるため、新しいバンドは 16 から始まります）。
2. **技を追加。** 記述した値を `characters/<key>/<form>.ts` に、再利用可能な構築ロジックをバンドの `shared/` に置きます。結果の `Record<string, Move>` を一意のキーで `moves.ts` に組み立て、新しいバンドの標準方式には `<band>_<id>_<form>_<slot>` を使います。キーは LAN の境界を越えるため、プロトコルを上げずに出荷済みのキーを改名してはいけません。各技に `ownerCharacter` を、バンドに複数の形態がある場合は `form` も指定します。
3. **`index.ts` を追加**し、`defineBand` を呼びます：

   ```ts
   import { defineBand } from "../contract";
   import { MOVES } from "./moves";
   import { CHARACTERS } from "./roster";

   export const BAND = defineBand({
     id: "newband",
     label: "NEW BAND",
     characters: CHARACTERS,
     moves: MOVES,
     forms: ["base"],
   });
   ```

   バンドが実際に必要とするフックだけを追加します（`schemeFor`、`command`、`ai`、`transform`、`tune` など）。複数の形態を宣言するバンドは `formFor` も渡す必要があります。

4. **登録する**、`frontend/src/game/bands/index.ts` で：

   ```ts
   import { BAND as newband } from "./newband";
   const REGISTERED: Band[] = [mygo, mujica, newband];
   ```

   登録順は関係ありません。`validateBands` がキャラクター ID で並べ替えます。

5. **アートを追加**する、ランタイムマニフェストと `scripts/check-assets.mjs` のデータに：キャラクター/ステージの数はカーネルレジストリから読むようになったため、数のリテラルを編集する必要はありません。`frontend/src/game/objects/BandId.ts`（`BandId` の union と `BAND_LABEL`）を更新します。
6. **テスト**：`npm run check`（型チェック + アセット + カーネル契約テスト）、`npm run build`、その後 `docs/LAN.md` の LAN スモーク手順を実行します。

バンドの追加は、`match/`、`controls.ts`、`combatData.ts`、他のバンドのフォルダの編集を必要としてはなりません。共有ファイルがバンド ID を必要とするなら、契約に能力が足りないということです。共有ファイルではなく `Band`/`defineBand` に追加してください。

## 不変条件

- キャラクター ID は `0..N-1` を隙間なく覆います。各バンドの ID は連続しており、`defineBand` が並べ替えます。
- 技キーはグローバルに一意です。カタログは起動時に重複キーを拒否します。
- 登録順はバトルルールの一部です。`createMoveCatalog` は次の順に実行します：ID 順のバンド技 → 共有ジャブ → 共有スケーリング → チェーン → バランス → バンドの `tune` パス → カタログ検証。
- 基本バンドの `formFor` は一定でなければならず、その技は `form` を宣言してはいけません。そうでないとペンギンモードが通常攻撃を開始できません。
- `Match`、`Fighter`、スナップショットのフィールドはワイヤー上に見えます。プロトコルを上げずにフィールドを追加・改名してはいけません。
- プロトコルのバージョンは `frontend/src/game/networkProtocol.ts` と `GameProtocol.Version`（Scala）にあり、`scripts/check-protocol.mjs` が両者を等しく保ちます。ロスターの変更はプロトコルの変更です。
- ロスターに基づくサーバー制限は `scripts/build-simulation.mjs` により `backend/src/main/resources/roster.json` に出力されます。

## 検証

```bash
npm run check          # 型チェック、アセット、バンド契約
npm run build          # カーネルのバンドル、simulation.js、roster.json
npm run check:backend  # Scala のコンパイル + scalafmt
```
