# アプリ間連携の取り決め（端末内）

| 項目 | 内容 |
|------|------|
| ステータス | `draft`（案。実装前に確定する） |
| 更新日 | 2026-11-20 |
| 対象 | 配当の森・不動産の森（書き出す側）、統合ダッシュボード（読む側）。家計の森は後で追加する |
| 企画 | [dashboard-plan.md](dashboard-plan.md) |

---

## 1. 考え方

- 同じスマホに入っている Morincum のアプリ同士で、**決まった形の要約（JSON）**を受け渡す。端末の外には出さない
- 書き出す側は、自分のデータが変わるたびに要約を書き直す。読む側は、開いたとき・前面に戻ったときに読み直す
- 要約の形は、この文書で決める。**各アプリの DB の構造とは切り離す**（DB を変えても、要約の形を守れば読む側は直さなくてよい）

```
配当の森  ─┐ 保存のたびに書き直す
不動産の森 ─┼──▶ 共有の場所（iOS: App Groups / Android: ContentProvider）
家計の森  ─┘                     │
                                 ▼ 開いたとき・前面に戻ったときに読む
                           統合ダッシュボード ◀── バックエンド /guest/*（為替など）
```

## 2. OS ごとの受け渡しの仕組み

### 2.1 iOS：App Groups

| 項目 | 内容（案） |
|---|---|
| App Group ID | `group.com.morincum.shared` |
| 設定 | 各アプリの `app.config.ts` の `ios.entitlements` に `com.apple.security.application-groups` を追加する |
| 置き場所 | 共有フォルダの `link/<app-id>/summary.json`（例：`link/haitonomori/summary.json`） |
| 書き方 | 一時ファイルに書いてから名前を変える（途中まで書かれたファイルを読ませない） |
| Expo での実装 | 共有フォルダのパスを返す小さな Expo Module を作る（ファイルの読み書き自体は `expo-file-system` で行う） |

### 2.2 Android：ContentProvider

| 項目 | 内容（案） |
|---|---|
| authority | `com.morincum.<app-id>.link`（例：`com.morincum.haitonomori.link`） |
| 権限 | `com.morincum.permission.APP_LINK`（`protectionLevel="signature"`）。**同じ署名鍵の Morincum のアプリだけ**が読める |
| 返すもの | iOS と同じ `summary.json` の中身（文字列） |
| 動き | 読む側が問い合わせると、OS が書き出す側のアプリを裏で起こして答えさせる |
| 入っているかの確認 | 読む側の `AndroidManifest.xml` の `<queries>` に、各アプリのパッケージ名を書く（Android 11 以降で必要） |
| Expo での実装 | Kotlin の Expo Module（書き出す側：ContentProvider、読む側：問い合わせ） |

> `sharedUserId` は非推奨なので使わない。

### 2.3 アプリが入っているかの確認

| OS | 方法 | 注意 |
|---|---|---|
| iOS | 各アプリに URL スキーム（例：`haitonomori://`）を付け、読む側は `Linking.canOpenURL` で確認する。読む側の `LSApplicationQueriesSchemes` にスキームを書く | **App Groups の共有フォルダは、書き出したアプリを消しても残る**。ファイルがあるだけで「入っている」と判断しない |
| Android | `<queries>` に書いたパッケージ名で確認する | アプリを消すと ContentProvider も消える |

## 3. アプリの識別子

| アプリ | app-id | Bundle ID / パッケージ名 |
|---|---|---|
| 配当の森 | `haitonomori` | `com.morincum.haitonomori` |
| 不動産の森 | `fudosannomori` | `com.morincum.fudosannomori`（案） |
| 家計の森 | `kakeinomori` | `com.morincum.kakeinomori` |
| 統合ダッシュボード | 未定 | 未定 |

## 4. 要約（summary.json）の形

### 4.1 共通の外側

```json
{
  "schema": "morincum.app-link.summary",
  "schema_version": 1,
  "app_id": "haitonomori",
  "app_version": "3.0.0",
  "generated_at": "2026-11-20T09:30:00+09:00",
  "data": { }
}
```

