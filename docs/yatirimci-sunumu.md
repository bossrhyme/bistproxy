---
title: "DeepFin — Yatırımcı Sunumu"
subtitle: "Akıllı Hisse Tarama ve Analiz Platformu · Haziran 2026"
---

\newpage

# 1. Yönetici Özeti

**DeepFin**, BIST ve 28 global borsada hisse senedi, fon ve kripto varlıkları
profesyonel kriterlerle tarayan, yatırımcıların saatlerce süren analiz işini
saniyelere indiren bir web platformudur.

| | |
|---|---|
| **Ürün** | Çok borsa hisse tarama + analiz + portföy takibi (web + PWA) |
| **Hedef kitle** | Türkiye'deki ~9 milyon bireysel yatırımcı |
| **Durum** | Canlı MVP — 28 borsa, 15+ yatırımcı stratejisi lensi, kullanıcı sistemi |
| **Gelir modeli** | Freemium (Pro abonelik) + reklam + aracı kurum yönlendirme komisyonu |
| **Aylık işletme maliyeti (MVP)** | ~$200–350 |
| **Rakip fiyatı** | Fintables ₺240/ay — DeepFin bunu ₺99–149 ile kıracak |
| **Tohum yatırım talebi** | ₺10 milyon (~$285.000) · 24 ay yakım |

> **Tek cümleyle:** Fintables'ın yaptığını daha geniş kapsamda (global + fon +
> kripto) ve daha düşük fiyatla sunarak, Türkiye'nin hızla büyüyen bireysel
> yatırımcı kitlesini hedefliyoruz.

\newpage

# 2. Problem

Bireysel yatırımcı, doğru hisseyi bulmak için dağınık ve yetersiz araçlarla boğuşuyor:

### 2.1 Veri dağınık ve teknik
- F/K, PD/DD, ROE, borç/özkaynak gibi metrikler farklı sitelerde, farklı formatlarda
- Yatırımcı bu verileri manuel toplayıp Excel'e taşıyor → saatler kaybı

### 2.2 Tarama araçları ya pahalı ya yabancı
- **Fintables** (₺240/ay) sadece BIST temel analiz odaklı
- **TradingView** İngilizce, karmaşık, BIST temel verisi zayıf
- **Investing.com** reklam yoğun, tarama yüzeysel

### 2.3 Strateji bilgisi eksik
- Yatırımcı "Warren Buffett gibi nasıl seçerim?" diye soruyor ama kriterleri bilmiyor
- Profesyonel metodolojiler (Graham, Lynch, Greenblatt) sıradan kullanıcıya kapalı

### 2.4 Çoklu varlık tek yerde yok
- Hisse bir uygulamada, fon (TEFAS) başka yerde, kripto bambaşka bir uygulamada

> **Sonuç:** Yatırımcı 4-5 farklı araç arasında gezinerek vakit ve para kaybediyor,
> yine de bütüncül bir karar veremiyor.

\newpage

# 3. Çözüm — DeepFin

Tek platformda, Türkçe, sade arayüzle **tara → analiz et → takip et** döngüsü.

### 3.1 Akıllı Tarayıcı
- 35+ kriterle (temel + teknik) anlık filtreleme
- 28 borsa: BIST, NASDAQ, NYSE, DAX, LSE, Nikkei, B3, NSE, Tadawul ve daha fazlası
- Sonuçlar saniyeler içinde, sıralanabilir tabloda

### 3.2 Yatırımcı Lensleri (Farklılaştırıcı Özellik)
15+ efsanevi yatırımcının metodolojisi hazır filtre olarak:
- Buffett tarzı (kalite + değer), Graham (defansif/NCAV), Lynch (büyüme),
  Greenblatt (sihirli formül), O'Neil (CAN SLIM), Dreman (kontrarian)...
- Kullanıcı tek tıkla "Buffett kriterlerine uyan BIST hisseleri" listesini görür

### 3.3 Kriter Uyum Skoru
- Her hisse, seçilen stratejiye ne kadar uyduğunu gösteren puan alır (IQR tabanlı)
- Yatırımcı "en uyumlu" hisseleri tepede görür

