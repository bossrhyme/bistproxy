# BistScan.com — Teknik ve Hukuki Analiz Raporu
**Tarih:** Haziran 2026

---

## Yonetici Ozeti

BistScan (bistscan.com / app.bistscan.com), BayP Kurumsal markasi altinda faaliyet gosteren bir Turk BIST hisse tarayicidir. Platform, 530+ BIST hissesini 24 teknik analiz modeliyle tarayan, kayit gerektirmeyen ucretsiz bir screener sunarken 99 TL/ay premium abonelik modeliyle gelir elde etmektedir. Veri kaynagi **Is Yatirim (isyatirim.com.tr)** olarak acikca teyit edilmistir. Borsaistanbul lisans rejimi ve Is Yatirim kullanim kosullari acisindan ciddi hukuki risk tasiyan bir yapilanmadir.

---

## 1. Sahip Profili

**Marka:** BayP Kurumsal

| Bilgi | Detay |
|---|---|
| Twitter hesaplari | @BistScaN_New / @BayP_Kurumsal (2015'ten beri aktif) |
| YouTube | BistScaN kanal mevcut |
| Gercek kimlik | Gizli -- WHOIS privacy-protected |
| Sirket kaydi | Kamuya acik kayit bulunamadi |
| Ekip buyuklugu | Tek gelistirici veya cok kucuk ekip (mimari gosteriyor) |

"BayP" muhtemelen isim bas harfleri. Hakkinda sayfasi, LinkedIn profili veya sirket bilgisi hicbir kanalda mevcut degil.

---

## 2. Teknik Altyapi

DNS cozumlemesiyle dogrulanmis altyapi:

| Bilesen | Platform | Kanit |
|---|---|---|
| bistscan.com (landing page) | GitHub Pages | IP 185.199.108-111.153 = GitHub Pages araligi |
| app.bistscan.com (ana uygulama) | Render.com | IP 216.24.57.8/9 = Render.com ASN 397273 |
| SSL | TLS 1.3 / HTTP/2 | Wildcard sertifika *.bistscan.com |
| Odeme sistemi | Shopier | Turk bireysel gelistiricilerin no-code odeme tercihi |
| Mobil | PWA | Google Play kaydi yok, browser "Add to Home Screen" |

**Mimari yorum:** Render.com uzerindeki dinamik uygulama, gunluk/gece toplu tarama icin zamanlanmis cron job'lar calistirabilecek bir backend sunucu iceriyor. Buyuk ihtimalle React/Next.js frontend + Node.js veya Python API backend yapisi. AI analiz ozelligi (hisse basi LLM ozetleri) bir LLM API entegrasyonu iceriyor. Her iki subdomain de HTTP 403 dondurdugundan (bot koruması) kaynak koduna dogrudan erisilemiyor.

---

## 3. Veri Kaynagi

**Tek ve teyit edilmis kaynak: Is Yatirim (isyatirim.com.tr)**

Platform kendi aciklamalarinda "Is Yatirim verisiyle gercek zamanli" ifadesini kullaniyor. Baska hicbir veri kaynagi -- Matriks, Finnet, Yahoo Finance, TradingView veya Borsaistanbul API -- hicbir kamu materyalinde anilmiyor.

**Nasil erisiyor:** Is Yatirim'in kamuya acik web endpoint'lerini scraping / belgesiz API cagrisiyla kullaniyor. Bu yontem Turk fintech gelistirici topluluğunda yaygindir; ancak Is Yatirim bu kullanimi acikca yasaklamaktadir.

Acik kaynak ornekler (ayni yontemi kullanan):

- isyatirimhisse Python kutuphanesi (urazakgul/isyatirimhisse)
- borsapy kutuphanesi (saidsurucu/borsapy)

Bu kutuphaneler "yalnizca kisisel kullanim" uyarisi tasiyor ve Is Yatirim ToS'un incelenmesini tavsiye ediyor. BistScan ise bu yontemi ticari, kamuya acik bir platformda uyguluyor.

---

## 4. Is Modeli

| Tier | Fiyat | Icerik |
|---|---|---|
| Ucretsiz | 0 TL, kayit gerektirmez | 530+ hisse, 24 tarama modeli, RSI / MACD / MA grafikleri, P/E - P/B - halka aciklik - dolasim pay verisi, KAP duyurulari, temel AI ozetleri |
| Premium | 99 TL/ay (990 TL/yil) | Sinirsiz AI yorum, VIP sinyal takip verisi, reklamsiz, gunluk kullanim limiti yok |

---

## 5. Hukuki Risk Analizi

### Risk 1 -- Borsaistanbul Veri Lisansi Ihlali (YUKSEK)

Borsaistanbul, BIST verisinin yeniden dagitilmasi icin zorunlu Data Distribution Agreement (DDA) sartiyla calisir:

- Gercek zamanli, gecikmeli veya EOD veri farketmeksizin her turlu yeniden dagitim DDA gerektirir
- BIST verisinin fikri mulkiyet hakki Borsaistanbul'a aittir
- 2026 ucretsiz veri paketleri yalnizca onaylanmis lisansli banka/aracilik kurumu musterileri icin gecerli; ucuncu parti web siteleri bu kapsamin disindadir

**BistScan'in durumu:** Is Yatirim, kendi kullanicilarina BIST verisini gosterme lisansina sahiptir. Bu lisans, BistScan'in Is Yatirim'dan cekip kendi kullanicilarina gostermesini kapsamaz. BistScan'in alt-dagitim lisansi aldigina dair hicbir kamu kaydi yoktur.

### Risk 2 -- Is Yatirim Kullanim Kosullari Ihlali (YUKSEK)

Is Yatirim Terms of Use belgesi (resmi PDF) acikca belirtmektedir:

> "Any form of reproduction, dissemination, copying, disclosure, modification, distribution and/or publication of information, opinions and comments provided on this site is strictly prohibited."

Turkce versiyon ayni anlama gelir: izin alinmadan kopyalanamaz, dagitılamaz, yayinlanamaz. BistScan bu yasagin tam ortasinda -- ticari olcekte, kamuya acik platformda veriyi yeniden dagitmaktadir.

Turk hukuku cercevesinde veritabani olusturucunun icerik transferini ve kamuya iletimini yasaklama hakki vardir; ihlal halinde tazminat talep edebilir.

### Risk 3 -- KVKK Uyumsuzlugu (ORTA)

/gizlilik, /kvkk ve /privacy sayfalarinin tamami HTTP 403 doniyor. Turk KVKK Kanunu Madde 10 geregi kisisel veri toplayan her web sitesinin erisebilir bir aydinlatma metni bulundurmasi zorunludur. Uygulama genellikle uyari veya para cezasina kadar uzanir.

### Temiz Alanlar

Yahoo Finance, Google Finance ve TradingView kullanimi konusunda hicbir kanit yoktur.

---

## 6. Risk Ozeti

| Bulgu | Guven Seviyesi |
|---|---|
| Veri kaynagi = Is Yatirim | YUKSEK -- platform kendi aciklıyor |
| app.bistscan.com = Render.com | YUKSEK -- DNS dogrulanmis |
| bistscan.com = GitHub Pages | YUKSEK -- DNS dogrulanmis |
| 99 TL/ay premium fiyat | YUKSEK -- birden fazla kaynakta teyit |
| Borsaistanbul DDA lisansi yok | ORTA-YUKSEK -- hicbir lisans iddiasi, mimari gosteriyor |
| Is Yatirim ToS ihlali | ORTA -- kullanim yasak kapsamında, henuz sikayete konu olmamis |
| Aktif hukuki sikayet | YOK -- Sikayetvar, Eksi, Reddit, Twitter'da sifir sonuc |

---

## 7. BIST Screener Ekosistemi

BistScan'e benzer Turk BIST tarayicilari:

| Platform | Odak | Fiyat |
|---|---|---|
| BISTEDGE PRO (bistedge.com) | Sinyal performans seffafligi | Ucretli |
| Fintables (fintables.com) | Fundamental analiz | Freemium |
| BorsaZeka (borsazeka.com) | Yapay zeka odakli | Ucretli |
| BORSA101 (borsa101.com) | Teknik analiz | Freemium |
| BistScanner (bistscanner.com.tr) | Genel tarayici | Freemium |

---

## Kaynaklar

- BistScaN: bistscan.com
- BistScaN Twitter: x.com/BistScaN_New
- BayP Kurumsal Twitter: x.com/BayP_Kurumsal
- isyatirimhisse Python kutuphanesi: github.com/urazakgul/isyatirimhisse
- borsapy kutuphanesi: github.com/saidsurucu/borsapy
- Is Yatirim Terms of Use: isyatirim.com.tr/SiteAssets/pdf/Terms_Of_Use.pdf
- Borsaistanbul Veri Dagitim: borsaistanbul.com/en/data/data-dissemination
- Matriks BIST Veri Lisanslari Blog: matriksdata.com/website/blog/borsa-istanbul-bist-veri-lisanslari
- Render.com ASN 397273: ipinfo.io/AS397273
- Datakapital BIST Twitter: datakapital.com/bist/twitter

---

*Veriler Haziran 2026 itibarilya gunceldir. Rapor arastirma amaclidir; hukuki tavsiye niteliginde degildir.*
