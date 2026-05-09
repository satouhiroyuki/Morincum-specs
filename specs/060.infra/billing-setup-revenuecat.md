# RevenueCat 設定手順

Morincumアプリのサブスクリプション管理基盤（RevenueCat）を設定する手順書です。  
App Store Connect・Google Play Console の設定完了後に実施してください。

---

## 前提条件

- [ ] [App Store Connect 設定](./billing-setup-appstore.md) 完了済み
  - 製品ID `com.morincum.standard_monthly` を登録済み
  - App Store Connect API Key（.p8ファイル・Key ID・Issuer ID）を取得済み
- [ ] [Google Play Console 設定](./billing-setup-googleplay.md) 完了済み
  - 製品ID `standard_monthly` を登録済み
  - Google Cloud サービスアカウント JSON を取得済み
- [ ] Morincum-backend が稼働中（Webhook設定用）

---

## 目次

1. [RevenueCat アカウント作成・プロジェクト作成](#1-revenuecat-アカウント作成プロジェクト作成)
2. [iOS アプリ登録](#2-ios-アプリ登録)
3. [Android アプリ登録](#3-android-アプリ登録)
4. [Products 登録](#4-products-登録)
5. [Entitlements 設定](#5-entitlements-設定)
6. [Offerings 設定](#6-offerings-設定)
7. [Webhook 設定（バックエンド連携）](#7-webhook-設定)
8. [SDK API Key の確認とEAS登録](#8-sdk-api-key-の確認とeas登録)
9. [動作テスト](#9-動作テスト)

---

## 1. RevenueCat アカウント作成・プロジェクト作成

### 1-1. アカウント作成

1. [RevenueCat](https://app.revenuecat.com) にアクセス
2. 「Get started for free」→ アカウント作成（GitHub/Google でサインアップ可）

### 1-2. プロジェクト作成

1. ダッシュボード → 「Create new project」
2. 設定:

| 項目 | 値 |
|---|---|
| プロジェクト名 | `morincum` |

3. 「Create project」

---

## 2. iOS アプリ登録

### 2-1. iOS アプリを追加

1. プロジェクト設定 → 「Apps」→ 「＋ New app」
2. 「App Store」を選択
3. 設定:

| 項目 | 値 |
|---|---|
| App name | `配当の森 by MORINCUM` |
| Bundle ID | `com.morincum.haitonomomi` |
| App Store Connect App-Specific Shared Secret | （後述） |

### 2-2. Shared Secret の設定

App Store Connect でアプリ固有の共有シークレットを取得します。

1. App Store Connect → 「マイApp」→ 「配当の森 by MORINCUM」
2. 「App情報」→「App固有の共有シークレット」→「生成」
3. 生成されたシークレットを RevenueCat の「App Store Connect App-Specific Shared Secret」に貼り付け

### 2-3. App Store Connect API Key の設定

RevenueCat が自動でレシート検証・製品情報を取得するために必要です。

1. RevenueCat → プロジェクト設定 → 「App Store Connect API Key」→「追加」
2. 設定:

| 項目 | 値 |
|---|---|
| Issuer ID | App Store Connect で取得した Issuer ID |
| Key ID | App Store Connect で取得した Key ID |
| Private Key | .p8 ファイルの内容（テキストをそのまま貼り付け） |

3. 「保存」

> .p8 ファイルの内容は `-----BEGIN PRIVATE KEY-----` から `-----END PRIVATE KEY-----` まで含めて貼り付けます。

---

## 3. Android アプリ登録

### 3-1. Android アプリを追加

1. プロジェクト設定 → 「Apps」→ 「＋ New app」
2. 「Google Play Store」を選択
3. 設定:

| 項目 | 値 |
|---|---|
| App name | `配当の森 by MORINCUM` |
| Package name | `com.morincum.haitonomori` |

### 3-2. Google Play サービスアカウント JSON の設定

1. RevenueCat → 「Service credentials」→「Google Play」→ JSON ファイルをアップロード
2. または JSON ファイルの内容をテキストで貼り付け
3. 「保存」→「Validate credentials」で検証が通ることを確認

---

## 4. Products 登録

RevenueCat に各ストアの商品を取り込みます。

### 4-1. iOS 商品のインポート

1. プロジェクト → 「Products」→「＋ New product」
2. 設定:

| 項目 | 値 |
|---|---|
| App | iOS（App Store）|
| Product identifier | `com.morincum.standard_monthly` |

3. 「Import」→ App Store から商品情報が自動取得されることを確認
4. タイプが「Auto-renewable subscription」になっていることを確認

### 4-2. Android 商品のインポート

1. 「＋ New product」
2. 設定:

| 項目 | 値 |
|---|---|
| App | Android（Google Play）|
| Product identifier | `standard_monthly:monthly` |

> Google Play では `<subscription_id>:<base_plan_id>` の形式で入力します。  
> 例: `standard_monthly:monthly`

3. 「Import」→ Google Play から商品情報が自動取得されることを確認

---

## 5. Entitlements 設定

「エンタイトルメント」は「何の機能を使えるか」を定義します。  
Morincum では有料機能へのアクセス権を `standard` として管理します。

### 5-1. Entitlement を作成

1. プロジェクト → 「Entitlements」→ 「＋ New entitlement」
2. 設定:

| 項目 | 値 |
|---|---|
| Identifier | `standard` |
| Display name | `Standard Plan` |

3. 「作成」

### 5-2. Products を Entitlement に紐付け

1. `standard` エンタイトルメントを開く
2. 「Attach products」→ 以下を両方追加:
   - iOS: `com.morincum.standard_monthly`
   - Android: `standard_monthly:monthly`
3. 「保存」

---

## 6. Offerings 設定

「オファリング」は「どの商品をいつ表示するか」を定義します。  
現時点では1種類のプランのみです。

### 6-1. Offering を作成

1. プロジェクト → 「Offerings」→「＋ New offering」
2. 設定:

| 項目 | 値 |
|---|---|
| Identifier | `default` |
| Description | `デフォルトオファリング` |

3. 「作成」

### 6-2. Package を追加

1. `default` オファリングを開く
2. 「＋ Add package」
3. 設定:

| 項目 | 値 |
|---|---|
| Identifier | `$rc_monthly`（RevenueCat標準識別子） |
| Display name | `月額プラン` |

4. iOS product と Android product を紐付け:
   - iOS: `com.morincum.standard_monthly`
   - Android: `standard_monthly:monthly`
5. 「保存」

---

## 7. Webhook 設定

RevenueCat からバックエンド（`POST /webhooks/revenuecat`）へ購入イベントを通知します。

### 7-1. Webhook シークレットの生成

Webhook 認証用のシークレット文字列を生成します（任意の強力な文字列）:

```bash
# ランダムシークレット生成（例）
openssl rand -hex 32
# → 例: a1b2c3d4e5f6... (64文字)
```

### 7-2. SSM Parameter Store に登録

```bash
aws ssm put-parameter \
  --name "/morincum/revenuecat/webhook-secret" \
  --value "<上で生成したシークレット>" \
  --type "SecureString" \
  --region ap-northeast-1
```

### 7-3. RevenueCat に Webhook を設定

1. RevenueCat → プロジェクト設定 → 「Integrations」→「Webhooks」
2. 「＋ New webhook」
3. 設定:

| 項目 | 値 |
|---|---|
| Webhook URL | `https://api.morincum.com/webhooks/revenuecat` |
| Authorization header | 上で生成したシークレット文字列（SSMに登録したものと **同じ値**） |

4. 「Test webhook」をクリック → バックエンドで `200 OK` が返ることを確認

> バックエンドが受信する RevenueCat イベントと is_premium の対応:
>
> | RevenueCat イベント | is_premium の変化 |
> |---|---|
> | `INITIAL_PURCHASE` | `false` → `true` |
> | `RENEWAL` | `true` 維持 |
> | `UNCANCELLATION` | `false` → `true` |
> | `CANCELLATION` | `true` → `false` |
> | `EXPIRATION` | `true` → `false` |
> | `REFUND` | `true` → `false` |

---

## 8. SDK API Key の確認と EAS 登録

フロントエンドアプリが RevenueCat SDK を初期化する際に必要です。

### 8-1. API Key を確認

1. RevenueCat → プロジェクト設定 → 「Apps」
2. iOS アプリの **Public SDK Key** を控える（例: `appl_XXXXXXXXXXXXXXXXXXXX`）
3. Android アプリの **Public SDK Key** を控える（例: `goog_XXXXXXXXXXXXXXXXXXXX`）

> ⚠️ **Public SDK Key** は公開鍵です。アプリに組み込んでも問題ありません。  
> **Secret API Key** は絶対に公開しないでください。

### 8-2. EAS シークレットに登録

```bash
cd morincum

# iOS SDK Key
eas secret:create --scope project \
  --name EXPO_PUBLIC_REVENUECAT_API_KEY_IOS \
  --value "appl_XXXXXXXXXXXXXXXXXXXX" \
  --profile production

# Android SDK Key
eas secret:create --scope project \
  --name EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID \
  --value "goog_XXXXXXXXXXXXXXXXXXXX" \
  --profile production
```

> 現在のフロントエンドは RevenueCat SDK を直接呼び出していません（バックエンドの `is_premium` フラグを参照）。  
> 将来フロント側で購入フローを実装する場合に使用します。

---

## 9. 動作テスト

### 9-1. Sandbox テスト（iOS）

1. テスト端末の「設定」→「App Store」→「サンドボックスアカウント」で Sandbox テストユーザーにサインイン
2. アプリを起動 → サブスクリプション購入フローを実行
3. 購入完了後、RevenueCat ダッシュボード → 「Customers」で購入履歴を確認
4. バックエンドの CloudWatch Logs で Webhook 受信を確認:

```bash
aws logs tail /aws/lambda/morincum-api-prod --follow --region ap-northeast-1 | grep revenuecat
```

5. DB で `is_premium` が更新されたことを確認:

```bash
# db-migrate Lambda 経由でクエリ（または直接RDS接続）
aws lambda invoke \
  --function-name morincum-db-migrate-prod \
  --payload '{"action":"query","sql":"SELECT id, is_premium FROM users ORDER BY created_at DESC LIMIT 5"}' \
  --cli-binary-format raw-in-base64-out \
  /tmp/query-out.json && cat /tmp/query-out.json
```

### 9-2. テスト用ライセンス（Android）

1. テスト端末に Google Play ライセンステスターアカウントでサインイン
2. アプリをインストール → サブスクリプション購入フローを実行
3. 同様に RevenueCat ダッシュボードと CloudWatch Logs で確認

### 9-3. キャンセルのテスト

iOS Sandbox ではサブスクを端末から手動キャンセルできます:

1. 「設定」→ Apple ID → 「サブスクリプション」→ テスト中のサブスクをキャンセル
2. RevenueCat から `CANCELLATION` イベントが送信される（数分後）
3. `is_premium` が `false` に更新されることを確認

---

## チェックリスト

- [ ] RevenueCat プロジェクト `morincum` を作成した
- [ ] iOS アプリを登録し、App Store Connect API Key を設定した
- [ ] Android アプリを登録し、サービスアカウント JSON を設定した
- [ ] iOS / Android の Products を登録した
- [ ] Entitlement `standard` を作成し、両商品を紐付けた
- [ ] Offering `default` を作成し、Package `$rc_monthly` を設定した
- [ ] Webhook シークレットを生成し、SSMに登録した
- [ ] RevenueCat に Webhook URL を設定し、テスト送信で `200 OK` を確認した
- [ ] SDK API Key を EAS シークレットに登録した
- [ ] Sandbox / ライセンステストで購入〜`is_premium` 更新の動作を確認した

---

## 関連ドキュメント

- [App Store Connect 設定手順](./billing-setup-appstore.md)
- [Google Play Console 設定手順](./billing-setup-googleplay.md)
- [本番環境構築ガイド](./prod-setup-guide.md)
- [課金フロー設計](../020.system/billing-flow.md)
- [バックエンド API 仕様](../040.api/backend-openapi.yaml) — `POST /webhooks/revenuecat`
