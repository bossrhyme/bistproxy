# DeepFin — Veri Sağlayıcı Teklif Talebi (RFP)
*Haziran 2026 · Gizli*

---

## 1. Platform Özeti

**DeepFin**, bireysel ve kurumsal yatırımcılara yönelik çok borsa hisse tarama (screener) ve analiz platformudur. Kullanıcılar temel/teknik kriterlere göre filtre uygulayarak hisse listesi oluşturur, hisse detay sayfalarında finansal metrikleri inceler ve portföy takibi yapar.

- **Öncelikli piyasa:** Borsa İstanbul (BIST)
- **Kapsam:** 25+ global borsa
- **Altyapı:** Vercel (serverless), Upstash Redis (KV cache), web uygulaması
- **Kullanıcı tipi:** Bireysel yatırımcılar

---

## 2. Mevcut Veri Gereksinimleri

### 2.1 Borsa İstanbul (BIST) — Öncelikli

#### Toplu Tarama Verisi
Tarayıcı her tetiklendiğinde tüm aktif BIST hisseleri (~600 hisse) için aşağıdaki alanlar istenmektedir:

**Fiyat & İşlem**
- Anlık/gecikmeli kapanış fiyatı (`close`)
- Günlük değişim (%) ve mutlak (`change`, `change_abs`)
- İşlem hacmi (`volume`)
- 10 günlük ortalama hacim (`average_volume_10d_calc`)
- Göreceli hacim (`relative_volume_10d_calc`)

**Değerleme**
- Piyasa değeri (`market_cap_basic`)
- F/K oranı — TTM (`price_earnings_ttm`)
- PD/DD oranı (`price_book_fq`)
- F/S oranı (`price_sales_current`)

**Karlılık**
- Öz kaynak karlılığı — ROE (`return_on_equity_fq`)
- Aktif karlılığı — ROA (`return_on_assets_fq`)
- Net kar marjı (`net_margin`)
- Brüt kar marjı (`gross_margin`)

**Büyüme**
- Yıllık gelir büyümesi — TTM (`revenue_growth_ttm_yoy`)
- Yıllık EPS büyümesi — TTM (`earnings_per_share_change_ttm_yoy`)
- Seyreltilmiş EPS — TTM (`earnings_per_share_diluted_ttm`)

**Bilanço & Sağlık**
- Borç/Öz Kaynak (`debt_to_equity_fq`)
- Cari oran (`current_ratio_fq`)
- Piotroski F-Skoru (`piotroski_f_score`)
- Temettü verimi (`dividends_yield`)
- Halka açıklık oranı (`float_shares_outstanding_percent`)

**Teknik**
- RSI (14)
- SMA 50, SMA 200
- MACD (sinyal dahil)
- ADX, +DI, -DI
- Bollinger Alt Bandı
- Stokastik K, D
- Beta (1 yıllık)
- 52 hafta yüksek/düşük

**Performans**
- Haftalık, 1 aylık, 3 aylık, 6 aylık, yıllık performans

**Sektör & Sınıflandırma**
- Sektör kodu, hisse tipi

#### Tekil Hisse Detay Verisi
Kullanıcı bir hisseye tıkladığında ek olarak:
- Tüm yukarıdaki metrikler (tekil)
- Sektör ortalaması karşılaştırması (aynı sektördeki ~100 hisse ortalaması)
- Anlık/gecikmeli fiyat, önceki kapanış, gün içi yüksek/düşük, açılış

---

### 2.2 Global Borsalar

Aynı veri seti aşağıdaki 25 borsa için de gerekmektedir:

| Borsa | Ülke | Para Birimi |
|---|---|---|
| NASDAQ | ABD | USD |
| NYSE | ABD | USD |
| S&P 500 | ABD | USD |
| DAX | Almanya | EUR |
| LSE | İngiltere | GBP |
| Nikkei (TSE) | Japonya | JPY |
| KRX | Güney Kore | KRW |
| Euronext Dublin | İrlanda | EUR |
| Euronext Lisbon | Portekiz | EUR |
| Euronext Brussels | Belçika | EUR |
| Euronext Amsterdam | Hollanda | EUR |
| Euronext Paris | Fransa | EUR |
| MOEX | Rusya | RUB |
| Oslo Børs | Norveç | NOK |
| Borsa Italiana (Milan) | İtalya | EUR |
| TSX | Kanada | CAD |
| TWSE | Tayvan | TWD |
| B3 (Bovespa) | Brezilya | BRL |
| HKEX | Hong Kong | HKD |
| SSE/SZSE | Çin | CNY |
| Tadawul | Suudi Arabistan | SAR |
| SIX | İsviçre | CHF |
| ASX | Avustralya | AUD |
| JSE | Güney Afrika | ZAR |
| NSE | Hindistan | INR |
| DFM/ADX | BAE | AED |
| Nasdaq Stockholm | İsveç | SEK |

