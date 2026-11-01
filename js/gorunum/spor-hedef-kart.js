// Bugün ekranındaki "Haftalık spor hedefi" kartı: hedefi koy, bugünkü adımı gör, yaptığını kaydet, hafta sonunda dene.

import { h, bildir } from '../ui.js';
import * as store from '../store.js';
import { bugun } from '../zaman.js';
import { HAREKETLER, HEDEF_GUN, hedefDegerlendir, hedefDurumu, hareketBul } from '../spor-hedef.js';

const yenile = () => window.dispatchEvent(new HashChangeEvent('hashchange'));
const kart = (...c) => h('div.kart.duz', { data: { sporHedef: '1' } }, ...c);

export function sporHedefKarti() {
  const d = hedefDurumu(store.al().olaylar, bugun());
  if (!d) return form(null);
  if (d.bitti) return bitis(d);
  return durum(d);
}

/** Hedef koyma formu. onceki: değiştirilen hedef (varsa değerler hazır gelir). */
function form(onceki, ic = false) {
  const secim = h('select.girdi', { 'aria-label': 'Hareket' }, HAREKETLER.map((x) => h('option', { value: x.id, selected: onceki?.hareket === x.id }, `${x.ad} (${x.birim})`)));
  const bas = h('input.girdi', { type: 'number', min: '0', max: '300', inputmode: 'numeric', placeholder: 'örn. 4', 'aria-label': 'Şu an tek seferde yapabildiğin sayı', value: onceki ? String(onceki.bas) : '' });
  const hedef = h('input.girdi', { type: 'number', min: '1', max: '300', inputmode: 'numeric', placeholder: 'örn. 10', 'aria-label': 'Bir haftalık hedef', value: onceki ? String(onceki.hedef) : '' });
  const uyari = h('p.alt-yazi', { style: 'margin:8px 0 0', role: 'status' });
  const kaydet = (zorla) => {
    const b = Math.round(+bas.value), t = Math.round(+hedef.value);
    if (!(b >= 0) || bas.value === '') { bildir('Önce şu an kaç tane yapabildiğini yaz (hiç yapamıyorsan 0)'); return; }
    const v = hedefDegerlendir(b, t);
    if (v.tur === 'gecersiz') { bildir('Hedef için 1 ya da daha büyük bir sayı yaz'); return; }
    if (v.tur === 'ulasildi') { uyari.textContent = `Şu an zaten ${b} yapabiliyorsun; hedefi ${b}’den büyük koy.`; return; }
    if (v.tur === 'zor' && !zorla) {
      uyari.replaceChildren(`Bir haftada ${b} → ${t} zor olabilir (bu benim tahminim, kesin kural değil). Ara hedef olarak ${v.oner} öneririm. `,
        h('button.dugme.cizgili', { type: 'button', style: 'margin:6px 6px 0 0', onclick: () => { hedef.value = String(v.oner); kaydet(false); } }, `${v.oner} yap`),
        h('button.dugme.cizgili', { type: 'button', style: 'margin-top:6px', onclick: () => kaydet(true) }, `Yine de ${t}`));
      return;
    }
    store.olay('spor-hedef', { hareket: secim.value, bas: b, hedef: t });
    store.kaydetHemen(); bildir('Hedef konuldu. Küçük adımlarla gideceğiz.'); yenile();
  };
  const sar = ic ? (...c) => h('div', ...c) : kart; // iç içe (Hedefi değiştir) kullanımda ikinci kart oluşmasın
  return sar(h('strong', ic ? 'Yeni hedef' : '🎯 Haftalık spor hedefi'),
    h('p.alt-yazi', { style: 'margin:6px 0 10px' }, 'Spor seviyesi soruyla ölçülmez; sen bir hedef koyarsın, uygulama küçük adımlara böler. Örnek: “1 haftada 10 şınav”. Önce hareketi bir kez dene ve ara vermeden kaç tane yapabildiğini yaz.'),
    h('label.alt-yazi', 'Hareket'), secim,
    h('label.alt-yazi', { style: 'display:block;margin-top:8px' }, 'Şu an tek seferde kaç tane yapabiliyorsun?'), bas,
    h('label.alt-yazi', { style: 'display:block;margin-top:8px' }, `${HEDEF_GUN} gün sonraki hedefin kaç olsun?`), hedef,
    h('button.dugme.birincil.tam', { type: 'button', style: 'margin-top:12px', onclick: () => kaydet(false) }, 'Hedefi koy'),
    uyari,
    h('p.alt-yazi', { style: 'margin:10px 0 0' }, 'Ağrı ya da baş dönmesi olursa dur. Zorlama; yapılmayan antrenman ertesi güne eklenmez.'));
}

