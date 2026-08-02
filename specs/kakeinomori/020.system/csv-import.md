# 家計の森 CSV取込仕様（JCB / MyJCB）

> ソース: kakei_no_mori-frontend/design/plan/kakeinomori-dev-plan.md §6, §7
> 詳細検証: `jcb-csv-phase0-findings.md`（実ファイル検証済み・kakei_no_mori-frontend側で管理予定）

---

## 1. 月の基準日モデル

「利用日」ではなく「**どの引き落としに含まれるか**」で月を決める。

- JCBはCSVプリアンブルの「今回のお支払日」を正として自動取得（手入力不要）
- CardAccountの締め日・支払シフトはフォールバック用プリセット（JCB: 15日締め・翌月10日）
- 複数カードはカードごとに独立して月へ割当て、「8月」=「8月に引き落とされる全カードの合算」

---

## 2. CSV取込（JCB / MyJCB）

- **CP932**（BOMなし）・セル内改行あり → RFC 4180準拠パーサー必須
- ヘッダ行は固定行数でなく `ご利用者` マーカーで検出
- 金額は**「お支払い金額」列**（分割・リボの按分不要。引き落とし月と完全整合）
- 全セルtrim・金額カンマ除去・支払区分の全半角正規化
- パーサーはJSON定義としてバンドル（将来API配信可能な構造）

### 残検証事項

| # | 項目 | 対応時期 |
|---|---|---|
| 1 | 返品時のマイナス表記 | Phase 0〜3 |
| 2 | 支払区分「Ｓ１」の意味 | Phase 0 |
| 3 | RN実機でのCP932デコード（Phase 0の主課題） | Phase 0（最優先） |

---

## 3. 冪等性

CSVの重複取込を防ぐため、明細ごとに以下のキーで重複判定を行う（データモデルは [`../030.database/frontend-schema.md`](../030.database/frontend-schema.md) を参照）。

```
dedupeKey = sha256(cardAccountId + transactedAt + merchantRaw + amount)
```

同一キーが複数存在する場合はCSV内出現順を `occurrence` として保持し、区別する。
