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

# 10. Finansal Projeksiyon (3 Senaryo · 24 Ay)

| | Muhafazakâr | Baz | İyimser |
|---|---|---|---|
| 24. ay aktif kullanıcı | 10.000 | 30.000 | 80.000 |
| Pro dönüşüm | %3 | %5 | %7 |
| Pro abone | 300 | 1.500 | 5.600 |
| Aylık Pro geliri | ~₺36 bin | ~₺180 bin | ~₺670 bin |
| Aylık reklam+affiliate | ~₺40 bin | ~₺150 bin | ~₺450 bin |
| **Aylık toplam gelir** | **~₺76 bin** | **~₺330 bin** | **~₺1,1 milyon** |
| Aylık işletme gideri | ~₺60 bin | ~₺180 bin | ~₺400 bin |
| **Aylık net** | Başabaş | **Pozitif** | **Güçlü pozitif** |

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

### Neden Yatırım?
- (+) **Ürün hazır** — fikir değil, çalışan canlı MVP
- (+) **Yapısal maliyet avantajı** — cache mimarisi
- (+) **Net farklılaşma** — lensler + çoklu varlık, rakiplerde yok
- (+) **Büyüyen pazar** — Türkiye bireysel yatırımcısı patlama halinde
- (+) **Düşük yakım** — aylık ~$200 altyapıyla ayakta

### Sermaye Kullanımı (Talep edilen tutarın dağılımı)
| Alan | Pay | Amaç |
|---|---|---|
| Veri lisansları (BIST + global) | %30 | Hukuki risk sıfırlama, premium veri |
| Ekip (geliştirme + pazarlama) | %40 | Mobil uygulama, büyüme |
| Kullanıcı kazanımı (pazarlama) | %20 | Performans pazarlaması, içerik |
| Operasyon/yedek | %10 | Altyapı, beklenmedik |

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
