# 株主優待データ バックエンド仕様(ドラフト)

- 状態: ドラフト(レビュー前)
- 親Issue: Morincum-batch #85(株主優待情報の取得・更新バッチ)
- 関連: 050.batch(バッチ)、040.api(OpenAPI)、030.database/frontend-schema.md(フロント)

## 1. 目的とスコープ

JPX上場株式の株主優待を、一次情報(EDINET有報、後続で自社IR・適時開示)を元に、毎日バッチで確認してRDSを更新し、フロントへ配信できるようにする。

| 範囲 | 内容 |
|---|---|
| 対象 | バックエンドのDB(マイグレーション)、内部バッチAPI、公開API(優待取得)の拡張 |
| 対象外 | バッチの取得・構造化ロジック(別Issue)、フロントの画面・SQLite(別Issue) |
| 対象外 | 利用者ごとの保有情報(「優待の権利を得た日」はフロントのSQLiteのみ。サーバーには送らない) |

## 2. 現状と課題

- 既存の3テーブル(`stock_shareholder_benefits` / `stock_benefit_tiers` / `stock_benefit_tier_translations`、V002)は、利用者に見せる内容のみを持つ。
- 課題:
  1. 優待が「なし」の銘柄と「まだ確認していない」銘柄を区別できない。
  2. 確認日、出典(書類ID・URL)を持たず、更新の要否をSQLで引けない。
  3. 継続保有条件を持たない(原文もない)。
  4. 金額で表せない優待(自社の入浴券、自社製品など)を表現できない。`estimated_value` のみ。
  5. `record_date` が NOT NULL。有報から取れるのは権利確定「月」で、日付を確定できない。

## 3. データモデル(案A: 既存3テーブルを残し、追加する)

### 3.1 新規: `stock_benefit_sources`(銘柄ごとの確認状況。1銘柄1行)

| 列 | 型 | 説明 |
|---|---|---|
| stock_id | UUID PK, FK stocks | |
| benefit_status | VARCHAR(20) NOT NULL | `exists` / `none` / `unconfirmed` / `no_filing`(有報なし)/ `needs_review` |
| source_type | VARCHAR(20) | `edinet` / `ir` / `tdnet` / `manual` |
| source_doc_id | VARCHAR(30) | EDINET書類ID など。冪等性のキー |
| source_filed_at | DATE | 出典の提出日・発表日 |
| source_url | TEXT | 確認先URL(自社IR等) |
| s3_key | TEXT | 原本の保管先 |
| structured_json | JSONB | 構造化結果(監査・再処理用。画面表示には使わない) |
| extractor_version | VARCHAR(30) | 抽出・構造化の版 |
| verify_status | VARCHAR(20) | `ok` / `needs_review` / `needs_fix` / `unverified` |
| last_checked_at | TIMESTAMPTZ | 最後に確認した日時 |
| next_check_at | TIMESTAMPTZ | 次に確認する予定(決算月からの予測など) |
| updated_at | TIMESTAMPTZ NOT NULL | 差分同期用 |

- インデックス: `(next_check_at)`、`(benefit_status, verify_status)`。
- 想定クエリ: 「確認期限が来た銘柄」「人の確認が必要な銘柄」「有報のない銘柄」。

### 3.2 既存 `stock_shareholder_benefits` の変更

| 変更 | 内容 |
|---|---|
| `record_date` | NULL許容に変更。日付が確定しない場合は `record_month`(1〜12)で持つ。`CHECK (record_date IS NOT NULL OR record_month IS NOT NULL)` |
| `record_month` | SMALLINT 追加 |
| `UNIQUE` | `(stock_id, record_date)` を、`(stock_id, COALESCE(source_doc_id, ''), COALESCE(record_date, DATE '0001-01-01'), COALESCE(record_month, 0))` のユニークインデックスへ置換。出典の版を含めることで、置き換え時に、新しい行を先に追加できる |
| `source_doc_id` | VARCHAR(30) 追加(どの出典から作った行か) |

### 3.3 既存 `stock_benefit_tiers` の変更(優待の価値の表現)

| 追加列 | 型 | 説明 |
|---|---|---|
| value_kind | VARCHAR(30) | 優待の種類: `meal_voucher` / `shopping_voucher` / `discount` / `own_product` / `own_service` / `points` / `transport` / `cash_equivalent`(QUOカード等)/ `catalog` / `donation` / `other` |
| value_basis | VARCHAR(20) | `face`(額面が明記)/ `estimate`(推定。時価など)/ `unknown`(金額化しない) |
| value_note | TEXT | 金額化の根拠・補足(例: 「入浴券。時価で推定」) |
| holding_months | INT NULL | その区分に必要な継続保有期間(月)。NULL = 期間の条件なし |
| consecutive_count | INT NULL | その区分に必要な基準日の連続回数。NULL = 回数の条件なし |
| grant_count | INT NULL | その区分の優待を贈る回数(贈呈回数)。1 = 1回限り。NULL = 基準日ごとに毎回 |

