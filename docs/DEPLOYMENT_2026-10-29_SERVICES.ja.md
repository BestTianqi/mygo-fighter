[简体中文](DEPLOYMENT_2026-10-29_SERVICES.md) | [English](DEPLOYMENT_2026-10-29_SERVICES.en.md) | **日本語**

# サービス分割デプロイ — 2026-10-29

歴史的な準備記録です。[2026-10-30 のデプロイとゲームプレイ監査](DEPLOYMENT_2026-10-30.ja.md) に、プロトコル 25 の有効化、改訂されたリソース予算、2 ルーム上限、検証済みのレガシーロールバックが記録されています。以下の保留中の手順と初期予算は、それ以前の準備状態を説明するものです。

この変更は Scala バックエンドを `edge`、`lobby`、`rooms` という 3 つのデプロイロールに分割しますが、引き続き `SERVICE_ROLE` で選択する 1 つの `mygo-server-2.0.0.tgz` 成果物として提供されます。また、ルームトークンがルームコードを運び、クライアントが `/ws?room=CODE` に接続するようになったため、公開プロトコルを **25** に引き上げます。`edge`、`lobby`、`rooms` は単一の `mygo-fighter.service` レイアウトを置き換えます。Caddy は変更なく、引き続き公開ホスト名を `127.0.0.1:8080` にプロキシします。

| 項目                     | 値                                                                                                   |
| ------------------------ | ---------------------------------------------------------------------------------------------------- |
| 変更日                   | 2026-10-29                                                                                           |
| アプリケーションコミット | `ca01050`（プロトコル 25 のサービス分割）                                                            |
| リリース ID              | `20261029-ca01050-protocol25`（公開ホストはまだ有効化されていません）                                |
| アーカイブ SHA-256       | `0aff77bc74caa49bb88e1943d784452b0e9ce353bb92ce1774b61aaeaa61d87e`（ローカルビルド、未アップロード） |
| WebSocket プロトコル     | `25`                                                                                                 |
| サービス                 | `edge` 公開 8080、`lobby` 内部 8079、`rooms` 内部 8091（インスタンス `b` は 8092）                   |
| 公開時の既定             | rooms インスタンス 1 つ、グローバルおよびインスタンス単位の `MAX_ROOMS=4`                            |
| LAN の既定               | ローカルプロセス 3 つ（`npm run lan`）、`MAX_ROOMS=20`                                               |
| サービスメモリ上限       | edge 192 MiB、lobby 128 MiB、各 rooms インスタンス 512 MiB                                           |
| 公開プロキシ             | Caddy は変更なし。TLS/WSS は `127.0.0.1:8080` へ                                                     |

公開の AliCloud ホストは、以下の手順を実行するまでプロトコル 22 の単一ユニットリリースを実行し続けます。GitHub Pages は影響を受けません。

## 変更内容

- `backend/src/main/scala/services/system/api/Main.scala` が `SERVICE_ROLE=edge|lobby|rooms` に応じてディスパッチします。`all` は引き続き単一 JVM のローカルデバッグ構成です。
- 新しい `services/edge/` が公開の受入、静的ファイル、API 転送、有界のルーム所有者キャッシュ、WebSocket プロキシを所有します。
- 新しい `services/lobby/` がインスタンスレジストリ、グローバルな `MAX_ROOMS`、配置と予約、ハートビートから再構築されるルームコードディレクトリを所有します。
- `services/rooms/` はルーム実行を維持し、内部ルート、`LobbyClient` のハートビート／登録、インスタンス単位の設定を追加しました。
- プロセス間ペイロード型は `services/system/objects/internal/` に移動しました。`InternalGuard` がループバックと `X-Mygo-Internal` を強制します。
- プロトコル 25：トークンは `<6 桁の大文字 16 進ルームコード>.<48 桁の 16 進シークレット>`、ソケットは `/ws?room=CODE` です。プロトコル 24 以前のクライアントは拒否されます。
- デプロイファイル：systemd ユニット 3 つ、環境変数サンプル 4 つに加えて保持されるレガシーの `server.env.example`、そして書き直された `install.sh`、`activate.sh`、`rollback.sh`。
- ドキュメント：新しい `docs/SERVICES.md`。更新された `docs/ARCHITECTURE.md`、`docs/COURSE_GUIDANCE.md`、`docs/WAN.md`、`README.md`、および `AGENTS.md` の開発ルール 1 件。

## ローカル検証状況

この変更について検証済みです。

