# Mockup Karşılaştırma Raporu — "Yeni Marka" vs Mevcut DeepFin

> **Kaynak mockup:** `14268fd7-yenimarkastratejitaramarevize.html` (1168 satır, tek dosya prototip)
> **Karşılaştırılan:** mevcut DeepFin (`public/deepfin.js` ~5500 satır, `index.html`, `deepfin.css`, `stratejiler/`)
> **Tarih:** 2026-06-16
> **Not:** Bu yalnızca bir analiz/araştırma dokümanıdır. Kodda hiçbir değişiklik yapılmamıştır.

---

## 0. TL;DR — Tek Cümlelik Özet

Mockup, ürünü **"ham metrik tablosu üreten bir tarayıcı"dan** → **"stratejine ne kadar uyduğunu puanlayan ve her sonucu açıklayan bir karar asistanı"na** dönüştürüyor. Tasarım yeniliklerinin çoğu kozmetik değil; merkezde **3 yeni konsept** var:

1. **Uyum Puanı (0–100)** — her varlığın *seçili filtrelere* ne kadar uyduğunu gösteren skor.
2. **Açıklanabilirlik** — hem sonuç listesi ("Neden bu sonuçlar?") hem tek tek varlık ("Neden Eşleşti?") düz Türkçe ile açıklanıyor.
3. **Rehberli 3 adımlı kurulum** — Varlık → Evren → Filtreler, her adımda "bu seçim neyi değiştirir?" içgörü paneliyle.

Bunların **hiçbiri** mevcut üründe yok. Buna karşılık mevcut ürün; gerçek veri, 25 yatırımcı merceği, 28 teknik strateji, 28 borsa, sanal kaydırma, izleme listeleri ve detaylı analiz ekranıyla mockup'un "temsilî/sahte veri" prototipinden **çok daha derin ve üretim-olgun**.

Kısacası: **Mockup = daha iyi anlatım katmanı + konsept. Mevcut = daha iyi motor + veri + derinlik.** İdeal hedef, mevcut motorun üzerine mockup'un anlatım/konsept katmanını giydirmek.

---

## 1. Mockup'un Temel Felsefesi (Neyi Farklı Yapıyor?)

Mockup, finansal bir tarayıcının klasik "filtrele → ham sayı tablosu al" akışını terk edip şu zihinsel modeli kuruyor:

> **"3 karar ailesi"** — *Yatırımcı Filtresi*, *Temel Kriterler*, *Teknik Sinyaller* — her biri ayrı puanlanır, birleşip bir **Uyum Puanı** üretir; sonra her satır *neden* listede olduğunu açıklar.

Bu, ham metrikleri (F/K, ROE, RSI) tablodan **silmiyor** ama onları arka plana itip öne **"bu hisse stratejine %86 uyuyor ve işte nedeni"** mesajını çıkarıyor. Yeni kullanıcı için bilişsel yük çok daha düşük.

**Önemli dürüstlük notu:** Mockup'taki tüm veriler ve Uyum Puanları **elle yazılmış (hardcoded)**. Yani mockup'ta "puan algoritması" yok — `THYAO=86` gibi sabit değerler var. Biz bunu hayata geçirirsek, **gerçek bir skorlama fonksiyonu** yazmamız gerekir (bkz. §4.A).

---

## 2. Yan Yana Özellik Karşılaştırması

| Konsept / Özellik | Mockup | Mevcut DeepFin | Kim Daha İyi? |
|---|---|---|---|
| **Uyum/Match Puanı (0–100)** | ✅ Merkezî konsept (sahte veri) | ❌ Yok (ikili geç/kal filtreleme) | Mockup (konsept) |
| **Per-sonuç "Neden Eşleşti?"** | ✅ Slide-in drawer + aile kırılımı | ❌ Yok (detay genel şirket bilgisi) | Mockup |
| **"Neden bu sonuçlar?" özet bandı** | ✅ why-card (düz cümle) | ⚠️ Kısmen (`#scan-summary` sadece filtre adı çipleri) | Mockup |
| **Rehberli 3 adımlı kurulum** | ✅ Wizard + ilerleme rayı + içgörü | ❌ Tek ekran PSV (tüm seçenekler bir arada) | Mockup |
| **Loading "funnel" (daralma görseli)** | ✅ Evren → filtre → sonuç huni | ⚠️ 5 fazlı stepper var ama funnel yok | Karışık |
| **Sonuç metrikleri kartları** | ✅ En yüksek uyum / Filtre dışı / Aktif aile | ❌ Yok | Mockup |
| **Güven şeridi (disclaimer)** | ✅ Akışa dokunmuş ("Eşleşme ≠ öneri") | ⚠️ Sadece footer + disclaimer modal | Mockup |
| **Filtre değişince bildirim (feedback toast)** | ✅ Sağ-alt "Karar sistemi güncellendi" | ❌ Yok | Mockup |
| **Hero'da canlı ürün önizlemesi** | ✅ Mini-app mockup (filtre+tablo) | ❌ Sadece metin + istatistik | Mockup |
| **Filtre eşik şeffaflığı** | ✅ "ÖSK > %15", "F/K 8–25x" görünür | ⚠️ Tooltip içinde var, öne çıkmıyor | Mockup |
| **Yatırımcı merceği sayısı** | 4 (Buffett, Graham, Lynch, Temettü) | ✅ **25** (Ackman, Wood, Einhorn, Klarman, Greenblatt…) | **Mevcut** |
| **Teknik strateji sayısı** | 4–6 | ✅ **28** | **Mevcut** |
| **Temel preset sayısı** | 4 | 8 | **Mevcut** |
| **Borsa / evren** | 7 (sahte) | ✅ **28 gerçek borsa** (EXCHANGE_META) | **Mevcut** |
| **Gerçek canlı veri** | ❌ Temsilî | ✅ `/api/scan`, gerçek finansal veri | **Mevcut** |
| **Büyük liste performansı** | ~10 satır statik | ✅ Sanal kaydırma (3000 satıra kadar) | **Mevcut** |
| **Varlık sınıfı** | Hisse + Kripto | ✅ Hisse + Kripto + Fon (+7 "yakında") | **Mevcut** |
| **Detay ekranı derinliği** | Drawer (eşleşme odaklı) | ✅ Grafik + sektör kıyas + haber + 4 finansal blok | **Mevcut** (farklı amaç) |
| **İzleme listesi / favoriler** | "Ekle" butonu (sahte) | ✅ Gerçek favoriler + çoklu watchlist | **Mevcut** |
| **Kolon özelleştirme** | ❌ | ✅ Kolon seçici + yoğunluk modu | **Mevcut** |
| **Kolay / Pro mod** | ❌ Tek mod | ✅ İki mod (kolay/pro) | **Mevcut** |
| **Strateji getiri karşılaştırması** | ❌ | ✅ `stratejiler/` getiri sayfası | **Mevcut** |
| **Marka / görsel dil** | ✅ Olgun "lacivert+altın+krem" sistem | ⚠️ "warm" tema, daha az bütünlük | Mockup |

---

## 3. Mevcutta Olup Mockup'ta Olmayan / Bizim Üstün Olduğumuz Yerler

Mockup'a "körü körüne" geçmek **regresyon** olur. Mevcut ürünün koruması gereken güçlü yanları:

1. **Strateji derinliği:** 25 yatırımcı merceği + 28 teknik + 8 temel preset. Mockup'taki 4'er seçenek bir prototip kısıtı. Bizim kütüphanemiz gerçek bir rekabet avantajı.
2. **Gerçek veri & altyapı:** Canlı API, 28 borsa, FX dönüşümü, sanal kaydırma, önbellek. Mockup tamamen sahte/statik.
3. **Detay analiz ekranı:** `showDetail` — fiyat grafiği (SMA/EMA/Bollinger), sektör ortalaması kıyaslaması, haberler, 4 finansal blok. Mockup'un drawer'ı bunun yerine geçmez, **tamamlar**.
4. **Kolay/Pro mod ayrımı + onboarding kartları + tarama geçmişi** (`Son Taramalar` → tek tıkla tekrar tara).
5. **İzleme listeleri, favoriler, kolon seçici, yoğunluk modu** — güç-kullanıcı araçları.
6. **`stratejiler/` getiri sayfası** — "hangi strateji ne kadar kazandırdı" — mockup'ta karşılığı yok.
7. **Zaten var olan 5-fazlı loading stepper** (`#scan-stepper`: Hazırlık → Veri Toplama → Analiz → Doğrulama → Sonuçlar) + minimum gösterim süresi mantığı. Mockup'un loading'i konsept olarak benzer; biz sadece "funnel" görselini ekleyebiliriz.

---

## 4. Mockup'ta Olup Bizde HİÇ Olmayan Özellikler — Detaylı İnceleme & Nasıl Eklenir

Aşağıdaki her madde: **Ne olduğu → Neden değerli → Mevcut mimaride nasıl eklenir → Efor/Risk**.

