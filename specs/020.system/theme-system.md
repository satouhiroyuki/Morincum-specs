# テーマシステム仕様（フロントエンド）

> 対象リポジトリ: Morincum（フロントエンド）  
> 関連ファイル: `src/constants/ThemeContext.tsx`, `src/constants/theme.ts`

---

## 1. 概要

口座ごとにカラーテーマ（グリーン / ブルー / パープル / レッド）を選択できる。
テーマカラーはアプリ全体のアクセントカラーに反映される。

### テーマ一覧

| キー | 表示名 | accent | accentSoft |
|------|--------|--------|------------|
| `green` | グリーン（デフォルト） | `#5BAD60` | `#5BAD6020` |
| `blue` | ブルー | `#4A90D9` | `#4A90D920` |
| `purple` | パープル | `#9B7FD4` | `#9B7FD420` |
| `red` | レッド | `#E05C7A` | `#E05C7A20` |

テーマカラーが変わっても **変化しないトークン**（`gold`, `goldSoft`, `nisa1`, `nisa2`, `usd`, `red`）はすべてのテーマで固定値を保つ。

---

## 2. アーキテクチャ

### 2-1. ThemeContext の構成

```
AppThemeProvider（App.tsx のルートに配置）
  └── useAppTheme() フック
        └── 各コンポーネントで thm.accent, thm.text, ... を取得
```

- `AppThemeProvider` は `account.theme`（`'green' | 'blue' | 'purple' | 'red'`）を受け取り、対応するパレットをコンテキストに提供する
- `useAppTheme()` はコンテキストから現在のパレットを返す

### 2-2. テーマパレット構造

各テーマは以下のトークンを持つ：

| トークン | 意味 | テーマ依存 |
|---------|------|----------|
| `accent` | メインカラー | ✅ |
| `accentSoft` | アクセント薄色（背景・ハイライト） | ✅ |
| `text` | メインテキスト色 | ✅（緑系でトーンを合わせる） |
| `muted` | サブテキスト・ラベル色 | ✅ |
| `border` | ボーダー色 | ✅ |
| `bg` | 背景色 | ✅ |
| `card` | カード背景 | 固定 `#FFFFFF` |
| `surface` | ヘッダー・モーダル背景 | 固定 `#FFFFFF` |
| `gold` / `goldSoft` | 目標・達成率 | 固定 |
| `nisa1` / `nisa2` | NISA枠色 | 固定 |
| `usd` | USD表示色 | 固定 |
| `red` | エラー・警告 | 固定 |

---

## 3. ファクトリパターン（コンポーネント実装ルール）

### 問題：StyleSheet.create() は静的

React Native の `StyleSheet.create()` はモジュール読み込み時に一度だけ評価される。  
そのため `color: theme.accent` のように記述しても、テーマが切り替わっても**再評価されない**。

```tsx
// NG: StyleSheet の値は静的なまま変わらない
const styles = StyleSheet.create({
  title: { color: theme.text },  // ← 常にグリーンテーマの値
});
```

### 解決策：共通 themed 変数 + インラインオーバーライド

コンポーネント関数の先頭で `useAppTheme()` を呼び出し、**共通の themed 変数**を定義する。  
スタイルが動的カラーを必要とする箇所にのみインラインでオーバーライドする。

```tsx
function MyComponent() {
  const thm = useAppTheme();

  // ─ テーマ依存の共通スタイル ──────────────────────────────
  // StyleSheet.create() は静的なため、動的テーマ値は変数にまとめてインラインで適用する
  const themedCard    = [styles.card, { borderColor: thm.border }];
  const themedText    = { color: thm.text };
  const themedMuted   = { color: thm.muted };
  const themedAccent  = { color: thm.accent };
  const themedBorder  = { borderColor: thm.border };
  const themedBg      = { backgroundColor: thm.bg };
  const themedAccentSoftBg = { backgroundColor: thm.accentSoft };
  const themedBorderBg     = { backgroundColor: thm.border };

  return (
    <View style={themedCard}>
      <Text style={[styles.title, themedText]}>タイトル</Text>
      <Text style={[styles.sub, themedMuted]}>サブテキスト</Text>
    </View>
  );
}

// StyleSheet には色以外のレイアウト定義のみ残す
const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    // borderColor は themed 変数でインライン指定するため省略可
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    // color はインラインで上書きするため定義しても無効
  },
});
```

