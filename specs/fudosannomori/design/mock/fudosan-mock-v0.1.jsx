import { useState } from "react";

/* ═══════════════ MORINCUM 不動産アプリ モック v0.1 ═══════════════
   ファミリー共通: 緑基調 / 本アプリのアクセント: テラコッタ(土・レンガ)
   画面: ホーム / 入出金(引き落とし) / イベント / 設定 + unit詳細 + 記録入力
   ═══════════════════════════════════════════════════════════════ */

const theme = {
  accent: "#A8552F", accentSoft: "#A8552F16",   // テラコッタ = 本アプリ / 出金
  green:  "#4E9B58", greenSoft:  "#4E9B5816",   // ファミリー緑 = 入金・プラス
  bg: "#F6F4F0", surface: "#FFFFFF", border: "#E6DFD4",
  text: "#3A3229", muted: "#8C8072",
  red: "#C94F4F", gold: "#D9962E", lock: "#B0A695",
};

const APP_VERSION = "v0.1.0";
const PLAN = "free"; // "free" | "standard" | "premium"
const FREE_UNIT_LIMIT = 5;

/* ──────────── サンプルデータ ──────────── */

const ACCOUNTS = [
  { id: 1, name: "みずほ銀行", label: "家賃入金・ローン", color: "#5B8DB8" },
  { id: 2, name: "北洋銀行",   label: "管理費・修繕積立", color: "#C79A3B" },
];

// tags: system(自動付与) / user(手動)
const TAGS = [
  { id: "all",      name: "すべて",       type: "system" },
  { id: "tokyo",    name: "東京都",       type: "system" },
  { id: "hokkaido", name: "北海道",       type: "system" },
  { id: "shiratori",name: "メゾン白鳥",   type: "user" },
];

const UNITS = [
  {
    id: 1, name: "パークサイド代々木 402", tags: ["tokyo"],
    status: "運用中", rent: 128000, rentDay: 25, rentAccountId: 1,
    purchasePrice: 31800000, builtYear: 2012, structure: "RC",
    contractEnd: "2026-09-30",
    exclusiveArea: 25.4, managementCompany: "▲▲コミュニティ",
    assemblyMonth: 8,
    currentValuation: 29800000,
    fixedCosts: [
      { category: "管理費",     amount: 12300, day: 27, accountId: 2 },
      { category: "修繕積立金", amount: 8400,  day: 27, accountId: 2 },
    ],
  },
  {
    id: 3, name: "メゾン白鳥 102", tags: ["hokkaido", "shiratori"],
    status: "空室", rent: 48000, rentDay: 25, rentAccountId: 1,
    purchasePrice: 8200000, builtYear: 1998, structure: "木造",
    contractEnd: null,
    fixedCosts: [{ category: "管理委託料", amount: 0, day: 27, accountId: 2 }],
  },
  {
    id: 5, name: "青葉町駐車場 A区画", tags: ["hokkaido"],
    unitType: "parking",
    status: "運用中", rent: 12000, rentDay: 25, rentAccountId: 1,
    purchasePrice: null, builtYear: null, structure: null,
    contractEnd: null,
    fixedCosts: [],
  },
];

// 賃貸借契約(v0.2: 入居状況は有効契約の有無から導出)
const CONTRACTS = [
  { id: "c1", unitId: 1, status: "active", type: "普通借家",
    start: "2024-10-01", end: "2026-09-30", rent: 128000, rentDay: 25,
    deposit: 128000, keyMoney: 128000, renewalFee: 128000, memo: "法人契約" },
  { id: "c5", unitId: 5, status: "active", type: "月極",
    start: "2025-04-01", end: null, rent: 12000, rentDay: 25,
    deposit: 0, keyMoney: 0, renewalFee: 0, memo: "" },
];

const LOANS = [
  { id: 1, lender: "三菱UFJ銀行", accountId: 1, paymentDay: 27, monthly: 98000,
    mode: "detailed", allocations: [{ unitId: 1, ratio: 1 }],
    principal: 25000000, rate: 1.85, remaining: 19400000, endYear: 2047 },
  { id: 2, lender: "北洋銀行", accountId: 1, paymentDay: 5, monthly: 76000,
    mode: "simple", allocations: [{ unitId: 2, ratio: 0.5 }, { unitId: 3, ratio: 0.5 }] },
  { id: 3, lender: "りそな銀行", accountId: 1, paymentDay: 27, monthly: 74000,
    mode: "simple", allocations: [{ unitId: 4, ratio: 1 }] },
];

const EVENTS = [
  {
    id: 1, unitId: 3, type: "trouble", title: "102号 給湯器故障", status: "open",
    occurred: "7/02", due: null,
    log: [
      { date: "7/02", text: "内見時に給湯器の不着火を確認。管理会社へ連絡" },
      { date: "7/05", text: "業者見積: 交換 ¥128,000(工事費込)" },
      { date: "7/12", text: "交換工事を発注。7/24 施工予定" },
    ],
    costs: [{ label: "給湯器交換工事", amount: 128000, planned: true }],
  },
  {
    id: 2, unitId: 1, type: "renewal", title: "402号 契約更新", status: "open",
    occurred: "7/01", due: "9/30",
    log: [{ date: "7/01", text: "契約満了3ヶ月前。管理会社から更新案内の発送予定を確認" }],
    costs: [{ label: "更新料(予定・収入)", amount: 128000, planned: true, income: true }],
  },
  {
    id: 3, unitId: 1, type: "meeting", title: "パークサイド代々木 管理組合総会", status: "open",
    occurred: "7/10", due: "8/22",
    log: [{ date: "7/10", text: "招集通知が到着。議案: 大規模修繕(2028年度)の積立増額" }],
    costs: [],
  },
  {
    id: 4, unitId: 4, type: "trouble", title: "805号 エアコン修理", status: "closed",
    occurred: "5/18", due: null,
    log: [
      { date: "5/18", text: "入居者よりエアコン不調の連絡" },
      { date: "5/25", text: "修理完了。基板交換 ¥42,000" },
    ],
    costs: [{ label: "エアコン基板交換", amount: 42000 }],
  },
];

const EVENT_META = {
  trouble: { label: "トラブル", icon: "⚠️", color: theme.red },
  renewal: { label: "更新",     icon: "📄", color: theme.gold },
  meeting: { label: "総会",     icon: "🏛", color: theme.muted },
  other:   { label: "その他",   icon: "📌", color: theme.muted },
};

/* ──────────── 計算ヘルパー ──────────── */

const yen = (n) => `¥${Math.abs(n).toLocaleString()}`;
const signYen = (n) => `${n >= 0 ? "+" : "−"}${yen(n)}`;

const unitLoanMonthly = (u) =>
  LOANS.reduce((s, l) => s + l.allocations.filter(a => a.unitId === u.id)
    .reduce((x, a) => x + Math.round(l.monthly * a.ratio), 0), 0);

