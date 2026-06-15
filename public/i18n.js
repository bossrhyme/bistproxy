// i18n.js — DeepFin TR/EN dil altyapısı (data-i18n tabanlı)
// Kapsam: anasayfa + paylaşılan header + tarayıcı UI chrome.
// Kullanım: <... data-i18n="key">  / placeholder için data-i18n-ph="key"
(function () {
  var DICT = {
    // ── Header (paylaşılan) ──
    'nav.home':        { tr: 'Anasayfa',       en: 'Home' },
    'nav.scanner':     { tr: 'Tarayıcı',       en: 'Screener' },
    'nav.analysis':    { tr: 'Analiz',         en: 'Analysis' },
    'nav.learn':       { tr: 'Bilgi Bankası',  en: 'Learn' },
    'nav.strategies':  { tr: 'Stratejiler',    en: 'Strategies' },

    // ── Strateji Karşılaştırma sayfası ──
    'sp.badge':        { tr: 'STRATEJİ KARŞILAŞTIRMA', en: 'STRATEGY COMPARISON' },
    'sp.exchange':     { tr: 'Borsa', en: 'Exchange' },
    'sp.h1':           { tr: 'Hangi Strateji <span>Ne Kadar Kazandırdı?</span>', en: 'Which Strategy <span>Returned How Much?</span>' },
    'sp.sub':          { tr: 'Büyüme, değer, temettü ve 50+ stratejinin filtre kriterlerinden geçen hisselerin son 1–6 ay ortalama getirisini gerçek piyasa verisiyle karşılaştır.',
                         en: 'Compare the last 1–6 month average returns of stocks passing the filter criteria of 50+ growth, value, dividend and other strategies — with real market data.' },
    'auth.login':      { tr: 'Giriş Yap',      en: 'Log in' },
    'auth.register':   { tr: 'Kayıt Ol',       en: 'Sign up' },
    'auth.support':    { tr: 'Destek Ol',      en: 'Support' },
    'auth.profile':    { tr: 'Profil',         en: 'Profile' },

    // ── Anasayfa hero ──
    'hero.eyebrow':    { tr: '30.000+ enstrüman canlı taranıyor', en: '30,000+ instruments scanned live' },
    'hero.h1a':        { tr: 'Akıllıca tara,',  en: 'Screen smarter.' },
    'hero.h1b':        { tr: 'güvenle karar ver.', en: 'Decide with confidence.' },
    'hero.sub':        { tr: '150 filtreyle binlerce varlığı saniyeler içinde tara, kararını güvenle ver.',
                         en: 'Screen thousands of assets in seconds with 150 filters, and decide with confidence.' },
    'hero.cta1':       { tr: 'Taramaya Başla',  en: 'Start Screening' },
    'hero.cta2':       { tr: 'Nasıl çalışır',   en: 'How it works' },
    'stat.assets':     { tr: 'varlık sınıfı',   en: 'asset classes' },
    'stat.instruments':{ tr: 'enstrüman',       en: 'instruments' },
    'stat.filters':    { tr: 'Filtre & Strateji', en: 'Filters & Strategies' },

    // ── Nasıl Çalışır ──
    'how.title':       { tr: 'Nasıl Çalışır',   en: 'How It Works' },
    'how.s1t':         { tr: 'Varlık Seç',      en: 'Pick an Asset' },
    'how.s1h':         { tr: 'Hisse, fon, ETF veya kripto seç', en: 'Choose stocks, funds, ETFs or crypto' },
    'how.s2t':         { tr: 'Filtrele',        en: 'Filter' },
    'how.s2h':         { tr: 'Hazır strateji seç ya da kendi filtreni kur', en: 'Pick a ready strategy or build your own filter' },
    'how.s3t':         { tr: 'Tara',            en: 'Scan' },
    'how.s3h':         { tr: 'Tüm piyasa saniyeler içinde taranır', en: 'The whole market is scanned in seconds' },
    'how.s4t':         { tr: 'İncele',          en: 'Review' },
    'how.s4h':         { tr: 'Sonuçlara tıkla, tüm metrikler ve analiz', en: 'Click a result for all metrics and analysis' },

    // ── Varlıklar ──
    'assets.title':    { tr: 'Varlıklar',       en: 'Assets' },
    'assets.stocks':   { tr: 'Borsa',           en: 'Stocks' },
    'assets.stocksTag':{ tr: 'Hisse senetleri · 28+ borsa', en: 'Equities · 28+ exchanges' },
    'assets.crypto':   { tr: 'Kripto',          en: 'Crypto' },
    'assets.cryptoTag':{ tr: 'Kripto paralar',  en: 'Cryptocurrencies' },
    'assets.fund':     { tr: 'Fon',             en: 'Funds' },
    'assets.fundTag':  { tr: 'Yatırım fonları', en: 'Mutual funds' },
    'assets.etf':      { tr: 'ETF',             en: 'ETF' },
    'assets.etfTag':   { tr: 'Borsa yatırım fonları', en: 'Exchange-traded funds' },
    'assets.eurobond': { tr: 'Eurobond',        en: 'Eurobond' },
    'assets.eurobondTag':{ tr: 'Döviz tahvilleri', en: 'Foreign-currency bonds' },
    'assets.bond':     { tr: 'Bono/Tahvil',     en: 'Bills/Bonds' },
    'assets.bondTag':  { tr: 'Sabit getirili',  en: 'Fixed income' },
    'soon':            { tr: 'Yakında',         en: 'Soon' },

    // ── Popüler Stratejiler ──
    'strat.title':     { tr: 'Popüler Stratejiler', en: 'Popular Strategies' },
    'strat.lenses':    { tr: 'Yatırımcı Lensleri', en: 'Investor Lenses' },
    'strat.fundamental':{ tr: 'Temel Analiz',   en: 'Fundamental' },
    'strat.technical': { tr: 'Teknik Analiz',   en: 'Technical' },

    // ── Son Taramalar ──
    'recent.title':    { tr: 'Sitede yapılan son taramalar', en: 'Recent scans across the site' },
    'recent.sub':      { tr: "Birine tıkla, aynı taramayı Pro'da çalıştır",
                         en: 'Click one to run the same scan in Pro' },

    // ── Yasal uyarı + footer (kısaltılmış anahtarlar) ──
    'disc.p1':         { tr: "DeepFin'de sunulan tüm veriler, filtreler ve stratejiler yalnızca <strong>bilgilendirme amaçlıdır</strong>. Bu platform herhangi bir finansal araç için <strong>alım, satım veya elde tutma tavsiyesi vermez</strong>; yatırım danışmanlığı hizmeti sunmaz. <strong>Geçmiş performans gelecekteki sonuçların garantisi değildir.</strong> Yatırım kararlarınızı almadan önce <em>lisanslı bir finansal danışmana</em> başvurmanızı tavsiye ederiz. Tüm yatırım işlemleri kullanıcının kendi sorumluluğundadır.",
                         en: "All data, filters and strategies on DeepFin are <strong>for informational purposes only</strong>. This platform <strong>does not provide buy, sell or hold recommendations</strong> for any financial instrument, nor investment advisory services. <strong>Past performance is not a guarantee of future results.</strong> Before making investment decisions we recommend consulting a <em>licensed financial advisor</em>. All investment actions are the user’s own responsibility." },
    'disc.p2':         { tr: "DeepFin'de yer alan yatırımcı ve fon stratejileri — <strong>Buffett, Graham, Lynch, Klarman, Greenblatt</strong> ve diğerleri — ilgili kişi ve kurumlarla herhangi bir <strong>iş birliği, lisans veya resmi bağlantı olmaksızın</strong> yalnızca kamuya açık yayın, kitap ve akademik kaynaklara dayanılarak hazırlanmıştır. Sunulan filtreler özgün yorumlara ve hesaplama farklılıklarına tabidir; <strong>tam bir yansıma değildir.</strong>",
                         en: "The investor and fund strategies on DeepFin — <strong>Buffett, Graham, Lynch, Klarman, Greenblatt</strong> and others — were prepared <strong>without any partnership, license or official affiliation</strong> with the relevant people or institutions, based solely on publicly available publications, books and academic sources. The filters shown are subject to original interpretation and calculation differences; <strong>they are not an exact reflection.</strong>" },

    // ── Tarayıcı (Pro) UI chrome ──
    'tb.newScan':      { tr: 'Yeni Tarama',     en: 'New Scan' },
    'tb.addFilter':    { tr: '+ Filtre Ekle',   en: '+ Add Filter' },
    'tb.search':       { tr: 'Sembol ara...',   en: 'Search symbol...' },
    'tb.sort':         { tr: 'Sırala:',         en: 'Sort:' },
    'tb.tools':        { tr: 'Araçlar ▾',       en: 'Tools ▾' },
    'tb.lists':        { tr: 'Listelerim',      en: 'My Lists' },
    'tb.columns':      { tr: 'Kolonlar',        en: 'Columns' },
    'tb.csv':          { tr: 'CSV indir',       en: 'Export CSV' },
    'tb.saveScan':     { tr: 'Taramayı Kaydet', en: 'Save Scan' },
    'tb.savedScans':   { tr: 'Kayıtlı Taramalar', en: 'Saved Scans' },
    'tb.view':         { tr: 'Görünüm',         en: 'View' },
    'tb.compact':      { tr: 'Kompakt',         en: 'Compact' },
    'tb.normal':       { tr: 'Normal',          en: 'Normal' },
    'tb.wide':         { tr: 'Geniş',           en: 'Wide' },
    'sb.hideFilters':  { tr: 'Filtreleri Gizle', en: 'Hide Filters' },
    'qs.quick':        { tr: 'Hızlı Tarama',    en: 'Quick Scan' },

    // ── Dil seçici ──
    'lang.label':      { tr: 'Dil',             en: 'Language' }
  };

  function getLang() { try { return localStorage.getItem('df_lang') === 'en' ? 'en' : 'tr'; } catch (e) { return 'tr'; } }
  function applyLang(l) {
    l = (l === 'en') ? 'en' : 'tr';
    document.documentElement.setAttribute('lang', l);
    var nodes = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) {
      var t = DICT[nodes[i].getAttribute('data-i18n')];
      if (t && t[l] != null) nodes[i].textContent = t[l];
    }
    var phs = document.querySelectorAll('[data-i18n-ph]');
    for (var j = 0; j < phs.length; j++) {
      var tp = DICT[phs[j].getAttribute('data-i18n-ph')];
      if (tp && tp[l] != null) phs[j].setAttribute('placeholder', tp[l]);
    }
    var htmls = document.querySelectorAll('[data-i18n-html]');
    for (var h = 0; h < htmls.length; h++) {
      var th = DICT[htmls[h].getAttribute('data-i18n-html')];
      if (th && th[l] != null) htmls[h].innerHTML = th[l]; // yalnız güvenilir statik sözlük metni
    }
    // dil seçici butonlarının aktif durumu
    var btns = document.querySelectorAll('[data-lang-btn]');
    for (var k = 0; k < btns.length; k++) {
      btns[k].classList.toggle('on', btns[k].getAttribute('data-lang-btn') === l);
    }
    window.dfLang = l;
  }
  function setLang(l) { try { localStorage.setItem('df_lang', (l === 'en') ? 'en' : 'tr'); } catch (e) {} applyLang(l); }

  window.DF_I18N = DICT;
  window.dfGetLang = getLang;
  window.dfSetLang = setLang;
  window.dfApplyLang = applyLang;
  // erken uygula (FOUC azalt) + DOM hazır olunca tekrar
  function init() { applyLang(getLang()); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