| 項目 | 内容 |
|---|---|
| `schema_version` | 形を変えるたびに上げる整数。**読む側は、知らない版の要約を読まない**（「アプリを更新してください」と案内する） |
| `generated_at` | 書き出した日時。ダッシュボードに「◯月◯日時点」と出す |
| 金額 | すべて**整数**。円は円単位、ドルは**セント単位**（小数を持たない） |
| 月 | `"YYYY-MM"` |
| 期間 | 過去12ヶ月＋当月＋先12ヶ月の、合計25ヶ月分を入れる |

### 4.2 配当の森（`app_id: haitonomori`）

```json
{
  "monthly_dividends": [
    {
      "month": "2026-12",
      "is_planned": true,
      "jpy":       { "gross": 21000, "after_tax": 16734 },
      "usd_cents": { "gross": 8500,  "after_tax": 6096 }
    }
  ],
  "holdings": [
    {
      "ticker": "8058",
      "asset_type": "日本株",
      "currency": "JPY",
      "nisa_shares": 100,
      "tsumitate_shares": 0,
      "tokutei_shares": 200
    }
  ]
}
```

| 項目 | 内容 |
|---|---|
| `monthly_dividends` | 配当の森が計算した月ごとの配当（税引き前・税引き後）。**通貨ごとに分け、ドルはドルのまま入れる**。ダッシュボードは最新の為替（`GET /guest/fx/latest`）で円に直す |
| `holdings` | 保有の中身（銘柄・株数・口座区分）。最初は表示に使わず、将来ダッシュボードで計算し直すとき（dashboard-plan D8）に使う |
| 入れないもの | 口座の表示名・アイコン、取得単価、目標、メモ（ダッシュボードで使わないものは渡さない） |

> 列名は配当の森の端末内スキーマ（`stocks` テーブル）に合わせている。ただし要約の形は DB から独立しているので、DB 側の名前が変わっても、ここは変えない。

### 4.3 不動産の森（`app_id: fudosannomori`）

```json
{
  "monthly_cashflows": [
    {
      "month": "2026-12",
      "is_planned": true,
      "income": 291000,
      "expense": 38500,
      "loan_repayment": 248000,
      "net": 4500
    }
  ],
  "units": { "total": 3, "occupied": 2, "vacant": 1 }
}
```

| 項目 | 内容 |
|---|---|
| `monthly_cashflows` | 月ごとの収入・支出・ローン返済・手残り（円）。予定（定期ルールから計算）も入れる |
| `units` | 物件の件数と稼働の状況（アーカイブ済みは数えない） |
| 入れないもの | 物件名・住所・口座名・イベントの中身（未決事項 #2 で、物件ごとの一覧を出すと決めたら追加する） |

## 5. 書き出すタイミング（書き出す側）

| タイミング | 理由 |
|---|---|
| データを保存したとき（短い間にまとめて1回にする） | 入力した内容をすぐダッシュボードに反映する |
| アプリを開いたとき・前面に戻ったとき | 配当の森は、このときバックエンドから銘柄情報を取り直すので、その結果も反映する |
| 月が変わって最初に開いたとき | 25ヶ月の範囲をずらす |
| 連携をオフにしたとき | 要約を消す（設定で連携をやめられるようにする） |

## 6. 未決事項

| # | 項目 | 内容 |
|---|---|---|
| 1 | App Group ID・権限名の確定 | 上の案で Apple Developer / Play Console 上の登録ができるか確認する |
| 2 | 物件ごと・銘柄ごとの一覧 | ダッシュボードで出すなら、要約に項目を追加する（`schema_version` を上げる） |
| 3 | 連携のオン・オフ | 各アプリの設定に置くか。既定をオンにするか |
| 4 | PIN ロックとの関係 | 配当の森・不動産の森に PIN ロックがかかっているとき、ダッシュボードにも PIN を求めるか |
| 5 | 家計の森の要約の形 | 家計の森の対応時に追加する |