- **決定(優待の1行の持ち方): 月・株数・保有期間・金額・備考・回数。** 月=`record_month`、株数=`min_shares`、保有期間=`holding_months`(連続回数は `consecutive_count`)、金額=`estimated_value`、備考=`description`(品物・割引券などの内容)、回数=`grant_count`(1回限りなど)。長期保有などの追加優待も、保有期間つきの行にし、金額は「その条件でもらえる合計」(基本+追加)にする。**年間の金額は、アプリが、月ごとに、利用者の株数・保有期間に合う行を1つ選び、その合計で出す**(データには持たない)。`conditions` は、行では表せない条件(預金残高など)だけに使う。
- **決定(保有期間で内容が変わる優待): 区分に保有期間・連続回数を持たせる。** 「100株×保有3年未満=2,000円」「100株×保有3年以上=4,000円」のように、株数と保有期間の組み合わせごとに1行にする(区分の識別は `min_shares` + `holding_months` + `consecutive_count`。同じ優待の中で重複しない)。アプリは、株数と保有期間から、該当する区分を引ける。基準日ごとの継続判定(連続回数)の条件が、ある区分だけに掛かる場合も、区分の列で表す。`stock_benefit_conditions` は、区分に分けられない条件(優待全体にかかる条件、追加優待の説明など)に使う。なお、「期間が長いと、内容が置き換わる」場合は区分に、「基本優待に、別の優待が加わる」場合は `conditions` の `applies_to=additional` に入れる。(Morincum-backend V015)
- `estimated_value`(既存)は、`value_basis` が `face` または `estimate` のときだけ値を入れる。`unknown` は NULL。
- 画面では、`estimate` に「推定」を付ける。`unknown` は金額を出さず、`description` を表示する。
- バッチは、推定金額を作らない(当面は空白)。`estimated_value` は、原文に額面が明記されている場合(例: 「食事券2,000円分」)だけ入れ、`value_basis='face'` とする。それ以外は NULL、`value_basis='unknown'`。`estimate` は、将来、推定値を作る場合のために、定義だけ残す。
- **決定(案1: 現状のまま):** 円で表せない優待(割引率、ポイント、範囲のある金額など)は、`value_basis='unknown'` とし、説明文(`description`)で表示する。金額は、利用者の手入力(6.1)で補う。割引率(`discount_rate`)や金額の単位(`value_unit`)の列は、当面、追加しない。構造化の結果を見て、必要なら、後から追加する(列の追加のみで、既存のデータに影響しない)。
- 既存データの移行: `estimated_value` がある行は `value_basis='face'`(要確認: 既存データの実態を調べてから決める)、ない行は `unknown`。

### 3.4 新規: `stock_benefit_conditions`(継続保有条件)

| 列 | 型 | 説明 |
|---|---|---|
| id | UUID PK | |
| benefit_id | UUID FK stock_shareholder_benefits ON DELETE CASCADE | |
| tier_id | UUID NULL FK stock_benefit_tiers ON DELETE CASCADE | 特定の区分だけに適用する場合 |
| condition_type | VARCHAR(30) NOT NULL | `consecutive_record_dates`(基準日の連続回数)/ `holding_period`(保有期間)/ `other` |
| required_count | SMALLINT | 連続回数 |
| required_months | SMALLINT | 保有期間(月数) |
| min_shares | INT | 条件の対象となる必要株数(例: 基本100株、INPEXは400株) |
| applies_to | VARCHAR(20) | `base`(基本優待)/ `additional`(追加優待) |
| raw_text | TEXT NOT NULL | 原文(機械判定できないときの表示用) |

- 例: 「3月・9月の基準日で連続3回以上、100株以上」→ `consecutive_record_dates`, required_count=3, min_shares=100, applies_to=base。
- フロントは、利用者の「権利を得た日」とこの条件から、対象となる時期を計算する(サーバーは計算しない)。

### 3.6 新規: `stock_benefit_revisions`(優待の履歴)

置き換え・「なし」への変更の前に、古い内容を保存する。既存の `stock_benefit_histories`(利用者の優待受取履歴)とは別物。

