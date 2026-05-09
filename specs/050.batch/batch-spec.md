# Morincum-batch システム仕様書

> ソース: Morincum-batch/docs/spec/morincum-batch-spec.md

---

## 目次

1. [システム概要](#1-システム概要)
2. [アーキテクチャ](#2-アーキテクチャ)
3. [AWS環境構成](#3-aws環境構成)
4. [バッチ処理詳細](#4-バッチ処理詳細)
5. [外部API連携](#5-外部api連携)
6. [バックエンドAPIとの連携](#6-バックエンドapiとの連携)
7. [Slack連携](#7-slack連携)
8. [CI/CD](#8-cicd)
9. [コスト試算](#9-コスト試算)
10. [Issue一覧](#10-issue一覧)

---

## 1. システム概要

| 項目 | 内容 |
|---|---|
| システム名 | Morincum-batch |
| 目的 | 外部APIからのデータ取得・AI生成・Slack/X連携の定期処理 |
| 言語 | Python |
| 実行環境 | AWS Lambda（ARM64）+ EventBridge Scheduler |
| リポジトリ | Morincum-batch（プライベート） |

### Morincum-backendとの役割分担

| 役割 | Morincum-backend | Morincum-batch |
|---|---|---|
| フロントへのAPI提供 | ✅ | ❌ |
| RDS管理・CRUD | ✅ | ❌（Internal API経由） |
| 外部API呼び出し | ❌ | ✅ |
| Claude API（AI生成） | ❌ | ✅ |
| Slack Bot・コマンド | ❌ | ✅ |
| X API投稿 | ❌ | ✅ |
| 定期バッチ処理 | ❌ | ✅ |
| NAT Gateway | 不要 | **不要**（全接続先がパブリックURL） |

---

## 2. アーキテクチャ

```
【定期実行系】
EventBridge Scheduler
    ↓ Lambda直接起動（APIエンドポイント不要）
Lambda（Python・ARM64）
    ├── yfinance / 投資信託協会API / ECB API
    │       ↓ データ取得・整形
    │       S3（中間バッファ）
    │       ↓ S3キーをPOST（IAM認証）
    │       Morincum-backend Internal API
    │               ↓ S3からJSON取得 → RDSにupsert
    │
    ├── Claude API
    │       ↓ GET /internal/stats（バックエンド）で統計取得
    │       Claude APIでテキスト生成
    │       ↓ POST /internal/news or /internal/x-posts
    │       Morincum-backend Internal API
    │
    └── Slack / X API
            ↓ 通知・投稿

【オンデマンド系】
Slack（メンション・コマンド）
    ↓ Slack Events API → API Gateway
Lambda（受信・即時200 OK返却）
    ↓ 非同期で処理用Lambdaを起動
Lambda（処理）
    ├── バックエンドAPI（統計取得）
    ├── Claude API（自然言語変換）
    └── Slack API（返答）
```

---

## 3. AWS環境構成

### 基本方針

バッチは「外部から情報を取得してバックエンドに登録する」処理が主。**送り先のバックエンドURLを環境変数で切り替えるだけで十分**なため、Lambdaのリソースは1セットで管理する。

```
Lambda（stock-price-batch）× 1本
    ├── 環境変数 BACKEND_API_URL=https://api.morincum.com      → prod向け
    ├── 環境変数 BACKEND_API_URL=https://api-stg.morincum.com  → stg向け
    └── 環境変数 BACKEND_API_URL=https://api-dev.morincum.com  → dev向け
```

### Stackの構成

| Stack | 主なリソース |
|---|---|
| BatchComputeStack | Lambda関数群（Python）・IAMロール・環境変数 |
| BatchSchedulerStack | EventBridge Scheduler（prodのみ有効） |
| BatchStorageStack | S3バケット（中間データ用） |
| BatchApiStack | API Gateway（Slack受信用・HTTP API） |

> BatchNetworkStack（VPC・NAT Gateway）は廃止。Lambda は VPC 外で動作し、NAT Gateway は不要。

### 環境構成

| 項目 | 方針 |
|---|---|
| Lambdaリソース | **1セットのみ**（3環境分は作らない） |
| 送り先バックエンドURL | 環境変数 `BACKEND_API_URL` で切り替え |
| NAT Gateway | **不要**（Lambda を VPC 外に配置） |
| EventBridgeスケジュール | **prodのみ有効**（dev・stgは手動実行） |

### Lambda関数一覧

| 関数名 | トリガー | メモリ | タイムアウト |
|---|---|---|---|
| stock-price-batch | EventBridge | 512MB | 15分 |
| dividend-batch | EventBridge | 256MB | 10分 |
| fund-price-batch | EventBridge | 256MB | 10分 |
| fx-rate-batch | EventBridge | 128MB | 3分 |
| news-generate-batch | EventBridge | 256MB | 5分 |
| x-post-generate-batch | EventBridge | 256MB | 5分 |
| slack-event-receiver | API Gateway | 128MB | 3秒 |
| slack-event-processor | Lambda（非同期） | 256MB | 5分 |
| slack-command-receiver | API Gateway | 128MB | 3秒 |
| slack-command-processor | Lambda（非同期） | 256MB | 3分 |

---

## 4. バッチ処理詳細

### バッチ実行スケジュール一覧

| バッチ名 | 実行タイミング（JST） | 概要 |
|---|---|---|
| fx-rate-batch | 平日 18:00 | 為替レート取得（ECB） |
| stock-price-batch | 平日 16:30 / 翌 6:30 | 株価OHLCV取得（yfinance） |
| dividend-batch | 平日 17:00 | 配当情報取得（yfinance） |
| fund-price-batch | 平日 19:00 | 投信基準価額取得（投資信託協会） |
| news-generate-batch | 毎週月曜 8:00 | 統計→Claude API→ニュース生成 |
| x-post-generate-batch | 毎日 9:00 | 統計→Claude API→X投稿文生成 |

---

### 4.1 株価取得バッチ（stock-price-batch）

**処理フロー：**

```
1. GET /stocks?limit=5000 で対象銘柄リストを取得
2. yfinanceで銘柄ごとにOHLCVデータを取得
3. 取得データをJSONに整形
4. S3に保存（prices/2026-03-25.json）
5. POST /internal/batch/prices にS3キーを送信
6. バックエンドがS3からJSONを取得してRDSにupsert
7. 完了をSlackに通知（エラー時のみ）
```

**S3保存フォーマット：**

```json
{
  "price_date": "2026-03-25",
  "prices": [
    {
      "ticker": "8058",
      "open": 3200, "high": 3280, "low": 3190,
      "close": 3240, "adjusted_close": 3240,
      "volume": 1250000, "currency": "JPY"
    }
  ]
}
```

> ⚠️ yfinanceは非公式APIのため突発的な仕様変更リスクあり。将来的にJ-Quants Premiumへの移行を検討。

---

### 4.2 配当情報取得バッチ（dividend-batch）

**処理フロー：**

```
1. GET /stocks?limit=5000 で対象銘柄リストを取得
2. yfinanceで銘柄ごとに配当情報を取得
3. S3に保存（dividends/2026-03-25.json）
4. POST /internal/batch/dividends にS3キーを送信
5. 新規配当発表があった場合のみSlackに通知
```

**S3保存フォーマット：**

```json
{
  "fetched_date": "2026-03-25",
  "dividends": [
    {
      "ticker": "8058",
      "amount": 140, "currency": "JPY",
      "ex_dividend_date": "2026-03-28",
      "payment_date": "2026-06-10",
      "fiscal_period": "2025Q4"
    }
  ]
}
```

---

### 4.3 投資信託基準価額取得バッチ（fund-price-batch）

- データソース: 投資信託協会API（公式・無料）
- 実行タイミング: 平日 19:00 JST（基準価額公表後）

**S3保存フォーマット：**

```json
{
  "price_date": "2026-03-25",
  "fund_prices": [
    {
      "ticker": "0331418A",
      "nav": 23800,
      "total_net_assets": 12500000000,
      "distribution": 0,
      "currency": "JPY"
    }
  ]
}
```

---

### 4.4 為替レート取得バッチ（fx-rate-batch）

- データソース: 欧州中央銀行（ECB）API（公式・無料）
- 実行タイミング: 平日 18:00 JST

> フロントエンドは直接ECB APIを呼ばずバックエンドの `/fx/latest` を使います。これによりレートの取得元が一本化されます。

---

### 4.5 AIニュース生成バッチ（news-generate-batch）

- 実行タイミング: 毎週月曜 8:00 JST

**処理フロー：**

```
1. GET /internal/stats/users・portfolio・surveys で統計取得
2. 統計データをClaudeのプロンプトに組み込む
3. Claude APIでニュース文を生成（日本語・英語）
4. POST /internal/news でバックエンドに保存
5. GET /notifications で配信される
```

---

### 4.6 X投稿文生成バッチ（x-post-generate-batch）

- 実行タイミング: 毎日 9:00 JST

**投稿カテゴリのローテーション：**

| 曜日 | カテゴリ |
|---|---|
| 月・金 | アプリの統計・ユーザー動向 |
| 火・木・土 | 配当金・株主優待のお役立ち情報 |
| 水 | メンテナンス・お知らせ（なければ統計） |
| 日 | 週間まとめ |

**Phase 1**: AI生成 → Slackにコピペ用テキスト通知 → 手動投稿
**Phase 2**: Slackで承認ボタン → X API v2で自動投稿

---

### 4.7 Slack Bot（slack-event-processor）

3秒タイムアウト対策として2-Lambda非同期パターンを採用：

```
slack-event-receiver（即時200 OK）
    ↓ 非同期起動
slack-event-processor（処理・返答）
```

**対応質問例：**

| 質問例 | 呼び出すAPI |
|---|---|
| 今日のDAUは？ | GET /internal/stats/users |
| 先週のアンケート回答数は？ | GET /internal/stats/surveys |
| 人気の業種は？ | GET /internal/stats/portfolio |

---

### 4.8 Slackコマンド処理（slack-command-processor）

| コマンド | バックエンドAPI |
|---|---|
| `/maintenance create` | POST /internal/maintenances |
| `/maintenance incident` | POST /internal/maintenances |
| `/maintenance resolve` | POST /internal/maintenances |
| `/announcement create` | POST /internal/announcements |

---

## 5. 外部API連携

### データ取得系

| データ | API | コスト | 備考 |
|---|---|---|---|
| 日本株・米国株 株価 | yfinance | 無料 | 非公式・遅延あり |
| 日本株・米国株 配当情報 | yfinance | 無料 | 非公式 |
| 投資信託 基準価額・分配金 | 投資信託協会API | 無料 | 公式 |
| 為替レート（USD/JPY） | ECB API | 無料 | 公式 |

### AI・通知系

| サービス | 用途 | コスト |
|---|---|---|
| Claude API | ニュース・X投稿文生成・Slack Bot返答 | ~$3〜5/月 |
| Slack API | Bot・コマンド・通知 | 無料 |
| X API v2（Phase 2） | X自動投稿 | $100/月 |

### S3バケット構成

```
morincum-batch-data/
  ├── prices/          # 株価データ
  ├── dividends/       # 配当情報
  ├── fund_prices/     # 投信基準価額
  ├── fx_rates/        # 為替レート
  └── archive/         # 処理完了後に移動
```

---

## 6. バックエンドAPIとの連携

### バッチが呼び出すInternal API一覧

| エンドポイント | メソッド | 呼び出しバッチ |
|---|---|---|
| `/internal/batch/prices` | POST | stock-price-batch |
| `/internal/batch/dividends` | POST | dividend-batch |
| `/internal/batch/fund-prices` | POST | fund-price-batch |
| `/internal/batch/fx-rates` | POST | fx-rate-batch |
| `/internal/stats/users` | GET | news / x-post / slack-bot |
| `/internal/stats/surveys` | GET | news / slack-bot |
| `/internal/stats/portfolio` | GET | news / x-post / slack-bot |
| `/internal/news` | POST | news-generate-batch |
| `/internal/x-posts` | POST | x-post-generate-batch |
| `/internal/announcements` | POST | slack-command-processor |
| `/internal/maintenances` | POST | slack-command-processor |
| `/stocks` | GET | stock-price / dividend / fund-price |

---

## 7. Slack連携

### SSM Parameter Store

| パラメータ名 | タイプ |
|---|---|
| `/morincum/slack/bot-token` | SecureString |
| `/morincum/slack/signing-secret` | SecureString |
| `/morincum/slack/allowed-channel-id` | String |
| `/morincum/claude/api-key` | SecureString |
| `/morincum/x/bearer-token` | SecureString（Phase 2） |
| `/morincum/backend/api-url` | String |

---

## 8. CI/CD

| ファイル | トリガー | 内容 |
|---|---|---|
| ci.yml | PR作成時 | pytest・flake8・CDK diff |
| cd-dev.yml | developマージ時 | CDK deploy・Lambdaデプロイ |
| cd-staging.yml | stagingマージ時 | 同上 |
| cd-prod.yml | mainマージ時 | GitHub Environments承認後にデプロイ |

---

## 9. コスト試算

| サービス | 月額目安 | 備考 |
|---|---|---|
| Lambda | ~$0.5 | 無料枠内に収まる可能性高 |
| ~~NAT Gateway~~ | ~~$33~~ | **廃止**（Lambda VPC撤去により不要） |
| S3（中間バッファ） | ~$0.5 | |
| EventBridge Scheduler | ~$0.5 | prodのみ有効 |
| API Gateway（Slack受信） | ~$0.5 | |
| Claude API | ~$3〜5 | ニュース・X投稿文・Slack Bot |
| X API（Phase 2のみ） | $100 | Basicプラン |
| **Phase 1 合計** | **~$5〜10/月** | **約800〜1,600円**（NAT GW廃止で大幅削減） |
| **Phase 2 合計** | **~$105〜110/月** | **約16,700〜17,500円** |

---

## 10. Issue一覧

| Issue | 内容 | フェーズ |
|---|---|---|
| #B1 | リポジトリ構成の整備 | Phase 1 |
| #B2 | バッチ用AWSインフラ構成（CDK） | Phase 1 |
| #B3 | 株価・配当データ取得バッチ | Phase 1 |
| #B4 | 投資信託基準価額・分配金取得バッチ | Phase 1 |
| #B5 | 為替レート取得バッチ | Phase 1 |
| #B6 | Slack Bot実装（システム状態問い合わせ） | Phase 1 |
| #B7 | Slackメンテナンス・お知らせ管理コマンド | Phase 1 |
| #B8 | AIニュース生成バッチ | Phase 1 |
| #B9 | X投稿文生成・Slack通知バッチ | Phase 1〜2 |
| #B10 | バッチCI/CDパイプラインの構築 | Phase 1 |