const unitFixedMonthly = (u) => u.fixedCosts.reduce((s, c) => s + c.amount, 0);
const unitRentActual   = (u) => (u.status === "空室" ? 0 : u.rent);
const unitCF = (u) => unitRentActual(u) - unitFixedMonthly(u) - unitLoanMonthly(u);
const grossYield = (u) => u.purchasePrice ? ((u.rent * 12) / u.purchasePrice * 100).toFixed(2) : null;

const unitsForTag = (tagId) =>
  tagId === "all" ? UNITS : UNITS.filter(u => u.tags.includes(tagId));

/* 口座ごとの当月入出金(定期分) */
const accountFlows = (accountId) => {
  const rows = [];
  UNITS.forEach(u => {
    if (u.status !== "空室" && u.rentAccountId === accountId)
      rows.push({ day: u.rentDay, label: `家賃入金(${u.name.split(" ")[1]})`, sub: u.name.split(" ")[0], amount: u.rent });
    u.fixedCosts.forEach(c => {
      if (c.accountId === accountId && c.amount > 0)
        rows.push({ day: c.day, label: `${c.category}(${u.name.split(" ")[1]})`, sub: u.name.split(" ")[0], amount: -c.amount });
    });
  });
  LOANS.forEach(l => {
    if (l.accountId === accountId) {
      const names = l.allocations.map(a => UNITS.find(u => u.id === a.unitId)?.name.split(" ")[1]).join("・");
      rows.push({ day: l.paymentDay, label: `${l.lender} ローン(${names})`, sub: "返済", amount: -l.monthly });
    }
  });
  return rows.sort((a, b) => a.day - b.day);
};

/* ──────────── 共通小物 ──────────── */

const Chip = ({ children, active, onClick, userTag }) => (
  <button onClick={onClick} style={{
    padding: "6px 14px", borderRadius: 16, fontSize: 13, whiteSpace: "nowrap",
    border: `1px solid ${active ? theme.accent : theme.border}`,
    background: active ? theme.accent : theme.surface,
    color: active ? "#fff" : userTag ? theme.accent : theme.text,
    fontWeight: active ? 600 : 400, cursor: "pointer",
  }}>{userTag && !active ? "◆ " : ""}{children}</button>
);

const Card = ({ children, style }) => (
  <div style={{ background: theme.surface, borderRadius: 14, border: `1px solid ${theme.border}`,
    padding: 16, marginBottom: 12, ...style }}>{children}</div>
);

const SectionTitle = ({ children }) => (
  <div style={{ fontSize: 12, fontWeight: 700, color: theme.muted, letterSpacing: 1,
    margin: "18px 2px 8px" }}>{children}</div>
);

const LockedCard = ({ title, desc }) => (
  <Card style={{ background: "#FBFAF7", borderStyle: "dashed" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ fontSize: 20 }}>🔒</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: theme.lock }}>{title}</div>
        <div style={{ fontSize: 11, color: theme.lock, marginTop: 2 }}>{desc}</div>
      </div>
      <div style={{ fontSize: 11, color: theme.accent, fontWeight: 700, border: `1px solid ${theme.accent}`,
        borderRadius: 12, padding: "4px 10px" }}>スタンダード</div>
    </div>
  </Card>
);

/* ──────────── ホーム ──────────── */

function HomeView({ activeTag, setActiveTag, openUnit }) {
  const units = unitsForTag(activeTag);
  const totalCF = units.reduce((s, u) => s + unitCF(u), 0);
  const occupied = units.filter(u => u.status === "運用中").length;
  const openTroubles = EVENTS.filter(e => e.status === "open" && e.type === "trouble").length;
  const tagName = TAGS.find(t => t.id === activeTag)?.name;

  return (
    <div>
      {/* タグバー */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "4px 2px 12px" }}>
        {TAGS.map(t => (
          <Chip key={t.id} active={t.id === activeTag} userTag={t.type === "user"}
            onClick={() => setActiveTag(t.id)}>{t.name}</Chip>
        ))}
        <Chip onClick={() => {}}>＋</Chip>
      </div>

      {/* サマリーカード */}
      <Card style={{ background: `linear-gradient(135deg, ${theme.surface}, ${theme.greenSoft})` }}>
        <div style={{ fontSize: 12, color: theme.muted }}>{tagName} ・ 今月の手残り(定期分)</div>
        <div style={{ fontSize: 32, fontWeight: 800, marginTop: 4,
          color: totalCF >= 0 ? theme.green : theme.accent }}>{signYen(totalCF)}</div>
        <div style={{ display: "flex", gap: 18, marginTop: 12, fontSize: 12, color: theme.muted }}>
          <span>稼働 <b style={{ color: theme.text }}>{occupied}/{units.length}戸</b></span>
          <span>家賃計 <b style={{ color: theme.text }}>{yen(units.reduce((s,u)=>s+unitRentActual(u),0))}</b></span>
          {openTroubles > 0 && (
            <span style={{ color: theme.red }}>⚠️ 対応中 <b>{openTroubles}件</b></span>
          )}
        </div>
      </Card>

      {/* 近づく期日 */}
      <SectionTitle>近づく期日</SectionTitle>
      <Card style={{ padding: "8px 16px" }}>
        {[
          { d: "7/24", t: "明日: みずほ銀行から ¥172,000 の引き落とし", c: theme.accent },
          { d: "8/22", t: "パークサイド代々木 管理組合総会", c: theme.muted },
          { d: "9/30", t: "402号 契約満了(更新手続き)", c: theme.gold },
        ].map((r, i) => (
          <div key={i} style={{ display: "flex", gap: 12, padding: "8px 0",
            borderBottom: i < 2 ? `1px solid ${theme.border}` : "none", fontSize: 13 }}>
            <span style={{ color: r.c, fontWeight: 700, width: 42 }}>{r.d}</span>
            <span style={{ color: theme.text }}>{r.t}</span>
          </div>
        ))}
      </Card>

      {/* unit一覧 */}
      <SectionTitle>物件({units.length}/{FREE_UNIT_LIMIT}件・フリープラン)</SectionTitle>
      {units.map(u => {
        const cf = unitCF(u);
        return (
          <Card key={u.id} style={{ cursor: "pointer" }} >
            <div onClick={() => openUnit(u)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{u.name}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: cf >= 0 ? theme.green : theme.accent }}>
                  {signYen(cf)}<span style={{ fontSize: 10, color: theme.muted, fontWeight: 400 }}>/月</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 8, alignItems: "center" }}>
                {u.unitType === "parking" && (
                  <span style={{ fontSize: 10, background: theme.greenSoft, color: theme.green,
                    padding: "2px 8px", borderRadius: 8, fontWeight: 700 }}>P 駐車場</span>
                )}
                {u.status === "空室" && (
                  <span style={{ fontSize: 10, background: theme.accentSoft, color: theme.accent,
                    padding: "2px 8px", borderRadius: 8, fontWeight: 700 }}>空室</span>
                )}
                {u.assemblyMonth && (
                  <span style={{ fontSize: 10, background: "#D9962E1A", color: theme.gold,
                    padding: "2px 8px", borderRadius: 8, fontWeight: 700 }}>🏛 {u.assemblyMonth}月総会</span>
                )}
                {u.tags.map(tid => (
                  <span key={tid} style={{ fontSize: 10, background: theme.bg, color: theme.muted,
                    padding: "2px 8px", borderRadius: 8 }}>{TAGS.find(t => t.id === tid)?.name}</span>
                ))}
                {grossYield(u) && (
                  <span style={{ marginLeft: "auto", fontSize: 11, color: theme.muted }}>
                    表面 {grossYield(u)}%
                  </span>
                )}
              </div>
            </div>
          </Card>
        );
      })}

      {/* 物件を追加(S-07 登録ウィザードへの入口) */}
      {units.length < FREE_UNIT_LIMIT ? (
        <Card style={{ borderStyle: "dashed", background: "#FBFAF7", textAlign: "center",
          cursor: "pointer", padding: "18px 16px" }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: theme.green }}>＋ 物件を追加</div>
          <div style={{ fontSize: 11, color: theme.muted, marginTop: 4 }}>
            名称・家賃・返済の3問だけで、すぐ始められます
          </div>
        </Card>
      ) : (
        <Card style={{ borderStyle: "dashed", background: "#FBFAF7", textAlign: "center",
          padding: "18px 16px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: theme.lock }}>
            フリープランの上限({FREE_UNIT_LIMIT}件)に達しています
          </div>
          <div style={{ fontSize: 11, color: theme.muted, marginTop: 4 }}>
            スタンダードプランで物件数無制限になります
          </div>
        </Card>
      )}

      <LockedCard title="分析ダッシュボード(タブ「分析」)"
        desc="推移グラフ・稼働率・物件比較・年間サマリー(確定申告向け)" />
    </div>
  );
}

