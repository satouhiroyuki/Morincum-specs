# Morincum 仕様書インデックス

Morincumブランドファミリー全体の仕様書一覧です。プロダクトごとにディレクトリを分けて管理しています。

| プロダクト | ディレクトリ | 内容 |
|---|---|---|
| 配当の森（Morincum） | [`.`](.)（直下の `010.product`〜`100.legal`） | 配当・NISA管理アプリ。フロント/バックエンド/バッチの複数リポジトリ構成 |
| 家計の森（kakeinomori） | [`kakeinomori/`](kakeinomori/) | クレカ明細のタグ×予算仕分けアプリ。`kakei_no_mori-frontend` 単一リポジトリ・完全オンデバイス |

---

## 配当の森（Morincum）

### 010. プロダクト

| ファイル | 説明 |
|---|---|
| [brand.md](010.product/brand.md) | デザインガイドライン（カラーパレット・タイポグラフィ・コンポーネント） |
| [roadmap.md](010.product/roadmap.md) | ロードマップ・Issue一覧（Phase 1/2） |
| [user-manual.md](010.product/user-manual.md) | 操作マニュアル・ヘルプ |

### 020. システム

| ファイル | 説明 |
|---|---|
| [architecture.md](020.system/architecture.md) | アーキテクチャガイドライン（フロント・バックエンド・全体構成） |
| [billing-flow.md](020.system/billing-flow.md) | サブスク購入フロー（RevenueCat・iOS/Android） |
| [security.md](020.system/security.md) | セキュリティ設計（Cognito認証・AWS WAF・ローカルセキュリティ） |
| [user-flow.md](020.system/user-flow.md) | ユーザーフロー設計（認証状態・画面遷移） |

### 030. データベース

| ファイル | 説明 |
|---|---|
| [backend-schema.md](030.database/backend-schema.md) | バックエンド PostgreSQLスキーマ（Phase 1/2） |
| [frontend-schema.md](030.database/frontend-schema.md) | フロントエンド SQLiteスキーマ（10テーブル） |

### 040. API

| ファイル | 説明 |
|---|---|
| [backend-openapi.yaml](040.api/backend-openapi.yaml) | バックエンドAPI OpenAPI仕様書（23エンドポイント） |
| [batch-openapi.yaml](040.api/batch-openapi.yaml) | バッチAPI OpenAPI仕様書（Slack受信） |
| [api-test-guide.md](040.api/api-test-guide.md) | APIテストガイド（認証方式・curlサンプル） |

### 050. バッチ

| ファイル | 説明 |
|---|---|
| [batch-spec.md](050.batch/batch-spec.md) | バッチ処理システム仕様書 |

### 060. インフラ

| ファイル | 説明 |
|---|---|
| [aws-infra.md](060.infra/aws-infra.md) | AWS環境構成・初期設定手順 |
| [cicd.md](060.infra/cicd.md) | CI/CDパイプライン（全リポジトリ統合） |

### 100. 法的文書

| ファイル | 説明 |
|---|---|
| [privacy-policy.md](100.legal/privacy-policy.md) | プライバシーポリシー |

---

## 家計の森（kakeinomori）

> Issue管理は `kakei_no_mori-frontend` リポジトリ内で完結（配当の森のような複数リポジトリをまたぐ親子Issue運用は行わない）

### 010. プロダクト

| ファイル | 説明 |
|---|---|
| [product-plan.md](kakeinomori/010.product/product-plan.md) | プロダクト定義・タグ×予算モデル・収益モデル・開発フェーズ・リスク |
| [design-guideline.md](kakeinomori/010.product/design-guideline.md) | デザインガイドライン（配当の森ブランドの継承・カラートークン対応表） |

### 020. システム

| ファイル | 説明 |
|---|---|
| [ui-spec.md](kakeinomori/020.system/ui-spec.md) | 仕分けUI仕様（箱モード・スワイプモード）・画面構成・技術方針 |
| [csv-import.md](kakeinomori/020.system/csv-import.md) | CSV取込仕様（JCB/MyJCB）・月の基準日モデル |

### 030. データベース

| ファイル | 説明 |
|---|---|
| [frontend-schema.md](kakeinomori/030.database/frontend-schema.md) | 端末内データモデル（CARD_ACCOUNT / IMPORT_BATCH / TRANSACTION / TAG） |