### 3.4 Çoklu Varlık
- **Hisse** (28 borsa) + **Fon** (TEFAS, ~800 fon) + **Kripto** (top 100+)
- Hepsi aynı arayüz, aynı tarama mantığı

### 3.5 Kullanıcı Sistemi
- Portföy takibi, izleme listeleri, günlük giriş serisi (streak/XP — gamification)
- Hisse detay sayfası: sektör ortalaması karşılaştırması, 52 hafta bandı, teknikler

\newpage

# 4. Mevcut Ürün (Hazır ve Çalışıyor)

DeepFin bir fikir değil — canlı, çalışan bir MVP:

| Modül | Durum |
|---|---|
| Çok borsa tarayıcı (28 borsa) | (+) Canlı |
| Yatırımcı lensleri (15+) | (+) Canlı |
| Kriter uyum skorlama motoru | (+) Canlı |
| Fon tarama (TEFAS) | (+) Canlı |
| Kripto tarama | (+) Canlı |
| Kullanıcı/üyelik sistemi | (+) Canlı |
| Portföy + izleme listesi | (+) Canlı |
| Admin paneli + moderasyon | (+) Canlı |
| PWA (mobil uygulama deneyimi) | (+) Canlı |
| TR/EN çoklu dil | (+) Canlı |
| Agresif cache altyapısı (maliyet düşürücü) | (+) Canlı |

> **Teknik altyapı:** Vercel serverless + Upstash Redis cache. Sunucu maliyeti
> kullanıcı sayısıyla değil, cache sürelerine bağlı — bu sayede 10 kullanıcı da
> 10.000 kullanıcı da neredeyse aynı API maliyetini üretir (detay Bölüm 7).

\newpage

# 5. Pazar

### 5.1 Pazar Büyüklüğü (Türkiye)

| Katman | Tanım | Büyüklük |
|---|---|---|
| **TAM** | Türkiye'deki toplam bireysel yatırımcı | ~9 milyon hesap |
| **SAM** | Aktif işlem yapan, araç arayan yatırımcı | ~2–3 milyon |
| **SOM (3 yıl)** | DeepFin'in ulaşabileceği gerçekçi pay | 100–300 bin kullanıcı |

### 5.2 Neden Şimdi?
- Türkiye'de bireysel yatırımcı sayısı son 4 yılda **3 kattan fazla** arttı
- Enflasyon ortamı → halk birikimini hisse/fon/kriptoya yönlendiriyor
- Genç, mobil-öncelikli kitle → dijital finans araçlarına açık
- Yerli, Türkçe, kapsamlı bir tarama aracı boşluğu mevcut

\newpage

# 6. Rakip Analizi

| Özellik | **DeepFin** | Fintables | TradingView | Investing.com | Midas |
|---|:---:|:---:|:---:|:---:|:---:|
| BIST temel veri | (+) | (+) | (~) Zayıf | (+) | (+) |
| Global borsalar | (+) 28 | (-) | (+) | (+) | (~) Sınırlı |
| Fon (TEFAS) | (+) | (+) | (-) | (~) | (-) |
| Kripto | (+) | (-) | (+) | (+) | (~) |
| Yatırımcı lensleri | (+) 15+ | (-) | (-) | (-) | (-) |
| Türkçe & sade | (+) | (+) | (-) | (~) | (+) |
| Aylık fiyat | **₺99–149** | ₺240 | ~₺500+ | Reklam | Ücretsiz* |

\* Midas aracı kurumdur, geliri işlem komisyonundan gelir — tarama yan özelliktir.

### Konumlandırma
- **Fintables'a karşı:** Daha geniş kapsam (global + kripto), daha düşük fiyat
- **TradingView'a karşı:** Türkçe, sade, BIST temel verisi güçlü, lensler
- **Investing'e karşı:** Reklam kirliliği yok, gerçek tarama motoru
- **Benzersiz koz:** Yatırımcı lensleri + kriter uyum skoru — kimsede yok

\newpage

# 7. Gelir Modeli

Üç ayaklı gelir yapısı:

