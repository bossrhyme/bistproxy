# Global Finansal Veri API Karşılaştırması
### DeepFin — Screener için Veri Kaynağı Değerlendirmesi
**Tarih:** Haziran 2026

---

## Araştırma Kapsamı

Bu rapor, DeepFin hisse senedi tarayıcısı için global finansal veri API'lerini kapsamlı biçimde değerlendirmektedir. Değerlendirilen API'ler: **EODHD**, **FMP (Financial Modeling Prep)**, **Alpha Vantage** ve **Polygon.io**.

---

## 1. Alpha Vantage

### Borsa Kapsamı
Alpha Vantage, **200.000+ ticker ve 20+ global borsa** kapsar.

| Borsa | Bölge |
|---|---|
| NYSE / NASDAQ | ABD |
| London Stock Exchange (LSE) | İngiltere |
| Toronto Stock Exchange (TSX) | Kanada |
| NSE / BSE India | Hindistan |
| JSE Johannesburg | Güney Afrika |
| Euronext | Avrupa |
| Stockholm / Copenhagen (OMX) | İskandinavya |
| Shanghai / Shenzhen | Çin |
| Taiwan Stock Exchange | Tayvan |

> **Not:** Uluslararası borsa kapsamı topluluk testlerine dayanmaktadır; resmi olarak tüm borsalar belgelenmemiştir. ASX (Avustralya) desteklenmiyor görünmektedir.

### Temel Veriler (Fundamental Data)
`OVERVIEW` endpoint'i yaklaşık **59 alan** döndürür:

**Değerleme Oranları:** P/E (trailing + forward), PEG, P/B, P/S  
**Karlılık:** ROE (TTM), ROA (TTM), Net Kar Marjı, EBITDA, EPS  
**Büyüme:** Çeyreklik kazanç büyümesi (YoY), Çeyreklik gelir büyümesi (YoY)  
**Finansal Sağlık:** Borç/Özsermaye, Toplam varlık/yükümlülük, Serbest nakit akışı  
**Piyasa Verileri:** Piyasa değeri, Beta, 52 haftalık yüksek/düşük, Temettü verimi

Ayrıca ayrı endpoint'ler: Gelir Tablosu, Bilanço, Nakit Akışı (yıllık + çeyreklik)

### Screener Özelliği
**Toplu screener endpoint'i YOK.** Her ticker için ayrı `OVERVIEW` çağrısı yapılması gerekir. 5.000 hisseyi P/E ve ROE'ya göre filtrelemek için 5.000 ayrı API çağrısı gerekir.

### Fiyatlandırma

| Plan | Aylık Ücret | Hız Limiti | Gerçek Zamanlı |
|---|---|---|---|
| Ücretsiz | $0 | 5 istek/dk + **25 istek/gün** | Hayır (15 dk gecikme) |
| Premium 75 | $49,99 | 75 istek/dk, günlük sınır yok | 15 dk gecikme |
| Premium 150 | $99,99 | 150 istek/dk | Evet (ABD) |
| Premium 300 | $149,99 | 300 istek/dk | Evet |
| Premium 600 | $199,99 | 600 istek/dk | Evet |
| Premium 1200 | $249,99 | 1.200 istek/dk | Evet |

> **Önemli:** Ücretsiz tier, 500/gün'den **25/gün'e** düşürüldü — geliştirme için neredeyse kullanılamaz hale geldi.

---

## 2. Polygon.io (Massive.com)

### Borsa Kapsamı
**Polygon.io yalnızca ABD'ye odaklanmaktadır.**

- Tüm 19 ABD hisse senedi borsası (NYSE, NASDAQ, Cboe vb.)
- FINRA işlem raporlama tesisleri
- Dark pools ve OTC piyasaları
- 10.000+ aktif ABD hissesi

**Uluslararası borsalar DESTEKLENMIYOR:** LSE, Tokyo TSE, NSE Hindistan, B3 Brezilya, Euronext, XETRA/DAX.

Polygon'un diğer varlık sınıfları: Forex (1.000+ parite), Kripto (166+ çift), ABD Opsiyonları, ABD Endeksleri.

### Temel Veriler (Fundamental Data)
Polygon, **2024 yılında** fundamentals suite'i başlattı:

**`/vX/reference/financials`** — Gelir tablosu, bilanço, nakit akışı (yıllık + çeyreklik)  
**Günlük oranlar feed'i:** P/E, P/B, ROE, D/E, EV/EBITDA, P/S

> **Not:** Fundamentals verisi 2024'te yeni başlatıldığından Alpha Vantage'a kıyasla daha az olgunlaşmış olabilir.

### Screener Özelliği
**Toplu fundamental screener YOK.**

- **Piyasa Snapshot:** 10.000+ ABD hissesini tek çağrıda döndürür — ancak **yalnızca fiyat/hacim verisi** (P/E, ROE yok)
- Fundamentals verisi: Ticker başına ayrı çağrı gerektirir
- `/v3/reference/tickers`: Borsa, tür, aktifliğe göre filtreler — fundamental metrik filtresi yok

### Fiyatlandırma

