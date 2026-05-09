# Google AdMob 設定手順

Morincumアプリの広告（AdMob バナー広告）を設定する手順書です。  
無料ユーザーにはフッターにバナー広告が表示されます。有料ユーザー（Standard プラン）には表示されません。

---

## AdMob の概要（Morincum での使われ方）

```
無料ユーザー（is_premium = false）
  → フッターに ANCHORED_ADAPTIVE_BANNER を表示
  → iOS: ATT許可ダイアログ表示後に初期化
  → 拒否時は非パーソナライズ広告

有料ユーザー（is_premium = true）
  → BannerAdView は何もレンダリングしない（非表示）

Expo Go で実行時
  → ネイティブモジュール未搭載のためスキップ（クラッシュ防止）
```

### 関連ファイル

| ファイル | 役割 |
|---|---|
| `src/components/BannerAdView.tsx` | バナー広告コンポーネント |
| `src/constants/config.ts` | 広告ユニットIDの環境変数読み込み |
| `app.json` → `expo.plugins` | AdMob App ID の設定（ビルド時に組み込まれる） |
| `App.tsx` | AdMob 初期化・ATT許可ダイアログ |

### 既に設定済みの AdMob App ID

`app.json` に App ID が設定済みです（変更不要）:

| プラットフォーム | App ID |
|---|---|
| iOS | `ca-app-pub-1138492862020062~7412244904` |
| Android | `ca-app-pub-1138492862020062~8725326578` |

> ⚠️ これらは **アプリを識別するID** です。広告ユニット ID とは別物です。  
> App ID はアプリごとに1つ。広告ユニット ID は広告面（バナー・インタースティシャル等）ごとに1つ。

---

## 前提条件

