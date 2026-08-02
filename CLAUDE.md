# Morincum-specs

Morincumプロジェクト全体の仕様書・ドキュメントを一元管理するリポジトリです。

## プロジェクト概要

このリポジトリは Morincum ブランドファミリー**複数プロダクト**の仕様書を一元管理する。プロダクトごとに `specs/` 配下のディレクトリを分けている（[`specs/README.md`](specs/README.md) 参照）。

### 配当の森（Morincum） — フロント/バックエンド/バッチの複数リポジトリ構成

| リポジトリ | 役割 | 技術スタック |
|---|---|---|
| **Morincum** | フロントエンド（iOS/Androidアプリ） | React Native + Expo + TypeScript |
| **Morincum-backend** | バックエンドAPI + インフラ | TypeScript + AWS CDK + Lambda + RDS PostgreSQL |
| **Morincum-batch** | 定期バッチ処理 | Python + AWS Lambda + EventBridge Scheduler |
| **Morincum-specs** | 仕様書管理（このリポジトリ） | Markdown + YAML |

### 家計の森（kakeinomori） — 単一リポジトリ・完全オンデバイス

| リポジトリ | 役割 | 技術スタック |
|---|---|---|
| **kakei_no_mori-frontend** | フロントエンド（iOS/Androidアプリ、バックエンド不要） | React Native + Expo + TypeScript |

> 家計の森は配当の森と異なり、フロント/バックエンド/バッチをまたぐ親子Issue運用は**行わない**。Issue管理は `kakei_no_mori-frontend` リポジトリ内で完結させる。仕様書のみ本リポジトリ（`specs/kakeinomori/`）に集約する。

## 仕様書構成

```
specs/
├── 010.product/     # 配当の森: プロダクト仕様（ブランド・ロードマップ・マニュアル）
├── 020.system/      # 配当の森: システム設計（アーキテクチャ・認証・フロー）
├── 030.database/    # 配当の森: データベース設計（フロント・バックエンド）
├── 040.api/         # 配当の森: API仕様書（OpenAPI・テストガイド）
├── 050.batch/       # 配当の森: バッチ処理仕様
├── 060.infra/       # 配当の森: インフラ・CI/CD
├── 100.legal/       # 配当の森: 法的文書（プライバシーポリシー）
└── kakeinomori/      # 家計の森: プロダクト仕様一式（010.product / 020.system / 030.database）
```

索引は [`specs/README.md`](specs/README.md) を参照してください。

`010.product/`〜`100.legal/` は歴史的経緯で配当の森専用としてディレクトリ名にプロダクト名の接頭辞がない。今後さらにプロダクトを追加する場合は `specs/<product-slug>/` の形で切ること（家計の森=`specs/kakeinomori/` が最初の例）。

## ブランチ運用ルール

> 本節は**配当の森**（Morincum / Morincum-backend / Morincum-batch / Morincum-specs の複数リポジトリ運用）向け。
> **家計の森**は `kakei_no_mori-frontend` リポジトリ単独でIssue・ブランチ・PRを管理し、本節の親子Issueフローは適用しない。

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
4. **ブランチから PR を作成する** — 作業完了後、各リポジトリで `feature/XXX` → `develop` → `main` の順でマージする

### フロー

```
Morincum-specs で Issue 作成
  ↓
feature/<issue番号>-<説明> ブランチを各リポジトリで作成
  ↓
変更が必要なリポジトリにコミット（全リポジトリで同名ブランチ）
  ↓
各リポジトリで feature → develop への PR を作成・マージ（dev環境で検証）
  ↓
develop → main への PR を作成・マージ（本番リリース）
  ↓
Issue クローズ
```

### ブランチ保護ルール

全リポジトリの `main` と `develop` に以下の保護を設定している。

| 設定 | 内容 |
|---|---|
| 削除禁止 | `main` / `develop` は削除不可 |
| Force push禁止 | 強制プッシュ不可 |

> `develop` が誤って削除された場合は `main` から再作成し、GitHub の Branch protection rules で再設定する。

---

## 作業ルール

1. **日本語で記述する** — ドキュメントは基本的に日本語で記述します
2. **既存ファイルは保護する** — 既存ファイルを削除せず、内容は統合・追記する形で更新します
3. **構成に従って追加する** — 新しい仕様書は `specs/` 以下の適切なディレクトリに追加します
4. **ソース追跡** — 各ファイルは各リポジトリの既存ドキュメントから統合・集約したものです

## API仕様書の同期ルール

`specs/040.api/` 以下の OpenAPI ファイルは、各リポジトリの仕様書と**常に同一内容**を保ちます。

| Specs ファイル | 同期元 |
|---|---|
| `specs/040.api/backend-openapi.yaml` | `Morincum-backend/docs/api/openapi.yaml` |
| `specs/040.api/batch-openapi.yaml` | `Morincum-batch/docs/api/openapi.yaml` |

**Specsが最新仕様の正（Single Source of Truth）です。**  
各リポジトリで openapi.yaml を更新したら、同じコミットまたは同じ PR で Specs も更新してください。
