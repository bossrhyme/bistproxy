# Veri Kaynakları Araştırması — DeepFin için Çekilebilir API'ler

> **Tarih:** 2026-06-16 · **Bağlam:** "Bize faydası olacak, veri çekebileceğimiz siteler" araştırması.
> **Not (kaynak sayfa):** `aimultiple.com/ai-financial-research` crawler'a **HTTP 403** döndü (bot engeli). İçerik, web aramalarıyla yeniden kuruldu ve **DeepFin'in mevcut stack'ine + entegrasyon planına** göre süzüldü. Bu doküman yalnızca araştırma amaçlıdır; kod değişikliği yok.

---

## 0. Mevcut Veri Stack'imiz (ve Riski)

| Kaynak | Ne için | Resmî mi? | Risk |
|---|---|---|---|
| **TradingView** (48 ref) | Ana tarayıcı, temel veri, haber, teknik | ❌ Resmî değil (scraping) | **Yüksek** — tek nokta arıza; ban yedik/sertleştirdik |
| **Yahoo Finance** (39) | Fiyat, temel veri | ❌ Resmî değil | Orta — kırılgan |
| **İş Yatırım** | BIST Türkiye verisi | ❌ Scraping | Orta |
| **TEFAS** | Türk yatırım fonları | ⚠️ Yarı-resmî | Düşük |
| **CoinGecko** | Kripto fiyat/piyasa | ✅ Resmî API | Düşük (rate limit) |
| **Finnhub** (5) | Az kullanım | ✅ Resmî API | Düşük |

> **Ana stratejik bulgu:** Çekirdek verimiz **resmî olmayan TradingView/Yahoo scraping'ine** bağımlı — kırılgan ve ban riskli. Aşağıdaki resmî, ücretsiz-katmanlı kaynaklar hem **yeni veri** ekler hem **yedek/çeşitlendirme** ile bu riski düşürür.

---

## 1. Önerilen Yeni Kaynaklar (Kategoriye Göre)

### A. Haber & Duygu Analizi (Sentiment) — ⭐ EN YÜKSEK STRATEJİK DEĞER

Bizde **hiç yok**. Mockup'un "açıklanabilirlik" ve Uyum Puanı vizyonuna doğrudan yeni bir **4. karar ailesi: "Duygu/Haber Sinyali"** ekler.

| Kaynak | Veri | Ücretsiz katman | DeepFin'e faydası |
|---|---|---|---|
| **Marketaux** | Hisse+kripto+forex haber, varlık etiketli, −1..+1 duygu skoru | ✅ Ticker filtreli free tier | Her hisse/coin'e "haber duygusu" skoru → yeni sinyal + "Neden Eşleşti" içine "son haberler pozitif ✓" |
| **EODHD News+Sentiment** | Hisse/ETF/kripto duygu (−1..+1), haber+sosyal medya birleşik | ✅ Sınırlı free | Aynı + global kapsam |
| **Alpha Vantage News & Sentiment** | Hisse/forex/kripto haber + konu-bazlı duygu (makro/teknoloji…) | ✅ Free key (MCP sunucusu da var) | Tek API'de fiyat+temel+haber duygu; LLM/agent dostu |
| **Adanos** | Reddit + X/Grok + haber + Polymarket + kripto, dokümante BuzzScore | ✅ Gerçek free tier | Sosyal duygu (meme coin/momentum için ideal) |

**Nasıl kullanılır:** Yeni `api/sentiment.js` → bir hisse/coin için haber duygu skoru çek, tabloya "Duygu" rozeti, detay/drawer'da "son N haber, ortalama duygu +0.4" satırı. Uyum Puanı'na opsiyonel ağırlık.

---

### B. Analist Tahminleri / Fiyat Hedefi / Derecelendirme — ⭐ YÜKSEK

Bizde **yok**. Yeni kolon + "Wall Street hedefi" anlatımı; özellikle **temel/kalite mercekleri** zenginleşir.

| Kaynak | Veri | Ücretsiz | Fayda |
|---|---|---|---|
| **Financial Modeling Prep (FMP)** | Konsensüs tahmin, fiyat hedefi, derece notları (sürekli güncel) | ✅ Free plan (30 yıl geçmiş dahil) | "Hedef fiyat / yükseliş potansiyeli %X" kolonu; upgrade/downgrade akışı |
| **Finnhub** | Fiyat hedefi, upgrade/downgrade, kazanç sürprizi, kazanç takvimi | ✅ Cömert free tier (zaten hesabımız olabilir) | Kazanç takvimi → "kazanç açıklaması yakın" uyarısı; O'Neil/CAN SLIM için |
| **Tradefeeds** | Analist tavsiye/konsensüs/hedef, JSON REST | Ücretli ağırlıklı | Yedek |

**Nasıl kullanılır:** `api/fundamentals.js`'i FMP/Finnhub ile genişlet; "Analist" sekmesi + tabloya "Hedef %" kolonu. Mevcut detay ekranımıza (sektör/haber sekmeleri yanına) "Analist" sekmesi doğal oturur.