### 4.A — Uyum Puanı (Match/Affinity Score, 0–100) ⭐ EN BÜYÜK BOŞLUK

**Ne:** Her varlık için, *seçili filtrelere* ne kadar uyduğunu gösteren 0–100 skor. Tabloda mini ilerleme çubuğu + sayı olarak gösteriliyor; sıralama için kullanılıyor.

**Neden değerli:** Mockup'un tüm anlatımının çıpası bu. "THYAO stratejine %86 uyuyor" mesajı, ham F/K=6.8x'ten çok daha sezgisel. Sıralama ekseni de oluyor ("en uygun adaylar üstte").

**Mevcut durum:** Filtreleme tamamen **ikili (geç/kal)** — `allData.filter(...)` bir hisseyi tüm eşikleri geçerse tutuyor, geçmezse atıyor. Hiçbir yerde "ne kadar geçti" bilgisi tutulmuyor. (`applyAndRender`, `deepfin.js:3143`)

**Nasıl eklenir (gerçek algoritma gerekir):**
1. Aktif her filtre eşiği için bir **normalize edilmiş alt-skor** hesapla. Örn. `roe_min=15` ise: hisse ROE=15 → 0.0, ROE=30 → 1.0 arası lineer (veya sigmoid) normalize. Eşiği geçemeyen ama yakın olanlara kısmi puan (örn. ROE=13 → 0.2) — "yakın izle" konseptini mümkün kılar.
2. Alt-skorları **3 aileye** grupla (Yatırımcı / Temel / Teknik), her aileyi kendi içinde ortalama.
3. Aileleri **ağırlıklı** birleştir (örn. eşit %33 veya kullanıcı seçimine göre). Sonuç ×100 = Uyum Puanı.
4. Tablo render'ına bir "Uyum" kolonu ekle (`_vsRowHtml`, `deepfin.js:3538`); sıralama seçeneklerine "Uyum puanı" ekle (`sorted`, `colSort`).
5. Ham metrik kolonlarını **gizlemeden** koru (Pro kullanıcı ister); Kolay modda öne çıkar.

**Tasarım kararları (netleştirilmeli):**
- Eşiği geçemeyenler listede kalsın mı (kısmi puanla) yoksa atılsın mı? Mockup "kal + düşük puan" yaklaşımına yakın. Bu, mevcut "sıkı filtreleme" davranışından **felsefi sapma** — kullanıcıya seçenek olarak sunulabilir ("Katı / Esnek mod").
- Ağırlıklar nasıl belirlenecek? (sabit / kullanıcı ayarlı / stratejiye gömülü)

**Efor:** Yüksek (algoritma + UI + sıralama + test). **Risk:** Orta-yüksek — yanlış kalibre edilirse güveni sarsar. **Öncelik:** Yüksek ama dikkatli.

---

### 4.B — "Neden Eşleşti?" Detay Drawer (Per-Sonuç Açıklama) ⭐

**Ne:** Bir satıra/butona tıklayınca sağdan açılan panel:
- Uyum puanı rozeti (86)
- "Bu varlık neden listelendi?" — düz cümle
- **Filtre ailesi kırılımı** — Yatırımcı / Temel / Teknik için ayrı çubuk + puan
- **Stratejik eşleşme notları** (✓ geçtiği kriterler: "ÖSK > %15 eşiğiyle örtüşüyor")
- **Dikkat edilmesi gerekenler** (! uyarılar)
- Güven notu + aksiyonlar (İzleme listesine ekle / Filtreleri düzenle)

**Neden değerli:** "Açıklanabilirlik" vaadinin somut karşılığı. Kullanıcı bir sonuca güvenmeden önce *gerekçesini* görüyor. Yatırım tavsiyesi vermeden "neden burada" sorusuna cevap — regülasyon-dostu.

**Mevcut durum:** `showDetail` var ama tamamen **genel şirket bilgisi** (grafik, finansallar, haber) gösteriyor — hangi filtrenin neden geçtiğini *hiç* anlatmıyor. "Neden eşleşti" diye geçen tek kod (`deepfin.js:5241`) dokunmatik cihazda filtre çipinin açıklamasını gösteren tooltip — varlık bazlı değil.

**Nasıl eklenir:**
1. 4.A'daki alt-skor hesabını **sakla** (her varlık için `_matchBreakdown` objesi: hangi kritere ne kadar uydu).
2. `showDetail` ekranına yeni bir sekme/blok **veya** ayrı bir hafif drawer ekle: aktif filtreleri gez, her biri için "geçti ✓ / yakın ! / kaldı ✗" + gerçek değer vs eşik göster.
3. Aile kırılım çubukları için zaten alt-skorlar elimizde olacak.
4. Metin şablonları mockup'taki `openMatchDetail` (satır 1108) mantığından alınabilir — ama **gerçek değerlerle** doldurulur.

**Efor:** Orta-Yüksek (4.A'ya bağımlı). **Risk:** Düşük. **Öncelik:** Yüksek — 4.A'nın doğal devamı.

---

### 4.C — "Neden Bu Sonuçlar?" Özet Bandı (why-card)

**Ne:** Sonuç tablosunun üstünde, aktif reçeteyi **düz cümleyle** anlatan bant: *"BIST evreninde Buffett yaklaşımı, Değer Odaklı kriterleri ve Yüksek Hacim sinyalleriyle eşleşen adaylar."* + eşleşme sayısı + "Filtreleri Düzenle".

**Neden değerli:** Kullanıcı tabloya bakmadan önce "ne görüyorum" sorusuna 1 cümlede cevap alıyor.

**Mevcut durum:** ⚠️ Kısmen var. `showScanSummary` (`deepfin.js:5153`) `#scan-summary` bandına aktif filtre **adlarını çip** olarak basıyor ("Aktif filtre: Buffett ×, Değer ×") — ama düz **cümle** kurmuyor. Mockup'un `recipeSentence()` (satır 952) yaklaşımı daha okunur.

**Nasıl eklenir:** Düşük efor. `showScanSummary`'e mevcut aktif çiplerden bir cümle kuran küçük bir fonksiyon (`recipeSentence` benzeri) ekle, çiplerin üstünde göster. Mevcut çip sistemi korunabilir.

**Efor:** Düşük. **Risk:** Çok düşük. **Öncelik:** Yüksek (hızlı kazanım).

---

### 4.D — Rehberli 3 Adımlı Kurulum Sihirbazı

**Ne:** Mockup'ta kurulum **3 ayrı adım**: ① Varlık Türü → ② Ülke/Borsa/Evren → ③ Filtreler. Solda **ilerleme rayı** (1-2-3, hangi adımdasın), her adımda **"Bu seçim neyi değiştirir?" içgörü paneli** ve altta "Aktif seçim" özeti. Geri/Devam butonları.

**Neden değerli:** Yeni kullanıcının bilişsel yükünü adımlara böler. Her adımda *neden önemli* olduğunu anlatır. Mockup'un en güçlü onboarding hamlesi.

**Mevcut durum:** ❌ Wizard yok. PSV (`initPrescanView`, `deepfin.js:2353`) **tek ekranda** her şeyi (asset + borsa + 3 filtre ailesi) aynı anda gösteriyor. İlerleme göstergesi yok, içgörü paneli yok — sadece kartlarda 3 önizleme etiketi ve hover tooltip'ler var. (Not: statik onboarding'de "Nasıl Kullanılır 1-2-3-4" kartları var ama tıklanamaz/bilgilendirme amaçlı.)

**Nasıl eklenir:** PSV'yi **çok adımlı** hale getir:
1. PSV içeriğini 3 panele böl (`psv-panel data-panel="1|2|3"`), `setSetupStep(n)` benzeri bir state ekle (mockup satır 969 birebir örnek).
2. Sol raya ilerleme navigasyonu + "Aktif seçim" özeti ekle.
3. Her panele bir içgörü kutusu ekle; asset/borsa değişince metni güncelle (`renderSetup` mantığı, satır 984).
4. Mevcut `_psvActiveGoats/Presets/Tech` Set'leri ve `psvScan` aynen korunur — sadece sunum çok-adımlı olur.

**Efor:** Orta-Yüksek. **Risk:** Orta (mevcut PSV akışını bozmamak için dikkatli geçiş; A/B düşünülebilir). **Öncelik:** Orta-Yüksek.

---

### 4.E — Loading "Funnel" (Daralma Görselleştirmesi)

**Ne:** Tarama sırasında **evren → filtre → sonuç** daralmasını 4 kolonlu bir huni olarak gösteriyor (Evren: 568+ → Buffett: 240 → Değer: 90 → Sonuç: 7), her kolonda dolan çubuk.

**Neden değerli:** "Binlerce varlığı senin için eledim" hikâyesini görselleştirir — değer algısını artırır.

