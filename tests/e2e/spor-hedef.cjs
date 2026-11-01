// Haftalık spor hedefi kartı: hedef koy (gerçekçilik uyarısı dahil) → antrenman günü → dinlenme → hedef denemesi → sonuç; rapora düşer.
//   NODE_PATH=$(npm root -g) node tests/e2e/spor-hedef.cjs
const { chromium } = require('playwright');
const ADRES = (process.env.ADRES || 'http://localhost:8812').replace(/\/$/, '');
const tarih = (n) => new Date(Date.UTC(2026, 10, 2 + n)).toISOString().slice(0, 10); // gün 1 = 2026-11-02
const U = (n, hash) => `${ADRES}/?sw0=1&t=${tarih(n - 1)}${hash || ''}`;

(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
  const sorunlar = [], hatalar = [];
  p.on('console', (m) => { if (['error', 'warning'].includes(m.type()) && !/404|Failed to load resource/.test(m.text())) hatalar.push(m.text()); });
  p.on('pageerror', (e) => hatalar.push('pageerror: ' + e.message));
  const kart = () => p.locator('[data-spor-hedef]').innerText();
  const git = async (gun) => { await p.goto(U(gun, '#/bugun')); await p.reload(); await p.waitForTimeout(500); };

  await p.goto(U(1), { waitUntil: 'networkidle' });
  if (await p.locator('input').count()) { await p.fill('input', 'Test'); await p.click('text=Başlayalım'); await p.waitForTimeout(300); }
  await p.evaluate((t) => { const d = JSON.parse(localStorage.getItem('od3.durum')); d.baslangic = t; localStorage.setItem('od3.durum', JSON.stringify(d)); }, tarih(0));
  await git(1);

  let m = await kart();
  if (!/Haftalık spor hedefi/.test(m)) sorunlar.push('Gün 1: hedef formu yok');
  await p.fill('[data-spor-hedef] input[aria-label^="Şu an"]', '4');
  await p.fill('[data-spor-hedef] input[aria-label^="Bir hafta"]', '20');
  await p.click('[data-spor-hedef] >> text=Hedefi koy');
  await p.waitForTimeout(200);
  m = await kart();
  if (!/Ara hedef olarak 6 öneririm/.test(m)) sorunlar.push(`Gerçekçilik uyarısı yok: ${m.slice(0, 200)}`);
  await p.click('[data-spor-hedef] >> text=6 yap');
  await p.waitForTimeout(500);
  m = await kart();
  if (!/Gün 1\/7/.test(m) || !/4 → 6/.test(m)) sorunlar.push(`Gün 1 durumu yanlış: ${m.slice(0, 200)}`);

  await git(2);
  m = await kart();
  if (!/set × /.test(m) || !/Yaptım/.test(m)) sorunlar.push(`Gün 2: antrenman yok: ${m.slice(0, 200)}`);
  await p.click('[data-spor-hedef] >> text=Yaptım'); await p.waitForTimeout(500);
  if (!/yaptın/.test(await kart())) sorunlar.push('Gün 2: antrenman işaretlenmedi');

  await git(3);
  if (!/dinlenme/i.test(await kart())) sorunlar.push('Gün 3: dinlenme günü değil');

  await git(7);
  m = await kart();
  if (!/hedef günü/.test(m)) sorunlar.push(`Gün 7: deneme yok: ${m.slice(0, 200)}`);
  await p.fill('[data-spor-hedef] input[aria-label^="Tek seferde"]', '7');
  await p.click('[data-spor-hedef] >> text=Kaydet'); await p.waitForTimeout(500);
  m = await kart();
  if (!/Hedefe ulaştın: 7/.test(m)) sorunlar.push(`Sonuç yanlış: ${m.slice(0, 200)}`);

  // Rapor: hedef ve kayıtlar görünür
  await p.goto(U(8, '#/ben')); await p.reload(); await p.waitForTimeout(500);
  const rapor = await p.evaluate(async () => { const m = await import('/js/rapor.js'); const s = await import('/js/store.js'); return m.raporUret({ durum: s.al(), bugun: '2026-11-09', ayrinti: 'tam' }); });
  for (const s of ['Spor hedefi konuldu', 'Spor hedefi antrenmanı', 'Spor hedef denemesi']) if (!rapor.includes(s)) sorunlar.push(`Rapor: "${s}" yok`);
  if (/Tanımsız kayıt türü/.test(rapor)) sorunlar.push('Rapor: tanımsız kayıt türü var');

  console.log('--- sorunlar'); console.log(sorunlar.length ? sorunlar.join('\n') : 'yok');
  console.log('--- konsol'); console.log(hatalar.length ? hatalar.join('\n') : 'yok');
  await b.close();
  process.exit(sorunlar.length || hatalar.length ? 1 : 0);
})();
