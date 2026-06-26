# BistScan.com — Teknik ve Hukuki Analiz Raporu
**Tarih:** Haziran 2026

---

## Yönetici Özeti

BistScan (bistscan.com / app.bistscan.com), BayP Kurumsal markası altında faaliyet gösteren bir Türk BIST hisse tarayıcısıdır. Platform, 530+ BIST hissesini 24 teknik analiz modeliyle tarayan, kayıt gerektirmeyen ücretsiz bir screener sunarken 99 TL/ay premium abonelik modeliyle gelir elde etmektedir. Veri kaynağı **İş Yatırım (isyatirim.com.tr)** olarak açıkça teyit edilmiştir. Borsa İstanbul lisans rejimi ve İş Yatırım kullanım koşulları açısından ciddi hukuki risk taşıyan bir yapılanmadır.

---

## 1. Sahip Profili

**Marka:** BayP Kurumsal

| Bilgi | Detay |
|---|---|
| Twitter hesapları | @BistScaN\_New / @BayP\_Kurumsal (2015'ten beri aktif) |
| YouTube | BistScaN kanalı mevcut |
| Gerçek kimlik | Gizli — WHOIS privacy-protected |
| Şirket kaydı | Kamuya açık kayıt bulunamadı |
| Ekip büyüklüğü | Tek geliştirici veya çok küçük ekip (mimari gösteriyor) |

"BayP" muhtemelen isim baş harfleri. Hakkında sayfası, LinkedIn profili veya şirket bilgisi hiçbir kanalda mevcut değil.

---

## 2. Teknik Altyapı

DNS çözümlemesiyle doğrulanmış altyapı:

| Bileşen | Platform | Kanıt |
|---|---|---|
| bistscan.com (landing page) | GitHub Pages | IP 185.199.108–111.153 = GitHub Pages aralığı |
| app.bistscan.com (ana uygulama) | Render.com | IP 216.24.57.8/9 = Render.com ASN 397273 |
| SSL | TLS 1.3 / HTTP/2 | Wildcard sertifika *.bistscan.com |
| Ödeme sistemi | Shopier | Türk bireysel geliştiricilerin no-code ödeme tercihi |
| Mobil | PWA | Google Play kaydı yok, browser "Add to Home Screen" |

**Mimari yorum:** Render.com üzerindeki dinamik uygulama, günlük/gece toplu tarama için zamanlanmış cron job'lar çalıştırabilecek bir backend sunucu içeriyor. Büyük ihtimalle React/Next.js frontend + Node.js veya Python API backend yapısı. AI analiz özelliği (hisse başı LLM özetleri) bir LLM API entegrasyonu içeriyor. Her iki subdomain de HTTP 403 döndürdüğünden (bot koruma) kaynak koduna doğrudan erişilemiyor.

---

## 3. Veri Kaynağı

**Tek ve teyit edilmiş kaynak: İş Yatırım (isyatirim.com.tr)**

Platform kendi açıklamalarında "İş Yatırım verisiyle gerçek zamanlı" ifadesini kullanıyor. Başka hiçbir veri kaynağı — Matriks, Finnet, Yahoo Finance, TradingView veya Borsa İstanbul API'si — hiçbir kamu materyalinde anılmıyor.

**Nasıl erişiyor:** İş Yatırım'ın kamuya açık web endpoint'lerini scraping / belgesiz API çağrısıyla kullanıyor. Bu yöntem Türk fintech geliştirici topluluğunda yaygındır; ancak İş Yatırım bu kullanımı açıkça yasaklamaktadır.

Açık kaynak örnekler (aynı yöntemi kullanan):

- isyatirimhisse Python kütüphanesi (urazakgul/isyatirimhisse)
- borsapy kütüphanesi (saidsurucu/borsapy)

Bu kütüphaneler "yalnızca kişisel kullanım" uyarısı taşıyor ve İş Yatırım ToS'un incelenmesini tavsiye ediyor. BistScan ise bu yöntemi ticari, kamuya açık bir platformda uyguluyor.

---

## 4. İş Modeli

| Tier | Fiyat | İçerik |
|---|---|---|
| Ücretsiz | 0 TL, kayıt gerektirmez | 530+ hisse, 24 tarama modeli, RSI / MACD / MA grafikleri, P/E — P/B — halka açıklık — dolaşım pay verisi, KAP duyuruları, temel AI özetleri |
| Premium | 99 TL/ay (990 TL/yıl) | Sınırsız AI yorum, VIP sinyal takip verisi, reklamsız, günlük kullanım limiti yok |

---

## 5. Hukuki Risk Analizi

### Risk 1 — Borsa İstanbul Veri Lisansı İhlali (YÜKSEK)

Borsa İstanbul, BIST verisinin yeniden dağıtılması için zorunlu Data Distribution Agreement (DDA) şartıyla çalışır:

- Gerçek zamanlı, gecikmeli veya EOD veri fark etmeksizin her türlü yeniden dağıtım DDA gerektirir
- BIST verisinin fikri mülkiyet hakkı Borsa İstanbul'a aittir
- 2026 ücretsiz veri paketleri yalnızca onaylanmış lisanslı banka/aracılık kurumu müşterileri için geçerli; üçüncü parti web siteleri bu kapsamın dışındadır

**BistScan'in durumu:** İş Yatırım, kendi kullanıcılarına BIST verisini gösterme lisansına sahiptir. Bu lisans, BistScan'in İş Yatırım'dan çekip kendi kullanıcılarına göstermesini kapsamaz. BistScan'in alt-dağıtım lisansı aldığına dair hiçbir kamu kaydı yoktur.

### Risk 2 — İş Yatırım Kullanım Koşulları İhlali (YÜKSEK)

İş Yatırım Terms of Use belgesi (resmi PDF) açıkça belirtmektedir:

> "Any form of reproduction, dissemination, copying, disclosure, modification, distribution and/or publication of information, opinions and comments provided on this site is strictly prohibited."

Türkçe versiyon aynı anlama gelir: izin alınmadan kopyalanamaz, dağıtılamaz, yayınlanamaz. BistScan bu yasağın tam ortasında — ticari ölçekte, kamuya açık platformda veriyi yeniden dağıtmaktadır.

Türk hukuku çerçevesinde veritabanı oluşturucunun içerik transferini ve kamuya iletimini yasaklama hakkı vardır; ihlal halinde tazminat talep edebilir.

### Risk 3 — KVKK Uyumsuzluğu (ORTA)

/gizlilik, /kvkk ve /privacy sayfalarının tamamı HTTP 403 dönüyor. Türk KVKK Kanunu Madde 10 gereği kişisel veri toplayan her web sitesinin erişilebilir bir aydınlatma metni bulundurması zorunludur. Uygulama genellikle uyarı veya para cezasına kadar uzanır.

### Temiz Alanlar

Yahoo Finance, Google Finance ve TradingView kullanımı konusunda hiçbir kanıt yoktur.

---

## 6. Risk Özeti

| Bulgu | Güven Seviyesi |
|---|---|
| Veri kaynağı = İş Yatırım | YÜKSEK — platform kendi açıklıyor |
| app.bistscan.com = Render.com | YÜKSEK — DNS doğrulanmış |
| bistscan.com = GitHub Pages | YÜKSEK — DNS doğrulanmış |
| 99 TL/ay premium fiyat | YÜKSEK — birden fazla kaynakta teyit |
| Borsa İstanbul DDA lisansı yok | ORTA-YÜKSEK — hiçbir lisans iddiası, mimari gösteriyor |
| İş Yatırım ToS ihlali | ORTA — kullanım yasak kapsamında, henüz şikayete konu olmamış |
| Aktif hukuki şikayet | YOK — Şikayetvar, Ekşi, Reddit, Twitter'da sıfır sonuç |

---

## 7. BIST Screener Ekosistemi

BistScan'e benzer Türk BIST tarayıcıları:

| Platform | Odak | Fiyat |
|---|---|---|
| BISTEDGE PRO (bistedge.com) | Sinyal performans şeffaflığı | Ücretli |
| Fintables (fintables.com) | Fundamental analiz | Freemium |
| BorsaZeka (borsazeka.com) | Yapay zeka odaklı | Ücretli |
| BORSA101 (borsa101.com) | Teknik analiz | Freemium |
| BistScanner (bistscanner.com.tr) | Genel tarayıcı | Freemium |

---

## Kaynaklar

- BistScaN: bistscan.com
- BistScaN Twitter: x.com/BistScaN\_New
- BayP Kurumsal Twitter: x.com/BayP\_Kurumsal
- isyatirimhisse Python kütüphanesi: github.com/urazakgul/isyatirimhisse
- borsapy kütüphanesi: github.com/saidsurucu/borsapy
- İş Yatırım Terms of Use: isyatirim.com.tr/SiteAssets/pdf/Terms\_Of\_Use.pdf
- Borsa İstanbul Veri Dağıtım: borsaistanbul.com/en/data/data-dissemination
- Matriks BIST Veri Lisansları Blog: matriksdata.com/website/blog/borsa-istanbul-bist-veri-lisanslari
- Render.com ASN 397273: ipinfo.io/AS397273
- Datakapital BIST Twitter: datakapital.com/bist/twitter

---

*Veriler Haziran 2026 itibarıyla günceldir. Rapor araştırma amaçlıdır; hukuki tavsiye niteliğinde değildir.*
