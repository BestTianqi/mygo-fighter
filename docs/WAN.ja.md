[简体中文](WAN.md) | [English](WAN.en.md) | **日本語**

# 個人サーバーへの公開デプロイ

個人 VPS や公開接続できる自宅サーバーでゲーム全体を動かします。プレイヤーは同じ HTTPS URL を開きます。Caddy が HTTP/WebSocket を edge に転送し、lobby がルームと容量を管理し、rooms が共有戦闘カーネルを実行します。3 ロールは同じ配布アーカイブを使います。以下のアドレスは説明用で、稼働中ホストの情報ではありません。

## 1. ホストとネットワークの準備

Ubuntu 24.04 LTS、systemd、sudo が使える SSH アカウント、自分が管理するドメインを用意します。2 vCPU・2 GiB は小規模評価の開始目安であり、収容数の保証ではありません。既定のサービス上限は edge 256 MiB、lobby 192 MiB、rooms JVM ごとに 512 MiB で、OS とプロキシ用のメモリも必要です。

A レコードを公開 IPv4 に向け、IPv6 が動作する場合のみ AAAA を追加します。自宅では TCP 80/443 を固定 LAN アドレスに転送します。CGNAT や入信転送できない学内ネットワークでは、先に外部から到達できる入口が必要です。クラウド側とホスト側の両方で TCP 80/443 を許可し、8080（edge）、8079（lobby）、8091（rooms a）はループバックに保ちます。UDP 443 は不要です。

構築用 PC の ~/.ssh/config に別名を追加し、例の IP・ユーザー・鍵を置き換えます：

```sshconfig
Host game-server
    HostName 203.0.113.10
    User ubuntu
    IdentityFile ~/.ssh/id_ed25519
```

**構築用 PC のリポジトリ直下**で変数を設定し、以降も同じシェルを使います。ホスト名は自分のドメインに置換し、プロトコル・パス・ポートを付けません。

```sh
MYGO_SSH=game-server
MYGO_HOSTNAME=game.example.com
ssh "$MYGO_SSH" 'id; uname -m; free -h; df -h /srv'
```

以下は**サーバーの SSH セッション**での UFW 設定例です。実際の SSH ポートと他サービスの必要な規則を先に許可し、現在のセッションを保持します。SSH が別ポートなら 22 を変更し、既存のファイアウォールはリセットしません。nslookup game.example.com で DNS を確認し、80/443 の既存利用も調べます。

```sh
sudo apt-get update
sudo apt-get install -y ca-certificates curl openssl tar util-linux ufw
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status verbose
sudo ss -ltnp
```

## 2. PC で配布物を構築

