// ═══════════════════════════════════════════════════════════
// strategies.js — Tek Strateji Kaynağı (Faz 0)
// PRESETS (Temel), TECH_PRESETS (Teknik), GURUS (Yatırımcı Lensleri)
// deepfin.js bu dosyadan SONRA yüklenir; tanımlar paylaşılan global
// lexical kapsam üzerinden erişilir. Buraya dokunmadan önce bkz:
// docs/mockup-karsilastirma-raporu.md (Faz 0).
// NOT: stratejiler/stratejiler.js hâlâ kendi kopyasını taşıyor —
// filtre DEĞERLERİ birebir aynı; etiket birleştirmesi Faz 3 önkoşulu.
// ═══════════════════════════════════════════════════════════

const PRESETS = {
  // Klasik değer yatırımı: F/K<15, PD/DD<2, temettü ödeyen
  value:    { label: 'Değer Odaklı',    desc: 'Kazancına göre ucuz, defter değerine yakın fiyatlı ve temettü ödeyen şirketleri bulur. F/K 15 altı, PD/DD 2 altı, temettü %2 üzeri.', filters: {pe_max:15, pb_max:2, div_min:2} },
  // Büyüme: kazanç+gelir ivmesi, güçlü özkaynak getirisi
  growth:   { label: 'Büyüme Odaklı',   desc: 'Satışları ve karları hızla büyüyen, özkaynağını verimli kullanan şirketleri bulur. Kazanç büyümesi %20, gelir büyümesi %15, ROE %15 üzeri.', filters: {earng_min:20, revg_min:15, roe_min:15} },
  // Temettü: yüksek verim, sürdürülebilir ödeme kapasitesi
  dividend: { label: 'Temettü Odaklı',  desc: 'Yüksek ve sürdürülebilir temettü ödeyen, borcu makul şirketleri bulur. Temettü %4 üzeri, borç/özkaynak %80 altı, cari oran 1.2 üzeri.', filters: {div_min:4, de_max:80, cr_min:1.2} },
  // Kalite: Buffett/Munger "wonderful company at fair price"
  quality:  { label: 'Kalite Odaklı', desc: 'Yüksek karlılık ve düşük borçla her koşulda ayakta kalan şirketleri bulur. ROE %20, net marj %15, brüt marj %35 üzeri.', filters: {roe_min:20, margin_min:15, gross_min:35, de_max:80, cr_min:1.5} },
  // Az borçlu: Buffett "borçsuz şirket" prensibi
  lowdebt:  { label: 'Düşük Borç Odaklı', desc: 'Borcu çok düşük, nakdi güçlü, krize dayanıklı şirketleri bulur. Borç/özkaynak %30 altı, cari oran 2 üzeri.', filters: {de_max:30, cr_min:2} },
  // Momentum: güçlü ivme, hem büyüme hem fiyat güç
  momentum: { label: 'Momentum Odaklı', desc: 'Satış ve kar büyümesi aynı anda ivmelenen şirketleri bulur. Her ikisi de %20 üzeri.', filters: {revg_min:20, earng_min:20} },
  // Boyut: kurumların radarına girmemiş küçük ama karlı şirketler
  smallcap: { label: 'Küçük Ölçek',   desc: 'Kurumların radarına girmemiş küçük ama karlı şirketleri bulur. Piyasa değeri 500M dolar altı, ROE %15 ve kazanç büyümesi %15 üzeri.', filters: {mc_max:500, roe_min:15, earng_min:15} },
  // Boyut: oturmuş, güvenilir devler
  megacap:  { label: 'Büyük Ölçek',     desc: 'Oturmuş, güvenilir büyük şirketleri bulur. Piyasa değeri 10 milyar dolar üzeri, ROE %12 üzeri ve temettü ödeyen.', filters: {mc_min:10000, roe_min:12, div_min:1} }
};