- `bash -n deploy/install.sh deploy/activate.sh deploy/rollback.sh` が通ります。
- `install.sh`、`activate.sh`、`rollback.sh` は、一時的な `/etc` と `/srv` のツリー、および `systemctl`、`apt-get`、`useradd`、`caddy`、`curl`、`flock`、`mv` をスタブ化したコマンドを備えたローカルハーネスで実行しました（このワークステーションには systemd も root も `flock`/`mv -T` もありません）。ハーネスは次をカバーしました。環境ファイルを保持した冪等なインストールと 1 つだけ生成される `INTERNAL_SECRET`、`ROOMS_INSTANCES` の変更後に新しい rooms インスタンスを有効化すること、レガシーユニットが存在する場合の移行メモの出力、アクティベーションの停止／起動順序、シンボリックリンクの切り替え、ヘルスプローブ、`deployment.json` の解析と `previous` の保持、ポート 8091 と 8092 を使う複数インスタンスのアクティベーション、ヘルスチェック失敗後の自動復元、ロールバックの成功、失敗時の復元、previous がない場合のエラーパス。
- ユニットとサンプルにある環境変数名、既定値、検証ルールは `EdgeConfig`、`LobbyConfig`、`RoomsConfig` と突き合わせました。内部パス、ステータスコード、ペイロード型、ロールのヘルス応答は、作業ツリーの `LobbyInternalRoutes`、`RoomInternalRoutes`、`InternalGuard`、`services/system/objects/internal/` の型、`LobbyClient`、`EdgeApiRoutes`、`EdgeHealthRoute`、`EdgeSocketRoutes`、`SocketProxy` と突き合わせました。
- 執筆時点の作業ツリーでは静的サービスチェックが通っています。`node scripts/check-services.mjs`（サービスフォルダー、禁止された import、プロセス内の rooms tick 経路、`SERVICE_ROLE` のディスパッチ、3 つのデプロイユニット）、`node scripts/check-api.mjs`（登録済みルーム API 名とフロントエンド呼び出し元の照合）、`node scripts/check-protocol.mjs`（プロトコル `25`）。

この変更では実行していません（タスクはファイルの書き込みのみ）：完全な `npm run check` と型チェック群、`sbt` のコンパイル、パッケージング、3 プロセスの LAN ランチャー、`npm run check:e2e`、実際の systemd インストール、新しいホストのプロビジョニング、公開デプロイ。これらは以下の統合手順です。

このチェックアウトでの統合パスも実行して合格しています。

- `npm run check`（型チェックに加えて、カーネル、ルール、スナップショット、アセットの各スイート、プロトコル `25`、10 個のルーム API 名、サービス境界チェック）。
- `npm run check:backend`（`build-simulation.mjs`、`sbt compile`、`scalafmtCheckAll`）。
- `npm run build` と `npm run build:pages`。
- `npm run package:server`：`backend/target/universal/mygo-server-2.0.0.tgz`（156 MB、ランタイム jar 51 個、`bin/mygo-server`、`web/index.html`）を生成しました。展開した `bin/mygo-server` が `lobby` ロールを起動し、`GET /internal/health` に `{"role":"lobby","ok":true,...}` と応答したため、ロールセレクターは sbt だけでなくパッケージ済みランチャーからも機能します。
- `npm run check:e2e`：実際の JVM プロセス 3 つ（`rooms` 18091、`lobby` 18079、`edge` 18080）が 2 つのヘルスゲートを通過し、2 ルームのフロー全体を実行しました。edge/lobby の配置を経由する `createroom`、`joinroom`、プロキシされたソケット上のプロトコル 25 認証、`chooseroom`、`ready`、`prepare`、`loadedroom`、権威ある `state` フレーム、入力フレーム 20 個、各側のさらなる state フレーム、そしてエラーフレームなし。並行する 2 つのルームは分離されたままで、異なるコードを生成しました。レポート：`output/services-e2e/report.json`。
- `node scripts/start.mjs`（`npm start` ランチャー、分離ポートで実行）：ステージ済み成果物から rooms、lobby、edge を起動し、`output/run/services.json` を書き出し、`/api/health` が `{"app":"mygo-scala","ok":true,...,"services":{"edge":"ok","lobby":"ok","rooms":"ok"}}` を報告しました。`SIGINT` で 3 プロセスすべてが停止し、pid ファイルが削除されました。
- `SERVICE_ROLE=all`（単一 JVM のデバッグ構成）は `/api/health` を提供し、3 つのロールすべてが健全で、即時の `createroom` にプロトコル 25 のトークン（`<6 桁の大文字 16 進>.<48 桁の 16 進>`）を返しました。ループバックのトポロジーとルームトークン形式は、プロセスを分けなくても機能します。

まだ実行していないもの：ターゲットホストでの実際の systemd インストール、公開 AliCloud のアクティベーション、デスクトップ／モバイルブラウザーの受け入れ、分割ロールの容量測定。これらは以下の公開ホスト手順です。

## 公開ホストでの保留手順

1. 統合パスはコミット `ca01050` で完了しています（ローカル検証状況を参照）。アップロード前にリリースコミットで `npm run check`、`npm run check:backend`、`npm run build`、`npm run package:server`、`npm run check:e2e` を再実行し、パッケージ成果物がプロトコル 25 と一致するフロントエンドを内包していることを確認します。
2. アプリケーションコミット、リリース ID、ローカルアーカイブの SHA-256 は上の表に記録されています。アップロードしたアーカイブのチェックサムをそれと照合し、有効化時刻をデプロイ記録に残します。
3. パッケージをアップロードし、有効化の前にチェックサムを検証します。

   ```sh
   scp backend/target/universal/mygo-server-2.0.0.tgz alicloud:/tmp/mygo-server-2.0.0.tgz
   ssh alicloud 'sha256sum /tmp/mygo-server-2.0.0.tgz'
   ```

