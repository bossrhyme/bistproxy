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
*Bu doküman yalnızca araştırma/analiz amaçlıdır; kodda değişiklik içermez.*
