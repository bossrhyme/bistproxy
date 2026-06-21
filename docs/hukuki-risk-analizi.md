# DeepFin — Hukuki Risk Analizi
*ABD ve Türk Hukuku Kapsamında · Haziran 2026*

---

## ALAN 1: FİNANSAL VERİ API'LERİ

### API Sağlayıcılarının Ticari Kullanım Kısıtlamaları

| Sağlayıcı | Ücretsiz Ticari Kullanım | Minimum Ticari Ücret | Veri Dağıtımı |
|---|---|---|---|
| **TradingView Widget** | ❌ Yasak | Enterprise (özel fiyat) | ❌ Yasak |
| **Yahoo Finance API** | ❌ Yasak | Özel lisans anlaşması | ❌ Yasak |
| **Finnhub** | ❌ Yasak | $11,99–$99,99/ay | İş planı gerektirir |
| **Polygon.io** | ❌ Yasak | $199/ay (Starter) | ❌ Business plan gerekli |

**Kritik:** Tüm sağlayıcılar ücretsiz planların ticari üründe kullanılamayacağını açıkça belirtiyor.
Reklam gösterimi, ücretli plan veya yatırım amaçlı servis = ticari kullanım = **her biri için breach of contract riski.**

---

### Borsa Lisanslama Gereksinimleri

**Borsa İstanbul (BIST):**
- Herhangi bir BIST verisini (gerçek zamanlı, gecikmeli, kapanış) gösteren platformlar **Borsa İstanbul Veri Dağıtım Sözleşmesi** imzalamak zorunda
- Lisans türleri: ME (zorunlu temel) + KD1 / PD1+ / PD2
- İletişim: vyk-marketing@borsaistanbul.com
- **Risk düzeyi: YÜKSEK** — lisanssız BIST verisi doğrudan yasal ihlal

**NYSE / NASDAQ:**
- Gerçek zamanlı: $500.000–$600.000/ay (enterprise)
- 15 dakika gecikmeli: ~$250/ay baz + yıllık $250 admin, formal lisans + aylık kullanıcı raporu gerektirir
- **Risk düzeyi: ORTA** — Polygon.io / Finnhub gibi lisanslı üçüncü taraf kullan

---

### ABD Hukuku

**Telif Hakkı — DÜŞÜK RİSK:**
- Feist Publications v. Rural Telephone Service (1991 — ABD Yüksek Mahkemesi): Ham finansal veriler (F/K, piyasa değeri, kapanış fiyatı) telif hakkıyla korunamaz, bunlar birer "fact"tir.
- Hot news misappropriation (NBA v. Motorola, 1997): Teorik olarak gerçek zamanlı veri için dar istisna, uygulanması zor.

**Web Scraping / CFAA — DÜŞÜK RİSK (Kamu Verisi İçin):**
- Van Buren v. United States (2021): CFAA kapsamı daraltıldı, yalnızca yetkisiz erişimi kapsar.
- hiQ Labs v. LinkedIn (2022 settlement): CFAA kamuya açık sitelere uygulanamaz. ToS ihlali = sözleşme hukuku sorunu, bilgisayar suçu değil.

**Sözleşme İhlali (Breach of Contract) — ORTA-YÜKSEK RİSK:**
- Her API sağlayıcısının ToS'u tıklanarak kabul edilmiş birer sözleşmedir.
- Ticari kullanım yasağına rağmen ticari platformda kullanmak = tazminat, hesap kapatma, injunction riski.

---

### Türk Hukuku

**FSEK (5846) — ORTA RİSK:**
- Ek Madde 8: Sui generis veri tabanı koruması — "esaslı yatırım" yapılmış veri tabanları 15 yıl korunur.
- Ham fiyat verileri FSEK'e göre telif hakkıyla korunmaz; ancak veri tabanı bütünü sınırlı koruma alabilir.

**SPK Düzenlemeleri:**
- Kişiselleştirilmiş yatırım tavsiyesi → SPK lisansı gerekir (Kanun 6362, Madde 54)
- Filtreleme/tarama aracı (DeepFin gibi) → kişiselleştirilmiş tavsiye değil → **SPK lisansı GEREKMİYOR**
- İhlal: 2–5 yıl hapis + idari para cezası

**Borsa İstanbul Lisansı → ZORUNLU**

---

### Risk Özeti — Finansal Veri API'leri

| Risk | ABD | Türkiye | Eylem |
|---|---|---|---|
| Ham finansal veri telif hakkı | 🟢 Düşük (Feist) | 🟡 Orta (FSEK sui generis) | — |
| API ToS ihlali | 🔴 Yüksek | 🔴 Yüksek | Ücretli plan al |
| BIST veri lisansı | — | 🔴 Yüksek | **Sözleşme imzala** |
| SPK lisansı (tarama ≠ tavsiye) | — | 🟢 Düşük | Mevcut haliyle güvenli |
| Web scraping (kamu verisi) | 🟢 Düşük (Van Buren) | 🟡 Orta | Lisanslı kanal kullan |

---

## ALAN 2: YATIRIMCI İSİMLERİ ("BUFFETT LENSİ" VB.)

### ABD Hukuku

