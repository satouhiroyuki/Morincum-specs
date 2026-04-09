# App Store Connect サブスクリプション設定手順

Morincumアプリ（iOS）でのIn-App Purchase（サブスクリプション）を有効にするための手順書です。  
この作業は **EASビルド・ストア申請の前** に完了させてください。

---

## 前提条件

- [ ] **Apple Developer Program** に加入済み（年額 $99）
- [ ] Apple ID でログイン済み
- [ ] [App Store Connect](https://appstoreconnect.apple.com) にアクセス可能
- [ ] [Apple Developer Portal](https://developer.apple.com/account) にアクセス可能

---

## 目次

1. [Bundle ID 登録（Apple Developer Portal）](#1-bundle-id-登録)
2. [App Store Connect でアプリ登録](#2-app-store-connect-でアプリ登録)
3. [サブスクリプション商品登録](#3-サブスクリプション商品登録)
4. [App Store Connect API Key 発行（RevenueCat連携用）](#4-app-store-connect-api-key-発行)
5. [Sandbox テストユーザー作成](#5-sandbox-テストユーザー作成)
6. [審査用スクリーンショット・説明文の準備](#6-審査用スクリーンショット説明文の準備)

---

## 1. Bundle ID 登録

Apple Developer Portal でBundleIDを登録します。

1. [Apple Developer Portal](https://developer.apple.com/account) → 「Certificates, Identifiers & Profiles」
2. 「Identifiers」→「＋」
3. 「App IDs」→「App」を選択
4. 設定:
   - **Bundle ID**: `com.morincum.haitonomori`（Explicit）
   - **Description**: `配当の森 by MORINCUM`
5. Capabilities で以下を有効化:
   - **In-App Purchase** ← 必須
   - **Push Notifications**（必要に応じて）
6. 「Register」

> ⚠️ EAS Build を使う場合、EAS が自動的に Provisioning Profile を管理します。  
> `eas credentials` コマンドで確認できます。

---

## 2. App Store Connect でアプリ登録

### 2-1. 新規アプリ作成

1. [App Store Connect](https://appstoreconnect.apple.com) → 「マイApp」→「＋」→「新規App」
2. 設定:

| 項目 | 値 |
|---|---|
| プラットフォーム | iOS |
| 名前 | `配当の森 by MORINCUM` |
| プライマリ言語 | 日本語 |
| バンドルID | `com.morincum.haitonomori` |
| SKU | `morincum-haitonomori` |
| ユーザーアクセス | フルアクセス |

3. 「作成」

### 2-2. アプリ情報の入力

「App情報」タブで基本情報を入力：

| 項目 | 値 |
|---|---|
| カテゴリ（プライマリ） | ファイナンス |
| コンテンツ権利 | 第三者のコンテンツを含まない |
| 年齢区分 | 4+ |

「プライバシーポリシー URL」に入力（例: `https://morincum.jp/privacy`）

---

## 3. サブスクリプション商品登録

### 3-1. サブスクリプショングループ作成

1. 「App内課金」→「サブスクリプション」→「サブスクリプショングループ」→「＋」
2. **グループ参照名**: `プレミアムプラン`
3. 「作成」

### 3-2. サブスクリプション商品作成

1. 作成したグループ内で「＋」
2. 設定:

| 項目 | 値 |
|---|---|
| 参照名 | `Standard月額プラン` |
| 製品ID | `com.morincum.standard_monthly` |

3. 「作成」→ 商品詳細画面へ

### 3-3. 価格設定

1. 「価格と地域の可用性」→ 「価格スケジュールを追加」
2. 設定:

| 項目 | 値 |
|---|---|
| 基準国 | 日本 |
| 価格 | **¥480 / 月**（Tier 5） |
| 開始日 | 初回リリース日 |

> 💡 Tier 5 = ¥480。Apple の税込価格に合わせて Tier を選択してください。

### 3-4. ローカライズ（日本語）

「App Store ローカライズ情報」→ 日本語を追加:

| 項目 | 値 |
|---|---|
| 表示名 | `Standardプラン` |
| 説明 | `広告非表示・CSVエクスポート・バックアップ機能が使えるプレミアムプランです。` |

英語も追加（必須の場合）:

| 項目 | 値 |
|---|---|
| 表示名 | `Standard Plan` |
| 説明 | `Premium plan with no ads, CSV export, and backup features.` |

### 3-5. 審査情報

「審査情報」セクション:

| 項目 | 内容 |
|---|---|
| スクリーンショット | サブスク購入画面のスクリーンショット |
| メモ | テスト用Sandboxアカウントとパスワードを記載 |

### 3-6. 商品の有効化

設定完了後「送信」→ ステータスが「審査待ち」になります。  
アプリ本体の審査と同時に審査されます。

---

## 4. App Store Connect API Key 発行

RevenueCat が App Store のレシートを検証するために必要です。

1. App Store Connect → 「ユーザーとアクセス」→「統合」→「App Store Connect API」
2. 「キーを生成」
3. 設定:

| 項目 | 値 |
|---|---|
| 名前 | `RevenueCat` |
| アクセス | `ファイナンス` |

4. `.p8` ファイルをダウンロード（**一度しかダウンロードできない** ので保管に注意）
5. 以下を控える:

| 情報 | 確認場所 |
|---|---|
| **Key ID** | キー一覧の「キー ID」列 |
| **Issuer ID** | ページ上部「Issuer ID」 |
| **秘密鍵（.p8ファイル）** | ダウンロードしたファイル |

> これらは RevenueCat の設定（STEP 7-2）で使用します。

---

## 5. Sandbox テストユーザー作成

アプリ申請前にサブスクリプション購入をテストするために必要です。

1. App Store Connect → 「ユーザーとアクセス」→「Sandbox」→「テスター」→「＋」
2. テストアカウントを作成（実在しないメールアドレスで OK）:

| 項目 | 値（例） |
|---|---|
| 名 | `Test` |
| 姓 | `User` |
| メールアドレス | `sandbox-morincum@example.com` |
| パスワード | 8文字以上（記号・大文字含む） |
| 国/地域 | 日本 |

3. テスト端末の iOS 設定 → 「App Store」→「サンドボックスアカウント」でログイン

> ⚠️ Sandbox では購入が無料・即時に完了し、サブスク期間が短縮されます（月額 → 5分相当）。

---

## 6. 審査用スクリーンショット・説明文の準備

App Store 審査に必要な情報をまとめます。

### 必要なスクリーンショット

- iPhone 6.9インチ（iPhone 16 Pro Max）サイズが必須
- 以下の画面を準備:
  - ホーム画面（ポートフォリオ）
  - 銘柄追加画面
  - 設定画面
  - サブスクリプション購入画面

### アプリ説明文（日本語）

```
配当の森は、株式・ETFの配当金を管理する家計簿アプリです。

【主な機能】
・配当金の年間・月別集計
・銘柄別ポートフォリオ管理
・NISA口座管理
・複数口座対応（無料: 1口座、Standard: 3口座）
・為替レート対応（米国株・ETF）
・CSVエクスポート（Standardプラン）

【Standardプラン（月額¥480）】
・広告非表示
・3口座まで管理可能
・CSVエクスポート
・データバックアップ
```

### キーワード

```
配当,配当金,株,投資,NISA,ETF,ポートフォリオ,家計簿,配当管理,資産管理
```

---

## チェックリスト

- [ ] Bundle ID `com.morincum.haitonomomi` を Apple Developer Portal に登録した
- [ ] App Store Connect にアプリを作成した
- [ ] サブスクリプショングループ「プレミアムプラン」を作成した
- [ ] 製品ID `com.morincum.standard_monthly`（¥480/月）を登録した
- [ ] 日本語・英語のローカライズを追加した
- [ ] App Store Connect API Key（.p8）を発行・保管した
- [ ] Key ID と Issuer ID を控えた
- [ ] Sandbox テストユーザーを作成した

---

## 次のステップ

- [RevenueCat 設定手順](./billing-setup-revenuecat.md) → App Store Connect API Key を登録する
- [本番環境構築ガイド](./prod-setup-guide.md) Step 9, 10 → EAS ビルド & 申請