/* ──────────── 入出金(引き落とし)ビュー ──────────── */

function FlowsView({ grouping }) {
  const [selMonth, setSelMonth] = useState(7);
  // 月別集計(実績+予定・口座別): 5月エアコン修理、6月〜102号空室、7月給湯器交換、9月更新料
  // in/out のキーは口座ID(1=みずほ, 2=北洋)
  const MONTHLY = [
    { m: 1,  in: { 1: 339000, 2: 0 }, out: { 1: 248000, 2: 38500 } },
    { m: 2,  in: { 1: 339000, 2: 0 }, out: { 1: 248000, 2: 38500 } },
    { m: 3,  in: { 1: 339000, 2: 0 }, out: { 1: 248000, 2: 38500 } },
    { m: 4,  in: { 1: 339000, 2: 0 }, out: { 1: 248000, 2: 38500 } },
    { m: 5,  in: { 1: 339000, 2: 0 }, out: { 1: 290000, 2: 38500 } },
    { m: 6,  in: { 1: 291000, 2: 0 }, out: { 1: 248000, 2: 38500 } },
    { m: 7,  in: { 1: 291000, 2: 0 }, out: { 1: 376000, 2: 38500 } },
    { m: 8,  in: { 1: 291000, 2: 0 }, out: { 1: 248000, 2: 38500 } },
    { m: 9,  in: { 1: 419000, 2: 0 }, out: { 1: 248000, 2: 38500 } },
    { m: 10, in: { 1: 291000, 2: 0 }, out: { 1: 248000, 2: 38500 } },
    { m: 11, in: { 1: 291000, 2: 0 }, out: { 1: 248000, 2: 38500 } },
    { m: 12, in: { 1: 291000, 2: 0 }, out: { 1: 248000, 2: 38500 } },
  ];
  const CURRENT_M = 7;
  const tin  = (x) => ACCOUNTS.reduce((s, a) => s + (x.in[a.id]  || 0), 0);
  const tout = (x) => ACCOUNTS.reduce((s, a) => s + (x.out[a.id] || 0), 0);
  const yearIn  = MONTHLY.reduce((s, x) => s + tin(x), 0);
  const yearOut = MONTHLY.reduce((s, x) => s + tout(x), 0);
  const maxV = Math.max(...MONTHLY.flatMap(x => [tin(x), tout(x)]));
  const sel = MONTHLY.find(x => x.m === selMonth);

  return (
    <div>
      {/* 年間トータル + 月別棒グラフ */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={{ fontSize: 13, fontWeight: 800 }}>2026年の入出金</div>
          <div style={{ fontSize: 10, color: theme.muted }}>実績 + {CURRENT_M + 1}月以降は予定</div>
        </div>
        <div style={{ display: "flex", gap: 18, marginTop: 10 }}>
          {[
            { l: "収入", v: yearIn, c: theme.green },
            { l: "支出", v: yearOut, c: theme.accent },
            { l: "差引", v: yearIn - yearOut, c: yearIn - yearOut >= 0 ? theme.green : theme.accent, bold: true },
          ].map(x => (
            <div key={x.l}>
              <div style={{ fontSize: 10, color: theme.muted }}>{x.l}</div>
              <div style={{ fontSize: x.bold ? 18 : 14, fontWeight: 800, color: x.c }}>
                {x.l === "差引" ? signYen(x.v) : yen(x.v)}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 84, marginTop: 14 }}>
          {MONTHLY.map(x => {
            const future = x.m > CURRENT_M;
            const active = x.m === selMonth;
            return (
              <div key={x.m} onClick={() => setSelMonth(x.m)}
                style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                  gap: 3, cursor: "pointer", paddingTop: 4, borderRadius: 6,
                  background: active ? theme.bg : "transparent" }}>
                <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 58 }}>
                  {/* 左=入金(口座別積み上げ) */}
                  <div style={{ display: "flex", flexDirection: "column-reverse", width: 6,
                    borderRadius: 2, overflow: "hidden", opacity: future ? 0.35 : 1 }}>
                    {ACCOUNTS.map(a => (x.in[a.id] || 0) > 0 && (
                      <div key={a.id} style={{ height: `${x.in[a.id] / maxV * 58}px`,
                        background: a.color }} />
                    ))}
                  </div>
                  {/* 右=出金(口座別積み上げ) */}
                  <div style={{ display: "flex", flexDirection: "column-reverse", width: 6,
                    borderRadius: 2, overflow: "hidden", opacity: future ? 0.35 : 0.72 }}>
                    {ACCOUNTS.map(a => (x.out[a.id] || 0) > 0 && (
                      <div key={a.id} style={{ height: `${x.out[a.id] / maxV * 58}px`,
                        background: a.color }} />
                    ))}
                  </div>
                </div>
                <div style={{ fontSize: 9, fontWeight: active ? 800 : 400,
                  color: active ? theme.text : theme.muted }}>{x.m}</div>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 8, fontSize: 10, color: theme.muted }}>
          {ACCOUNTS.map(a => (
            <span key={a.id}><span style={{ color: a.color }}>■</span> {a.name}</span>
          ))}
          <span>左=入金 / 右=出金(淡)</span>
          <span style={{ opacity: 0.5 }}>薄色は予定</span>
        </div>
      </Card>

      {/* 選択月の明細ヘッダー */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 2px 12px" }}>
        <button style={navBtn} onClick={() => setSelMonth(m => Math.max(1, m - 1))}>◀</button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>2026年{selMonth}月</div>
          <div style={{ fontSize: 10, color: theme.muted }}>
            {selMonth > CURRENT_M ? "入出金の予定" : "入出金"} ・ 差引 {signYen(tin(sel) - tout(sel))}
          </div>
        </div>
        <button style={navBtn} onClick={() => setSelMonth(m => Math.min(12, m + 1))}>▶</button>
      </div>

      {grouping === "date" ? (() => {
        const merged = ACCOUNTS.flatMap(acc =>
          accountFlows(acc.id).map(r => ({ ...r, acc }))
        ).sort((a, b) => a.day - b.day);
        const net = merged.reduce((s, r) => s + r.amount, 0);
        return (
          <div>
            <SectionTitle>日付順(全口座)</SectionTitle>
            <Card style={{ padding: 0, overflow: "hidden" }}>
              {merged.map((r, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px", borderBottom: `1px solid ${theme.border}` }}>
                  <div style={{ width: 34, textAlign: "center" }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: theme.text }}>{r.day}</div>
                    <div style={{ fontSize: 9, color: theme.muted }}>日</div>
                  </div>
                  <div style={{ width: 6, height: 28, borderRadius: 3, background: r.acc.color }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{r.label}</div>
                    <div style={{ fontSize: 10, color: r.acc.color, fontWeight: 700 }}>{r.acc.name}</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800,
                    color: r.amount >= 0 ? theme.green : theme.accent }}>{signYen(r.amount)}</div>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 14px",
                background: net >= 0 ? theme.greenSoft : theme.accentSoft }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>差引(全口座)</div>
                <div style={{ fontSize: 16, fontWeight: 800,
                  color: net >= 0 ? theme.green : theme.accent }}>{signYen(net)}</div>
              </div>
            </Card>
          </div>
        );
      })() : ACCOUNTS.map(acc => {
        const rows = accountFlows(acc.id);
        const net = rows.reduce((s, r) => s + r.amount, 0);
        return (
          <div key={acc.id}>
            <SectionTitle><span style={{ color: acc.color }}>■</span> {acc.name} <span style={{ fontWeight: 400 }}>({acc.label})</span></SectionTitle>
            <Card style={{ padding: 0, overflow: "hidden" }}>
              {rows.map((r, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px", borderBottom: `1px solid ${theme.border}` }}>
                  <div style={{ width: 34, textAlign: "center" }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: theme.text }}>{r.day}</div>
                    <div style={{ fontSize: 9, color: theme.muted }}>日</div>
                  </div>
                  <div style={{ width: 6, height: 28, borderRadius: 3,
                    background: r.amount >= 0 ? theme.green : theme.accent }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{r.label}</div>
                    <div style={{ fontSize: 10, color: theme.muted }}>{r.sub}</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800,
                    color: r.amount >= 0 ? theme.green : theme.accent }}>{signYen(r.amount)}</div>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 14px",
                background: net >= 0 ? theme.greenSoft : theme.accentSoft }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>差引</div>
                <div style={{ fontSize: 16, fontWeight: 800,
                  color: net >= 0 ? theme.green : theme.accent }}>{signYen(net)}</div>
              </div>
            </Card>
            {net < 0 && (
              <div style={{ fontSize: 11, color: theme.accent, margin: "-6px 4px 14px" }}>
                💡 この口座は出金予定が入金予定を {yen(net)} 上回ります。残高をご確認ください
              </div>
            )}
          </div>
        );
      })}

      <Card style={{ background: theme.bg, border: "none" }}>
        <div style={{ fontSize: 12, color: theme.muted, lineHeight: 1.7 }}>
          🔔 引き落とし前日の18:00に通知します(設定で変更できます)。
          臨時の入出金は「＋」から記録すると、この画面に反映されます。
        </div>
      </Card>
      <div style={{ fontSize: 11, color: theme.muted, textAlign: "center", margin: "4px 8px 8px",
        lineHeight: 1.7 }}>
        ここに表示されるのは登録内容にもとづく予定です。<br />
        実際の入出金・残高は、お使いの銀行口座でご確認ください。
      </div>
    </div>
  );
}

const navBtn = { border: `1px solid ${theme.border}`, background: theme.surface,
  borderRadius: 10, padding: "6px 14px", color: theme.muted, cursor: "pointer" };

/* ──────────── unit詳細(セクションカード方式) ──────────── */

const EditLink = ({ label = "編集" }) => (
  <span style={{ marginLeft: "auto", fontSize: 12, color: theme.accent, fontWeight: 700,
    cursor: "pointer" }}>{label} ›</span>
);

const EmptyBadge = () => (
  <span style={{ fontSize: 10, background: theme.accentSoft, color: theme.accent,
    padding: "2px 8px", borderRadius: 8, fontWeight: 700 }}>未入力</span>
);

const SectionHead = ({ title, edit }) => (
  <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
    <span style={{ fontSize: 13, fontWeight: 800 }}>{title}</span>
    {edit && <EditLink label={edit} />}
  </div>
);

const InfoRow = ({ label, value }) => (
  <div style={{ display: "flex", alignItems: "center", padding: "7px 0", fontSize: 12,
    borderBottom: `1px solid ${theme.bg}` }}>
    <span style={{ color: theme.muted, width: 96 }}>{label}</span>
    {value != null ? <span style={{ color: theme.text }}>{value}</span> : <EmptyBadge />}
  </div>
);

function UnitDetail({ unit, onBack }) {
  const loanM = unitLoanMonthly(unit);
  const fixedM = unitFixedMonthly(unit);
  const cf = unitCF(unit);
  const loans = LOANS.filter(l => l.allocations.some(a => a.unitId === unit.id));
  const events = EVENTS.filter(e => e.unitId === unit.id);
  const contract = CONTRACTS.find(c => c.unitId === unit.id && c.status !== "ended");
  const bars = [82, 91, 88, 95, 78, 100];

  return (
    <div>
      <button onClick={onBack} style={{ ...navBtn, marginBottom: 12 }}>← 戻る</button>
      <div style={{ fontSize: 20, fontWeight: 800 }}>{unit.name}</div>
      <div style={{ fontSize: 12, color: theme.muted, marginBottom: 14 }}>
        {unit.unitType === "parking" ? "月極駐車場" : "区分マンション"}
      </div>

      {/* 収支カード */}
      <Card>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { l: "家賃", v: unitRentActual(unit), c: theme.green },
            { l: "ローン返済", v: -loanM, c: theme.accent },
            { l: "管理費等", v: -fixedM, c: theme.accent },
            { l: "手残り", v: cf, c: cf >= 0 ? theme.green : theme.accent, big: true },
          ].map((x, i) => (
            <div key={i}>
              <div style={{ fontSize: 11, color: theme.muted }}>{x.l}</div>
              <div style={{ fontSize: x.big ? 22 : 16, fontWeight: 800, color: x.c }}>{signYen(x.v)}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 44, marginTop: 14 }}>
          {bars.map((h, i) => (
            <div key={i} style={{ flex: 1, height: `${h * 0.44}px`, borderRadius: 4,
              background: i === bars.length - 1 ? theme.green : theme.greenSoft,
              border: `1px solid ${theme.green}30` }} />
          ))}
        </div>
        <div style={{ fontSize: 10, color: theme.muted, marginTop: 4, textAlign: "right" }}>直近6ヶ月の手残り</div>
      </Card>

      {/* 契約 */}
      <Card>
        {contract ? (
          <div>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 800 }}>契約</span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 8,
                background: theme.greenSoft, color: theme.green, marginLeft: 8 }}>契約中</span>
              <EditLink />
            </div>
            <InfoRow label="種別" value={contract.type} />
            <InfoRow label="期間" value={`${contract.start} 〜 ${contract.end ?? "期限なし"}`} />
            <InfoRow label="賃料" value={`${yen(contract.rent)} / 毎月${contract.rentDay}日入金`} />
            {contract.type !== "月極" && (
              <InfoRow label="敷金・礼金" value={`${yen(contract.deposit)} ・ ${yen(contract.keyMoney)}`} />
            )}
            {contract.renewalFee > 0 && <InfoRow label="更新料" value={yen(contract.renewalFee)} />}
            {contract.memo && <InfoRow label="メモ" value={contract.memo} />}
            <button style={{ ...smallBtn, marginTop: 10, color: theme.accent, borderColor: theme.accent }}>
              契約を終了(退去を記録)
            </button>
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 800 }}>契約</span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 8,
                background: theme.accentSoft, color: theme.accent, marginLeft: 8 }}>空室</span>
            </div>
            <div style={{ fontSize: 12, color: theme.muted, marginBottom: 10 }}>
              有効な契約がありません。入居が決まったら契約を登録すると、家賃の入金予定が自動で作られます。
            </div>
            <button style={{ ...smallBtn, color: theme.green, borderColor: theme.green }}>＋ 新しい契約</button>
          </div>
        )}
      </Card>

      {/* 基本情報 */}
      <Card>
        <SectionHead title="基本情報" edit="編集" />
        <InfoRow label="構造・築年" value={unit.structure ? `${unit.structure}造 ・ ${unit.builtYear}年築` : null} />
        <InfoRow label="取得" value={unit.purchasePrice ? `${yen(unit.purchasePrice)}` : null} />
        <InfoRow label="専有面積" value={unit.exclusiveArea ? `${unit.exclusiveArea}㎡` : null} />
        <InfoRow label="敷地権割合" value={unit.siteRightRatio ?? null} />
        <InfoRow label="管理会社" value={unit.managementCompany ?? null} />
        {unit.unitType !== "parking" && (
          <InfoRow label="総会時期" value={unit.assemblyMonth ? `毎年${unit.assemblyMonth}月頃` : null} />
        )}
      </Card>

      {/* ローン */}
      {loans.map(l => {
        const ratio = l.allocations.find(a => a.unitId === unit.id)?.ratio ?? 1;
        return (
          <Card key={l.id}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 800 }}>ローン ・ {l.lender}</div>
              <EditLink />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              <div style={{ fontSize: 11, color: theme.muted }}>
                {ACCOUNTS.find(a => a.id === l.accountId)?.name} ・ 毎月{l.paymentDay}日
                {ratio < 1 && ` ・ 按分 ${ratio * 100}%`}
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: theme.accent }}>
                {yen(Math.round(l.monthly * ratio))}<span style={{ fontSize: 10, color: theme.muted }}>/月</span>
              </div>
            </div>
            {l.mode === "detailed" ? (
              <div style={{ fontSize: 12, marginTop: 8, display: "flex", gap: 16 }}>
                <span>残債 <b>{yen(l.remaining)}</b></span>
                <span>金利 <b>{l.rate}%</b></span>
                <span>〜{l.endYear}年</span>
              </div>
            ) : (
              <div style={{ fontSize: 11, color: theme.lock, marginTop: 8 }}>
                🔒 金利・期間を入力すると残債と利息内訳を分析できます(スタンダード)
              </div>
            )}
          </Card>
        );
      })}

      {/* 定期支出 */}
      <Card>
        <SectionHead title="定期支出" edit="編集" />
        {unit.fixedCosts.filter(c => c.amount > 0).length > 0 ? (
          unit.fixedCosts.filter(c => c.amount > 0).map((c, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", padding: "7px 0",
              fontSize: 12, borderBottom: `1px solid ${theme.bg}` }}>
              <span style={{ color: theme.text, flex: 1 }}>{c.category}</span>
              <span style={{ color: theme.muted, fontSize: 11, marginRight: 10 }}>
                毎月{c.day}日 ・ {ACCOUNTS.find(a => a.id === c.accountId)?.name}
              </span>
              <span style={{ fontWeight: 700, color: theme.accent }}>{yen(c.amount)}</span>
            </div>
          ))
        ) : (
          <div style={{ fontSize: 12, color: theme.muted }}>定期支出はありません</div>
        )}
      </Card>

      {/* 評価額 */}
      <Card>
        <SectionHead title="評価額(参考)" />
        {unit.currentValuation ? (
          <div style={{ fontSize: 18, fontWeight: 800 }}>{yen(unit.currentValuation)}</div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <EmptyBadge />
            <span style={{ fontSize: 11, color: theme.muted }}>手入力、または路線価から計算できます</span>
          </div>
        )}
        <button style={{ ...smallBtn, marginTop: 10 }}>路線価から計算(近日対応)</button>
      </Card>

      {/* この物件のイベント */}
      <SectionTitle>この物件のイベント</SectionTitle>
      {events.length === 0 && <Card><div style={{ fontSize: 12, color: theme.muted }}>イベントはありません</div></Card>}
      {events.map(e => (
        <Card key={e.id} style={{ padding: "12px 16px" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
            <span>{EVENT_META[e.type].icon}</span>
            <span style={{ fontWeight: 700, flex: 1 }}>{e.title}</span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 8,
              background: e.status === "open" ? theme.accentSoft : theme.bg,
              color: e.status === "open" ? theme.accent : theme.muted }}>
              {e.status === "open" ? "対応中" : "解決済"}
            </span>
          </div>
        </Card>
      ))}

      <SectionTitle>この物件の操作</SectionTitle>
      <Card style={{ padding: "6px 16px" }}>
        {[
          { l: "売却を記録", d: "売却日と売却額を記録し、運用を終了します。記録はすべて残ります" },
          { l: "アーカイブ", d: "一覧から非表示にします。履歴と集計には残ります" },
        ].map((a, i) => (
          <div key={a.l} style={{ padding: "11px 0",
            borderBottom: i === 0 ? `1px solid ${theme.border}` : "none" }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{a.l}</div>
            <div style={{ fontSize: 10, color: theme.muted, marginTop: 2 }}>{a.d}</div>
          </div>
        ))}
      </Card>
      <div style={{ fontSize: 10, color: theme.muted, textAlign: "center", margin: "0 8px 8px" }}>
        完全な削除は 設定 › アーカイブの管理 から行えます
      </div>
    </div>
  );
}