---

### C. İçeriden İşlem & Kurumsal Sahiplik (Insider / 13F) — ORTA-YÜKSEK

Bizde **yok**. **O'Neil/CAN SLIM** (kurumsal alım) ve **aktivist mercekler** (Ackman/Icahn) için *tam da eksik olan* sinyal.

| Kaynak | Veri | Ücretsiz | Fayda |
|---|---|---|---|
| **FMP** | İçeriden alım/satım özetleri, kurumsal sahiplik, 13F dosyaları, fon performansı | ✅ Free plan | "Kurumsal alım artıyor ✓" sinyali → CAN SLIM merceğini *gerçekten* çalıştırır |
| **Finnhub** | Kurumsal + alternatif veri, içeriden işlem | ✅ Free tier | Aynı |

**Nasıl kullanılır:** Yeni `api/ownership.js`; "İçeriden/Kurumsal" sinyali olarak Teknik veya yeni bir "Akıllı Para" ailesine eklenebilir. Aktivist/CAN SLIM mercekleri için Uyum Puanı girdisi.

---

### D. Kripto On-Chain & DeFi (TVL / Fees / DEX) — ⭐ YÜKSEK (ve BEDAVA)

Kripto tarayıcımız şu an CoinGecko fiyat/piyasa + biraz TVL. **DeFiLlama** bu alanın kanonik, **anahtarsız ücretsiz** kaynağı.

| Kaynak | Veri | Ücretsiz | Fayda |
|---|---|---|---|
| **DeFiLlama** | 350+ zincir, 5000+ protokol: TVL, stablecoin arzı, DEX hacmi, fees, bridge, raises | ✅✅ **Anahtarsız, rate-limit pratikte yok** | Kripto için "MC/TVL", "fee geliri", "TVL trendi" → DeFi/Yield kategorilerimizi *gerçek* yapar; PSV kripto stratejileri (DeFi Değer, Yield) için doğrudan girdi |
| **Messari** | Token temel verisi, metrikler | ✅ Sınırlı free | Token kalitesi/arz metrikleri |
| **CoinAPI Metrics v2** | Zincir başı 16 metrik, on-chain | Düşük maliyet ($0.005/çağrı) | İleri ihtiyaç |

**Nasıl kullanılır:** `api/kripto-scan.js`'e DeFiLlama TVL/fees birleştir (zaten `mcTvl` gösteriyoruz). "DeFi Değer", "Yield", "Fee geliri" kripto filtreleri sahte değil gerçek olur. **Düşük efor, anahtarsız → hemen yapılabilir.**

---

### E. Makro / Ekonomik Göstergeler — ORTA (Türkiye için özel değerli)

Bizde **yok**. Türk kullanıcı için **TRY enflasyonu / faiz** bağlamı kritik; ayrıca "makro/Ray Dalio" açısını mümkün kılar.

| Kaynak | Veri | Ücretsiz | Fayda |
|---|---|---|---|
| **FRED (St. Louis Fed)** | Dünya çapında ekonomik seri (faiz, enflasyon, işsizlik) | ✅✅ Ücretsiz API key | Makro bağlam bandı; reel getiri hesabı |
| **IMF / World Bank** | GDP, enflasyon, ödemeler dengesi (Türkiye dahil 1980+) | ✅ Açık veri | Ülke bazlı makro |
| **Trading Economics** | 15.000+ seri, merkez bankası kaynaklı, takvim | ⚠️ Ücretli ağırlıklı | Ekonomik takvim |
| **TCMB EVDS** | Türkiye resmî: faiz, enflasyon, kur (raporda doğrulanmalı) | ✅ Resmî açık veri | **TRY reel getiri**, "enflasyona karşı" görünüm — yerli farklılaştırıcı |

**Nasıl kullanılır:** Hafif `api/macro.js`; ana sayfada/stats-bar'da "TR enflasyon %X · TCMB faiz %Y" bandı; hisse getirisini reel (enflasyondan arındırılmış) gösterme opsiyonu — Türk yatırımcı için güçlü.

---

### F. Temel Veri Yedeği / Global Kapsam — ORTA (risk azaltma)

TradingView/Yahoo scraping'ine **resmî yedek**; ban/kırılma riskini düşürür, BIST dışı kapsamı artırır.

| Kaynak | Veri | Ücretsiz | Not |
|---|---|---|---|
| **FMP** | Fiyat, finansal tablolar, oranlar (30 yıl geçmiş) | ✅ Free plan | Çok-amaçlı; A/B/C/E maddelerini de tek sağlayıcıda toplar |
| **EODHD** | Global borsa kapsamı (İstanbul dahil), uzun geçmiş | ✅ Sınırlı free, uygun ücretli | **BIST kapsıyor** — İş Yatırım'a resmî yedek |
| **Alpha Vantage** | Fiyat, temel, 50+ teknik indikatör, forex, kripto, makro, haber duygu | ✅ Free key | Tek API'de en geniş; MCP sunucusu LLM/agent dostu |
| **Polygon** | Borsa-lisanslı gerçek zamanlı + geniş geçmiş | ⚠️ Ücretli ağırlıklı | İleri seviye |

