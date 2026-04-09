# ロードマップ・Issue一覧

> 各リポジトリのIssue一覧と開発フェーズをまとめたリファレンスです。

---

## Phase 1（初期リリース）

### フロントエンド（Morincum）

| 機能 | 説明 |
|---|---|
| ローカルファーストアーキテクチャ | SQLite + SecureStore による端末内完結の設計 |
| 3タブナビゲーション | ホーム / 計画 / 設定（PanResponder スワイプ） |
| 銘柄管理 | 日本株・米国株・投資信託の追加・編集・削除 |
| 配当金集計 | 年間・月間配当金の計算・目標達成率表示 |
| NISA管理 | 成長投資枠・つみたて投資枠の残枠管理 |
| 計画シミュレーター | 目標配当額・達成期限の設定と差分表示 |
| チュートリアル・コーチマーク | 初回起動フロー（3枚スライド + 15ステップ） |
| PIN認証 | SecureStore によるアプリロック |
| 多言語対応 | 日本語・英語切替（i18n） |
| CSV/JSONエクスポート | SBI証券CSVインポート・全データエクスポート |
| CI/CD | GitHub Actions（Lint・型チェック・APKビルド） |

### バックエンド（Morincum-backend）

| Issue | 内容 | フェーズ |
|---|---|---|
| #1 | AWS基本インフラ構成 | Phase 1 |
| #2 | RDSデータベース構築・テーブル設計 | Phase 1 |
| #3 | 認証基盤（Cognito） | Phase 1 |
| #4 | 多言語対応（日本語・英語） | Phase 1 |
| #5 | 統計収集・AIニュース生成 | Phase 1 |
| #6 | セキュリティ・監視・コスト管理 | Phase 1 |
| #7 | アプリ行動ログ基盤 | Phase 1 |
| #8 | CI/CDパイプライン構築 | Phase 1 |
| #9 | Slack Botによるシステム状態問い合わせ | Phase 1 |
| #10 | メンテナンス情報配信基盤 | Phase 1 |
| #11 | X自動投稿基盤 | Phase 1 |
| #12 | お知らせ・ニュース配信API | Phase 1 |
| #13 | リポジトリ構成の整備 | Phase 1 |
| #14 | IaC CDK基盤構築 Phase 1 | Phase 1 |
| #16 | OpenAPI仕様書管理・自動同期 | Phase 1 |
| #17 | GitHub Projects一元管理 | Phase 1 |

### バッチ（Morincum-batch）

| Issue | 内容 | フェーズ |
|---|---|---|
| #B1 | リポジトリ構成の整備 | Phase 1 |
| #B2 | バッチ用AWSインフラ構成（CDK） | Phase 1 |
| #B3 | 株価・配当データ取得バッチ | Phase 1 |
| #B4 | 投資信託基準価額・分配金取得バッチ | Phase 1 |
| #B5 | 為替レート取得バッチ | Phase 1 |
| #B6 | Slack Bot実装（システム状態問い合わせ） | Phase 1 |
| #B7 | Slackメンテナンス・お知らせ管理コマンド | Phase 1 |
| #B8 | AIニュース生成バッチ | Phase 1 |
| #B9 | X投稿文生成・Slack通知バッチ | Phase 1〜2 |
| #B10 | バッチCI/CDパイプラインの構築 | Phase 1 |

---

## Phase 2（拡張）

### フロントエンド（Morincum）

| 機能 | 備考 |
|---|---|
| AWS バックエンド連携 | Cognito / API Gateway / Lambda（設計済み、未実装） |
| ダークモード | テーマカラー定数は切り替え対応済みの構造 |
| プッシュ通知 | 配当入金リマインダー |
| Widget 対応 | ホーム画面ウィジェット |
| iPad / タブレット対応 | 最大幅 430px を超えるレイアウト |
| 複数口座管理 | 現在は1口座制限 |

### バックエンド（Morincum-backend）

| Issue | 内容 |
|---|---|
| #15 | IaC CDK基盤構築 Phase 2（StorageStack / LogStack / NotificationStack） |

**Phase 2 追加テーブル：**

| テーブル | 説明 |
|---|---|
| stocks | 銘柄マスタ |
| stock_dividends | 配当金履歴 |
| stock_shareholder_benefits | 株主優待定義 |
| stock_benefit_tiers | 株数別の優待内容 |
| stock_benefit_tier_translations | 優待内容の多言語対応 |
| stock_benefit_histories | ユーザーの優待受取履歴 |
| stock_holdings_histories | ユーザーの株数変動履歴 |

### バッチ（Morincum-batch）

| 機能 | 内容 |
|---|---|
| X API v2 自動投稿 | Slackで承認 → X API v2で自動投稿（$100/月） |
| QuickSight ダッシュボード | 利用統計の可視化 |

---

## コスト目安

| フェーズ | バックエンド | バッチ | 合計 |
|---|---|---|---|
| Phase 1 | ~$21〜24/月 | ~$38〜43/月 | ~$59〜67/月 |
| Phase 2（X API追加） | ~$21〜24/月 | ~$138〜143/月 | ~$159〜167/月 |