| 列 | 型 | 説明 |
|---|---|---|
| id | UUID PK | |
| stock_id | UUID FK stocks ON DELETE CASCADE | |
| benefit_status | VARCHAR(20) NOT NULL | 置き換え前の状態 |
| source_doc_id | VARCHAR(30) | 置き換え前の出典 |
| source_filed_at | DATE | 置き換え前の出典の提出日 |
| snapshot | JSONB NOT NULL | 置き換え前の優待(区分・価値・継続保有条件・説明文)の全内容 |
| replaced_by_doc_id | VARCHAR(30) | 置き換えた出典 |
| recorded_at | TIMESTAMPTZ NOT NULL DEFAULT NOW() | 履歴を保存した日時 |

- インデックス: `(stock_id, recorded_at DESC)`。
- 公開APIでは返さない(画面で履歴を見せる場合は、別途仕様化)。

### 3.5 `stock_benefit_tier_translations`

変更なし。`description`(ja/en)。英語は、日本語から機械翻訳(既存の `stock_name_translations` と同様の運用)で、後続で検討する。

## 4. 内部バッチAPI(新規)

既存の `/internal/batch/*`(Lambda間のIAM認証)に追加する。

### 4.1 `GET /internal/batch/benefits/targets`
確認が必要な銘柄を返す。クエリ: `limit`、`reason`(`due` / `needs_review` / `never_checked`)。応答: `stock_id`、`ticker`、`last_checked_at`、`source_doc_id`、`source_filed_at`。

### 4.2 `POST /internal/batch/benefits`
1銘柄分の結果を反映する(冪等。同じ `source_doc_id` の再送は上書き)。

```json
{
  "ticker": "9993",
  "benefit_status": "exists",
  "source": { "type": "edinet", "doc_id": "S100XXXX", "filed_at": "2026-06-16", "url": null, "s3_key": "edinet/raw/9993/S100XXXX.zip" },
  "verify_status": "ok",
  "extractor_version": "2026-11-v1",
  "structured_json": { },
  "next_check_at": "2027-05-01T00:00:00Z",
  "benefits": [
    {
      "record_month": 3,
      "tiers": [
        { "min_shares": 100, "value_kind": "meal_voucher", "value_basis": "face", "estimated_value": 2000,
          "descriptions": { "ja": "食事券2,000円分", "en": null } }
      ],
      "conditions": [
        { "condition_type": "consecutive_record_dates", "required_count": 3, "min_shares": 100, "applies_to": "base", "raw_text": "…" }
      ]
    }
  ]
}
```

- 1リクエストを1トランザクションで処理する。順序は「置き換えてから消す」。
  1. `stock_benefit_sources` を新しい内容(状態・出典・版)で更新する。
  2. 新しい優待行(`source_doc_id` が新しいもの)を追加する。
  3. 古い優待行の内容を、履歴テーブル `stock_benefit_revisions`(3.6)へ保存する。
  4. 1〜3が成功してから、同じ銘柄の古い `source_doc_id` の優待行を削除する。
- `benefit_status` が `none` に変わった場合も同じ順序とする。1で状態を `none` にし、3で履歴へ保存してから、4で古い優待行を削除する(追加する行はなし)。終了日方式は採らない。
- 履歴はDBに残す。原本は、S3(書類ID単位)でも追える。
- 応答: 反映した件数、`updated_at`。

## 5. 公開API(`GET /guest/stocks/{ticker}/benefits`、`latest_benefit`)の拡張

互換性のため、追加のみ(既存フィールドは変更しない)。

| 追加フィールド | 内容 |
|---|---|
| `benefit_status` | 上記ステータス |
| `checked_at` | `last_checked_at` |
| `source` | `{ type, doc_id, filed_at, url }`(`s3_key`・`structured_json` は返さない。`doc_id` は、利用者の入力時点の版の比較用) |
| `updated_at` | 優待データの更新日時(版の比較用) |
| `tiers[].value_kind`、`value_basis`、`value_note` | 価値の表現 |
| `conditions[]` | 継続保有条件(3.4) |

- EDINET由来の場合、出典表示と加工の明記(EDINET利用規約)のため、`source` を画面に出せる形で返す。
- `backend-openapi.yaml` を、同じPRでSpecsと同期する(CLAUDE.mdの同期ルール)。

## 6. フロントへの更新配信

### 現状(2026-11-13にコードで確認)
- フロントは、優待の取得・同期を、まだ実装していない(`src/` に優待APIの呼び出しはない)。
- 既存の差分同期は、銘柄マスターのみ。`src/utils/securitiesMasterSync.ts` が、`GET /guest/stocks?updated_after=<最終同期日時>&limit=500&offset=N` をページングで取得し、ローカルSQLiteへ upsert する。最終同期日時は `app_settings` に保存。
- 絞り込みは、`stocks.updated_at > updated_after`。優待テーブルの更新は、`stocks.updated_at` に反映されない。
- `GET /guest/stocks/{ticker}/benefits` は、銘柄ごとの取得で、差分同期には使えない。

