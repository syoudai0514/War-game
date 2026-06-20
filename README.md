# ⚔️ マージ大戦 - MERGE WAR

同じユニットを**ドラッグして合体**させ、どんどん強い兵種へ進化。押し寄せる敵を迎え撃つ、**マージ × タワーディフェンス**ゲーム。

「Top War(トップウォー)」の一番おもしろい核 ―― *合体してユニットを育てる中毒性* ―― を、サクサク遊べる一画面ディフェンスに凝縮しました。

🎮 **Web で今すぐ遊ぶ:** https://syoudai0514.github.io/War-game/

---

## 遊びかた

1. **⚔️生産** ボタンでユニット(🔫ライフル兵)を盤面に出す
2. **同じユニットをドラッグで重ねる** と合体して上位兵種に**進化!**
   🔫→🪖→💣→🚙→🛡️→🚀→🦾→✈️→🛸→☄️(全10ティア)
3. 盤上のユニットは、攻めてくる敵を**自動で迎撃**。強いほど高火力・速射
4. 敵を倒すとゴールド。ベースの耐久がゼロになる前に**ウェーブを生き延びろ**
5. **5の倍数ウェーブはボス戦** 👹

ベスト記録は端末に自動保存されます。

---

## 技術構成

- **ビルド不要の素の Web アプリ**(HTML5 Canvas + ES Modules / 依存ライブラリゼロ)
- GitHub Pages はリポジトリ直下をそのまま配信
- Android パッケージは Capacitor でラップ(`moshimo-space-lab` と同じパイプライン)

```
index.html          … エントリ(HUD オーバーレイ・スタートゲート)
css/style.css       … モバイル縦持ち UI
js/
  config.js         … 兵種・敵・経済のチューニング値
  audio.js          … WebAudio 効果音(音声ファイル不要)
  storage.js        … ベスト記録のセーブ
  game.js           … ゲーム本体(状態・マージ・戦闘・ウェーブ)
  render.js         … Canvas 描画
  main.js           … 起動・ループ・入力・HUD 連携
src/native/main.js  … Android 版のみの起動スクリプト(AdMob)
scripts/build-web.mjs … www/ を組み立てる Capacitor 用ビルド
```

---

## Google Play へのリリース手順

詳細は [`RELEASE.md`](./RELEASE.md) を参照。概要:

```bash
npm install
npm run build:web          # www/ を生成
npx cap add android        # 初回のみ Android プロジェクト生成
npm run sync               # www/ を Android へ同期
npm run open:android       # Android Studio で開いて AAB をビルド
```

> ⚠️ 広告は初期状態で **テスト ID** です。本番前に `src/native/main.js` の
> `TESTING = false` と本番 AdMob ID への差し替えを忘れずに。

---

## 開発ロードマップ(これから面白くする案)

- [ ] ユニットの特殊効果(範囲攻撃・スロー・貫通など兵種ごとの個性)
- [ ] ゴールドで強化できる永続アップグレード(初期資金・ベース耐久・収入)
- [ ] スキル(全体攻撃の必殺技・時間停止)
- [ ] BGM とサウンドの拡充
- [ ] デイリーミッション / 実績 / リーダーボード
- [ ] ガチャ風の新兵種解放演出
