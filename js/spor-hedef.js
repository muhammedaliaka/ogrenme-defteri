// Haftalık spor hedefi. Saf işlevler (tarayıcıya bağlı değil): Bugün kartı, rapor ve testler aynı kuralı kullanır.
//
// Neden ayrı: spor seviyesi yoklamayla ölçülmez ("kaç şınav yapabiliyorsun?" bir soru değil bir hareket). Bunun yerine kişi kendi hedefini koyar
// ("1 haftada 10 şınav"), bugünkü gücünü ölçer, uygulama hafifçe artan küçük antrenmanlar ve hafta sonunda tek bir deneme önerir.
//
// Olaylar:
//   spor-hedef       { hareket, bas, hedef }          hedef konuldu; bas = o gün tek seferde yapılabilen sayı (ölçüm)
//   spor-hedef-kayit { hareket, kayitTur, tekrar? }   kayitTur: 'antrenman' (yapıldı) | 'deneme' (hedef denemesi: tekrar = tek seferde yapılan)
//
// Plan (7 gün; ardışık gün yok, dinlenme günleri var). Antrenman hacmi submaksimaldir: günün basamağının yaklaşık %60'ı, 3 set.
// Gün 1 ölçüm (hedef konurken yapıldı) · 2 antrenman · 3 dinlenme · 4 antrenman · 5 dinlenme · 6 dinlenme · 7 hedef denemesi.
// Bu program kanıta değil tasarım tahminime dayanır: amaç "hafif ve düzenli" kalmaktır, antrenman bilimi iddiası değildir.

import { gunFarki } from './zaman.js';

export const HEDEF_GUN = 7;

export const HAREKETLER = [
  { id: 'sinav', ad: 'Şınav', birim: 'tekrar', kolay: 'diz-sinav' },
  { id: 'diz-sinav', ad: 'Diz üstü şınav', birim: 'tekrar', kolay: 'duvar-sinav' },
  { id: 'duvar-sinav', ad: 'Duvar şınavı', birim: 'tekrar' },
  { id: 'sandalye', ad: 'Sandalyeye otur-kalk', birim: 'tekrar' },
  { id: 'plank', ad: 'Plank', birim: 'saniye' },
];
export const hareketBul = (id) => HAREKETLER.find((x) => x.id === id) || null;

const PLAN = { 1: 'olcum', 2: 'antrenman', 3: 'dinlenme', 4: 'antrenman', 5: 'dinlenme', 6: 'dinlenme', 7: 'deneme' };
const SET = 3;
const ORAN = 0.6;

/**
 * Hedef gerçekçi mi? Bir haftada baştaki sayıyı yarıdan fazla artırmak çoğu zaman zorlayıcıdır (benim tahminim, kesin kural değil).
 * Dönüş: { tur: 'ulasildi' | 'uygun' | 'zor', oner? } — 'zor' ise oner = önerilen ara hedef.
 */
export function hedefDegerlendir(bas, hedef) {
  if (!(hedef >= 1)) return { tur: 'gecersiz' };
  if (hedef <= bas) return { tur: 'ulasildi' };
  const ara = Math.max(bas + 2, Math.ceil(bas * 1.5));
  return hedef > ara ? { tur: 'zor', oner: ara } : { tur: 'uygun' };
}

/** Günün basamağı: ölçümden hedefe doğrusal; en az ölçüm kadar. */
export const basamak = (bas, hedef, gun) => Math.max(bas, Math.round(bas + (hedef - bas) * Math.min(1, gun / HEDEF_GUN)));

export const aktifHedef = (olaylar) => [...olaylar].reverse().find((o) => o.tur === 'spor-hedef') || null;

/**
 * Bugünkü hedef durumu; hedef yoksa null.
 * { hareket, ad, birim, bas, hedef, gun, tur, basamak, set, tekrar, bugunYapildi, bitti, ulasti, sonuc, gec }
 *   tur: 'olcum' | 'antrenman' | 'dinlenme' | 'deneme' | 'bitti'
 *   gec: deneme günü geçtiği hâlde henüz denenmemiş (hâlâ denenebilir)
 */
export function hedefDurumu(olaylar, bugun) {
  const h = aktifHedef(olaylar);
  if (!h) return null;
  const hareket = hareketBul(h.hareket) || { id: h.hareket, ad: h.hareket, birim: 'tekrar' };
  const gun = Math.max(1, gunFarki(h.g, bugun) + 1);
  const kayitlar = olaylar.filter((o) => o.tur === 'spor-hedef-kayit' && o.hareket === h.hareket && String(o.t) >= String(h.t));
  const deneme = kayitlar.filter((o) => o.kayitTur === 'deneme');
  const son = deneme.at(-1);
  const taban = { hareket: h.hareket, ad: hareket.ad, birim: hareket.birim, bas: h.bas, hedef: h.hedef, gun, g: h.g };
  if (son) {
    const enIyi = Math.max(...deneme.map((o) => o.tekrar || 0));
    return { ...taban, tur: 'bitti', bitti: true, ulasti: enIyi >= h.hedef, sonuc: son.tekrar, enIyi };
  }
  const tur = gun >= HEDEF_GUN ? 'deneme' : PLAN[gun];
  const b = basamak(h.bas, h.hedef, gun);
  const bugunYapildi = kayitlar.some((o) => o.g === bugun && o.kayitTur === 'antrenman');
  return { ...taban, tur, bitti: false, ulasti: false, basamak: b, set: SET, tekrar: Math.max(1, Math.round(b * ORAN)), bugunYapildi, gec: gun > HEDEF_GUN };
}