/* ──────────── イベント ──────────── */

function EventsView() {
  const [expanded, setExpanded] = useState(1);
  const open = EVENTS.filter(e => e.status === "open");
  const closed = EVENTS.filter(e => e.status === "closed");

  const EventCard = ({ e }) => {
    const meta = EVENT_META[e.type];
    const unit = UNITS.find(u => u.id === e.unitId);
    const total = e.costs.filter(c => !c.income).reduce((s, c) => s + c.amount, 0);
    const isOpen = expanded === e.id;
    return (
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div onClick={() => setExpanded(isOpen ? null : e.id)}
          style={{ padding: "14px 16px", cursor: "pointer" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 16 }}>{meta.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{e.title}</div>
              <div style={{ fontSize: 11, color: theme.muted, marginTop: 2 }}>
                {meta.label} ・ {unit?.name} ・ {e.occurred}発生{e.due && ` ・ 期日 ${e.due}`}
              </div>
            </div>
            {total > 0 && (
              <div style={{ fontSize: 13, fontWeight: 800, color: theme.accent }}>{yen(total)}</div>
            )}
          </div>
        </div>
        {isOpen && (
          <div style={{ borderTop: `1px solid ${theme.border}`, padding: "12px 16px", background: "#FBFAF7" }}>
            {e.log.map((l, i) => (
              <div key={i} style={{ display: "flex", gap: 10, fontSize: 12, padding: "5px 0" }}>
                <span style={{ color: theme.muted, width: 34, fontWeight: 700 }}>{l.date}</span>
                <span style={{ color: theme.text, flex: 1 }}>{l.text}</span>
              </div>
            ))}
            {e.costs.length > 0 && (
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px dashed ${theme.border}` }}>
                {e.costs.map((c, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "3px 0" }}>
                    <span style={{ color: theme.muted }}>
                      {c.label}{c.planned && " (予定)"}
                    </span>
                    <span style={{ fontWeight: 700, color: c.income ? theme.green : theme.accent }}>
                      {c.income ? "+" : "−"}{yen(c.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button style={{ ...smallBtn }}>経緯を追記</button>
              <button style={{ ...smallBtn }}>収支を紐付け</button>
              {e.status === "open" && <button style={{ ...smallBtn, marginLeft: "auto", color: theme.green, borderColor: theme.green }}>解決済にする</button>}
            </div>
          </div>
        )}
      </Card>
    );
  };

  return (
    <div>
      <SectionTitle>対応中({open.length})</SectionTitle>
      {open.map(e => <EventCard key={e.id} e={e} />)}
      <SectionTitle>解決済</SectionTitle>
      {closed.map(e => <EventCard key={e.id} e={e} />)}
      <LockedCard title="イベント費用の横断集計" desc="今年の修繕費合計・物件間のトラブル費用比較" />
    </div>
  );
}

const smallBtn = { fontSize: 11, padding: "5px 10px", borderRadius: 8,
  border: `1px solid ${theme.border}`, background: theme.surface, color: theme.muted, cursor: "pointer" };

/* ──────────── 記録入力モーダル ──────────── */

function AddModal({ onClose }) {
  const [direction, setDirection] = useState("expense");
  const cats = direction === "income"
    ? ["家賃", "共益費", "更新料", "礼金", "その他"]
    : ["修繕費", "管理費", "修繕積立金", "管理委託料", "固定資産税", "保険料", "その他"];
  const [cat, setCat] = useState(cats[0]);

  return (
    <div style={{ position: "absolute", inset: 0, background: "#0006", display: "flex",
      alignItems: "flex-end", zIndex: 20 }} onClick={onClose}>
      <div style={{ background: theme.surface, borderRadius: "20px 20px 0 0", width: "100%",
        padding: 20 }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 14 }}>収支を記録</div>

        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {[["income", "収入"], ["expense", "支出"]].map(([v, l]) => (
            <button key={v} onClick={() => setDirection(v)} style={{
              flex: 1, padding: 10, borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: "pointer",
              border: `1.5px solid ${direction === v ? (v === "income" ? theme.green : theme.accent) : theme.border}`,
              background: direction === v ? (v === "income" ? theme.greenSoft : theme.accentSoft) : theme.surface,
              color: direction === v ? (v === "income" ? theme.green : theme.accent) : theme.muted,
            }}>{l}</button>
          ))}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          {cats.map(c => <Chip key={c} active={c === cat} onClick={() => setCat(c)}>{c}</Chip>)}
        </div>

        {[["金額", "¥ 0"], ["日付", "2026/07/21"], ["物件", "パークサイド代々木 402"],
          ["口座", "みずほ銀行"], ["メモ・イベント紐付け", "任意"]].map(([l, p]) => (
          <div key={l} style={{ display: "flex", alignItems: "center", padding: "11px 0",
            borderBottom: `1px solid ${theme.border}` }}>
            <div style={{ fontSize: 13, color: theme.muted, width: 130 }}>{l}</div>
            <div style={{ fontSize: 14, color: theme.text }}>{p}</div>
            <div style={{ marginLeft: "auto", color: theme.border }}>›</div>
          </div>
        ))}

        <button style={{ width: "100%", marginTop: 18, padding: 14, borderRadius: 12, border: "none",
          background: theme.accent, color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer" }}
          onClick={onClose}>記録する</button>
      </div>
    </div>
  );
}

/* ──────────── 分析(スタンダード) ──────────── */

function AnalysisView() {
  return (
    <div>
      <SectionTitle>分析ダッシュボード</SectionTitle>
      <Card style={{ textAlign: "center", padding: "28px 20px" }}>
        <div style={{ fontSize: 34 }}>🔒</div>
        <div style={{ fontSize: 15, fontWeight: 800, marginTop: 8 }}>スタンダードプランの機能です</div>
        <div style={{ fontSize: 12, color: theme.muted, marginTop: 8, lineHeight: 1.8 }}>
          タグ横断の手残り推移・物件比較・稼働率、<br />
          年間サマリー(確定申告向け)、イベント費用の集計が使えます
        </div>
        {/* プレビュー(ダミーグラフ) */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 70,
          margin: "20px 12px 6px", opacity: 0.35 }}>
          {[42, 58, 50, 66, 47, 72, 63, 78].map((h, i) => (
            <div key={i} style={{ flex: 1, height: `${h}px`, borderRadius: 4,
              background: i % 2 ? theme.accent : theme.green }} />
          ))}
        </div>
        <div style={{ fontSize: 10, color: theme.lock, marginBottom: 16 }}>プレビュー</div>
        <button style={{ width: "100%", padding: 12, borderRadius: 12, border: "none",
          background: theme.green, color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
          スタンダードプランに申し込む
        </button>
      </Card>
    </div>
  );
}

/* ──────────── 設定 ──────────── */

function SettingsView({ grouping, setGrouping }) {
  return (
    <div>
      <SectionTitle>契約状態</SectionTitle>
      <Card style={{ textAlign: "center" }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: theme.green, background: theme.greenSoft,
          border: `1px solid ${theme.green}55`, borderRadius: 14, padding: "4px 14px" }}>フリープラン</span>
        <div style={{ fontSize: 11, color: theme.muted, marginTop: 10, lineHeight: 1.7 }}>
          スタンダードプランで物件数無制限・ローン分析・ダッシュボード・CSVエクスポートが利用できます
        </div>
        <button style={{ width: "100%", marginTop: 12, padding: 12, borderRadius: 12, border: "none",
          background: theme.green, color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
          スタンダードプランに申し込む
        </button>
        <div style={{ fontSize: 12, color: theme.muted, textDecoration: "underline", marginTop: 10,
          cursor: "pointer" }}>購入の復元</div>
      </Card>

      <SectionTitle>表示</SectionTitle>
      <Card>
        <div style={{ fontSize: 13, marginBottom: 10 }}>入出金明細のまとめ方</div>
        <div style={{ display: "flex", gap: 8 }}>
          {[["bank", "銀行ごと"], ["date", "日付ごと"]].map(([v, l]) => (
            <button key={v} onClick={() => setGrouping(v)} style={{
              flex: 1, padding: 9, borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer",
              border: `1.5px solid ${grouping === v ? theme.accent : theme.border}`,
              background: grouping === v ? theme.accentSoft : theme.surface,
              color: grouping === v ? theme.accent : theme.muted,
            }}>{l}</button>
          ))}
        </div>
      </Card>

      <SectionTitle>通知</SectionTitle>
      <Card style={{ padding: "6px 16px" }}>
        {[["引き落とし前日(18:00)", true], ["契約満了3ヶ月前", true], ["イベント期日", true],
          ["月初の家賃入金確認", false]].map(([l, on], i, arr) => (
          <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "11px 0", borderBottom: i < arr.length - 1 ? `1px solid ${theme.border}` : "none" }}>
            <div style={{ fontSize: 13 }}>{l}</div>
            <div style={{ width: 42, height: 24, borderRadius: 12, position: "relative",
              background: on ? theme.green : theme.border }}>
              <div style={{ position: "absolute", top: 2, left: on ? 20 : 2, width: 20, height: 20,
                borderRadius: 10, background: "#fff", boxShadow: "0 1px 3px #0003" }} />
            </div>
          </div>
        ))}
      </Card>

      <SectionTitle>データ</SectionTitle>
      <Card style={{ padding: "6px 16px" }}>
        {["口座の管理", "タグの管理", "定期収支ルール", "アーカイブの管理"].map((l, i, arr) => (
          <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0",
            borderBottom: i < arr.length - 1 ? `1px solid ${theme.border}` : "none", fontSize: 13 }}>
            <span style={{ color: theme.text }}>{l}</span>
            <span style={{ color: theme.border }}>›</span>
          </div>
        ))}
      </Card>

      <SectionTitle>データ管理</SectionTitle>
      <Card style={{ padding: "6px 16px" }}>
        {[
          { l: "CSVエクスポート 🔒", d: "全データをCSVで書き出します(バックアップ用)", b: "書出", c: theme.lock },
          { l: "全物件の削除", d: "すべての物件・収支記録・イベントを削除します", b: "削除", c: "#D9534F" },
          { l: "アプリの初期化", d: "全データ・設定を削除して初回インストール直後の状態に戻します", b: "初期化", c: "#D9534F" },
        ].map((r, i, arr) => (
          <div key={r.l} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 0",
            borderBottom: i < arr.length - 1 ? `1px solid ${theme.border}` : "none" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600,
                color: r.l.includes("🔒") ? theme.lock : theme.text }}>{r.l}</div>
              <div style={{ fontSize: 10, color: theme.muted, marginTop: 2 }}>{r.d}</div>
            </div>
            <span style={{ fontSize: 12, fontWeight: 800, color: "#fff", background: r.c,
              borderRadius: 10, padding: "6px 14px", cursor: "pointer" }}>{r.b}</span>
          </div>
        ))}
      </Card>

      <SectionTitle>セキュリティ</SectionTitle>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>PINロック</div>
            <div style={{ fontSize: 10, color: theme.muted, marginTop: 2 }}>4桁の暗証番号でアプリをロックします</div>
          </div>
          <div style={{ width: 42, height: 24, borderRadius: 12, position: "relative", background: theme.border }}>
            <div style={{ position: "absolute", top: 2, left: 2, width: 20, height: 20,
              borderRadius: 10, background: "#fff", boxShadow: "0 1px 3px #0003" }} />
          </div>
        </div>
      </Card>

      <SectionTitle>利用規約</SectionTitle>
      <Card style={{ padding: "6px 16px" }}>
        {["利用規約を見る", "プライバシーポリシーを見る", "特定商取引法に基づく表示を見る"].map((l, i, arr) => (
          <div key={l} style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 0", borderBottom: i < arr.length - 1 ? `1px solid ${theme.border}` : "none" }}>
            <span style={{ fontSize: 13 }}>{l}</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: "#fff", background: theme.green,
              borderRadius: 10, padding: "6px 14px", cursor: "pointer" }}>表示</span>
          </div>
        ))}
      </Card>

      <SectionTitle>注意事項・免責事項</SectionTitle>
      <Card>
        {[
          {
            icon: "📊", title: "経営・投資判断について", color: theme.accent,
            items: [
              "本アプリは賃貸経営に関する情報の記録・可視化を目的としたツールです。",
              "不動産の売買・賃貸条件等を推奨・助言するものではありません。",
              "経営・投資の最終判断はご自身の責任において行ってください。",
            ],
          },
          {
            icon: "💴", title: "入出金の表示について", color: theme.gold,
            items: [
              "表示される入出金は、登録内容にもとづく予定・参考値です。",
              "実際の入出金・残高は、お使いの銀行口座でご確認ください。",
              "引き落とし日・入金日は、金融機関の営業日等により前後する場合があります。",
            ],
          },
          {
            icon: "🏦", title: "ローンの計算について", color: "#5B8DB8",
            items: [
              "残債・利息内訳・返済予定は、入力情報にもとづく概算です。",
              "金利改定・繰上返済・条件変更等は自動では反映されません。",
              "正確な返済予定・残高は、借入先の金融機関でご確認ください。",
            ],
          },
          {
            icon: "📱", title: "データの保存・管理について", color: theme.green,
            items: [
              "入力データはお使いの端末内にのみ保存されます。",
              "アプリ削除・機種変更の際はデータが失われます。",
              "定期的にエクスポート機能でバックアップをお取りください。",
            ],
          },
          {
            icon: "💳", title: "サブスクリプションについて", color: "#9C7BB5",
            items: [
              "スタンダードプランは自動更新のサブスクリプションです。期間終了の24時間前までに解約されない限り、自動的に更新されます。",
              "解約は App Store / Google Play のサブスクリプション設定から行えます。アプリを削除しても解約にはなりません。",
              "解約後も、お支払い済み期間の終了までは機能をご利用いただけます。日割りでの返金はありません。",
              "返金は Apple / Google 各ストアの規定にもとづき、各ストアへお申し込みください。開発者が個別に返金の処理を行うことはできません。",
              "機種変更等の際は、設定内の「購入の復元」で購入状況を引き継げます。",
              "特定商取引法にもとづく表示は、公式サイト(morincum.jp)に掲載しています。",
            ],
          },
          {
            icon: "📝", title: "税務・法律について", color: theme.muted,
            items: [
              "不動産所得の確定申告・税務処理は個人の状況により異なります。",
              "年間サマリー・減価償却費等の表示は参考値であり、申告額を保証するものではありません。",
              "税務・法律に関するご相談は税理士・弁護士等の専門家にご相談ください。",
              "本アプリの利用により生じた損害について、開発者は責任を負いません。",
            ],
          },
        ].map((section, si, arr) => (
          <div key={section.title} style={{ marginBottom: si < arr.length - 1 ? 14 : 0,
            paddingBottom: si < arr.length - 1 ? 14 : 0,
            borderBottom: si < arr.length - 1 ? `1px solid ${theme.border}` : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 13 }}>{section.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: section.color }}>{section.title}</span>
            </div>
            {section.items.map((it, i) => (
              <div key={i} style={{ display: "flex", gap: 6, fontSize: 11, color: theme.muted,
                lineHeight: 1.7, marginBottom: 2 }}>
                <span>・</span><span>{it}</span>
              </div>
            ))}
          </div>
        ))}
        <div style={{ textAlign: "center", marginTop: 18 }}>
          <img
            src="data:image/png;base64,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"
            alt="MORINCUM"
            style={{ width: 240, maxWidth: "100%" }}
          />
          <div style={{ fontSize: 10, color: theme.lock, marginTop: 8 }}>
            © 2026 Morincum All rights reserved.
          </div>
          <div style={{ fontSize: 9, color: theme.border, marginTop: 2 }}>{APP_VERSION}</div>
        </div>
      </Card>

    </div>
  );
}

/* ──────────── App ──────────── */

export default function App() {
  const [tab, setTab] = useState("home");
  const [activeTag, setActiveTag] = useState("all");
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [flowGrouping, setFlowGrouping] = useState("bank");

  // ファミリー共通の型: 中央にホーム、左右に2タブずつ
  const SIDE_TABS_L = [
    { id: "flows",  icon: "💴", label: "入出金" },
    { id: "events", icon: "📋", label: "イベント" },
  ];
  const SIDE_TABS_R = [
    { id: "analysis", icon: "📊", label: "分析" },
    { id: "settings", icon: "⚙️", label: "設定" },
  ];
  const SideTab = (t) => (
    <button key={t.id} onClick={() => { setTab(t.id); setSelectedUnit(null); }} style={{
      flex: 1, border: "none", background: "none", cursor: "pointer",
      color: tab === t.id ? theme.accent : theme.muted }}>
      <div style={{ fontSize: 19 }}>{t.icon}</div>
      <div style={{ fontSize: 10, fontWeight: tab === t.id ? 800 : 400 }}>{t.label}</div>
    </button>
  );

  return (
    <div style={{ display: "flex", justifyContent: "center", background: "#E9E5DE",
      minHeight: "100vh", padding: "16px 0", fontFamily: "'Hiragino Sans', 'Noto Sans JP', sans-serif" }}>
      <div style={{ width: 390, background: theme.bg, borderRadius: 24, overflow: "hidden",
        position: "relative", display: "flex", flexDirection: "column",
        boxShadow: "0 8px 40px #0002", height: 800 }}>

        {/* ヘッダー */}
        <div style={{ padding: "16px 18px 8px", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 15, background: theme.accent,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>🐿️</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: theme.text }}>不動産の森</div>
            <div style={{ fontSize: 9, color: theme.muted, letterSpacing: 0.5 }}>by MORINCUM</div>
          </div>
        </div>

        {/* コンテンツ */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px 90px", color: theme.text }}>
          {selectedUnit
            ? <UnitDetail unit={selectedUnit} onBack={() => setSelectedUnit(null)} />
            : tab === "home"   ? <HomeView activeTag={activeTag} setActiveTag={setActiveTag} openUnit={setSelectedUnit} />
            : tab === "flows"  ? <FlowsView grouping={flowGrouping} />
            : tab === "events" ? <EventsView />
            : tab === "analysis" ? <AnalysisView />
            : <SettingsView grouping={flowGrouping} setGrouping={setFlowGrouping} />}
        </div>

        {/* FAB */}
        {!selectedUnit && tab !== "settings" && (
          <button onClick={() => setShowAdd(true)} style={{ position: "absolute", right: 18, bottom: 84,
            width: 54, height: 54, borderRadius: 27, border: "none", background: theme.accent,
            color: "#fff", fontSize: 26, fontWeight: 300, boxShadow: "0 4px 14px #A8552F55",
            cursor: "pointer", zIndex: 10 }}>＋</button>
        )}

        {/* タブバー(中央ホーム型・ファミリー共通) */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0,
          background: theme.surface, borderTop: `1px solid ${theme.border}`, padding: "8px 0 14px" }}>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            {SIDE_TABS_L.map(SideTab)}
            {/* 中央ホーム */}
            <div style={{ flex: 1.2, display: "flex", flexDirection: "column",
              alignItems: "center", position: "relative" }}>
              <button onClick={() => { setTab("home"); setSelectedUnit(null); }} style={{
                width: 58, height: 58, borderRadius: 29, marginTop: -34,
                border: `2px solid ${tab === "home" ? theme.accent : theme.border}`,
                background: theme.surface, fontSize: 26, cursor: "pointer",
                boxShadow: "0 4px 12px #0002" }}>🏠</button>
              <div style={{ fontSize: 10, marginTop: 2,
                fontWeight: tab === "home" ? 800 : 400,
                color: tab === "home" ? theme.accent : theme.muted }}>ホーム</div>
            </div>
            {SIDE_TABS_R.map(SideTab)}
          </div>
        </div>

        {showAdd && <AddModal onClose={() => setShowAdd(false)} />}
      </div>
    </div>
  );
}