**Ticari Marka — DÜŞÜK RİSK:**
- USPTO veritabanında Warren Buffett, Benjamin Graham, Peter Lynch isimleri finansal ürünler için aktif federal ticari marka olarak tescil edilmemiş.
- Stock Rover, Finviz "Guru Strategies" kullanıyor, görünürde ticari marka davası yok.

**Right of Publicity (Kişilik Hakkı Ticarileştirme) — ORTA RİSK:**
- Federal değil, **eyalet hukukuyla** düzenleniyor:
  - **Warren Buffett (yaşıyor, Nebraska):** Nebraska'nın right of publicity yasası sınırlı. Ticari kullanım → potansiyel dava riski.
  - **Peter Lynch (yaşıyor, Massachusetts):** Ticari kullanım için rıza gerekir.
  - **Benjamin Graham (1976'da öldü, New York):** NY'nin 2021 yasası sadece 2021 sonrası ölümleri kapsıyor → Graham muaf. California'da 70 yıl koruma → 2046'ya kadar (eğer CA domicile ise). Net risk azalmış ama sıfır değil.

**Lanham Act §43(a) — False Endorsement — ORTA RİSK:**
- "Buffett Lensi" ≠ "Warren Buffett tarafından önerilmiştir"
- Tüketicilerde "DeepFin, Buffett tarafından onaylandı" izlenimi yaratmak → dava riski
- Midler v. Ford (1988), Abdul-Jabbar v. GMC (1996): false endorsement emsal kararlar

**Kritik dil farkı:**
- `"Buffett tarzı kriterler"` → Daha güvenli (tanımlayıcı)
- `"Warren Buffett'ın kendi kullandığı stratejiler"` → False endorsement riski
- `"Warren Buffett sponsorudur"` → Kesin ihlal

---

### Türk Hukuku

**TMK 24-25 (Kişilik Hakları) — YÜKSEK RİSK:**
- Kişinin adı kişilik hakkının ayrılmaz parçası
- Rıza olmadan ticari kullanım: saldırının durdurulması + tazminat + **elde edilen kazancın iadesi**
- Yargıtay: Aktörün fotoğrafının rızasız café menüsünde kullanılması = kişilik hakkı ihlali

**Vefat Sonrası Koruma:**
- TMK 28: Kişilik ölümle sona erer — ama "hatıranın korunması teorisi" ile hayatta olan yakınlar dava açabilir
- Süre kanunda belirtilmemiş; yakınlar yaşadığı sürece dava hakkı var

**TÜRKPATENT:**
- Buffett, Graham gibi isimleri marka olarak tescil = kötüniyetli tescil → reddedilir

---

### Yatırımcı İsimleri Risk Tablosu

| Kişi | ABD Riski | Türkiye Riski | Tavsiye |
|---|---|---|---|
| Warren Buffett (yaşıyor) | 🔴 Yüksek | 🔴 Yüksek | "Buffett tarzı" + disclaimer |
| Peter Lynch (yaşıyor) | 🔴 Yüksek | 🔴 Yüksek | "Lynch tarzı" + disclaimer |
| Benjamin Graham (1976 vefat) | 🟡 Orta | 🟡 Orta | "Graham kriterlerine dayalı" |
| Joel Greenblatt (yaşıyor) | 🔴 Yüksek | 🔴 Yüksek | "Magic Formula tarzı" |
| Jesse Livermore (1940 vefat) | 🟢 Düşük | 🟢 Düşük | Adı doğrudan kullanılabilir |

---

## SOMUT ÖNERİLER

### Acil

1. **Borsa İstanbul Lisansı** — vyk-marketing@borsaistanbul.com ile iletişime geç
2. **Polygon.io / Finnhub ticari plana geç** — ücretsiz plan ToS ihlali
3. **Yatırımcı isimleri dili değiştir** — "Buffett Lensi" → "Buffett Tarzı Kriterler"

### Disclaimer Metni (tüm lens sayfalarına ekle)

```
"Bu tarama kriterleri, kamuya açık yayınlarda belgelenen yatırım
metodolojilerine dayanmaktadır. Söz konusu yatırımcılar bu platformu
onaylamamış veya tavsiye etmemiştir. Bu araç yatırım tavsiyesi
niteliği taşımaz."
```

### Uzun Vadeli

- SPK uyumluluğu için sermaye piyasası alanında uzman avukat
- Yahoo Finance API'den uzaklaş (en kısıtlayıcı ToS)

---

## GENEL RİSK MATRİSİ

| Risk Alanı | ABD | Türkiye | Öncelik |
|---|---|---|---|
| API ToS ihlali | 🔴 Yüksek | 🔴 Yüksek | **Acil** |
| BIST lisansı | — | 🔴 Yüksek | **Acil** |
| Yaşayan yatırımcı ismi | 🔴 Yüksek | 🔴 Yüksek | **Dil değiştir** |
| Ham veri telif hakkı | 🟢 Düşük | 🟡 Orta | Takip et |
| Vefat etmiş yatırımcı | 🟡 Orta | 🟡 Orta | Disclaimer yeter |
| SPK lisansı (tarama) | — | 🟢 Düşük | Güvenli |