- [ ] Google アカウント（AdMob アカウント作成済み）
- [ ] [Google AdMob](https://admob.google.com) にアクセス可能
- [ ] EAS CLI インストール済み（`npm install -g eas-cli`）

---

## 目次

1. [AdMob アカウント確認・アプリ確認](#1-admob-アカウント確認アプリ確認)
2. [バナー広告ユニットの作成](#2-バナー広告ユニットの作成)
3. [EAS シークレットへの登録](#3-eas-シークレットへの登録)
4. [iOS ATT（App Tracking Transparency）対応](#4-ios-attapp-tracking-transparency対応)
5. [テスト広告の確認](#5-テスト広告の確認)
6. [AdMob ポリシー対応チェックリスト](#6-admob-ポリシー対応チェックリスト)

---

## 1. AdMob アカウント確認・アプリ確認

### 1-1. AdMob ログイン

[Google AdMob](https://admob.google.com) にログインします。

### 1-2. アプリの確認

アプリが登録済みかを確認します。

1. AdMob コンソール → 「アプリ」
2. `配当の森 by MORINCUM` が iOS / Android それぞれ表示されていることを確認

**まだ登録されていない場合:**

**iOS の登録:**
1. 「アプリを追加」→ プラットフォーム: iOS
2. 「App Store に公開されていますか？」→ **「いいえ」**（申請前のため）
3. アプリ名: `配当の森 by MORINCUM`
4. 登録完了後、**App ID** を確認:
   - `ca-app-pub-1138492862020062~7412244904` であることを確認

**Android の登録:**
1. 「アプリを追加」→ プラットフォーム: Android
2. アプリ名: `配当の森 by MORINCUM`
3. 登録完了後、**App ID** を確認:
   - `ca-app-pub-1138492862020062~8725326578` であることを確認

> App ID が異なる場合は `app.json` の `expo.plugins` を更新する必要があります。

---

## 2. バナー広告ユニットの作成

アプリ内のバナー広告スペースに対応する「広告ユニット」を作成します。  
Morincum ではフッターに1つのバナーのみ使用します。

### 2-1. iOS バナー広告ユニット

1. AdMob → 「アプリ」→ iOS版「配当の森 by MORINCUM」を選択
2. 「広告ユニット」→ 「広告ユニットを作成」
3. 広告フォーマット: **「バナー」** を選択
4. 設定:

| 項目 | 値 |
|---|---|
| 広告ユニット名 | `morincum-banner-footer-ios` |

5. 「作成」→ **広告ユニット ID** を控える:
   ```
   ca-app-pub-1138492862020062/XXXXXXXXXX  ← これが EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_IOS
   ```

### 2-2. Android バナー広告ユニット

1. AdMob → 「アプリ」→ Android版「配当の森 by MORINCUM」を選択
2. 「広告ユニット」→ 「広告ユニットを作成」
3. 広告フォーマット: **「バナー」** を選択
4. 設定:

| 項目 | 値 |
|---|---|
| 広告ユニット名 | `morincum-banner-footer-android` |

5. 「作成」→ **広告ユニット ID** を控える:
   ```
   ca-app-pub-1138492862020062/YYYYYYYYYY  ← これが EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_ANDROID
   ```

> 💡 広告ユニット ID は `ca-app-pub-<publisher_id>/<unit_id>` の形式です。  
> App ID の `~`（チルダ）と違い、広告ユニット ID は `/`（スラッシュ）区切りです。

---

## 3. EAS シークレットへの登録

バナー広告ユニット ID を本番ビルド用の EAS シークレットに登録します。

```bash
cd morincum

# iOS バナー広告ユニット ID
eas secret:create --scope project \
  --name EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_IOS \
  --value "ca-app-pub-1138492862020062/XXXXXXXXXX" \
  --profile production

# Android バナー広告ユニット ID
eas secret:create --scope project \
  --name EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_ANDROID \
  --value "ca-app-pub-1138492862020062/YYYYYYYYYY" \
  --profile production
```

### 登録確認

```bash
eas secret:list
# EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_IOS      production  project
# EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_ANDROID  production  project
```

### 環境変数の対応表

| EAS シークレット名 | 参照する定数 | 利用箇所 |
|---|---|---|
| `EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_IOS` | `ADMOB_BANNER_UNIT_ID_IOS` | `BannerAdView.tsx` |
| `EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_ANDROID` | `ADMOB_BANNER_UNIT_ID_ANDROID` | `BannerAdView.tsx` |

> 開発ビルド（`__DEV__ === true`）では設定値に関わらず **自動的にテスト広告 ID** が使われます。  
> 本番ビルド（`__DEV__ === false`）になって初めてこれらの値が参照されます。

---

## 4. iOS ATT（App Tracking Transparency）対応

iOS 14.5 以降、パーソナライズ広告を配信するにはユーザーの追跡許可が必要です。

### アプリでの実装（実装済み）

`App.tsx` で AdMob 初期化前に ATT ダイアログを表示しています:

```typescript
if (!IS_EXPO_GO) {
  if (Platform.OS === 'ios') {
    await requestTrackingPermissionsAsync();  // ATT ダイアログ表示
  }
  await mobileAds().initialize();  // 許可・拒否いずれでも初期化
}
```

- **許可した場合**: パーソナライズ広告を配信
- **拒否した場合**: 非パーソナライズ広告を配信（`requestNonPersonalizedAdsOnly: false` の設定のため、拒否でも広告は表示される）

### app.json の NSUserTrackingUsageDescription（確認）

`app.json` に ATT の説明文が設定されていることを確認します:

```bash
cat morincum/app.json | python3 -c "import sys,json; d=json.load(sys.stdin); \
  print(d.get('expo',{}).get('ios',{}).get('infoPlist',{}).get('NSUserTrackingUsageDescription','未設定'))"
```

未設定の場合は `app.json` に追加:

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSUserTrackingUsageDescription": "広告のパーソナライズのためにトラッキングの許可をお願いします。拒否した場合も広告は表示されますが、パーソナライズされません。"
      }
    }
  }
}
```

---

## 5. テスト広告の確認

### 開発時のテスト広告

開発ビルド（`__DEV__ === true`）では自動的にテスト広告 ID が使われます:

```typescript
// BannerAdView.tsx
const adUnitId = __DEV__
  ? TestIds.BANNER          // テスト広告（開発時）
  : Platform.OS === 'android'
  ? ADMOB_BANNER_UNIT_ID_ANDROID  // 本番（Android）
  : ADMOB_BANNER_UNIT_ID_IOS;     // 本番（iOS）
```

テスト広告 ID（`TestIds.BANNER`）を使うと AdMob から `Test` と表示されたモックバナーが表示されます。

### ビルド前の最終確認

```bash
# eas.json の production プロファイルを確認
cat morincum/eas.json

# シークレットが正しく登録されているか確認
cd morincum && eas secret:list
```

---

## 6. AdMob ポリシー対応チェックリスト

App Store / Google Play の審査を通過するために必要なポリシー対応です。

### Google AdMob ポリシー

- [ ] **プライバシーポリシー** に AdMob / Google による広告配信について記載した
  - 例: 「本アプリは Google AdMob を使用して広告を配信しています。Google のプライバシーポリシーに従い、行動ターゲティング広告が表示される場合があります。」
- [ ] **子どもを対象としたコンテンツ** に設定していない（COPPA 対応）
  - AdMob コンソール → アプリの設定 → 「このアプリは子ども向けですか？」→ **「いいえ」**

### Apple App Store ポリシー（iOS）

- [ ] ATT 説明文（`NSUserTrackingUsageDescription`）が app.json に設定済み
- [ ] App Store Connect の「App プライバシー」→ 「データの種類」で以下を申告:
  - 「広告データ」→「収集あり」→「トラッキングに使用」
- [ ] プライバシーポリシー URL が App Store Connect に設定済み

### Google Play ポリシー（Android）

- [ ] Play Console の「データセーフティ」で広告関連のデータ収集を申告:
  - 「広告またはマーケティング」→「収集あり」
- [ ] プライバシーポリシー URL が Play Console に設定済み

---

## チェックリスト

- [ ] AdMob コンソールで iOS / Android アプリを確認した
- [ ] iOS バナー広告ユニット（`morincum-banner-footer-ios`）を作成し、ユニット ID を控えた
- [ ] Android バナー広告ユニット（`morincum-banner-footer-android`）を作成し、ユニット ID を控えた
- [ ] `EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_IOS` を EAS シークレットに登録した
- [ ] `EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_ANDROID` を EAS シークレットに登録した
- [ ] `NSUserTrackingUsageDescription` が app.json に設定されている
- [ ] プライバシーポリシーに AdMob について記載した
- [ ] AdMob の「子ども向けアプリ」設定が「いいえ」になっている
- [ ] App Store / Google Play のデータ収集申告に広告データを記載した

---

## 参考情報

| 項目 | 値 |
|---|---|
| AdMob パブリッシャー ID | `ca-app-pub-1138492862020062` |
| iOS App ID（app.json 設定済み） | `ca-app-pub-1138492862020062~7412244904` |
| Android App ID（app.json 設定済み） | `ca-app-pub-1138492862020062~8725326578` |
| バナーサイズ | `ANCHORED_ADAPTIVE_BANNER`（画面幅に合わせて自動調整） |
| 表示条件 | `is_premium === false` かつ Expo Go 以外 |

---

## 関連ドキュメント

- [本番環境構築ガイド](./prod-setup-guide.md) — Step 8, 10
- [RevenueCat 設定手順](./billing-setup-revenuecat.md) — is_premium の更新フロー
- [課金フロー設計](../020.system/billing-flow.md) — 無料/有料プランの差異