4. 新しいホストレイアウトをインストールします。`deploy/` をホストにコピーし、`sudo bash deploy/install.sh PUBLIC_HOSTNAME` を実行します。インストーラーは `mygo-rooms@a` を有効化し、レガシーの `mygo-fighter.service` を無効化し、`/etc/mygo-fighter/{base,edge,lobby,rooms}.env` がなければ作成し、生成した `INTERNAL_SECRET` を追記します。有効化の前に、古い `/etc/mygo-fighter.env` の値と新しいファイルを比較してください。`HOST`、`PORT`、`WEB_ROOT`、`TRUST_LOCAL_PROXY` は `edge.env` に属します。4 ルームの上限は `lobby.env`（グローバル）と `rooms.env`（インスタンス単位）の両方に属します。Caddy の既存設定と証明書がそのまま残っていることを確認します。
5. アトミックに有効化します。

   ```sh
   ssh alicloud 'sudo bash /opt/mygo-fighter/activate.sh /tmp/mygo-server-2.0.0.tgz RELEASE_ID COMMIT'
   ```

   `Active release: RELEASE_ID`、ロールのポート、インスタンス一覧が表示されるはずです。`sudo cat /srv/mygo-fighter/current/deployment.json` にリリース、コミット、アーカイブ SHA-256、ロールのポートが含まれること、rooms と lobby の `/internal/health` がそれぞれ `"ok":true` を報告すること、公開 `/api/health` が `"app":"mygo-scala"` と期待どおりの `services` マップを報告することを確認します。置き換えられたプロトコル 22 のディレクトリは `/srv/mygo-fighter/previous` になります。

6. 更新済みクライアントでの公開受け入れ：証明書のバイパスなしの HTTPS/WSS アクセス、edge 経由のルーム作成と参加、古いクライアントに対するプロトコル 25 の拒否、ブラウザーのネットワークパネルでの `/ws?room=CODE`、同時に存在する 2 つのルームの ready/loading/state トラフィック、更新／再接続、一時停止／再起動、ルーム満員の処理、無効なルームコード、外部オリジンの拒否、`Retry-After: 60` を伴う受入制限、両方のブラウザーでコンソールエラーがないこと。
7. 受け入れの最中と後に、`systemctl show mygo-edge mygo-lobby mygo-rooms@a -p MemoryCurrent -p MemoryPeak -p NRestarts` で分割後のメモリと CPU を観察します。3 つの上限は初期予算です。[2026-10-27 の容量記録](DEPLOYMENT_CAPACITY_2026-10-27.ja.md) に相当する容量試験なしに `MAX_ROOMS` を引き上げないでください。
8. 新しいリリースが受け入れられたらロールバックを 1 回テストします。`sudo bash /opt/mygo-fighter/rollback.sh` はサービスとシンボリックリンクの両方をプロトコル 22 リリースへ戻します。どちらの変更も一時ルームを終了させるため、切り替えのたびにクライアントは更新する必要があります。その後で新しいリリースを再度有効化し、受け入れ済みのリリースを有効なままにしておきます。
9. 新しいレイアウトが安定したら、無効化されたレガシーユニットと古い環境ファイルを削除します。`rm /etc/systemd/system/mygo-fighter.service /etc/mygo-fighter.env` に続けて `systemctl daemon-reload` を実行します。ロールバックのために有効なリリースと previous のリリースディレクトリは保持します。

## 注意と制限

- プロトコル 25 は以前のクライアントやサーバーと互換性がありません。UI とバックエンドを一緒にデプロイしてください。開いているページは、ルームを作成または参加する前に必ず更新する必要があります。
- リリースの切り替えはすべてのロールユニットを停止するため、一時的なルームとセッションは破棄されます。以前の単一ユニットの有効化と同じです。
- このレイアウトの最初の有効化では、現在のプロトコル 22 リリースが `previous` として保持されます。ロールバックもプロトコル 22 を復元するため、クライアントは再度更新する必要があります。
- メモリ上限と、1 インスタンス／4 ルームという公開予算は計画的な設定であり、現在のホストで測定した容量ではありません。分割ロールの容量結果はまだ確立されていません。`docs/BACKEND_SCALING_2026-10-27.md` と `docs/DEPLOYMENT_CAPACITY_2026-10-27.md` の歴史的な測定値は、以前の単一プロセスレイアウトを説明するものです。
- Caddy に変更は不要です。公開ホスト名は引き続き同じホストに解決され、その背後のループバックプロセスだけが 1 つのユニットから 3 つに変わります。
- `docs/LAN.md` は引き続き戦闘のリズムとソケットのタイミングの参照先です。`docs/SERVICES.md` はサービス分割の参照先です。