### 7.1 Freemium Abonelik (Ana Gelir)
| Plan | Fiyat | İçerik |
|---|---|---|
| **Ücretsiz** | ₺0 | BIST tarama (sınırlı kriter), reklamlı |
| **Pro** | ₺99–149/ay | Tüm borsalar, lensler, uyum skoru, reklamsız, portföy |
| **Pro Yıllık** | ₺990–1.490/yıl | 2 ay bedava |

> Fintables ₺240/ay'ı referans alıyoruz; daha geniş kapsamı daha ucuza sunarak
> fiyat avantajıyla pazar payı alıyoruz.

### 7.2 Reklam (Ücretsiz Kullanıcılar)
- Display reklam — finans nişi Türkiye'de görece yüksek RPM
- Gerçekçi varsayım: ücretsiz kullanıcı başına **₺3–8/ay** reklam geliri
- Ücretsiz kitle büyüdükçe taban gelir oluşturur, Pro'ya dönüşüm hunisini besler

### 7.3 Aracı Kurum Yönlendirme (Affiliate)
- "Bu hisseyi al" → anlaşmalı aracı kuruma yönlendirme
- Türkiye'de aracı kurumlar **hesap açan başına komisyon** ödüyor
- Yatırımcı niyeti yüksek kitle → değerli dönüşüm trafiği

\newpage

# 8. Maliyet Yapısı

### 8.1 Aylık İşletme Maliyeti — MVP Fazı (≤5.000 kullanıcı)

| Kalem | Aylık Maliyet | Not |
|---|---|---|
| Veri API (EODHD/Twelve Data) | $20–100 | Cache sayesinde düşük; bulk plan |
| Vercel (hosting/serverless) | $20–40 | Pro plan + kullanım |
| Upstash Redis (cache) | $0–30 | Ücretsiz tier → kademeli |
| E-posta (doğrulama/bildirim) | $0–20 | Resend/SendGrid başlangıç |
| Domain + SSL | ~$2 | Yıllık ~$15 |
| **Altyapı toplamı** | **~$50–190/ay** | ≈ ₺1.700–6.500 |
| İşçilik (kurucu/geliştirici) | Değişken | Aşağıda |

### 8.2 İşçilik
| Faz | İhtiyaç | Aylık (tahmini) |
|---|---|---|
| MVP → Lansman | 1 kurucu-geliştirici (mevcut) | Maaş/öz sermaye |
| Büyüme | +1 full-stack, +1 pazarlama | ₺120–200 bin |
| Ölçek | +müşteri destek, +veri mühendisi | Gelirle orantılı |

### 8.3 Kritik Maliyet Avantajı: Cache
> Platform her kullanıcı isteğini API'ye iletmez. BIST taraması **1 saat**,
> kur **15 dakika** cache'lenir. 1.000 kullanıcı aynı anda tarama yapsa bile
> veri sağlayıcısına giden istek sayısı **değişmez**. Bu, sektördeki çoğu
> rakibin doğrudan API maliyeti modeline karşı yapısal bir maliyet üstünlüğüdür.
>
> **Sonuç:** Kullanıcı 10x büyüse, veri maliyeti ~1.2x artar.

### 8.4 Pazarlama ve Kullanıcı Kazanımı Bütçesi

Bütçe üç faza bölünmüştür; lansman öncesi düşük, kullanıcı tabanı oluştukça
kaldıraç etkisiyle artar:

| Kanal | Faz 1 (Ay 1–6) | Faz 2 (Ay 7–18) | Faz 3 (Ay 19–36) |
|---|---|---|---|
| Google Ads (arama/display) | ₺10.000 | ₺30.000 | ₺60.000 |
| Meta / Instagram Ads | ₺8.000 | ₺20.000 | ₺40.000 |
| YouTube / içerik kampanyaları | ₺5.000 | ₺15.000 | ₺25.000 |
| Finans influencer iş birlikleri | ₺5.000 | ₺10.000 | ₺15.000 |
| SEO + blog içerik üretimi | ₺5.000 | ₺8.000 | ₺10.000 |
| **Aylık toplam** | **₺33.000** | **₺83.000** | **₺150.000** |

