# Haftalık spor hedefi

Spor seviyesi bir soruyla ölçülemez ("kaç şınav yapabiliyorsun?" bir hareket, soru değil). Bu yüzden sporda yoklama yoktur; bunun yerine **kendi hedefini koyarsın**, uygulama onu küçük adımlara böler. Kod: `js/spor-hedef.js` (saf işlevler), `js/gorunum/spor-hedef-kart.js` (Bugün'deki kart). Sınama: `tests/unit/spor-hedef.test.mjs`, `tests/e2e/spor-hedef.cjs`.

## Akış

1. Bugün ekranındaki **🎯 Haftalık spor hedefi** kartında hareketi seç (şınav, diz üstü şınav, duvar şınavı, sandalyeye otur-kalk, plank), hareketi bir kez dene ve **ara vermeden kaç tane yapabildiğini** yaz, **7 gün sonraki hedefini** yaz (örnek: 10 şınav).
2. Hedef, başlangıcının üstünde olmalı. Başlangıcın en az **%50 üstüne** çıkan bir hedefte uygulama ara hedef önerir (örn. 4 → 20 yerine 4 → 6). Önerinin kabulü senin kararındır: "Yine de 20" diyebilirsin. Bu eşik **benim tahminimdir**, kanıta dayanmaz; bir haftada büyük sıçrama beklemek hayal kırıklığı yaratabilir diye konmuştur.
3. Hafta şöyle geçer: **gün 1** ölçüm (hedef konurken yapıldı) · **gün 2** küçük antrenman · **gün 3** dinlenme · **gün 4** küçük antrenman · **gün 5–6** dinlenme · **gün 7** hedef denemesi (tek seferde kaç yaparsın). Deneme günü geçse de deneme açık kalır.
4. Antrenman **submaksimaldir**: günün basamağının yaklaşık %60'ı, 3 set, setler arası 1–2 dakika dinlenme. Basamak başlangıçtan hedefe doğrusal artar. Amaç hafifçe yorulmaktır, tükenmek değil.
5. Deneme sonucu kaydolur: hedefe ulaştıysan yeni, biraz daha yüksek bir hedef önerilir; ulaşamadıysan aynı hedefi tekrar ya da daha küçük bir hedef koyabilirsin. Yapılmayan antrenman ertesi güne eklenmez.

## Rapor

Rapora "Spor hedefi" bölümü (hareket, başlangıç, hedef, sonuç; hepsi öğrencinin beyanı) ve her kayıt (hedef, antrenman, deneme) girer.

## Sınırlar

- Plan ve eşikler (gün düzeni, %60 hacim, %50 uyarısı) **kanıta değil tasarım tahminime** dayanır; antrenman bilimi iddiası değildir. Ağrı ya da baş dönmesinde dur.
- Sayıları uygulama doğrulayamaz; hepsi beyandır.
- Bu hedef, "Spor oturumu" seviye sisteminden (yürüyüş, güç, denge) ayrıdır; ikisi birlikte kullanılabilir.