// Teknik Analiz Presetleri
// Teknik Analiz Presetleri
// Teknik Analiz Presetleri
const TECH_PRESETS = {

  // ── GELİŞTİRİLMİŞ (mevcut 6) ──────────────────────────────────────────

  breakout: {
    label: 'Breakout',
    desc: '52 haftalık zirvesinin dibinde hacimli yukarı hareket yapan hisseleri bulur. Zirveye %5 mesafe, günlük %1.5 üzeri artış.',
    filters: { from_high_min: -5, chg_min: 1.5, vol_min: 0.5, tech_rating_min: 0.1 }
  },

  oversold: {
    label: 'Aşırı Satış',
    desc: 'Sert düşüş sonrası aşırı satılmış bölgeye giren hisseleri bulur. RSI 35 altı, zirveden %20 üzeri uzaklık.',
    filters: { from_high_max: -20, chg_min: 0, rsi_max: 35 }
  },

  nearHigh: {
    label: '52H Zirve',
    desc: '52 haftalık zirvesine yakın seyreden güçlü trenddeki hisseleri bulur. Zirveye %5 mesafe, 3 aylık getiri %5 üzeri.',
    filters: { from_high_min: -5, perf3m_min: 5 }
  },

  pullback: {
    label: 'Düzeltme',
    desc: 'Güçlü trendde kısa geri çekilme yaşayan hisseleri bulur. Zirveden %5-15 geride, 6 aylık getiri %15 üzeri.',
    filters: { from_high_min: -15, from_high_max: -5, perf6m_min: 15 }
  },

  strongDay: {
    label: 'Günlük Hareket',
    desc: 'Bugün yüksek hacimle sert yükselen hisseleri bulur. Günlük %2 üzeri artış, 0.5M üzeri hacim.',
    filters: { chg_min: 2, vol_min: 0.5 }
  },

  highVolume: {
    label: 'Yüksek Hacim',
    desc: 'Normalinin en az 2 katı hacimle yükselen hisseleri bulur. Göreli hacim artışı kurumsal ilginin en güvenilir işaretidir.',
    filters: { rel_vol_min: 2, chg_min: 0 }
  },

  techBuy: {
    label: 'Teknik Alım',
    desc: '26 teknik göstergenin çoğunluğunun alım sinyali verdiği hisseleri bulur. Teknik skor 0.5 üzeri.',
    filters: { tech_rating_min: 0.5 }
  },

  momentum3m: {
    label: '3A Momentum',
    desc: 'Hem 3 hem 6 aydır piyasanın önünde giden hisseleri bulur. 3 aylık %15, 6 aylık %20 üzeri getiri.',
    filters: { perf3m_min: 15, perf6m_min: 20 }
  },

  trendFollow: {
    label: 'Trend Takibi',
    desc: '52 haftalık dibinden uzaklaşmış, kazancını koruyan hisseleri bulur. Dipten %25 üzeri, 6 aylık getiri %10 üzeri.',
    filters: { from_low_min: 25, perf6m_min: 10 }
  },

  rsiBounce: {
    label: 'Dip Tepkisi',
    desc: 'Aşırı satıştan çıkıp toparlanmanın erken aşamasında olan hisseleri bulur. RSI 30-50 arası, dipten %3 üzeri.',
    filters: { rsi_min: 30, rsi_max: 50, from_low_min: 3 }
  },

  // ── GÖSTERGE TABANLI ──────────────────────────────────────────────────

  goldenCross: {
    label: 'Golden Cross',
    desc: 'Uzun vadeli yapısal yükseliş trendindeki hisseleri bulur. Fiyat 200 günlük ortalamanın, 50 günlük ortalama 200 günlüğün üzerinde.',
    filters: { above_sma200_min: 0, sma_trend_min: 0.5 }
  },

  macdReversal: {
    label: 'MACD Dönüşü',
    desc: 'Düşüş sonrası yeni yükseliş sinyali veren hisseleri bulur. MACD sinyal çizgisini yukarı kesmiş, henüz sıfırın altında.',
    filters: { macd_hist_min: 0, macd_max: 0 }
  },

  adxTrend: {
    label: 'Belirgin Trend',
    desc: 'Gücü ölçülebilir, alıcı yönü baskın trendleri bulur. ADX 25 üzeri, +DI eksi DI üzerinde.',
    filters: { adx_min: 25, adx_di_diff_min: 0 }
  },

  bbBounce: {
    label: 'Bollinger Dibi',
    desc: 'Alt banda gerileyip ortalamaya dönüş potansiyeli taşıyan hisseleri bulur. Fiyat alt bandın %3 yakınında, RSI 40 altı.',
    filters: { bb_dist_max: 3, rsi_max: 40 }
  },

  stochReversal: {
    label: 'Stokastik Dönüş',
    desc: 'Aşırı satım bölgesinden yukarı dönen hisseleri bulur. %K 25 altı ve %D çizgisinin üzerine çıkmış.',
    filters: { stoch_k_max: 25, stoch_kd_min: 0 }
  },

  maConfirm: {
    label: 'Ortalama Onayı',
    desc: '15 hareketli ortalamanın çoğunluğunun üzerinde işlem gören hisseleri bulur. Ortalama skoru 0.5 üzeri.',
    filters: { ma_rating_min: 0.5 }
  },

  oscConfirm: {
    label: 'Osilatör Onayı',
    desc: 'Momentum osilatörlerinin alım bölgesinde olduğu hisseleri bulur. Osilatör skoru 0.1 üzeri.',
    filters: { osc_rating_min: 0.1 }
  },

  lowBeta: {
    label: 'Defansif',
    desc: 'Piyasadan az dalgalanan temettülü hisseleri bulur. Beta 0.8 altı, temettü %1 üzeri.',
    filters: { beta_max: 0.8, div_min: 1 }
  },

  ytdLeader: {
    label: '1A Momentum',
    desc: 'Son bir ayda güçlü ivme kazanan hisseleri bulur. 1 aylık getiri %10, 3 aylık getiri %10 üzeri.',
    filters: { perf1m_min: 10, perf3m_min: 10 }
  },

  // ── KOMBİNASYON SİNYALLER ──────────────────────────────────────────────

  sma200Test: {
    label: 'SMA200 Testi',
    desc: '200 günlük ortalamasını destek olarak test edip dönen hisseleri bulur. Fiyat SMA200\'ün %3 yakınında, RSI 40 üzeri, günlük hafif artış. Trend devam sinyali.',
    filters: { above_sma200_min: 0, above_sma200_max: 3, rsi_min: 40, chg_min: 0.3 }
  },

  multiMomentum: {
    label: 'Çok Dönemli Momentum',
    desc: '1, 3 ve 6 aylık periyodların hepsinde piyasayı geçen hisseleri bulur. Kısa vadeli ivme orta-uzun vadede de güçlüdür — üç dönem uyumu en güvenilir momentum sinyalidir.',
    filters: { perf1m_min: 3, perf3m_min: 10, perf6m_min: 20 }
  },

  oscAlignment: {
    label: 'Üçlü Osilatör',
    desc: 'RSI, MACD histogramı ve Stokastik %K — üç bağımsız osilatör aynı anda alım bölgesinde olan hisseleri bulur. Tek gösterge sinyali yerine üçlü teyit, yanlış alarm riskini önemli ölçüde düşürür.',
    filters: { rsi_min: 50, macd_hist_min: 0, stoch_k_min: 50 }
  },

  volumeTrend: {
    label: 'Hacimli Trend',
    desc: '6 aylık güçlü getiri, normalin 1.5 katı hacim ve zirveye %15 mesafe — üçünü birden karşılayan hisseleri bulur. Kurumsal alımın en belirgin izleri: yüksek hacim ve kısa zirve mesafesi.',
    filters: { perf6m_min: 20, rel_vol_min: 1.5, from_high_min: -15 }
  },

  adxMomentum: {
    label: 'ADX Momentum',
    desc: 'Hem gücü (ADX>25) hem yönü (+DI>-DI) teyit edilmiş, 3 aylık getirisi %10 üzeri trendleri bulur. ADX trend varlığını ölçer; +DI yönünü; 3 aylık getiri momentum kalıcılığını doğrular.',
    filters: { adx_min: 25, adx_di_diff_min: 0, perf3m_min: 10 }
  },

  growthBreakout: {
    label: 'Büyüme Kırılımı',
    desc: 'EPS büyümesi %15 üzeri olan, teknik alım sinyali veren ve zirvesine yakın hisseleri bulur. Temel büyüme + teknik kırılım kombinasyonu büyüme yatırımcısının aranan durumudur.',
    filters: { earng_min: 15, tech_rating_min: 0.3, from_high_min: -10 }
  },

  deathCrossBounce: {
    label: 'Kontrarian Dönüş',
    desc: 'Ölüm haçı bölgesinde (SMA50<SMA200, fiyat<SMA200) ancak dibinden %8 yükselmiş ve RSI toparlanma bölgesinde (35-55) olan hisseleri bulur. Düşüş trendindeki erken dönüş fırsatı — yüksek risk/getiri.',
    filters: { sma_trend_max: 0, above_sma200_max: 0, rsi_min: 35, rsi_max: 55, from_low_min: 8 }
  },

};