> **Pazarlama verimi hedefi:** CAC (Kullanıcı Edinme Maliyeti) < ₺30 (Pro
> dönüşümde LTV ~₺1.500 → LTV/CAC > 50). İlk 6 ay organik büyüme +
> SEO tabanlı düşük maliyetli denemeler; ölçümlenen kanallar optimize edildikten
> sonra bütçe artırılır.

\newpage

# 9. Birim Ekonomisi

Muhafazakâr varsayımlarla (1.000 aktif kullanıcı örneği):

| Metrik | Değer | Varsayım |
|---|---|---|
| Aktif kullanıcı | 1.000 | |
| Pro dönüşüm oranı | %5 | Sektör freemium ortalaması |
| Pro kullanıcı | 50 | |
| Pro geliri | ₺5.000–7.450/ay | 50 × ₺99–149 |
| Reklam geliri (950 ücretsiz) | ₺2.850–7.600/ay | ₺3–8/kullanıcı |
| Affiliate (tahmini) | ₺1.000–3.000/ay | dönüşüm bazlı |
| **Toplam gelir** | **₺8.850–18.050/ay** | |
| Altyapı maliyeti | ₺1.700–6.500/ay | |
| **Brüt kâr (işçilik hariç)** | **Pozitif** | |

> **Önemli:** Cache mimarisi sayesinde marjinal kullanıcı maliyeti ~sıfıra yakın.
> Her yeni Pro abonesi neredeyse tamamen kâra geçer.

\newpage

# 10. Finansal Projeksiyon (3 Senaryo · 36 Ay)

### 10.1 Baz Senaryo — Çeyreklik Büyüme Tablosu

Baz senaryo %5 Pro dönüşüm oranı ve büyüyen reklam+affiliate geliri varsayar.
Gider kolonuna pazarlama bütçesi, ekip büyümesi ve yüksek kullanım maliyetleri dahildir.

| Dönem | Aktif Kullanıcı | Aylık Gelir | Aylık Gider | Aylık Net |
|---|---|---|---|---|
| Ay 3 | 1.000 | ₺10.000 | ₺75.000 | -₺65.000 |
| Ay 6 | 3.500 | ₺35.000 | ₺110.000 | -₺75.000 |
| Ay 9 | 7.500 | ₺80.000 | ₺135.000 | -₺55.000 |
| Ay 12 | 14.000 | ₺145.000 | ₺160.000 | -₺15.000 |
| Ay 15 | 22.000 | ₺235.000 | ₺195.000 | **+₺40.000** |
| Ay 18 | 30.000 | ₺330.000 | ₺225.000 | **+₺105.000** |
| Ay 21 | 42.000 | ₺460.000 | ₺265.000 | **+₺195.000** |
| Ay 24 | 55.000 | ₺610.000 | ₺295.000 | **+₺315.000** |
| Ay 27 | 68.000 | ₺760.000 | ₺330.000 | **+₺430.000** |
| Ay 30 | 80.000 | ₺900.000 | ₺365.000 | **+₺535.000** |
| Ay 33 | 93.000 | ₺1.050.000 | ₺395.000 | **+₺655.000** |
| Ay 36 | 108.000 | ₺1.230.000 | ₺430.000 | **+₺800.000** |

> **Başabaş noktası (Baz):** ~14. ay — yatırım sonrası 14. ayda operasyonel
> kâra geçilmesi beklenmektedir.

### 10.2 Gider Yapısı (Ay 24 Baz Örneği — ₺295.000)

| Gider Kalemi | Aylık Tutar | Not |
|---|---|---|
| Ekip (geliştirici 2, pazarlama 1, destek 1) | ₺175.000 | Piyasa altı + hisse opsiyonu |
| Pazarlama kampanyaları | ₺80.000 | Faz 2 bütçesi |
| Veri API + altyapı | ₺28.000 | EODHD/Matriks + Vercel Pro |
| İdari + hukuki + muhasebe | ₺12.000 | Destek hizmetleri |
| **Toplam** | **₺295.000** | |

### 10.3 Yüksek Kullanım Maliyeti Projeksiyonu

