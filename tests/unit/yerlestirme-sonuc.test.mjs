import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { kuralKur, seviyeler } from '../../js/seviye.js';
import { yerlestirmeSonucu } from '../../js/yerlestirme-sonuc.js';
import { raporUret } from '../../js/rapor.js';

const K = kuralKur({ seviye: JSON.parse(readFileSync(new URL('../../icerik/seviye.json', import.meta.url), 'utf8')).seviye });
let n = 0;
const gun = (d) => `2026-11-${String(d).padStart(2, '0')}`;
const yok = (iz, sv, dogru, toplam, d = 2) => ({ i: 'y' + ++n, tur: 'yerlestirme', iz, sv, dogru, toplam, g: gun(d), gn: d - 1, t: `${gun(d)}T10:${String(n % 60).padStart(2, '0')}:00.000Z` });
const soru = (iz, gorev, dogru, d = 2, ek = {}) => ({ i: 's' + ++n, tur: 'soru', ders: 'sv:' + iz, id: 'q' + n, dogru, ilk: true, yanit: 'x', g: gun(d), gn: d - 1, t: `${gun(d)}T11:${String(n % 60).padStart(2, '0')}:00.000Z`, b: 'k:' + iz + ':' + gorev, ...ek });
const bagOlustur = (satirlar) => Object.fromEntries(satirlar.map(([iz, gorev]) => ['k:' + iz + ':' + gorev, { iz, gorev, tur: 'mcq' }]));

// İngilizce ve okuma yoklaması biter; dinleme ve hafıza sürer
const olaylar = [
  yok('ingilizce', 5, 5, 5), yok('ingilizce', 10, 5, 5), yok('ingilizce', 20, 3, 7), yok('ingilizce', 15, 6, 7), yok('ingilizce', 17, 6, 7), yok('ingilizce', 19, 3, 7),
  yok('okuma', 5, 2, 7),
  ...Array.from({ length: 8 }, (_, i) => soru('ingilizce', 'Duyduğunu seç', true)),
  ...Array.from({ length: 6 }, (_, i) => soru('ingilizce', 'Türkçesini yaz', i < 2)),
  ...Array.from({ length: 3 }, () => soru('ingilizce', 'Az soruluk tür', false)),
  soru('ingilizce', 'Duyduğunu seç', false, 12), // yoklama haftasından sonra: sayılmaz
];
const bag = bagOlustur([['ingilizce', 'Duyduğunu seç'], ['ingilizce', 'Türkçesini yaz'], ['ingilizce', 'Az soruluk tür']]);
const sv = seviyeler(olaylar, K, { programGunu: 3 });

test('yoklaması biten beceriler listelenir, sürenler listelenmez; hazır değil', () => {
  const r = yerlestirmeSonucu({ olaylar, bag, seviye: sv, kural: K });
  assert.ok(r.beceriler.some((b) => b.iz === 'ingilizce'));
  assert.ok(r.bitenler < r.toplam);
  assert.equal(r.hazir, false);
  const e = r.beceriler.find((b) => b.iz === 'ingilizce');
  assert.deepEqual([e.gecen, e.kalan, e.yoklama, e.soru, e.dogru], [17, 19, 6, 38, 28]);
  assert.match(e.yorum, /En yüksek geçilen basamak 17; 19\. basamakta zorlandın/);
  assert.equal(e.sv, 14, 'başlangıç = geçilenin %80’i');
});

test('güçlü/zayıf yönler: en az 4 soru, yoklama haftası dışındaki kayıt sayılmaz', () => {
  const r = yerlestirmeSonucu({ olaylar, bag, seviye: sv, kural: K });
  assert.deepEqual(r.guclu.map((e) => [e.gorev, e.d, e.t]), [['Duyduğunu seç', 8, 8]], 'gün 12’deki yanlış sayılmaz');
  assert.deepEqual(r.zayif.map((e) => [e.gorev, e.d, e.t]), [['Türkçesini yaz', 2, 6]]);
  assert.ok(!r.zayif.some((e) => e.gorev === 'Az soruluk tür'), '3 soruluk tür hiç listelenmez');
  assert.equal(r.guclu[0].azSoru, true, '10’dan az soru "az soru" diye işaretlenir');
});

test('rapor: yoklama sonucu ve güçlü/zayıf bölümü yazılır, tanımsız kayıt çıkmaz', () => {
  const metin = raporUret({ durum: { olaylar, bag, ad: 'T', baslangic: gun(1), srs: {}, gecikmeli: [] }, bugun: gun(5), ayrinti: 'tam', seviye: sv, seviyeKural: K });
  assert.match(metin, /## Yoklama haftası sonucu/);
  assert.match(metin, /💪 Güçlü: .*Duyduğunu seç/);
  assert.match(metin, /🌱 Gelişmeye açık: .*Türkçesini yaz/);
  assert.doesNotMatch(metin, /Tanımsız kayıt/);
});

test('hiç yoklama bitmediyse sonuç boş', () => {
  const r = yerlestirmeSonucu({ olaylar: [], bag: {}, seviye: seviyeler([], K, { programGunu: 1 }), kural: K });
  assert.deepEqual([r.beceriler.length, r.hazir], [0, false]);
});