**Mevcut durum:** ⚠️ 5-fazlı **stepper** var (`#scan-stepper`) ama **funnel yok**. Daralma yalnızca bitişte stats-bar'da sayı olarak görünüyor (Taranan: 607 / Eşleşen: 23).

**Nasıl eklenir:** Mevcut stepper'ın altına/yanına bir funnel bloğu ekle. Gerçek sayılar tarama bitmeden bilinemez ama: başlangıç evren büyüklüğü (`allData.length` veya beklenen) bilinir; ara değerler tahminle animasyon, son değer gerçek `filtered.length` ile düzeltilir. Mockup `renderLoadingFunnel` (satır 1074) referans.

**Efor:** Orta. **Risk:** Düşük (kozmetik). **Öncelik:** Orta-Düşük (hoş ama kritik değil; stepper zaten iş görüyor).

---

### 4.F — Sonuç Metrikleri Kartları

**Ne:** Tablonun üstünde 3 kart: **En yüksek uyum** (THYAO · 86), **Filtre dışı kalan** (3 varlık), **Aktif karar ailesi** (3 aile).

**Neden değerli:** Tek bakışta "tarama ne yaptı" özeti. "Filtre dışı kalan" özellikle güçlü — eleme işini görünür kılar.

**Mevcut durum:** ❌ Yok. (stats-bar Taranan/Eşleşen veriyor ama "en yüksek uyum" ve "filtre dışı" yok — çünkü uyum puanı yok.)

**Nasıl eklenir:** 4.A geldiğinde neredeyse bedava: `filtered`'tan en yüksek puanlı, `allData.length - filtered.length` filtre-dışı sayısı, aktif aile sayısı. Düşük efor.