Cache mimarisi veri maliyetini bastırır; ancak 50K+ kullanıcıda enterprise
BIST lisansı gerekebilir:

| Kullanıcı Bandı | Veri Sağlayıcı | Aylık Veri Maliyeti |
|---|---|---|
| 0 – 5.000 | EODHD All-World | €20 (~₺750) |
| 5.000 – 30.000 | EODHD Pro + ek endpoints | €50–150 (~₺1.800–5.500) |
| 30.000 – 100.000 | EODHD Business / Matriks BIST | $300–800 (~₺10.000–28.000) |
| 100.000+ | Kurumsal veri anlaşması | Görüşmeye bağlı |

> Cache sayesinde 30.000 → 100.000 kullanıcı sıçraması veri maliyetini ancak
> ~3x artırır; gelir ise ~4x büyür. Marjinal veri maliyeti gelirin %3–5'ini geçmez.

### 10.4 36. Ay Senaryo Karşılaştırması

| | Muhafazakâr | **Baz** | İyimser |
|---|---|---|---|
| Aktif kullanıcı | 40.000 | **108.000** | 250.000 |
| Pro dönüşüm | %3 | **%5** | %7 |
| Pro abone | 1.200 | **5.400** | 17.500 |
| Aylık Pro geliri | ₺144.000 | **₺650.000** | ₺2.100.000 |
| Aylık reklam + affiliate | ₺80.000 | **₺580.000** | ₺1.400.000 |
| **Aylık toplam gelir** | **₺224.000** | **₺1.230.000** | **₺3.500.000** |
| Aylık işletme gideri | ₺200.000 | ₺430.000 | ₺900.000 |
| **Aylık net (Ay 36)** | Başabaş | **+₺800.000** | **+₺2.600.000** |
| Başabaş ayı | ~Ay 22 | **~Ay 14** | ~Ay 9 |

*Rakamlar tahminîdir; pazar koşulları ve dönüşüm oranlarına bağlıdır.*

\newpage

# 11. Yol Haritası

### Faz 1 — Lansman (0–6 ay)
- Lisanslı veri kaynağına geçiş (EODHD/Matriks) → hukuki risk sıfırlama
- Pro abonelik + ödeme entegrasyonu (iyzico/Stripe)
- Reklam entegrasyonu

### Faz 2 — Büyüme (6–12 ay)
- Mobil native uygulama (iOS/Android)
- Gerçek zamanlı fiyat (seans içi)
- Aracı kurum affiliate anlaşmaları

