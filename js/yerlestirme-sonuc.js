// Yoklama haftası sonucu: her becerinin başlangıç seviyesi, güçlü ve zayıf yönler. Saf işlev (tarayıcıya bağlı değil); Ben sayfası, Bugün
// ve rapor aynı sonucu kullanır.
//
// Güçlü/zayıf yön = yoklama haftasında (programın ilk günlerinde) ilk denemede yanıtlanan, puanlanan soruların görev türüne göre doğru oranı.
// Her tür için en az ENAZ soru gerekir; ENAZ_GUVEN'den az soruya dayanan yüzde "az soru" diye işaretlenir (kesin bir şey söylemez).

import { cefrYaklasim } from './seviye.js';

export const ENAZ = 4;
export const ENAZ_GUVEN = 10;
export const GUCLU_ESIK = 0.8;
export const ZAYIF_ESIK = 0.6;

/** Becerinin yoklama sonucu: seviye, dayanak ve düz Türkçe yorum. */
export function becerSonucu(s, yerKural) {
  const y = s.yerlestirme;
  const soru = y.yoklamalar.reduce((t, x) => t + (x.toplam || 0), 0);
  const dogru = y.yoklamalar.reduce((t, x) => t + (x.dogru || 0), 0);
  let yorum;
  if (!y.gecen) yorum = 'Hiçbir basamak geçilmedi; kolay başlamak yanlış değil. Çalışma en baştan, hafifçe başlayacak.';
  else {
    const zor = y.kalan ? `${y.kalan}. basamakta zorlandın` : 'zorlandığın bir basamak bulunmadı';
    yorum = `En yüksek geçilen basamak ${y.gecen}; ${zor}. Çalışma bunun %${Math.round((yerKural.guvenPayi ?? 0.8) * 100)}’i olan ${s.sv}. seviyeden başlar: rahat bir başlangıç, ilk günler kolay gelebilir.`;
    if (y.tavanGecti) yorum += ` Yoklamanın üst sınırı (${yerKural.tavan}) geçildi; gerçek düzeyin bundan yüksek olabilir.`;
  }
  return { iz: s.iz, ad: s.ad, sv: s.sv, cefr: cefrYaklasim(s.sv), gecen: y.gecen, kalan: y.kalan, yoklama: y.yoklamalar.length, soru, dogru, azSoru: soru < ENAZ_GUVEN, yorum };
}

/**
 * @param {object} p { olaylar, bag, seviye, kural }  seviye: seviyeler() çıktısı
 * @returns {{ beceriler: object[], bitenler: number, toplam: number, hazir: boolean, guclu: object[], zayif: object[] }}
 */
export function yerlestirmeSonucu({ olaylar, bag = {}, seviye, kural }) {
  const y = kural.yerlestirme;
  const yerli = Object.values(seviye).filter((s) => s.yerlestirme);
  const biten = yerli.filter((s) => !s.yoklamaBekliyor);
  const beceriler = biten.map((s) => becerSonucu(s, y));
  const yerIz = new Set(yerli.map((s) => s.iz));

  // Güçlü/zayıf: yoklama haftasındaki ilk deneme yanıtları, görev türüne göre
  const grup = new Map();
  for (const o of olaylar) {
    if (o.tur !== 'soru' || !o.ilk || o.puansiz) continue;
    if (o.gn != null && o.gn > y.sonGun) continue;
    const b = (o.b && bag[o.b]) || {};
    if (!b.iz || !yerIz.has(b.iz)) continue;
    const gorev = b.gorev || b.tur;
    if (!gorev || b.tur === 'liste-hatirla') continue;
    const anahtar = `${b.iz}|${gorev}`;
    const e = grup.get(anahtar) || { iz: b.iz, gorev, d: 0, t: 0 };
    e.t++; if (o.dogru) e.d++;
    grup.set(anahtar, e);
  }
  const satirlar = [...grup.values()].filter((e) => e.t >= ENAZ).map((e) => ({ ...e, oran: e.d / e.t, azSoru: e.t < ENAZ_GUVEN }));
  const guclu = satirlar.filter((e) => e.oran >= GUCLU_ESIK).sort((a, b) => b.oran - a.oran || b.t - a.t).slice(0, 3);
  const zayif = satirlar.filter((e) => e.oran <= ZAYIF_ESIK).sort((a, b) => a.oran - b.oran || b.t - a.t).slice(0, 3);
  return { beceriler, bitenler: biten.length, toplam: yerli.length, hazir: yerli.length > 0 && biten.length === yerli.length, guclu, zayif };
}

export const yuzdeMetni = (e) => `%${Math.round(e.oran * 100)} (${e.d}/${e.t}${e.azSoru ? ', az soru' : ''})`;
