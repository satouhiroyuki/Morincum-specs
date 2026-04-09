# 本番環境構築ガイド

本ドキュメントは「配当の森 by MORINCUM」を本番環境（prod）へリリースするための手順書です。  
初回リリース時にこの手順を順番に実施してください。

---

## 目次

1. [前提条件](#1-前提条件)
2. [AWS事前準備（ドメイン・証明書・SES）](#2-aws事前準備ドメイン証明書ses)
3. [CDKデプロイ（バックエンド基盤）](#3-cdkデプロイバックエンド基盤)
4. [DBマイグレーション＆シードデータ投入](#4-dbマイグレーションシードデータ投入)
5. [Cognito Identity Pool作成（ゲスト認証）](#5-cognito-identity-pool作成ゲスト認証)
6. [SSM Parameter Store 設定](#6-ssm-parameter-store-設定)
7. [RevenueCat設定](#7-revenuecat設定)
8. [Google AdMob設定](#8-google-admob設定)
9. [App Store Connect / Google Play Console設定](#9-app-store-connect--google-play-console設定)
10. [EAS シークレット設定 & ビルド & 提出](#10-eas-シークレット設定--ビルド--提出)
11. [Morincum-batch デプロイ](#11-morincum-batch-デプロイ)
12. [RevenueCat Webhook URL 本番設定](#12-revenuecat-webhook-url-本番設定)
13. [動作確認チェックリスト](#13-動作確認チェックリスト)

---

## 1. 前提条件

### 必要なツール

| ツール | バージョン | インストール |
|---|---|---|
| AWS CLI | v2 | `brew install awscli` |
| Node.js | 22.x | `brew install node@22` |
| AWS CDK | v2 | `npm install -g aws-cdk` |
| EAS CLI | 最新 | `npm install -g eas-cli` |
| Python | 3.12 | `brew install python@3.12` |

### 必要なアカウント

- [ ] AWSアカウント（本番用。dev/stagingとは別推奨）
- [ ] Expo / EASアカウント（`eas login` でログイン済み）
- [ ] App Store Connect（Apple Developer Program 年額 $99/年）
- [ ] Google Play Console（$25 初回登録費）
- [ ] RevenueCat（無料プランで開始可）
- [ ] Google AdMob（AdSense/AdMobアカウント）
- [ ] Slack Workspace（バッチ通知用）

### AWS IAM権限

CDKデプロイを実行するIAMユーザー/ロールに以下が必要：

- `AdministratorAccess`（または CDK に必要な個別権限）
- CDK Bootstrap 用の CloudFormation 実行権限

```bash
# AWSの認証確認
aws sts get-caller-identity
```

---

## 2. AWS事前準備（ドメイン・証明書・SES）

### 2-1. Route53 ホストゾーン確認

`morincum.com`（APIドメイン）と `morincum.jp`（Cognito メールドメイン）が  
Route53に登録済みであることを確認します。

```bash
aws route53 list-hosted-zones --query 'HostedZones[*].Name'
# → ["morincum.com.", "morincum.jp."] が表示されること
```

### 2-2. ACM 証明書の発行（ap-northeast-1）

API Gateway カスタムドメイン `api.morincum.com` 用の証明書を発行します。

```bash
# 証明書リクエスト
aws acm request-certificate \
  --domain-name "api.morincum.com" \
  --validation-method DNS \
  --region ap-northeast-1

# 出力された CertificateArn を控えておく
```

Route53 で DNS 検証レコードを追加し、ステータスが `ISSUED` になるまで待ちます（数分〜30分）。

```bash
aws acm describe-certificate \
  --certificate-arn <CertificateArn> \
  --region ap-northeast-1 \
  --query 'Certificate.Status'
# → "ISSUED" になること
```

### 2-3. API Gateway カスタムドメイン作成（コンソール）

CDKは既存カスタムドメインを参照する設計のため、**CDKデプロイ前に手動で作成**します。

1. AWS コンソール → API Gateway → カスタムドメイン名
2. 「ドメイン名を作成」
   - ドメイン名: `api.morincum.com`
   - ACM証明書: 上で発行したもの
   - エンドポイントタイプ: リージョン
3. 作成後、**「APIゲートウェイドメイン名（ターゲットドメイン名）」** を控えておく
4. Route53 で CNAME レコードを追加:
   - レコード名: `api.morincum.com`
   - 値: 上で控えたAPIゲートウェイドメイン名

### 2-4. SES ドメイン検証（Cognito メール送信用）

本番環境の Cognito はメール送信に SES を使用します（`noreply@morincum.jp`）。

```bash
# SES でドメイン検証リクエスト
aws sesv2 create-email-identity \
  --email-identity morincum.jp \
  --region ap-northeast-1
```

Route53 に DKIM レコードを追加し、検証完了を待ちます。  
また SES のサンドボックス解除（本番アクセスのリクエスト）を申請します。

---

## 3. CDKデプロイ（バックエンド基盤）

### 3-1. 依存関係インストール

```bash
cd morincum-backend/infrastructure
npm install
```

### 3-2. CDK Bootstrap（初回のみ）

```bash
cdk bootstrap aws://<AWSアカウントID>/ap-northeast-1
```

### 3-3. デプロイ（全スタック）

```bash
cd morincum-backend/infrastructure

# NAT Gateway なしでデプロイ（通常時・コスト削減）
cdk deploy --all -c env=prod
```

**デプロイされるスタック（依存順）:**

| スタック名 | 内容 |
|---|---|
| `Morincum-Network-prod` | VPC・サブネット・セキュリティグループ |
| `Morincum-Database-prod` | RDS PostgreSQL 16 (t3.micro) + db-migrate Lambda |
| `Morincum-Auth-prod` | Cognito User Pool + App Client |
| `Morincum-Storage-prod` | S3 (assets / logs / batch-data) |
| `Morincum-Api-prod` | Lambda API + API Gateway HTTP API |
| `Morincum-Log-prod` | CloudWatch ログ設定 |
| `Morincum-Compute-prod` | バッチLambda用 IAM ロール |

> ⚠️ `Morincum-Database-prod` は `deletionProtection: true` / `removalPolicy: RETAIN` です。削除時は注意。

### 3-4. CDK Outputs の確認と記録

デプロイ完了後に表示される値を控えます：

```bash
# Outputs 一覧を確認
cdk deploy --all -c env=prod 2>&1 | grep -A 100 "Outputs:"
```

| Output | 説明 | 記録用 |
|---|---|---|
| `Morincum-Api-prod.ApiEndpoint` | API Gateway デフォルトURL | `https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com` |
| `Morincum-Auth-prod.UserPoolId` | Cognito User Pool ID | `ap-northeast-1_XXXXXXXXX` |
| `Morincum-Auth-prod.UserPoolClientId` | Cognito App Client ID | `xxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `Morincum-Database-prod.DbEndpoint` | RDS エンドポイント | 自動でSSMに保存済み |
| `Morincum-Storage-prod.BatchDataBucketName` | バッチデータS3バケット名 | `morincum-batch-data-prod-<accountId>` |

---

## 4. DBマイグレーション＆シードデータ投入

### 4-1. マイグレーション実行

```bash
# マイグレーションのみ（V001〜V010）
aws lambda invoke \
  --function-name morincum-db-migrate-prod \
  --payload '{}' \
  --cli-binary-format raw-in-base64-out \
  /tmp/migrate-out.json

cat /tmp/migrate-out.json
# → {"message":"Migration complete. Applied: V001, V002, V003, V004, V005, V006, V007, V009, V010"}
```

### 4-2. シードデータ投入（銘柄マスタ等）

```bash
# マイグレーション + シードデータ
aws lambda invoke \
  --function-name morincum-db-migrate-prod \
  --payload '{"action":"seed"}' \
  --cli-binary-format raw-in-base64-out \
  /tmp/seed-out.json

cat /tmp/seed-out.json
```

### 4-3. アプリバージョン登録

```bash
# 初回リリースバージョン登録
aws lambda invoke \
  --function-name morincum-db-migrate-prod \
  --payload '{"action":"upsert_version","version":"0.1.0","os":"ios","release_date":"2026-04-15","min_required_version":"0.1.0"}' \
  --cli-binary-format raw-in-base64-out \
  /tmp/version-ios.json

aws lambda invoke \
  --function-name morincum-db-migrate-prod \
  --payload '{"action":"upsert_version","version":"0.1.0","os":"android","release_date":"2026-04-15","min_required_version":"0.1.0"}' \
  --cli-binary-format raw-in-base64-out \
  /tmp/version-android.json
```

---

## 5. Cognito Identity Pool作成（ゲスト認証）

フロントアプリのゲストユーザー認証（`COGNITO_IDENTITY_POOL_ID`）に使用します。  
現在CDK管理外のため、AWSコンソールで作成します。

1. AWS コンソール → Cognito → ID プール → 「ID プールを作成」
2. 設定:
   - ID プール名: `morincum-identity-pool-prod`
   - **「認証されていない ID へのアクセスを有効にする」** にチェック
   - 認証プロバイダー: Cognito User Pool（上で作成した `UserPoolId` と `UserPoolClientId` を入力）
3. IAMロールは新規作成（デフォルト）
4. 作成後、**ID プール ID** を控えます: `ap-northeast-1:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

### 5-1. 未認証ロールに API 実行権限を付与

```bash
# 未認証ロール名を確認（コンソールまたはAWS CLI）
ROLE_NAME="Cognito_morincumidentitypoolprodUnauth_Role"

# /guest/* へのアクセス権を付与
aws iam put-role-policy \
  --role-name $ROLE_NAME \
  --policy-name MorincumGuestApiAccess \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": "execute-api:Invoke",
      "Resource": "arn:aws:execute-api:ap-northeast-1:<AWSアカウントID>:<ApiGatewayId>/*/*/guest/*"
    }]
  }'
```

---

## 6. SSM Parameter Store 設定

### 6-1. RevenueCat Webhook シークレット

RevenueCat の設定が完了した後（STEP 7）に実施します。

```bash
# RevenueCat ダッシュボードで発行した Webhook Secret を設定
aws ssm put-parameter \
  --name "/morincum/revenuecat/webhook-secret" \
  --value "<RevenueCat_Webhook_Secret>" \
  --type "SecureString" \
  --region ap-northeast-1
```

### 6-2. 設定済みSSMパラメータの確認

CDKデプロイで自動作成される以下が存在することを確認します：

```bash
aws ssm get-parameters-by-path \
  --path "/morincum/prod" \
  --query 'Parameters[*].{Name:Name,Value:Value}'
```

| パラメータ名 | 内容 | 作成元 |
|---|---|---|
| `/morincum/prod/cognito/user-pool-id` | User Pool ID | CDK自動 |
| `/morincum/prod/cognito/user-pool-client-id` | App Client ID | CDK自動 |
| `/morincum/prod/db-endpoint` | RDS エンドポイント | CDK自動 |
| `/morincum/prod/db-port` | RDS ポート | CDK自動 |
| `/morincum/prod/db-secret-arn` | DB認証情報ARN | CDK自動 |
| `/morincum/revenuecat/webhook-secret` | Webhookシークレット | **手動（上記）** |

---

## 7. RevenueCat設定

### 7-1. アカウント・プロジェクト作成

1. [RevenueCat](https://app.revenuecat.com) にログイン
2. 「Create new project」→ プロジェクト名: `morincum`

### 7-2. アプリ登録

**iOS:**
1. 「Add App」→ Platform: App Store
2. App name: `配当の森 by MORINCUM`
3. Bundle ID: `com.morincum.haitonomori`
4. App Store Connect API Key を設定（App Store Connect → ユーザーとアクセス → キー）

**Android:**
1. 「Add App」→ Platform: Google Play
2. Package name: `com.morincum.haitonomori`
3. Google Play サービスアカウントJSONを設定

### 7-3. プロダクト（サブスクリプション）登録

App Store / Google Play で商品を先に登録してから（STEP 9）、RevenueCatに取り込みます。

1. Products → 「＋ New」
2. App Store: `com.morincum.standard_monthly`
3. Google Play: `standard_monthly`

### 7-4. Entitlement 設定

1. Entitlements → 「＋ New」
2. Identifier: `standard`
3. 上記プロダクトを Attach

### 7-5. Webhook URL の控え

Webhook URL（STEP 12で設定）:
```
https://api.morincum.com/webhooks/revenuecat
```

---

## 8. Google AdMob設定

### 8-1. AdMobアカウント確認

[Google AdMob](https://admob.google.com) にログインし、アプリを登録します。

### 8-2. アプリ登録

**iOS:**
1. 「アプリを追加」→ App Store に公開済み？ → まだ公開前の場合は「いいえ」
2. プラットフォーム: iOS
3. アプリ名: `配当の森 by MORINCUM`
4. **アプリ ID** を控える: `ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX`

**Android:**
1. 同様に Android アプリを登録
2. **アプリ ID** を控える

### 8-3. バナー広告ユニット作成

**iOS / Android それぞれで:**
1. 「広告ユニット」→ 「バナー」
2. 名前: `morincum-banner-footer`
3. **広告ユニット ID** を控える:
   - iOS: `ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX`
   - Android: `ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX`

### 8-4. app.json への AdMob App ID 設定

`morincum/app.json` の `expo.plugins` に AdMob App ID を追加します：

```json
{
  "expo": {
    "plugins": [
      [
        "react-native-google-mobile-ads",
        {
          "androidAppId": "ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX",
          "iosAppId": "ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX"
        }
      ]
    ]
  }
}
```

---

## 9. App Store Connect / Google Play Console設定

### 9-1. App Store Connect（iOS）

1. [App Store Connect](https://appstoreconnect.apple.com) → 「マイApp」→「＋」
2. プラットフォーム: iOS
3. バンドルID: `com.morincum.haitonomori`（Apple Developer に登録済みのもの）
4. SKU: `morincum-haitonomori`

**サブスクリプション商品登録:**
1. App内課金 → サブスクリプション → 「＋」
2. 参照名: `Standard月額プラン`
3. 製品ID: `com.morincum.standard_monthly`
4. サブスクリプショングループを作成: `プレミアムプラン`
5. 価格: 月額 ¥480（Tier 5相当）
6. ローカライズ:
   - 表示名（日本語）: `Standardプラン`
   - 説明（日本語）: `広告非表示・3口座管理・CSVエクスポート・バックアップ機能`

### 9-2. Google Play Console（Android）

1. [Google Play Console](https://play.google.com/console) → 「アプリを作成」
2. パッケージ名: `com.morincum.haitonomori`

**サブスクリプション商品登録:**
1. 収益化 → サブスクリプション → 「サブスクリプションを作成」
2. プロダクトID: `standard_monthly`
3. ベースプラン: 月額 ¥480
4. 特典（オプション）: 7日間無料トライアル

---

## 10. EAS シークレット設定 & ビルド & 提出

### 10-1. EAS シークレット設定

本番ビルドに必要な環境変数を EAS シークレットとして登録します。

```bash
cd morincum

# EAS プロジェクトへの紐づけ確認
eas project:info
# → Project ID: d6783470-0f8a-4046-b102-0a951ac76f47

# シークレット登録（production プロファイル用）
eas secret:create --scope project --name EXPO_PUBLIC_API_URL \
  --value "https://api.morincum.com" --profile production

eas secret:create --scope project --name EXPO_PUBLIC_AWS_REGION \
  --value "ap-northeast-1" --profile production

eas secret:create --scope project --name EXPO_PUBLIC_COGNITO_IDENTITY_POOL_ID \
  --value "ap-northeast-1:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" --profile production

eas secret:create --scope project --name EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_IOS \
  --value "ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX" --profile production

eas secret:create --scope project --name EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_ANDROID \
  --value "ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX" --profile production
```

### 10-2. 本番ビルド実行

```bash
cd morincum

# iOS + Android 両方ビルド
eas build --platform all --profile production
```

ビルドには15〜30分かかります。完了後、EAS ダッシュボードでビルド成功を確認します。

### 10-3. ストアへの提出

```bash
# App Store Connect へ提出
eas submit --platform ios --profile production

# Google Play Console へ提出（internal テストトラックに提出）
eas submit --platform android --profile production
```

### 10-4. ストア審査

- **iOS**: App Review に提出（通常1〜3営業日）
- **Android**: Google Play の審査（通常数時間〜1日）

---

## 11. Morincum-batch デプロイ

### 11-1. NAT Gateway 有効化（デプロイ時のみ）

batch Lambda は外部API（yfinance等）を呼び出すため、NAT Gateway が必要です。  
**バッチデプロイ時のみ有効化し、完了後は削除してコスト削減します。**

```bash
cd morincum-backend/infrastructure

# NAT Gateway 付きで Network・API スタックを更新
cdk deploy Morincum-Network-prod Morincum-Api-prod \
  -c env=prod \
  -c natGateways=1
```

### 11-2. Morincum-batch CDK デプロイ

```bash
cd morincum-batch

# 依存関係インストール（Python仮想環境）
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# CDK デプロイ
cdk deploy --all -c env=prod
```

### 11-3. NAT Gateway 削除（デプロイ後）

```bash
cd morincum-backend/infrastructure

# NAT Gateway を削除してコスト削減
cdk deploy Morincum-Network-prod Morincum-Api-prod \
  -c env=prod \
  -c natGateways=0
```

> 💡 次回バッチの更新時も同様に natGateways=1 → デプロイ → natGateways=0 の手順で行います。

---

## 12. RevenueCat Webhook URL 本番設定

APIが稼働し、SSMのシークレットが設定された後に実施します。

1. [RevenueCat ダッシュボード](https://app.revenuecat.com) → プロジェクト設定
2. 「Webhooks」→ 「＋ New webhook」
3. URL: `https://api.morincum.com/webhooks/revenuecat`
4. Authorization header: シークレット文字列（SSMに登録したものと同じ値）
5. 「Test webhook」でテスト送信し `200 OK` を確認

---

## 13. 動作確認チェックリスト

### インフラ

- [ ] `https://api.morincum.com/health` が `{"status":"ok"}` を返すこと
- [ ] `https://api.morincum.com/guest/fx/latest` が為替レートを返すこと
- [ ] `https://api.morincum.com/guest/versions/latest` がバージョン情報を返すこと
- [ ] RDS に V001〜V010 のマイグレーションが適用済みであること

```bash
# マイグレーション確認
aws lambda invoke \
  --function-name morincum-db-migrate-prod \
  --payload '{"action":"list_migrations"}' \
  --cli-binary-format raw-in-base64-out /tmp/check.json 2>/dev/null; cat /tmp/check.json
```

### RevenueCat

- [ ] Webhook テスト送信で `200 OK` が返ること
- [ ] iOS Sandbox テストで購入フローが完了すること
- [ ] RevenueCat ダッシュボードで `INITIAL_PURCHASE` イベントが確認できること
- [ ] `users.is_premium` が `true` に更新されること

### アプリ（Sandbox/テストトラック）

- [ ] アプリ起動〜初回チュートリアルが表示されること
- [ ] 銘柄追加・配当金表示が正常に動作すること
- [ ] Standardプラン購入フローが完了すること
- [ ] プラン期限切れ後にダウングレードメッセージが表示されること
- [ ] 広告がFreeプランで表示され、Standardプランで非表示になること

### バッチ

- [ ] 為替レートバッチが正常実行されること
- [ ] subscription-sync バッチが正常実行されること

---

## 補足: 主要なAWSリソース名一覧（prod）

| リソース | 名前 |
|---|---|
| VPC | `morincum-vpc-prod` |
| RDS インスタンス | `morincum-database-prod` |
| Lambda (API) | `morincum-api-prod` |
| Lambda (db-migrate) | `morincum-db-migrate-prod` |
| API Gateway | `morincum-api-prod` |
| カスタムドメイン | `api.morincum.com` |
| Cognito User Pool | `morincum-user-pool-prod` |
| S3 (バッチデータ) | `morincum-batch-data-prod-<accountId>` |
| S3 (アセット) | `morincum-assets-prod-<accountId>` |
| CloudWatch LogGroup | `/aws/lambda/morincum-prod` |