### 変数の命名規則

| 変数名 | 内容 |
|--------|------|
| `themedCard` | カード枠線（`borderColor: thm.border`） |
| `themedText` | メインテキスト色（`color: thm.text`） |
| `themedMuted` | サブテキスト色（`color: thm.muted`） |
| `themedAccent` | アクセント色（`color: thm.accent`） |
| `themedBorder` | ボーダー色（`borderColor: thm.border`） |
| `themedBg` | 背景色（`backgroundColor: thm.bg`） |
| `themedAccentSoftBg` | アクセント薄背景（`backgroundColor: thm.accentSoft`） |
| `themedBorderBg` | ボーダー色背景（区切り線など）（`backgroundColor: thm.border`） |

---

## 4. プロバイダー外での useAppTheme() に関する注意

### 問題：App.tsx のルートコンポーネントでは使えない

`App()` 関数の return 内で `AppThemeProvider` を配置しているため、`App()` 自身は  
プロバイダーの**外側**にいる。そのため `useAppTheme()` を `App()` で呼ぶと常にデフォルト値（グリーン）が返る。

```tsx
// NG: App() の本体は AppThemeProvider の外なので常にグリーン
function App() {
  const thm = useAppTheme(); // ← 常にデフォルト値
  return (
    <AppThemeProvider theme={account.theme}>
      ...
    </AppThemeProvider>
  );
}
```

### 解決策：子コンポーネントに切り出す

`AppThemeProvider` の**内側**でレンダリングされる子コンポーネントとして切り出す。

```tsx
// OK: ThemedHomeScrollView は AppThemeProvider の内側でレンダリングされる
function ThemedHomeScrollView({ children, ...props }) {
  const thm = useAppTheme(); // ← 正しいテーマ値が取れる
  return (
    <ScrollView style={{ backgroundColor: thm.bg }} ...>
      {children}
    </ScrollView>
  );
}

function App() {
  return (
    <AppThemeProvider theme={account.theme}>
      <ThemedHomeScrollView ...>
        {/* ホームタブのコンテンツ */}
      </ThemedHomeScrollView>
    </AppThemeProvider>
  );
}
```

---

## 5. 口座ごとのテーマカラー取得（ファクトリ関数）

口座の `theme` キーからカラー値を取得するファクトリ関数が `theme.ts` に存在する。

```tsx
// メインカラーを取得
const color = getAccountThemeColor(account.theme ?? 'green');
// ソフトカラー（薄色背景）を取得
const softColor = getAccountThemeSoftColor(account.theme ?? 'green');
```

- `account.theme` が未設定（`undefined`）の場合は `'green'` をデフォルトとして使う
- これらの関数は静的な文字列→色のマッピングなので、`StyleSheet.create()` 内でも使用可能

---

## 6. 新規コンポーネント作成時のチェックリスト

新しい画面・カードコンポーネントを作る際は以下を必ず守ること：

- [ ] `const thm = useAppTheme()` を関数先頭で呼ぶ
- [ ] `themedCard`, `themedText`, `themedMuted`, `themedAccent` などの共通変数を定義する
- [ ] JSX 内で `style={styles.X}` を使う場合、色を持つスタイルには `style={[styles.X, themedText]}` のようにインラインで追加する
- [ ] `StyleSheet.create()` に `color: theme.text` などと書かない（書いても無効）
- [ ] `gold`, `nisa1`, `nisa2`, `red`, `usd` トークンはテーマに関係なく固定なので inline 指定不要
- [ ] `placeholderTextColor` なども `theme.muted` ではなく `thm.muted` を使う

---

## 7. テーマが影響するUI要素・影響しないUI要素

### 影響する（テーマカラーに追従すべき）

- ホーム画面の年間配当金額テキスト
- プログレスバーの塗り色
- プライマリボタンの背景
- アクティブタブのインジケーター
- FABボタン
- カード・入力欄のボーダー色
- ヘッダーのアバター枠・為替タグ
- トグルスイッチのアクティブ状態背景
- セクションタイトル・ラベル・説明文などすべてのテキスト

### 影響しない（常に固定値）

| トークン | 理由 |
|---------|------|
| `gold` | 目標・達成率専用色（意味論的固定） |
| `nisa1` / `nisa2` | NISA枠種別の識別色（固定） |
| `red` | エラー・警告（固定） |
| `card` / `surface` | 常に白（`#FFFFFF`） |