### Faz 3 — Derinleşme (12–18 ay)
- Çeyreklik finansal tablolar, 10 yıl tarihsel veri
- Backtest motoru ("bu strateji geçmişte ne getirdi")
- KAP haber entegrasyonu (BIST'e özel)

### Faz 4 — Ölçek (18–24 ay)
- Analist hedef fiyatları, sentiment skoru
- Kurumsal/B2B veri paketi
- Bölgesel genişleme (MENA borsaları)

\newpage

# 12. Risk ve Çözümlerimiz

| Risk | Çözüm |
|---|---|
| **Veri lisansı / ToS** | Mevcut gayriresmi kaynaklardan lisanslı sağlayıcıya geçiş planı hazır (EODHD €20/ay, bulk endpoint mimarimize uygun). Hukuki risk analizi yapıldı. |
| **BIST veri lisansı** | Borsa İstanbul Veri Dağıtım Sözleşmesi sürecine girilecek; maliyet projeksiyona dahil. |
| **SPK düzenlemesi** | Tarama aracı = kişiselleştirilmiş tavsiye DEĞİL → SPK lisansı gerekmiyor (hukuki analizle teyit edildi). Disclaimer'lar mevcut. |
| **Rakip baskısı** | Lensler + çoklu varlık + fiyat avantajı = savunulabilir farklılaşma |
| **Veri maliyeti büyüme** | Cache mimarisi → kullanıcı 10x, maliyet ~1.2x |
| **Yatırımcı ismi kullanımı** | "Buffett tarzı" tanımlayıcı dil + disclaimer (hukuki rapor önerisi uygulandı) |

\newpage

# 13. Yatırım Talebi

### Tohum Tur — ₺10.000.000 (~$285.000 USD)

| | |
|---|---|
| **Talep edilen tutar** | ₺10.000.000 (~$285.000) |
| **Tur tipi** | Tohum (Seed) |
| **Enstrüman** | Dönüştürülebilir tahvil veya eşit hisse |
| **Hedef yakım süresi** | 24 ay (yatırımla 14. ayda kara geçiş) |
| **Aylık ortalama yakım** | ₺320.000 (ilk 12 ay) → gelirle azalan |
| **Değerleme kapısı** | Müzakereye açık |

### Neden Yatırım?
- (+) **Ürün hazır** — fikir değil, çalışan canlı MVP
- (+) **Yapısal maliyet avantajı** — cache mimarisi (kullanıcı 10x, maliyet 1.2x)
- (+) **Net farklılaşma** — lensler + çoklu varlık, rakiplerde yok
- (+) **Büyüyen pazar** — Türkiye'de 9 milyon bireysel yatırımcı
- (+) **Hızlı başabaş** — Baz senaryoda 14. ayda operasyonel kara geçiş

### Sermaye Kullanımı (₺10.000.000 dağılımı)
| Alan | Tutar | Pay | Detay |
|---|---|---|---|
| Pazarlama + kullanıcı kazanımı | ₺4.500.000 | %45 | 24 aylık performans pazarlaması, içerik, influencer |
| Ekip büyümesi | ₺3.000.000 | %30 | +2 geliştirici, +1 pazarlama, +1 destek (24 ay) |
| Veri lisansları + altyapı | ₺1.500.000 | %15 | BIST lisansı, EODHD/Matriks, Vercel Pro (24 ay) |
| Hukuki + SPK + operasyon | ₺500.000 | %5 | BIST veri dağıtım sözleşmesi, SPK danışmanlık |
| Yedek / beklenmedik | ₺500.000 | %5 | Tampon |
| **Toplam** | **₺10.000.000** | **%100** | |

### Yakım Takvimi (Baz Senaryo)

| Dönem | Aylık Gider | Aylık Gelir | Net Nakit | Kümülatif Bakiye |
|---|---|---|---|---|
| Ay 1–3 | ₺75.000 | ₺10.000 | -₺65.000 | ₺9.805.000 |
| Ay 4–6 | ₺110.000 | ₺35.000 | -₺75.000 | ₺9.580.000 |
| Ay 7–9 | ₺135.000 | ₺80.000 | -₺55.000 | ₺9.415.000 |
| Ay 10–12 | ₺160.000 | ₺145.000 | -₺15.000 | ₺9.370.000 |
| Ay 13–15 | ₺195.000 | ₺235.000 | **+₺40.000** | ₺9.490.000 |
| Ay 16–18 | ₺225.000 | ₺330.000 | **+₺105.000** | ₺9.805.000 |
| Ay 19–24 | ₺280.000 | ₺530.000 | **+₺250.000** | ₺11.300.000+ |

> Yatırım tutarı 14. aya kadar platformu taşır. 14. ayda operasyonel kara
> geçilmesi beklenmekte, kalan bakiye büyüme ivmesi için kullanılmaktadır.

\newpage

# 14. Özet

**DeepFin**, Türkiye'nin büyüyen bireysel yatırımcı kitlesine, profesyonel
seviyede tarama ve analiz araçlarını Türkçe, sade ve uygun fiyatla sunan,
halihazırda **canlı ve çalışan** bir platformdur.

- **Problem:** Dağınık, pahalı, yabancı, eksik araçlar
- **Çözüm:** Tek platformda 28 borsa + fon + kripto + yatırımcı lensleri
- **Model:** Freemium + reklam + affiliate
- **Avantaj:** Cache tabanlı yapısal maliyet üstünlüğü + benzersiz lens özelliği
- **Durum:** MVP canlı, lansmana hazır

> **DeepFin, Fintables'ın boşluğunu daha geniş ve daha ucuz kapatıyor.**

---

*Bu belge gizlidir ve yalnızca değerlendirme amaçlıdır. Finansal projeksiyonlar
tahminî olup garanti niteliği taşımaz.*