function degistirDugmesi(d) {
  return h('details.ac', { style: 'margin-top:10px' }, h('summary', 'Hedefi değiştir'),
    h('div', { style: 'margin-top:8px' }, form({ hareket: d.hareket, bas: d.bas, hedef: d.hedef }, true)));
}

function durum(d) {
  const ad = d.ad.toLowerCase();
  let baslik, govde, eylem = null;
  if (d.tur === 'dinlenme') {
    baslik = 'Bugün dinlenme günü';
    govde = `Kaslar dinlenirken güçlenir. ${HEDEF_GUN}. günde hedefi deneyeceksin.`;
  } else if (d.tur === 'olcum') {
    baslik = 'Bugün: ölçümü yaptın';
    govde = `Başlangıcın ${d.bas} ${d.birim}. Yarın ilk küçük antrenman.`;
  } else if (d.tur === 'antrenman') {
    baslik = d.bugunYapildi ? 'Bugünkü antrenmanı yaptın ✅' : `Bugün: ${d.set} set × ${d.tekrar} ${ad === 'plank' ? 'saniye plank' : ad}`;
    govde = d.bugunYapildi ? 'Dinlen; bir sonraki adımı uygulama gösterecek.' : `Her set arasında 1–2 dakika dinlen. Zorlandığında setin tekrarını azalt; amaç hafifçe yorulmak, tükenmek değil. (Günün basamağı: ${d.basamak}.)`;
    if (!d.bugunYapildi) eylem = h('button.dugme.birincil.tam', { type: 'button', onclick: () => { store.olay('spor-hedef-kayit', { hareket: d.hareket, kayitTur: 'antrenman' }); store.kaydetHemen(); bildir('Kaydedildi'); yenile(); } }, 'Yaptım');
  } else { // deneme
    baslik = d.gec ? 'Hedef denemesi hâlâ seni bekliyor' : `Bugün hedef günü: ${d.hedef} ${d.birim}`;
    govde = `Isın, sonra ara vermeden kaç tane yapabildiğine bak. Hedefin ${d.hedef}; başlangıcın ${d.bas} idi. Tutmazsa sorun değil: sonuç kaydolur ve yeni bir hedef koyabilirsin.`;
    const g = h('input.girdi', { type: 'number', min: '0', max: '300', inputmode: 'numeric', 'aria-label': 'Tek seferde yaptığın sayı', placeholder: 'kaç tane yaptın?', style: 'flex:1;min-width:0;width:auto' });
    eylem = h('div.satir', { style: 'gap:8px' }, g, h('button.dugme.birincil', { type: 'button', onclick: () => {
      const n = Math.round(+g.value);
      if (g.value === '' || !(n >= 0)) { bildir('Kaç tane yaptığını yaz (hiç yapamadıysan 0)'); return; }
      store.olay('spor-hedef-kayit', { hareket: d.hareket, kayitTur: 'deneme', tekrar: n }); store.kaydetHemen(); yenile();
    } }, 'Kaydet'));
  }
  return kart(h('strong', `🎯 ${d.ad}: ${d.bas} → ${d.hedef} ${d.birim === 'saniye' ? 'sn' : ''}`.trim()),
    h('div.alt-yazi', `Gün ${Math.min(d.gun, HEDEF_GUN)}/${HEDEF_GUN}`),
    h('h3', { style: 'margin:8px 0 4px' }, baslik), h('p', { style: 'margin:0 0 10px' }, govde), eylem, degistirDugmesi(d));
}

function bitis(d) {
  const ad = hareketBul(d.hareket)?.ad || d.ad;
  return kart(h('strong', `🎯 ${ad}: ${d.bas} → ${d.hedef}`),
    h('h3', { style: 'margin:8px 0 4px' }, d.ulasti ? `Hedefe ulaştın: ${d.sonuc} 🎉` : `Bu hafta ${d.sonuc} yaptın (hedef ${d.hedef})`),
    h('p', { style: 'margin:0 0 10px' }, d.ulasti ? `Başlangıcın ${d.bas} idi. Yeni bir hedef koyabilirsin.` : `Başlangıcın ${d.bas} idi; ${d.sonuc > d.bas ? `${d.sonuc - d.bas} artış` : 'bu hafta sabit kaldın'}. Hedefin yakınsa aynısını bir hafta daha deneyebilir, ya da daha küçük bir hedef koyabilirsin.`),
    h('details.ac', h('summary', 'Yeni hedef koy'), h('div', { style: 'margin-top:8px' }, form({ hareket: d.hareket, bas: d.sonuc, hedef: d.ulasti ? d.hedef + Math.max(2, Math.round(d.hedef * 0.3)) : d.hedef }, true))));
}