Git、[Node.js](https://nodejs.org/en/download)（22.12 以上、プロジェクトのワークフローは 24）、[JDK 21](https://adoptium.net/installation/)、[sbt](https://www.scala-sbt.org/1.x/docs/Installing-sbt-on-Linux.html) を導入します。macOS/Linux の Bash または WSL を使います。手元の変更を保持してリモート更新を確認・統合してから、リポジトリ直下で実行します：

```sh
node --version
java -version
sbt --version
npm ci
npm run check
npm run check:backend
VITE_PUBLIC_GAME_URL="https://$MYGO_HOSTNAME" npm run package:server

MYGO_VERSION=$(node -p "require('./package.json').version")
MYGO_COMMIT=$(git rev-parse HEAD)
MYGO_RELEASE="$(date -u +%Y%m%dT%H%M%SZ)-$(git rev-parse --short HEAD)"
MYGO_ARCHIVE="backend/target/universal/mygo-server-$MYGO_VERSION.tgz"
test -f "$MYGO_ARCHIVE"
mkdir -p output/wan
tar -czf output/wan/hosting.tar.gz deploy
shasum -a 256 "$MYGO_ARCHIVE"
```

バージョンは package.json から取得します（現在 2.0.1）。shasum がなければ sha256sum を使います。package:server には UI、ランタイムメディア、JVM 依存、起動スクリプト、共有カーネルが入ります。この .tgz をアップロードし、デスクトップ ZIP や Pages のみのビルドで代用しません。サーバーにはインストーラーが Java 21 を導入し、Node や sbt は不要です。

## 3. サービスの初回インストール

**構築用 PC**からデプロイファイルを転送し、新しい専用ホストにインストールします：

```sh
scp output/wan/hosting.tar.gz "$MYGO_SSH:/tmp/mygo-hosting.tar.gz"
ssh "$MYGO_SSH" 'mkdir -p /tmp/mygo-hosting && tar -xzf /tmp/mygo-hosting.tar.gz -C /tmp/mygo-hosting'
ssh -t "$MYGO_SSH" "sudo bash /tmp/mygo-hosting/deploy/install.sh '$MYGO_HOSTNAME'"
```

mygo アカウント、環境ファイル、リリースディレクトリ、systemd unit を作成し、Java/Caddy の導入、自動起動の有効化、共有内部鍵の生成を行います。既存の環境ファイルは保持します。アプリの有効化までは Caddy の 502 が発生しても正常です。

他用途の Caddy がある場合は上書きを拒否します。バックアップ印を偽造して回避せず、設定をバックアップし、サイトとグローバル設定を手動統合したうえで deploy/install.sh に従いアカウント・環境・unit を導入してください。Nginx/Apache がある場合も手動のプロキシ統合が必要です。自動手順は Caddy が TCP 80/443 を占有する新規ホストが前提です。

**サーバー**で既定設定を確認します：

```sh
sudoedit /etc/mygo-fighter/base.env
sudoedit /etc/mygo-fighter/edge.env
sudoedit /etc/mygo-fighter/lobby.env
sudoedit /etc/mygo-fighter/rooms.env
```

base.env の rooms リストは `ROOMS_INSTANCES="a"` とし、生成された INTERNAL_SECRET を全ロールで共用します。edge は 127.0.0.1:8080、WEB_ROOT=/srv/mygo-fighter/current/web、lobby は 127.0.0.1:8079、rooms は 127.0.0.1:8091 です。edge と rooms は LOBBY_URL=http://127.0.0.1:8079 を使います。初期値は lobby/rooms の MAX_ROOMS=2 と lobby の ROOMS_PER_INSTANCE=2 です。

内部鍵を Git やブラウザーに公開しません。設定ファイルは root:mygo、0640 です。環境値は通常の KEY=value 形式で、export やシェルコマンドを書きません。TRUST_LOCAL_PROXY=true は信頼するループバックプロキシ配下でのみ使用します。詳細は[サービス構成](SERVICES.ja.md)を参照してください。

## 4. アップロードと有効化

**構築用 PC**で転送し、両方の SHA-256 を比較します：

```sh
scp "$MYGO_ARCHIVE" "$MYGO_SSH:/tmp/mygo-server.tgz"
shasum -a 256 "$MYGO_ARCHIVE"
ssh "$MYGO_SSH" 'sha256sum /tmp/mygo-server.tgz'
```

チェックサムの一致を確認してから有効化します：

```sh
ssh -t "$MYGO_SSH" "sudo bash /opt/mygo-fighter/activate.sh /tmp/mygo-server.tgz '$MYGO_RELEASE' '$MYGO_COMMIT'"
ssh "$MYGO_SSH" 'sudo cat /srv/mygo-fighter/current/deployment.json'
```

リリース ID は 2 文字以上の一意な値とし、英数字で始め、以降は英数字・点・下線・ハイフンだけを使います。有効化は配布物を検査してロールを停止し、current を切り替え、rooms → lobby → edge の順に起動・ヘルス確認し、deployment.json を記録します。置換前を previous に保持します。失敗時は前版の復旧を試みますが、初回には復旧先がありません。切替は一時ルームを終了するため、先にプレイヤーへ知らせます。

## 5. HTTPS と実対戦の確認

**サーバー外のネットワーク**から確認します：

```sh
curl -I "http://$MYGO_HOSTNAME/"
curl -fsS "https://$MYGO_HOSTNAME/api/health"
```

HTTP は HTTPS へ転送され、ヘルスは app=mygo-scala、ok=true と各ロールの正常性を返す必要があります。証明書検証を回避しません。**サーバー**で確認します：

```sh
sudo systemctl status mygo-edge mygo-lobby mygo-rooms@a caddy --no-pager
sudo systemctl is-enabled mygo-edge mygo-lobby mygo-rooms@a caddy
sudo journalctl -u mygo-edge -u mygo-lobby -u mygo-rooms@a -u caddy -n 100 --no-pager
sudo ss -ltnp
curl -fsS http://127.0.0.1:8080/api/health
```

次に異なるネットワークの 2 台で同じ HTTPS ドメインを開き、作成・招待・参加・キャラ選択・準備・対戦を確認します。移動、ダメージ、大技、切断時の停止、同じタブの再読込からの再接続を確認し、混戦には 3 台を使います。開発者ツールの Network → WS で wss://game.example.com/ws?room=... と継続フレームを確認します。未認証の裸の /ws が拒否されるのは正常です。ヘルス確認だけで対戦を検証したことにはなりません。既定の配信場所はドメイン直下です。

## 6. 更新・ロールバック・容量

毎回新しいコミットとリリース ID で構築・転送・チェックサム比較・有効化を繰り返します。UI とカーネルの整合性のため全体のアーカイブを配布します。unit を変更した場合は Caddy 設定の書換えを確認してからインストーラーを再実行します。**構築用 PC**からのロールバック：

```sh
ssh "$MYGO_SSH" 'sudo readlink /srv/mygo-fighter/current; sudo readlink /srv/mygo-fighter/previous'
ssh -t "$MYGO_SSH" 'sudo bash /opt/mygo-fighter/rollback.sh'
curl -fsS "https://$MYGO_HOSTNAME/api/health"
```

current と previous の両ディレクトリを保持します。ロールバックはアプリを戻すだけで、環境ファイル、systemd 覆書き、Caddy 設定は復元しません。別途バックアップし互換性を確認してください。初回には previous がありません。ロールバックと再起動はいずれも一時ルームを終了します。

**サーバー**でリソースを確認します：

```sh
sudo systemctl show mygo-edge mygo-lobby mygo-rooms@a -p MemoryCurrent -p MemoryPeak -p NRestarts
sudo journalctl -u mygo-rooms@a -n 100 --no-pager
```

容量を実測し、8092 が空いていることを確認した場合のみ b を追加します。**サーバー**で：

```sh
sudo install -o root -g mygo -m 0640 /dev/null /etc/mygo-fighter/rooms-b.env
printf 'ROOMS_PORT=8092\n' | sudo tee /etc/mygo-fighter/rooms-b.env >/dev/null
sudoedit /etc/mygo-fighter/base.env
sudoedit /etc/mygo-fighter/lobby.env
```

base.env を rooms リスト `ROOMS_INSTANCES="a b"` に変更します。1 インスタンス 2 ルームなら lobby の MAX_ROOMS=4 と ROOMS_PER_INSTANCE=2、rooms の MAX_ROOMS=2 にします。保管したインストーラーを再実行して新 unit を有効化し、新しいリリース ID で全体を有効化します。mygo-rooms@b と鍵付きの内部ヘルス 8092 を確認します。JVM ごとにメモリが増え、比例した拡張は保証されません。unit 変更時は daemon-reload と再起動、内部鍵変更時は全ロールの協調再起動が必要です。

## 7. 任意の Pages リンクと問題の切り分け

自分の fork の Actions リポジトリ変数に PUBLIC_GAME_URL=https://game.example.com を設定し、Pages ワークフローを再実行します。ローカル構築例：

```sh
VITE_PUBLIC_GAME_URL="https://$MYGO_HOSTNAME" npm run build:pages
```

変数はビルド時に読み込まれます。Pages は指定 HTTPS ゲームサーバーを開き、バックエンドを提供したりクロスオリジンでルーム API を利用したりするものではありません。未設定ならコード内の既定公開サーバーを使います。公開後は /mygo-fighter/ サブパスを確認します。

証明書・タイムアウトは DNS A/AAAA、TCP 80/443、NAT、Caddy ログを確認します。502 は edge と current/web、参加失敗はロール unit、共有鍵、満室、古いページ、WSS 転送を確認します。再起動・遅延増加は CPU、MemoryCurrent、MemoryPeak、NRestarts を調べます。Graal キャッシュの権限問題では rooms の専用キャッシュ設定を直し、リリース全体を書込み可能にしません。

[中国語の詳細版](WAN.md)には設定表、内部鍵付きヘルス確認、既存プロキシの扱いとトラブル表があります。一時ログとスクリーンショットは output/wan/ に置きます。

[Caddy HTTPS](https://caddyserver.com/docs/automatic-https) · [WebSocket proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy) · [Ubuntu UFW](https://ubuntu.com/server/docs/how-to/security/firewalls/)
