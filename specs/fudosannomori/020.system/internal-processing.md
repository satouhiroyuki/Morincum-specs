# 不動産の森 by Morincum — 内部処理一覧

> ソース: 仕様書 `fudosan-mori-spec-v0.1.md`（v0.2.4、Mermaid描画版 `fudosan-mori-spec-v0.2.html`）を章ごとに分けて Markdown にしたもの
> UIの正: [`design/mock/fudosan-mock-v0.2.jsx`](../design/mock/fudosan-mock-v0.2.jsx)(v0.1 も同じ場所に残している)
> 状態: モック検証中（実装未着手）。判断の経緯は [handoff-2026-11-20.md](../010.product/handoff-2026-11-20.md) を参照

## 6. 内部処理一覧

形式: IPO(Input / Process / Output)。テスト設計時のテストベースとして使用する。

| ID | 処理名 | トリガー | Input | Process | Output |
|---|---|---|---|---|---|
| P-01 | 定期収支の生成 | 月替わり初回起動 / 月初通知タップ | recurring_rules(active), 対象年月 | ルールから当月分のcashflow_recordsを生成(確認付き)。有効契約のないunitの家賃ルールはスキップ | cashflow_records(recurring_rule_id付き) |
| P-02 | 入出金予定の集計 | S-02表示 | recurring_rules, loans(+allocations), cashflow_records, 選択年月 | 口座別・日付順の入出金行を構築。口座差引・全体差引を算出。臨時記録をマージ | 明細行リスト、差引、資金不足ヒント判定 |
| P-03 | 通知スケジューリング | アプリ起動時 / データ変更時 | loans(payment_day), units(contract_end_date), events(due_date), 通知設定 | ローカル通知(expo-notifications)を再構築。**iOSは予約上限64件のため直近分のみ予約し起動毎にローリング更新**。文言は必ず「予定」表記 | 端末内の通知予約 |
| P-04 | 月次・年間集計 | S-02表示 | cashflow_records(実績), P-02(予定) | 月別に口座別内訳の入出金を集計。当月以前=実績、以降=予定として区別。年間トータル算出 | 月別配列(グラフ用)、年間収入/支出/差引 |
| P-05 | 手残り・利回り計算 | S-01/S-05表示 | units, recurring_rules, loans+allocations | 手残り=家賃(空室は0)−管理費等−按分後返済額。表面利回り=年間賃料/取得価格(取得価格NULL時は非算出) | サマリー値 |
| P-06 | ローン計算 | S-05表示(detailed) | loans(principal, rate, term, method, start) | 元利均等/元金均等の月次内訳(利息・元金)、残債、完済年を都度計算。テーブル保存しない | 残債・利息内訳・返済予定 |
| P-07 | 減価償却の参考値算出 | 年間サマリー表示(Std) | units(purchase_price, building_ratio, structure, built_year) | 定額法で参考値を導出。**保存せず表示時計算**(保存すると訂正時に矛盾) | 減価償却費(参考値) |
| P-08 | プラン判定 | 起動時 / 購入時 | ストアレシート, サイレントsub | エンタイトルメントAPIで検証し、プラン状態を端末キャッシュ(定期再検証)。オフライン時はキャッシュで動作 | plan(free/standard)、機能ゲート |
| P-09 | サイレントアカウント発行 | 初回起動 | — | Cognito(不動産の森用App Client)で自動サインアップ。資格情報はSecureStore保存。ユーザーには一切見せない | sub(端末内) |
| P-10 | ライフサイクル操作 | S-05/S-11操作 | 対象エンティティ | 売却を記録(status=sold+売却済タグ自動付与+既定表示から除外)/完済を記録/アーカイブ(archived_at設定)/完全削除(連鎖件数を提示→確認→削除) | 更新されたレコード |
| P-11 | CSVエクスポート | 設定操作(Std) | 全テーブル | unit・収支・ローン・イベントをCSV出力(共有シート) | CSVファイル |
| P-12 | システムタグ自動付与 | unit/契約の登録・更新 | units(所在地, status), contracts | 都道府県タグ・売却済タグを付与。空室タグは「有効契約なし」から導出して付与/解除 | unit_tags |
| P-13 | 契約満了の検知 | 起動時 | contracts(end_date, contract_type) | 満了3ヶ月前に更新イベント(renewal)の作成を提案(定期借家は再契約として案内)。承諾で自動作成 | events提案 |
| P-14 | 広告表示 | フリープランの画面表示 | plan | AdMobバナー表示(配当の森の実装を流用)。Std以上は非表示 | 広告ビュー |
| P-15 | 退去イベント生成 | S-15「契約を終了」 | contracts(対象契約) | 契約status=ended化+家賃ルール停止+moveoutイベントを自動生成(原状回復/クリーニング/敷金精算/募集費用のチェックリスト付き) | events(moveout), recurring_rules更新 |
| P-16 | 契約からの定期ルール生成 | S-15契約の作成・更新 | contracts | 家賃(+共益費)の定期ルールを自動生成・同期。礼金・更新料は収支記録の生成を提案 | recurring_rules, cashflow_records提案 |
| P-17 | 評価額の算出(v1.x) | S-18ウィザード | 路線価, 補正率, site_area_m2, site_right_ratio, 賃貸中か | 敷地利用権評価=路線価×補正×面積×敷地権割合。賃貸中は貸家建付地減額。参考値としてcurrent_valuationへ保存 | current_valuation |
| P-18 | 総会シーズンの検知 | 起動時 | units(assembly_month) | 総会月の前月に「総会イベント(meeting)の作成」を提案。招集通知が届いたら開催日(due_date)を確定入力→期日通知(P-03)へ接続 | events提案 |

処理共通の原則:

1. すべての計算はオンデバイスで完結。ネットワーク必須なのはP-08のみ(オフライン時はキャッシュで全機能動作)
2. 派生指標(利回り・手残り・残債・減価償却)はDBに保存せず表示時に導出する
3. 予定(P-02/P-04の未来分)と実績(確定済みcashflow_records)を常に区別して扱う

