// "Vasat öğrenci" denetimi: içerik, metni anlamadan yüzeysel ipuçlarıyla çözülebilir mi?
// Sınırlar bilerek gevşek tutuldu (şans %33; "en uzun seçenek" için %55'in altı). Aşıldıysa yeni içerik seçeneklerini gözden geçir
// (docs/KOLAY_GIRIS.md → "Seçenek yazma kuralları").
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const KOK = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const cikti = execFileSync('node', [join(KOK, 'scripts', 'vasat-ogrenci.mjs')], { encoding: 'utf8', maxBuffer: 1 << 24 });
const yuzde = (satirBasi, etiket) => {
  const satir = cikti.split('\n').find((l) => l.trimStart().startsWith(satirBasi + ' '));
  assert.ok(satir, `${satirBasi} satırı yok`);
  const m = satir.match(new RegExp(etiket + ' %(\\d+)'));
  assert.ok(m, `${etiket} yok: ${satir}`);
  return +m[1];
};

test('doğru seçenek sistematik olarak en uzun değil', () => {
  assert.ok(yuzde('hepsi', 'en uzun seçenek') < 55, 'en uzun seçenek ipucu çok güçlü');
  assert.ok(yuzde('okuma', 'en uzun seçenek') < 55);
  assert.ok(yuzde('dinleme', 'en uzun seçenek') < 55);
});

test('metni tarayan okuyucu üst seviye okumada belirgin üstünlük sağlamıyor (kısa metinde arama kısmen doğal; sınır %70)', () => {
  const satir = cikti.split('\n').find((l) => l.includes('okuma seviye ≥30'));
  const m = satir.match(/metni tara %(\d+)/);
  assert.ok(m && +m[1] < 70, satir);
});

test('hiçbir soruda dört yüzeysel ipucundan üçü birden doğruyu göstermiyor', () => {
  assert.match(cikti, /ÜÇÜ aynı \(doğru\) seçeneği gösteren soru: 0\//);
});

test('“Ne demek?” sorusunda resim cevabı ele vermiyor', () => {
  assert.match(cikti, /RESMİ \(emoji\) soru ekranında görünüyor: 0\//);
});

test('çeldirici de doğru sayılabilecek (biri ötekinin içinde geçen) karşılık yok', () => {
  assert.match(cikti, /Haklı karışıklık[^\n]*: 0 durum/);
});

test('olumsuz soru kökü ve çok uzun soru yok', () => {
  assert.match(cikti, /Olumsuz kök[^\n]*: 0 soru/);
  assert.match(cikti, /Çok uzun soru[^\n]*: 0 soru/);
});

test('kelime sorularında çeldirici yeri / uzunluğu ipucu vermiyor (şans %25 ± 8)', () => {
  for (const tur of ['dinle-sec', 'anlam-sec', 'kelime-sec']) {
    for (const e of ['en uzun', 'en kısa', 'hep ilk', 'hep son']) {
      const g = yuzde(tur, e);
      assert.ok(g >= 17 && g <= 33, `${tur} ${e} %${g}`);
    }
  }
});
