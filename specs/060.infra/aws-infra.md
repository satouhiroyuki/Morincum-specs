# AWS環境構成・初期設定手順書

> ソース: Morincum/docs/spec/morincum-aws-guide.md + Morincum-backend/docs/spec/morincum-spec.md §2,§11
> 作成日：2026年3月

---

## 目次

1. [はじめに](#1-はじめに)
2. [AWSアカウントの開設](#2-awsアカウントの開設)
3. [セキュリティ初期設定](#3-セキュリティ初期設定)
4. [請求・コスト管理の設定](#4-請求コスト管理の設定)
5. [開発環境の準備](#5-開発環境の準備)
6. [Route 53・ドメイン設定](#6-route-53ドメイン設定)
7. [Slack Appの作成](#7-slack-appの作成)
8. [CDK スタック構成](#8-cdk-スタック構成)
9. [最終確認チェックリスト](#9-最終確認チェックリスト)

---

## 1. はじめに

本手順書は、MorincumのバックエンドAPIをAWS上で構築・運用するために必要な、AWSアカウントの開設から初期設定までの手順をまとめたものです。

### 1.1 前提条件

- クレジットカードまたはデビットカード（本人名義）
- 受信可能なメールアドレス
- 携帯電話（SMS認証に使用）

### 1.2 全体の流れ

| ステップ | 内容 | 所要時間 |
|---|---|---|
| Step 1 | AWSアカウントの開設 | 約30分 |
| Step 2 | セキュリティ初期設定 | 約30分 |
| Step 3 | 請求・コスト管理の設定 | 約20分 |
| Step 4 | 開発環境の準備 | 約60分 |
| Step 5 | Route 53・ドメイン設定 | 約30分 |
| Step 6 | Slack Appの作成 | 約30分 |

---

## 2. AWSアカウントの開設

1. https://aws.amazon.com/jp/ にアクセスし「AWSアカウントを作成」をクリック
2. メールアドレスを入力し「ルートユーザーのEメールアドレス」として登録
3. アカウント名を入力（例：morincum-prod）
4. パスワードを設定（大文字・小文字・数字・記号を含む12文字以上を推奨）
5. クレジットカード情報を入力
6. SMS認証を完了する
7. サポートプランを選択（最初は「ベーシックサポート（無料）」でOK）

> ⚠️ ルートユーザーのメールアドレスとパスワードは厳重に管理してください。

---

## 3. セキュリティ初期設定

### 3.1 ルートユーザーのMFA設定

1. コンソール右上のアカウント名 → 「セキュリティ認証情報」をクリック
2. 「多要素認証（MFA）」セクションの「MFAを割り当てる」をクリック
3. 「認証アプリケーション」を選択してQRコードをスキャン
4. アプリに表示された6桁コードを2回入力して完了

> ⚠️ ルートユーザーは日常的な作業には使用しないでください。

### 3.2 IAMユーザーの作成

1. IAM → 「ユーザーの作成」をクリック
2. ユーザー名を入力（例：morincum-dev-yamada）
3. 「AWSマネジメントコンソールへのアクセスを提供する」にチェック
4. 権限ポリシーで「AdministratorAccess」を選択（開発初期のみ）
5. ユーザーを作成しサインインURLとアクセスキーを安全な場所に保存

### 3.3 セキュリティチェックリスト

| | 確認項目 |
|---|---|
| ☐ | ルートユーザーにMFAを設定した |
| ☐ | IAMユーザーを作成した |
| ☐ | IAMユーザーにMFAを設定した |
| ☐ | ルートユーザーのアクセスキーが存在しないことを確認した |

---

## 4. 請求・コスト管理の設定

### 4.1 請求アラートの有効化

コンソール右上のアカウント名 → 「請求とコスト管理」 → 「請求設定」 → 「請求アラートを受け取る」にチェック

### 4.2 AWS Budgetsの設定

1. 「請求とコスト管理」→「Budgets」→「予算を作成」
2. 「月次コスト予算」を選択
3. 予算額に「5」（$5）を入力（開発初期は小さい金額で設定推奨）
4. メールアドレスを入力して通知先を設定

> ⚠️ RDSのストレージは必ず **gp2** を選択してください（gp3は無料枠対象外）。バックアップ期間は **1日** に変更してください。

---

## 5. 開発環境の準備

### 5.1 AWS CLIのインストール

```bash
# macOS
brew install awscli

# インストール確認
aws --version
```

### 5.2 AWS CLIの認証設定

```bash
aws configure
# AWS Access Key ID: <発行したアクセスキーID>
# AWS Secret Access Key: <シークレットアクセスキー>
# Default region name: ap-northeast-1
# Default output format: json
```

### 5.3 AWS CDKのインストール

```bash
npm install -g aws-cdk
cdk --version

# CDKブートストラップ（初回のみ）
cdk bootstrap aws://アカウントID/ap-northeast-1
```

### 5.4 GitHub OIDCの設定

GitHub ActionsからAWSに安全にアクセスするための設定。

1. IAM → 「IDプロバイダー」→「プロバイダーを追加」
2. プロバイダーのタイプ：「OpenID Connect」を選択
3. プロバイダーURL：`https://token.actions.githubusercontent.com`
4. 対象者：`sts.amazonaws.com`
5. IAMロールを作成し、信頼ポリシーにGitHubリポジトリを指定

### 5.5 開発環境チェックリスト

| | 確認項目 |
|---|---|
| ☐ | AWS CLIをインストールした（`aws --version` で確認） |
| ☐ | `aws configure` で認証情報を設定した |
| ☐ | `aws sts get-caller-identity` でアカウントIDが表示された |
| ☐ | CDKをインストールした（`cdk --version` で確認） |
| ☐ | CDKブートストラップを実行した |
| ☐ | GitHub OIDCの設定を完了した |

---

## 6. Route 53・ドメイン設定

### 6.1 ドメイン設計

| ドメイン | 管理場所 | 用途 |
|---|---|---|
| `morincum.co.jp` | お名前.com DNS | HP（Studio） |
| `morincum.com` | Route 53 | API・バックエンド全般 |

#### サブドメイン設計

| サブドメイン | 用途 |
|---|---|
| `api.morincum.com` | バックエンドAPI（本番） |
| `api-dev.morincum.com` | バックエンドAPI（開発） |
| `api-stg.morincum.com` | バックエンドAPI（ステージング） |

### 6.2 Route 53 ホストゾーンの作成

1. Route 53 → 「ホストゾーン」→「ホストゾーンの作成」
2. ドメイン名: `morincum.com`、タイプ: パブリックホストゾーン
3. 作成後に表示される **NSレコード（4件）** をお名前.comに設定

### 6.3 ACM証明書の発行

> ⚠️ API GatewayのカスタムドメインにはACMが **us-east-1** で発行した証明書が必要です。

1. ACM（us-east-1）で証明書をリクエスト
2. ドメイン名: `morincum.com` と `*.morincum.com`（ワイルドカード）
3. 検証方法: 「DNS検証」→ 「Route 53でレコードを作成」をクリック
4. ステータスが「発行済み」になるまで待機（通常5〜30分）

### 6.4 API Gatewayへのカスタムドメイン設定

1. API Gateway → 「カスタムドメイン名」→「作成」
2. ドメイン名: `api.morincum.com`、ACM証明書: 発行したワイルドカード証明書
3. Route 53にAレコード（エイリアス）を追加

### 6.5 CDKによる管理

```typescript
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';

const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
  domainName: 'morincum.com',
});

const certificate = new acm.Certificate(this, 'Certificate', {
  domainName: 'morincum.com',
  subjectAlternativeNames: ['*.morincum.com'],
  validation: acm.CertificateValidation.fromDns(hostedZone),
});
```

---

## 7. Slack Appの作成

### 7.1 Slack Appの作成手順

1. https://api.slack.com/apps にアクセス
2. 「Create New App」→「From scratch」を選択
3. App名に「morincum-bot」と入力してワークスペースを選択

### 7.2 Bot Token Scopesの設定

| スコープ | 用途 |
|---|---|
| `chat:write` | メッセージの送信 |
| `app_mentions:read` | メンションの受信 |
| `commands` | スラッシュコマンドの使用 |

### 7.3 スラッシュコマンドの登録

| コマンド | 用途 |
|---|---|
| `/maintenance` | メンテナンス管理 |
| `/announcement` | お知らせ管理 |

### 7.4 シークレット情報の保存（SSM Parameter Store）

| パラメータ名 | 値 | タイプ |
|---|---|---|
| `/morincum/slack/bot-token` | xoxb-xxxx（Bot Token） | SecureString |
| `/morincum/slack/signing-secret` | xxxx（Signing Secret） | SecureString |
| `/morincum/claude/api-key` | sk-ant-xxxx（Claude APIキー） | SecureString |

---

## 8. CDK スタック構成

### バックエンド（Morincum-backend）スタック依存関係

```
NetworkStack（VPC）
    ↓
DatabaseStack（RDS）
    ↓
AuthStack（Cognito）
    ↓
ApiStack（API Gateway + Lambda）
    ↓
StorageStack / LogStack / NotificationStack
```

### バッチ（Morincum-batch）スタック

| Stack | 主なリソース |
|---|---|
| BatchNetworkStack | VPC・NAT Gateway（1台）・セキュリティグループ |
| BatchComputeStack | Lambda関数群（Python・ARM64）・IAMロール |
| BatchSchedulerStack | EventBridge Scheduler（prodのみ有効） |
| BatchStorageStack | S3バケット（中間データ用） |
| BatchApiStack | API Gateway（Slack受信用） |

### デプロイコマンド

```bash
# バックエンド: dev環境に全Stackをデプロイ
cd Morincum-backend
cdk deploy --all -c env=dev

# バッチ: dev環境にデプロイ
cd Morincum-batch
cdk deploy --all -c env=dev
```

### 月額コスト目安（Phase 1）

| サービス | バックエンド | バッチ |
|---|---|---|
| RDS db.t3.micro | ~$18 | — |
| Lambda + API Gateway | $0（無料枠内） | ~$1 |
| NAT Gateway | — | ~$33 |
| S3 | ~$1 | ~$0.5 |
| Cognito（〜50,000 MAU） | $0 | — |
| Claude API | ~$1〜3 | ~$3〜5 |
| **合計** | **~$21〜24/月** | **~$38〜43/月** |

---

## 9. 最終確認チェックリスト

### アカウント・セキュリティ

| | 確認項目 |
|---|---|
| ☐ | ルートユーザーにMFAを設定した |
| ☐ | IAMユーザーでコンソールにログインできる |
| ☐ | ルートユーザーのアクセスキーが存在しない |

### コスト管理

| | 確認項目 |
|---|---|
| ☐ | 請求アラートを有効化した |
| ☐ | AWS Budgetsで$5のアラートを設定した |

### 開発環境

| | 確認項目 |
|---|---|
| ☐ | AWS CLIのインストール・認証設定が完了した |
| ☐ | CDKブートストラップを実行した |
| ☐ | GitHub OIDCの設定が完了した |

### Route 53・ドメイン

| | 確認項目 |
|---|---|
| ☐ | Route 53ホストゾーンを作成した（`morincum.com`） |
| ☐ | お名前.comのネームサーバーをRoute 53に変更した |
| ☐ | ACM証明書を発行した（us-east-1） |
| ☐ | API Gatewayにカスタムドメインを設定した |

### Slack連携

| | 確認項目 |
|---|---|
| ☐ | Slack Appを作成した |
| ☐ | シークレット情報をSSM Parameter Storeに保存した |
