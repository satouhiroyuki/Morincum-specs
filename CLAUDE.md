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

## 作業ルール

1. **日本語で記述する** — ドキュメントは基本的に日本語で記述します
2. **既存ファイルは保護する** — 既存ファイルを削除せず、内容は統合・追記する形で更新します
3. **構成に従って追加する** — 新しい仕様書は `specs/` 以下の適切なディレクトリに追加します
4. **ソース追跡** — 各ファイルは各リポジトリの既存ドキュメントから統合・集約したものです
