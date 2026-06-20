// Android(ネイティブ)版だけで動く起動スクリプト。
// Web 版(GitHub Pages)には読み込まれないので、ここに広告などネイティブ機能を書く。
//
// AdMob: ゲームオーバーのタイミングなどで、ときどきインタースティシャル
//        (全画面広告)を出す方式を想定。
//
// ⚠️ 現在は「テスト広告」設定です。Google Play へ本番リリースする前に、
//    AdMob 管理画面で取得した本番 ID に差し替え、TESTING=false にしてください。
//    (本番 ID で自分の広告を何度もタップするとアカウント停止リスクがあります)

import { Capacitor } from '@capacitor/core';
import { AdMob } from '@capacitor-community/admob';

const TESTING = true; // ← 本番リリース時に false へ
const AD_UNITS = {
  // Google 公式のテスト用インタースティシャル ID(本番では自分の ID に置換)
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
};

// 広告の頻度制御
const WARMUP_MS = 60 * 1000;            // 起動後しばらくは広告を出さない
const MIN_INTERVAL_MS = 3 * 60 * 1000;  // 前回表示からの最低間隔
const sessionStart = Date.now();
let lastShown = 0;
let initialized = false;
let showing = false;

async function init() {
  if (!Capacitor.isNativePlatform()) return; // Web では何もしない
  try {
    await AdMob.initialize({ initializeForTesting: TESTING });
    initialized = true;
  } catch (err) {
    console.warn('AdMob init failed', err);
  }
}

async function maybeShowInterstitial() {
  if (!initialized || showing) return;
  const now = Date.now();
  if (now - sessionStart < WARMUP_MS) return;
  if (now - lastShown < MIN_INTERVAL_MS) return;
  showing = true;
  try {
    await AdMob.prepareInterstitial({ adId: AD_UNITS.interstitial, isTesting: TESTING });
    await AdMob.showInterstitial();
    lastShown = Date.now();
  } catch (err) {
    console.warn('interstitial failed', err);
  } finally {
    showing = false;
  }
}

// ゲーム本体(main.js)から安全に呼べるよう公開する。
// Web 版では未定義なので、呼び出し側は window.MergeWarAds?.maybeShowInterstitial?.() とする。
window.MergeWarAds = { maybeShowInterstitial };

init();
