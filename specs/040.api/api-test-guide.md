# APIテストガイド

> 対象: Morincum-backend API（23エンドポイント）
> 認証方式: cognitoAuth / guestAuth / iamAuth

---

## 1. 環境別エンドポイント

| 環境 | バックエンドAPI | バッチAPI |
|---|---|---|
| 本番 | `https://api.morincum.com/v1` | `https://batch.morincum.com/v1` |
| ステージング | `https://api-staging.morincum.com/v1` | — |
| 開発 | `https://api-dev.morincum.com/v1` | `https://batch-dev.morincum.com/v1` |

---

## 2. 認証方式別テスト手順

### 2-1. cognitoAuth（ログイン済みユーザー）

JWTアクセストークンを `Authorization: Bearer` ヘッダーに設定します。

#### トークン取得（サインイン）

```bash
# 1. サインイン
curl -X POST https://api-dev.morincum.com/v1/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!"
  }'

# レスポンス例
# {
#   "access_token": "eyJraWQiOiJ...",
#   "refresh_token": "eyJjdHkiOiJ...",
#   "id_token": "eyJraWQiOiJ...",
#   "expires_in": 3600
# }
```

#### 認証が必要なエンドポイントの呼び出し

```bash
ACCESS_TOKEN="eyJraWQiOiJ..."

# プロフィール取得
curl https://api-dev.morincum.com/v1/users/me \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# ポートフォリオ集計取得
curl https://api-dev.morincum.com/v1/portfolio/summary \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

#### トークンのリフレッシュ

```bash
curl -X POST https://api-dev.morincum.com/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "eyJjdHkiOiJ..."
  }'
```

---

### 2-2. guestAuth（未ログイン・匿名ユーザー）

Cognito Identity Pool から匿名トークンを取得して使用します。

#### 匿名トークン取得（AWS SDK）

```typescript
import { CognitoIdentityClient, GetIdCommand, GetCredentialsForIdentityCommand } from "@aws-sdk/client-cognito-identity";

const client = new CognitoIdentityClient({ region: "ap-northeast-1" });

// Identity ID取得
const { IdentityId } = await client.send(new GetIdCommand({
  IdentityPoolId: "ap-northeast-1:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
}));

// 一時的な認証情報取得
const { Credentials } = await client.send(new GetCredentialsForIdentityCommand({
  IdentityId,
}));
// Credentials.AccessKeyId, SecretKey, SessionToken が使用可能
```

#### guestAuth が利用可能なエンドポイント

```bash
# 為替レート取得（guestAuth）
curl https://api-dev.morincum.com/v1/fx/latest \
  -H "X-Amz-Security-Token: $SESSION_TOKEN" \
  -H "Authorization: AWS4-HMAC-SHA256 ..."

# 利用規約取得（認証不要）
curl "https://api-dev.morincum.com/v1/terms/active?locale=ja"

# メンテナンス状態確認（認証不要）
curl "https://api-dev.morincum.com/v1/maintenance/active?locale=ja"

# 銘柄一覧取得（guestAuth）
curl "https://api-dev.morincum.com/v1/stocks?q=三菱&limit=10" \
  -H "Authorization: Bearer $GUEST_TOKEN"
```

---

### 2-3. iamAuth（バッチ → バックエンド Internal API）

AWS SigV4署名を使用します。バッチ Lambda の IAM ロールに `execute-api:Invoke` 権限が必要です。

```python
import boto3
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest
import requests, json

BACKEND_URL = "https://api-dev.morincum.com/v1"

def call_internal_api(path: str, method: str = "GET", body: dict = None):
    session = boto3.Session()
    credentials = session.get_credentials().get_frozen_credentials()
    url = f"{BACKEND_URL}{path}"

    req = AWSRequest(
        method=method,
        url=url,
        data=json.dumps(body) if body else None,
        headers={"Content-Type": "application/json"}
    )
    SigV4Auth(credentials, "execute-api", "ap-northeast-1").add_auth(req)

    response = requests.request(
        method=method,
        url=url,
        headers=dict(req.headers),
        data=req.body
    )
    return response.json()

# 使用例
stats = call_internal_api("/internal/stats/users")
result = call_internal_api("/internal/batch/fx-rates", "POST", {"s3_key": "fx_rates/2026-03-25.json"})
```

---

## 3. 主要エンドポイント curlサンプル

### 認証

```bash
BASE="https://api-dev.morincum.com/v1"

# 新規登録
curl -X POST $BASE/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123!"}'

# メール確認
curl -X POST $BASE/auth/confirm \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","code":"123456"}'

# サインイン
curl -X POST $BASE/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123!"}'

# ログアウト
curl -X POST $BASE/auth/signout \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### ポートフォリオ

```bash
# ポートフォリオ集計更新
curl -X PUT $BASE/portfolio/summary \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "total_annual_dividend": 150000,
    "sector_breakdown": {"金融": 35, "テック": 25, "商社": 40},
    "asset_type_breakdown": {"日本株": 70, "米国株": 30}
  }'

# 履歴取得（直近12ヶ月）
curl "$BASE/portfolio/history?months=12" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### 通知・メンテナンス

```bash
# お知らせ一覧（2026-03-18以降の新着）
curl "$BASE/notifications?locale=ja&since=2026-03-18T10:00:00Z" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# メンテナンス状態（認証不要）
curl "$BASE/maintenance/active?locale=ja"
```

### アンケート

```bash
# 有効なアンケート取得
curl "$BASE/surveys/active?locale=ja" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# 回答送信
curl -X POST $BASE/surveys/{survey_id}/answers \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "answers": [
      {"question_id": "uuid-1", "answer": "30代"},
      {"question_id": "uuid-2", "answer": ["日本株", "米国株"]}
    ]
  }'
```

### 行動ログ

```bash
# ログ送信
curl -X POST $BASE/logs/events \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "events": [
      {
        "event_id": "550e8400-e29b-41d4-a716-446655440000",
        "session_id": "550e8400-e29b-41d4-a716-446655440001",
        "event_type": "page_view",
        "timestamp": "2026-03-18T10:00:00Z",
        "platform": "ios",
        "app_version": "1.0.0",
        "properties": {"screen_name": "home"}
      }
    ]
  }'
```

---

## 4. エラーレスポンス形式

全エンドポイント共通：

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "リクエストの形式が正しくありません"
  }
}
```

| HTTPステータス | コード例 | 説明 |
|---|---|---|
| 400 | `INVALID_REQUEST` | リクエスト形式不正・バリデーションエラー |
| 401 | `UNAUTHORIZED` | 認証トークンが無効または期限切れ |
| 404 | `NOT_FOUND` | リソースが存在しない |
| 409 | `CONFLICT` | 既に存在する（重複登録等） |
| 503 | `SERVICE_UNAVAILABLE` | メンテナンス中 |