---

### 2.3 Diğer Varlıklar

**Türk Yatırım Fonları (TEFAS)**
- Fon kodu, adı, fiyat, günlük değişim, toplam değer (TNA), getiri (1H/3H/6H/1Y/3Y/5Y)
- Fon türü, yönetici, risk skoru

**Kripto Para**
- Top 100–200 coin: fiyat, değişim (24s/7g), hacim, piyasa değeri
- İşlem çifti desteği (USDT, USD, TRY)

**Döviz Kurları**
- USD/TRY, EUR/TRY, GBP/TRY, JPY/TRY ve diğer çapraz kurlar
- Anlık/15 dk gecikmeli

---

## 3. Cache Stratejisi ve Gerçek API Kullanımı

> **Bu bölüm teklif fiyatlandırması için kritiktir.**

Platform, Upstash Redis (KV) üzerinde agresif caching uygulamaktadır. Bu sayede **N kullanıcı aynı veriye erişse bile veri sağlayıcısına yalnızca 1 API isteği gönderilmektedir.**

### Cache Süreleri

| Veri Türü | Cache Süresi | Açıklama |
|---|---|---|
| BIST toplu tarama | **60 dakika** | Tüm kullanıcılar 1 saatte 1 kez API çağrısı tetikler |
| Global borsa tarama | **15 dk (seans) / 30 dk (kapalı)** | Borsa saatine göre dinamik |
| Tekil hisse fundamentals | **30 dakika** | Detay sayfası ziyaretlerinde |
| Tekil hisse anlık fiyat | **2 dakika** | En sık çağrılan uç nokta |
| Döviz kurları | **15 dakika** | |
| Günlük EOD snapshot | **24 saat** | Yalnızca 1 kez çekilir, tüm gün kullanılır |
| Fon verileri | **30 dakika** | |
| Sembol listesi | **24 saat** | |

### Tahmini Günlük API Çağrısı (MVP Fazı)

| Endpoint | Çağrı/gün | Not |
|---|---|---|
| BIST toplu tarama | **~16** | 24 saat / 60 dk = 24, ama gece saatleri düşük trafik |
| Global borsa tarama (her borsa) | **~48–96/borsa** | Seans içi 15 dk, dışı 30 dk |
| Tekil hisse fundamentals | **~50–200** | Kullanıcı tıklama bazlı, cache ile paylaşımlı |
| Tekil hisse fiyat | **~100–500** | En aktif uç nokta |
| Döviz kurları | **~96** | 15 dk aralıklı |
| **Toplam (MVP)** | **~1.000–3.000/gün** | Büyümeyle birlikte ölçeklenir |

> **Ölçek notu:** 1.000 kullanıcı aynı anda BIST taraması yapsa bile veri sağlayıcısına giden istek sayısı değişmez — cache sistemi absorbe eder. API çağrısı kullanıcı sayısıyla değil, **cache TTL süreleriyle** orantılıdır.

---

## 4. İleriye Dönük Gereksinimler (6–18 Ay)

### Faz 2 — Gerçek Zamanlı Veri
- BIST için seans saatlerinde canlı fiyat (push veya polling, 1–5 sn aralıklı)
- Emir defteri (Level 2) — opsiyonel
- Anlık tarama güncellemesi (fiyat değiştikçe filtreler yeniden hesaplanacak)

### Faz 3 — Derinleştirilmiş Analiz
- **Çeyreklik/Yıllık finansal tablolar:** Gelir tablosu, bilanço, nakit akışı (5 yıl tarihsel)
- **Tarihsel fiyat verisi:** OHLCV, minimum 10 yıl, günlük granülasyon
- **Backtest altyapısı:** Tarihsel tarama — belirli bir tarihte kriterleri karşılayan hisseler
- **Kurumsal veriler:** Büyük pay sahipleri, yönetici hareketleri