### 方針
- 銘柄マスターと同じ方式の、優待の差分同期APIを新設する: `GET /guest/benefits?updated_after=<ISO8601>&limit=500&offset=N`(`locale` 指定可)。
  - 応答は、変更があった銘柄の、現在の優待(状態、区分、価値、継続保有条件、出典、`updated_at`)。
  - 絞り込みは、`stock_benefit_sources.updated_at`(新しい内容への置き換え、「なし」への変更でも更新される)。
  - 「なし」への変更も、状態として返す(フロントが、古い優待を消せるように)。
  - 履歴(3.6)は返さない。
- 銘柄マスターの同期(`stocks.updated_at`)とは、独立させる。優待の更新のたびに、全銘柄の `stocks.updated_at` を動かさない。
- フロントは、`app_settings` に、優待用の最終同期日時を別に持つ(フロントの仕様で定める)。
- 利用者の「優待の権利を得た日」・手入力は、同期で上書きしない(フロントのSQLiteのみ)。

## 6.1 利用者が自分で金額を入れる場合(方針)

優待は、参照データの表示を基本とする。利用者が、自分の評価額(使い道に応じた金額、時価など)を入れたい場合は、フロントのSQLiteだけで上書きする。

| 項目 | 方針 |
|---|---|
| 保存先 | フロントのSQLiteのみ。バックエンドには送らない(バックエンドに利用者の入力用のAPI・テーブルは作らない) |
| 優先順位 | 利用者の入力 > 参照データ。合計・利回りの計算は、入力があればそれを使う |
| 表示 | 入力があっても、参照データ(内容、確認日、出典)は「参考」として残す。入力値には「手入力」を付ける |
| 金額化しない優待(`value_basis='unknown'`) | 参照データでは、合計に含めない。利用者が金額を入れたときだけ、合計に含める |
| 同期との関係 | 参照データの差分同期は、利用者の入力を上書きしない。入力は参照データと別の列・テーブルに持つ |
| 参照データが変わったとき | 入力時点の参照データの版(`source_doc_id` または `updated_at`)をフロントが覚え、変わったら「優待内容が更新されました。金額を見直してください」と表示する |
| 既存データ | 現在の `yutaiTiers`(利用者が入れた株数別の金額)は、そのまま「手入力」として扱う。移行で消さない |

- バックエンドに必要な対応は、参照データに版(`source_doc_id`、`updated_at`)を返すことだけ(5章)。
- フロントの詳細(テーブル定義、入力画面)は、フロントの仕様書・Issueで別に定める。

## 7. 非機能

- マイグレーション: `V014`(次番号)。ロールバック可能な追加変更のみ。既存データは壊さない。
- 検証: dev環境で、既存の `GET /guest/stocks/{ticker}/benefits` の応答が変わらないこと(追加フィールドのみ)。
- テスト: ハンドラの単体テスト(冪等性、トランザクション、`none` の扱い)。
- 権限: 内部APIは、バッチのLambdaのIAMロールのみ。

## 8. 未決事項(決めてから実装)

1. 案A(既存3テーブルを残して追加)で進めてよいか。
2. (決定)置き換えてから古い行を削除する。「なし」に変わった場合も同じ。古い内容は履歴テーブル(3.6)に残す。
3. (決定)推定金額は、当面、空白。原文に額面がある場合だけ入れる。利用者が必要なら、手入力(6.1)で入れる。
4. (確認済み・6章)優待の同期は未実装。銘柄マスター方式の差分同期API `GET /guest/benefits?updated_after=` を新設する案。
5. (後回し)英語の説明文を、いつ・どう作るか。Issueに残す。
6. (方針を6.1に記載)利用者の入力を優先する。参照データの版が変わったときの通知の文言・方式は、フロントの仕様で決める。
7. (決定)`record_month` のみの行の扱い(次の基準日の推定など)は、フロントで行う。バックエンドは、月のまま返す。

## 9. 受け入れ条件

- [ ] V014 を dev に適用でき、既存の優待データと既存APIの応答が変わらない。
- [ ] `POST /internal/batch/benefits` が冪等で、再送しても重複しない。
- [ ] `GET /internal/batch/benefits/targets` が、期限・要確認・未確認の銘柄を返す。
- [ ] 公開APIが、状態・確認日・出典・継続保有条件・価値の種類を返す。
- [ ] `GET /guest/benefits?updated_after=` が、変更のあった銘柄の優待(「なし」への変更を含む)をページングで返す。
- [ ] 置き換え時に、古い内容が `stock_benefit_revisions` に保存される。
- [ ] `backend-openapi.yaml`(Specs とバックエンド)が更新され、同一である。
