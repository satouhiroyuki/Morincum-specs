# CI/CDパイプライン

> ソース: Morincum-backend/docs/spec/morincum-spec.md §7 + Morincum-batch/docs/spec/morincum-batch-spec.md §8

---

## 1. ブランチ戦略（全リポジトリ共通）

```
feature/* → develop → staging → main
              ↓           ↓        ↓
           dev環境  staging環境  本番環境
```

| ブランチ | 説明 | 対応環境 |
|---|---|---|
| `feature/*` | 機能開発ブランチ | — |
| `develop` | 開発統合ブランチ | dev |
| `staging` | ステージングブランチ | stg |
| `main` | 本番ブランチ | prod |

---

## 2. バックエンド（Morincum-backend）CI/CD

### ワークフロー一覧

| ファイル | トリガー | 内容 |
|---|---|---|
| `ci.yml` | PR作成時 | テスト・lint・CDK diff |
| `cd-dev.yml` | developマージ時 | CDK deploy・Lambda・マイグレーション |
| `cd-staging.yml` | stagingマージ時 | 同上 |
| `cd-prod.yml` | mainマージ時 | GitHub Environments承認後にデプロイ |
| `cd-docs.yml` | openapi.yaml更新時 | MorincumリポジトリにPRを自動作成 |

### CI（ci.yml）

```yaml
# PR作成時に実行
jobs:
  test:
    - npm ci
    - npm run lint
    - npm run type-check
    - npm test
  cdk-diff:
    - cdk diff --all -c env=dev
```

### CD（cd-prod.yml）

```yaml
# mainブランチへのマージ時
environment: production  # GitHub Environments で承認が必要

jobs:
  deploy:
    - cdk deploy --all -c env=prod
    - # Lambda関数のデプロイ
    - # DBマイグレーションの実行
```

### OpenAPI仕様書の自動同期フロー

```
Morincum-backendのopenapi.yaml更新
    ↓ GitHub Actions（cd-docs.yml）
MorincumリポジトリにPRを自動作成
    ↓
フロント担当者がマージ
    ↓
CopilotがYAMLをリポジトリ内ファイルとして参照可能
```

---

## 3. バッチ（Morincum-batch）CI/CD

### ワークフロー一覧

| ファイル | トリガー | 内容 |
|---|---|---|
| `ci.yml` | PR作成時 | pytest・flake8・CDK diff |
| `cd-dev.yml` | developマージ時 | CDK deploy・Lambdaデプロイ |
| `cd-staging.yml` | stagingマージ時 | 同上 |
| `cd-prod.yml` | mainマージ時 | GitHub Environments承認後にデプロイ |

### CI（ci.yml）

```yaml
jobs:
  test:
    - pip install -r requirements-dev.txt
    - flake8 src/
    - pytest tests/
  cdk-diff:
    - cdk diff --all -c env=dev
```

### スケジュールの環境別方針

| バッチ | prod | stg・dev |
|---|---|---|
| 株価・配当・投信・為替取得 | EventBridgeで自動実行 | Lambdaコンソールから手動実行 |
| AIニュース生成 | EventBridgeで自動実行 | 手動実行 |
| X投稿文生成 | EventBridgeで自動実行 | 不要 |
| Slack Bot・コマンド | 常時受付 | 常時受付（同一ワークスペース） |

---

## 4. フロントエンド（Morincum）CI/CD

### ワークフロー

```yaml
# developへのPush/PR時に実行
jobs:
  ci:
    - npm ci
    - npx tsc --noEmit        # TypeScript型チェック
    - npm run lint
    - expo prebuild           # Androidビルド前処理
    - ./gradlew assembleDebug # APKビルド
```

| 項目 | 内容 |
|---|---|
| 型チェック | `node_modules/.bin/tsc --noEmit` |
| Androidビルド | Expo prebuild → Gradle |
| テスト | v0.1.0時点では Jest/Unit Test 未整備 |
| アーティファクト | APKファイル（ダウンロード可） |

---

## 5. AWS認証（OIDC）

全リポジトリ共通。GitHub ActionsへのAWSキー保存を不要にします。

```yaml
# GitHub Actionsワークフローでの設定例
permissions:
  id-token: write
  contents: read

steps:
  - name: Configure AWS credentials
    uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: arn:aws:iam::123456789:role/github-actions-role
      aws-region: ap-northeast-1
```

### IAMロールの信頼ポリシー

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::123456789:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:satouhiroyuki/*:*"
        }
      }
    }
  ]
}
```

---

## 6. 本番デプロイの承認フロー（GitHub Environments）

本番環境へのデプロイには GitHub Environments による承認が必要です。

```
mainブランチへのマージ
    ↓
cd-prod.yml が起動
    ↓
GitHub Environments「production」での承認待ち
    ↓ （承認者が承認）
CDK deploy --all -c env=prod
    ↓
デプロイ完了 → Slackに通知
```

設定手順：
1. GitHub リポジトリ → Settings → Environments
2. 「New environment」→「production」を作成
3. 「Required reviewers」に承認者を追加
