#!/usr/bin/env node
// "Vasat öğrenci" testi: soruları, her konuda ORTA ya da zayıf bir öğrencinin yapacağı gibi (bilmeden, ipucu ya da yüzeysel okumayla) çözer.
//   node scripts/vasat-ogrenci.mjs [--ayrinti]
// Amaç iki şeyi yakalamaktır:
//   1) CEVAP SIZINTISI: soruyu/metni anlamadan, yalnız seçeneklerin biçimine bakarak (en uzun, en çok ortak sözcük…) bulunabilen sorular.
//      Böyle bir soru öğrenciyi değil "test çözme alışkanlığını" ölçer ve seviye/yoklama sonucunu şişirir.
//   2) YÜZEYSEL OKUYUCU: anahtar sözcüğü arayıp yanındakini seçen öğrenci anlama sorusunu geçiyor mu? (düşük seviyede kabul edilebilir,
//      yüksek seviyede kabul edilemez: orada çıkarım gerekir.)
//   3) HAKLI KARIŞIKLIK: bilgili ama dikkatli bir öğrencinin de "doğru" sayabileceği seçenekler (eş anlamlı çeldirici, çok anlamlı sözcük).
//   4) OLUMSUZ KÖK / UZUN SORU: orta öğrencinin yanlış okuyacağı soru kalıpları.
// Salt okunur; yalnız rapor yazar. Beklenti "hepsi şans düzeyinde": bir ipucu şansın belirgin üstündeyse sorun vardır.
import { icerikDogrula } from './dogrula.mjs';
import { derle } from '../js/derle.js';
import { ctxOlustur } from '../tests/unit/yardimci.mjs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const KOK = join(dirname(fileURLToPath(import.meta.url)), '..');
const AYRINTI = process.argv.includes('--ayrinti');

// ---------- yardımcılar ----------
const kucuk = (s) => String(s ?? '').toLocaleLowerCase('tr').replace(/\*\*/g, '');
const DURAK = new Set('lütfen ve bir bu şu o için ile de da mi mı mu mü ne hangi hangisi gibi en çok daha ama ancak yani her olan olarak göre kadar nasıl neden niçin kim kaç nerede nereye ise ki the a an is are am to of in on at and or'.split(' '));
/** Sözcük gövdesi ≈ ilk 6 harf (Türkçe ekleri kabaca atar); sayılar olduğu gibi. */
const govde = (w) => (/^\d+$/.test(w) ? w : w.slice(0, 6));
export const parcala = (s) => kucuk(s).split(/[^\p{L}\p{N}]+/u).filter((w) => w && (w.length > 1 || /\d/.test(w)) && !DURAK.has(w));
const kume = (s) => new Set(parcala(s).map(govde));
const altKume = (a, b) => a.size > 0 && [...a].every((x) => b.has(x)) || b.size > 0 && [...b].every((x) => a.has(x));
const ortak = (a, b) => { let n = 0; for (const x of a) if (b.has(x)) n++; return n; };
/** Sayısal puanlara göre en yükseğin payı (beraberlikte pay bölüşülür; hepsi 0 ise ipucu yok → şans payı). */
function secim(puanlar, dogru) {
  const en = Math.max(...puanlar);
  const aday = puanlar.map((p, i) => (p === en ? i : -1)).filter((i) => i >= 0);
  return aday.includes(dogru) ? 1 / aday.length : 0;
}

const SAYI = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100 };

const { ic, idx } = icerikDogrula(join(KOK, 'icerik'));
const kelimeler = ic.kelimeler;
const enTr = new Map(); // en sözcüğü → Türkçe gövde kümesi (sözlük bilen öğrenci)
for (const k of kelimeler) for (const w of parcala(k.en)) { const s = enTr.get(w) || new Set(); for (const t of kume(k.tr)) s.add(t); enTr.set(w, s); }

// ---------- 1) Anlama soruları (okuma, dinleme, sahne): ham içerikten ----------
const kaynaklar = [];
for (const d of ic.dersler) {
  const sv = d.sv ?? +(d.id.match(/sv(\d+)/)?.[1] ?? 0);
  for (const a of d.adimlar) {
    if (a.tur === 'oku') kaynaklar.push({ tur: 'okuma', ders: d.id, sv, metin: [].concat(a.metin).join(' '), sorular: a.sorular || [] });
    else if (a.tur === 'dinle') kaynaklar.push({ tur: 'dinleme', ders: d.id, sv, metin: a.ses?.metin || '', ek: [].concat(a.metin || []).join(' '), sorular: a.sorular || [] });
    else if (a.tur === 'sahne') kaynaklar.push({ tur: 'sahne', ders: d.id, sv, metin: (a.satirlar || []).map((s) => `${s.en} ${s.tr}`).join(' '), sorular: a.sorular || [] });
  }
}
const cumleler = (m) => String(m).split(/(?<=[.!?])\s+/).filter(Boolean);

