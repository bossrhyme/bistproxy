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
*Bu doküman yalnızca araştırma/analiz amaçlıdır; kodda değişiklik içermez.*