### Faz 4 — Haber & Duyurular
- Hisse bazlı haber akışı (NLP kategorize edilmiş, TR+EN)
- KAP (Kamuyu Aydınlatma Platformu) entegrasyonu — BIST özel
- Kazanç açıklamaları takvimi

### Faz 5 — Alternatif Veri
- İçeriden işlem bildirimleri (insider trading)
- Analist hedef fiyatları ve önerileri
- Piyasa duyarlılığı (sentiment) skoru

---

## 5. Teknik Gereksinimler

| Gereksinim | Detay |
|---|---|
| **API tipi** | REST (JSON) — WebSocket Faz 2'de |
| **Kimlik doğrulama** | API key (header veya query param) |
| **Bulk endpoint** | Tek istekte tüm borsa verisi (kritik — per-symbol model kabul edilemez) |
| **Gecikme** | ≤15 saniye (serverless function timeout sınırı) |
| **Uptime SLA** | %99.5 ve üzeri |
| **Veri formatı** | JSON, ISO tarih formatı |
| **Tarihsel veri** | En az 5 yıl EOD |
| **Sandbox/test ortamı** | Entegrasyon öncesi test imkânı |
| **Ticari lisans** | Yayına alınabilir, veri yeniden dağıtıma uygun |

---

## 6. Kritik Gereksinim: Bulk Endpoint

**Per-symbol kredi modeli kullanılamaz.**

Örnek: BIST'te ~600 hisse bulunmaktadır. Eğer her sembol 1 kredi sayılıyorsa:
- 1 tarama = 600 kredi
- Saatte 1 tarama = 14.400 kredi/gün
- Bu model, herhangi bir makul günlük limiti dakikalar içinde tüketir.

**Beklenen model:** Tüm borsa verisi tek API çağrısında (veya exchange başına sabit maliyet), kullanıcı sayısı veya sembol sayısından bağımsız flat ücretlendirme.

---

## 7. Teklif İstenen Bilgiler

Teklif vermenizi talep ettiğimiz bilgiler:

1. **Desteklenen borsalar:** Yukarıdaki listeden hangilerini kapsıyorsunuz?
2. **Bulk endpoint:** Tüm borsa verisi tek istekte alınabilir mi? Maliyet modeli nedir?
3. **Veri alanları:** Bölüm 2.1'deki alanların tamamı mevcut mu?
4. **Gecikme:** EOD, 15 dk gecikmeli, gerçek zamanlı seçenekleri ve fiyatları
5. **Ticari lisans:** Yayına alınabilir, son kullanıcılara veri gösterilebilir mi?
6. **BIST özel:** Halka açıklık oranı, yabancı yatırımcı oranı mevcut mu?
7. **Fiyatlandırma:** MVP aşaması için (günde ~1.000–3.000 API çağrısı) aylık maliyet
8. **Büyüme fiyatlandırması:** 10x trafik artışında maliyet nasıl değişir?
9. **Deneme:** Test ortamı veya 30 günlük ücretsiz deneme imkânı
10. **SLA:** Uptime garantisi ve hata yönetimi politikası
11. **Tarihsel veri:** EOD tarihsel erişim kapsamı ve maliyeti

---

## 8. Değerlendirme Kriterleri

Teklifler aşağıdaki kriterlere göre değerlendirilecektir:

| Kriter | Ağırlık |
|---|---|
| BIST kapsamı ve veri kalitesi | 30% |
| Bulk endpoint desteği | 25% |
| Fiyat/performans | 20% |
| Ticari lisans uygunluğu | 15% |
| Teknik destek ve SLA | 10% |

---

## 9. İletişim & Zaman Çizelgesi

- **Teklif son tarihi:** [TARİH]
- **Teknik sorular için:** [E-POSTA]
- **Hedef entegrasyon tarihi:** [TARİH]

---

*Bu belge gizlidir. Veri gereksinimleri yaklaşık değerlerdir; gerçek kullanım cache yapısı nedeniyle önemli ölçüde daha düşük olabilir.*