function sozlukKume(metinEn) {
  const s = new Set();
  for (const w of parcala(metinEn)) {
    if (w in SAYI) s.add(String(SAYI[w]));
    for (const t of enTr.get(w) || []) s.add(t);
  }
  return s;
}

function degerlendirAnlama(src, q) {
  const sec = q.secenekler.map(String); const dogru = 0; // ham içerikte doğru yanıt her zaman ilk seçenek
  const secK = sec.map(kume), soruK = kume(q.soru);
  const diger = (i) => { const o = new Set(); secK.forEach((k, j) => { if (j !== i) k.forEach((x) => o.add(x)); }); return o; };
  const sonuc = {
    sans: 1 / sec.length,
    uzun: secim(sec.map((s) => s.length), dogru),
    kisa: secim(sec.map((s) => -s.length), dogru),
    ortakSecenek: secim(secK.map((k, i) => ortak(k, diger(i))), dogru),
    soruyaBenzer: secim(secK.map((k) => ortak(k, soruK)), dogru),
  };
  // yüzeysel okuyucu: metindeki sözcüklerle çakışma (dinlemede metin İngilizce → sözlük bilen öğrenci)
  const metinK = src.tur === 'dinleme' ? sozlukKume(`${src.metin}`) : kume(src.metin);
  sonuc.metniTara = secim(secK.map((k) => ortak(k, metinK)), dogru);
  // anahtar sözcük okuyucu: soruya en çok benzeyen cümleyi bul, yanıtı o cümlede ara
  const cs = src.tur === 'dinleme' ? cumleler(src.metin) : cumleler(src.metin);
  let en = -1, ec = '';
  for (const c of cs) { const p = src.tur === 'dinleme' ? ortak(soruK, sozlukKume(c)) : ortak(soruK, kume(c)); if (p > en) { en = p; ec = c; } }
  const cK = src.tur === 'dinleme' ? sozlukKume(ec) : kume(ec);
  sonuc.anahtarOkuyucu = secim(secK.map((k) => ortak(k, cK)), dogru);
  sonuc.tumIpuclar = [sonuc.uzun, sonuc.kisa, sonuc.ortakSecenek, sonuc.soruyaBenzer].filter((p) => p === 1).length;
  return sonuc;
}

const ANLAMA = [];
for (const s of kaynaklar) for (const q of s.sorular) ANLAMA.push({ src: s, q, r: degerlendirAnlama(s, q) });

// ---------- 2) Kelime soruları (derlenmiş sayfalardan, birkaç farklı deneme) ----------
const KEL = [];
for (let deneme = 0; deneme < 4; deneme++) {
  for (const d of ic.dersler) {
    for (const s of derle(d, ctxOlustur(ic, idx, deneme)).sayfalar) {
      if (s.t !== 'mcq' || !s.maddeId?.startsWith('k:')) continue;
      KEL.push({ ders: d.id, deneme, s, tip: s.id.split(':')[0] });
    }
  }
}
const kelimeById = new Map(kelimeler.map((k) => [k.id, k]));
const kelimeByEn = new Map(); for (const k of kelimeler) (kelimeByEn.get(kucuk(k.en)) || kelimeByEn.set(kucuk(k.en), []).get(kucuk(k.en))).push(k);

function degerlendirKelime(o) {
  const sec = o.s.secenekler.map((x) => String(x.m)); const dogru = o.s.dogru;
  const secK = sec.map(kume);
  const diger = (i) => { const r = new Set(); secK.forEach((k, j) => { if (j !== i) k.forEach((x) => r.add(x)); }); return r; };
  const soruK = kume(o.s.soru);
  return {
    sans: 1 / sec.length,
    uzun: secim(sec.map((s) => s.length), dogru),
    kisa: secim(sec.map((s) => -s.length), dogru),
    ortakSecenek: secim(secK.map((k, i) => ortak(k, diger(i))), dogru),
    soruyaBenzer: secim(secK.map((k) => ortak(k, soruK)), dogru),
    ilk: secim(sec.map((_, i) => -i), dogru), son: secim(sec.map((_, i) => i), dogru),
    // soru ekranında resim/emoji varsa kelimeyi bilmeyen öğrenci resmi okuyup Türkçesini bulabilir
    resimIpucu: o.s.emoji && (o.tip === 'anlam-sec') ? 1 : 0,
  };
}
for (const o of KEL) o.r = degerlendirKelime(o);