**Efor:** Düşük (4.A'ya bağımlı). **Risk:** Çok düşük. **Öncelik:** Orta (4.A ile paket).

---

### 4.G — Güven Şeridi (Akışa Dokunmuş Disclaimer)

**Ne:** Sonuçların hemen üstünde sürekli görünen şerit: *"Eşleşme ≠ öneri · Temsilî/gecikmeli veri · Uyum puanı yalnızca filtre örtüşmesini gösterir"* + "Uyum puanı nasıl çalışır?" linki. Ayrıca tablo altında ve drawer içinde tekrarlanan güven notları.

**Neden değerli:** Finansal üründe **regülasyon ve güven** kritik. Mockup disclaimer'ı tek bir modal'a hapsetmek yerine akışın içine serpiştirmiş — "yatırım tavsiyesi değil" mesajı doğal yerlerde tekrar ediyor.

**Mevcut durum:** ⚠️ Var ama dağınık: ilk girişte disclaimer modal (`df_disclaimer_v2`), footer'da uyarı. Sonuç akışının içinde sürekli görünen bir güven şeridi yok.

**Nasıl eklenir:** Düşük efor — sonuç toolbar'ının üstüne statik bir `.trust-strip` ekle. İçerik mockup satır 734'ten alınabilir. (Uyum puanı gelmeden de "Eşleşme ≠ öneri" mesajı anlamlı.)

**Efor:** Çok düşük. **Risk:** Çok düşük. **Öncelik:** Yüksek (regülasyon değeri + hızlı).

---

### 4.H — Filtre Değişince Bildirim (Feedback Toast)

**Ne:** Bir filtre seçilince sağ-altta beliren kart: *"Karar sistemi güncellendi — Buffett filtresi seçildi · Buffett kriterleri taramaya eklendi."* 2 sn sonra kayboluyor.

**Neden değerli:** Eylem-geri bildirim döngüsü. Kullanıcı seçiminin "duyulduğunu" hissediyor.

**Mevcut durum:** ❌ Yok. Quick-rescan pill var ama o "taranıyor" durumu, eylem onayı değil.

**Nasıl eklenir:** Çok düşük efor — mockup'un `showFeedback` (satır 1155) birebir alınabilir. Mevcut çip seçim handler'larına bir çağrı eklenir.

**Efor:** Çok düşük. **Risk:** Çok düşük. **Öncelik:** Orta (cila).

---

### 4.I — Hero'da Canlı Ürün Önizlemesi (Mini-App Mockup)

**Ne:** Ana sayfa hero'sunun sağında, gerçek ürünü taklit eden mini bir panel: solda aktif filtreler + filtre mantığı (ÖSK > %15, F/K 8–25x), sağda 3 satırlık sonuç tablosu + uyum puanları + "7 adaydan ilk 3 / 86" özeti.

**Neden değerli:** "Söyleme, göster." Ziyaretçi ürünün ne yaptığını 1 saniyede görüyor. Dönüşüm (conversion) için güçlü.

**Mevcut durum:** ❌ Hero sadece metin + istatistik ("9+ varlık / 30K+ enstrüman / 155+ filtre"). Canlı önizleme yok.

**Nasıl eklenir:** Orta efor (saf statik HTML/CSS — gerçek veriye bağlamak şart değil, mockup'taki gibi temsilî olabilir). `hpx-hero`'ya sağ kolon ekle.

**Efor:** Orta (tasarım ağırlıklı). **Risk:** Düşük. **Öncelik:** Orta (pazarlama/landing değeri).

---

### 4.J — Filtre Eşik Şeffaflığı (Gerçek Eşikleri Öne Çıkarma)

**Ne:** Mockup filtre seçilince **gerçek eşikleri** açıkça gösteriyor: "Buffett → ÖSK > %15 · Borç/ÖK < 0.5x · F/K 8–25x". Hem mini-app'te hem filtre panelinde hem drawer'da.

**Neden değerli:** Kullanıcı "Buffett" çipinin arkasında ne olduğunu görüyor — kara kutu değil. Eğitici + güven verici.

**Mevcut durum:** ⚠️ Eşikler `GURUS`/`PRESETS` içindeki `.filters` objelerinde **mevcut** ama UI'da sadece tooltip/önizleme etiketi olarak siliktir. Öne çıkarılmıyor.

**Nasıl eklenir:** Düşük efor — bir filtre seçilince aktif eşikleri bir "Filtre Mantığı" kutusunda listele (mevcut `_psvGetTags`/`_PSV_FMTS` altyapısı genişletilebilir). Veri zaten var.

**Efor:** Düşük. **Risk:** Çok düşük. **Öncelik:** Orta.

---

## 5. Paylaşılan Özelliklerde Mockup'un Daha İyi Olduğu Yerler

Bunlar "yeni özellik" değil, **mevcut özelliğin daha iyi sunumu**:

1. **Onboarding:** Mockup'un 3-adım wizard'ı > bizim tek-ekran PSV'miz (yeni kullanıcı için).
2. **Görsel hiyerarşi:** Mockup "3 karar ailesi"ni numaralı (01/02/03), renk-kodlu (altın/mor/yeşil sol şerit) çerçeveliyor — bizimkinden daha okunaklı.
3. **Marka bütünlüğü:** Mockup'un lacivert+altın+krem token sistemi (`--navy`, `--gold`, `--purple`) tutarlı; bizim "warm" temamız daha gevşek.
4. **Disclaimer stratejisi:** Akışa dokunmuş > tek modal.
5. **Mobil sonuç kartları:** Mockup tabloyu mobilde gerçek kartlara çeviriyor (`mobile-result-card`); bizde tablo yatay kayıyor.

---

## 6. Önerilen Yol Haritası (Faz Faz, Önceliklendirilmiş)

Etki/efor oranına göre sıralı. Her faz bağımsız değer üretir.

### Faz 1 — Hızlı Kazanımlar (düşük efor, yüksek etki) — "Anlatım katmanı"
Uyum puanı algoritması gerektirmeyen, mevcut motora dokunmayan cilalar:
- **4.C** "Neden bu sonuçlar?" düz cümle bandı
- **4.G** Güven şeridi (regülasyon değeri)
- **4.H** Filtre feedback toast'u
- **4.J** Filtre eşik şeffaflığı kutusu
- **4.E** (opsiyonel) Loading funnel görseli

> Bu faz tek başına ürünü "daha açıklanabilir" hissettirir, risk neredeyse sıfır.

### Faz 2 — Uyum Puanı Motoru (yüksek efor, en yüksek konsept etkisi)
- **4.A** Uyum Puanı algoritması + tablo kolonu + sıralama
- **4.F** Sonuç metrikleri kartları (4.A bedavası)
- Tasarım kararı: "Katı filtreleme" vs "Esnek + puanlı" mod seçeneği

> En kritik ama en riskli adım. Skorlama metodolojisi önce küçük bir prototip/A-B ile doğrulanmalı.

### Faz 3 — Açıklanabilirlik Derinliği
- **4.B** "Neden Eşleşti?" drawer / detay sekmesi (4.A'ya bağımlı)
- **4.D** 3-adımlı kurulum sihirbazı (PSV evrimi)

### Faz 4 — Marka & Landing
- **4.I** Hero canlı önizleme
- Token sistemi/marka tazeleme, mobil sonuç kartları, "3 karar ailesi" görsel çerçevesi

---

## 7. Teknik Notlar, Riskler ve Açık Sorular

1. **İkili → Puanlı filtreleme felsefi bir değişim.** Mevcut "tüm eşikleri geçen kalır" davranışı net ve öngörülebilir. Puanlama eklerken bunu **silmek yerine** bir mod olarak sunmak en güvenlisi ("Katı / Esnek").
2. **Skorlama metodolojisi güven meselesi.** Yanlış kalibre edilmiş bir "uyum %86" rakamı, ham metrikten daha yanıltıcı olabilir ve regülasyon riski taşır. Şeffaf formül + "bu yatırım tavsiyesi değil" mesajı şart.
3. **Veri tutarsızlığı:** `deepfin.js` ve `stratejiler/stratejiler.js` GURUS/PRESETS/TECH_PRESETS'in **ayrı kopyalarını** taşıyor, etiketleri/anahtarları senkron değil (örn. `tsmith`/`templeton`/`graham_ncav` vs `smith`/`netnet`). Uyum puanı iki yerde de kullanılacaksa bu önce **tek kaynağa** indirgenmeli.
4. **`.smt-btn` ölü kod:** `_applyScanMode` ve CSS bir Kolay/Pro toggle'ına referans veriyor ama HTML/JS böyle bir eleman üretmiyor (`querySelectorAll('.smt-btn')` boş). Mod değişimi pratikte "Gelişmiş filtreler →" linki + chooser ile oluyor. Wizard çalışmasında temizlenebilir.
5. **4-filtre limiti:** PSV ve tablo çip sistemi aktif filtreyi 4 ile sınırlıyor (`_PSV_MAX_SEL`). Uyum puanı çok filtreyle daha anlamlı olabilir — limit yeniden değerlendirilmeli.
6. **Mockup veri sahte.** Mockup'tan *metin/akış/tasarım* alınmalı; *sayılar/algoritma* sıfırdan ve gerçek veriyle kurulmalı.

---

## 8. Tek Bakışta Sonuç

| | Mockup | Mevcut |
|---|---|---|
| **Güçlü yanı** | Anlatım, açıklanabilirlik, onboarding, marka, konsept | Motor, gerçek veri, strateji derinliği, güç-kullanıcı araçları |
| **Zayıf yanı** | Sahte veri, sığ strateji kütüphanesi, prototip | Açıklama katmanı yok, ham-metrik ağırlıklı, onboarding tek ekran |
| **Doğru hamle** | Konsept + anlatım katmanını al | Motoru koru, üzerine giydir |

**En yüksek getirili tek hamle:** Faz 1'i (anlatım cilaları) hemen yapmak — düşük risk, hissedilir fark. **En stratejik hamle:** Faz 2'de gerçek bir **Uyum Puanı** motoru kurmak — mockup'un tüm vaadinin kilidi bu.

---

# EK — Entegrasyon Planı (2026-06-16)

> Bu ek, iki soruya yanıt verir: **(1)** Bizim çok sayıda filtreyi mockup'un sade yapısına nasıl sokarız; **(2)** Mockup'ta olup bizde olmayanları motora nasıl bağlarız. Onaylanan ürün kararı: **filtreleme felsefesi = "İkisi de" (Katı/Esnek anahtarı).**

## E.0 — Temel Tez

> **Bizim filtre derinliğimiz, mockup'un "Uyum Puanı"nı *gerçek* yapan yakıttır.**

Mockup skorları elle yazılmış (hardcoded) çünkü arkasında gerçek eşik yok. Bizde her `GURUS`/`PRESET`/`TECH_PRESET` zaten `.filters` objesinde `_min`/`_max` eşikleri taşıyor. Yani 25 mercek + 28 teknik + 8 temel preset, bir skorlama motoruna **hazır yapılandırılmış girdi**. İki soru aynı çözümün iki yüzü: çok-filtre bir yük değil, motorun benzini.

## E.1 — Çok Filtreyi Sade Yapıya Sokmak (Kademeli Açığa Çıkarma)

Mockup'un "3 karar ailesi" çerçevesi yapımıza birebir oturuyor (GURUS→Yatırımcı, PRESETS→Temel, TECH→Teknik). Sorun yapı değil, **adet**. Üç katman:

**1. Katman — Vitrin (Kolay/varsayılan):** Ailede 4–5 öne çıkan kart. Zaten var: `PSV_MAIN_GOATS=5`, `PSV_MAIN_PRESETS=4`, `PSV_MAIN_TECH=5`. Mockup'un temiz görünümü = bu katman.

**2. Katman — Gruplama + Arama:** 25 yatırımcı merceğini stile göre grupla (25 düz → 5 grup × ~5):
- **Değer:** Graham, Schloss, Klarman, Dreman, Carlisle, Net-Net (NCAV)
- **Kalite:** Buffett, Munger, Terry Smith, Greenblatt
- **Büyüme / GARP:** Lynch, O'Neil, Minervini, Cathie Wood, O'Shaughnessy
- **Aktivist / Özel Durum:** Ackman, Icahn, Einhorn
- **Momentum / Makro:** Soros, Zweig, Neff, Templeton, K. Fisher
- (+ "Mercek ara…" kutusu — mockup'un step-2 market-arama deseni genişletilir)

Bu hem gezilebilirlik hem **eğiticilik** sağlar (kullanıcı "Buffett neden Kalite" öğrenir). Aynı yöntem 28 teknik preset için de uygulanır (Trend / Momentum / Aşırılık / Hacim / Volatilite grupları).

**3. Katman — Manuel Eşikler (Pro):** ~56 ham `_min/_max` metriği "Gelişmiş / Manuel" bölümünde kalır — vitrini kirletmeden. Bu zaten Kolay/Pro ayrımımız.

> **Sonuç:** Mockup sadeliği = 1. katman varsayılanı; bizim derinliğimiz = 2–3. katman, açığa çıkarma ardında.

## E.2 — Skorlama Motoru (Omurga)

Tüm eksik mockup özellikleri buna bağlı; gerisi bedava düşer.

**Girdi:** aktif filtre seti → her mercek/preset kendi eşik kurallarına açılır
(örn. `Buffett = {roe_min:15, de_max:0.5, pe_min:8, pe_max:25}`).

**Hesap:** her hisse × her aktif eşik için **0–1 normalize alt-skor** (eşiğin ne kadar üstünde/altında). Aile içinde ortala → 3 aile skoru → **ağırlıklı topla** → **0–100 Uyum Puanı**.

**Onaylanan mod kararı — Katı/Esnek anahtarı (ikisi de):**
- **Katı (varsayılan, mevcut davranış):** eşiği geçemeyen **elenir**; Uyum Puanı yalnızca geçenler arasında sıralama + açıklama için kullanılır. Öngörülebilir, düşük risk, mevcut kullanıcıyı bozmaz.
- **Esnek (opt-in):** sıkı eleme gevşer; eşiğe **yakın** olana kısmi puan verilir, liste genişler. "Yüksek Uyum / Yakın İzle / Uygun" rozetleri (mockup pill mantığı) bu modda anlam kazanır.
- UI: sonuç toolbar'ında küçük bir **Katı ⇄ Esnek** anahtarı; varsayılan Katı. Geçiş anında yeniden render (yeni tarama gerekmez — skor istemci tarafında).

**Normalize taslağı (örnek, `_min` kuralı için):**
`alt_skor = clamp((deger − taban) / (tavan − taban), 0, 1)`
— `taban = eşik × (1 − tolerans)`, `tavan = eşik × (1 + bant)`.
Katı modda `deger < eşik` → elenir; Esnek modda `taban..eşik` arası kısmi puan. (`_max` kuralları simetrik.) Tolerans/bant ve aile ağırlıkları **tek bir config'te** tutulur ki kalibrasyon merkezî olsun.

**Çıktı:** her hisse için bir `_matchBreakdown` objesi (hangi kritere ne kadar uydu) saklanır → aşağıdaki özellikleri besler.

## E.3 — Eksik Özelliklerin Motora Bağlanması

| Mockup özelliği | Motordan nasıl beslenir |
|---|---|
| **Uyum Puanı kolonu (4.A)** | Doğrudan motor çıktısı; yeni "Uyum" kolonu + sıralama seçeneği |
| **Neden Eşleşti? drawer (4.B)** | `_matchBreakdown` → aile çubukları + "ROE %18 ≥ %15 ✓" satırları (gerçek değer) |
| **Sonuç metrik kartları (4.F)** | En yüksek uyum / filtre dışı (`allData − filtered`) / aktif aile — bedava |
| **Yüksek-Uyum/Yakın-İzle rozetleri** | Esnek modda puan bandından türetilir |

**Motor gerektirmeyen, hemen yapılabilenler (Faz 1):**
- **"Neden bu sonuçlar?" düz cümle (4.C)** — aktif filtre adlarından `recipeSentence` benzeri
- **Güven şeridi (4.G)** — statik `.trust-strip` ("Eşleşme ≠ öneri")
- **Feedback toast (4.H)** — mockup `showFeedback` birebir
- **Filtre eşik şeffaflığı (4.J)** — seçili eşikleri "Filtre Mantığı" kutusunda göster (veri zaten var)

## E.4 — Önkoşul Tech-Debt (Faz 0)

1. **Tek kaynak:** `deepfin.js` ve `stratejiler.js` strateji verisinin **senkron olmayan iki kopyasını** taşıyor (`tsmith`/`templeton`/`graham_ncav` vs `smith`/`netnet`). Skor iki sayfada da kullanılacağı için önce ortak bir `strategies.js` modülüne indirgenmeli — yoksa aynı hisse iki yerde farklı puan alır.
2. **Ölü kod:** `.smt-btn` Kolay/Pro toggle'ı CSS/JS'te referanslı ama HTML'de üretilmiyor — wizard çalışmasında temizlenir.
3. **4-filtre limiti:** Skor "1 mercek + birkaç kriter" ile daha anlamlı; `_PSV_MAX_SEL` yeniden değerlendirilmeli.

## E.5 — Birleşik Yol Haritası (UI + Veri Kaynakları Karışık, Adım Adım)

> Veri kaynakları (bkz. `docs/veri-kaynaklari-arastirmasi.md`) fazlara **karıştırıldı**. Her faz: *ne yapılır* + *nereden ne çekilir* + *hangi `api/` dosyası* + *hangi özelliği besler*. Kaynaklar **ücretsiz/anahtarsız önce** sıralı; motor gerektirmeyenler erken.

### Faz 0 — Temel & Veri Mimarisi (önkoşul, motor yok)
1. Strateji verisini (`GURUS`/`PRESETS`/`TECH_PRESETS`) tek `public/strategies.js`'e indir → `deepfin.js` + `stratejiler.js` ikisi de import etsin (skor iki yerde tutarlı olsun).
2. Ölü `.smt-btn` kodunu temizle; `_PSV_MAX_SEL=4` limitini gözden geçir.
3. **Veri mimarisi kararı:** doğrudan-API mi yoksa **OpenBB self-host** toplayıcı katman mı? (uzun vade OpenBB; kısa vade doğrudan). Sunucu-önbellek desenini yeni kaynaklar için standardize et (günde 1–2 toplu çekim, kullanıcı başına değil).
- **VERİ:** yok (sadece mimari).

### Faz 1 — Anlatım Cilaları + Hızlı Veri Kazanımı (motor yok)
1. UI: "Neden bu sonuçlar?" düz cümle (`showScanSummary`), güven şeridi (`.trust-strip`), feedback toast (`showFeedback`), filtre eşik şeffaflığı kutusu.
2. **VERİ — DeFiLlama** (⭐ anahtarsız, rate-limit yok) → `api/kripto-scan.js`'e karıştır:
   - `GET https://api.llama.fi/protocols` → protokol başına `tvl`, `mcap`, `change_1d/7d`, `category`
   - `GET https://api.llama.fi/v2/historicalChainTvl` → TVL trendi
   - Coin'e **TVL, MC/TVL, fee geliri** alanları ekle → mevcut "DeFi Değer / Yield" kripto filtreleri sahte değil **gerçek** olur. Düşük efor, sıfır key.
- **Sonuç:** anlatım farkı + kripto derinliği, motor/risk yok.

### Faz 2 — Derinlik + Yeni Veri-Destekli Mercekler (motor yok, veri hazırlığı)
1. UI: 25 yatırımcı merceğini gruplama+arama (Değer/Kalite/Büyüme/Aktivist/Momentum), vitrin→derinlik katmanları. Aynısı 28 teknik için.
2. **VERİ — FMP free** → `api/fundamentals.js` genişlet (alanlar kolon/rozet olarak gösterilir, henüz skora girmez):
   - `GET /stable/price-target-consensus?symbol=` → **analist hedef fiyatı / yükseliş %**
   - `GET /stable/insider-trading/search?symbol=` → **içeriden alım/satım** trendi
   - `GET /stable/institutional-ownership/...` (13F) → **kurumsal sahiplik** değişimi → CAN SLIM/O'Neil & aktivist (Ackman/Icahn) mercekleri *gerçekten* çalışır
3. **VERİ — Marketaux / Alpha Vantage** → yeni `api/sentiment.js`:
   - Marketaux: `GET https://api.marketaux.com/v1/news/all?symbols=THYAO.IS&filter_entities=true` → varlık başına **−1..+1 haber duygu skoru**
   - Yeni **"Duygu/Haber" sinyali** (4. karar ailesi tohumu) → tabloda rozet.
- **Sonuç:** yeni veri kolonları + eksik mercekler tamamlanır; Faz 3 için zemin.

### Faz 3 — Uyum Puanı Motoru (çekirdek) + Tüm Veriyi Skora Bağla
1. Motor: normalize alt-skor → **4 aile** (Yatırımcı / Temel / Teknik / **Duygu**) → ağırlıklı 0–100, **Katı/Esnek anahtarı**.
2. **Mix:** Faz 1–2'de çekilen veriler artık **skor girdisi**:
   - DeFiLlama TVL/fee → kripto Uyum Puanı bileşeni
   - FMP analist hedef / insider / 13F → temel & "akıllı para" alt-skorları
   - Marketaux duygu → Duygu ailesi alt-skoru
3. Tabloya **Uyum** kolonu + sıralama + **sonuç metrik kartları** (En yüksek uyum / filtre dışı / aktif aile).
4. **Referans:** Simply Wall St açık-kaynak analiz modeli (`SimplyWallSt/Company-Analysis-Model`) — normalize/ağırlık kalibrasyonu için incele (implementasyon değil, referans).

### Faz 4 — Açıklanabilirlik Derinliği + (opsiyonel) LLM
1. **Neden Eşleşti? drawer** — aile kırılımı + gerçek-değer satırları: *"ROE %18 ≥ %15 ✓", "Analist hedefi %22 yukarı ✓", "Son 10 haber duygu +0.4 ✓", "Kurumsal alım artıyor ✓"* → Faz 2 verisi burada parlar.
2. **AI (opsiyonel) — Claude** (Claude for Financial Services konsepti): drawer açıklama metnini şablon yerine **LLM ile üret** (önbellekli, maliyet kontrollü). DeepFin zaten Claude üzerinde.
3. 3-adımlı kurulum wizard'ı (PSV evrimi).

### Faz 5 — Makro Bağlam + Marka + Altyapı Olgunluğu
1. **VERİ — FRED + TCMB EVDS** → yeni `api/macro.js`:
   - FRED: `GET https://api.stlouisfed.org/fred/series/observations?series_id=...` → faiz/enflasyon
   - TCMB EVDS → TR enflasyon, politika faizi, kur → ana sayfa/stats-bar **makro bandı** + **"reel getiri"** opsiyonu (Türk yatırımcıya özel farklılaştırma)
2. UI: hero canlı önizleme, marka tazeleme, mobil sonuç kartları.
3. **Altyapı (uzun vade):** OpenBB toplayıcı katmana geçiş + EODHD BIST resmî yedeği → TradingView scraping tek-nokta-arıza olmaktan çıkar.

## E.6 — Veri Kaynağı × Faz Matrisi

| Kaynak | Faz | Ne çekilir | api/ dosyası | Besler |
|---|---|---|---|---|
| **DeFiLlama** | 1 | TVL, fee, DEX hacmi, kategori | `kripto-scan.js` | Kripto DeFi/Yield filtreleri + (F3) skor |
| **FMP** | 2 | Analist hedef, insider, 13F kurumsal | `fundamentals.js` | CAN SLIM/aktivist mercek + (F3) skor + (F4) drawer |
| **Marketaux / Alpha Vantage** | 2 | Haber duygu (−1..+1) | `sentiment.js` (yeni) | Duygu ailesi + (F3) skor + (F4) drawer |
| **Finnhub** | 2 | Kazanç takvimi/sürpriz | `fundamentals.js` | "Kazanç yakın" uyarısı |
| **Simply Wall St modeli** | 3 | (kod değil) skor metodoloji referansı | — | Uyum Puanı kalibrasyonu |
| **Claude (LLM)** | 4 | Açıklama metni üretimi | mevcut Claude | "Neden Eşleşti" anlatımı |
| **FRED / TCMB EVDS** | 5 | Enflasyon, faiz, kur | `macro.js` (yeni) | Makro bandı + reel getiri |
| **OpenBB / EODHD** | 5 | Toplayıcı katman / BIST yedeği | veri katmanı | Risk azaltma, global kapsam |

## E.7 — "Nereden Ne Çekersin" Hızlı Referans (endpoint'ler doğrulanmalı)

- **DeFiLlama** (key yok): `api.llama.fi/protocols`, `/v2/historicalChainTvl`, `/summary/fees/{protocol}`
- **FMP** (free key): `/stable/price-target-consensus`, `/stable/insider-trading/search`, `/stable/institutional-ownership/*`, temel tablolar
- **Marketaux** (free key): `/v1/news/all?symbols=&filter_entities=true` (entity başına `sentiment_score`)
- **Alpha Vantage** (free key): `function=NEWS_SENTIMENT&tickers=` (haber + duygu, tek API'de temel de var)
- **Finnhub** (free key): `/calendar/earnings`, `/stock/price-target`, `/stock/recommendation`
- **FRED** (free key): `/fred/series/observations?series_id=`
- **TCMB EVDS** (kayıt/anahtar gerekir — doğrulanmalı): enflasyon/faiz/kur serileri
- **OpenBB** (self-host, kendi key'lerin): tek REST arayüzünden yukarıdakilerin çoğu

> Tüm free tier'lar çağrı-limitli → **sunucu önbelleği** (var) ile günlük toplu çekim; ToS/atıf gereksinimleri entegrasyondan önce kontrol edilmeli.

İki "kazanç düğümü" değişmedi: **Faz 1** (anlatım + DeFiLlama, sıfır risk/key) ve **Faz 3** (Uyum Puanı motoru, tüm veriyi birleştiren kilit).

---

# E.8 — Faz 3: Uyum Puanı Motoru — Detaylı Entegre Şeması

> Mevcut mimariye (`deepfin.js`) gömülü, somut tasarım. Karar: **Katı/Esnek anahtarı (ikisi de)**. Bu yalnızca tasarımdır; kod değişikliği yok.

## E.8.1 — Mimari Akış

```
                ┌─────────────── runScan() → allData (ham, ~3000 satır) ───────────────┐
                │                                                                       │
 Aktif çipler   │   ┌──────────────┐   filtre (Katı)    ┌──────────────┐                │
 (GURUS/PRESETS │──▶│ _applyChips  │──▶ merged inputs ─▶│ applyAndRender│─▶ filtered    │
  /TECH +       │   │ (provenance  │                    │  (mevcut)     │   (geçenler)   │
  Duygu sinyali)│   │  KORUNUR)    │                    └──────┬───────┘                │
                │   └──────┬───────┘                           │                        │
                │          │ aktif kural seti (aile etiketli)  │                        │
                │          ▼                                   ▼                        │
                │   ┌───────────────────────  scoreResults(rows, ctx, mode) ─────────┐  │
                │   │  her satır:  computeMatch(stock)                                │  │
                │   │   ├─ normalizeRule(value, rule, mode) → 0..1 alt-skor           │  │
                │   │   ├─ aile içi ortala (Yatırımcı/Temel/Teknik/Duygu)            │  │
                │   │   └─ ağırlıklı topla → 0..100  + breakdown objesi              │  │
                │   └───────────────────────────────┬───────────────────────────────┘  │
                │                                    ▼                                   │
                │   s._match = { score, band, families{...}, passedHard }               │
                └────────────────────────────────────┬──────────────────────────────────┘
                                                      ▼
        ┌──────────────┬───────────────────┬──────────────────────┬─────────────────────┐
   Uyum kolonu     sıralama            sonuç metrik           "Neden Eşleşti?"      Katı/Esnek
  (_vsRowHtml)   (sorted: 'match')    kartları (E/4.F)        drawer (Faz 4)        toggle → re-score
```

**Kilit fikir:** Filtreleme (eleme) ile **skorlama** ayrılır. Eleme mevcut `applyAndRender` merged-input mantığını kullanır; skorlama ise **aktif çipleri provenance'ıyla** (hangi aile, hangi kural) tüketir — çünkü aile kırılımı için "bu kuralı hangi mercek getirdi" bilgisi gerekir. (Mevcut `mergeOne` bunu kaybediyor; motor merge'den ÖNCEKİ çip listesini okur.)

## E.8.2 — Veri Modeli

**Kural (rule)** — bir çipin `.filters` objesindeki her eşik tek bir kurala açılır:
```js
{ metric:'roeTTM', op:'min', target:15, family:'yatirimci', source:'buffett', weight:1 }
{ metric:'peNormalizedAnnual', op:'range', lo:8, hi:25, family:'yatirimci', source:'buffett' }
{ metric:'_sentiment', op:'min', target:0.2, family:'duygu', source:'news' }   // Faz 2 verisi
```

**Çıktı (her hisseye iliştirilir):**
```js
s._match = {
  score: 81,                 // 0..100
  band: 'high',              // high | watch | ok | (Katı'da elenen yok)
  passedHard: true,          // Katı modda sert kuralları geçti mi
  families: {
    yatirimci: { label:'Buffett', score:0.84, coverage:'3/3',
      rules:[ {metric:'ROE', val:18, target:'≥15', sub:0.80, status:'pass'},
              {metric:'D/E', val:0.35, target:'≤0.5', sub:0.82, status:'pass'},
              {metric:'F/K', val:12, target:'8–25', sub:0.90, status:'pass'} ] },
    temel:    { label:'Değer', score:0.86, coverage:'3/3', rules:[…] },
    teknik:   { label:'Yüksek Hacim', score:0.78, coverage:'2/2', rules:[…] },
    duygu:    { label:'Haber', score:0.75, coverage:'1/1', rules:[…] }
  }
};
```
Bu tek obje; tablo kolonu, sıralama, metrik kartları, drawer ve rozetin **ortak kaynağı**.

## E.8.3 — Normalize Fonksiyonu (matematik)

Eşik = **geçiş çizgisi**; tam eşikte "sağlam geçer" = `PASS=0.6`, mükemmelde `1.0`, yakın-ıskada kısmi.

**`_min` kuralı** (yüksek iyi, hedef T):
- `C = T·(1+band)` (mükemmel tavan), `F = T·(1−tol)` (tolerans tabanı)
- `value ≥ T` → `sub = PASS + (1−PASS)·clamp((value−T)/(C−T),0,1)`
- `value < T` → **Esnek:** `sub = PASS·clamp((value−F)/(T−F),0,1)` · **Katı:** kural başarısız → hisse elenir

**`_max` kuralı** (düşük iyi, hedef T) — simetrik: `C = T·(1−band)`, `F = T·(1+tol)`; `value ≤ T` geçer.

**`range` [lo,hi]:** `min(_min@lo, _max@hi)` — iki uca da uyum.

Varsayılan: `PASS=0.6, band=0.5, tol=0.25` (merkezî config'te, kalibre edilebilir).

## E.8.4 — Aile Birleştirme + Ağırlık

1. Kural alt-skorlarını **aile** bazında ortala (yalnızca verisi olan kurallar; bkz. E.8.5).
2. Aktif aileleri **ağırlıklı** birleştir; ağırlıkları yalnızca aktif aileler üzerinden **renormalize** et:
   `score = 100 · Σ(w_f · familyScore_f) / Σ(w_f)`
3. Varsayılan ağırlıklar: `{ yatirimci:1, temel:1, teknik:1, duygu:0.7 }` (duygu daha hafif).

## E.8.5 — Eksik Veri & Özel Durumlar

- **`null`/eksik metrik:** O kural aile ortalamasından **çıkarılır** (ne 0 ceza, ne kredi); `coverage` "2/3" gösterir. Aile tamamen boşsa aile düşer.
- **Özel mercekler:** `peg` (0–1.5 ideal → `sub=clamp((1.5−peg)/1.5,0,1)`), `piotroski` (0–9 → `/9`) kendi skorlayıcılarını alır (mevcut `special` bayrağı korunur).
- **Yön/işaret:** her metrik için "yüksek mi iyi" yönü kural `op`'undan gelir; ters metrikler (`_max`) simetrik formülle.
- **Bölme/aşırı uç:** `T=0` ise oransal yerine mutlak band; `clamp` ile taşma engellenir.

## E.8.6 — Katı/Esnek Anahtarı (davranış)

| | **Katı (varsayılan)** | **Esnek (opt-in)** |
|---|---|---|
| Eleme | Sert kuralları geçemeyen **elenir** (mevcut davranış) | Eşik elemesi yok; herkes skorlanır |
| Alt-skor aralığı | Geçen kurallar [0.6–1.0] | Iska olanlar [0–0.6] kısmi |
| Liste | Dar, "saf" | Geniş; `esnekFloor=40` altı kesilir (3000 satır olmasın) |
| Rozet | Tümü ≥ geçer | Yüksek/Yakın/Uygun ayrışır |

**Geçiş:** toolbar'da `setMatchMode('kati'|'esnek')` → **istemci tarafında** yeniden skorla + yeniden sırala + render. **Yeni ağ taraması YOK** (`allData` zaten elde). Mevcut "sıkı filtreleme" felsefesi silinmez, varsayılan kalır.

## E.8.7 — Çıktının Tüketicileri

| Tüketici | `s._match` alanı | Dosya/fonksiyon |
|---|---|---|
| Uyum kolonu + çubuk | `.score` | `_vsRowHtml` (3538) |
| Sıralama "Uyum puanı" | `.score` | `sorted` (3320), sort opsiyonu |
| Rozet (Yüksek/Yakın/Uygun) | `.band` | `_vsRowHtml` |
| Sonuç metrik kartları | en yüksek `.score`, elenen sayısı | `showScanSummary` (5153) |
| "Neden Eşleşti?" drawer | `.families` | Faz 4 |
| LLM açıklama (ops.) | `.families` → prompt | Faz 4 |

## E.8.8 — Entegrasyon Noktaları (gerçek kod)

1. **Yeni modül `public/scoring.js`:** `computeMatch(stock, ctx)`, `normalizeRule(value, rule, mode)`, `aggregateFamilies(subs, weights)`, `SCORE_CFG`.
2. **`_applyChips`** (2879): merge'den önce **aktif çip→kural** listesini (aile etiketli) `ctx.activeRules`'a yaz.
3. **`applyAndRender`** (3143): `filtered` oluştuktan sonra (Katı) **veya** `allData` üstünde (Esnek) `scoreResults(rows, ctx, _matchMode)` çağır; her satıra `s._match` iliştir.
4. **`sorted`** (3320): `sortSt.field==='match'` → `s._match.score`'a göre sırala (varsayılan sıralama puana çekilebilir).
5. **`_vsRowHtml`** (3538): yeni "Uyum" `<td>` (mini çubuk + sayı + rozet).
6. **`showScanSummary`** (5153): metrik kartları.
7. **Toolbar:** `setMatchMode` anahtarı.
8. **Kripto/Fon:** aynı motor `_renderKripto`/`_renderFon` için de çağrılır (kural kaynakları farklı: kripto'da DeFiLlama/CoinGecko alanları).

## E.8.9 — Çekirdek Pseudocode

```js
function normalizeRule(v, r, mode){
  if (v == null) return null;                 // veri yok → ortalamadan çıkar
  const {PASS,band,tol} = SCORE_CFG;
  if (r.op==='range'){
    return Math.min(normalizeRule(v,{op:'min',target:r.lo},mode),
                    normalizeRule(v,{op:'max',target:r.hi},mode));
  }
  const T=r.target;
  if (r.op==='min'){
    const C=T*(1+band), F=T*(1-tol);
    if (v>=T) return PASS+(1-PASS)*clamp((v-T)/(C-T||1),0,1);
    if (mode==='kati') return null;           // elenmiş sayılır (filtre zaten attı)
    return PASS*clamp((v-F)/(T-F||1),0,1);
  } else { // max
    const C=T*(1-band), F=T*(1+tol);
    if (v<=T) return PASS+(1-PASS)*clamp((T-v)/(T-C||1),0,1);
    if (mode==='kati') return null;
    return PASS*clamp((F-v)/(F-T||1),0,1);
  }
}

function computeMatch(s, ctx){
  const fam={};                                // aile → [alt-skorlar]
  for (const r of ctx.activeRules){
    const sub = normalizeRule(s[r.metric], r, ctx.mode);
    if (sub==null) continue;
    (fam[r.family] ??= {subs:[],rules:[]});
    fam[r.family].subs.push(sub);
    fam[r.family].rules.push({metric:r.label, val:s[r.metric], target:r.targetTxt, sub, status:sub>=0.6?'pass':'near'});
  }
  let wsum=0, acc=0, families={};
  for (const [f,o] of Object.entries(fam)){
    const fs = o.subs.reduce((a,b)=>a+b,0)/o.subs.length;
    const w = SCORE_CFG.familyWeights[f] ?? 1;
    wsum+=w; acc+=w*fs;
    families[f]={score:fs, coverage:`${o.subs.length}/${ctx.familyRuleCount[f]}`, rules:o.rules};
  }
  const score = wsum ? Math.round(100*acc/wsum) : null;
  const band = score>=SCORE_CFG.bands.high?'high':score>=SCORE_CFG.bands.watch?'watch':score>=SCORE_CFG.bands.ok?'ok':'low';
  return {score, band, families, passedHard:true};
}
```

## E.8.10 — İşlenmiş Örnek (THYAO; Buffett + Değer + Yüksek Hacim + Haber)

| Aile | Kural | Değer | Hedef | Alt-skor |
|---|---|---|---|---|
| Yatırımcı (Buffett) | ROE | 18 | ≥15 | 0.80 |
| | D/E | 0.35 | ≤0.5 | 0.82 |
| | F/K | 12 | 8–25 | 0.90 |
| → aile | | | | **0.84** |
| Temel (Değer) | … | | | **0.86** |
| Teknik (Y.Hacim) | … | | | **0.78** |
| Duygu (Haber) | sentiment | +0.5 | ≥0.2 | **0.75** |

Ağırlıklar `[1,1,1,0.7]`, Σw=3.7 →
`score = 100·(0.84+0.86+0.78+0.7·0.75)/3.7 = 100·3.005/3.7 ≈ 81` → **band = Yüksek Uyum**.
(Not: bantlar `SCORE_CFG.bands` ile kalibre edilir; mockup'taki 86 gibi sabitler temsilîydi.)

## E.8.11 — Config / Kalibrasyon (tek yer)

```js
const SCORE_CFG = {
  PASS:0.6, band:0.5, tol:0.25,
  familyWeights:{ yatirimci:1, temel:1, teknik:1, duygu:0.7 },
  bands:{ high:80, watch:65, ok:50 },
  esnekFloor:40
};
```
Tüm "his/kalibrasyon" buradan ayarlanır; mantık değişmez. Simply Wall St açık-kaynak modeli bu eşikler için referans.

## E.8.12 — Performans

- Karmaşıklık: `O(n · kural)`; n≤3000, kural≤~12 → ~36K işlem, **<5 ms**. Sanal kaydırma etkilenmez (skor önceden hesaplanıp `s._match`'e yazılır, render sadece okur).
- Yeniden hesap **yalnızca** filtre değişiminde veya Katı/Esnek geçişinde; ağ taraması gerekmez.
- Kripto/fon için de aynı; veri alanları kaynağa göre değişir.

## E.8.13 — Riskler / Açık Sorular

1. **Provenance:** mevcut `mergeOne` çip→input birleştirmesi aileyi kaybediyor; motor merge ÖNCESİ çip listesini okumalı (E.8.8/2). Refactor gerek.
2. **Kalibrasyon güveni:** yanlış band/ağırlık "%86 uyum"u yanıltıcı yapar → şeffaf formül + "tavsiye değildir" şart.
3. **Esnek modda liste boyutu:** `esnekFloor` ve sıralama ile sınırlanmalı (performans + anlam).
4. **Tek kaynak önkoşulu:** Faz 0 (`strategies.js`) tamamlanmadan skor iki sayfada tutarsız olur.
5. **Kripto/fon kural setleri** ayrı tanımlanmalı (farklı metrikler); aile çerçevesi (Yatırımcı/Temel/Teknik) hisseye özgü, kripto'da "Kategori/Strateji/On-chain" aileleri olur.

---

# E.9 — Skorlama Rafine: Ağırlıklar & Sınır Yakınlığı (veri-tahrikli)

> **İncelenen yeni mockup:** `7771ab0b-yenimarkastratejitaramaduzeltilmis.html` (1957 satır; eskisinin +789 satır rafine hâli). Önemli eklemeler: drawer'da **3-durumlu kriter kontrol listesi** (matched / near / miss), setup'ta **`criteria-preview`** (eşikleri önden gösterir → Faz 1 şeffaflık somutlaşır), filtre panelinde **özet/düzenleme modu**, "Uyum Puanı" → **"Eşleşme düzeyi"**, bantlar **Güçlü / Yakın / Orta Eşleşme**, premium görsel rafinaj. Bu bölüm, kullanıcının iki sorusunu yanıtlar: **filtre ağırlıkları** ve **sınır yakınlığı** (%10 mu %20 mi?), *tüm veriyi verimli kullanarak*.

## E.9.0 — Yeni Mockup Ne Öğretti (kanıt)

Mockup'un gerçek kodu her kritere **elle ayrı "near" eşiği** yazıyor:
```
ROE:     pass>15,  near>13     (~%13)
D/E:     pass<0.5, near<0.65   (~%30)
PD/DD:   pass<2,   near<2.4    (~%20)
Hacim:   pass>1.2, near>1.05   (~%12)
52H:     pass<10,  near<15     (~%50)
Drawdown:pass<22,  near<30     (~%36)
Payout:  pass<70,  near<78     (~%11)
status = pass ? 'matched' : near ? 'near' : 'miss'   // ağırlık YOK, hepsi eşit
```
**İki ders:** (1) **Sabit % yanlış** — mockup bile metrik başına %11–%50 arası *değişen* tolerans seçmiş, çünkü her metriğin doğal yayılımı farklı. (2) Ama bunları **elle yazmak** bizim ölçeğimizde (56 metrik × 25+ strateji) sürdürülemez ve keyfî. Ayrıca mockup'ta **hiç ağırlık yok**. İkisini de daha iyi yapacağız — *zaten çektiğimiz veriyle*.

## E.9.1 — Sınır Yakınlığı: %10/%20 DEĞİL, Evrenin Dağılımına Göre

**Temel fikir:** Her tarama `allData`'yı (~3000 satır) belleğe alıyor; şu an sadece ikili filtreleme için. Bu **kesitsel dağılım** bedava elimizde. "Yakınlık", metriğin **kendi doğal yayılımı** cinsinden ölçülmeli — sabit yüzde değil.

**Sağlam yayılım (robust σ):** Std sapma DEĞİL (finansal veride aşırı uçlar var; tek bir F/K=900 onu patlatır). Bunun yerine **IQR** tabanlı:
```
robustσ_m = IQR_m / 1.349        // IQR = Q3 − Q1, evren genelinde, metrik m için
```
(veya MAD×1.4826). Tarama başına bir kez, O(n) ≈ ihmal edilebilir.

**Band (bir `_min` kuralı, eşik T):**
```
tol_abs  = k_near  · robustσ_m     // T altı "near" toleransı
band_abs = k_excel · robustσ_m     // T üstü "mükemmel" erişimi (1.0'a)
F = T − tol_abs    (near tabanı)    C = T + band_abs   (mükemmel tavan)
value ≥ T  → matched   ·   F ≤ value < T → near   ·   value < F → miss
```
`_max` kuralları simetrik. Bu, E.8.3'teki **sabit %'leri (band=0.5·T, tol=0.25·T) σ-tabanlı band'la değiştirir** — gerisi (PASS=0.6 çıpası, normalize eğrisi) aynı kalır.

**"%10 mu %20 mi" sorusunun cevabı:** **Hiçbiri sabit değil.** Efektif yüzde = `k_near · robustσ_m / T` → her metrik için kendiliğinden farklı çıkar (birinde %8, diğerinde %35) — mockup'un elle seçtiği değişkenliği **otomatik ve savunulabilir** biçimde üretir. Tek ayar düğmesi `k_near` (≈0.5): "yarım robust-σ kadar altı hâlâ yakın".

**Alternatif (saf yüzdelik-sıra):** "near" = eşiğin oturduğu yüzdelik dilimin hemen altındaki ~8 puanlık kohort. Daha da robust ve açıklaması kolay ("geçen kümeye komşu"), ama eşiğin mutlak anlamını gölgeler. **Birincil öneri: IQR-tabanlı band** (mutlak eşik anlamını korur); yüzdelik-sıra ikincil/deneysel.

## E.9.2 — Küçük Örneklem & Özel Durumlar

- **n < 30 (tek sektör, az coin):** IQR kararsız → o metrik için **sabit %15** geçici toleransa düş (güvenli varsayılan).
- **Boolean kriterler** ("nakit akışı pozitif"): band yok, sadece matched/miss (near yok).
- **Sınırlı metrikler** (RSI 0–100): band mutlak puan cinsinden (σ yine evrenden).
- **Özel mercekler** (peg, piotroski): E.8.5'teki özel skorlayıcı; band uygulanmaz.

## E.9.3 — Filtre Ağırlıkları: 4 Kademe (açıklanabilirlik öncelikli)

Ağırlık iki düzeyde: **aile-içi** (bir merceğin hangi kriteri daha önemli) ve **aileler-arası** (Yatırımcı/Temel/Teknik/Duygu).

| Kademe | Ne | Varsayılan mı? | Neden |
|---|---|---|---|
| **1. Eşit** | Tüm kriter/aile eşit, duygu 0.7; aktif+kapsanan aileler üzerinden renormalize | ✅ **Varsayılan** | En açıklanabilir; "Neden Eşleşti" şeffaflığını bozmaz |
| **2. Strateji vurgusu** | Mercek, kritik kritere `weight` tanımlar (varsayılan 1); örn. Magic Formula = ROIC + kazanç verimi baskın | Opt-in | Düşük yazım maliyeti, sadece gereken yerde |
| **3. Kullanıcı slider** | Aileler-arası ağırlığı kullanıcı ayarlar (Yatırımcı/Temel/Teknik/Duygu) | Opt-in | Güç kullanıcı; şeffaf & kontrollü |
| **4. Ayrımsal (data-driven)** | Kriteri **bilgi içeriğine** göre ağırlıkla: evreni ayrıştıran kriter (yüksek dağılım / ~%50 geçme oranı) daha ağır | ⚠️ **Deneysel** | "Tüm veriyi verimli kullan"ın en uç hâli ama riskli (bkz. aşağı) |

**Ayrımsal ağırlık (Kademe 4) — neden varsayılan DEĞİL:** Herkesin geçtiği bir kriter (geçme oranı ~%100) sinyal taşımaz; evreni ikiye bölen kriter taşır → `w ∝ (1 − |2·geçmeOranı − 1|)` veya kesitsel dağılım. **Ama:** (a) nadir-geçen bir kriter skoru ele geçirebilir, (b) aynı hisse farklı evrende farklı puan alır (kafa karıştırır), (c) drawer'da açıklaması zor. Bu yüzden **şeffaflık-öncelikli üründe varsayılan eşit kalır; ayrımsal mod opsiyonel/etiketli** sunulur ("bu ağırlık, kriterin mevcut evreni ne kadar ayrıştırdığını yansıtır").

**Güven/kapsam ağırlığı (her kademede):** Bir aile 3 kriterden yalnız 1'inde veri bulabiliyorsa, skoru daha az güvenilir → aile ağırlığını **kapsamla** çarp (`coverage = değerlenen/aktif`). Hem "veriyi verimli kullanır" hem açıklanabilir: *"3 kriterden 1'i değerlendi — düşük güven."*

## E.9.4 — "Tüm Veriyi Verimli Kullan" — Birleşik İlke

`allData` (zaten bellekte) tek taramadan şunları **bedava** üretir:
1. **Sınır yakınlık band'ı** → robustσ_m (IQR) ile metrik-uyarlı (E.9.1) — *birincil veri kazanımı*.
2. **Eşik-üstü prim** → yüzdelik-sıra: en üst-desil ROE, eşiği kıl payı geçenden yüksek skor alır (E.8.3 band'ına ek).
3. **(Opsiyonel) Ayrımsal ağırlık** → geçme oranı/dağılım (E.9.3 Kademe 4).
4. **3-durum (matched/near/miss)** → drawer kontrol listesini besler (yeni mockup).
Hepsi O(n)/O(n log n) tek geçiş; sanal kaydırma etkilenmez.

## E.9.5 — Kalibrasyon Önerisi

```js
SCORE_CFG.proximity = {
  method:'iqr',          // 'iqr' | 'percentile' | 'fixed'
  kNear: 0.5,            // T altı kaç robust-σ hâlâ "near"
  kExcel: 1.5,          // T üstü kaç robust-σ ile "mükemmel"
  smallNFallback: 0.15, // n<30 ise sabit %15
  minN: 30
};
SCORE_CFG.weights = {
  mode:'equal',                 // 'equal' | 'strategy' | 'user' | 'discriminative'
  familyWeights:{ yatirimci:1, temel:1, teknik:1, duygu:0.7 },
  useCoverageConfidence:true
};
```
`kNear`'ı, tipik near-band ~%10–25'e denk gelecek şekilde kalibre et (mockup'un elle aralığını taklit eder ama metrik-uyarlı). Simply Wall St açık-kaynak modeli referans; küçük bir backtest/göz kontrolüyle doğrula.

## E.9.6 — Yol Haritasına Etki (Faz 3/4 güncellemesi)

- **Faz 3 (motor):** Normalize band'ı **σ-tabanlı (E.9.1)** kur; ağırlık varsayılanı **eşit + kapsam-güveni**; ayrımsal mod *deneysel bayrak* arkasında. `allData` dağılım istatistiklerini (Q1/Q3 per metrik) skorlamadan önce bir kez hesapla.
- **Faz 4 (açıklanabilirlik):** Drawer'da yeni mockup'un **3-durumlu kriter kontrol listesi** (matched/near/miss) — her satır: kriter, gerçek değer, durum rozeti. Near durumu doğrudan E.9.1 band'ından gelir → "%13.2 ROE, %15 eşiğine **yakın**".
- **Faz 1 (şeffaflık):** Setup'taki **`criteria-preview`** (eşikleri önden gösterme) yeni mockup'tan birebir alınabilir.

---
*Bu doküman yalnızca araştırma/analiz amaçlıdır; kodda değişiklik içermez.*