---

## 2. DeepFin'e Net Faydalar (Özellik Eşlemesi)

Bu kaynaklar, önceki **entegrasyon planındaki** konseptleri besler:

1. **Yeni "Duygu/Haber" karar ailesi (A):** Mockup'un 3 ailesine 4.'yü ekler → açıklanabilirlik + Uyum Puanı'na yeni boyut.
2. **Mevcut mercekleri *gerçek* yapmak (B,C):** CAN SLIM "kurumsal alım", aktivist "insider", kalite "analist konsensüsü" — şu an eşiklerimiz var ama bu veriler **olmadığı için bazı mercekler eksik çalışıyor**. Bu kaynaklar onları tamamlar.
3. **Kripto tarayıcısını derinleştirmek (D):** DeFiLlama ile DeFi/Yield/Fee filtreleri sahte değil gerçek → PSV kripto stratejileri anlamlı olur.
4. **Yerli farklılaştırma (E):** TRY reel getiri + makro bağlam — global rakiplerin vermediği, Türk kullanıcıya özel değer.
5. **Altyapı riski azaltma (F):** Resmî ücretsiz yedekler → TradingView ban'ı tek nokta arıza olmaktan çıkar.

---

## 3. Öncelik Tablosu (Ücretsiz + Kolay + Yüksek Etki Önce)

| Sıra | Kaynak | Neden ilk | Efor | Maliyet |
|---|---|---|---|---|
| **1** | **DeFiLlama** | Anahtarsız, rate-limit yok, kripto'yu hemen derinleştirir | Düşük | $0 |
| **2** | **Marketaux / Alpha Vantage** (haber duygu) | Yepyeni "duygu" ailesi, açıklanabilirlik | Orta | $0 free tier |
| **3** | **FMP** (analist + insider + 13F + temel) | Tek sağlayıcıda B+C+F maddeleri | Orta | $0 free plan |
| **4** | **Finnhub** (kazanç takvimi/hedef) | Zaten kullanıyoruz, genişlet | Düşük | $0 free tier |
| **5** | **FRED + TCMB EVDS** (makro/TRY) | Yerli farklılaştırma | Orta | $0 |
| **6** | **EODHD** (BIST resmî yedek) | İş Yatırım/TV scraping'e yedek | Orta | Sınırlı free |

---

## 4. Uyarılar / Açık Sorular

- **Free tier limitleri:** Çoğu ücretsiz katman dakika/gün başına çağrı sınırlı → bizim **sunucu-taraflı önbellek** (zaten var) ile günde 1-2 kez toplu çekmek gerekir, kullanıcı başına değil.
- **BIST kapsamı zayıf:** Global API'lerin çoğu BIST'i sınırlı kapsar; EODHD ve FMP kısmen kapsar ama yerli için İş Yatırım/TEFAS/TCMB hâlâ çekirdek kalır.
- **TCMB EVDS** ve free tier detayları implementasyondan önce doğrulanmalı (anahtar/kayıt gereksinimi).
- **Lisans/ToS:** Veriyi yeniden dağıtım (tabloda gösterim) bazı sağlayıcılarda atıf/lisans gerektirir — entegrasyondan önce ToS okunmalı.
- Kaynak sayfa (aimultiple) erişilemediği için liste, güncel web aramalarıyla **yeniden kuruldu**; spesifik bir araç eksikse paylaş, eklerim.

---

### Kaynaklar
- [The Best Investment Research APIs in 2026 — market.us](https://media.market.us/the-best-investment-research-apis-in-2026-comparing-the-leading-platforms/)
- [Best Stock Market data API in the AI Agent era — Medium](https://medium.com/data-science-collective/best-stock-market-data-api-in-the-ai-agent-era-4b8ae4cf2ff0)
- [Best Stock Market APIs in 2026 — Alpha Vantage](https://www.alphavantage.co/best_stock_market_api_review/)
- [Best Stock Sentiment APIs in 2026 — Adanos](https://adanos.org/insights/blog/best-stock-sentiment-apis-2026/)
- [Marketaux API — FreeAPIHub](https://freeapihub.com/apis/marketaux)
- [Financial News & Sentiment — EODHD](https://eodhd.com/financial-apis/stock-market-financial-news-api)
- [Analyst Estimates & Price Targets — FMP](https://site.financialmodelingprep.com/datasets/analyst-estimates-targets)
- [Institutional Ownership / 13F — FMP](https://site.financialmodelingprep.com/developer/docs/institutional-stock-ownership-api)
- [Finnhub Stock APIs](https://finnhub.io/)
- [DefiLlama — DeFi Analytics](https://defillama.com/)
- [Economics Data APIs — FMP](https://site.financialmodelingprep.com/datasets/economics)
- [FRED — St. Louis Fed](https://fred.stlouisfed.org/)
- [Trading Economics API](https://tradingeconomics.com/api/indicators.aspx)

*Yalnızca araştırma dokümanıdır; kodda değişiklik içermez.*
