import test from 'node:test';
import assert from 'node:assert/strict';
import { hedefDurumu, hedefDegerlendir, basamak, HEDEF_GUN } from '../../js/spor-hedef.js';

const hedef = (g, bas, hedefSayi, hareket = 'sinav') => ({ tur: 'spor-hedef', g, t: `${g}T08:00:00Z`, hareket, bas, hedef: hedefSayi });
const kayit = (g, kayitTur, tekrar, hareket = 'sinav', saat = '09') => ({ tur: 'spor-hedef-kayit', g, t: `${g}T${saat}:00:00Z`, hareket, kayitTur, ...(tekrar != null ? { tekrar } : {}) });

test('hedef yoksa durum yok', () => assert.equal(hedefDurumu([], '2026-11-02'), null));

test('7 günlük plan: ölçüm · antrenman · dinlenme · antrenman · dinlenme · dinlenme · deneme', () => {
  const o = [hedef('2026-11-02', 4, 10)];
  const tur = (g) => hedefDurumu(o, g).tur;
  assert.deepEqual(['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08'].map(tur),
    ['olcum', 'antrenman', 'dinlenme', 'antrenman', 'dinlenme', 'dinlenme', 'deneme']);
  assert.equal(tur('2026-11-20'), 'deneme', 'deneme günü geçse de hâlâ denenebilir');
  assert.equal(hedefDurumu(o, '2026-11-20').gec, true);
});

test('antrenman hacmi submaksimal: basamağın ~%60’ı, 3 set; basamak ölçümden hedefe artar ve ölçümün altına inmez', () => {
  const o = [hedef('2026-11-02', 5, 10)];
  const d2 = hedefDurumu(o, '2026-11-03'), d4 = hedefDurumu(o, '2026-11-05');
  assert.equal(d2.set, 3);
  assert.ok(d4.basamak >= d2.basamak && d2.basamak >= 5 && d4.basamak <= 10);
  assert.equal(d2.tekrar, Math.round(d2.basamak * 0.6));
  assert.equal(basamak(5, 10, 99), 10, 'hedefi aşmaz');
  assert.equal(basamak(8, 3, 4), 8, 'hedef ölçümden düşükse ölçümün altına inmez');
});

test('antrenman yapıldı işareti yalnız o güne ve o hedefe bağlıdır', () => {
  const o = [hedef('2026-11-02', 4, 10), kayit('2026-11-03', 'antrenman')];
  assert.equal(hedefDurumu(o, '2026-11-03').bugunYapildi, true);
  assert.equal(hedefDurumu(o, '2026-11-05').bugunYapildi, false);
});

test('deneme: hedefe ulaşma / ulaşamama, en iyi deneme sayılır', () => {
  const o = [hedef('2026-11-02', 4, 10), kayit('2026-11-08', 'deneme', 8)];
  let d = hedefDurumu(o, '2026-11-08');
  assert.deepEqual([d.bitti, d.ulasti, d.sonuc], [true, false, 8]);
  o.push(kayit('2026-11-09', 'deneme', 11));
  d = hedefDurumu(o, '2026-11-09');
  assert.deepEqual([d.ulasti, d.enIyi], [true, 11]);
});

test('yeni hedef konunca eski hedefin denemesi yeni hedefe sayılmaz', () => {
  const o = [hedef('2026-11-02', 4, 10), kayit('2026-11-08', 'deneme', 10), hedef('2026-11-09', 10, 15)];
  const d = hedefDurumu(o, '2026-11-09');
  assert.equal(d.bitti, false); assert.equal(d.hedef, 15); assert.equal(d.tur, 'olcum');
});

test('başka hareketin kaydı karışmaz', () => {
  const o = [hedef('2026-11-02', 4, 10, 'sinav'), kayit('2026-11-08', 'deneme', 12, 'plank')];
  assert.equal(hedefDurumu(o, '2026-11-08').bitti, false);
});

test('gerçekçilik: aşırı hedefe ara hedef önerilir, makul hedef geçer', () => {
  assert.deepEqual(hedefDegerlendir(4, 10), { tur: 'zor', oner: 6 });
  assert.deepEqual(hedefDegerlendir(8, 20), { tur: 'zor', oner: 12 });
  assert.equal(hedefDegerlendir(4, 6).tur, 'uygun');
  assert.equal(hedefDegerlendir(8, 8).tur, 'ulasildi');
  assert.equal(hedefDegerlendir(0, 0).tur, 'gecersiz');
  assert.equal(hedefDegerlendir(0, 2).tur, 'uygun', 'hiç yapamayan biri için 2 makul bir ilk hedef');
});
