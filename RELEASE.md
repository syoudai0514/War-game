# Google Play リリース手順 — マージ大戦

このゲームは「ビルド不要の Web アプリ」を Capacitor で Android アプリ(AAB)に
包んで Google Play に出す構成です。`moshimo-space-lab` と同じやり方です。

## 1. Android プロジェクトを作る(初回のみ)

```bash
npm install
npm run build:web          # www/ を生成
npx cap add android        # android/ プロジェクトを生成
npm run sync               # www/ を android/ に同期
```

`android/` は `.gitignore` の対象ではないので、生成後はコミットして構いません
(ビルド成果物だけ無視されます)。

## 2. アイコン / スプラッシュを作る

`resources/icon.png`(1024×1024)と `resources/splash.png` を用意して:

```bash
npm run assets
```

## 3. 署名鍵(keystore)を作る(初回のみ)

```bash
keytool -genkey -v -keystore release.jks -keyalg RSA -keysize 2048 \
  -validity 10000 -alias mergewar
```

> `release.jks` と各パスワードは**絶対に紛失しない**こと(更新に必須)。
> リポジトリにはコミットしない(`.gitignore` 済み)。

## 4. 広告を本番設定に切り替える

`src/native/main.js`:
- `TESTING = false`
- `AD_UNITS.interstitial` を AdMob 管理画面の**本番**ユニット ID に
- `android/app/src/main/AndroidManifest.xml` の
  `com.google.android.gms.ads.APPLICATION_ID` を本番アプリ ID に

## 5. リリース AAB をビルド

```bash
npm run sync
npm run open:android       # Android Studio → Build → Generate Signed Bundle (AAB)
```

または CI(GitHub Actions)に keystore を Secrets 登録して `bundleRelease` を実行。

## 6. Play Console で公開

- 新しいアプリを作成(アプリ名「マージ大戦」)
- AAB をアップロード
- ストア掲載情報(説明・スクショ・フィーチャーグラフィック)
- **プライバシーポリシー URL**: `https://syoudai0514.github.io/War-game/privacy.html`
- データセーフティ(広告 ID の利用を申告)
- 内部テスト → 製品版へ

## バージョンの上げ方

`android/app/build.gradle` の `versionCode`(整数、毎回 +1)と
`versionName`(表示用、例 "1.0.1")を更新してから再ビルド。