/** Haklı karışıklık: doğru sayılabilecek çeldirici (çift doğru). */
function haklıKarisiklik(o) {
  const w = kelimeById.get(o.s.maddeId.slice(2)); if (!w) return [];
  const dogruTr = kume(w.tr); const sorunlar = [];
  o.s.secenekler.forEach((x, i) => {
    if (i === o.s.dogru) return;
    const m = String(x.m);
    if (o.tip === 'kelime-sec') { // Türkçe verilir, İngilizce seçilir: çeldirici sözcüğün Türkçesi doğruyla çakışıyorsa
      for (const k2 of kelimeByEn.get(kucuk(m)) || []) { if (k2.id !== w.id && altKume(kume(k2.tr), dogruTr)) sorunlar.push(`“${m}” (${k2.tr}) de “${w.tr}” anlamına gelebilir`); }
    } else { // İngilizce verilir/duyulur, Türkçe seçilir: çeldirici, doğru sözcüğün başka bir anlamıysa
      const dK = kume(m);
      if (altKume(dK, dogruTr)) sorunlar.push(`“${m}” ile “${w.tr}” aynı anlamı taşıyor`);
      for (const k2 of kelimeByEn.get(kucuk(w.en)) || []) if (k2.id !== w.id && altKume(kume(k2.tr), dK)) sorunlar.push(`“${w.en}” sözcüğü “${k2.tr}” anlamına da gelir (çeldirici “${m}”)`);
    }
  });
  return sorunlar;
}

// ---------- 3) Soru biçimi: olumsuz kök, uzun soru ----------
const SORU_TUM = [];
for (const o of ANLAMA) SORU_TUM.push({ yer: `${o.src.ders}`, soru: o.q.soru });
for (const d of ic.dersler) for (const a of d.adimlar) if (a.tur === 'soru') SORU_TUM.push({ yer: d.id, soru: a.soru });
const OLUMSUZ = /(değildir|değil mi|hangisi değil|hangisinde değil|yanlıştır|yanlış olan|söylenmez|yoktur|olmaz|doğru değil|hangisi yok|hangisi söylenmedi|söylenmiyor)\b/i;
const olumsuz = SORU_TUM.filter((x) => OLUMSUZ.test(x.soru));
const uzunSoru = SORU_TUM.filter((x) => parcala(x.soru).length > 18);

// ---------- Rapor ----------
const ort = (a) => a.reduce((t, x) => t + x, 0) / Math.max(1, a.length);
const yuz = (x) => `%${Math.round(x * 100)}`;
function z(gozlem, sans, n) { return n ? (gozlem - sans) / Math.sqrt(sans * (1 - sans) / n) : 0; }
/** bilgi=true: sözcük-arama okuyucuları (metni tara, anahtar sözcük) için ⚠ konmaz, “bilgi” diye etiketlenir. Üç yerde: dinleme (kayıt dinlenmeden çözülemez → arama sızıntı değil sözcük bilgisi ölçer); seviye <30 okuma (4–6 cümlelik düz anlatımda ilgili cümleyi bulmak okumanın kendisidir); karma satırlar (üst seviye satırı belirleyicidir). */
function tablo(ad, liste, ipuclar, bilgi = false) {
  const n = liste.length; if (!n) return [];
  const sans = ort(liste.map((o) => o.r.sans));
  const satir = [`  ${ad.padEnd(28)} n=${String(n).padStart(4)}  şans ${yuz(sans)}`];
  const bayrak = [];
  for (const [anahtar, etiket] of ipuclar) {
    const g = ort(liste.map((o) => o.r[anahtar] ?? 0)); const zz = z(g, sans, n);
    const arama = bilgi && ['metniTara', 'anahtarOkuyucu'].includes(anahtar);
    const isaret = !arama && Math.abs(zz) >= 3 && g - sans >= 0.08 ? ' ⚠' : '';
    satir.push(`${etiket} ${yuz(g)}${isaret}${arama ? ' (bilgi)' : ''}`);
    if (isaret) bayrak.push({ ad, anahtar, etiket, g, sans, n, zz });
  }
  console.log(satir.join(' · '));
  return bayrak;
}

