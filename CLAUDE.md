# Morincum-specs

Morincumプロジェクト全体の仕様書・ドキュメントを一元管理するリポジトリです。

## プロジェクト概要

| リポジトリ | 役割 | 技術スタック |
|---|---|---|
| **Morincum** | フロントエンド（iOS/Androidアプリ） | React Native + Expo + TypeScript |
| **Morincum-backend** | バックエンドAPI + インフラ | TypeScript + AWS CDK + Lambda + RDS PostgreSQL |
| **Morincum-batch** | 定期バッチ処理 | Python + AWS Lambda + EventBridge Scheduler |
| **Morincum-specs** | 仕様書管理（このリポジトリ） | Markdown + YAML |

## 仕様書構成

```
specs/
├── 010.product/     # プロダクト仕様（ブランド・ロードマップ・マニュアル）
├── 020.system/      # システム設計（アーキテクチャ・認証・フロー）
├── 030.database/    # データベース設計（フロント・バックエンド）
├── 040.api/         # API仕様書（OpenAPI・テストガイド）
├── 050.batch/       # バッチ処理仕様
├── 060.infra/       # インフラ・CI/CD
└── 100.legal/       # 法的文書（プライバシーポリシー）
```

索引は [`specs/README.md`](specs/README.md) を参照してください。

## ブランチ運用ルール

### ブランチ命名規則

```
feature/<specs-issue番号>-<短い説明>
```

**例:**
- `feature/12-upgrade-premium-display`
- `feature/15-batch-dividend-sync`
- `feature/20-csv-export`

### ルール

1. **Specs の Issue を起点にする** — 作業はすべて Morincum-specs の Issue に紐づける
2. **全リポジトリで同名ブランチを使う** — 同一 Issue の変更は Morincum / Morincum-backend / Morincum-batch / Morincum-specs で同じブランチ名を使う
3. **検証可能な状態でコミットする** — 動作確認できる単位でコミットし、中途半端な状態でプッシュしない
4. **ブランチから PR を作成する** — 作業完了後、各リポジトリで `feature/XXX` → `develop`（または `main`）への PR を作成する

### フロー

```
Morincum-specs で Issue 作成
  ↓
feature/<issue番号>-<説明> ブランチを各リポジトリで作成
  ↓
変更が必要なリポジトリにコミット（全リポジトリで同名ブランチ）
  ↓
検証可能になったら各リポジトリで PR 作成
  ↓
レビュー・マージ → Issue クローズ
```

---

## 作業ルール

1. **日本語で記述する** — ドキュメントは基本的に日本語で記述します
2. **既存ファイルは保護する** — 既存ファイルを削除せず、内容は統合・追記する形で更新します
3. **構成に従って追加する** — 新しい仕様書は `specs/` 以下の適切なディレクトリに追加します
4. **ソース追跡** — 各ファイルは各リポジトリの既存ドキュメントから統合・集約したものです
