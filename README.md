# misckun Slack Bot

misckun は Slack 上で動作するボットで、イベント管理やパソコンの起動状態確認など、様々な機能を提供します。このドキュメントでは、 misckun の基本的な使い方を紹介します。


## 機能 / Usage

### イベント管理 / Event Management

#### イベント一覧の表示
`/event` コマンドを使用して、今後のイベント一覧を確認できます。各イベントには「詳細を見る」ボタンがあり、イベントの詳細情報と欠席連絡が可能です。欠席連絡では、理由とともに設定したチャンネルにユーザーの欠席が連絡されます。設定については [`/setting`](#設定--setting)を参考にしてください。

#### イベント追加
管理者は `/add-event` コマンドを使用して新しいイベントを追加できます。この機能は管理者限定です。コマンド実行後、イベント名・詳細・日付・参加学年が聞かれます。参加学年以外は記入必須となっています。


### パソコンの起動状態確認 / Desctop Status Check

起動状態の確認: `/desctop` コマンドに続けてパソコンのIDを入力することで、そのパソコンの起動状態を確認できます。（開発中）


### ルールの確認 / Rule Verification

#### ルールの表示
`/rule` コマンドに続けて `misc` または `slack` を入力することで、それぞれのルールを確認できます。


### 設定 / Setting

管理者は、 `/setting` コマンドを実行することで設定できます。設定モーダルでは、「アナウンスチャンネル」と「欠席連絡チャンネル」の二つが聞かれます。それぞれ、イベントの追加・編集が行われたときのアナウンス、イベントの欠席連絡が入った場合の連絡先を指定してください。アナウンスチャンネルは全員が参加しているチャンネル、欠席連絡チャンネルは欠席連絡を受けるべきひとのみのプライベートチャンネルを指定してください。


### ヘルプ / Help

使い方の確認: `/help` コマンドを使用すると、misckunの使い方を確認できるリンクが提供されます。また、問題が発生した場合の連絡先も表示されます。


## 開始方法 / How to start

misckun を起動するには、以下のコマンドを実行します。

```sh
npm run dev
```

これにより、設定されたポートで misckun が起動し、Slack 上でのコマンドが利用可能になります。


## 環境変数 / Environment

misckunの動作には以下の環境変数が必要です。`.env` ファイルをディレクトリ直下に作成して、下記の変数を追記してください。なお、値に関しては担当者に確認をとってください。また、現在は `.gitignore` で保護していますが、タイプミス等で環境変数が乗ったままプッシュしないように気を付けてください。

`SLACK_BOT_TOKEN`: Slack Botのトークン
`SLACK_SIGNING_SECRET`: Slackの署名シークレット
`FIREBASE_RULE`: Firebaseのセキュリティ対策ルール
`PORT`: アプリケーションがリッスンするポート（オプション）

別途、 Firebase のための環境変数も必要です。

テンプレ
```
SLACK_BOT_TOKEN=
SLACK_SIGNING_SECRET=

PORT=

FIREBASE_RULE=

FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_PROJECT_ID=
FIREBASE_STORAGE_BUCKET=
FIREBASE_MESSAGING_SENDER_ID=
FIREBASE_APP_ID=
```


## 開発 / Development

misckun は `TypeScript` で開発されており、`@slack/bolt` ライブラリを使用しています。また、イベントデータの管理には `Firebase Firestore` が使用されています。

開発に貢献したい場合は、 GitHub のリポジトリをクローンし、必要な依存関係をインストールしてください。

このプログラムは、[`Gritch`](https://misckun.glitch.me) + [`Google App Script`](https://script.google.com/d/1Rc29t--oSo4oeLqCN9T8lJw2Lxm83j7LF_Rda91cu5gkmmi1ujis9e4i/edit?usp=sharing) によってホストしているため、 [`Github Actions`](./.github/workflows/main.yaml)　からのデプロイが組まれています。開発段階で保存のためのプッシュを行う場合は、 `dev` ブランチに切り替えて作業を行ってください。マージする際、必要があればプルリクエストのレビューも送りましょう。

```sh
git clone https://github.com/misc-org/misckun.git
cd misckun
npm install

# devブランチがない場合は
# git branch dev
git checkout dev
```

その後、環境変数を設定し、開発サーバーを起動してください。

## ライセンス / License
misckun は MITライセンス の下で公開されています。[`LICENSE`](LICENSE)