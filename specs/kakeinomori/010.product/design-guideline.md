# 家計の森 デザインガイドライン

> ソース: kakei_no_mori-frontend/design/mock/kakeinomori-mock-tag-v1.jsx（`const T` トークン定義）

| 項目 | 内容 |
|------|------|
| 方針 | Morincumブランドファミリーのデザインを継承 |
| 継承元 | [`../../010.product/brand.md`](../../010.product/brand.md)（Morincum デザインガイドライン） |
| ベース | React Native（Expo） |

---

## 1. 方針

家計の森は Morincum ブランドファミリーの3本目のプロダクトであり、独自のデザインシステムは持たない。
カラーパレット・タイポグラフィ・角丸・スペーシングなどの基本トークンは
[Morincum デザインガイドライン](../../010.product/brand.md) を継承する。

本書には、mock v1.8（`kakeinomori-mock-tag-v1.jsx`）内で定義されたトークンと
Morincum 側トークンの対応関係、および家計の森固有の拡張のみを記載する。

---

## 2. カラートークン対応表

mock内の `T` オブジェクトと Morincum `brand.md` のトークンの対応関係。

| mock (`T`) | HEX | Morincum側トークン | 用途 |
|---|---|---|---|
| `green` | `#5BAD60` | `accent` | メインアクション・現状値・投資入金額（🌱） |
| `greenSoft` | `#5BAD6018` | `accentSoft`（`#5BAD6020`） | アクセント背景（※アルファ値が異なる。下記「3. 差異」参照） |
| `orange` | `#F5A623` | `gold` | 増やせる配当（🌿）・強調表示 |
| `orangeSoft` | `#F5A62320` | `goldSoft` | 一致 |
| `blue` | `#4A90D9` | `nisa1` | 情報表示（配当の森ではNISA成長投資枠用途だが、家計の森では汎用の「情報」色として使用） |
| `blueSoft` | `#4A90D918` | （`brand.md`に対応トークンなし） | 情報系の背景（新規） |
| `red` | `#E05C7A` | `red` | エラー・警告・削除 |
| `redSoft` | `#E05C7A18` | （`brand.md`に対応トークンなし） | エラー系の背景（新規） |
| `bg` | `#F4F7F4` | `bg` | 一致 |
| `surface` | `#FFFFFF` | `surface` / `card` | 一致 |
| `border` | `#D8EAD8` | `border` | 一致 |
| `text` | `#2D4A2D` | `text` | 一致 |
| `muted` | `#7A9A7A` | `muted` | 一致 |

### 家計の森固有の追加トークン

| トークン | HEX | 用途 |
|---|---|---|
| `gray` | `#9AA79A` | 「対象外」タグ・非アクティブ要素 |
| `graySoft` | `#9AA79A20` | `gray` の背景 |

---

## 3. Morincum側との差異（要確認事項）

mock の `*Soft` 系トークンはアルファ値に `18` を使用しているが、Morincum `brand.md` の `accentSoft` / `goldSoft` は `20` を使用している。
RN実装時にどちらへ統一するか、Morincum側の値（`20`）に合わせるか要判断（Phase 2着手時に確定）。

---

## 4. 予算差額の表現ルール

Morincum の「現状 vs 目標」カラールール（`brand.md` 2-1-a）を踏襲しつつ、家計の森では**損失表現を使わない**という独自方針がある。

| 種別 | トークン | 用途 |
|---|---|---|
| 予算内（余り） | `green`（`accent`） | 🌱 投資入金額 |
| 予算超過 | `orange`（`gold`） | 🌿 増やせる配当（超過分を来月予算内に収めた場合に増やせる年間配当。オレンジ=未来の色。赤やマイナス表記は使わない） |

タグ間で相殺せず、投資入金額と増やせる配当を両方表示する（詳細は [`../../kakeinomori/010.product/product-plan.md`](product-plan.md) 2章）。

---

## 5. ロゴ・アイコン

| アセット | パス | 用途 |
|---|---|---|
| ロゴ（MORINCUM） | `kakei_no_mori-frontend/design/source/logo/logo_Morincum.png` | 設定画面のブランドフッター表示用 |

マスコット「モーリス」・どんぐりモチーフは**家計の森では使用しない**（完了画面の演出も「モーリス＋森が育つ」のみで、どんぐりは配当の森専用として明確に区別する）。