console.log('=== 1) ANLAMA SORULARI: cevabı metne bakmadan / yüzeysel okuyarak bulmak ===');
console.log('   (şans düzeyi beklenir; ⚠ = şansın belirgin üstü, z≥3 ve +8 puan)');
const IP_ANLAMA = [['uzun', 'en uzun seçenek'], ['kisa', 'en kısa'], ['ortakSecenek', 'diğerleriyle en çok ortak sözcük'], ['soruyaBenzer', 'soruya en benzer'], ['metniTara', 'metni tara'], ['anahtarOkuyucu', 'anahtar-sözcük okuyucu']];
const bayraklar = [];
for (const tur of ['okuma', 'dinleme', 'sahne']) {
  const alt = ANLAMA.filter((o) => o.src.tur === tur);
  bayraklar.push(...tablo(tur, alt, IP_ANLAMA, tur !== 'sahne'));
  if (tur !== 'sahne') {
    const dusuk = alt.filter((o) => o.src.sv < 30), yuksek = alt.filter((o) => o.src.sv >= 30);
    bayraklar.push(...tablo(`  ${tur} seviye <30`, dusuk, IP_ANLAMA.slice(4), true));
    bayraklar.push(...tablo(`  ${tur} seviye ≥30`, yuksek, IP_ANLAMA.slice(4), tur === 'dinleme'));
  }
}
bayraklar.push(...tablo('hepsi', ANLAMA, IP_ANLAMA, true));
const hepsiAyni = ANLAMA.filter((o) => o.r.tumIpuclar >= 3);
console.log(`\n  Dört yüzeysel ipucundan en az ÜÇÜ aynı (doğru) seçeneği gösteren soru: ${hepsiAyni.length}/${ANLAMA.length}`);
if (AYRINTI) for (const o of hepsiAyni.slice(0, 40)) console.log(`    · ${o.src.ders}: ${o.q.soru}  → ${o.q.secenekler.join(' | ')}`);

console.log('\n=== 2) KELİME SORULARI (4 farklı denemede üretilen çeldiricilerle) ===');
const IP_KEL = [['uzun', 'en uzun'], ['kisa', 'en kısa'], ['ortakSecenek', 'ortak sözcük'], ['soruyaBenzer', 'soruya benzer'], ['ilk', 'hep ilk'], ['son', 'hep son']];
for (const tip of ['dinle-sec', 'anlam-sec', 'kelime-sec']) bayraklar.push(...tablo(tip, KEL.filter((o) => o.tip === tip), IP_KEL));
const anlam = KEL.filter((o) => o.tip === 'anlam-sec' && o.deneme === 0);
const resimli = anlam.filter((o) => o.r.resimIpucu);
console.log(`\n  “Ne demek?” sorusunda sözcüğün RESMİ (emoji) soru ekranında görünüyor: ${resimli.length}/${anlam.length} soru ${resimli.length ? '⚠ (kelimeyi bilmeyen öğrenci resimden Türkçesini bulabilir)' : ''}`);
const karisik = new Map();
for (const o of KEL) for (const m of haklıKarisiklik(o)) { const k = `${o.s.maddeId}|${m}`; if (!karisik.has(k)) karisik.set(k, { tip: o.tip, ders: o.ders, m }); }
console.log(`  Haklı karışıklık (çeldirici de doğru sayılabilir): ${karisik.size} durum`);
for (const v of [...karisik.values()].slice(0, AYRINTI ? 200 : 15)) console.log(`    · [${v.tip}] ${v.ders}: ${v.m}`);
if (!AYRINTI && karisik.size > 15) console.log(`    … (+${karisik.size - 15}; hepsi için --ayrinti)`);

console.log('\n=== 3) SORU BİÇİMİ ===');
console.log(`  Olumsuz kök (“…değildir/yanlıştır/söylenmez”): ${olumsuz.length} soru`);
for (const x of olumsuz.slice(0, 12)) console.log(`    · ${x.yer}: ${x.soru}`);
console.log(`  Çok uzun soru (>18 anlamlı sözcük): ${uzunSoru.length} soru`);
for (const x of uzunSoru.slice(0, 8)) console.log(`    · ${x.yer}: ${x.soru.slice(0, 110)}`);

const sorunSayisi = bayraklar.length + karisik.size + olumsuz.length + (resimli.length ? 1 : 0);
console.log(`\n${sorunSayisi ? '⚠' : '✓'} ${bayraklar.length} ipucu bayrağı · ${karisik.size} haklı karışıklık · ${olumsuz.length} olumsuz kök · resim ipucu ${resimli.length ? 'var' : 'yok'}`);
export { ANLAMA, KEL, karisik, olumsuz, resimli, bayraklar, hepsiAyni };
