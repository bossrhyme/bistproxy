# DeepFin — Finansal Veri Sağlayıcı Raporu
*Türkiye Merkezli Ticari Hisse Senedi Tarayıcı İçin · Haziran 2026*

---

## Kritik Başlangıç Noktası: TradingView Veri DEĞİL, Sadece Grafiktir

**TradingView Advanced Charts (eski adı Charting Library):**
- Saf görselleştirme aracı — sıfır veri içeriyor
- Kendi veri kaynağını `Datafeed API` ile bağlarsın (WebSocket / REST)
- **Ücretsiz** kullanım koşulu: TradingView logosu görünür, içerik paywall arkasında değil
- Ticari / white-label (logo kaldırma) → Enterprise lisans, özel fiyat

**TradingView widget** (JS snippet): Attribution ile ticari kullanımda ücretsiz — ama widget'taki veriyi kendi veritabanına taşıyamazsın.

**Sonuç: TradingView grafik sorununu çözer, veri sorununu çözmez.**

---

## Katman 1: Türkiye'ye Özgü (BIST Lisanslı) Sağlayıcılar

| Sağlayıcı | API | BIST Kapsam | Temel Veri (F/K, ROE...) | Fiyat |
|---|---|---|---|---|
| **Matriks Data** | ✅ REST + MQTT | Gerçek zamanlı | ✅ Kapsamlı | Özel teklif |
| **Finnet** | ✅ 1200+ fonksiyon | Gerçek zamanlı | ✅ Kapsamlı | Özel teklif |
| **VERDA (BIST direkt)** | ✅ REST API | Resmi/gerçek zaman | ⚠️ Sadece fiyat | Test ücretsiz |
| **Foreks/ForInvest** | ⚠️ Sınırlı | Var | ✅ | Özel teklif |
| **Algolab (DenizBank)** | ✅ REST + WSS | Gerçek zamanlı | ❌ Trading odaklı | Özel teklif |

**VERDA API** (verda.borsaistanbul.com):
- Borsa İstanbul'un resmi REST API'si
- Test ortamı ücretsiz (BIST-Connect taahhütnamesi + Help Desk başvurusu)
- Sadece fiyat/derinlik; F/K, ROE için ek kaynak şart
- En güvenli legal yol BIST fiyat verisi için

**Matriks Data** (matriksdata.com):
- BIST lisanslı distribütör, en kapsamlı Türkiye çözümü
- REST + MQTT streaming
- Startup için özel teklif istemek mantıklı ilk adım

---

## Katman 2: Global Sağlayıcılar — BIST Kapsamı

| Sağlayıcı | BIST Desteği | Temel Veri | Ticari Fiyat | Not |
|---|---|---|---|---|
| **Twelve Data** | ✅ Açıkça belirtilmiş | ✅ | $29/ay (başlangıç) | En ucuz giriş |
| **EODHD** | ✅ Muhtemelen (60+ borsa) | ✅ Kapsamlı | $399/ay ticari | Redistribution hakkı dahil |
| **Tiingo** | ✅ Türkiye açıkça listede | ⚠️ US odaklı temel | Özel teklif | OHLCV güçlü |
| **FMP** | ⚠️ Belirsiz (46 ülke) | ✅ Çok kapsamlı | Özel teklif | BIST onaylanmalı |
| **Finnhub** | ⚠️ Belirsiz | ✅ | $50/ay/borsa | BIST doğrulanmalı |
| **Alpha Vantage** | ⚠️ Belirsiz | ❌ Fiyat odaklı | $50/ay | Temel veri zayıf |
| **Polygon.io** | ❌ Sadece ABD | ❌ | — | **BIST YOK, kullanma** |
| **Investing.com** | — | — | ❌ Resmi API yok | **Kullanma** |
| **Intrinio** | ❌ US odaklı | Sınırlı | $150+/ay | BIST yok |

---

## Önerilen Mimari

```
┌─────────────────────────────────────────────────────┐
│                  DeepFin Frontend                   │
├──────────────────┬──────────────┬───────────────────┤
│  Grafik          │  Tarama /    │   Temel Veri      │
│  (Fiyat hareketi)│  Filtreleme  │  (F/K, ROE,       │
│                  │  Motoru      │   Bilanço...)     │
└────────┬─────────┴──────┬───────┴────────┬──────────┘
         │                │                │
   TradingView       Twelve Data /    Matriks Data
   Advanced Charts   EODHD            veya Finnet
   (TV attribution   (Fiyat + OHLCV)  (BIST temel
   ile ücretsiz)                       verisi)
```

---

## Bütçeye Göre Yol Haritası

### Faz 1 — MVP ($0–200/ay)
- **Grafik**: TradingView Advanced Charts (attribution ile ücretsiz)
- **Global veri**: Twelve Data Starter ($29/ay) — BIST dahil, OHLCV + temel veri
- **BIST fiyat**: VERDA test ortamı (ücretsiz, kurumsal kayıt sonrası)
- **BIST temel verisi**: Matriks / Finnet'e teklif iste

### Faz 2 — İlk Kullanıcılar ($200–600/ay)
- **Grafik**: TradingView Advanced Charts (hâlâ ücretsiz attribution ile)
- **Global veri**: EODHD ticari lisans ($399/ay) — redistribution hakkı dahil
- **BIST**: Matriks Data sözleşmesi (temel veri dahil)

### Faz 3 — Ölçeklendirme ($600+/ay)
- TradingView Enterprise (logo kaldırma)
- Borsa İstanbul resmi Data Distribution Agreement
- EODHD veya FMP Enterprise

---

## Bu Hafta Yapılacaklar

1. **Twelve Data BIST test:**
   `https://api.twelvedata.com/stocks?country=Turkey`

2. **EODHD BIST test:**
   `https://eodhd.com/api/exchange-symbol-list/IS` (IS = İstanbul)

3. **Matriks Data mail:**
   "Startup, geliştirme aşamasındayız, BIST fiyat + temel veri API için teklif"

4. **VERDA hesabı aç:**
   verda.borsaistanbul.com — test ortamı ücretsiz

5. **Yahoo Finance / ücretsiz Finnhub kaldır** — ToS ihlali

---

## Özet Karar Tablosu

| İhtiyaç | Öneri |
|---|---|
| Sadece grafik | TradingView Advanced Charts (attribution ile ücretsiz) |
| BIST fiyat + temel veri | Matriks Data veya Finnet (lisanslı) |
| Global + BIST fiyat ucuza | Twelve Data ($29/ay, BIST var) |
| Global temel veri kapsamlı | EODHD ($399/ay ticari) |
| Hukuki risk sıfır BIST fiyat | VERDA (Borsa İstanbul direkt API) |
| Polygon.io | ❌ Sadece ABD, kullanma |

---

## Fiyat Karşılaştırması (Aylık)

| Senaryo | Toplam Maliyet |
|---|---|
| Geliştirme (MVP) | $0–50/ay |
| İlk kullanıcılar (Twelve Data + VERDA) | $30–100/ay |
| Profesyonel (EODHD + Matriks) | $400–800/ay |
| Kurumsal (TV Enterprise + BIST sözleşme) | $1.000+/ay |

---

## Kaynaklar

- VERDA API: https://verda.borsaistanbul.com
- Matriks Data: https://www.matriksdata.com
- Finnet: https://www.finnet.com.tr
- Twelve Data: https://twelvedata.com
- EODHD: https://eodhd.com/commercial-pricing
- TradingView Advanced Charts: https://www.tradingview.com/advanced-charts/
- Borsa İstanbul Distribütörler: https://www.borsaistanbul.com/en/data/data-dissemination/data-vendors-directory