| Plan | Aylık Ücret | Veri Gecikmesi | Tarihsel Veri |
|---|---|---|---|
| Ücretsiz | $0 | 15 dk | 2 yıl |
| Starter | $29 | 15 dk | 5 yıl |
| Developer | $79 | Yakın gerçek zamanlı | 10 yıl |
| Advanced | $199 | Gerçek zamanlı | 20+ yıl |
| All-Access | $399 | Gerçek zamanlı | 20+ yıl (tüm varlık sınıfları) |
| Business | $1.999 | Gerçek zamanlı | 20+ yıl + düz dosyalar |

---

## 3. Karşılaştırma Özeti

| Özellik | EODHD All-In-One | FMP Premium | Alpha Vantage | Polygon.io |
|---|---|---|---|---|
| **Global borsa sayısı** | 70+ borsa | 60+ borsa | 20+ borsa | [HAYIR] Yalnızca ABD |
| **BIST kapsamı** | [HAYIR] Fiyat verisi yok | [KISITLI] Sınırlı | [HAYIR] Yok | [HAYIR] Yok |
| **NSE Hindistan** | [EVET] Var | [EVET] Var | [EVET] Var | [HAYIR] Yok |
| **B3 Brezilya** | [EVET] Var | [KISITLI] Kısmi | [KISITLI] Belirsiz | [HAYIR] Yok |
| **Fundamental veriler** | [EVET] Kapsamlı | [EVET] Kapsamlı | [EVET] 59+ alan | [EVET] Yeni (2024) |
| **Bulk screener** | [EVET] Gerçek server-side | [HAYIR] Client-side filtre | [HAYIR] Per-ticker çağrı | [HAYIR] Fiyat snapshot'ı |
| **P/E / ROE filtre** | [EVET] Doğrudan filtre param | [KISITLI] Client-side gerekir | [HAYIR] Ayrı çağrı | [HAYIR] Desteklenmiyor |
| **Ücretsiz tier** | Yok (ücretli başlar) | Sınırlı | 25 istek/gün | 5 istek/dk |
| **Giriş planı** | €99,99/ay | $79/ay | $49,99/ay | $29/ay |
| **Gerçek zamanlı veri** | €99,99/ay+ | $79/ay+ | $99,99/ay+ | $199/ay |
| **En yüksek plan** | €99,99/ay (all-in) | $209/ay | $249,99/ay | $399/ay |

---

## 4. Temel Bulgular

### Hiçbir API'de Gerçek Anlamda Toplu Screener Yok (EODHD hariç)
EODHD, screener endpoint'inde P/E, ROE, P/B gibi parametreleri doğrudan filtre olarak kabul eden tek platformdur. Diğerleri her ticker için ayrı API çağrısı gerektirir.

### Uluslararası Kapsam: EODHD Açık Ara Kazanıyor
- Polygon.io: Yalnızca ABD — uluslararası hisse taraması için kesinlikle elendi
- Alpha Vantage: 20+ borsa var ama screener yok, per-ticker fundamentals çok pahalıya gelir
- FMP: İyi kapsam, ancak screener'ı native P/E/ROE filtresi desteklemiyor
- EODHD: 70+ borsa + screener endpoint = en iyi seçenek

### Polygon'un Fundamentals Verisi Yeni
2024'te başlatılan Polygon financials suite henüz olgunlaşmamış. Alpha Vantage'ın yıllardır sağladığı 59+ alanlık OVERVIEW endpoint'iyle rekabet etmesi zaman alacak.

### Alpha Vantage'ın Ücretsiz Tier'ı Artık Kullanılamaz
Günlük 500 istek'ten 25 istek'e düşürülen limit, geliştirme sürecini ciddi ölçüde kısıtlıyor.

---

## 5. DeepFin için Öneri

    Mimari Oneri:
    =====================================================
    EODHD All-In-One (99,99 EUR/ay)
      - 70+ global borsa
      - Server-side screener (P/E, ROE, P/B filtresi)
      - EOD fiyat + temel veriler

    Matriks (Anlasma yapilacak)
      - BIST tam kapsam
      - Halka aciklik orani, yabanci yatirimci orani
      - KAP verileri

    Toplam: ~$215-250/ay -> Scraping bagimliligi %85-90 azalir
    =====================================================

---

## Kaynaklar

- Alpha Vantage Premium Fiyatlandırma: alphavantage.co/premium
- Alpha Vantage API Dokümantasyonu: alphavantage.co/documentation
- Alpha Vantage GAAP Alan Dokümantasyonu: documentation.alphavantage.co
- Polygon.io Fiyatlandırma: polygon.io/pricing
- Massive Blog — Polygon Financials Duyurusu: massive.com/blog
- Polygon Rate Limit Bilgi Tabanı: polygon.io/knowledge-base
- QVeris Alpha Vantage Fiyat Rehberi: qveris.ai/guides/alpha-vantage-pricing-alternative
- Alphanume — Polygon Alternatifleri: alphanume.com/blog
- Financial Data APIs Compared 2025: ksred.com

---

*Bu rapor DeepFin projesi kapsamında hazırlanmıştır. Veriler Haziran 2026 itibarıyla günceldir.*
