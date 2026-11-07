[简体中文](WAN.md) | [English](WAN.en.md) | **日本語**

# 公開オンラインホスティング

ゲーム全体を 1 台の Linux サーバーで動かせます。Scala バックエンドは独立した `edge`、`lobby`、`rooms` ロールとして動作します。rooms はローカル対戦と同じ TypeScript バトルカーネルで権威的な 2 人／3 人対戦を実行し、lobby はインスタンスとルームの容量を追跡し、edge が公開トラフィックを受け付けます。Caddy が HTTPS を提供し、HTTP と WebSocket を `127.0.0.1:8080` の edge へ転送します。プレイヤーは 1 つの共有ゲーム URL を開くだけで、公開ポートを開いたりバックエンドをインストールしたりする必要はありません。

**阿里雲北京**のデプロイは `alicloud` SSH ホスト（`123.57.149.254`、Ubuntu 24.04、x86-64、vCPU 2 基、メモリ約 1.6 GiB）で動作します。プレイは [mygo-123-57-149-254.sslip.io](https://mygo-123-57-149-254.sslip.io/) から行えます。対応するフロントエンド、Scala バックエンド、共有戦闘カーネルはアプリケーションコミット `2ed585d`、プロトコル **25**、リリース `20261030-2ed585d-protocol25` です。古いページを持つクライアントは再読み込みが必要です。GitHub Pages はこのサーバーへリンクしていません。

公開ホストは独立した edge、lobby、rooms の JVM を実行し、rooms インスタンスは 1 つです。本番環境ではロビーと rooms の両方の設定で**2 ルーム上限**を使用します。今回のゲームプレイ監査では 4 ルームでこのホストが飽和し、2 ルームが最初の制御されたテストを通過しました。実測された負荷とその限界は[2026-10-30 のデプロイとゲームプレイ監査](DEPLOYMENT_2026-10-30.ja.md)を参照してください。この設定は、あらゆるカスタムルールの組み合わせに対する容量を保証するものではありません。`deployment.json` にはアプリケーションコミット、アーカイブのチェックサム、検証情報が記録されます。OpenJDK 21 を引き続き使用します。

プロトコル 22 のリリースはロールバック用に、無効化されたレガシー unit と環境ファイルとともに `previous` として保持されています。復旧経路は公開ホスト上で双方向に演習済みです。それより古いリリースは削除されたままです。**Azure ゲームトライアルは退役**しました。以下の Azure デプロイの詳細は履歴です。

[ランタイム評価](RUNTIME_OPTIMIZATION_2026-10-27.ja.md)、[プロトコル 12 監査](DEPLOYMENT_PERFORMANCE_2026-10-26.ja.md)、[当初の阿里雲デプロイ](DEPLOYMENT_ALICLOUD_2026-10-26.ja.md)は、測定値と限界を含めて履歴記録のままです。それらのリリースディレクトリはすでに存在しません。

## ビルドとインストール

通常のチェックを実行した後、開発マシンで `npm run package:server` を実行します。生成される `backend/target/universal/mygo-server-2.0.0.tgz` には、JVM 依存関係の jar、起動スクリプト、フロントエンドと元のランタイムメディア、対応する組み込み戦闘カーネルと地形カタログが含まれます。ソースのアートワークは Git に保持されており、アップロードする必要はありません。対象ホストに必要なのは Java 21 だけで、Node や sbt は不要です。

ルートの `deploy/` フォルダーには、オペレーティングシステムのインストール用ファイルとサービスファイルがあります。これらはバックエンドのビジネスコードではなくデプロイ基盤であるため、Scala の `services/` ツリーの外に置かれています。[バックエンドサービス](SERVICES.ja.md)にランタイムトポロジー、内部エンドポイント、完全な設定マトリックスが記載されています。

## 3 サービス構成

1 つのリリース成果物が 3 つのロールすべてを提供します。各 systemd unit は `SERVICE_ROLE` を設定し、共有環境ファイルとロール固有の環境ファイルを読み込みます。Caddy は変更されていません。従来どおり `PUBLIC_HOSTNAME` を `127.0.0.1:8080` へプロキシし、そこで待ち受けるのは edge だけです。

| Unit                      | ロール  | 待ち受け                                                 | 環境ファイル                                                       |
| ------------------------- | ------- | -------------------------------------------------------- | ------------------------------------------------------------------ |
| `mygo-edge.service`       | `edge`  | 公開 `127.0.0.1:8080`                                    | `/etc/mygo-fighter/base.env`、`/etc/mygo-fighter/edge.env`         |
| `mygo-lobby.service`      | `lobby` | 内部 `127.0.0.1:8079`                                    | `/etc/mygo-fighter/base.env`、`/etc/mygo-fighter/lobby.env`        |
| `mygo-rooms@<id>.service` | `rooms` | 内部 `127.0.0.1:8091`（インスタンス `a`。`b` は `8092`） | `/etc/mygo-fighter/base.env`、`rooms.env`、任意の `rooms-<id>.env` |

`base.env` にはインストーラーが生成する `INTERNAL_SECRET` と、アクティブ化で使用する `ROOMS_INSTANCES` の一覧が入ります。初期デプロイの予算は rooms インスタンス 1 つで、グローバルおよびインスタンスごとの `MAX_ROOMS=2`、`edge` は 256 MiB、`lobby` は 192 MiB、`rooms` は 512 MiB に制限され、以前の単一 512 MiB のサービス上限から分割したものです。ルーム数を増やす前に実測メモリを確認してください。これらの制限は設定であり、容量の保証ではありません。

新しい専用ホストでの初回インストール：

```sh
tar -czf output/wan/hosting.tar.gz deploy
scp output/wan/hosting.tar.gz alicloud:/tmp/mygo-hosting.tar.gz
ssh alicloud 'mkdir -p /tmp/mygo-hosting && tar -xzf /tmp/mygo-hosting.tar.gz -C /tmp/mygo-hosting'
ssh alicloud 'sudo bash /tmp/mygo-hosting/deploy/install.sh PUBLIC_HOSTNAME'
```

`install.sh` は `mygo` アカウントとリリースディレクトリを作成し、3 つの unit と `activate.sh`／`rollback.sh` を `/opt/mygo-fighter` 配下にインストールし、`/etc/mygo-fighter/{base,edge,lobby,rooms}.env` を存在しない場合にのみ作成し、`INTERNAL_SECRET` がない場合は生成して追記し、Caddy と `ROOMS_INSTANCES`（既定は `a`）内のすべての unit を有効にします。Caddy の安全チェックを維持し、冪等です。旧来の単一 unit が動作しているホストでは、`--prepare-only` を使うことで旧サービスを利用可能なまま新しい構成をインストールできます。アクティブ化はリリースを切り替える前に旧サービスを停止します。このオプションがない場合、インストーラーは `mygo-fighter` を直ちに無効化して停止します。`/etc/mygo-fighter.env` は比較用に保持し、移行手順を表示します。移行値の対応は次のとおりです。`HOST`、`PORT`、`WEB_ROOT`、`TRUST_LOCAL_PROXY` は `edge.env` へ、旧 `MAX_ROOMS` は `lobby.env`（グローバル）と `rooms.env`（インスタンスごと）へ。`ROOMS_INSTANCES` を編集した後に `install.sh` を再実行すると、追加したインスタンスの unit が有効になります。

新しいアプリケーションリリースをデプロイするには：

```sh
scp backend/target/universal/mygo-server-2.0.0.tgz alicloud:/tmp/mygo-server-2.0.0.tgz
ssh alicloud 'sha256sum /tmp/mygo-server-2.0.0.tgz'
ssh alicloud 'sudo bash /opt/mygo-fighter/activate.sh /tmp/mygo-server-2.0.0.tgz RELEASE_ID COMMIT'
```

アクティブ化の前に、アップロードしたチェックサムをローカルのアーカイブと比較してください。任意の第 3 引数はアプリケーションコミットを `deployment.json` に記録します。アクティブ化は edge、lobby、各 rooms インスタンスの順に停止し、`/srv/mygo-fighter/current` を展開済みリリースへ切り替え、rooms インスタンス、lobby、edge の順に起動し、各内部 `/internal/health` と edge の `/api/health` が `"app":"mygo-scala"` を報告するまで待ちます。その後、リリース ID、任意のコミット、アーカイブの SHA-256、アクティブ化時刻、ロール／インスタンスのポートを含む `deployment.json` を書き込み、置き換えたリリースを `previous` として保持します。起動またはヘルスチェックに失敗した場合は、前のリリースを復元して一式を再起動します。最初の移行はプロトコル 22 のディレクトリを保持します。失敗時の復元とロールバックは、その単一 unit 構成を認識し、旧成果物を 3 ロールとして動かす代わりに `mygo-fighter` を起動します。そのロールバック対象を保持している間は、レガシー unit と環境ファイルを残してください。

新しい説明的な `RELEASE_ID` を使用し、英字、数字、ドット、ハイフン、アンダースコアだけを含めてください。インストーラーは Ubuntu の Java と Caddy のパッケージを使用し、専用の `mygo` アカウントを作成します。無関係な既存の Caddy インストールの置き換えは拒否し、初期の Caddy 設定をバックアップし、既存のゲーム環境ファイルを保持します。アクティブ化中はロールが停止するため、リリースの切り替えは一時ルームを終了させ、クライアントは再読み込みが必要です。プロトコル 24 以前のクライアントはプロトコル 25 のリリースによって拒否されます。

```sh
ssh alicloud 'systemctl status mygo-edge mygo-lobby caddy --no-pager'
ssh alicloud 'systemctl list-units "mygo-rooms@*" --all --no-pager'
ssh alicloud 'sudo journalctl -u mygo-edge -u mygo-lobby -n 100 --no-pager'
ssh alicloud 'sudo systemctl show mygo-edge mygo-lobby "mygo-rooms@a" -p MemoryCurrent -p MemoryPeak -p NRestarts'
ssh alicloud 'sudo cat /srv/mygo-fighter/current/deployment.json'
ssh alicloud 'sudo bash /opt/mygo-fighter/rollback.sh'
```

rooms インスタンスを 1 つ増やすごとに、メモリ確認へ `journalctl -u mygo-rooms@<id>` を 1 つとインスタンスを 1 つ追加します。`rollback.sh` は同じ停止、起動、ヘルスチェックの順序で一式を巻き戻します。ロールバック自体が失敗した場合は、アクティブなリリースを再起動し、リンクは変更しません。内部ヘルスチェックでは、生成されたシークレットを `base.env` から読み取れます：

```sh
ssh alicloud 'sudo bash -c ". /etc/mygo-fighter/base.env; curl -fsS -H \"X-Mygo-Internal: \$INTERNAL_SECRET\" http://127.0.0.1:8079/internal/health"'
```

Azure SSH エイリアスの過去のプロビジョニング手順（ゲームトライアルは現在削除済み）：

```sh
tar -czf output/wan/hosting.tar.gz deploy
scp output/wan/hosting.tar.gz azure:/tmp/mygo-hosting.tar.gz
ssh azure 'mkdir -p /tmp/mygo-hosting && tar -xzf /tmp/mygo-hosting.tar.gz -C /tmp/mygo-hosting'
ssh azure 'sudo bash /tmp/mygo-hosting/deploy/install.sh mygo-20-78-1-182.sslip.io'
scp backend/target/universal/mygo-server-2.0.0.tgz azure:/tmp/mygo-server-2.0.0.tgz
ssh azure 'sudo bash /tmp/mygo-hosting/deploy/activate.sh /tmp/mygo-server-2.0.0.tgz RELEASE_ID'
```

上記の Azure コマンドは単一 unit を使った退役済みトライアルを説明したものです。現在の `install.sh` は代わりに 3 サービス構成をインストールします。VM の Azure ネットワークセキュリティグループで受信 **TCP 80 と 443** を許可してください。8080 を開いたり、既存の UDP 443 VPN ルールを変更したりしないでください。付属の Caddy 設定では HTTP/3 が無効になっており、VPN の UDP ポートを占有しません。プロキシは Host を保持し、WebSocket のアップグレードを処理します。ACME 証明書データは Caddy の永続サービスストレージに残ります。

このトライアルは `azure-vm-nsg` の優先度 330 で `MyGO-Web-TCP-80-443` を使用し、この VM のネットワークインターフェースにのみ関連付けられています。優先度 320 の既存 `Hysteria2-UDP-443` ルールは変更されていません。Caddy が TCP 80/443 を所有し、JVM はループバックポート 8080 にバインドされたままで、Hysteria は UDP 443 を保持します。

## 過去の単一 unit 設定と共有動作

`/etc/mygo-fighter.env` は退役した単一 unit 構成の実行時設定を保持していました。移行済みホストでは保存されていますが、edge／lobby／rooms の unit は**もう読み込みません**。3 サービス版は上記のとおり `/etc/mygo-fighter/{base,edge,lobby,rooms}.env` にあります。

| 設定                | トライアル値                    | 意味                                                           |
| ------------------- | ------------------------------- | -------------------------------------------------------------- |
| `HOST`              | `127.0.0.1`                     | バックエンドはローカルプロキシ／SSH 経由でのみ到達可能         |
| `PORT`              | `8080`                          | プライベートなバックエンドポート                               |
| `WEB_ROOT`          | `/srv/mygo-fighter/current/web` | アクティブなリリースに属するフロントエンド                     |
| `MAX_ROOMS`         | `2`                             | 正のルーム上限。通常の LAN の既定は引き続き 20                 |
| `TRUST_LOCAL_PROXY` | `true`                          | ループバックのピアからの最後の転送クライアントアドレスのみ受理 |

単一 unit は 64 MB 最小／256 MB 最大の Java ヒープ、64 MB の予約コードキャッシュ、512 MB のサービスメモリ上限で起動し、サービスのスワップ領域はありませんでした。3 サービス構成では代わりに edge を 256 MB、lobby を 192 MB、各 rooms インスタンスを 512 MB に上限設定し、Ubuntu、Caddy、既存 VPN のための余裕を確保します。これらの設定はトライアルの予算であり、容量の保証ではありません。VM の自動リサイズはありません。

各 rooms unit は `CacheDirectory` と `XDG_CACHE_HOME` を使って、組み込み GraalJS ランタイムにインスタンス専用のキャッシュ `/var/cache/mygo-fighter/rooms-<id>` を与えます。これにより、アプリケーションリリースとサービスのホームが読み取り専用のままでもネイティブランタイムリソースを展開できます。このキャッシュがないと、GraalJS は `/srv/mygo-fighter/.cache` 配下のアクセス拒否エラーに起因する、存在しない `truffleattach` という誤解を招く警告を出します。既存のインストールでは、更新後の unit に置き換えたうえで `systemctl daemon-reload` とサービスの再起動が必要です。[GraalVM の内部リソースのドキュメント](https://www.graalvm.org/latest/reference-manual/embed-languages/#managing-internal-resources)を参照してください。

edge は同じアドミッション動作を保ちます。ルームの作成と参加は合わせてクライアントアドレスごとに毎分 20 回の試行に制限され、ソケットハンドシェイクは別枠で毎分 60 回、カウンターは期限切れになり、アドレス／カテゴリのマップは 4,096 エントリに制限されます。拒否時は HTTP 429、JSON の再試行メッセージ、`Retry-After: 60` を使用します。確立済みのソケットは、既存の毎秒 300 メッセージと 8 KiB のメッセージ上限を保ちます。edge は同一オリジンのブラウザーリクエストを強制し、rooms プロセスはプレイヤーコマンドの前にセッショントークンを解決します。ルームコードは WebSocket URL（`/ws?room=CODE`）に現れますが、トークンは決して現れません。Caddy は信頼できない受信転送の主張を無視します。`TRUST_LOCAL_PROXY` は信頼されたループバックプロキシの背後でのみ有効にしてください。

サーバーはルームごとに人間のプレイヤー 2 人を受け入れ、ホスト専用のルール変更、1v1 と 3v3 のチームリレー、権威的な戦闘、再接続の読み込みバリアを維持します。切断は試合を一時停止します。すべてのソケットが 2 分間存在しない場合、ルームのクリーンアップはクロックを停止し、シミュレーションを閉じ、セッションを失効させ、容量を解放します。30 分の非アクティブ失効と、全員が明示的に退出した後の即時クリーンアップは引き続き有効です。サーバーの再起動は一時ルームを破棄します。

## 過去の Azure 運用と一般的なロールバック動作

以下の Azure コマンドは、退役した単一 unit トライアル用に残されています。現在の阿里雲ホストでは、代わりに[3 サービス構成](#3-サービス構成)の 3 サービス用コマンドを使用してください。

```sh
ssh azure 'systemctl status mygo-fighter caddy hysteria-server --no-pager'
ssh azure 'sudo journalctl -u mygo-fighter -u caddy --no-pager -n 100'
ssh azure 'systemctl show mygo-fighter -p MemoryCurrent -p MemoryPeak -p CPUUsageNSec -p NRestarts'
ssh azure 'sudo systemctl restart mygo-fighter'
curl --fail https://mygo-20-78-1-182.sslip.io/api/health
```

リリースインストーラーは `/srv/mygo-fighter/releases/RELEASE_ID` に展開し、ロールの unit を停止し、`current` をアトミックに切り替え、依存順に起動して内部と公開のヘルスを確認します。切り替え前に停止することで、前の JVM が新しいフロントエンドを配信し続けるのを防ぎます。切り替え、起動、ヘルスチェックのいずれかが失敗した場合は、前のリリースが存在すればそれを復元し、一式を再起動します。アクティブ化に成功するとそれを `previous` として記録します。ホストで `sudo bash /opt/mygo-fighter/rollback.sh` を実行すると復元できます。デプロイとロールバックはホストローカルのロックで直列化されます。切り替えと再起動のどちらも現在の一時試合を終了させます。リリースを整理するときは、通常、アクティブと previous のディレクトリを保持してください。古いバージョンを削除するという 2026-10-28 の明示的な要求が、このデプロイではその既定を上書きしており、アクティブな阿里雲ディレクトリだけが残っています。

トライアルを退役させるには、ロールの unit を停止して無効化し（過去の単一 unit は `mygo-fighter`、現在の構成は `mygo-edge`、`mygo-lobby`、`mygo-rooms@<id>`）、トライアルの Azure TCP 80/443 受信ルールだけを削除し、Caddy がこのゲームだけを提供しているなら Caddy を停止します。Caddy を他の用途で残す場合は `/etc/caddy/Caddyfile.before-mygo` を復元してください。その後、必要なバックアップを取ったうえで、ゲームのリリースディレクトリ、そのサービス unit、`/etc/mygo-fighter*` 設定、専用の `mygo` アカウントを削除できます。VPN サービス、その証明書、UDP 443 ルールはそのままにしてください。

## 過去の Azure トライアル検証

必要な受け入れ項目には、通常のフロントエンド／メディア／ビルドと Scala のチェック、トライアルリンクを含まない `/mygo-fighter/` 配下の静的 Pages チェック、証明書を回避しない HTTPS と WebSocket のアクセス、元の画像／音声／動画の読み込み、2 つの同時試合における 4 つの分離クライアントの少なくとも 15 分間の稼働、ダメージ、必殺技、控えの進行、一時停止、再起動、再接続、満員／無効なルーム、無効なセッション、互換性のないプロトコル、オリジンとアドミッションのチェック、放棄されたルームの期限切れが含まれます。メモリ、CPU、スナップショットのタイミング、VPN の応答性を記録してください。すべての一時ハーネスと測定値は Git 管理外の `output/wan/` に置きます。削除されたテストディレクトリは復元しません。

退役前、アプリケーションは 2 ルーム上限で Azure にインストールされていました。立希と楽奈の更新（ネットワークプロトコル 7）をマージした後、フロントエンド／メディアのチェック、Scala のコンパイル／フォーマット、通常のビルド、Pages ビルド、パッケージ起動、プロキシのアドミッションチェックが通過しました。公開された GitHub Pages サイトは `/mygo-fighter/` 配下で確認され、トライアルサーバーへのリンクはありません。任意の HTTPS リンクはテスト専用ビルドで別途検証されました。Pages の `PUBLIC_GAME_URL` は未設定のままです。

**2026-10-26 の公開受け入れ実行は合格しました**。**4 つの分離した WebSocket クライアントが 2 つの同時ルームで 900 秒間**稼働し、更新された立希／楽奈の 1v1 対戦と 3v3 の控え進行を含みました。クライアントは SSH 転送や証明書の回避なしで、公開 HTTPS／WSS 経由で直接接続しました。各クライアントは約 54,000 個のスナップショットを受信し、予期しない切断、プロトコルエラー、サーバー再起動はありませんでした。ルームの分離、移動、ダメージ、一時停止、再起動、再接続は合格しました。3 つ目のルームは明確に拒否され、2 分間の放棄セッション失効とルーム容量の回復の確認も合格しました。

**279 個の元のランタイムメディアファイル（93,738,918 バイト）**もすべて、信頼された公開 HTTPS 経由でローカルの元ファイルとバイト単位で一致し、画像、音声、動画のアセットを網羅しました。

さらに、権威的な祥子とヴィオラの必殺技、再読み込みからの復旧、無効なルームコード、期限切れセッション、互換性のないクライアント、同一オリジンの強制、再試行メッセージ付きのアドミッション制限についても公開チェックが合格しました。意図的に失敗させたリリース起動後の自動復元と、前のリリースへの手動ロールバックおよびその巻き戻しも合格しました。最終的な Azure トライアルアプリケーションはプロトコル 7 で、`/srv/mygo-fighter/releases/20261026-wan-protocol7` にあり、コミット `09c9a2a` からビルドされました。

| 測定項目                     | 観測された公開トライアル結果                                                |
| ---------------------------- | --------------------------------------------------------------------------- |
| ゲームサービスのメモリピーク | 512 MiB の上限内で 313.2 MiB                                                |
| Caddy のメモリピーク         | 45.6 MiB                                                                    |
| ゲームの平均 CPU             | 試合実行 870 秒間の 29 サンプルで 0.416 CPU コア                            |
| Caddy の平均 CPU             | 同じ区間で 0.021 CPU コア                                                   |
| p95 サーバー更新作業         | 4 クライアントで 1.18–1.21 ms                                               |
| p95 公開ラウンドトリップ時間 | 4 クライアントで 123.8–124.8 ms                                             |
| p95 スナップショット配送間隔 | 4 クライアントで 59.1–59.3 ms                                               |
| 公開接続の確立               | 5 回の接続試行で、WSS の確立に 85–255 ms、認証済みルームの受信に 167–343 ms |
| VPN の可用性                 | 18 分間の 36 回のチェックすべてでアクティブ。すべての SSH プローブが完了    |
| VPN コマンドのプローブ時間   | p95 1.25 秒、最大 1.31 秒。SSH ハンドシェイクとコマンド作業を含む           |

これらの測定は、**この VM における 2 ルーム／4 プレイヤーのテスト目標**を裏付けます。1 つのクライアントネットワークと短時間のトライアルを記述したものであり、持続的な本番容量やすべての地域からの遅延を示すものではありません。VPN の可用性とコマンド応答性はサンプリングによるもので、VPN のスループットはベンチマークしていません。VM のリサイズや有償リソースのアップグレードは行っていません。受け入れ結果は上記に要約したとおりで、一時ハーネスと生の測定値はリポジトリに含まれません。

**退役前の履歴結果：公開 HTTPS と WSS は稼働していました。** Caddy はホスト名に対して公的に信頼された Let's Encrypt 証明書を取得しました。HTTP は HTTPS へリダイレクトされ、通常の証明書／ホスト名の検証と公開 `/api/health` チェックが合格しました。2 つの分離したブラウザーが `wss://mygo-20-78-1-182.sslip.io/ws` 経由で対戦し、キーボード攻撃で防御側の体力が 179 まで減り、再読み込み／再接続で再開前にその体力が保持されました。一時的なループバック専用の検証プロキシは削除済みで、公開 Caddy サービスはホストとともに自動起動します。