// Guru stratejileri
// ──────────────────────────────────────────────────────────────
// Kaynak: Berkshire Hathaway hissedar mektupları, "The New
// Buffettology" (Buffin/Clark), AAII guru screen modelleri,
// "One Up On Wall Street" (Lynch), "The Intelligent Investor"
// (Graham), Validea guru portföyleri, Minervini SEPA kriterleri.
// Quant fon filtreleri kamuya açık 13-F/haber analizlerine dayanır.
// Kesin sonuçlar garantilenmez — ön eleme aracıdır.
// ──────────────────────────────────────────────────────────────
const GURUS = {

  ackman: {
    label: 'Bill Ackman — Activist',
    desc: 'Karlı, nakit üreten ama ucuz kalmış kaliteli şirketleri bulur. ROE %15, net marj %10 üzeri, F/K 20 altı.',
    filters: {roe_min:15, margin_min:10, de_max:80, cr_min:1.2, pe_max:20}
  },
  ark: {
    label: 'Cathie Wood / ARK',
    desc: 'Yüksek büyüme potansiyelli yenilikçi teknoloji şirketlerini bulur. Gelir büyümesi %30 üzeri.',
    filters: {revg_min:30, cr_min:1}
  },
  buffett: {
    label: 'Warren Buffett',
    desc: 'Yüksek karlılık ve düşük borca sahip kaliteli şirketleri bulur. ROE %20, net marj %20, brüt marj %40 üzeri, F/K 5-25 arası.',
    filters: {pe_min:5, pe_max:25, roe_min:20, margin_min:20, gross_min:40, de_max:50, cr_min:1.5}
  },
  einhorn: {
    label: 'David Einhorn — Deep Value',
    desc: 'Piyasanın gözardı ettiği ucuz ama karlı şirketleri bulur. F/K 15 altı, ROE %10 üzeri, düşük borç.',
    filters: {pe_max:15, de_max:50, cr_min:1.5, margin_min:8, roe_min:10}
  },
  fisher: {
    label: 'Philip Fisher — Scuttlebutt',
    desc: 'Satış ve karı istikrarlı büyüyen, yüksek marjlı şirketleri bulur. Büyüme %15, brüt marj %35, net marj %12 üzeri.',
    filters: {revg_min:15, earng_min:15, gross_min:35, margin_min:12, de_max:60}
  },
  graham: {
    label: 'Benjamin Graham',
    desc: 'Savunmacı yatırımcı kriterleriyle ucuz ve güvenli şirketleri bulur. F/K 15 altı, F/DD 1.5 altı, cari oran 2 üzeri, temettü ödeyen.',
    filters: {pe_max:15, pb_max:1.5, de_max:50, cr_min:2, div_min:1}
  },
  greenblatt: {
    label: 'Joel Greenblatt — Magic Formula',
    desc: 'Magic Formula yaklaşımıyla hem ucuz hem yüksek getirili şirketleri bulur. ROE %25 üzeri, F/K 12 altı.',
    filters: {roe_min:25, pe_max:12}
  },
  icahn: {
    label: 'Carl Icahn — Activist Value',
    desc: 'Defter değerine yakın fiyatlı, nakit zengini şirketleri bulur. F/DD 1.5 altı, F/K 12 altı, temettü ödeyen.',
    filters: {pb_max:1.5, pe_max:12, de_max:60, cr_min:1.5, div_min:1}
  },
  klarman: {
    label: 'Seth Klarman — Margin of Safety',
    desc: 'Geniş güvenlik marjıyla çok ucuz ve sağlam bilançolu şirketleri bulur. F/K 10 altı, F/DD 1.2 altı, borç minimal.',
    filters: {pe_max:10, pb_max:1.2, de_max:40, cr_min:2, margin_min:5}
  },
  lynch: {
    label: 'Peter Lynch — GARP',
    desc: 'Büyüme hızına göre ucuz kalmış (GARP) şirketleri bulur. EPS büyümesi %20 üzeri, PEG 1.5 altı önceliklendirilir.',
    filters: {pe_min:5, pe_max:35, earng_min:20, de_max:80, cr_min:1},
    special: 'peg'
  },
  minervini: {
    label: 'Mark Minervini — SEPA',
    desc: 'Temel verileri güçlü, kar ivmesi yüksek şirketleri bulur. EPS büyümesi %25, ROE %17 üzeri.',
    filters: {earng_min:25, roe_min:17, margin_min:10, de_max:100, cr_min:1}
  },
  munger: {
    label: 'Charlie Munger — Quality Compounder',
    desc: 'Çok yüksek marjlı, neredeyse borçsuz kaliteli şirketleri bulur. Brüt marj %50, ROE %20 üzeri, borç/özkaynak %30 altı.',
    filters: {gross_min:50, roe_min:20, de_max:30, margin_min:20, cr_min:1.5}
  },
  oneil: {
    label: "William O'Neil — CAN SLIM",
    desc: "CAN SLIM kriterleriyle kazanç ve satış ivmesi güçlü şirketleri bulur. EPS ve gelir büyümesi %25 üzeri, ROE %17 üzeri.",
    filters: {earng_min:25, revg_min:25, roe_min:17, de_max:100, cr_min:1}
  },
  oshaughnessy: {
    label: "O'Shaughnessy — Cornerstone Growth",
    desc: "Düşük F/S oranını büyüme ve momentumla birleştirir. F/S 1.5 altı, 6 aylık getiri %15 üzeri.",
    filters: {ps_max:1.5, earng_min:5, perf6m_min:15}
  },
  piotroski: {
    label: 'Piotroski F-Score',
    desc: 'Düşük F/DD hisseler arasında finansal sağlamlığı yüksek olanları bulur. F-Score 7-9 arası önceliklendirilir, F/DD 1 altı.',
    filters: {pb_max:1, roe_min:3, cr_min:1},
    special: 'piotroski'
  },
  schloss: {
    label: 'Walter Schloss — Deep Value',
    desc: 'Defter değerinin altında, temettü ödeyen klasik ucuz hisseleri bulur. F/DD 1 altı, F/K 12 altı, temettü %2 üzeri.',
    filters: {pb_max:1, pe_max:12, de_max:100, div_min:2, cr_min:1.5}
  },
  soros: {
    label: 'George Soros — Reflexivity',
    desc: 'Güçlü fiyat momentumunu teknik onayla birleştirir. 3 aylık %10, 6 aylık %20 üzeri getiri, teknik skor 0.3 üzeri.',
    filters: {perf3m_min:10, perf6m_min:20, tech_rating_min:0.3}
  },

  // ── Araştırma doğrulamalı eklenen stratejiler ──────────────────

  neff: {
    label: 'John Neff — Windsor Fund',
    desc: 'Düşük F/K ile makul büyüme ve temettüyü birleştirir. F/K 12 altı, büyüme %7 üzeri, temettü %2 üzeri.',
    filters: {pe_max:12, earng_min:7, revg_min:7, div_min:2, margin_min:8}
  },

  zweig: {
    label: 'Martin Zweig — Winning on Wall Street',
    desc: 'Yüksek kazanç büyümesini makul fiyatla birleştirir. EPS büyümesi %20, satış büyümesi %15 üzeri, F/K 30 altı.',
    filters: {earng_min:20, revg_min:15, pe_max:30, de_max:50}
  },

  dreman: {
    label: 'David Dreman — Contrarian',
    desc: 'Piyasanın en gözden düşmüş ama karlı hisselerini bulur. F/K 12 altı, F/DD 1.5 altı, EPS büyümesi pozitif.',
    filters: {pe_max:12, pb_max:1.5, earng_min:5}
  },

  kfisher: {
    label: 'Kenneth Fisher — PSR',
    desc: 'Düşük Fiyat/Satış oranıyla istikrarlı karlı şirketleri bulur. F/S 1.5 altı, net marj %5, EPS büyümesi %15 üzeri.',
    filters: {ps_max:1.5, margin_min:5, de_max:40, earng_min:15}
  },

  tsmith: {
    label: 'Terry Smith — Fundsmith',
    desc: 'Yüksek sermaye getirili, yüksek marjlı kaliteli şirketleri bulur. ROE %15, brüt marj %40, net marj %15 üzeri.',
    filters: {roe_min:15, gross_min:40, margin_min:15, de_max:50}
  },

  graham_ncav: {
    label: 'Graham — Net-Net (NCAV)',
    desc: 'Net dönen varlık değerinin altında işlem gören en ucuz hisseleri bulur. F/DD 0.67 altı, cari oran 2 üzeri.',
    filters: {pb_max:0.67, cr_min:2, de_max:80, margin_min:1}
  },

  carlisle: {
    label: "Tobias Carlisle — Acquirer's Multiple",
    desc: 'Saf ucuzluk prensibiyle en düşük çarpanlı hisseleri bulur. F/K 10 altı.',
    filters: {pe_max:10, cr_min:1}
  },

  templeton: {
    label: 'John Templeton — Global Value',
    desc: 'Küresel değer yaklaşımıyla ucuz ve büyüyen şirketleri bulur. F/K 15 altı, F/DD 1.5 altı, EPS büyümesi pozitif.',
    filters: {pe_max:15, pb_max:1.5, earng_min:5}
  },

};
