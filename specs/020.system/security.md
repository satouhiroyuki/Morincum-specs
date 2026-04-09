# セキュリティ設計

> ソース: Morincum/docs/03_architecture/031_architecture_guidelines.md §8 + Morincum-backend/docs/spec/morincum-spec.md §5

---

## 1. 認証基盤（Amazon Cognito）

### 認証方式

| 方式 | 用途 | 説明 |
|---|---|---|
| **cognitoAuth** | ログイン済みユーザー | Cognito JWTトークン（Authorization: Bearer） |
| **guestAuth** | 未ログインユーザー | Cognito Identity Pool 匿名トークン |
| **iamAuth** | バッチ → バックエンド | IAM SigV4署名（Internal API専用） |

### Cognito 設定

| 機能 | 設定 |
|---|---|
| 認証方式 | メール＋パスワード |
| MFA | TOTP（Google Authenticator等）・任意設定 |
| パスワードポリシー | 8文字以上・大文字小文字・数字・記号必須 |
| セッション管理 | アクセストークン有効期限1時間 / リフレッシュトークン30日 |
| ユーザーID連携 | CognitoのsubをRDS users.idとして使用 |
| 無料枠 | 月50,000 MAUまで永続無料 |

### 認証状態と利用可能なAPI

| 状態 | 認証 | 利用可能なAPI |
|---|---|---|
| 未ログイン | guestAuth（匿名トークン） | stocks系・surveys・terms・notifications・fx |
| ログイン済み | cognitoAuth（JWT） | 全エンドポイント |
| バッチ処理 | iamAuth（SigV4） | Internal API（/internal/*） |

### 匿名トークンの設計方針

- **アプリ起動直後に匿名トークンを発行する**（A案）
  - 起動直後から為替レート・株価・銘柄情報が利用可能
  - チュートリアル・利用規約取得もguestAuthで動作する
- **ログアウト後は新しい匿名トークンを再発行**してguestAuthに戻る

---

## 2. AWSセキュリティ対策

| 対策 | 内容 |
|---|---|
| AWS WAF | API GatewayにアタッチしDDoS・SQLインジェクション対策 |
| CloudTrail | API操作ログの記録 |
| SSM Parameter Store | APIキー・DB接続情報の管理（SecureString） |
| S3バケットポリシー | Lambda実行ロールのみアクセス許可 |
| RDS | VPC内に配置しパブリックアクセス無効化 |
| Advanced Security | 不審なログイン自動検知・ブロック |

### SSM Parameter Store 管理項目

| パラメータ名 | タイプ | 説明 |
|---|---|---|
| `/morincum/slack/bot-token` | SecureString | Slack Bot Token |
| `/morincum/slack/signing-secret` | SecureString | Slack Signing Secret |
| `/morincum/claude/api-key` | SecureString | Claude APIキー |
| `/morincum/x/bearer-token` | SecureString | X API Bearer Token（Phase 2） |
| `/morincum/backend/api-url` | String | バックエンドAPI URL |

---

## 3. フロントエンドのローカルセキュリティ

| 項目 | 方針 |
|---|---|
| PIN コード | expo-secure-store（iOS: Keychain / Android: Keystore）に保管。SQLite には格納しない |
| 個人データ | 端末内 SQLite のみ。外部送信なし |
| 外部通信 | 為替レート取得のみ（HTTPS） |
| バックアップ | OS バックアップに SQLite ファイルが含まれる可能性あり（PIN は SecureStore のため別管理） |

### SecureStore キー一覧

| SecureStore キー | 説明 |
|---|---|
| `morincum_pin` | 4〜6 桁の PIN コード文字列（平文） |

> **理由**: SQLite ファイルはバックアップや root 端末からアクセスされるリスクがあるため、秘密情報は OS レベルのセキュアストレージに格納します。

---

## 4. バッチの認証（IAM SigV4）

バッチからバックエンドの Internal API を呼び出す際は IAM SigV4 認証を使用します。

```python
import boto3
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest
import json, requests

def call_backend_api(method: str, path: str, body: dict = None):
    session = boto3.Session()
    credentials = session.get_credentials()
    url = f"{BACKEND_API_URL}{path}"
    request = AWSRequest(
        method=method, url=url,
        data=json.dumps(body) if body else None,
        headers={'Content-Type': 'application/json'}
    )
    SigV4Auth(credentials, 'execute-api', 'ap-northeast-1').add_auth(request)
    return requests.request(
        method=method, url=url,
        headers=dict(request.headers), data=request.body
    ).json()
```

---

## 5. GitHub Actions の AWS 認証（OIDC）

OIDC（OpenID Connect）でGitHub Actions ↔ AWSを認証。Secretsに AWSキーを保存しない。

```
IAMコンソール → IDプロバイダー
  プロバイダーURL: https://token.actions.githubusercontent.com
  対象者: sts.amazonaws.com
```
