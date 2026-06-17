// ═══════════════════════════════════════════════════════════════
// DeepFin — Varlık Navigasyon Sistemi
// ═══════════════════════════════════════════════════════════════

// ── Sayfa Yönlendirme (Faz 8-9) ──────────────────────────────
var _currentDfPage = 'page-home';
function showPage(id) {
  _currentDfPage = id;
  document.querySelectorAll('.page').forEach(function(p) {
    p.classList.toggle('active', p.id === id);
  });
  document.querySelectorAll('.df-navbtn[data-page]').forEach(function(b) {
    b.classList.toggle('on', b.dataset.page === id);
  });
  var navHome = document.getElementById('nav-home');
  var navTarama = document.getElementById('nav-tarama');
  if (navHome) navHome.classList.toggle('active', id === 'page-home');
  if (navTarama) navTarama.classList.toggle('active', id === 'page-scan');
}
function joinWaitlist() {
  var inp = document.getElementById('waitlistEmail');
  if (inp && inp.value) { showToast('Bekleme listesine eklendi: ' + inp.value); inp.value = ''; }
  else showToast('Lütfen e-posta adresinizi girin');
}

// ── Chip seçim fonksiyonları ──────────────────────────────────
function chipRadio(el) {
  var c = el.closest('.chips') || el.parentElement;
  c.querySelectorAll('.chip').forEach(function(x){ x.classList.remove('on'); });
  el.classList.add('on');
}
function chipToggle(el) { el.classList.toggle('on'); }
function kriptoChipRadio(el) { chipRadio(el); if (_activeAsset === 'kripto') runKriptoScan(); }

function esc(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function escJS(s) { return String(s == null ? '' : s).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'\\"').replace(/</g,'\\x3C').replace(/>/g,'\\x3E'); }
function safeUrl(u) { var s = String(u||''); return /^https?:\/\//i.test(s) ? s : '#'; }

// ── Tema ──────────────────────────────────────────────────────
function _isDark() {
  // Default: light (DeepFin warm mode)
  try { return localStorage.getItem('df_theme') === 'dark'; } catch(e) { return false; }
}
function _applyTheme(dark) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  var meta = document.getElementById('meta-theme-color');
  if (meta) meta.content = dark ? '#0A0E14' : '#FAFAF7';
  var btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = dark ? '☀' : '☾';
}
function toggleTheme() {
  var next = !_isDark();
  try { localStorage.setItem('df_theme', next ? 'dark' : 'light'); } catch(e) {}
  _applyTheme(next);
}
function _initTheme() {
  _applyTheme(_isDark());
}

// ── Döviz kuru senkronizasyonu (görünmez) ─────────────────────
// Header'da kur gösterilmiyor; kurlar yalnızca hesaplama için fxRates'te tutulur.
// Bu fetch fxRates'i ana sayfada/taramadan önce de güncel tutar.
function _startIndicesTicker() {
  function _fetch() {
    fetch('/api/rates', { headers: {'X-Requested-With':'XMLHttpRequest'} })
      .then(function(r){ return r.json(); })
      .then(function(d){ if (typeof _applyRatesToFx === 'function') _applyRatesToFx(d); })
      .catch(function(){});
  }
  _fetch();
  setInterval(_fetch, 60000);
}

// Auto-attach X-Requested-With to all /api/ fetches (CSRF protection)
(function() {
  var _f = window.fetch;
  window.fetch = function(url, opts) {
    if (typeof url === 'string' && url.startsWith('/api/')) {
      opts = Object.assign({}, opts);
      opts.headers = Object.assign({'X-Requested-With': 'XMLHttpRequest'}, opts.headers || {});
    }
    return _f.apply(this, arguments.length === 1 ? [url] : [url, opts]);
  };
})();

// ── Durum ─────────────────────────────────────────────────────
var _activeAsset = null;
var _fonTicker   = [];
var _kriptoTicker= [];
var _fonData     = [];
var _kriptoData  = [];
var _fonMeta     = {};
var _kriptoMeta  = {};
var _fonShowAll  = false;
var _kriptoShowAll = false;
var _detailStock = null; // aktif detay paneli hissesi

// ── Landing'e dön ─────────────────────────────────────────────
function goBackToLanding() {
  _activeAsset = null;
  document.querySelectorAll('.anb').forEach(function(b){ b.classList.remove('active'); });
  document.querySelectorAll('.sbp').forEach(function(p){ p.classList.remove('active'); });
  document.getElementById('sbp-landing').classList.add('active');
  _clearContent();
}

// ── Varlık seç (landing → panel) ─────────────────────────────
// ── Varlığa göre onboarding içeriği ─────────────────────────
var _ONB = {
  null: {
    big: 'DEEPFIN', sub: 'Tarama bizden, karar sizden.',
    steps: [
      {icon:'🌍', label:'Varlık Seç',    desc:'Hisse senedi, yatırım fonu veya kripto para seç'},
      {icon:'🐐', label:'Filtrele',      desc:'Strateji, kategori veya özel filtreni uygula'},
      {icon:'▶',  label:'Tara',          desc:'Saniyeler içinde tüm piyasa taranır'},
      {icon:'🔍', label:'İncele',        desc:'Sonuçlara tıkla — metrikler ve detaylı analiz'}
    ]
  },
  hisse: {
    big: 'HİSSE', sub: 'Binlerce hisse saniyeler içinde filtrelenir.',
    steps: [
      {icon:'🌍', label:'Borsa Seç',      desc:'BIST, NASDAQ, NYSE, S&P 500, DAX, LSE veya Nikkei'},
      {icon:'🐐', label:'Strateji Seç',   desc:'Buffett, Lynch, Graham veya özel filtreni kur'},
      {icon:'▶',  label:'TARA\'ya Bas',   desc:'Tüm hisseler saniyeler içinde taranır'},
      {icon:'🔎', label:'Hisseyi İncele', desc:'Tıkla — grafik, metrikler ve detaylı analiz'}
    ]
  },
  fon: {
    big: 'FON', sub: '800+ Türk yatırım fonu tek ekranda · canlı veri.',
    steps: [
      {icon:'📋', label:'Fon Türü',          desc:'Yatırım, Hisse, Para Piyasası kategorisini seç'},
      {icon:'📊', label:'Filtrele',          desc:'YTD%, 1Y%, Büyüklük, Yatırımcı sayısına göre'},
      {icon:'▶',  label:'Fon Tara',          desc:'800+ fon gerçek zamanlı taranır'},
      {icon:'⭐', label:'Favorile & Sırala', desc:'Sütun başlığına tıkla, favorile, kaydet'}
    ]
  },
  kripto: {
    big: 'KRİPTO', sub: 'Canlı piyasa verisiyle coin tara.',
    steps: [
      {icon:'🌐', label:'Kategori Seç', desc:'DeFi, Layer 1, GameFi veya tüm coinler'},
      {icon:'📈', label:'Preset Seç',   desc:'Momentum, RSI Dip, ATH Yakın hazır stratejiler'},
      {icon:'▶',  label:'Kripto Tara',  desc:'Canlı piyasa verisi çekilir'},
      {icon:'🔎', label:'Coin İncele',  desc:'Fiyat, RSI, ATH%, teknik sinyali gör'}
    ]
  }
};

function _updateOnboarding(type) {
  var data = _ONB[type] || _ONB['null'];
  var big  = document.getElementById('onb-big');
  var sub  = document.getElementById('onb-sub');
  var cont = document.getElementById('onb-container');
  if (big)  big.textContent = data.big;
  if (sub)  sub.textContent = data.sub;
  if (!cont) return;
  var stepsHtml = data.steps.map(function(s, i) {
    return '<div class="onb-step">'
      + '<div class="onb-num">' + (i+1) + '</div>'
      + '<div class="onb-icon">' + s.icon + '</div>'
      + '<div class="onb-label">' + s.label + '</div>'
      + '<div class="onb-desc">' + s.desc + '</div>'
      + '</div>'
      + (i < data.steps.length - 1 ? '<div class="onb-arrow">→</div>' : '');
  }).join('');
  var histHtml = _renderScanHistory();
  cont.innerHTML = (histHtml || '') + '<div class="onb-title">Nasıl Kullanılır?</div><div class="onb-steps">' + stepsHtml + '</div>';
}

function selectAsset(type) {
  _activeAsset = type;

  // Nav bar
  document.querySelectorAll('.anb').forEach(function(b){ b.classList.remove('active'); });
  var nb = document.getElementById('anb-' + type);
  if (nb) nb.classList.add('active');

  // Paneller
  document.querySelectorAll('.sbp').forEach(function(p){ p.classList.remove('active'); });
  var sp = document.getElementById('sbp-' + type);
  if (sp) sp.classList.add('active');

  _clearContent();
  _resetPanel('sbp-' + type);
  _updateSortOptions(type);
  _updateOnboarding(type);

  // Hisse için hisse-table göster, result-area gizle
  // Diğerleri için hisse-table gizle, result-area hazırla
  var ht = document.getElementById('hisse-table');
  var ra = document.getElementById('result-area');
  if (type === 'hisse') {
    if (ht) ht.style.display = '';
    if (ra) { ra.style.display = 'none'; ra.innerHTML = ''; }
  } else {
    if (ht) ht.style.display = 'none';
    if (ra) { ra.style.display = 'none'; ra.innerHTML = ''; }
  }
  // Kripto seçilince otomatik ilk 500 coini yükle
  if (type === 'kripto') setTimeout(runKriptoScan, 80);
}

// ── Asset'e göre sort seçeneklerini güncelle ───────────────
function _updateSortOptions(type) {
  var sel = document.getElementById('sortf');
  if (!sel) return;
  var opts = {
    hisse: [
      {v:'marketCapitalization',l:'Piyasa Değeri'},
      {v:'peNormalizedAnnual',l:'F/K'},
      {v:'pbAnnual',l:'PD/DD'},
      {v:'roeTTM',l:'ROE'},
      {v:'roaTTM',l:'ROA'},
      {v:'netProfitMarginTTM',l:'Kar Marjı'},
      {v:'dividendYieldIndicatedAnnual',l:'Temettü'},
      {v:'revenueGrowthTTMYoy',l:'Gelir Büyümesi'},
      {v:'currentRatioAnnual',l:'Cari Oran'}
    ],
    fon: [
      {v:'ret1y',l:'1Y Getiri'},
      {v:'retYtd',l:'YTD Getiri'},
      {v:'ret3m',l:'3A Getiri'},
      {v:'ret1m',l:'1A Getiri'},
      {v:'sharpe',l:'Sharpe Oranı'},
      {v:'totalValueM',l:'Büyüklük'},
      {v:'investors',l:'Yatırımcı Sayısı'}
    ],
    kripto: [
      {v:'mcap',l:'Piyasa Değeri'},
      {v:'change24h',l:'24s Değişim'},
      {v:'change7d',l:'7G Değişim'},
      {v:'volume24h',l:'Hacim (24s)'},
      {v:'rsi14',l:'RSI (14)'},
      {v:'athChange',l:"ATH'dan Uzaklık"}
    ]
  };
  var list = opts[type] || opts.hisse;
  sel.innerHTML = list.map(function(o){ return '<option value="'+o.v+'">'+o.l+'</option>'; }).join('');
  var dsel = document.getElementById('sortd');
  if (dsel) dsel.value = 'desc';
}

// ── Nav bar tıklaması ─────────────────────────────────────────
function switchAsset(type) {
  if (_activeAsset === type) {
    goBackToLanding();
  } else {
    selectAsset(type);
  }
}

// ── İçerik temizle ────────────────────────────────────────────
function _clearContent() {
  if (typeof allData !== 'undefined') allData = [];
  if (typeof filtered !== 'undefined') filtered = [];
  _fonData = []; _kriptoData = [];
  _fonTicker = []; _kriptoTicker = [];
  _fonMeta = {}; _kriptoMeta = {};
  var tbody = document.getElementById('tbody');
  if (tbody) tbody.innerHTML = '';
  var twrap = document.getElementById('twrap');
  if (twrap) twrap.style.display = 'none';
  var ra = document.getElementById('result-area');
  if (ra) { ra.style.display = 'none'; ra.innerHTML = ''; }
  var statsBar = document.getElementById('stats-bar');
  if (statsBar) statsBar.style.display = 'none';
  var toolbar = document.getElementById('toolbar');
  if (toolbar) toolbar.style.display = 'none';
  var det = document.getElementById('detail');
  if (det) det.classList.remove('open');
  ['sb-count','sb-filtered'].forEach(function(id){
    var el = document.getElementById(id);
    if (el) el.textContent = '—';
  });
}

// ── Panel chip/input sıfırla ──────────────────────────────────
function _resetPanel(panelId) {
  var panel = document.getElementById(panelId);
  if (!panel) return;
  panel.querySelectorAll('.chip:not(.goat-chip)').forEach(function(c){ c.classList.remove('on'); });
  panel.querySelectorAll('input[type="number"]').forEach(function(inp){ inp.value = ''; });
  var tvsel = document.getElementById('k_tvrating');
  if (tvsel) tvsel.value = '';
  // Default chip'leri geri aç
  if (panelId === 'sbp-kripto') {
    var tumu = panel.querySelector('.chip[data-cat=""]');
    if (tumu) tumu.classList.add('on');
  }
  if (panelId === 'sbp-fon') {
    var first = panel.querySelector('.chip[onclick="chipToggle(this)"]');
    if (first) first.classList.add('on');
  }
}

// ── Yardımcı: result-area'ya tablo yaz ───────────────────────
function _showResultArea(headerHtml, tableHtml, count) {
  var twrap = document.getElementById('twrap');
  var ra = document.getElementById('result-area');
  if (!twrap || !ra) return;
  twrap.style.display = 'block';
  ra.style.display = 'block';
  ra.innerHTML = headerHtml + tableHtml;
  var emptyEl = document.getElementById('empty');
  if (emptyEl) emptyEl.style.display = 'none';
  // Toolbar'ı göster, sayacı güncelle, stats-bar'ı gizle (fon için; kripto için ayrı yönetilir)
  var toolbar = document.getElementById('toolbar');
  if (toolbar) toolbar.style.display = '';
  var statsBar = document.getElementById('stats-bar');
  if (statsBar && _activeAsset !== 'kripto') statsBar.style.display = 'none';
  // Hisse-only toolbar butonlarını gizle (fon/kripto modunda)
  var tbFav = document.getElementById('tb-fav-btn');
  var tbCol = document.getElementById('tb-col-btn');
  if (tbFav) tbFav.style.display = 'none';
  if (tbCol) tbCol.style.display = 'none';
  var resn = document.getElementById('resn');
  var scann = document.getElementById('scann');
  if (resn) resn.textContent = count;
  if (scann) scann.textContent = count;
  var label = document.querySelector('#toolbar .rcount > span');
  if (label && _activeAsset === 'fon') label.innerHTML = ' / <span id="scann">'+count+'</span> fon';
  else if (label && _activeAsset === 'kripto') label.innerHTML = ' / <span id="scann">'+count+'</span> coin';
}

// ── Yükleniyor mesajı ─────────────────────────────────────────
function _showLoading(msg) {
  var twrap = document.getElementById('twrap');
  var ra = document.getElementById('result-area');
  if (!twrap || !ra) return;
  twrap.style.display = 'block';
  ra.style.display = 'block';
  var skRows = '';
  var widths = [28, 120, 55, 45, 45, 45, 45, 45, 45, 70, 60];
  for (var i = 0; i < 10; i++) {
    skRows += '<div class="sk-row">' + widths.map(function(w){
      return '<div class="sk-cell" style="width:'+w+'px'+(i===0?';opacity:.5':'')+'"></div>';
    }).join('') + '</div>';
  }
  ra.innerHTML = '<div class="sk-hdr"><div class="sk-hdr-cell" style="width:80px"></div><div class="sk-hdr-cell" style="width:120px"></div></div>'
    + '<div class="sk-wrap">' + skRows + '</div>'
    + '<div style="padding:12px;text-align:center;color:var(--muted2);font-size:11px">' + msg + '</div>';
}

// ─────────────────────────────────────────────────────────────
// FON TARAMA
// ─────────────────────────────────────────────────────────────
function runFonScan() {
  var btn = document.querySelector('#sbp-fon .sbp-scan-btn');
  if (btn) { btn.textContent = '⏳ Taranıyor...'; btn.disabled = true; }
  _showLoading('⏳ Fon verileri yükleniyor...');

  var params = new URLSearchParams({ fontur: 'YAT', sort: 'ret1y', limit: '500' });
  var sc = document.querySelector('#sbp-fon .chip.on[data-preset]');
  if (sc) {
    var pv = sc.dataset.preset;
    var sortFields = ['retYtd','ret1m','ret3m','sharpe','volatility','ret7d','ret1y','totalValueM','investors','price'];
    if (sortFields.includes(pv)) { params.set('sort', pv); }
    else                         { params.set('preset', pv); }
  }

  var get = function(id){ var el=document.getElementById(id); return el&&el.value?el.value:''; };
  if (get('fon_ret1y_min'))    params.set('min_ret1y',   get('fon_ret1y_min'));
  if (get('fon_ret1y_max'))    params.set('max_ret1y',   get('fon_ret1y_max'));
  if (get('fon_sharpe_min'))   params.set('min_sharpe',  get('fon_sharpe_min'));
  if (get('fon_sharpe_max'))   params.set('max_sharpe',  get('fon_sharpe_max'));
  if (get('fon_size_min'))     params.set('min_size',    get('fon_size_min'));
  if (get('fon_size_max'))     params.set('max_size',    get('fon_size_max'));
  if (get('fon_7g_min'))       params.set('min_7g',      get('fon_7g_min'));
  if (get('fon_7g_max'))       params.set('max_7g',      get('fon_7g_max'));
  if (get('fon_1m_min'))       params.set('min_1m',      get('fon_1m_min'));
  if (get('fon_1m_max'))       params.set('max_1m',      get('fon_1m_max'));
  if (get('fon_price_min'))    params.set('min_price',   get('fon_price_min'));
  if (get('fon_price_max'))    params.set('max_price',   get('fon_price_max'));
  if (get('fon_pay_min'))      params.set('min_paycount',get('fon_pay_min'));
  if (get('fon_pay_max'))      params.set('max_paycount',get('fon_pay_max'));

  fetch('/api/fon-scan?' + params)
    .then(function(r){ return r.text(); })
    .then(function(txt){
      var d;
      try { d = JSON.parse(txt); } catch(e) {
        throw new Error('Fon servisi geçici hata — lütfen birkaç saniye bekleyip tekrar deneyin');
      }
      if (d.error && !d.funds) throw new Error(d.error);
      return d;
    })
    .then(function(d){
      var funds = d.funds || [];
      // Client-side extra filters
      var v = function(id){ var el=document.getElementById(id); return el&&el.value?parseFloat(el.value):null; };
      var minYtd=v('fon_retYtd_min'), maxYtd=v('fon_retYtd_max');
      var min3m=v('fon_ret3m_min'),   max3m=v('fon_ret3m_max');
      var minInv=v('fon_inv_min'),     maxInv=v('fon_inv_max');
      if(minYtd!=null) funds=funds.filter(function(f){ return f.retYtd!=null&&f.retYtd>=minYtd; });
      if(maxYtd!=null) funds=funds.filter(function(f){ return f.retYtd!=null&&f.retYtd<=maxYtd; });
      if(min3m!=null)  funds=funds.filter(function(f){ return f.ret3m!=null&&f.ret3m>=min3m; });
      if(max3m!=null)  funds=funds.filter(function(f){ return f.ret3m!=null&&f.ret3m<=max3m; });
      if(minInv!=null) funds=funds.filter(function(f){ return f.investors>=minInv; });
      if(maxInv!=null) funds=funds.filter(function(f){ return f.investors<=maxInv; });
      // Ek client-side filtreler
      var min1m=v('fon_1m_min'), max1m=v('fon_1m_max');
      var min7g=v('fon_7g_min'), max7g=v('fon_7g_max');
      if(min1m!=null) funds=funds.filter(function(f){ return f.ret1m!=null&&f.ret1m>=min1m; });
      if(max1m!=null) funds=funds.filter(function(f){ return f.ret1m!=null&&f.ret1m<=max1m; });
      if(min7g!=null) funds=funds.filter(function(f){ return f.ret7d!=null&&f.ret7d>=min7g; });
      if(max7g!=null) funds=funds.filter(function(f){ return f.ret7d!=null&&f.ret7d<=max7g; });
      _fonData = funds;
      _fonMeta = d;
      _fonTicker = funds.slice(0, 20);
      _renderFon(funds, d);
      updateTicker();
    })
    .catch(function(e){
      console.error('[fon-scan]', e.message);
      var ra=document.getElementById('result-area');
      if(ra) ra.innerHTML='<div style="padding:20px;text-align:center;color:var(--red);font-size:12px">Fon verileri şu an alınamıyor — lütfen bir dakika sonra tekrar deneyin.</div>';
    })
}

// ── Fon satır şablonu ────────────────────────────────────────
var _FON_CAT = { YAT:'Hisse', BOR:'Borçl.', PMI:'Para Piy.', KAR:'Karma', ALT:'Altın', DÖV:'Döviz', SRB:'Serbest', GGF:'G.Giriş' };
function _fonPct(v) {
  if (v == null) return '<span style="color:var(--muted2)">—</span>';
  return `<span style="color:${v>=0?'var(--green)':'var(--red)'}">${v>=0?'+':''}${v.toFixed(1)}%</span>`;
}
function _fonPay(v) {
  if (!v || v <= 0) return '—';
  if (v >= 1e9) return (v/1e9).toFixed(1)+'B';
  if (v >= 1e6) return (v/1e6).toFixed(0)+'M';
  if (v >= 1e3) return (v/1e3).toFixed(0)+'K';
  return v;
}
function _fonCatBadge(cat) {
  if (!cat) return '';
  var code = (cat.match(/\(([^)]+)\)/) || [])[1] || cat;
  return `<span style="font-size:9px;padding:1px 4px;border-radius:3px;background:var(--s3);color:var(--muted2);margin-left:4px">${_FON_CAT[code]||code.slice(0,6)}</span>`;
}
function _fonRowHtml(f, i) {
  var isFav = fonFavSet.has(f.code);
  var ver   = f.verified ? '<sup style="color:var(--green);font-size:8px">✓</sup>' : '';
  var name  = f.name && f.name.length > 42 ? f.name.slice(0, 42) + '…' : (f.name || '');
  return `<tr>
    <td class="nfav" onclick="event.stopPropagation();toggleFonFav('${escJS(f.code)}')" title="${isFav?'Favorilerden çıkar':'Favorilere ekle'}"><span class="fav-icon${isFav?' fav-on':''}">★</span></td>
    <td style="padding:7px 6px;white-space:nowrap">
      <span class="row-num">${i+1}</span>
      <span class="sym-wrap"><span class="row-arrow">›</span><span class="sym">${esc(f.code)}</span>${ver}${_fonCatBadge(f.category)}</span>
      <div class="tsub" title="${esc(f.name||'')}">${esc(name)}</div>
    </td>
    <td class="tn">₺${(f.price||0).toFixed(4)}</td>
    <td class="tn">${_fonPct(f.ret7d)}</td>
    <td class="tn">${_fonPct(f.retYtd)}</td>
    <td class="tn">${_fonPct(f.ret1m)}</td>
    <td class="tn">${_fonPct(f.ret3m)}</td>
    <td class="tn">${_fonPct(f.ret1y)}</td>
    <td class="tn">${f.sharpe!=null?f.sharpe.toFixed(2):'—'}</td>
    <td class="tn muted">₺${(f.totalValueM||0).toFixed(0)}M</td>
    <td class="tn muted">${f.investors?f.investors.toLocaleString('tr-TR'):'—'}</td>
    <td class="tn muted">${_fonPay(f.paycount)}</td>
  </tr>`;
}

function _renderFon(funds, meta, forceAll) {
  _fonShowAll = !!forceAll;
  if (!funds.length) {
    var ra=document.getElementById('result-area');
    if(ra) ra.innerHTML='<div style="padding:30px;text-align:center;color:var(--muted2);font-size:12px">Eşleşen fon bulunamadı.</div>';
    return;
  }
  var FON_INIT = 200;
  var visibleFunds = (_fonShowAll || funds.length <= FON_INIT) ? funds : funds.slice(0, FON_INIT);
  var rows = visibleFunds.map(_fonRowHtml).join('');
  var hdr='<div class="res-hdr"><b>Yatırım Fonları</b><span class="res-cnt">'+funds.length+' fon</span></div>';
  var sortCols = [
    {k:'price',l:'Fiyat'},{k:'ret7d',l:'7G%'},{k:'retYtd',l:'YTD%'},{k:'ret1m',l:'1A%'},{k:'ret3m',l:'3A%'},
    {k:'ret1y',l:'1Y%'},{k:'sharpe',l:'Sharpe'},{k:'totalValueM',l:'Büyüklük'},{k:'investors',l:'Yatırımcı'},{k:'paycount',l:'Pay Sayısı'}
  ];
  var thSort = sortCols.map(function(c){
    var active = sortSt.field===c.k;
    var arrow  = active ? (sortSt.dir==='desc'?' ↓':' ↑') : '';
    return '<th class="right'+(active?' sorted':'')+'" style="cursor:pointer" onclick="_fonSort(\''+c.k+'\')">'
      +c.l+arrow+'</th>';
  }).join('');
  var moreBar = (!_fonShowAll && funds.length > FON_INIT)
    ? '<div style="text-align:center;padding:10px 0 4px">'
      +'<button onclick="_renderFon(_fonData,_fonMeta,true)" style="background:var(--s2);border:1px solid var(--border2);color:var(--text2);border-radius:6px;padding:7px 16px;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit">'
      +'Tümünü göster — '+(funds.length - FON_INIT)+' fon daha'
      +'</button></div>'
    : '';
  var tbl='<table><thead><tr><th style="width:28px"></th><th>Fon</th>'+thSort+'</tr></thead><tbody>'+rows+'</tbody></table>'+moreBar;
  _showResultArea(hdr, tbl, funds.length);
}

function _fonSort(field) {
  if (sortSt.field === field) sortSt.dir = sortSt.dir === 'desc' ? 'asc' : 'desc';
  else { sortSt.field = field; sortSt.dir = 'desc'; }
  // Sync toolbar dropdowns
  var sf = document.getElementById('sortf');
  var sd = document.getElementById('sortd');
  if (sf) sf.value = field;
  if (sd) sd.value = sortSt.dir;
  _renderFon(_sortAsset(_fonData, sortSt.field, sortSt.dir), _fonMeta, _fonShowAll);
}

// ─────────────────────────────────────────────────────────────
// KRİPTO TARAMA
// ─────────────────────────────────────────────────────────────
function runKriptoScan() {
  var btn=document.querySelector('#sbp-kripto .sbp-scan-btn');
  if(btn){btn.textContent='⏳ Taranıyor...';btn.disabled=true;}
  _showLoading('⏳ Kripto piyasa verisi yükleniyor...');

  var params=new URLSearchParams({limit:'500',sort:'market_cap_desc'});
  var cat=document.querySelector('#sbp-kripto .chip.on[data-cat]');
  if(cat&&cat.dataset.cat) params.set('category',cat.dataset.cat);
  var pre=document.querySelector('#sbp-kripto .chip.on[data-preset]');
  if(pre&&pre.dataset.preset) params.set('preset',pre.dataset.preset);

  var ids={min_mcap:'k_mcap_min',max_mcap:'k_mcap_max',min_vol24h:'k_vol_min',max_vol24h:'k_vol_max',min_chg24h:'k_chg24h_min',max_chg24h:'k_chg24h_max',min_rsi:'k_rsi_min',max_rsi:'k_rsi_max',min_tvl:'k_tvl_min',max_tvl:'k_tvl_max',max_mc_tvl:'k_mc_tvl_max'};
  Object.keys(ids).forEach(function(p){var el=document.getElementById(ids[p]);if(el&&el.value)params.set(p,el.value);});

  fetch('/api/kripto-scan?'+params)
    .then(function(r){return r.json();})
    .then(function(d){
      var coins = d.coins || [];
      // Client-side extra filters
      var v = function(id){ var el=document.getElementById(id); return el&&el.value?parseFloat(el.value):null; };
      var min7d=v('k_chg7d_min'), max7d=v('k_chg7d_max');
      var minAth=v('k_ath_min'),  maxAth=v('k_ath_max');
      var tvSel=document.getElementById('k_tvrating');
      var tvRat=tvSel&&tvSel.value?tvSel.value:'';
      if(min7d!=null) coins=coins.filter(function(c){ return c.change7d!=null&&c.change7d>=min7d; });
      if(max7d!=null) coins=coins.filter(function(c){ return c.change7d!=null&&c.change7d<=max7d; });
      if(minAth!=null) coins=coins.filter(function(c){ return c.athChange!=null&&c.athChange>=minAth; });
      if(maxAth!=null) coins=coins.filter(function(c){ return c.athChange!=null&&c.athChange<=maxAth; });
      if(tvRat) coins=coins.filter(function(c){ return c.tvRating===tvRat; });
      _kriptoData = coins;
      _kriptoMeta = d;
      _kriptoTicker = coins.slice(0, 20);
      _renderKripto(coins, d);
      updateTicker();
      // Stats-bar: Kripto bilgilerini göster
      var _sb = document.getElementById('stats-bar');
      if (_sb) { _sb.style.display = ''; _sb.classList.add('visible'); }
      var _ae = document.getElementById('sb-asset'); if (_ae) _ae.textContent = 'Kripto';
      var _ee = document.getElementById('sb-ex');    if (_ee) _ee.textContent = 'CoinGecko';
      var _now = new Date();
      var _te = document.getElementById('sb-time');
      if (_te) _te.textContent = String(_now.getHours()).padStart(2,'0') + ':' + String(_now.getMinutes()).padStart(2,'0');
      var _ti = document.getElementById('sb-total-item'), _tv = document.getElementById('sb-total');
      if (_ti && _tv) { _tv.textContent = '500'; _ti.style.display = ''; }
      var _ri = document.getElementById('sb-result-item'), _rv = document.getElementById('sb-result');
      if (_ri && _rv) { _rv.textContent = coins.length.toLocaleString('tr-TR'); _ri.style.display = ''; }
      // ▲▼ sayaçlarını gizle (kripto için anlamsız)
      var _up = document.getElementById('sb-up'); if (_up) _up.textContent = '';
      var _dn = document.getElementById('sb-dn'); if (_dn) _dn.textContent = '';
    })
    .catch(function(e){
      console.error('[kripto-scan]', e.message);
      var ra=document.getElementById('result-area');
      if(ra) ra.innerHTML='<div style="padding:20px;text-align:center;color:var(--red);font-size:12px">Kripto verisi yüklenemedi — lütfen bir dakika sonra tekrar deneyin.</div>';
    })
    .finally(function(){if(btn){btn.textContent='▶ Kripto Tara';btn.disabled=false;}});
}

// ── Kripto satır şablonu ──────────────────────────────────────
var _TV_BADGE = {STRONG_BUY:['var(--green)','G.AL'],BUY:['var(--green)','AL'],NEUTRAL:['var(--muted2)','NÖT'],SELL:['var(--red)','SAT'],STRONG_SELL:['var(--red)','G.SAT']};
function _kriptoPct(v) {
  if (v == null) return '<span style="color:var(--muted2)">—</span>';
  return `<span style="color:${v>=0?'var(--green)':'var(--red)'}">${v>=0?'+':''}${v.toFixed(1)}%</span>`;
}
function _kriptoPrice(v) {
  if (!v) return '—';
  if (v >= 1000) return '$' + v.toLocaleString('en', {maximumFractionDigits:0});
  if (v >= 1)    return '$' + v.toFixed(2);
  if (v >= 0.01) return '$' + v.toFixed(4);
  return '$' + v.toFixed(6);
}
function _kriptoMcap(v) {
  if (!v) return '—';
  if (v >= 1e9) return '$' + (v/1e9).toFixed(1) + 'B';
  if (v >= 1e6) return '$' + (v/1e6).toFixed(0) + 'M';
  return '$' + v.toFixed(0);
}
function _kriptoTvl(tvl, mcTvl) {
  if (!tvl) return '<span style="color:var(--muted2)">—</span>';
  var t = tvl>=1e9 ? '$'+(tvl/1e9).toFixed(1)+'B' : tvl>=1e6 ? '$'+(tvl/1e6).toFixed(0)+'M' : '$'+tvl.toFixed(0);
  return t + (mcTvl != null ? `<div style="font-size:9px;color:var(--muted2)">${mcTvl.toFixed(1)}x</div>` : '');
}
function _kriptoTvBadge(r) {
  var m = _TV_BADGE[r];
  if (!m) return '<span style="color:var(--muted2)">—</span>';
  return `<span style="color:${m[0]};font-size:9px;font-weight:700">${m[1]}</span>`;
}
function _kriptoRowHtml(c, i, hasTvl) {
  var isFav = kriptoFavSet.has(c.symbol);
  var ver   = c.verified ? '<sup style="color:var(--green);font-size:8px">✓</sup>' : '';
  var img   = c.image ? `<img src="${esc(safeUrl(c.image))}" width="14" height="14" style="border-radius:50%;vertical-align:middle;margin-right:3px" onerror="this.remove()">` : '';
  var name  = c.name && c.name.length > 30 ? c.name.slice(0, 30) + '…' : (c.name || '');
  return `<tr>
    <td class="nfav" onclick="event.stopPropagation();toggleKriptoFav('${escJS(c.symbol)}')" title="${isFav?'Favorilerden çıkar':'Favorilere ekle'}"><span class="fav-icon${isFav?' fav-on':''}">★</span></td>
    <td>
      <span class="row-num">${c.rank||i+1}</span>
      <span class="sym-wrap"><span class="row-arrow">›</span>${img}<span class="sym">${esc((c.symbol||'').toUpperCase())}</span>${ver}</span>
      <div class="tsub">${esc(name)}</div>
    </td>
    <td class="tn">${_kriptoPrice(c.price)}</td>
    <td class="tn">${_kriptoPct(c.change24h)}</td>
    <td class="tn">${_kriptoPct(c.change7d)}</td>
    <td class="tn">${_kriptoPct(c.change30d)}</td>
    <td class="tn muted">${_kriptoMcap(c.mcap)}</td>
    <td class="tn muted">${_kriptoMcap(c.volume24h)}</td>
    <td class="tn muted">${c.rsi14!=null?c.rsi14.toFixed(0):'—'}</td>
    <td class="tn">${_kriptoPct(c.athChange)}</td>
    ${hasTvl ? `<td class="tn muted">${_kriptoTvl(c.tvl,c.mcTvl)}</td>` : ''}
    <td class="tn">${_kriptoTvBadge(c.tvRating)}</td>
  </tr>`;
}

function _renderKripto(coins, meta, forceAll) {
  _kriptoShowAll = !!forceAll;
  if(!coins.length){
    var ra=document.getElementById('result-area');
    if(ra) ra.innerHTML='<div style="padding:30px;text-align:center;color:var(--muted2);font-size:12px">Eşleşen coin bulunamadı.</div>';
    return;
  }
  var KRIPTO_INIT = 100;
  var hasTvl = coins.some(function(c){ return c.tvl != null; });
  var visibleCoins = (_kriptoShowAll || coins.length <= KRIPTO_INIT) ? coins : coins.slice(0, KRIPTO_INIT);
  var rows = visibleCoins.map(function(c, i){ return _kriptoRowHtml(c, i, hasTvl); }).join('');
  var kCols=[
    {k:'price',l:'FİYAT'},{k:'change24h',l:'24S%'},{k:'change7d',l:'7G%'},{k:'change30d',l:'30G%'},
    {k:'mcap',l:'PİY.DEĞ.'},{k:'volume24h',l:'HACİM'},{k:'rsi14',l:'RSI'},{k:'athChange',l:'ATH%'}
  ];
  if(hasTvl) kCols.push({k:'tvl',l:'TVL'});
  var kThSort=kCols.map(function(c){
    var active=sortSt.field===c.k;
    var cls='right'+(active?' sorted'+(sortSt.dir==='asc'?' asc':''):'');
    return '<th class="'+cls+'" onclick="_kriptoSort(\''+c.k+'\')">' + c.l + '</th>';
  }).join('');
  var kMoreBar = (!_kriptoShowAll && coins.length > KRIPTO_INIT)
    ? '<div class="kripto-more-bar"><button onclick="_renderKripto(_kriptoData,_kriptoMeta,true)" class="kripto-more-btn">Tümünü göster — '+(coins.length-KRIPTO_INIT)+' coin daha</button></div>'
    : '';
  var density = typeof _rowDensity !== 'undefined' ? (_rowDensity || 'compact') : 'compact';
  var tbl='<table class="kripto-table density-'+density+'"><thead><tr><th style="width:28px"></th><th>COİN</th>'+kThSort+'<th class="right">SİNYAL</th></tr></thead><tbody>'+rows+'</tbody></table>'+kMoreBar;
  _showResultArea('', tbl, coins.length);
}



function _kriptoSort(field) {
  if (sortSt.field === field) sortSt.dir = sortSt.dir === 'desc' ? 'asc' : 'desc';
  else { sortSt.field = field; sortSt.dir = 'desc'; }
  var sf = document.getElementById('sortf');
  var sd = document.getElementById('sortd');
  if (sf) sf.value = field;
  if (sd) sd.value = sortSt.dir;
  _renderKripto(_sortAsset(_kriptoData, sortSt.field, sortSt.dir), _kriptoMeta, _kriptoShowAll);
}

var _tvCurrentSym = null;

// ═══════════════════════════════════════════
// BIST SYMBOLS — Full list (150+ hisse)
// BIST sembol formatı: SYMBOL.IS
// ═══════════════════════════════════════════
const BIST_SYMBOLS = [
  // BIST-100 Ana hisseler
  {symbol:'THYAO',name:'Türk Hava Yolları'},
  {symbol:'GARAN',name:'Garanti BBVA'},
  {symbol:'AKBNK',name:'Akbank'},
  {symbol:'EREGL',name:'Ereğli Demir Çelik'},
  {symbol:'KCHOL',name:'Koç Holding'},
  {symbol:'SAHOL',name:'Sabancı Holding'},
  {symbol:'SISE',name:'Şişe ve Cam'},
  {symbol:'ASELS',name:'Aselsan'},
  {symbol:'FROTO',name:'Ford Otosan'},
  {symbol:'TOASO',name:'Tofaş Otomobil'},
  {symbol:'YKBNK',name:'Yapı Kredi Bankası'},
  {symbol:'PGSUS',name:'Pegasus'},
  {symbol:'BIMAS',name:'BİM Mağazalar'},
  {symbol:'TUPRS',name:'Tüpraş'},
  {symbol:'PETKM',name:'Petkim'},
  {symbol:'ARCLK',name:'Arçelik'},
  {symbol:'KRDMD',name:'Kardemir'},
  {symbol:'TTKOM',name:'Türk Telekom'},
  {symbol:'TCELL',name:'Turkcell'},
  {symbol:'ULKER',name:'Ülker Bisküvi'},
  {symbol:'HEKTS',name:'Hektaş'},
  {symbol:'GUBRF',name:'Gübre Fabrikaları'},
  {symbol:'VESTL',name:'Vestel'},
  {symbol:'MGROS',name:'Migros'},
  {symbol:'DOHOL',name:'Doğan Holding'},
  {symbol:'KOZAL',name:'Koza Altın'},
  {symbol:'ISCTR',name:'İş Bankası'},
  {symbol:'VAKBN',name:'Vakıfbank'},
  {symbol:'HALKB',name:'Halkbank'},
  {symbol:'ALARK',name:'Alarko Holding'},
  {symbol:'CCOLA',name:'Coca-Cola İçecek'},
  {symbol:'LOGO',name:'Logo Yazılım'},
  {symbol:'NETAS',name:'Netaş Telekomünikasyon'},
  {symbol:'AEFES',name:'Anadolu Efes'},
  {symbol:'BRISA',name:'Brisa Bridgestone'},
  {symbol:'EKGYO',name:'Emlak Konut GYO'},
  {symbol:'ISGYO',name:'İş GYO'},
  {symbol:'SNGYO',name:'Sinpaş GYO'},
  {symbol:'ENKAI',name:'Enka İnşaat'},
  {symbol:'OZRDN',name:'Özerden'},
  {symbol:'AKSEN',name:'Aksen Enerji'},
  {symbol:'KOZAA',name:'Koza Anadolu Metal'},
  {symbol:'ANACM',name:'Anadolu Cam'},
  {symbol:'TRKCM',name:'Trakya Cam'},
  {symbol:'SOKM',name:'Şok Marketler'},
  {symbol:'ODAS',name:'Odaş Elektrik'},
  {symbol:'TAVHL',name:'TAV Havalimanları'},
  {symbol:'SASA',name:'Sasa Polyester'},
  {symbol:'CELHA',name:'Çelik Halat'},
  {symbol:'KARSN',name:'Karsan Otomotiv'},
  {symbol:'DOAS',name:'Doğuş Otomotiv'},
  {symbol:'GESAN',name:'Gedik Seramik'},
  {symbol:'TKFEN',name:'Tekfen Holding'},
  {symbol:'ENJSA',name:'Enerjisa Enerji'},
  {symbol:'AKFGY',name:'Akiş GYO'},
  {symbol:'MAVI',name:'Mavi Giyim'},
  {symbol:'BERA',name:'Bera Holding'},
  {symbol:'CANTE',name:'Çan Tekstil'},
  {symbol:'ERBOS',name:'Erbosan'},
  {symbol:'EGEEN',name:'Ege Endüstri'},
  {symbol:'INDES',name:'İndeks Bilgisayar'},
  {symbol:'TRGYO',name:'Torunlar GYO'},
  {symbol:'ISDMR',name:'İskenderun Demir Çelik'},
  {symbol:'OTKAR',name:'Otokar'},
  {symbol:'VESBE',name:'Vestel Beyaz Eşya'},
  {symbol:'KONTR',name:'Kontrolmatik'},
  {symbol:'KOCMT',name:'Koç Çimento Deva'},
  {symbol:'POLHO',name:'Polisan Holding'},
  {symbol:'ALGYO',name:'Alarko GYO'},
  {symbol:'DEVA',name:'Deva Holding'},
  {symbol:'SKBNK',name:'Şekerbank'},
  {symbol:'GLYHO',name:'Global Yatırım Holding'},
  {symbol:'HLGYO',name:'Halk GYO'},
  {symbol:'ZRGYO',name:'Ziraat GYO'},
  {symbol:'ISFIN',name:'İş Finansal Kiralama'},
  {symbol:'AGHOL',name:'AG Anadolu Grubu'},
  {symbol:'ARSAN',name:'Arsan Tekstil'},
  {symbol:'CWENE',name:'CW Enerji'},
  {symbol:'ATAKP',name:'Ata Kap Girişim'},
  {symbol:'SELEC',name:'Selçuk Ecza'},
  {symbol:'KLRHO',name:'Kerevitaş Gıda'},
  {symbol:'LMKDC',name:'Limaş'},
  {symbol:'PAGYO',name:'Pera GYO'},
  {symbol:'YGYO',name:'Yeni Gimat GYO'},
  {symbol:'SMART',name:'Smart Güneş'},
  {symbol:'KARTN',name:'Kartonsan'},
  {symbol:'ADEL',name:'Adel Kalemcilik'},
  {symbol:'AFYON',name:'Afyon Çimento'},
  {symbol:'AKGRT',name:'Aksigorta'},
  {symbol:'AKMGY',name:'Akmerkez GYO'},
  {symbol:'AKCNS',name:'Akçansa'},
  {symbol:'ALCTL',name:'Alcatel-Lucent'},
  {symbol:'ANHYT',name:'Anadolu Hayat'},
  {symbol:'ANSGR',name:'Anadolu Sigorta'},
  {symbol:'ARMDA',name:'Armada'},
  {symbol:'ASUZU',name:'Anadolu Isuzu'},
  {symbol:'BAGFS',name:'Bagfaş Gübre'},
  {symbol:'BAKAB',name:'Bak Ambalaj'},
  {symbol:'BANVT',name:'Banvit'},
  {symbol:'BARMA',name:'Barmak Maden'},
  {symbol:'BEYAZ',name:'Beyaz Filo'},
  {symbol:'BFREN',name:'Bosch Fren'},
  {symbol:'BIMAS',name:'BİM Mağazalar'},
  {symbol:'BIZIM',name:'Bizim Toptan'},
  {symbol:'BMEKS',name:'Bimeks Bilgi İşlem'},
  {symbol:'BNTAS',name:'Bantaş'},
  {symbol:'BOSSA',name:'Bossa'},
  {symbol:'BUCIM',name:'Bursa Çimento'},
  {symbol:'BURCE',name:'Burçelik'},
  {symbol:'BURVA',name:'Bursa Çimento Fabrikaları'},
  {symbol:'CIMBETON',name:'Cimbeton'},
  {symbol:'CIMSA',name:'Çimsa'},
  {symbol:'CLEBI',name:'Çelebi Hava Servisi'},
  {symbol:'CPHO',name:'Çağrı Holding'},
  {symbol:'DAGI',name:'Dagi Giyim'},
  {symbol:'DENGE',name:'Denge Yatırım Holding'},
  {symbol:'DGKLB',name:'Doğanlar Mobilya'},
  {symbol:'DITAS',name:'Ditaş Doğan'},
  {symbol:'DYOBY',name:'DYO Boya'},
  {symbol:'ECILC',name:'Eczacıbaşı İlaç'},
  {symbol:'EGPRO',name:'EG Pro Enerji'},
  {symbol:'EMKEL',name:'Emkel'},
  {symbol:'FENER',name:'Fenerbahçe'},
  {symbol:'FLAP',name:'Flap Kongre'},
  {symbol:'GSDDE',name:'GSD Denizcilik'},
  {symbol:'GSDHO',name:'GSD Holding'},
  {symbol:'GSRAY',name:'Galatasaray'},
  {symbol:'HZNDR',name:'Haznedar'},
  {symbol:'IDEAS',name:'IDEAS'},
  {symbol:'IKTL',name:'İktisat Yatırım'},
  {symbol:'IPEKE',name:'İpek Enerji'},
  {symbol:'ISATR',name:'İş Portföy'},
  {symbol:'JANTS',name:'Jantsa'},
  {symbol:'KATMR',name:'Katmerciler'},
  {symbol:'KERVT',name:'Kerevitaş'},
  {symbol:'KLNMA',name:'Kalınma Bank'},
  {symbol:'KNFRT',name:'Konfrut Gıda'},
  {symbol:'KONKA',name:'Konka'},
  {symbol:'KONYA',name:'Konya Çimento'},
  {symbol:'KRPLAS',name:'Kır Plastik'},
  {symbol:'KUYAS',name:'Kuyaş'},
  {symbol:'LIDER',name:'Lider Faktoring'},
  {symbol:'LINK',name:'Link Bilgisayar'},
  {symbol:'MAALT',name:'Mardin Çimento'},
  {symbol:'MNDRS',name:'Menderes Tekstil'},
  {symbol:'MOBTL',name:'Mobiltel'},
  {symbol:'NBORU',name:'NetBoru'},
  {symbol:'NTHOL',name:'Net Holding'},
  {symbol:'ORFIN',name:'Öner Finans'},
  {symbol:'ORGE',name:'Orge Enerji'},
  {symbol:'PAPIL',name:'Papilon'},
  {symbol:'PCILT',name:'Pcilet'},
  {symbol:'PENGD',name:'Penguen Gıda'},
  {symbol:'PKART',name:'Plastik Kart'},
  {symbol:'PRKAB',name:'Türk Prysmian Kablo'},
  {symbol:'PRKME',name:'Park Elektrik'},
  {symbol:'PSILO',name:'Ege Seramik'},
  {symbol:'RHEAG',name:'Rheag'},
  {symbol:'RTALB',name:'RT Alba'},
  {symbol:'RUBNS',name:'Rubenis'},
  {symbol:'SARKY',name:'Sarkuysan'},
  {symbol:'SILVR',name:'Silver Dilber'},
  {symbol:'SMART',name:'Smart GES'},
  {symbol:'SNKRN',name:'Şenkron Teknoloji'},
  {symbol:'SRVGY',name:'Servet GYO'},
  {symbol:'TAHEM',name:'TAH Enerji'},
  {symbol:'TATGD',name:'Tat Gıda'},
  {symbol:'TDGYO',name:'Trend GYO'},
  {symbol:'TEKTU',name:'Tek-Art'},
  {symbol:'TEZOL',name:'Tezol Tekstil'},
  {symbol:'TKNSA',name:'Teknosa'},
  {symbol:'TMPOL',name:'Tem Polimer'},
  {symbol:'TRGYO',name:'Torunlar GYO'},
  {symbol:'TRILC',name:'Trilyum'},
  {symbol:'TURSG',name:'Türkiye Sigorta'},
  {symbol:'TUCLK',name:'Tuçka Uzay'},
  {symbol:'USAK',name:'Uşak Seramik'},
  {symbol:'VAKFN',name:'Vakıf Finansal'},
  {symbol:'VKGYO',name:'Vakıf GYO'},
  {symbol:'YATAS',name:'Yataş'},
  {symbol:'YBTAS',name:'Yibitaş'},
  {symbol:'YESIL',name:'Yeşil Yatırım'},
  {symbol:'YUNSA',name:'Yünsa'},
  {symbol:'ZOREN',name:'Zorlu Enerji'},
];

// ═══════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════
const PROXY_URL = '/api/scan';

// ── EXCHANGE CONFIG ──
let currentExchange = 'bist';
const EXCHANGE_META = {
  bist:        { name: 'BIST',             currency: '₺',   currencyCode: 'TRY', flag: '🇹🇷', symSuffix: '.IS', exCode: 'BIST',       filters: [] },
  nasdaq:      { name: 'NASDAQ',           currency: '$',   currencyCode: 'USD', flag: '🇺🇸', symSuffix: '',    exCode: 'NASDAQ',     filters: [{ left: 'exchange', operation: 'equal', right: 'NASDAQ' }] },
  sp500:       { name: 'S&P 500',          currency: '$',   currencyCode: 'USD', flag: '🇺🇸', symSuffix: '',    exCode: '',           filters: [] },
  dax:         { name: 'DAX',              currency: '€',   currencyCode: 'EUR', flag: '🇩🇪', symSuffix: '.DE', exCode: 'XETR',       filters: [] },
  lse:         { name: 'LSE',              currency: '£',   currencyCode: 'GBP', flag: '🇬🇧', symSuffix: '.L',  exCode: 'LSE',        filters: [] },
  nikkei:      { name: 'Nikkei',           currency: '¥',   currencyCode: 'JPY', flag: '🇯🇵', symSuffix: '.T',  exCode: 'TSE',        filters: [] },
  nyse:        { name: 'NYSE',             currency: '$',   currencyCode: 'USD', flag: '🇺🇸', symSuffix: '',    exCode: 'NYSE',       filters: [{ left: 'exchange', operation: 'equal', right: 'NYSE' }] },
  krx:         { name: 'KRX',             currency: '₩',   currencyCode: 'KRW', flag: '🇰🇷', symSuffix: '.KS', exCode: 'KRX',        filters: [] },
  moex:        { name: 'MOEX',            currency: '₽',   currencyCode: 'RUB', flag: '🇷🇺', symSuffix: '.ME', exCode: 'MOEX',       filters: [] },
  france:      { name: 'Euronext Paris',   currency: '€',   currencyCode: 'EUR', flag: '🇫🇷', symSuffix: '.PA', exCode: 'EURONEXT',   filters: [] },
  amsterdam:   { name: 'Euronext Amsterdam', currency: '€', currencyCode: 'EUR', flag: '🇳🇱', symSuffix: '.AS', exCode: 'EURONEXT',   filters: [] },
  brussels:    { name: 'Euronext Brussels', currency: '€',  currencyCode: 'EUR', flag: '🇧🇪', symSuffix: '.BR', exCode: 'EURONEXT',   filters: [] },
  lisbon:      { name: 'Euronext Lisbon',  currency: '€',   currencyCode: 'EUR', flag: '🇵🇹', symSuffix: '.LS', exCode: 'EURONEXT',   filters: [] },
  dublin:      { name: 'Euronext Dublin',  currency: '€',   currencyCode: 'EUR', flag: '🇮🇪', symSuffix: '.IR', exCode: 'EURONEXT',   filters: [] },
  oslo:        { name: 'Oslo Bors',        currency: 'kr',  currencyCode: 'NOK', flag: '🇳🇴', symSuffix: '.OL', exCode: 'OSL',        filters: [] },
  milan:       { name: 'Borsa Italiana',   currency: '€',   currencyCode: 'EUR', flag: '🇮🇹', symSuffix: '.MI', exCode: 'MIL',        filters: [] },
  tsx:         { name: 'TSX',              currency: 'C$',  currencyCode: 'CAD', flag: '🇨🇦', symSuffix: '.TO', exCode: 'TSX',        filters: [] },
  twse:        { name: 'TWSE',             currency: 'NT$', currencyCode: 'TWD', flag: '🇹🇼', symSuffix: '.TW', exCode: 'TWSE',       filters: [] },
  b3:          { name: 'B3',              currency: 'R$',   currencyCode: 'BRL', flag: '🇧🇷', symSuffix: '.SA', exCode: 'BMFBOVESPA', filters: [] },
  hkex:        { name: 'HKEX',           currency: 'HK$',  currencyCode: 'HKD', flag: '🇭🇰', symSuffix: '.HK', exCode: 'HKEX',       filters: [] },
  china:       { name: 'SSE/SZSE',       currency: '¥',    currencyCode: 'CNY', flag: '🇨🇳', symSuffix: '.SS', exCode: 'SSE',        filters: [] },
  saudi:       { name: 'Tadawul',         currency: '﷼',    currencyCode: 'SAR', flag: '🇸🇦', symSuffix: '.SR', exCode: 'TADAWUL',    filters: [] },
  switzerland: { name: 'SIX',             currency: 'Fr',   currencyCode: 'CHF', flag: '🇨🇭', symSuffix: '.SW', exCode: 'SIX',        filters: [] },
  australia:   { name: 'ASX',             currency: 'A$',   currencyCode: 'AUD', flag: '🇦🇺', symSuffix: '.AX', exCode: 'ASX',        filters: [] },
  southafrica: { name: 'JSE',             currency: 'R',    currencyCode: 'ZAR', flag: '🇿🇦', symSuffix: '.JO', exCode: 'JSE',        filters: [] },
  sweden:      { name: 'Nasdaq S.',        currency: 'kr',   currencyCode: 'SEK', flag: '🇸🇪', symSuffix: '.ST', exCode: 'STO',        filters: [] },
  india:       { name: 'NSE',             currency: '₹',    currencyCode: 'INR', flag: '🇮🇳', symSuffix: '.NS', exCode: 'NSE',        filters: [] },
  uae:         { name: 'DFM',             currency: 'د.إ',  currencyCode: 'AED', flag: '🇦🇪', symSuffix: '.DU', exCode: 'DFM',        filters: [] },
};

// Borsa → ülke (etiketlerde tutarlı ülke bazlı isimlendirme için tek kaynak)
const EXCHANGE_COUNTRY = {
  bist:'Türkiye', nasdaq:'ABD', sp500:'ABD', dax:'Almanya', lse:'İngiltere',
  nikkei:'Japonya', nyse:'ABD', krx:'Güney Kore', moex:'Rusya', france:'Fransa',
  amsterdam:'Hollanda', brussels:'Belçika', lisbon:'Portekiz', dublin:'İrlanda',
  oslo:'Norveç', milan:'İtalya', tsx:'Kanada', twse:'Tayvan', b3:'Brezilya',
  hkex:'Hong Kong', china:'Çin', saudi:'Suudi Arabistan', switzerland:'İsviçre',
  australia:'Avustralya', southafrica:'Güney Afrika', sweden:'İsveç',
  india:'Hindistan', uae:'BAE'
};

// Borsa açıklamaları — chip hover tooltipleri
const EXCHANGE_TIPS = {
  bist:        'Borsa İstanbul, Türkiye',
  nasdaq:      'ABD teknoloji borsası',
  sp500:       'ABD\'nin en büyük 500 şirketi',
  dax:         'Frankfurt Borsası, Almanya',
  lse:         'Londra Borsası, İngiltere',
  nikkei:      'Tokyo Borsası, Japonya',
  nyse:        'New York Borsası, ABD',
  krx:         'Güney Kore borsası',
  moex:        'Moskova Borsası, Rusya',
  france:      'Paris Borsası, Fransa',
  amsterdam:   'Amsterdam Borsası, Hollanda',
  brussels:    'Brüksel Borsası, Belçika',
  lisbon:      'Lizbon Borsası, Portekiz',
  dublin:      'Dublin Borsası, İrlanda',
  oslo:        'Oslo Borsası, Norveç',
  milan:       'Milano Borsası, İtalya',
  tsx:         'Toronto Borsası, Kanada',
  twse:        'Tayvan borsası',
  b3:          'São Paulo Borsası, Brezilya',
  hkex:        'Hong Kong borsası',
  china:       'Şanghay ve Şenzhen borsaları, Çin',
  saudi:       'Tadawul, Suudi Arabistan',
  switzerland: 'Zürih Borsası, İsviçre',
  australia:   'Sidney Borsası, Avustralya',
  southafrica: 'Johannesburg Borsası, Güney Afrika',
  sweden:      'Stockholm Borsası, İsveç',
  india:       'Hindistan ulusal borsası (NSE)',
  uae:         'Dubai Finans Borsası, BAE',
};

let allData = [];
var _scoreFilters = {};  // Faz 3: applyAndRender'da yakalanan aktif filtreler
let filtered = [];
let searchQ = '';
let selSym = null;
let sortSt = {field:'marketCapitalization', dir:'desc'};
let fxRates = {TRY:44.1, EUR:1.163, GBP:1.333, JPY:0.00633, KRW:0.00074, RUB:89.0, NOK:0.090, CAD:0.73, TWD:32.0, BRL:5.70, HKD:7.78, CNY:7.25, SAR:3.75, CHF:1.12, AUD:0.633, ZAR:18.5, SEK:0.095, INR:0.012, AED:0.272};
// /api/rates ham yanıtını hesaplama deposuna (fxRates) yazar.
// Ham format: TRY=USDTRY, EUR/GBP/...=USD başına birim (open.er-api). Hesaplama için saklanır.
function _applyRatesToFx(r) {
  if (!r) return;
  if (r.TRY) fxRates.TRY = r.TRY;
  if (r.EUR) fxRates.EUR = 1 / r.EUR;
  if (r.GBP) fxRates.GBP = 1 / r.GBP;
  if (r.JPY) fxRates.JPY = 1 / r.JPY;
  if (r.KRW) fxRates.KRW = 1 / r.KRW;
  if (r.RUB) fxRates.RUB = r.RUB;
  if (r.NOK) fxRates.NOK = 1 / r.NOK;
  if (r.CAD) fxRates.CAD = 1 / r.CAD;
  if (r.TWD) fxRates.TWD = r.TWD;
  if (r.BRL) fxRates.BRL = r.BRL;
  if (r.HKD) fxRates.HKD = r.HKD;
  if (r.CNY) fxRates.CNY = r.CNY;
  if (r.SAR) fxRates.SAR = r.SAR;
  if (r.CHF) fxRates.CHF = 1 / r.CHF;
  if (r.AUD) fxRates.AUD = 1 / r.AUD;
  if (r.ZAR) fxRates.ZAR = r.ZAR;
  if (r.SEK) fxRates.SEK = 1 / r.SEK;
  if (r.INR) fxRates.INR = 1 / r.INR;
  if (r.AED) fxRates.AED = 1 / r.AED;
}
let scanAborted = false;

// ═══════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════


// ═══════════════════════════════════════════
// FAVORİLER
// ═══════════════════════════════════════════
var _dfUser = null; // oturum açık kullanıcı
var _dfWatchlists = []; // önbelleğe alınmış watchlist'ler
var _dfPortfolios = []; // önbelleğe alınmış portföyler
var favSet = new Set(JSON.parse(localStorage.getItem('df_favs') || '[]'));
var favFilterActive = false;
var _dfListFilter   = null; // { id, name, symbols:[] } — logged-in liste filtresi
var fonFavSet = new Set(JSON.parse(localStorage.getItem('df_fon_favs') || '[]'));
var kriptoFavSet = new Set(JSON.parse(localStorage.getItem('df_kripto_favs') || '[]'));

function saveFavs() { localStorage.setItem('df_favs', JSON.stringify([...favSet])); }
function saveFonFavs() { localStorage.setItem('df_fon_favs', JSON.stringify([...fonFavSet])); }
function saveKriptoFavs() { localStorage.setItem('df_kripto_favs', JSON.stringify([...kriptoFavSet])); }

function toggleFonFav(code) {
  if (fonFavSet.has(code)) { fonFavSet.delete(code); showToast('✕ ' + code + ' favorilerden çıkarıldı'); }
  else { fonFavSet.add(code); showToast('★ ' + code + ' favorilere eklendi'); }
  saveFonFavs(); _updateFavBadge();
  _renderFon(_sortAsset(_fonData, sortSt.field, sortSt.dir), _fonMeta, _fonShowAll);
}
function toggleKriptoFav(sym) {
  if (kriptoFavSet.has(sym)) { kriptoFavSet.delete(sym); showToast('✕ ' + sym + ' favorilerden çıkarıldı'); }
  else { kriptoFavSet.add(sym); showToast('★ ' + sym + ' favorilere eklendi'); }
  saveKriptoFavs(); _updateFavBadge();
  _renderKripto(_sortAsset(_kriptoData, sortSt.field, sortSt.dir), _kriptoMeta, _kriptoShowAll);
}

function toggleFav(sym) {
  var adding = !favSet.has(sym);
  if (adding) { favSet.add(sym); showToast('★ ' + sym + ' favorilere eklendi'); }
  else { favSet.delete(sym); showToast('✕ ' + sym + ' favorilerden çıkarıldı'); }
  saveFavs(); renderTable(); _updateFavBtn(); _updateFavBadge();
  // Giriş yapıldıysa "Favorilerim" watchlist'ini de senkronize et
  if (_dfUser) _syncFavToWatchlist(sym, adding);
}

function _syncFavToWatchlist(sym, add) {
  var ex = currentExchange || 'bist';
  if (add) {
    fetch('/api/watchlists').then(function(r){ return r.json(); }).then(function(d) {
      var lists = d.watchlists || [];
      var favList = lists.find(function(l){ return l.name === 'Favorilerim' || l.id === 'wl_default'; });
      if (!favList && lists.length) favList = lists[0];
      if (!favList) return;
      fetch('/api/watchlists/item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listId: favList.id, symbol: sym, exchange: ex })
      }).catch(function(){});
    }).catch(function(){});
  } else {
    fetch('/api/watchlists').then(function(r){ return r.json(); }).then(function(d) {
      var lists = d.watchlists || [];
      lists.forEach(function(l) {
        if (l.items && l.items.find(function(i){ return i.symbol === sym; })) {
          fetch('/api/watchlists/item', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ listId: l.id, symbol: sym })
          }).catch(function(){});
        }
      });
    }).catch(function(){});
  }
}

function _updateFavBtn() {
  var active;
  if (_dfUser) {
    active = !!_dfListFilter;
  } else {
    active = favFilterActive;
  }
  ['fav-filter-btn', 'tb-fav-btn'].forEach(function(id) {
    var btn = document.getElementById(id);
    if (!btn) return;
    btn.classList.toggle('on', active);
    btn.textContent = active ? '★ Listelerim' : '☆ Listelerim';
  });
}

function toggleFavFilter(evt) {
  if (_dfUser) {
    _showListFilterPicker(evt || window.event);
  } else {
    favFilterActive = !favFilterActive;
    _updateFavBtn(); renderTable();
  }
}

function _showListFilterPicker(evt) {
  var existing = document.getElementById('df-list-filter-picker');
  if (existing) { existing.remove(); return; }

  var btn  = (evt && evt.currentTarget) || document.getElementById('fav-filter-btn');
  var rect = btn ? btn.getBoundingClientRect() : { left: 8, bottom: 48 };

  // Veri yoksa önce yükle
  if (!_dfWatchlists.length && !_dfPortfolios.length) {
    Promise.all([
      fetch('/api/watchlists', { credentials:'same-origin' }).then(function(r){ return r.json(); }).then(function(d){ _dfWatchlists = d.watchlists || []; }).catch(function(){}),
      fetch('/api/portfolio',  { credentials:'same-origin' }).then(function(r){ return r.json(); }).then(function(d){ _dfPortfolios = d.portfolios || []; }).catch(function(){})
    ]).then(function() { _doShowListFilterPicker(rect); });
    return;
  }
  _doShowListFilterPicker(rect);
}

function _doShowListFilterPicker(rect) {
  var div  = document.createElement('div');
  div.id   = 'df-list-filter-picker';
  div.style.cssText = 'position:fixed;z-index:9999;background:var(--s1);border:1px solid var(--border);border-radius:8px;box-shadow:0 6px 20px rgba(0,0,0,.18);min-width:200px;max-width:240px;padding:6px 0;left:' + Math.max(4, rect.left) + 'px;top:' + (rect.bottom + 4) + 'px;font-family:Inter,sans-serif';

  // Aktif filtre varsa "Tüm hisseler" (temizle) seçeneği göster
  if (_dfListFilter) {
    var clearRow = document.createElement('div');
    clearRow.style.cssText = 'padding:7px 12px;cursor:pointer;font-size:12px;color:var(--red);display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--border);margin-bottom:4px;';
    clearRow.innerHTML = '<span>✕</span><span>Filtreyi kaldır — ' + esc(_dfListFilter.name) + '</span>';
    clearRow.onmouseenter = function() { clearRow.style.background = 'var(--red-bg)'; };
    clearRow.onmouseleave = function() { clearRow.style.background = ''; };
    clearRow.onclick = function(e) {
      e.stopPropagation(); div.remove(); document.removeEventListener('click', outside);
      _dfListFilter = null; _updateFavBtn(); renderTable();
    };
    div.appendChild(clearRow);
  }

  function secLabel(txt) {
    var l = document.createElement('div');
    l.style.cssText = 'padding:4px 12px 2px;font-size:10px;font-weight:700;color:var(--text2);letter-spacing:.5px;text-transform:uppercase';
    l.textContent = txt; div.appendChild(l);
  }
  function makeRow(icon, name, onclick) {
    var row = document.createElement('div');
    row.style.cssText = 'padding:7px 12px;cursor:pointer;font-size:12px;color:var(--text);display:flex;align-items:center;gap:8px;white-space:nowrap;overflow:hidden';
    row.innerHTML = '<span>' + esc(icon) + '</span><span style="flex:1;overflow:hidden;text-overflow:ellipsis">' + esc(name) + '</span>';
    row.onmouseenter = function() { row.style.background = 'var(--s2)'; };
    row.onmouseleave = function() { row.style.background = ''; };
    row.onclick = onclick; return row;
  }

  if (_dfWatchlists.length) {
    secLabel('Takip Listeleri');
    _dfWatchlists.forEach(function(list) {
      var syms = (list.items || []).map(function(i) { return (i.symbol || '').replace('.IS','').toUpperCase(); });
      var isActive = _dfListFilter && _dfListFilter.id === list.id;
      var row = makeRow(list.icon || '⭐', list.name + ' (' + syms.length + ')', function(e) {
        e.stopPropagation(); div.remove(); document.removeEventListener('click', outside);
        _dfListFilter = { id: list.id, name: list.name, symbols: syms };
        _updateFavBtn(); renderTable();
      });
      if (isActive) row.style.background = 'rgba(14,165,233,.07)';
      div.appendChild(row);
    });
  }

  if (_dfPortfolios.length) {
    if (_dfWatchlists.length) {
      var sep = document.createElement('div');
      sep.style.cssText = 'height:1px;background:var(--border);margin:4px 0';
      div.appendChild(sep);
    }
    secLabel('Portföyler');
    _dfPortfolios.forEach(function(pf) {
      var syms = (pf.positions || []).map(function(p) { return (p.symbol || '').replace('.IS','').toUpperCase(); });
      var isActive = _dfListFilter && _dfListFilter.id === pf.id;
      var row = makeRow(pf.icon || '📊', pf.name + ' (' + syms.length + ')', function(e) {
        e.stopPropagation(); div.remove(); document.removeEventListener('click', outside);
        _dfListFilter = { id: pf.id, name: pf.name, symbols: syms };
        _updateFavBtn(); renderTable();
      });
      if (isActive) row.style.background = 'rgba(14,165,233,.07)';
      div.appendChild(row);
    });
  }

  if (!_dfWatchlists.length && !_dfPortfolios.length) {
    div.innerHTML = '<div style="padding:10px 14px;color:var(--text2);font-size:12px">Profil sayfasından liste oluşturun</div>';
  }

  document.body.appendChild(div);
  function outside(e) { if (!div.contains(e.target)) { div.remove(); document.removeEventListener('click', outside); } }
  setTimeout(function() { document.addEventListener('click', outside); }, 0);
}

// ═══════════════════════════════════════════
// KOLON SEÇİCİ
// ═══════════════════════════════════════════
const COL_DEFS = [
  {key:'match', label:'UYUM', def:true},
  {key:'price', label:'FİYAT', def:true},
  {key:'mcap', label:'P.Değeri', def:true},
  {key:'chg1d', label:'Günlük%', def:true},
  {key:'pb', label:'PD/DD', def:true},
  {key:'pe', label:'F/K', def:true},
  {key:'revg', label:'GELİR↑%', def:true},
  {key:'roe', label:'ROE%', def:true},
  {key:'margin', label:'MARJ%', def:true},
  {key:'de', label:'B/Ö', def:true},
  {key:'rsi', label:'RSI', def:true},
  {key:'name', label:'ŞİRKET ADI', def:false},
  {key:'ps', label:'F/S', def:false},
  {key:'roa', label:'ROA%', def:false},
  {key:'epsg', label:'K.BÜY%', def:false},
  {key:'fscore', label:'F-Score', def:false},
  {key:'cr', label:'CARİ', def:false},
  {key:'div', label:'TEMETTÜ%', def:false},
  {key:'peg', label:'PEG', def:false},
  {key:'tech_rating', label:'Teknik Skor', def:false},
  {key:'chg1w', label:'1H Geti%', def:false},
  {key:'perf3m', label:'3A Geti%', def:false},
  {key:'float_pct', label:'H.Açık%', def:false},
  {key:'sector', label:'SEKTÖR', def:false},
];
var _colVisible = null;

function loadColPrefs() {
  if (_colVisible) return;
  try {
    var saved = localStorage.getItem('df_cols_v7');
    if (saved) { _colVisible = {}; JSON.parse(saved).forEach(function(k){ _colVisible[k]=true; }); return; }
  } catch(e) {}
  // Varsayılan: def:false olan sütunlar gizli
  _colVisible = {};
  COL_DEFS.forEach(function(d){ _colVisible[d.key] = d.def !== false; });
}

function saveColPrefs() {
  localStorage.setItem('df_cols_v7', JSON.stringify(Object.keys(_colVisible).filter(function(k){ return _colVisible[k]; })));
}

function isColVisible(key) { loadColPrefs(); return !!_colVisible[key]; }

function applyColVisibility() {
  loadColPrefs();
  COL_DEFS.forEach(function(d) {
    var vis = isColVisible(d.key);
    document.querySelectorAll('[data-col="'+d.key+'"]').forEach(function(el){ el.style.display = vis ? '' : 'none'; });
  });
  _initColDrag();
  applyColOrder();
}

// ── Kolon sırası (sürükle-bırak) ──
var _colOrder = null;
function _loadColOrder() {
  if (_colOrder) return;
  try { var s = localStorage.getItem('df_col_order_v2'); if (s) { var arr = JSON.parse(s); if (Array.isArray(arr) && arr.length) { _colOrder = arr.filter(function(k){ return COL_DEFS.some(function(d){return d.key===k;}); }); COL_DEFS.forEach(function(d){ if(_colOrder.indexOf(d.key)===-1) _colOrder.push(d.key); }); return; } } } catch(e) {}
  _colOrder = COL_DEFS.map(function(d){ return d.key; });
}
function _reorderRowCells(row) {
  var cells = row.children, map = {}, i;
  for (i = 0; i < cells.length; i++) { var k = cells[i].getAttribute && cells[i].getAttribute('data-col'); if (k) map[k] = cells[i]; }
  for (i = 0; i < _colOrder.length; i++) { var el = map[_colOrder[i]]; if (el) row.appendChild(el); }
}
function applyColOrder() {
  _loadColOrder();
  var head = document.querySelector('#hisse-table thead tr');
  if (head) _reorderRowCells(head);
  var rows = document.querySelectorAll('#hisse-table tbody tr');
  for (var i = 0; i < rows.length; i++) _reorderRowCells(rows[i]);
}
var _dragCol = null;
function _initColDrag() {
  var ths = document.querySelectorAll('#hisse-table thead th[data-col]');
  ths.forEach(function(th) {
    if (th._cdInit) return; th._cdInit = true;
    th.setAttribute('draggable', 'true');
    th.addEventListener('dragstart', function(e) { _dragCol = th.getAttribute('data-col'); try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', _dragCol); } catch(_) {} th.classList.add('col-dragging'); });
    th.addEventListener('dragend', function() { th.classList.remove('col-dragging'); document.querySelectorAll('.col-drop-l,.col-drop-r').forEach(function(x){ x.classList.remove('col-drop-l','col-drop-r'); }); _dragCol = null; });
    th.addEventListener('dragover', function(e) { if (!_dragCol || _dragCol === th.getAttribute('data-col')) return; e.preventDefault(); try { e.dataTransfer.dropEffect = 'move'; } catch(_) {} var r = th.getBoundingClientRect(); var after = (e.clientX - r.left) > r.width / 2; th.classList.toggle('col-drop-r', after); th.classList.toggle('col-drop-l', !after); });
    th.addEventListener('dragleave', function() { th.classList.remove('col-drop-l','col-drop-r'); });
    th.addEventListener('drop', function(e) { e.preventDefault(); var target = th.getAttribute('data-col'); var r = th.getBoundingClientRect(); var after = (e.clientX - r.left) > r.width / 2; th.classList.remove('col-drop-l','col-drop-r'); _moveCol(_dragCol, target, after); });
  });
}
function _moveCol(from, to, after) {
  if (!from || from === to) return;
  _loadColOrder();
  var fi = _colOrder.indexOf(from); if (fi < 0) return;
  _colOrder.splice(fi, 1);
  var ti = _colOrder.indexOf(to); if (ti < 0) { _colOrder.splice(fi, 0, from); return; }
  _colOrder.splice(after ? ti + 1 : ti, 0, from);
  try { localStorage.setItem('df_col_order_v2', JSON.stringify(_colOrder)); } catch(e) {}
  applyColOrder();
}

function openColPicker() {
  loadColPrefs();
  var modal = document.getElementById('col-picker-modal');
  if (!modal) return;
  document.getElementById('col-picker-grid').innerHTML = COL_DEFS.map(function(d) {
    return '<label class="col-pick-item"><input type="checkbox"' + (isColVisible(d.key)?' checked':'')
      + ' data-ckey="'+d.key+'" onchange="toggleCol(this.dataset.ckey,this.checked)"><span>'+d.label+'</span></label>';
  }).join('');
  modal.classList.add('open');
}

function toggleCol(key, vis) { loadColPrefs(); _colVisible[key]=vis; saveColPrefs(); applyColVisibility(); }
function closeColPicker() { var m=document.getElementById('col-picker-modal'); if(m) m.classList.remove('open'); }
function resetColPrefs() { _colVisible=null; loadColPrefs(); saveColPrefs(); openColPicker(); applyColVisibility(); renderTable(); }

// ── CSV Export ────────────────────────────────────────────────
function exportToCSV() {
  if (!filtered || !filtered.length) return;
  var ex = EXCHANGE_META[currentExchange] || EXCHANGE_META.bist;
  var cur = ex.currency || '₺';
  var cols = [
    { key: 'symbol',                    label: 'Sembol' },
    { key: 'name',                      label: 'Şirket Adı' },
    { key: 'currentPrice',              label: 'Fiyat (' + cur + ')' },
    { key: 'changePercent',             label: 'Değişim %' },
    { key: 'marketCapitalization',      label: 'Piyasa Değeri (M$)' },
    { key: 'peNormalizedAnnual',        label: 'F/K' },
    { key: 'pbAnnual',                  label: 'PD/DD' },
    { key: 'psTTM',                     label: 'F/S' },
    { key: 'roeTTM',                    label: 'ROE %' },
    { key: 'roaTTM',                    label: 'ROA %' },
    { key: 'netProfitMarginTTM',        label: 'Net Marj %' },
    { key: 'grossMarginTTM',            label: 'Brüt Marj %' },
    { key: 'revenueGrowthTTMYoy',       label: 'Gelir Büy %' },
    { key: 'epsGrowthTTMYoy',           label: 'EPS Büy %' },
    { key: 'dividendYieldIndicatedAnnual', label: 'Temettü %' },
    { key: 'currentRatioAnnual',        label: 'Cari Oran' },
    { key: 'sector',                    label: 'Sektör' },
  ];
  // Türkçe/Avrupa Excel için: ayraç ';' (virgül ondalık sanılır → tek sütun olurdu),
  // ondalık ',' (nokta binlik sanılır), sep= direktifi + BOM ile her yerel ayarda doğru açılır.
  var SEP = ';';
  var rows = ['sep=' + SEP];
  rows.push(cols.map(function(c){ return '"' + c.label + '"'; }).join(SEP));
  filtered.forEach(function(s) {
    rows.push(cols.map(function(c) {
      var v = s[c.key];
      if (v === null || v === undefined) return '';
      if (typeof v === 'string') return '"' + v.replace(/"/g, '""') + '"';
      if (typeof v === 'number') {
        // 2 ondalığa yuvarla (uzun kuyrukları temizle), sonra Türkçe ondalık (,)
        var n = Math.round(v * 100) / 100;
        return String(n).replace('.', ',');
      }
      return String(v);
    }).join(SEP));
  });
  var csv = '﻿' + rows.join('\r\n'); // BOM (Türkçe karakter) + CRLF (Excel)
  var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  var stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = 'deepfin-' + (currentExchange || 'bist') + '-' + stamp + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Row Density Toggle ──
var _rowDensity = (function(){ try { return localStorage.getItem('df_density') || 'compact'; } catch(e){ return 'compact'; } })();
function setDensity(d) {
  _rowDensity = d;
  try { localStorage.setItem('df_density', d); } catch(e){}
  var tbl = document.getElementById('hisse-table');
  if (tbl) { tbl.classList.remove('density-compact','density-normal','density-comfortable'); tbl.classList.add('density-'+d); }
  document.querySelectorAll('.density-btn').forEach(function(b){ b.classList.toggle('active', b.dataset.density === d); });
}
function _initDensity() {
  setDensity(_rowDensity);
  // Update buttons if already rendered
  document.querySelectorAll('.density-btn').forEach(function(b){ b.classList.toggle('active', b.dataset.density === _rowDensity); });
}

// ═══════════════════════════════════════════
// HABERLER
// ═══════════════════════════════════════════
async function fetchNews(sym) {
  var list = document.getElementById('dnews-list');
  if (!list) return;
  list.innerHTML = '<div style="color:var(--muted2);font-size:11px;text-align:center;padding:20px;">Haberler yükleniyor...</div>';
  try {
    var res = await fetch('/api/news?sym=' + encodeURIComponent(sym) + '&ex=' + encodeURIComponent(currentExchange));
    if (!res.ok) throw new Error('HTTP ' + res.status);
    var data = await res.json();
    var items = data.news || [];
    if (!items.length) { list.innerHTML = '<div style="color:var(--muted2);font-size:11px;text-align:center;padding:20px;">Haber bulunamadı.</div>'; return; }
    list.innerHTML = items.slice(0, 10).map(function(n) {
      var dt = n.published ? new Date(n.published*1000).toLocaleDateString('tr-TR',{day:'2-digit',month:'2-digit',year:'numeric'}) : '';
      return '<a href="'+safeUrl(n.url)+'" target="_blank" rel="noopener noreferrer" class="dnews-item">'
        + '<div class="dnews-meta"><span class="dnews-src">'+esc(n.source||'')+'</span><span class="dnews-date">'+esc(dt)+'</span></div>'
        + '<div class="dnews-title">'+esc(n.headline||n.title||'')+'</div></a>';
    }).join('');
  } catch(e) {
    list.innerHTML = '<div style="color:var(--muted2);font-size:11px;text-align:center;padding:20px;">Haber yüklenemedi.</div>';
  }
}

function init(){
  showApp();
  loadColPrefs();
  // Not: from= kontrolü DOMContentLoaded'da yapılıyor (DOM hazır olsun diye)
}

function showApp(){
  document.getElementById('empty-sub').textContent = '';
}

// Sleep helper
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ═══════════════════════════════════════════
// TARAMA MOTORU — tek istekte tüm BIST
// ═══════════════════════════════════════════
var _scanRunning = false;
var _scanQueued  = false;
async function runScan(){
  // Bir tarama sürerken gelen istekleri düşürme — kuyruğa al, bitince tekrar çalıştır.
  // (Aksi halde ilk açılışta veya hızlı tıklamada tarama kaybolur.)
  if (_scanRunning) { _scanQueued = true; return; }
  _scanRunning = true;
  closeMobileDrawer();
  // Disclaimer kontrolü
  if (!disclaimerAccepted && !localStorage.getItem('df_disclaimer_v2')) {
    _scanRunning = false;
    showDisclaimerModal();
    return;
  }
  _track('scan', 'run');
  // Görünümü İLK iş olarak değiştir — kur isteği beklenirken
  // önceki taramanın bayat ekranı bir an bile görünmesin
  const _quick = window._quickRescan === true;
  window._quickRescan = false;
  const btn = document.getElementById('scanbtn');
  btn.disabled = true;
  scanAborted = false;
  document.getElementById('stopbtn').style.display = 'none';
  allData = [];
  filtered = [];
  selSym = null;
  closeDetail();
  if (_quick) {
    showQuickScanPill(window._quickRescanLabel);
    window._quickRescanLabel = null;
  } else {
    showState('loading');
    document.getElementById('toolbar').style.display = 'none';
    document.getElementById('loadtxt').textContent = 'Taranıyor...';
    const exMeta = EXCHANGE_META[currentExchange] || EXCHANGE_META.bist;
    document.getElementById('loadsub').textContent = `${exMeta.flag} ${exMeta.name} hisseleri alınıyor...`;
  }
  document.getElementById('prog').style.width = '30%';
  // Döviz kurları güncelleme (USD bazlı)
  try {
    const rateRes = await fetch('/api/rates');
    if(rateRes.ok) {
      const r = await rateRes.json();
      // /api/rates ham {TRY, EUR, GBP, ...} döner — hesaplama deposuna yaz
      _applyRatesToFx(r);
    }
  } catch(e) { /* fallback kurlar kullanılır */ }
  // Collect all active filter tags for summary bar (deduplicated by key)
  var _filterTags = [];
  var _seenKeys   = {};
  document.querySelectorAll('#goat-chips .goat-chip.on').forEach(function(c) {
    var k = c.dataset.goat;
    if (k && GURUS[k] && !_seenKeys[k]) { _seenKeys[k] = 1; _filterTags.push({ label: GURUS[k].label.split(' — ')[0].split(' (')[0], desc: GURUS[k].desc || '', kind: 'goat', key: k }); }
  });
  document.querySelectorAll('#presets .chip.on').forEach(function(c) {
    var k = c.dataset.preset;
    if (k && PRESETS[k] && !_seenKeys[k]) { _seenKeys[k] = 1; _filterTags.push({ label: PRESETS[k].label, desc: PRESETS[k].desc || '', kind: 'preset', key: k }); }
  });
  document.querySelectorAll('#tech-presets .chip.on').forEach(function(c) {
    var k = c.dataset.tech;
    if (k && TECH_PRESETS[k] && !_seenKeys[k]) { _seenKeys[k] = 1; _filterTags.push({ label: TECH_PRESETS[k].label, desc: TECH_PRESETS[k].desc || '', kind: 'tech', key: k }); }
  });
  // Deduplicate by label as final safety net
  var _lblSeen = {};
  _filterTags = _filterTags.filter(function(f) { if (_lblSeen[f.label]) return false; _lblSeen[f.label] = 1; return true; });
  _scanMeta.filters  = _filterTags;
  _scanMeta.strategy = _filterTags.map(function(f){return f.label;}).join(', ') || null;
  _scanMeta.exchange = currentExchange;
  var _scanMinMs = _quick ? 1500 : (_psvScanFilterCount >= 3 ? 4500 : _psvScanFilterCount >= 1 ? 3000 : 0);
  if (_quick) scanStartTime = Date.now(); // startScanEta atlanıyor — min süre hesabı için gerekli
  else startScanEta(currentExchange, _scanMinMs);

  // Field isimleri borsa bazlı farklı — exchange'e göre doğru set
  const isBIST = (currentExchange === 'bist');
  // Alan isimleri — konsoldan teyit edildi ✓
  const COLS_BIST = [
    'name','description','close','change','volume','market_cap_basic',
    'price_earnings_ttm','price_to_revenue_ratio',
    'price_book_fq','price_sales_current',
    'return_on_equity_fq','return_on_assets_fq',
    'net_margin','gross_margin',
    'total_revenue_change_ttm_yoy','earnings_per_share_change_ttm_yoy',
    'revenue_growth_ttm_yoy','earnings_per_share_diluted_yoy_growth_ttm',
    'dividends_yield','debt_to_equity_fq','current_ratio_fq',
    'sector','High.1M','Low.1M','piotroski_f_score',
    'Recommend.All','Recommend.MA','Recommend.Other',
    'Perf.1M','Perf.3M','Perf.6M','Perf.Y','Perf.W','RSI',
    'price_52_week_high','price_52_week_low',
    'average_volume_10d_calc','relative_volume_10d_calc',
    'SMA50','SMA200','MACD.macd','MACD.signal',
    'ADX','ADX+DI','ADX-DI','BB.lower','Stoch.K','Stoch.D','beta_1_year',
    'float_shares_outstanding_percent'
  ];
  const COLS_US = [
    'name','description','close','change','volume','market_cap_basic',
    'price_earnings_ttm','price_book_ratio','price_book_fq','price_sales_current',
    'return_on_equity','return_on_equity_fq','return_on_assets','return_on_assets_fq',
    'net_margin','gross_margin',
    'total_revenue_change_ttm_yoy','revenue_growth_ttm_yoy',
    'earnings_per_share_diluted_yoy_growth_ttm','earnings_per_share_change_ttm_yoy',
    'earnings_per_share_diluted_ttm',
    'dividends_yield_current','dividends_yield',
    'total_debt_to_equity','debt_to_equity_fq','current_ratio','current_ratio_fq',
    'sector','High.1M','Low.1M','piotroski_f_score',
    'Recommend.All','Recommend.MA','Recommend.Other',
    'Perf.1M','Perf.3M','Perf.6M','Perf.Y','Perf.W','RSI',
    'price_52_week_high','price_52_week_low',
    'average_volume_10d_calc','relative_volume_10d_calc',
    'SMA50','SMA200','MACD.macd','MACD.signal',
    'ADX','ADX+DI','ADX-DI','BB.lower','Stoch.K','Stoch.D','beta_1_year',
    'float_shares_outstanding_percent'
  ];
  const COLS_GLOBAL = [
    'name','description','close','change','volume','market_cap_basic',
    'price_earnings_ttm','price_book_ratio','price_book_fq','price_sales_current',
    'return_on_equity','return_on_equity_fq','return_on_assets','return_on_assets_fq',
    'net_margin','gross_margin',
    'total_revenue_change_ttm_yoy','revenue_growth_ttm_yoy',
    'earnings_per_share_diluted_yoy_growth_ttm','earnings_per_share_change_ttm_yoy',
    'dividends_yield_current','dividends_yield',
    'total_debt_to_equity','debt_to_equity_fq','current_ratio','current_ratio_fq',
    'sector','High.1M','Low.1M','piotroski_f_score',
    'Recommend.All','Recommend.MA','Recommend.Other',
    'Perf.1M','Perf.3M','Perf.6M','Perf.Y','Perf.W','RSI',
    'price_52_week_high','price_52_week_low',
    'average_volume_10d_calc','relative_volume_10d_calc',
    'SMA50','SMA200','MACD.macd','MACD.signal',
    'ADX','ADX+DI','ADX-DI','BB.lower','Stoch.K','Stoch.D','beta_1_year',
    'float_shares_outstanding_percent'
  ];
  const COLUMNS_BY_EXCHANGE = {
    bist:   COLS_BIST,
    nasdaq: COLS_US,
    sp500:  COLS_US,
    dax:    COLS_GLOBAL,
    lse:    COLS_GLOBAL,
    nikkei: COLS_GLOBAL,
    nyse:   COLS_US,
    krx:    COLS_GLOBAL,
    moex:   COLS_GLOBAL,
    france:    COLS_GLOBAL,
    amsterdam: COLS_GLOBAL,
    brussels:  COLS_GLOBAL,
    lisbon:    COLS_GLOBAL,
    dublin:    COLS_GLOBAL,
    oslo:      COLS_GLOBAL,
    milan:     COLS_GLOBAL,
    tsx:       COLS_GLOBAL,
    twse:      COLS_GLOBAL,
    b3:        COLS_GLOBAL,
    hkex:      COLS_GLOBAL,
    china:       COLS_GLOBAL,
    saudi:       COLS_GLOBAL,
    switzerland: COLS_GLOBAL,
    australia:   COLS_GLOBAL,
    southafrica: COLS_GLOBAL,
    sweden:      COLS_GLOBAL,
    india:       COLS_GLOBAL,
    uae:         COLS_GLOBAL,
  };
  // Yeni eklenen teknik kolonlar — sorun çıkarsa çekirdek sete dönüş için ayrı tutulur
  const NEW_TECH_COLS = ['price_52_week_high','price_52_week_low',
    'average_volume_10d_calc','relative_volume_10d_calc',
    'SMA50','SMA200','MACD.macd','MACD.signal',
    'ADX','ADX+DI','ADX-DI','BB.lower','Stoch.K','Stoch.D','beta_1_year','Perf.1M'];
  const _fullCols = COLUMNS_BY_EXCHANGE[currentExchange] || COLS_GLOBAL;
  const _coreCols = _fullCols.filter(function(c){ return NEW_TECH_COLS.indexOf(c) === -1; });
  const payload = {
    columns: (window._scanCoreColsOnly ? _coreCols : _fullCols).slice(),
    range: [0, 3000],
    sort: { sortBy: 'market_cap_basic', sortOrder: 'desc' },
    ignore_unknown_fields: true
  };

  try {
    // Borsa bazlı range limitleri — filtreler scan.js extraFilters'da tanımlı
    if (currentExchange === 'sp500')  payload.range = [0, 503];
    if (currentExchange === 'nasdaq') payload.range = [0, 4500];
    if (currentExchange === 'dax')    payload.range = [0, 500];
    if (currentExchange === 'lse')    payload.range = [0, 2000];
    if (currentExchange === 'nikkei') payload.range = [0, 4000];
    if (currentExchange === 'krx')    payload.range = [0, 3000];
    if (currentExchange === 'moex')   payload.range = [0, 500];
  // Proxy üzerinden — kaynak gizli; BIST için halka açıklık verisi paralel çekilir
  const _isBist = currentExchange === 'bist';
  const [resInit, _bistFloatRes] = await Promise.all([
    fetch('/api/scan?exchange=' + currentExchange, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }),
    _isBist ? fetch('/api/bist-scan') : Promise.resolve(null)
  ]);

    document.getElementById('prog').style.width = '70%';

    // Yanıtı çöz. Hata durumlarında kademeli telafi:
    //  1) Hata mesajında kolon adı geçiyorsa o kolonu çıkar, tekrar dene (en fazla 6)
    //  2) Teşhis edilemeyen hata → kanıtlanmış çekirdek kolon setiyle son bir deneme
    let json = null;
    {
      let resCur = resInit, attempt = 0, coreFallbackDone = window._scanCoreColsOnly === true;
      while (true) {
        const text = await resCur.text();
        let parsed = null;
        try { parsed = JSON.parse(text); } catch(e) {}
        if (parsed && parsed.body && typeof parsed.body === 'string') {
          try { parsed = JSON.parse(parsed.body); } catch(e) {}
        }
        const errMsg = (parsed && parsed.error) ? String(parsed.error)
                     : (!resCur.ok ? ('HTTP ' + resCur.status + ' — ' + text.slice(0, 200))
                     : (!parsed ? ('Parse hatası: ' + text.slice(0, 200)) : null));
        if (!errMsg) { json = parsed; break; }

        const badField = (errMsg.match(/"([^"]+)"/) || [])[1];
        attempt++;
        if (badField && payload.columns.indexOf(badField) > -1 && attempt <= 6) {
          console.warn('[DeepFin] Kolon reddedildi, çıkarılıyor:', badField);
          payload.columns.splice(payload.columns.indexOf(badField), 1);
          // Kalıcı öğren: paylaşılan kolon listesinden de çıkar
          const sharedIdx = _fullCols.indexOf(badField);
          if (sharedIdx > -1) _fullCols.splice(sharedIdx, 1);
        } else if (!coreFallbackDone) {
          console.warn('[DeepFin] Tarama hatası, çekirdek kolonlarla yeniden deneniyor:', errMsg);
          coreFallbackDone = true;
          window._scanCoreColsOnly = true; // sonraki taramalar da çekirdek setle başlasın
          payload.columns = _coreCols.slice();
        } else {
          throw new Error('API: ' + errMsg);
        }
        resCur = await fetch('/api/scan?exchange=' + currentExchange, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });
      }
    }
    if(!json.data || json.data.length === 0) {
      const msg = json.totalCount > 0
        ? `API yanıt verdi (${json.totalCount} hisse) ama data boş — filtre sorunu`
        : 'Veri yok — ' + JSON.stringify(json).slice(0,150);
      throw new Error(msg);
    }

    document.getElementById('prog').style.width = '100%';

    // BIST: İş Yatırım'dan halka açıklık oranlarını al (TV'de genellikle null)
    const _bistFloatMap = {};
    if (_isBist && _bistFloatRes && _bistFloatRes.ok) {
      try {
        const _bistData = await _bistFloatRes.json();
        for (const row of (_bistData.data || [])) {
          if (row.symbol && row.freeFloat != null) _bistFloatMap[row.symbol] = row.freeFloat;
        }
      } catch(e) { console.warn('[DeepFin] bist-scan float verisi alınamadı:', e.message); }
    }

    // Tarama yanıtını parse et — index bazlı, sıra garantili
    const results = [];
    // CI map: response'dan gelen gerçek columns sırası (scan.js'nin safeCols filtrelemesi
    // sırayı bozabilir). Yoksa client listesine fallback.
    const responseCols = Array.isArray(json.columns) ? json.columns
                       : (COLUMNS_BY_EXCHANGE[currentExchange] || []);
    const ci = {};
    responseCols.forEach((c,i) => ci[c]=i); // column → index map

    for(const row of json.data) {
      const d = row.d;
      const g = (key) => d[ci[key]] ?? null; // güvenli getter

      const close  = g('close');
      const name   = g('name');
      const description = g('description');
      const change = g('change');
      const volume = g('volume');
      const mcap   = g('market_cap_basic');
      const pe     = g('price_earnings_ttm');
      const pb     = g('price_book_fq')               ?? g('price_book_ratio');
      const ps     = g('price_sales_current') ?? g('price_to_revenue_ratio');
      const roe    = g('return_on_equity_fq')           ?? g('return_on_equity');
      const roa    = g('return_on_assets_fq')           ?? g('return_on_assets');
      const nm     = g('net_margin');
      const gm     = g('gross_margin');
      const revG   = g('total_revenue_change_ttm_yoy')  ?? g('revenue_growth_ttm_yoy') ?? g('earnings_per_share_diluted_yoy_growth_ttm');
      const epsG   = g('earnings_per_share_change_ttm_yoy') ?? g('earnings_per_share_diluted_yoy_growth_ttm') ?? g('revenue_growth_ttm_yoy');
      const divY   = g('dividends_yield')               ?? g('dividends_yield_current');
      const de     = g('debt_to_equity_fq')             ?? g('total_debt_to_equity');
      const cr     = g('current_ratio_fq')              ?? g('current_ratio');
      const sector = g('sector');
      const high1m = g('High.1M');
      const low1m  = g('Low.1M');
      const techRating = g('Recommend.All');
      const maRating   = g('Recommend.MA');
      const oscRating  = g('Recommend.Other');
      const perf3m     = g('Perf.3M');
      const perf6m     = g('Perf.6M');
      const perfY      = g('Perf.Y');
      const perfW      = g('Perf.W');
      const floatPct   = g('float_shares_outstanding_percent');
      const rsi14      = g('RSI');
      const perf1m     = g('Perf.1M');
      const high52w    = g('price_52_week_high');
      const low52w     = g('price_52_week_low');
      const avgVol10d  = g('average_volume_10d_calc');
      const relVol     = g('relative_volume_10d_calc');
      const sma50      = g('SMA50');
      const sma200     = g('SMA200');
      const macdV      = g('MACD.macd');
      const macdSig    = g('MACD.signal');
      const adx        = g('ADX');
      const adxPlusDi  = g('ADX+DI');
      const adxMinusDi = g('ADX-DI');
      const bbLower    = g('BB.lower');
      const stochK     = g('Stoch.K');
      const stochD     = g('Stoch.D');
      const beta1y     = g('beta_1_year');

      // Sembol formatı: "BIST:THYAO" → "THYAO"
      const rawSym = row.s || '';
      const symbol = rawSym.replace(/^[A-Z0-9]+:/, '');

      if(!close || close === 0) continue;

      results.push({
        symbol,
        name: (function() {
          // BIST: önce yerel listeden bak (Türkçe tam ad)
          if(currentExchange === 'bist') {
            const local = BIST_SYMBOLS.find(function(x){ return x.symbol === symbol.replace('.IS',''); });
            if(local) return local.name;
          }
          // Global: description field'ı tam adı veriyor (ör. "Apple Inc.")
          if(description && description !== name) return description;
          return name || symbol;
        })(),
        currentPrice: close,
        previousClose: close / (1 + (change||0)/100),
        changePercent: change || null,
        volume: volume || null,
        marketCapitalization: mcap ? (function() {
          // market_cap_basic yerel para biriminde gelir → USD'ye çevir
          var val = mcap;
          if(currentExchange === 'bist')    val = val / fxRates.TRY;        // TRY → USD
          else if(currentExchange === 'dax') val = val * fxRates.EUR;        // EUR → USD
          else if(currentExchange === 'lse') val = val * fxRates.GBP / 100;  // GBX (pence) → USD
          else if(currentExchange === 'nikkei') val = val * fxRates.JPY;     // JPY → USD
          else if(currentExchange === 'krx')    val = val * fxRates.KRW;     // KRW → USD
          else if(currentExchange === 'moex')   val = val / fxRates.RUB;     // RUB → USD
          else if(['france','amsterdam','brussels','lisbon','dublin','milan'].includes(currentExchange)) val = val * fxRates.EUR; // EUR → USD
          else if(currentExchange === 'oslo') val = val * fxRates.NOK;         // NOK → USD
          else if(currentExchange === 'tsx')  val = val * fxRates.CAD;         // CAD → USD
          else if(currentExchange === 'twse') val = val / fxRates.TWD;         // TWD → USD
          else if(currentExchange === 'b3')   val = val / fxRates.BRL;         // BRL → USD
          else if(currentExchange === 'hkex')  val = val / fxRates.HKD;         // HKD → USD
          else if(currentExchange === 'china') val = val / fxRates.CNY;         // CNY → USD
          else if(currentExchange === 'saudi')       val = val / fxRates.SAR;         // SAR → USD
          else if(currentExchange === 'switzerland') val = val * fxRates.CHF;         // CHF → USD
          else if(currentExchange === 'australia')   val = val * fxRates.AUD;         // AUD → USD
          else if(currentExchange === 'southafrica') val = val / fxRates.ZAR;         // ZAR → USD
          else if(currentExchange === 'sweden')      val = val * fxRates.SEK;         // SEK → USD
          else if(currentExchange === 'india')       val = val * fxRates.INR;         // INR → USD
          else if(currentExchange === 'uae')         val = val * fxRates.AED;         // AED → USD
          // nasdaq/sp500: zaten USD
          return val / 1e6; // milyon USD olarak sakla
        })() : null,
        exchangeId: currentExchange,
        peNormalizedAnnual: pe || null,
        pbAnnual: pb || null,
        psTTM: ps || null,
        roeTTM: roe ?? null,
        roaTTM: roa ?? null,
        netProfitMarginTTM: nm ?? null,
        grossMarginTTM: gm ?? null,
        revenueGrowthTTMYoy: revG ?? null,
        epsGrowthTTMYoy: epsG ?? null,
        dividendYieldIndicatedAnnual: divY ?? null,
        'totalDebt/totalEquityAnnual': de ?? null,
        currentRatioAnnual: cr ?? null,
        sector: (function() {
          if(!sector) return null;
          var SECTOR_TR = {
            'Technology': 'Teknoloji',
            'Finance': 'Finans',
            'Financial': 'Finans',
            'Financial Services': 'Finansal Hizmetler',
            'Health Technology': 'Sağlık Teknolojisi',
            'Healthcare': 'Sağlık',
            'Health Services': 'Sağlık Hizmetleri',
            'Consumer Durables': 'Dayanıklı Tüketim',
            'Consumer Non-Durables': 'Dayanıksız Tüketim',
            'Consumer Services': 'Tüketici Hizmetleri',
            'Consumer Cyclicals': 'Döngüsel Tüketim',
            'Consumer Defensive': 'Savunmacı Tüketim',
            'Retail Trade': 'Perakende',
            'Energy Minerals': 'Enerji & Maden',
            'Energy': 'Enerji',
            'Utilities': 'Kamu Hizmetleri',
            'Industrials': 'Sanayi',
            'Industrial Services': 'Endüstriyel Hizmetler',
            'Producer Manufacturing': 'Üretim Sanayi',
            'Process Industries': 'Proses Endüstrisi',
            'Basic Materials': 'Temel Malzemeler',
            'Materials': 'Malzemeler',
            'Real Estate': 'Gayrimenkul',
            'Transportation': 'Ulaşım',
            'Communications': 'İletişim',
            'Communication Services': 'İletişim Hizmetleri',
            'Electronic Technology': 'Elektronik Teknoloji',
            'Commercial Services': 'Ticari Hizmetler',
            'Distribution Services': 'Dağıtım Hizmetleri',
            'Miscellaneous': 'Diğer',
            'Non-Energy Minerals': 'Enerji Dışı Madenler',
            'Government': 'Kamu',
            'Banks': 'Bankacılık',
            'Insurance': 'Sigorta',
            'Investment Trusts/Mutual Funds': 'Yatırım Fonu',
            'Pharmaceuticals': 'İlaç',
            'Biotechnology': 'Biyoteknoloji',
            'Automobiles': 'Otomotiv',
            'Software': 'Yazılım',
            'Hardware': 'Donanım',
            'Semiconductors': 'Yarı İletkenler',
            'Aerospace & Defense': 'Havacılık & Savunma',
            'Mining': 'Madencilik',
            'Food & Beverage': 'Gıda & İçecek',
            'Food Processing': 'Gıda İşleme',
            'Chemicals': 'Kimya',
            'Construction': 'İnşaat',
            'Textiles': 'Tekstil',
            'Holding Companies': 'Holding',
          };
          var mapped = SECTOR_TR[sector] || sector;
          // Uzay şirketlerini isim bazında ayır (ticker + tam şirket adı)
          var nm = ((name || '') + ' ' + (description || '')).toUpperCase();
          var spaceSectors = ['Havacılık & Savunma', 'Sanayi', 'Teknoloji', 'Elektronik Teknoloji', 'Endüstriyel Hizmetler'];
          if (spaceSectors.indexOf(mapped) !== -1) {
            var spaceWords = ['SPACE', 'ROCKET', 'GALACTIC', 'SATELLITE', 'COSMOS', 'SPACEFLIGHT', 'ORBIT', 'LAUNCHER', 'SPACEPORT'];
            if (spaceWords.some(function(w){ return nm.indexOf(w) !== -1; })) return 'Uzay';
          }
          return mapped;
        })(),
        sectorRaw: sector || null,
        // Gerçek 52 haftalık zirve/dip; veri yoksa 1 aylık değere düş
        '52WeekHigh': high52w || high1m || null,
        '52WeekLow': low52w || low1m || null,
        high1m: high1m || null,
        low1m:  low1m  || null,
        piotroski: g('piotroski_f_score') !== null ? Math.round(g('piotroski_f_score')) : null,
        fromHigh: (function(){ var h = high52w || high1m; return (h && close && h > 0) ? ((close - h) / h * 100) : null; })(),
        fromLow:  (function(){ var l = low52w  || low1m;  return (l && close && l > 0) ? ((close - l) / l * 100) : null; })(),
        techRating: techRating !== null ? techRating : null,
        maRating:   maRating   !== null ? maRating   : null,
        oscRating:  oscRating  !== null ? oscRating  : null,
        perf1m:     perf1m     !== null ? perf1m     : null,
        perf3m:     perf3m     !== null ? perf3m     : null,
        perf6m:     perf6m     !== null ? perf6m     : null,
        perfY:      perfY      !== null ? perfY      : null,
        perfW:      perfW      !== null ? perfW      : null,
        floatPct:   floatPct   !== null ? floatPct   : (_bistFloatMap[symbol] ?? null),
        rsi14:      rsi14      !== null ? rsi14      : null,
        avgVol10d:  avgVol10d  !== null ? avgVol10d  : null,
        relVol:     relVol     !== null ? relVol     : null,
        beta:       beta1y     !== null ? beta1y     : null,
        adx:        adx        !== null ? adx        : null,
        adxDiDiff:  (adxPlusDi !== null && adxMinusDi !== null) ? (adxPlusDi - adxMinusDi) : null,
        pctAboveSma200: (sma200 && close && sma200 > 0) ? ((close - sma200) / sma200 * 100) : null,
        smaTrend:   (sma50 !== null && sma200 && sma200 > 0) ? ((sma50 - sma200) / sma200 * 100) : null,
        macd:       macdV !== null ? macdV : null,
        macdHist:   (macdV !== null && macdSig !== null) ? (macdV - macdSig) : null,
        bbDist:     (bbLower && close && bbLower > 0) ? ((close - bbLower) / bbLower * 100) : null,
        stochK:     stochK !== null ? stochK : null,
        stochKD:    (stochK !== null && stochD !== null) ? (stochK - stochD) : null,
        peg: (function() {
          if (pe && epsG && epsG > 0) return pe / epsG;
          return null;
        })(),
      });
    }

    if(results.length === 0) throw new Error('Hiç hisse verisi işlenemedi');

    // Duplicate temizleme — aynı sembolden en yüksek piyasa değerini tut
    const seen = new Map();
    results.forEach(function(s) {
      var key = s.symbol;
      if (!seen.has(key)) { seen.set(key, s); return; }
      var existing = seen.get(key);
      var newMcap = s.marketCapitalization || 0;
      var exMcap  = existing.marketCapitalization || 0;
      if (newMcap > exMcap) seen.set(key, s);
    });
    const dedupedResults = Array.from(seen.values());

    // Minimum veri: close yoksa tabloda tüm sütunlar boş görünür — filtrele
    // Geçersiz hisseleri filtrele: fiyat yoksa veya finansal veri YOK ise çıkar
    // GİP / yeni hisseler: close var, High/Low var ama PE+ROE+margin+sektör hepsi null
    allData = dedupedResults.filter(s => {
      // Sadece fiyatı olan hisseler — finansal veri yoksa sütunlar tire gösterir
      return s.currentPrice && s.currentPrice > 0;
    });
    if (typeof buildIqrCache === 'function') buildIqrCache(allData);
    const _exm = EXCHANGE_META[currentExchange]||EXCHANGE_META.bist;

    updateExchangeBadge();
    _pendingScanResult = window._chipSpecial || null;
    window._chipSpecial = null;

  } catch(err) {
    hideQuickScanPill();
    showState('errstate');
    console.error('[scan]', err.message);
    var _em = document.getElementById('errmsg');
    _em.textContent = 'Veri alınamadı — bağlantıyı kontrol edip tekrar deneyin.';
    // Teşhis detayı (küçük, soluk satır) — destek bildirimleri için
    var _ed = document.getElementById('errdetail');
    if (!_ed) {
      _ed = document.createElement('p');
      _ed.id = 'errdetail';
      _ed.style.cssText = 'color:var(--muted2);font-size:10px;margin-top:6px;max-width:420px;word-break:break-word;';
      _em.parentNode.appendChild(_ed);
    }
    _ed.textContent = String(err.message || '').slice(0, 180);
  } finally {
    var _isSuccess   = (_pendingScanResult !== undefined);
    var _spec        = _pendingScanResult;
    _pendingScanResult = undefined;
    _psvScanFilterCount = 0;
    _scanRunning = false;
    btn.disabled = false;
    document.getElementById('stopbtn').style.display = 'none';
    // Tarama sürerken düşen bir istek olduysa, en güncel filtrelerle tekrar tara.
    if (_scanQueued) {
      _scanQueued = false;
      stopScanEta();
      hideQuickScanPill();
      setTimeout(runScan, 0);
      return;
    }
    var _remaining = _isSuccess ? Math.max(0, _scanMinMs - (Date.now() - scanStartTime)) : 0;
    if (_remaining > 0) {
      setTimeout(function() {
        stopScanEta();
        hideQuickScanPill();
        applyAndRender(_spec);
      }, _remaining);
    } else {
      stopScanEta();
      hideQuickScanPill();
      if (_isSuccess) applyAndRender(_spec);
    }
  }
}

// ═══════════════════════════════════════════
// PRESETS — Temel Analiz Hazır Filtreler
// ═══════════════════════════════════════════
// PRESETS, TECH_PRESETS, GURUS tasindi -> public/strategies.js (Faz 0: tek kaynak)

function tblScroll(px){
  var w = document.getElementById('twrap');
  if(w) w.scrollBy({left:px, behavior:'smooth'});
}

// ── GOAT CHIP MINI-CARD UPGRADE ──
function upgradeGoatChips() {
  document.querySelectorAll('.goat-chip').forEach(function(chip) {
    if (chip.classList.contains('goat-card-chip')) return;
    var key = chip.dataset.goat;
    var guru = GURUS[key];
    if (!guru) return;
    var name = chip.textContent.trim();
    var filters = guru.filters || {};
    var tags = [];
    for (var i = 0; i < _PSV_FMTS.length && tags.length < 3; i++) {
      var fkey = _PSV_FMTS[i][0];
      var fn   = _PSV_FMTS[i][1];
      if (filters[fkey] !== undefined) tags.push(fn(filters[fkey]));
    }
    chip.classList.add('goat-card-chip');
    chip.innerHTML = '<span class="gcchip-name">' + name + '</span>' +
      (tags.length ? '<span class="gcchip-tags">' + tags.map(function(t){ return '<span class="gcchip-tag">'+t+'</span>'; }).join('') + '</span>' : '');
  });
}

// ── PRESCAN FULL-SCREEN VIEW ──

var _psvActiveGoats   = new Set();
var _psvActivePresets = new Set();
var _psvActiveTech    = new Set();

var PSV_MAIN_PRESETS = ['value','growth','dividend','quality'];
var PSV_MAIN_TECH    = ['breakout','oversold','nearHigh','pullback','highVolume'];

var PSV_MAIN_EX    = ['bist','nasdaq','nyse','sp500','dax','lse'];
var PSV_MAIN_GOATS = ['buffett','graham','lynch','fisher','munger'];

var PSV_GURU_GROUPS = [
  { id:'deger',    label:'Değer',            vitrin:['graham','schloss','klarman'],     extra:['dreman','carlisle','graham_ncav'] },
  { id:'kalite',   label:'Kalite',           vitrin:['buffett','munger','tsmith'],      extra:['greenblatt','piotroski'] },
  { id:'buyume',   label:'Büyüme / GARP',    vitrin:['lynch','oneil','minervini'],      extra:['ark','oshaughnessy','fisher'] },
  { id:'aktivist', label:'Aktivist',         vitrin:['ackman','icahn','einhorn'],       extra:[] },
  { id:'momentum', label:'Momentum / Makro', vitrin:['soros','zweig','neff'],           extra:['templeton','kfisher'] }
];

var PSV_TECH_GROUPS = [
  { id:'t-trend',    label:'Trend',      vitrin:['breakout','nearHigh','goldenCross'],    extra:['pullback','trendFollow','adxTrend','volumeTrend','growthBreakout'] },
  { id:'t-momt',     label:'Momentum',   vitrin:['highVolume','strongDay','ytdLeader'],   extra:['multiMomentum','adxMomentum'] },
  { id:'t-osilator', label:'Osilatör',   vitrin:['oversold','rsiBounce','macdReversal'],  extra:['bbBounce','stochReversal','deathCrossBounce'] },
  { id:'t-onay',     label:'Onay / Mix', vitrin:['techBuy','maConfirm','oscAlignment'],   extra:['oscConfirm','lowBeta'] }
];

var _PSV_FMTS = [
  ['pe_max',          function(v){ return 'F/K<'+v; }],
  ['pb_max',          function(v){ return 'F/DD<'+v; }],
  ['ps_max',          function(v){ return 'F/S<'+v; }],
  ['pe_min',          function(v){ return 'F/K>'+v; }],
  ['roe_min',         function(v){ return 'ROE>'+v+'%'; }],
  ['gross_min',       function(v){ return 'Brüt>'+v+'%'; }],
  ['margin_min',      function(v){ return 'Marj>'+v+'%'; }],
  ['earng_min',       function(v){ return 'K↑'+v+'%'; }],
  ['revg_min',        function(v){ return 'Gel↑'+v+'%'; }],
  ['de_max',          function(v){ return 'Borç<'+v; }],
  ['cr_min',          function(v){ return 'Cari>'+v; }],
  ['div_min',         function(v){ return 'Temettü>'+v+'%'; }],
  ['mc_max',          function(v){ return v>=1000 ? 'PD<$'+(v/1000)+'B' : 'PD<$'+v+'M'; }],
  ['mc_min',          function(v){ return v>=1000 ? 'PD>$'+(v/1000)+'B' : 'PD>$'+v+'M'; }],
  ['tech_rating_min', function(){  return 'Teknik'; }],
  ['perf3m_min',      function(v){ return '3A>'+v+'%'; }],
  ['perf6m_min',      function(v){ return '6A>'+v+'%'; }],
  ['chg_min',         function(v){ return 'Günlük>'+v+'%'; }],
  ['vol_min',         function(v){ return 'Hacim>'+v+'M'; }],
  ['rel_vol_min',     function(v){ return 'Hacim '+v+'×'; }],
  ['rsi_max',         function(v){ return 'RSI<'+v; }],
  ['rsi_min',         function(v){ return 'RSI>'+v; }],
  ['from_high_min',   function(v){ return 'Zirveye '+Math.abs(v)+'%'; }],
  ['from_high_max',   function(v){ return 'Zirveden ↓'+Math.abs(v)+'%'; }],
  ['from_low_min',    function(v){ return 'Dip>'+v+'%'; }],
  ['perf1m_min',      function(v){ return '1A>'+v+'%'; }],
  ['adx_min',         function(v){ return 'ADX>'+v; }],
  ['beta_max',        function(v){ return 'Beta<'+v; }],
  ['ma_rating_min',   function(){  return 'MA Onayı'; }],
  ['osc_rating_min',  function(){  return 'Osilatör'; }],
  ['above_sma200_min',function(){  return '>SMA200'; }],
  ['sma_trend_min',   function(){  return '50>200'; }],
  ['macd_hist_min',   function(){  return 'MACD↑'; }],
  ['bb_dist_max',     function(){  return 'BB Alt Bant'; }],
  ['stoch_k_max',     function(v){ return '%K<'+v; }],
  ['stoch_kd_min',    function(){  return '%K>%D'; }],
];

function _psvGetTags(filters, max) {
  var tags = [];
  for (var i = 0; i < _PSV_FMTS.length && tags.length < max; i++) {
    var k = _PSV_FMTS[i][0];
    if (filters[k] !== undefined) tags.push(_PSV_FMTS[i][1](filters[k]));
  }
  return tags;
}

function _isoFromFlag(emoji) {
  try {
    var cps = [];
    for (var i = 0; i < emoji.length; ) {
      var cp = emoji.codePointAt(i); cps.push(cp); i += cp > 0xFFFF ? 2 : 1;
    }
    if (cps.length === 2 && cps[0] >= 0x1F1E6 && cps[0] <= 0x1F1FF) {
      return String.fromCharCode(cps[0]-0x1F1A5).toLowerCase() + String.fromCharCode(cps[1]-0x1F1A5).toLowerCase();
    }
  } catch(e) {}
  return '';
}

// Prescan evren satırı: kısa ülke/borsa rozeti (ISO kodu özel durumlar için ezilir)
const EXCHANGE_BADGE = { sp500:'S&P', nasdaq:'US', nyse:'US', china:'CN', uae:'AE' };
// Prescan evren satırı: yaklaşık enstrüman sayısı (evren büyüklüğü göstergesi)
const EXCHANGE_COUNT = {
  bist:'568', nasdaq:'3K+', nyse:'2K+', sp500:'500', dax:'40', lse:'350',
  nikkei:'225', krx:'2.5K', moex:'200', france:'120', amsterdam:'130',
  brussels:'130', lisbon:'40', dublin:'30', oslo:'200', milan:'220',
  tsx:'1.5K', twse:'900', b3:'400', hkex:'2.5K', china:'5K+', saudi:'230',
  switzerland:'250', australia:'2K', southafrica:'300', sweden:'380',
  india:'2K+', uae:'70'
};

function initPrescanView() {
  var el = document.getElementById('prescan-view');
  if (!el) return;

  function mkExBtn(key) {
    var m = EXCHANGE_META[key]; if (!m) return '';
    var iso = _isoFromFlag(m.flag);
    var badge = EXCHANGE_BADGE[key] || (iso ? iso.toUpperCase() : m.name.slice(0,3).toUpperCase());
    var desc = EXCHANGE_TIPS[key] || EXCHANGE_COUNTRY[key] || '';
    var count = EXCHANGE_COUNT[key] || '';
    var search = (m.name + ' ' + desc + ' ' + badge + ' ' + (EXCHANGE_COUNTRY[key]||'')).toLowerCase();
    return '<button class="setup-market" data-exchange="'+key+'" data-search="'+esc(search)+'" onclick="psvSetExchange(\''+key+'\')">' +
      '<span class="country-badge">'+esc(badge)+'</span>' +
      '<div><strong>'+esc(m.name)+'</strong><span>'+esc(desc)+'</span></div>' +
      (count ? '<em>'+esc(count)+'</em>' : '') +
      '</button>';
  }

  function mkGoatCard(key) {
    var g = GURUS[key]; if (!g) return '';
    var parts = g.label.split(' — ');
    var name = parts[0].split(' (')[0];
    var sub  = parts[1] ? '<div class="psv-goat-sub">'+parts[1]+'</div>' : '';
    var tags = _psvGetTags(g.filters||{}, 3);
    var tagsHtml = tags.length ? '<div class="psv-goat-tags">'+tags.map(function(t){return '<span class="psv-goat-tag">'+t+'</span>';}).join('')+'</div>' : '';
    var descHtml = g.desc ? '<div class="psv-goat-desc">'+esc(g.desc)+'</div>' : '';
    return '<div class="psv-goat-card" data-goat="'+key+'" onclick="psvToggleGoat(\''+key+'\')">' +
      '<div class="psv-goat-name">'+name+' Lensi</div>'+sub+tagsHtml+descHtml+'</div>';
  }

  function mkFilterCard(key, p, cls, toggleFn) {
    if (!p) return '';
    var tags = _psvGetTags(p.filters||{}, 3);
    var tagsHtml = tags.length ? '<div class="psv-preset-tags-row">'+tags.map(function(t){return '<span class="psv-preset-tag-sm">'+esc(t)+'</span>';}).join('')+'</div>' : '';
    return '<div class="'+cls+'" data-key="'+key+'" onclick="'+toggleFn+'(\''+key+'\')">' +
      '<div class="psv-preset-name">'+esc(p.label)+'</div>'+tagsHtml+
      '<div class="psv-preset-desc">'+esc(p.desc)+'</div></div>';
  }

  var allExKeys       = Object.keys(EXCHANGE_META).filter(function(k){ return PSV_MAIN_EX.indexOf(k)===-1; });
  var extraPresetKeys = Object.keys(PRESETS).filter(function(k){ return PSV_MAIN_PRESETS.indexOf(k)===-1; });

  function mkGoatGroup(grp) {
    var vitrinHtml = grp.vitrin.map(mkGoatCard).join('');
    var extraHtml  = grp.extra.length
      ? '<div class="psv-goat-grid psv-lg-extra" id="psv-lge-'+grp.id+'" style="display:none">'+grp.extra.map(mkGoatCard).join('')+'</div>'
      : '';
    var moreBtn = grp.extra.length
      ? '<button class="psv-lg-more" data-gid="'+grp.id+'" data-count="'+grp.extra.length+'" onclick="psvToggleLgMore(this)">+ '+grp.extra.length+' daha</button>'
      : '';
    return '<div class="psv-lens-group" id="psv-lg-'+grp.id+'">' +
      '<div class="psv-lg-hd"><span class="psv-lg-name">'+esc(grp.label)+'</span><span class="psv-lg-count">'+(grp.vitrin.length+grp.extra.length)+'</span></div>' +
      '<div class="psv-goat-grid psv-lg-vitrin">'+vitrinHtml+'</div>' +
      extraHtml + moreBtn +
      '</div>';
  }

  function mkTechGroup(grp) {
    var vitrinHtml = grp.vitrin.map(function(k){ return mkFilterCard(k, TECH_PRESETS[k], 'psv-tech-card', 'psvToggleTech'); }).join('');
    var extraHtml  = grp.extra.length
      ? '<div class="psv-chip-grid psv-lg-extra" id="psv-lge-'+grp.id+'" style="display:none">'+grp.extra.map(function(k){ return mkFilterCard(k, TECH_PRESETS[k], 'psv-tech-card', 'psvToggleTech'); }).join('')+'</div>'
      : '';
    var moreBtn = grp.extra.length
      ? '<button class="psv-lg-more" data-gid="'+grp.id+'" data-count="'+grp.extra.length+'" onclick="psvToggleLgMore(this)">+ '+grp.extra.length+' daha</button>'
      : '';
    return '<div class="psv-lens-group" id="psv-lg-'+grp.id+'">' +
      '<div class="psv-lg-hd"><span class="psv-lg-name">'+esc(grp.label)+'</span><span class="psv-lg-count">'+(grp.vitrin.length+grp.extra.length)+'</span></div>' +
      '<div class="psv-chip-grid psv-lg-vitrin">'+vitrinHtml+'</div>' +
      extraHtml + moreBtn +
      '</div>';
  }

  // Reset wizard state each open
  _psvStep = 1;
  _psvCurAsset = 'hisse';

  el.innerHTML =
    '<div class="setup-shell">'+
    // ── Left Rail ──
    '<nav class="setup-rail">'+
      '<div class="setup-eyebrow">Tarama Kurulumu</div>'+
      '<h2>3 adımda stratejine uygun evreni kur.</h2>'+
      '<p>Varlık türü, evren ve filtre aileleri birbirinden ayrılır. Seçim tamamlanınca yalnızca bu bağlama uyan adaylar listelenir.</p>'+
      '<div class="setup-progress">'+
        '<button class="setup-step-nav on" data-step="1" onclick="psvGoStep(1)"><b>1</b><span><small>Varlık Türü</small><em>Hisse, kripto evreni</em></span></button>'+
        '<button class="setup-step-nav" data-step="2" onclick="psvGoStep(2)"><b>2</b><span><small>Ülke / Borsa / Evren</small><em>Piyasa kapsamı</em></span></button>'+
        '<button class="setup-step-nav" data-step="3" onclick="psvGoStep(3)"><b>3</b><span><small>Filtreler</small><em>Strateji ve kriterler</em></span></button>'+
      '</div>'+
      '<div class="setup-summary"><span>Aktif Seçim</span><strong id="psv-summary">Hisse · BIST</strong></div>'+
      // Legacy rail for backward-compat JS
      '<div class="psv-wizard-rail" style="display:none">'+
        '<div class="psv-rail-step active" data-step="1"><div class="psv-rs-dot">01</div><div class="psv-rs-label">Varlık</div></div>'+
        '<div class="psv-rail-line"></div>'+
        '<div class="psv-rail-step" data-step="2"><div class="psv-rs-dot">02</div><div class="psv-rs-label">Borsa</div></div>'+
        '<div class="psv-rail-line"></div>'+
        '<div class="psv-rail-step" data-step="3"><div class="psv-rs-dot">03</div><div class="psv-rs-label">Strateji</div></div>'+
      '</div>'+
    '</nav>'+

    // ── Main Builder ──
    '<div class="setup-builder">'+

    // Panel 1: Varlık
    '<div id="psv-panel-1" class="setup-panel">'+
    '<div class="setup-panel-head"><span>Kapsam</span><div><h3>Varlık türünü seç</h3><p>İlk karar, devamındaki ülke/borsa veya kripto evreni seçeneklerini belirler.</p></div></div>'+
    '<div class="setup-asset-grid">'+
      '<button class="psv-asset-btn setup-asset-card on" data-asset="hisse" onclick="psvSetAsset(\'hisse\')">'+
        '<strong>Hisse Senedi</strong><span>Ülke ve borsa bazlı şirket evreni</span><small>Aktif</small>'+
      '</button>'+
      '<button class="psv-asset-btn setup-asset-card" data-asset="kripto" onclick="psvSetAsset(\'kripto\')">'+
        '<strong>Kripto</strong><span>Coin, token ve kategori evreni</span><small>Aktif</small>'+
      '</button>'+
      '<div class="setup-asset-card roadmap"><strong>Yol haritası</strong><span>Fon, ETF ve emtia evrenleri sonraki fazda.</span><small>Yakında</small></div>'+
    '</div>'+
    '<div class="setup-insight" id="psv-insight-1"></div>'+
    '</div>'+

    // Panel 2: Borsa
    '<div id="psv-panel-2" class="setup-panel" style="display:none">'+
    '<div class="setup-panel-head"><span>Evren</span><div><h3>Ülke / borsa seç</h3><p>Hisse senedi evreninde sonuçlar yalnızca seçilen piyasa içinden gelir.</p></div></div>'+
    '<input class="setup-search" id="psv-ex-search" type="text" placeholder="Ülke, borsa veya evren ara…" oninput="psvExSearch(this.value)">'+
    '<div class="setup-market-list" id="psv-ex-grid">'+PSV_MAIN_EX.concat(allExKeys).map(mkExBtn).join('')+'</div>'+
    '<div class="setup-insight" id="psv-insight-2"></div>'+
    '</div>'+

    // Panel 3: Strateji
    '<div id="psv-panel-3" class="setup-panel" style="display:none">'+
    '<div class="setup-panel-head"><span>Kriter</span><div><h3>Filtreleri ekle</h3><p>Yatırımcı lensleri, temel kriterler ve teknik sinyaller ayrı çalışır; sonuçta yalnızca eşleşme gerekçesi üretir.</p></div></div>'+
    '<div class="setup-filter-layout">'+
    '<div class="setup-filter-col">'+

    // 01 Yatırımcı Lensleri
    '<div class="setup-filter-title" id="psv-sec-goat-hd">01 Yatırımcı Lensleri <span class="psv-opt">isteğe bağlı</span>'+
    '<input class="psv-lens-search" id="psv-lens-search" type="text" placeholder="Lens ara…" oninput="psvGoatSearch(this.value)"></div>'+
    '<div class="psv-section psv-family psv-family-gold" id="psv-sec-goat">'+
    '<div id="psv-goat-groups">'+PSV_GURU_GROUPS.map(mkGoatGroup).join('')+'</div>'+
    '</div>'+

    // 02 Temel
    '<div class="setup-filter-title" id="psv-sec-temel-hd">02 Temel <span class="psv-opt">isteğe bağlı</span></div>'+
    '<div class="psv-section psv-family psv-family-purple" id="psv-sec-temel">'+
    '<div class="psv-chip-grid" id="psv-preset-main">'+PSV_MAIN_PRESETS.map(function(k){ return mkFilterCard(k, PRESETS[k], 'psv-preset-card', 'psvTogglePreset'); }).join('')+'</div>'+
    '<div class="psv-chip-extra" id="psv-preset-extra" style="display:none">'+extraPresetKeys.map(function(k){ return mkFilterCard(k, PRESETS[k], 'psv-preset-card', 'psvTogglePreset'); }).join('')+'</div>'+
    (extraPresetKeys.length ? '<button class="psv-show-more" id="psv-preset-more" onclick="psvToggleMorePresets()">+ Daha Fazla ('+extraPresetKeys.length+')</button>' : '')+
    '</div>'+

    // 03 Teknik
    '<div class="setup-filter-title" id="psv-sec-teknik-hd">03 Teknik <span class="psv-opt">isteğe bağlı</span></div>'+
    '<div class="psv-section psv-family psv-family-teal" id="psv-sec-teknik">'+
    '<div id="psv-tech-groups">'+PSV_TECH_GROUPS.map(mkTechGroup).join('')+'</div>'+
    '</div>'+

    // Kripto Kategori (hidden)
    '<div class="psv-section" id="psv-sec-kripto-cat" style="display:none">'+
    '<div class="setup-filter-title">Kategori</div>'+
    '<div class="psv-chip-grid">'+
    [
      {cat:'',label:'Tümü'},{cat:'layer-1',label:'Layer 1'},{cat:'layer-2',label:'Layer 2'},
      {cat:'decentralized-finance-defi',label:'DeFi'},{cat:'meme-token',label:'Meme'},
      {cat:'artificial-intelligence',label:'AI'},{cat:'gaming',label:'Gaming'},
      {cat:'real-world-assets-rwa',label:'RWA'},{cat:'liquid-staking-tokens',label:'Liquid Stake'},
      {cat:'decentralized-exchange',label:'DEX'},{cat:'yield-aggregator',label:'Yield'}
    ].map(function(c){
      return '<button class="psv-kcat-btn'+(c.cat===''?' on':'')+'" data-cat="'+esc(c.cat)+'" onclick="psvKriptoCat(this)">'+esc(c.label)+'</button>';
    }).join('')+
    '</div></div>'+

    // Kripto Strateji (hidden)
    '<div class="psv-section" id="psv-sec-kripto-strat" style="display:none">'+
    '<div class="setup-filter-title">Strateji <span class="psv-opt">isteğe bağlı</span></div>'+
    '<div class="psv-chip-grid">'+
    [
      {preset:'hacim_patlamasi',label:'Hacim Patlaması',desc:'Hacim artışı + günlük yükseliş'},
      {preset:'rsi_dip',label:'RSI Dip',desc:'RSI < 35, aşırı satım bölgesi'},
      {preset:'ath_yakini',label:'ATH Yakını',desc:"ATH'dan %10 uzakta"},
      {preset:'buyuk_kap',label:'Büyük Kapı',desc:'Piyasa değeri $10B+'},
      {preset:'kucuk_cap_gem',label:'Küçük Kapı Gem',desc:'$100M altı, hacimli'},
      {preset:'momentum',label:'Momentum',desc:'7g +%10, 30g +%20'},
      {preset:'dusuk_arz',label:'Düşük Arz',desc:'Dolaşım/toplam arz < %50'},
      {preset:'defi_deger',label:'DeFi Değer',desc:'MC/TVL < 3, TVL $100M+'},
      {preset:'yeni_ath',label:'ATH Kırıcı',desc:"7g +%20, ATH'a %5 kaldı"}
    ].map(function(p){
      return '<div class="psv-preset-card" data-preset="'+esc(p.preset)+'" onclick="psvKriptoPreset(this)">'+
        '<div class="psv-preset-name">'+esc(p.label)+'</div>'+
        '<div class="psv-preset-desc">'+esc(p.desc)+'</div></div>';
    }).join('')+
    '</div></div>'+

    '<div class="psv-criteria-preview" id="psv-criteria-preview" style="display:none"></div>'+
    '<div class="setup-insight" id="psv-insight-3"></div>'+
    '<div class="psv-limit-hint" id="psv-limit-hint">En fazla 4 filtre seçilebilir — yenisini eklemek için mevcut bir seçimi kaldır.</div>'+
    '</div>'+ // setup-filter-col
    '</div>'+ // setup-filter-layout
    '</div>'+ // psv-panel-3

    '</div>'+ // setup-builder

    // ── Bottom Nav ──
    '<div class="setup-bottom">'+
      '<button class="setup-bottom-reset" onclick="openPrescanView()">Varsayılana Dön</button>'+
      '<button class="setup-bottom-back" id="psv-back-btn" onclick="psvPrevStep()" style="display:none">← Geri</button>'+
      '<button class="setup-bottom-next" id="psv-next-btn" onclick="psvNextStep()">Devam Et →</button>'+
      '<button class="psv-scan-btn setup-bottom-scan" id="psv-scan-btn" onclick="psvScan()" style="display:none">Hisse Tara</button>'+
    '</div>'+

    '</div>'; // setup-shell

  psvSetExchange(currentExchange);
  psvGoStep(1);
}

function psvSetExchange(key) {
  currentExchange = key;
  document.querySelectorAll('.exbtn').forEach(function(b){ b.classList.toggle('on', b.dataset.exchange === key); });
  document.querySelectorAll('.psv-ex-btn').forEach(function(b){ b.classList.toggle('on', b.dataset.exchange === key); });
  document.querySelectorAll('.setup-market').forEach(function(b){ b.classList.toggle('on', b.dataset.exchange === key); });
  var meta = EXCHANGE_META[key];
  if (meta) {
    var tlTab = document.querySelector('.ctab-cur[data-currency="TL"]');
    var usdTab = document.querySelector('.ctab-cur[data-currency="USD"]');
    if (meta.currencyCode !== 'TRY') {
      if (tlTab) tlTab.style.display = 'none';
      if (usdTab) { usdTab.classList.add('on'); if (tlTab) tlTab.classList.remove('on'); }
    } else {
      if (tlTab) tlTab.style.display = '';
    }
  }
  _psvUpdateInsight(2);
  _psvUpdateSummary();
}

// Varlık sınıfları — prescan yatay kaydırmalı satır
const PSV_ASSETS = [
  { key: 'hisse',    label: 'Borsa',       icon: '📈', active: true },
  { key: 'kripto',   label: 'Kripto',      icon: '₿',  active: true },
  { key: 'fon',      label: 'Fon',         icon: '💼' },
  { key: 'etf',      label: 'ETF',         icon: '📦' },
  { key: 'eurobond', label: 'Eurobond',    icon: '💵' },
  { key: 'bono',     label: 'Bono/Tahvil', icon: '🏛️' },
  { key: 'viop',     label: 'Viop',        icon: '📉' },
  { key: 'varant',   label: 'Varant',      icon: '🎫' },
  { key: 'opsiyon',  label: 'Opsiyon',     icon: '🎯' },
];

function psvSetAsset(key) {
  _psvCurAsset = key;
  document.querySelectorAll('.psv-asset-btn').forEach(function(b){ b.classList.toggle('on', b.dataset.asset === key); });
  document.querySelectorAll('.setup-asset-card').forEach(function(b){ b.classList.toggle('on', b.dataset.asset === key); });
  var isKripto = key === 'kripto';
  // Panel 3: toggle hisse vs kripto sections
  ['psv-sec-goat','psv-sec-temel','psv-sec-teknik'].forEach(function(id){
    var s = document.getElementById(id); if (s) s.style.display = isKripto ? 'none' : '';
  });
  ['psv-sec-kripto-cat','psv-sec-kripto-strat'].forEach(function(id){
    var s = document.getElementById(id); if (s) s.style.display = isKripto ? '' : 'none';
  });
  var hint = document.getElementById('psv-limit-hint');
  if (hint) hint.style.display = isKripto ? 'none' : '';
  var btn = document.getElementById('psv-scan-btn');
  if (btn) {
    if (isKripto) {
      btn.onclick = psvScanKripto;
      _psvUpdateKriptoBtn();
    } else {
      btn.onclick = psvScan;
      _psvUpdateSelState();
    }
  }
  // Update step-2 nav label (Borsa vs Strateji) — kripto borsa adımını atlar
  var step2Nav = document.querySelector('.setup-step-nav[data-step="2"]');
  if (step2Nav) step2Nav.style.display = isKripto ? 'none' : '';
  _psvUpdateInsight(1);
  _psvUpdateSummary();
}

function _psvUpdateKriptoBtn() {
  var catBtn = document.querySelector('#psv-sec-kripto-cat .psv-kcat-btn.on');
  var presetEl = document.querySelector('#psv-sec-kripto-strat .psv-preset-card.on');
  var count = 0;
  if (catBtn && catBtn.dataset.cat !== '') count++;
  if (presetEl) count++;
  var btn = document.getElementById('psv-scan-btn');
  if (btn) btn.textContent = count > 0 ? count + ' Filtre ile Kripto Tara' : 'Kripto Tara';
}

function psvKriptoCat(el) {
  document.querySelectorAll('#psv-sec-kripto-cat .psv-kcat-btn').forEach(function(b){ b.classList.remove('on'); });
  el.classList.add('on');
  _psvUpdateKriptoBtn();
}

function psvKriptoPreset(el) {
  var was = el.classList.contains('on');
  document.querySelectorAll('#psv-sec-kripto-strat .psv-preset-card').forEach(function(c){ c.classList.remove('on'); });
  if (!was) el.classList.add('on');
  _psvUpdateKriptoBtn();
}

function psvScanKripto() {
  var catBtn = document.querySelector('#psv-sec-kripto-cat .psv-kcat-btn.on');
  var cat = catBtn ? catBtn.dataset.cat : '';
  var presetCard = document.querySelector('#psv-sec-kripto-strat .psv-preset-card.on');
  var preset = presetCard ? presetCard.dataset.preset : null;
  var pv = document.getElementById('prescan-view');
  if (pv) { pv.style.transition = ''; pv.classList.add('psv-closing'); }
  collapseSidebar(true);
  setTimeout(function() {
    if (pv) {
      pv.style.display = 'none';
      pv.classList.remove('psv-closing');
      pv.style.opacity = '';
      pv.style.transition = '';
    }
    // Sidebar kategori chip'ini seç
    document.querySelectorAll('#sbp-kripto .chip[data-cat]').forEach(function(c){
      c.classList.toggle('on', c.dataset.cat === cat);
    });
    // Opsiyonel preset chip'ini seç (tek seçim)
    if (preset) {
      document.querySelectorAll('#sbp-kripto .chip[data-preset]').forEach(function(c){
        c.classList.toggle('on', c.dataset.preset === preset);
      });
    }
    selectAsset('kripto');
  }, 280);
}

function psvScrollAssets(dir) {
  var row = document.getElementById('psv-asset-row');
  if (row) row.scrollBy({ left: dir * 220, behavior: 'smooth' });
}

var _PSV_MAX_SEL = 4;

function _psvTotalSel() {
  return _psvActiveGoats.size + _psvActivePresets.size + _psvActiveTech.size;
}

function _psvUpdateSelState() {
  var total = _psvTotalSel();
  var atLimit = total >= _PSV_MAX_SEL;
  var pv = document.getElementById('prescan-view');
  if (pv) pv.classList.toggle('psv-at-limit', atLimit);
  var btn = document.getElementById('psv-scan-btn');
  if (btn) btn.textContent = total > 0 ? total + ' Filtre ile Tara' : (_psvCurAsset === 'kripto' ? 'Kripto Tara' : 'Hisse Tara');
  _psvUpdateInsight(3);
  _psvUpdateSummary();
  _psvUpdateCriteriaPreview();
}

function _psvUpdateCriteriaPreview() {
  var box = document.getElementById('psv-criteria-preview');
  if (!box) return;
  var items = [];
  var renderItem = function(name, filters, desc) {
    var tags = _psvGetTags(filters || {}, 8);
    var tagsStr = tags.length ? tags.join(' · ') : (desc || '');
    if (!tagsStr) return;
    items.push('<div class="pcb-item"><span class="pcb-name">' + esc(name) + '</span><span class="pcb-sep">→</span><span class="pcb-tags">' + esc(tagsStr) + '</span></div>');
  };
  if (typeof _psvActiveGoats !== 'undefined') {
    _psvActiveGoats.forEach(function(key) {
      var g = (typeof GURUS !== 'undefined') ? GURUS[key] : null;
      if (!g) return;
      renderItem(g.label.split(' — ')[0].split(' (')[0], g.filters);
    });
  }
  if (typeof _psvActivePresets !== 'undefined') {
    _psvActivePresets.forEach(function(key) {
      var p = (typeof PRESETS !== 'undefined') ? PRESETS[key] : null;
      if (p) renderItem(p.label, p.filters, p.desc);
    });
  }
  if (typeof _psvActiveTech !== 'undefined') {
    _psvActiveTech.forEach(function(key) {
      var t = (typeof TECH_PRESETS !== 'undefined') ? TECH_PRESETS[key] : null;
      if (t) renderItem(t.label, t.filters, t.desc);
    });
  }
  if (!items.length) { box.style.display = 'none'; return; }
  box.style.display = '';
  box.innerHTML = '<div class="pcb-title">Aktif Filtre Kriterleri</div>' + items.join('');
}

// ── Faz 6: PSV Wizard ──────────────────────────────────────────────
var _psvStep = 1;
var _psvCurAsset = 'hisse';
var _psvFeedbackTimer = null;
var _matchMode = 'kati'; // 'kati' | 'esnek'

function setMatchMode(mode) {
  _matchMode = mode;
  document.querySelectorAll('.mmt-btn').forEach(function(b) {
    b.classList.toggle('on', b.dataset.mode === mode);
  });
  if (typeof allData !== 'undefined' && allData.length) applyAndRender();
}

function psvFeedback(msg) {
  var el = document.getElementById('psv-feedback-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'psv-feedback-toast';
    el.className = 'psv-feedback-toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(_psvFeedbackTimer);
  _psvFeedbackTimer = setTimeout(function() { el.classList.remove('show'); }, 2000);
}

function _psvUpdateInsight(step) {
  var box = document.getElementById('psv-insight-' + step);
  if (!box) return;
  var label = '', title = '', body = '';
  if (step === 1) {
    label = 'Bu seçim neyi değiştirir?';
    if (_psvCurAsset === 'kripto') {
      title = 'Kripto evreni seçildi.';
      body  = 'Sonuçlar coin, token ve kategori bazlı evrenden gelir. Likidite, piyasa değeri, volatilite ve teknik sinyallerle daraltılır.';
    } else {
      title = 'Hisse senedi evreni seçildi.';
      body  = 'Sonuçlar ülke/borsa bazlı şirket evreninden gelir. Kârlılık, borçluluk, değerleme ve fiyat davranışı gibi kriterlerle daraltılır.';
    }
  } else if (step === 2) {
    var exMeta = (typeof EXCHANGE_META !== 'undefined') ? EXCHANGE_META[currentExchange] : null;
    var exName = exMeta ? exMeta.name : (currentExchange || 'BIST').toUpperCase();
    var etaSec = (typeof EXCHANGE_ETA !== 'undefined' && EXCHANGE_ETA[currentExchange]) ? EXCHANGE_ETA[currentExchange] : 5;
    label = 'Evren kapsamı';
    title = 'Yalnızca seçilen piyasa taranır.';
    body  = esc(exName) + ' evreni yaklaşık ' + etaSec + ' saniyede taranır. Farklı evren, farklı aday listesi demektir.';
  } else if (step === 3) {
    var total = _psvTotalSel();
    label = 'Filtre mantığı';
    if (total === 0) {
      title = 'Henüz filtre seçilmedi.';
      body  = 'Filtre seçmeden tüm evren listelenir. En az bir strateji ekleyerek her aday için Uyum Puanı hesaplatın.';
    } else {
      title = total + ' filtre aktif.';
      body  = 'Yatırımcı lensleri, temel kriterler ve teknik sinyaller ayrı puanlanır; sonuç listesi yalnızca eşleşme düzeyini gösterir.';
    }
  }
  box.innerHTML = '<span>' + label + '</span><strong>' + title + '</strong><p>' + body + '</p>';
}

function _psvUpdateSummary() {
  var el = document.getElementById('psv-summary');
  if (!el) return;
  var assetLabel = _psvCurAsset === 'kripto' ? 'Kripto' : 'Hisse Senedi';
  var exMeta = (typeof EXCHANGE_META !== 'undefined') ? EXCHANGE_META[currentExchange] : null;
  var exName = _psvCurAsset === 'kripto'
    ? 'Tüm Kripto'
    : (exMeta ? exMeta.name : (currentExchange || 'BIST').toUpperCase());
  var parts = [assetLabel, exName];
  var total = _psvTotalSel();
  if (total > 0) parts.push(total + ' filtre');
  el.textContent = parts.join(' · ');
}

function psvGoStep(n) {
  _psvStep = Math.max(1, Math.min(3, n));
  [1, 2, 3].forEach(function(i) {
    var panel = document.getElementById('psv-panel-' + i);
    if (panel) {
      // .setup-panel default is display:none, so active panel needs explicit flex
      panel.style.display = i === _psvStep ? 'flex' : 'none';
      panel.classList.toggle('setup-panel-on', i === _psvStep);
    }
    var railStep = document.querySelector('.psv-rail-step[data-step="' + i + '"]');
    if (railStep) {
      railStep.classList.remove('active', 'done');
      if (i < _psvStep) railStep.classList.add('done');
      else if (i === _psvStep) railStep.classList.add('active');
    }
    // New mockup: setup-step-nav on class
    var stepNav = document.querySelector('.setup-step-nav[data-step="' + i + '"]');
    if (stepNav) {
      stepNav.classList.toggle('on', i <= _psvStep);
    }
  });
  // Setup-bottom back/next/scan buttons
  var backBtn = document.getElementById('psv-back-btn');
  var nextBtn = document.getElementById('psv-next-btn');
  var scanBtn = document.getElementById('psv-scan-btn');
  if (backBtn) backBtn.style.display = _psvStep > 1 ? '' : 'none';
  if (nextBtn) nextBtn.style.display = _psvStep < 3 ? '' : 'none';
  if (scanBtn) scanBtn.style.display = _psvStep === 3 ? '' : 'none';
  _psvUpdateInsight(_psvStep);
  // Scroll to top of prescan-view
  var el = document.getElementById('prescan-view');
  if (el) el.scrollTop = 0;
}

function psvNextStep() {
  if (_psvCurAsset === 'kripto' && _psvStep === 1) { psvGoStep(3); return; }
  if (_psvStep < 3) psvGoStep(_psvStep + 1);
}

function psvPrevStep() {
  if (_psvCurAsset === 'kripto' && _psvStep === 3) { psvGoStep(1); return; }
  if (_psvStep > 1) psvGoStep(_psvStep - 1);
}

function psvToggleGoat(key) {
  if (!_psvActiveGoats.has(key) && _psvTotalSel() >= _PSV_MAX_SEL) return;
  var adding = !_psvActiveGoats.has(key);
  _psvActiveGoats.has(key) ? _psvActiveGoats.delete(key) : _psvActiveGoats.add(key);
  document.querySelectorAll('.psv-goat-card[data-goat="'+key+'"]').forEach(function(c){ c.classList.toggle('on', _psvActiveGoats.has(key)); });
  _psvUpdateSelState();
  var g = (typeof GURUS !== 'undefined') ? GURUS[key] : null;
  if (adding && g) psvFeedback('✓ ' + g.label.split(' — ')[0].split(' (')[0] + ' lensi eklendi');
}

function psvTogglePreset(key) {
  if (!_psvActivePresets.has(key) && _psvTotalSel() >= _PSV_MAX_SEL) return;
  var adding = !_psvActivePresets.has(key);
  _psvActivePresets.has(key) ? _psvActivePresets.delete(key) : _psvActivePresets.add(key);
  document.querySelectorAll('.psv-preset-card[data-key="'+key+'"]').forEach(function(c){ c.classList.toggle('on', _psvActivePresets.has(key)); });
  _psvUpdateSelState();
  var p = (typeof PRESETS !== 'undefined') ? PRESETS[key] : null;
  if (adding && p) psvFeedback('✓ ' + p.label + ' filtresi eklendi');
}

function psvToggleTech(key) {
  if (!_psvActiveTech.has(key) && _psvTotalSel() >= _PSV_MAX_SEL) return;
  var adding = !_psvActiveTech.has(key);
  _psvActiveTech.has(key) ? _psvActiveTech.delete(key) : _psvActiveTech.add(key);
  document.querySelectorAll('.psv-tech-card[data-key="'+key+'"]').forEach(function(c){ c.classList.toggle('on', _psvActiveTech.has(key)); });
  _psvUpdateSelState();
  var t = (typeof TECH_PRESETS !== 'undefined') ? TECH_PRESETS[key] : null;
  if (adding && t) psvFeedback('✓ ' + t.label + ' teknik sinyali eklendi');
}

function psvToggleLgMore(btn) {
  var gid   = btn.dataset.gid;
  var count = btn.dataset.count;
  var extra = document.getElementById('psv-lge-'+gid);
  if (!extra) return;
  var open = extra.style.display !== 'none';
  extra.style.display = open ? 'none' : '';
  btn.textContent = open ? '+ '+count+' daha' : '− Daha az';
}

function psvExSearch(val) {
  var q = (val || '').toLowerCase().trim();
  document.querySelectorAll('#psv-ex-grid .setup-market').forEach(function(b) {
    var t = b.dataset.search || '';
    b.style.display = (!q || t.indexOf(q) !== -1) ? '' : 'none';
  });
}

function psvGoatSearch(val) {
  var q = val.toLowerCase().trim();
  document.querySelectorAll('#psv-sec-goat .psv-goat-card').forEach(function(c) {
    var key = c.dataset.goat || '';
    var g = (typeof GURUS !== 'undefined' && GURUS[key]) || {};
    var text = ((g.label || '') + ' ' + (g.desc || '')).toLowerCase();
    c.style.display = (!q || text.indexOf(q) !== -1) ? '' : 'none';
  });
  document.querySelectorAll('#psv-sec-goat .psv-lens-group').forEach(function(grpEl) {
    if (q) {
      var extra = grpEl.querySelector('.psv-lg-extra');
      if (extra) extra.style.display = '';
    }
    var anyVisible = Array.from(grpEl.querySelectorAll('.psv-goat-card')).some(function(c){ return c.style.display !== 'none'; });
    grpEl.style.display = anyVisible ? '' : 'none';
  });
}

function psvToggleMoreEx() {
  var extra = document.getElementById('psv-ex-extra');
  var btn   = document.getElementById('psv-ex-more');
  if (!extra) return;
  var open = extra.style.display !== 'none';
  extra.style.display = open ? 'none' : 'flex';
  if (btn) btn.textContent = open ? '+ Diğer Borsalar' : '— Daha Az';
}

function psvToggleMorePresets() {
  var extra = document.getElementById('psv-preset-extra');
  var btn   = document.getElementById('psv-preset-more');
  if (!extra) return;
  var open = extra.style.display !== 'none';
  var extraCount = Object.keys(PRESETS).filter(function(k){ return PSV_MAIN_PRESETS.indexOf(k)===-1; }).length;
  extra.style.display = open ? 'none' : 'flex';
  if (btn) btn.textContent = open ? '+ Daha Fazla (' + extraCount + ')' : '— Daha Az';
}

// psvToggleMoreGoats / psvToggleMoreTech kaldırıldı → psvToggleLgMore (Faz 2)

function openPrescanView() {
  _psvActiveGoats   = new Set();
  _psvActivePresets = new Set();
  _psvActiveTech    = new Set();
  initPrescanView();
  var el = document.getElementById('prescan-view');
  if (!el) return;
  // New page system: navigate to scan page first
  if (document.getElementById('page-scan')) {
    showPage('page-scan');
    showState('prescan-view');
  } else {
    // Legacy fallback
    var cb = document.getElementById('psv-close-btn');
    if (cb) cb.style.display = (typeof allData !== 'undefined' && allData.length > 0) ? '' : 'none';
    el.style.transition = 'none';
    el.style.opacity = '1';
    el.style.display = 'flex';
  }
}

function closePrescanView() {
  var el = document.getElementById('prescan-view');
  if (!el) return;
  el.style.transition = '';
  el.classList.add('psv-closing');
  setTimeout(function() {
    el.style.display = 'none';
    el.classList.remove('psv-closing');
    el.style.opacity = '';
    el.style.transition = '';
    // Önceki sonuçlar varsa ekranı geri yükle
    if (typeof allData !== 'undefined' && allData.length > 0) {
      showState('twrap');
      var tb = document.getElementById('toolbar');
      if (tb) tb.style.display = 'flex';
      updateStatsBar();
    }
  }, 280);
}

function psvScan() {
  var el = document.getElementById('prescan-view');
  var delay = el ? 280 : 0;
  // Overlay solmaya başlamadan altta yükleme ekranını hazırla —
  // fade sırasında önceki taramanın bayat tablosu görünmesin
  showState('loading');
  document.getElementById('toolbar').style.display = 'none';
  document.getElementById('loadtxt').textContent = 'Taranıyor...';
  if (el) { el.style.transition = ''; el.classList.add('psv-closing'); }
  _psvScanFilterCount = _psvTotalSel();
  // Sidebar'ı overlay hâlâ ekranı kaplarken animasyonsuz kapat — görünür kayma olmaz
  collapseSidebar(true);
  setTimeout(function() {
    if (el) {
      el.style.display = 'none';
      el.classList.remove('psv-closing');
      el.style.opacity = '';
      el.style.transition = '';
    }
    // selectAsset(_resetPanel) chip'leri sıfırlıyor; sync'ten ÖNCE çağrılmalı
    if (_activeAsset !== 'hisse') selectAsset('hisse');
    document.querySelectorAll('#goat-chips .goat-chip, #adv-goat-chips .goat-chip').forEach(function(c){
      c.classList.toggle('on', _psvActiveGoats.has(c.dataset.goat));
    });
    document.querySelectorAll('#presets .chip, #adv-presets .chip').forEach(function(c){
      c.classList.toggle('on', _psvActivePresets.has(c.dataset.preset));
    });
    document.querySelectorAll('#tech-presets .chip, #adv-tech-presets .chip').forEach(function(c){
      c.classList.toggle('on', _psvActiveTech.has(c.dataset.tech));
    });
    _applyChips(BASIC_CHIP_CFG);
  }, delay);
}

// ── UNİFİED CHİP SİSTEMİ — her panel bağımsız çalışır ──

var BASIC_CHIP_CFG = {
  goatId: 'goat-chips', presetsId: 'presets', techId: 'tech-presets',
  goatInfoId: 'goat-info', presetInfoId: 'preset-info', techInfoId: 'tech-preset-info',
  profileGridId: 'profile-grid'
};
var ADV_CHIP_CFG = {
  goatId: 'adv-goat-chips', presetsId: 'adv-presets', techId: 'adv-tech-presets',
  goatInfoId: 'goat-info-adv', presetInfoId: 'preset-info-adv', techInfoId: 'tech-preset-info-adv',
  profileGridId: 'adv-profile-grid'
};

// ── Yatırımcı Profilleri (quiz tipleriyle eşleşir) ──────────
var INVESTOR_PROFILES = [
  {
    key: 'growth',
    label: 'Büyüme Avcısı',
    icon: '🚀',
    goat:   [],
    preset: ['growth', 'momentum'],
    tech:   ['breakout']
  },
  {
    key: 'div',
    label: 'Temettü Koleksiyoneri',
    icon: '💰',
    goat:   [],
    preset: ['dividend', 'lowdebt'],
    tech:   []
  },
  {
    key: 'value',
    label: 'Değer Dedektifi',
    icon: '🎯',
    goat:   ['buffett'],
    preset: ['value', 'lowdebt'],
    tech:   []
  },
  {
    key: 'mom',
    label: 'Momentum Sörfçüsü',
    icon: '⚡',
    goat:   [],
    preset: ['momentum'],
    tech:   ['momentum3m', 'breakout']
  },
  {
    key: 'def',
    label: 'Savunma Kalesi',
    icon: '🛡️',
    goat:   [],
    preset: ['quality', 'lowdebt'],
    tech:   []
  },
  {
    key: 'small',
    label: 'Küçük Değer Keşifçisi',
    icon: '🔭',
    goat:   [],
    preset: ['value', 'growth'],
    tech:   []
  },
  {
    key: 'spec',
    label: 'Spekülatif Akıncı',
    icon: '🔥',
    goat:   [],
    preset: [],
    tech:   ['breakout', 'techBuy', 'highVolume']
  },
  {
    key: 'tech',
    label: 'Teknoloji Vizyoneri',
    icon: '💻',
    goat:   [],
    preset: [],
    tech:   ['breakout', 'techBuy', 'trendFollow']
  },
  {
    key: 'bal',
    label: 'Çevik Dengeleyici',
    icon: '⚖️',
    goat:   [],
    preset: ['quality', 'dividend'],
    tech:   []
  }
];

function _clearPanelChips(cfg) {
  ['#' + cfg.goatId + ' .goat-chip', '#' + cfg.presetsId + ' .chip', '#' + cfg.techId + ' .chip'].forEach(function(sel) {
    document.querySelectorAll(sel).forEach(function(c) { c.classList.remove('on'); });
  });
  // Clear profile active state
  var pg = document.getElementById(cfg.profileGridId);
  if (pg) pg.querySelectorAll('.profile-chip').forEach(function(c) { c.classList.remove('on'); });
}

function applyProfile(profileKey, cfg) {
  var pg = document.getElementById(cfg.profileGridId);
  var btn = pg ? pg.querySelector('.profile-chip[data-profile="' + profileKey + '"]') : null;
  var isActive = btn && btn.classList.contains('on');

  _clearPanelChips(cfg);

  if (isActive) {
    // Toggle off — just clear, trigger scan with no filters
    _applyChips(cfg);
    return;
  }

  var profile = INVESTOR_PROFILES.find(function(p) { return p.key === profileKey; });
  if (!profile) return;

  profile.goat.forEach(function(g) {
    var c = document.querySelector('#' + cfg.goatId + ' .goat-chip[data-goat="' + g + '"]');
    if (c) c.classList.add('on');
  });
  profile.preset.forEach(function(p) {
    var c = document.querySelector('#' + cfg.presetsId + ' .chip[data-preset="' + p + '"]');
    if (c) c.classList.add('on');
  });
  profile.tech.forEach(function(t) {
    var c = document.querySelector('#' + cfg.techId + ' .chip[data-tech="' + t + '"]');
    if (c) c.classList.add('on');
  });

  if (btn) btn.classList.add('on');
  _applyChips(cfg);
}

function _applyChips(cfg) {
  if (_activeAsset !== 'hisse') selectAsset('hisse');
  var merged = {}, specials = [];

  function mergeOne(filters) {
    Object.keys(filters).forEach(function(k) {
      var v = filters[k];
      if (!(k in merged)) { merged[k] = v; return; }
      if (k.endsWith('_min')) merged[k] = Math.max(merged[k], v);
      if (k.endsWith('_max')) merged[k] = Math.min(merged[k], v);
    });
  }

  document.querySelectorAll('#' + cfg.goatId + ' .goat-chip.on').forEach(function(c) {
    var g = GURUS[c.dataset.goat]; if (!g) return;
    if (g.special) specials.push(g.special);
    mergeOne(g.filters);
  });
  document.querySelectorAll('#' + cfg.presetsId + ' .chip.on').forEach(function(c) {
    var p = PRESETS[c.dataset.preset]; if (p) mergeOne(p.filters);
  });
  document.querySelectorAll('#' + cfg.techId + ' .chip.on').forEach(function(c) {
    var p = TECH_PRESETS[c.dataset.tech]; if (p) mergeOne(p.filters);
  });

  document.querySelectorAll('.finps input, #hisse-hidden-filters input').forEach(function(i) { i.value = ''; });
  Object.keys(merged).forEach(function(k) {
    var el = document.getElementById(k); if (el) el.value = merged[k];
  });

  var allInfos = [];
  document.querySelectorAll('#' + cfg.goatId + ' .goat-chip.on').forEach(function(c) {
    var g = GURUS[c.dataset.goat];
    if (g) allInfos.push({ label: g.label, desc: g.desc, infoId: cfg.goatInfoId });
  });
  document.querySelectorAll('#' + cfg.presetsId + ' .chip.on').forEach(function(c) {
    var p = PRESETS[c.dataset.preset];
    if (p) allInfos.push({ label: c.textContent.trim(), desc: p.desc, infoId: cfg.presetInfoId });
  });
  document.querySelectorAll('#' + cfg.techId + ' .chip.on').forEach(function(c) {
    var p = TECH_PRESETS[c.dataset.tech];
    if (p) allInfos.push({ label: p.label, desc: p.desc, infoId: cfg.techInfoId });
  });

  [cfg.goatInfoId, cfg.presetInfoId, cfg.techInfoId].forEach(function(id) {
    var el = document.getElementById(id); if (el) { el.style.display = 'none'; el.innerHTML = ''; }
  });
  var byGroup = {};
  allInfos.forEach(function(info) {
    if (!byGroup[info.infoId]) byGroup[info.infoId] = [];
    byGroup[info.infoId].push('<strong>' + esc(info.label) + ':</strong> ' + esc(info.desc));
  });
  Object.keys(byGroup).forEach(function(id) {
    var el = document.getElementById(id);
    if (el) { el.innerHTML = byGroup[id].join('<br><br>'); el.style.display = 'block'; }
  });

  updateClrBtn();
  var special = specials.length > 0 ? specials[0] : null;
  window._chipSpecial = special;
  runScan();
}

function applyAllChips()    { _applyChips(BASIC_CHIP_CFG); }
function applyAllChipsAdv() { _applyChips(ADV_CHIP_CFG); }

// ── Quick Scan Bar ────────────────────────────────────────────
function quickScan(presetKey) {
  // Ensure we're in screener view
  var hp = document.getElementById('homepage');
  if (hp && hp.style.display !== 'none') showScreener();
  // Close prescan if open
  var pv = document.getElementById('prescan-view');
  if (pv && pv.style.display !== 'none') { pv.style.display = 'none'; }
  // Clear all chips
  document.querySelectorAll('#goat-chips .goat-chip.on, #presets .chip.on, #tech-presets .chip.on').forEach(function(c){ c.classList.remove('on'); });
  // Activate the requested chip
  var techChip = document.querySelector('#tech-presets .chip[data-tech="' + presetKey + '"]');
  var presetChip = document.querySelector('#presets .chip[data-preset="' + presetKey + '"]');
  if (techChip) { techChip.classList.add('on'); }
  else if (presetChip) { presetChip.classList.add('on'); }
  // Clear inputs and apply
  document.querySelectorAll('.finps input, #hisse-hidden-filters input').forEach(function(i){ i.value = ''; });
  var preset = TECH_PRESETS[presetKey] || PRESETS[presetKey];
  if (preset && preset.filters) {
    Object.keys(preset.filters).forEach(function(k){ var el = document.getElementById(k); if (el) el.value = preset.filters[k]; });
  }
  // Mark active quick-scan button
  document.querySelectorAll('.qs-btn').forEach(function(b){ b.classList.remove('active'); });
  var btn = document.querySelector('.qs-btn[onclick*="quickScan(\'' + presetKey + '\')"]');
  if (btn) btn.classList.add('active');
  updateClrBtn();
  runScan();
}

function quickGoat(goatKey) {
  var hp = document.getElementById('homepage');
  if (hp && hp.style.display !== 'none') showScreener();
  var pv = document.getElementById('prescan-view');
  if (pv && pv.style.display !== 'none') { pv.style.display = 'none'; }
  document.querySelectorAll('#goat-chips .goat-chip.on, #presets .chip.on, #tech-presets .chip.on').forEach(function(c){ c.classList.remove('on'); });
  var chip = document.querySelector('#goat-chips .goat-chip[data-goat="' + goatKey + '"]');
  if (chip) chip.classList.add('on');
  document.querySelectorAll('.qs-btn').forEach(function(b){ b.classList.remove('active'); });
  var btn = document.querySelector('.qs-btn[onclick*="quickGoat(\'' + goatKey + '\')"]');
  if (btn) btn.classList.add('active');
  _applyChips(BASIC_CHIP_CFG);
}

function _countChips(cfg) {
  return document.querySelectorAll(
    '#' + cfg.goatId + ' .goat-chip.on, #' + cfg.presetsId + ' .chip.on, #' + cfg.techId + ' .chip.on'
  ).length;
}
function countSelectedChips() { return _countChips(BASIC_CHIP_CFG) + _countChips(ADV_CHIP_CFG); }

// ── Basic panel chip event listeners ──
document.getElementById('goat-chips').addEventListener('click', function(e) {
  var chip = e.target.closest('.goat-chip'); if (!chip) return;
  var wasOn = chip.classList.contains('on');
  if (!wasOn && _countChips(BASIC_CHIP_CFG) >= 4) return;
  chip.classList.toggle('on');
  if (!wasOn) _track('goat', chip.dataset.goat);
  applyAllChips();
  if (window.innerWidth <= 768) setTimeout(closeMobileDrawer, 200);
});
document.getElementById('presets').addEventListener('click', function(e) {
  var chip = e.target.closest('.chip'); if (!chip || !PRESETS[chip.dataset.preset]) return;
  var wasOn = chip.classList.contains('on');
  if (!wasOn && _countChips(BASIC_CHIP_CFG) >= 4) return;
  chip.classList.toggle('on');
  if (!wasOn) _track('preset', chip.dataset.preset);
  applyAllChips();
  if (window.innerWidth <= 768) setTimeout(closeMobileDrawer, 200);
});
document.getElementById('tech-presets').addEventListener('click', function(e) {
  var chip = e.target.closest('.tech-chip'); if (!chip || !TECH_PRESETS[chip.dataset.tech]) return;
  var wasOn = chip.classList.contains('on');
  if (!wasOn && _countChips(BASIC_CHIP_CFG) >= 4) return;
  chip.classList.toggle('on');
  if (!wasOn) _track('tech', chip.dataset.tech);
  applyAllChips();
  if (window.innerWidth <= 768) setTimeout(closeMobileDrawer, 200);
});

// ── Advanced panel chip event listeners ──
(function() {
  var el = document.getElementById('adv-goat-chips'); if (!el) return;
  el.addEventListener('click', function(e) {
    var chip = e.target.closest('.goat-chip'); if (!chip) return;
    var wasOn = chip.classList.contains('on');
    if (!wasOn && _countChips(ADV_CHIP_CFG) >= 4) return;
    chip.classList.toggle('on');
    if (!wasOn) _track('goat', chip.dataset.goat);
    applyAllChipsAdv();
    if (window.innerWidth <= 768) setTimeout(closeMobileDrawer, 200);
  });
})();
(function() {
  var el = document.getElementById('adv-presets'); if (!el) return;
  el.addEventListener('click', function(e) {
    var chip = e.target.closest('.chip'); if (!chip || !PRESETS[chip.dataset.preset]) return;
    var wasOn = chip.classList.contains('on');
    if (!wasOn && _countChips(ADV_CHIP_CFG) >= 4) return;
    chip.classList.toggle('on');
    if (!wasOn) _track('preset', chip.dataset.preset);
    applyAllChipsAdv();
    if (window.innerWidth <= 768) setTimeout(closeMobileDrawer, 200);
  });
})();
(function() {
  var el = document.getElementById('adv-tech-presets'); if (!el) return;
  el.addEventListener('click', function(e) {
    var chip = e.target.closest('.tech-chip'); if (!chip || !TECH_PRESETS[chip.dataset.tech]) return;
    var wasOn = chip.classList.contains('on');
    if (!wasOn && _countChips(ADV_CHIP_CFG) >= 4) return;
    chip.classList.toggle('on');
    if (!wasOn) _track('tech', chip.dataset.tech);
    applyAllChipsAdv();
    if (window.innerWidth <= 768) setTimeout(closeMobileDrawer, 200);
  });
})();
function updateClrBtn() {
  const btn = document.getElementById('clrbtn');
  const btnAdv = document.getElementById('clrbtn-adv');
  if(!btn) return;
  const hasChip = document.querySelector('.chip.on');
  const sectorSel = (document.getElementById('sector_filter') || {}).value
                 || (document.getElementById('sector_filter_adv') || {}).value || '';
  const hasInput = sectorSel !== '' || Array.from(document.querySelectorAll('.finps input, #hisse-hidden-filters input')).some(i => i.value !== '');
  const show = (hasChip || hasInput) ? 'block' : 'none';
  btn.style.display = show;
  if (btnAdv) btnAdv.style.display = show;
}

function clearFilters(resetChips=true){
  document.querySelectorAll('.finps input, #hisse-hidden-filters input').forEach(i=>i.value='');
  const sf = document.getElementById('sector_filter'); if(sf) sf.value = '';
  const sfAdv = document.getElementById('sector_filter_adv'); if(sfAdv) sfAdv.value = '';
  if(resetChips) { document.querySelectorAll('.chip').forEach(c=>c.classList.remove('on')); ['goat-info','preset-info','tech-preset-info','goat-info-adv','preset-info-adv','tech-preset-info-adv'].forEach(id=>{const el=document.getElementById(id);if(el){el.style.display='none';el.innerHTML='';}});}
  document.querySelectorAll('.qs-btn.active').forEach(function(b){ b.classList.remove('active'); });
  updateClrBtn();
  if(allData.length) applyAndRender();
}

function liveFilter(){
  updateClrBtn();
  if(allData.length) applyAndRender();
}

// ═══════════════════════════════════════════
// FILTER + RENDER
// ═══════════════════════════════════════════
function getN(id){ const v=parseFloat(document.getElementById(id)?.value); return isNaN(v)?null:v; }

// Filter rules: [dataField, minInputId, maxInputId, multiplier]
// Input id'leri aynı zamanda preset/guru filters objelerindeki anahtarlardır;
// getiri paneli de bu tabloyu kullanır.
const FILTER_RULES = [
    ['peNormalizedAnnual',             'pe_min',     'pe_max',     1],
    ['pbAnnual',                       'pb_min',     'pb_max',     1],
    ['psTTM',                          'ps_min',     'ps_max',     1],
    ['roeTTM',                         'roe_min',    'roe_max',    1],
    ['roaTTM',                         'roa_min',    'roa_max',    1],
    ['netProfitMarginTTM',             'margin_min', 'margin_max', 1],
    ['grossMarginTTM',                 'gross_min',  'gross_max',  1],
    ['revenueGrowthTTMYoy',            'revg_min',   'revg_max',  1],
    ['epsGrowthTTMYoy',                'earng_min',  'earng_max', 1],
    ['dividendYieldIndicatedAnnual',   'div_min',    'div_max',   1],
    ['totalDebt/totalEquityAnnual',    'de_min',     'de_max',    1],
    ['currentRatioAnnual',             'cr_min',     'cr_max',    1],
    ['piotroski',                      'piotroski_min','piotroski_max', 1],
    ['peg',                            'peg_min',    'peg_max',   1],
    ['marketCapitalization',           'mc_min',     'mc_max',    1],
    ['changePercent',                  'chg_min',    'chg_max',   1],
    ['fromHigh',                       'from_high_min', 'from_high_max', 1],
    ['fromLow',                        'from_low_min', null,      1],
    ['techRating',                     'tech_rating_min', 'tech_rating_max', 1],
    ['maRating',                       'ma_rating_min', 'ma_rating_max', 1],
    ['oscRating',                      'osc_rating_min', 'osc_rating_max', 1],
    ['perf1m',                         'perf1m_min', 'perf1m_max', 1],
    ['perf3m',                         'perf3m_min', 'perf3m_max', 1],
    ['perf6m',                         'perf6m_min', 'perf6m_max', 1],
    ['perfY',                          'perfy_min',  'perfy_max',  1],
    ['rsi14',                          'rsi_min',    'rsi_max',    1],
    ['relVol',                         'rel_vol_min', 'rel_vol_max', 1],
    ['beta',                           'beta_min',   'beta_max',  1],
    ['adx',                            'adx_min',    'adx_max',   1],
    ['adxDiDiff',                      'adx_di_diff_min', null,   1],
    ['pctAboveSma200',                 'above_sma200_min', 'above_sma200_max', 1],
    ['smaTrend',                       'sma_trend_min', 'sma_trend_max', 1],
    ['macd',                           'macd_min',   'macd_max',  1],
    ['macdHist',                       'macd_hist_min', 'macd_hist_max', 1],
    ['bbDist',                         'bb_dist_min', 'bb_dist_max', 1],
    ['stochK',                         'stoch_k_min', 'stoch_k_max', 1],
    ['stochKD',                        'stoch_kd_min', null,      1],
    ['currentPrice',                   'price_min',  'price_max', 1],
];

// Teknik/performans alanları: veri yoksa filtre atlanır (hisse elenmez)
const TECH_NULL_SKIP_FIELDS = ['techRating','maRating','oscRating','perf1m','perf3m','perf6m','perfY','rsi14',
  'fromHigh','fromLow','relVol','beta','adx','adxDiDiff','pctAboveSma200','smaTrend',
  'macd','macdHist','bbDist','stochK','stochKD'];

function applyAndRender(special){
  const rules = FILTER_RULES;
  // Hacim ayrı — Milyon lot
  const volMin = getN('vol_min'), volMax = getN('vol_max');
  // Sektör filtresi — aktif panelden oku
  const sectorFilter = (document.getElementById('sector_filter') || {}).value
                    || (document.getElementById('sector_filter_adv') || {}).value
                    || '';

  filtered = allData.filter(s => {
    if(searchQ){
      const q = searchQ.toUpperCase();
      if(!s.symbol.includes(q) && !s.name.toUpperCase().includes(q)) return false;
    }
    for(const [field, minId, maxId, mult] of rules){
      const mn=getN(minId), mx=getN(maxId);
      if(mn===null && mx===null) continue;
      const raw = s[field];
      if(raw===null||raw===undefined){
        if(TECH_NULL_SKIP_FIELDS.indexOf(field) !== -1) continue;
        if(mn!==null||mx!==null) return false;
        continue;
      }
      const val = raw * mult;
      if(mn!==null && val<mn) return false;
      if(mx!==null && val>mx) return false;
    }
    // Hacim filtresi (Milyon lot)
    if(volMin !== null || volMax !== null){
      const vol = s.volume;
      if(vol === null || vol === undefined) return false;
      const volM = vol / 1e6;
      if(volMin !== null && volM < volMin) return false;
      if(volMax !== null && volM > volMax) return false;
    }
    // Sektör filtresi
    if(sectorFilter && s.sector !== sectorFilter) return false;
    return true;
  });

  // Special stratejiler — PEG (Lynch) ve Piotroski
  if (special === 'peg') {
    filtered = filtered.filter(function(s) {
      return s.peg !== null && s.peg > 0 && s.peg < 1.5;
    });
    filtered.sort(function(a, b) { return (a.peg || 99) - (b.peg || 99); });
  }
  if (special === 'piotroski') {
    filtered = filtered.filter(function(s) {
      return s.piotroski !== null && s.piotroski >= 7;
    });
    filtered.sort(function(a, b) { return (b.piotroski || 0) - (a.piotroski || 0); });
  }

  // Faz 3: Uyum Puanı — aktif filtreler varsa her hisse için hesapla
  _scoreFilters = {};
  if (typeof computeMatch === 'function' && typeof FILTER_RULES !== 'undefined') {
    FILTER_RULES.forEach(function(rule) {
      var mn = getN(rule[1]), mx = rule[2] ? getN(rule[2]) : null;
      if (mn !== null && rule[1]) _scoreFilters[rule[1]] = mn;
      if (mx !== null && rule[2]) _scoreFilters[rule[2]] = mx;
    });
    var _hasFilters = Object.keys(_scoreFilters).length > 0;
    // Esnek mod: tüm evren gösterilir, puansız olanlar listede kalır
    if (_hasFilters && _matchMode === 'esnek' && !special) {
      allData.forEach(function(s) { s._match = computeMatch(s, _scoreFilters); });
      filtered = allData.filter(function(s) { return !searchQ || (s.symbol.includes(searchQ.toUpperCase()) || s.name.toUpperCase().includes(searchQ.toUpperCase())); });
    } else {
      filtered.forEach(function(s) {
        s._match = _hasFilters ? computeMatch(s, _scoreFilters) : null;
      });
    }
  }
  // Show/hide Katı⇄Esnek toggle in toolbar
  var _mmToggle = document.getElementById('match-mode-toggle');
  if (_mmToggle) _mmToggle.style.display = Object.keys(_scoreFilters).length > 0 ? '' : 'none';
  // Sync toggle button states
  document.querySelectorAll('.mmt-btn').forEach(function(b) { b.classList.toggle('on', b.dataset.mode === _matchMode); });

  document.getElementById('toolbar').style.display = 'flex';
  document.getElementById('resn').textContent = filtered.length;
  document.getElementById('scann').textContent = allData.length;

  if (filtered.length === 0 && allData.length > 0) {
    showState('twrap');
    showScanSummary(allData.length, 0);
    var _ztw = document.getElementById('twrap'); if (_ztw) _ztw.scrollTop = 0;
    renderTable(); // boş tablo göster
    updateStatsBar();
    updateTicker();
    // Sıfır sonuç banner'ı
    var zeroEl = document.getElementById('zero-results');
    if (!zeroEl) {
      zeroEl = document.createElement('div');
      zeroEl.id = 'zero-results';
      zeroEl.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;z-index:10;background:var(--bg);';
      var twrap = document.getElementById('twrap');
      if (twrap) twrap.appendChild(zeroEl);
    }
    // _scanMeta.filters = tekilleştirilmiş gerçek seçimler (özet barıyla aynı kaynak)
    var activeChips = (_scanMeta.filters || []).map(function(f){ return f.label; });
    var chipCount = activeChips.length;
    var suggestions = [
      { icon: '📉', title: 'Filtre kriterlerini genişletin', desc: chipCount > 1 ? 'Birden fazla strateji aynı anda uygulanıyor. Tek bir filtre ile başlayın.' : 'Mevcut kriterleri biraz daha esnek bir aralığa taşıyın.' },
      { icon: '🌍', title: 'Farklı bir borsa deneyin', desc: 'NASDAQ veya S&P 500\'de çok daha geniş hisse evreni mevcut.' },
      { icon: '🧩', title: 'Hazır stratejilerden birini seçin', desc: '<span onclick="clearFilters();document.querySelector(\'[data-preset=value]\').click();" style="color:var(--accent);cursor:pointer;">Değer</span> · <span onclick="clearFilters();document.querySelector(\'[data-preset=growth]\').click();" style="color:var(--accent);cursor:pointer;">Büyüme</span> · <span onclick="clearFilters();document.querySelector(\'[data-goat=buffett]\').click();" style="color:var(--accent);cursor:pointer;">Buffett</span> · <span onclick="clearFilters();document.querySelector(\'[data-goat=piotroski]\').click();" style="color:var(--accent);cursor:pointer;">Piotroski</span>' },
    ];
    var sugg_html = suggestions.map(function(s) {
      return '<div style="display:flex;gap:12px;align-items:flex-start;text-align:left;padding:10px 12px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:8px;">' +
        '<span style="font-size:18px;flex-shrink:0;margin-top:1px;">' + s.icon + '</span>' +
        '<div><div style="font-size:11px;font-weight:700;color:var(--text);margin-bottom:3px;">' + s.title + '</div>' +
        '<div style="font-size:11px;color:var(--muted2);line-height:1.6;">' + s.desc + '</div></div></div>';
    }).join('');
    var chipBadge = chipCount > 0
      ? '<div style="display:flex;flex-wrap:wrap;gap:5px;justify-content:center;margin-bottom:18px;">' +
        activeChips.map(function(c){ return '<span style="padding:3px 10px;background:rgba(96,165,250,.1);border:1px solid rgba(96,165,250,.25);border-radius:4px;font-size:10px;color:#60a5fa;font-weight:600;">' + c + '</span>'; }).join('') +
        '</div>'
      : '';
    zeroEl.style.display = 'flex';
    zeroEl.innerHTML =
      '<div style="max-width:380px;margin:0 auto;padding:32px 16px;">' +
        '<div style="font-size:28px;margin-bottom:14px;">🔍</div>' +
        '<div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:6px;">Kriterlere uyan hisse bulunamadı</div>' +
        '<div style="font-size:11px;color:var(--muted2);margin-bottom:18px;line-height:1.6;">' +
        (chipCount > 0 ? 'Seçili <strong style="color:var(--text);">' + chipCount + ' filtre</strong> kombinasyonu bu borsada eşleşen hisse döndürmedi.' : 'Uygulanan filtreler bu borsadaki hisselerin hiçbiriyle eşleşmedi.') +
        '</div>' +
        chipBadge +
        '<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:20px;">' + sugg_html + '</div>' +
        '<button onclick="clearFilters();openPrescanView()" style="padding:9px 24px;background:var(--accent);color:#000;border:none;border-radius:7px;font-size:12px;font-weight:700;cursor:pointer;letter-spacing:.3px;">Tüm Filtreleri Temizle</button>' +
      '</div>';
    return;
  }
  // Önceki sıfır sonuç banner'ını gizle
  var zeroEl = document.getElementById('zero-results');
  if (zeroEl) zeroEl.style.display = 'none';

  showState('twrap');
  showScanSummary(allData.length, filtered.length);
  // Virtual scroll render — liste filtresi aktifse uygula
  var _base = filtered;
  if (_dfUser && _dfListFilter) {
    var _lsyms = _dfListFilter.symbols;
    _base = filtered.filter(function(s) { return _lsyms.indexOf((s.symbol||'').replace('.IS','').toUpperCase()) !== -1; });
  }
  _vsData = sorted(_base);
  _vsStart = 0;
  var _wrap = document.getElementById('twrap');
  if (_wrap) _wrap.scrollTop = 0;
  _vsInit();
  _vsRender();
  // Kolay tablosu _vsData'dan beslenir — _vsData güncellendikten SONRA tekrar çiz.
  // (showState('twrap') içindeki renderKolay henüz eski _vsData'yı görür → bir adım geride kalırdı.)
  if (_scanMode === 'kolay' && typeof renderKolay === 'function') renderKolay();
  updateStatsBar();
  updateTicker();
  _saveScanHistory(filtered.length);
  setTimeout(applyColVisibility, 0);
  // Mobil: tablo görünür alana scroll et
  if (window.innerWidth <= 768) {
    var twrapEl = document.getElementById('twrap');
    if (twrapEl) twrapEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function onSearch(){
  var sb = document.getElementById('sb-searchbox');
  searchQ = sb ? sb.value.trim() : '';
  if(allData.length) applyAndRender();
}

// ═══════════════════════════════════════════
// SORT
// ═══════════════════════════════════════════
function colSort(f){
  if(sortSt.field===f) sortSt.dir = sortSt.dir==='desc'?'asc':'desc';
  else { sortSt.field=f; sortSt.dir='desc'; }
  renderTable();
}
function toggleSortDir(){
  var b = document.getElementById('sortd');
  if (!b) return;
  b.value = (b.value === 'desc') ? 'asc' : 'desc';
  onSortChange();
}
function onSortChange(){
  sortSt.field = document.getElementById('sortf').value;
  sortSt.dir   = document.getElementById('sortd').value;
  if (_activeAsset === 'fon' && _fonData.length) {
    _renderFon(_sortAsset(_fonData, sortSt.field, sortSt.dir), _fonMeta);
  } else if (_activeAsset === 'kripto' && _kriptoData.length) {
    _renderKripto(_sortAsset(_kriptoData, sortSt.field, sortSt.dir), _kriptoMeta);
  } else {
    renderTable();
  }
}
function _sortAsset(arr, field, dir) {
  return arr.slice().sort(function(a, b) {
    var av = a[field] != null ? a[field] : (dir === 'desc' ? -Infinity : Infinity);
    var bv = b[field] != null ? b[field] : (dir === 'desc' ? -Infinity : Infinity);
    return dir === 'desc' ? bv - av : av - bv;
  });
}
function sorted(arr){
  return [...arr].sort((a,b)=>{
    var av, bv;
    if (sortSt.field === '_match') {
      av = a._match ? a._match.score : (sortSt.dir==='desc' ? -Infinity : Infinity);
      bv = b._match ? b._match.score : (sortSt.dir==='desc' ? -Infinity : Infinity);
    } else {
      av = a[sortSt.field] ?? (sortSt.dir==='desc'?-Infinity:Infinity);
      bv = b[sortSt.field] ?? (sortSt.dir==='desc'?-Infinity:Infinity);
    }
    return sortSt.dir==='desc' ? bv-av : av-bv;
  });
}

var _BAND_LBLS = { high: 'Güçlü', watch: 'Yakın', ok: 'Orta', low: 'Zayıf' };

function _fMatch(m, sym) {
  if (!m) return nil;
  var cls = 'ms-' + m.status;
  var lbl = _BAND_LBLS[m.status] || '';
  var inner = m.score + '<span class="ms-lbl">' + lbl + '</span>';
  if (sym) {
    return '<span class="match-score ' + cls + ' ms-clickable" onclick="event.stopPropagation();showMatchDrawer(\'' + escJS(sym) + '\')" title="Kriter detayını gör">' + inner + '</span>';
  }
  return '<span class="match-score ' + cls + '">' + inner + '</span>';
}

// ── FAZ 4: "Neden Eşleşti?" Drawer ──────────────────────────────
var _MATCH_KEY_LABELS = {
  pe_min:'F/K', pe_max:'F/K', pb_min:'PD/DD', pb_max:'PD/DD',
  ps_min:'F/S', ps_max:'F/S', roe_min:'ROE%', roe_max:'ROE%',
  roa_min:'ROA%', roa_max:'ROA%', margin_min:'Net Marj%', margin_max:'Net Marj%',
  gross_min:'Brüt Marj%', gross_max:'Brüt Marj%', revg_min:'Gelir Büy%', revg_max:'Gelir Büy%',
  earng_min:'K.Büyüme%', earng_max:'K.Büyüme%', div_min:'Temettü%', div_max:'Temettü%',
  de_min:'B/Ö', de_max:'B/Ö', cr_min:'Cari Oran', cr_max:'Cari Oran',
  piotroski_min:'F-Score', piotroski_max:'F-Score', peg_min:'PEG', peg_max:'PEG',
  mc_min:'Piy.Değ', mc_max:'Piy.Değ', chg_min:'Günlük%', chg_max:'Günlük%',
  rsi_min:'RSI', rsi_max:'RSI', beta_min:'Beta', beta_max:'Beta',
  adx_min:'ADX', adx_max:'ADX', adx_di_diff_min:'ADX DI+',
  tech_rating_min:'Teknik', tech_rating_max:'Teknik',
  ma_rating_min:'Hrt.Ort.', ma_rating_max:'Hrt.Ort.',
  osc_rating_min:'Osilatör', osc_rating_max:'Osilatör',
  perf1m_min:'1A%', perf1m_max:'1A%', perf3m_min:'3A%', perf3m_max:'3A%',
  perf6m_min:'6A%', perf6m_max:'6A%', perfy_min:'1Y%', perfy_max:'1Y%',
  from_high_min:'52H Yük.%', from_high_max:'52H Yük.%', from_low_min:'52H Düş.%',
  rel_vol_min:'Röl.Hacim', rel_vol_max:'Röl.Hacim',
  price_min:'Fiyat', price_max:'Fiyat',
  stoch_k_min:'Stoch K', stoch_k_max:'Stoch K', stoch_kd_min:'Stoch KD',
  macd_min:'MACD', macd_max:'MACD', macd_hist_min:'MACD Hist', macd_hist_max:'MACD Hist',
  bb_dist_min:'BB Mesafe', bb_dist_max:'BB Mesafe',
  above_sma200_min:'SMA200 Üst%', above_sma200_max:'SMA200 Üst%',
  sma_trend_min:'SMA Trend', sma_trend_max:'SMA Trend'
};

function _mdrFmtVal(v, key) {
  if (v == null || !isFinite(v)) return '—';
  if (/roe|roa|margin|gross|revg|earng|div|chg|perf|from|above/.test(key)) return v.toFixed(1) + '%';
  if (/piotroski/.test(key)) return Math.round(v) + '/9';
  if (/mc_/.test(key)) {
    if (v >= 1e6) return '$' + (v / 1e6).toFixed(1) + 'T';
    if (v >= 1000) return '$' + (v / 1000).toFixed(0) + 'B';
    return '$' + v.toFixed(0) + 'M';
  }
  return v.toFixed(2);
}

function showMatchDrawer(sym) {
  var stock = (_vsData || []).find(function(s) { return s.symbol === sym; });
  if (!stock || !stock._match) return;
  var m = stock._match;

  var STATUS_MAP = {
    pass: { icon: '✓', lbl: 'Karşılandı', cls: 'mdr-pass' },
    near: { icon: '◎', lbl: 'Yakın', cls: 'mdr-near' },
    fail: { icon: '✕', lbl: 'Karşılanmadı', cls: 'mdr-fail' },
    miss: { icon: '—', lbl: 'Veri Yok', cls: 'mdr-miss' }
  };

  var rows = m.details.map(function(d) {
    var st = STATUS_MAP[d.status] || STATUS_MAP.miss;
    var lbl = _MATCH_KEY_LABELS[d.key] || d.key;
    var opSym = d.op === 'min' ? '≥' : '≤';
    var valStr = _mdrFmtVal(d.val, d.key);
    var tgtStr = _mdrFmtVal(d.target, d.key);
    var barPct = d.s != null ? Math.round(d.s * 100) : 0;
    return '<div class="mdr-row ' + st.cls + '">' +
      '<span class="mdr-icon">' + st.icon + '</span>' +
      '<span class="mdr-lbl">' + esc(lbl) + '</span>' +
      '<span class="mdr-val">' + esc(valStr) + '</span>' +
      '<span class="mdr-op">' + opSym + '</span>' +
      '<span class="mdr-tgt">' + esc(tgtStr) + '</span>' +
      '<div class="mdr-bar-wrap"><div class="mdr-bar" style="width:' + barPct + '%"></div></div>' +
      '<span class="mdr-st-lbl">' + st.lbl + '</span>' +
      '</div>';
  }).join('');

  var scoreLbls = { high: 'Güçlü Eşleşme', watch: 'Yakın Eşleşme', ok: 'Orta Eşleşme', low: 'Zayıf Eşleşme' };
  var scoreCls = 'ms-' + m.status;
  var scoreLbl = scoreLbls[m.status] || '';

  var filters = (_scanMeta && _scanMeta.filters) || [];
  var lensHtml = '';
  if (filters.length) {
    var lensItems = filters.map(function(f) {
      var kc = f.kind === 'goat' ? 'ssm-goat' : f.kind === 'tech' ? 'ssm-tech' : 'ssm-preset';
      return '<span class="ssm-tag ' + kc + '">' + esc(f.label) + '</span>';
    }).join('');
    lensHtml = '<div class="mdr-lenses"><span class="mdr-lenses-lbl">Aktif Lensler</span>' + lensItems + '</div>';
  }

  var passCnt = m.details.filter(function(d) { return d.status === 'pass'; }).length;
  var nearCnt = m.details.filter(function(d) { return d.status === 'near'; }).length;
  var failCnt = m.details.filter(function(d) { return d.status === 'fail' || d.status === 'miss'; }).length;

  var summaryHtml = '<div class="mdr-summary">' +
    '<span class="mdr-sum-item mdr-pass"><span class="mdr-sum-n">' + passCnt + '</span> Geçer</span>' +
    '<span class="mdr-sum-item mdr-near"><span class="mdr-sum-n">' + nearCnt + '</span> Yakın</span>' +
    '<span class="mdr-sum-item mdr-fail"><span class="mdr-sum-n">' + failCnt + '</span> Başarısız</span>' +
    '</div>';

  var html =
    '<div class="mdr-hd">' +
      '<div class="mdr-hd-left">' +
        '<span class="mdr-sym">' + esc(sym) + '</span>' +
        (stock.name ? '<span class="mdr-name">' + esc(stock.name) + '</span>' : '') +
      '</div>' +
      '<div class="mdr-hd-right">' +
        '<span class="match-score ' + scoreCls + ' mdr-score-badge">' + m.score + '<span class="ms-lbl">' + _BAND_LBLS[m.status] + '</span></span>' +
        '<span class="mdr-score-lbl">' + scoreLbl + '</span>' +
      '</div>' +
      '<button class="mdr-close" onclick="closeMatchDrawer()" title="Kapat">×</button>' +
    '</div>' +
    '<div class="mdr-body">' +
      summaryHtml +
      '<div class="mdr-section-lbl">Kriter Analizi <span class="mdr-n">(' + m.n + ' kriter)</span></div>' +
      '<div class="mdr-rows">' + rows + '</div>' +
      lensHtml +
    '</div>';

  var drawer = document.getElementById('match-drawer');
  if (!drawer) return;
  drawer.innerHTML = html;
  drawer.classList.add('open');
  var overlay = document.getElementById('match-drawer-overlay');
  if (overlay) overlay.classList.add('open');
}

function closeMatchDrawer() {
  var drawer = document.getElementById('match-drawer');
  if (drawer) drawer.classList.remove('open');
  var overlay = document.getElementById('match-drawer-overlay');
  if (overlay) overlay.classList.remove('open');
}

// ═══════════════════════════════════════════
// RENDER TABLE
// ═══════════════════════════════════════════
const nil = '<span class="nil">—</span>';

function fv(v, dec=2, pct=false){
  if(v===null||v===undefined||isNaN(v)) return nil;
  const cls = pct ? (v>=0?'up':'dn') : '';
  const sign = pct && v>0 ? '+' : '';
  return `<span class="${cls}">${sign}${v.toFixed(dec)}${pct?'%':''}</span>`;
}
function fScore(v) {
  if (v === null || v === undefined) return nil;
  var color = v >= 8 ? '#00c076' : v >= 6 ? '#f0b429' : '#f6465d';
  return '<span style="font-weight:700;color:' + color + '">' + v + '/9</span>';
}
function fPeg(v) {
  if (v === null || v === undefined) return nil;
  var color = v < 1 ? '#00c076' : v < 2 ? '#f0b429' : '#f6465d';
  return '<span style="font-weight:700;color:' + color + '">' + v.toFixed(2) + '</span>';
}
function fTechRating(v) {
  if (v === null || v === undefined) return nil;
  var label = v >= 0.5 ? 'Güçlü Al' : v >= 0.1 ? 'Al' : v <= -0.5 ? 'Güçlü Sat' : v <= -0.1 ? 'Sat' : 'Nötr';
  var color = v >= 0.1 ? '#00c076' : v <= -0.1 ? '#f6465d' : '#f0b429';
  return '<span style="font-weight:600;color:' + color + '">' + label + '</span>';
}
function fRsi(v) {
  if (v === null || v === undefined) return nil;
  var color = v < 30 ? '#00c076' : v > 70 ? '#f6465d' : v < 50 ? '#f0b429' : 'var(--text1)';
  return '<span style="font-weight:600;color:' + color + '">' + v.toFixed(0) + '</span>';
}
function fPerf(v) {
  if (v === null || v === undefined) return nil;
  var color = v > 0 ? '#00c076' : '#f6465d';
  return '<span style="font-weight:600;color:' + color + '">' + (v > 0 ? '+' : '') + v.toFixed(1) + '%</span>';
}

function fmc(v){
  if(!v) return nil;
  // Piyasa değeri her zaman USD — milyon USD olarak saklıyoruz
  if(v>=1000000) return `$${(v/1000000).toFixed(2)}T`;
  if(v>=1000)    return `$${(v/1000).toFixed(1)}B`;
  return `$${v.toFixed(0)}M`;
}

// USD → yerel para çarpanı (parse'taki yerel→USD zincirinin tersi)
function _usdToLocalFactor(ex) {
  switch (ex) {
    case 'bist':        return fxRates.TRY;
    case 'moex':        return fxRates.RUB;
    case 'twse':        return fxRates.TWD;
    case 'b3':          return fxRates.BRL;
    case 'hkex':        return fxRates.HKD;
    case 'china':       return fxRates.CNY;
    case 'saudi':       return fxRates.SAR;
    case 'southafrica': return fxRates.ZAR;
    case 'dax': case 'france': case 'amsterdam': case 'brussels':
    case 'lisbon': case 'dublin': case 'milan': return 1 / fxRates.EUR;
    case 'lse':         return 1 / fxRates.GBP;
    case 'nikkei':      return 1 / fxRates.JPY;
    case 'krx':         return 1 / fxRates.KRW;
    case 'oslo':        return 1 / fxRates.NOK;
    case 'tsx':         return 1 / fxRates.CAD;
    case 'switzerland': return 1 / fxRates.CHF;
    case 'australia':   return 1 / fxRates.AUD;
    case 'sweden':      return 1 / fxRates.SEK;
    case 'india':       return 1 / fxRates.INR;
    case 'uae':         return 1 / fxRates.AED;
    default: return null; // USD borsaları (nasdaq/sp500/nyse)
  }
}

// Piyasa değeri çift gösterim: yerel para + USD (detay paneli için)
function fmcDual(v, ex) {
  if(!v) return nil;
  var f = _usdToLocalFactor(ex);
  if(!f || !isFinite(f)) return fmc(v);
  var exMeta = EXCHANGE_META[ex] || EXCHANGE_META.bist;
  var loc = v * f; // milyon yerel para
  var locStr = loc>=1000000 ? (loc/1000000).toFixed(2)+'T'
             : loc>=1000    ? (loc/1000).toFixed(1)+'B'
             : loc.toFixed(0)+'M';
  return exMeta.currency + locStr + ' · ' + fmc(v);
}



// ── WEB WORKER (filter + sort) ───────────────────
var _filterWorker = null;

function _initWorker() {
  if (_filterWorker) return;
  try {
    _filterWorker = new Worker('/worker.js');
    _filterWorker.onerror = function() { _filterWorker = null; };
  } catch(e) { _filterWorker = null; }
}
// ─────────────────────────────────────────────────

// ── VIRTUAL SCROLL ────────────────────────────────
var _vsData    = [];      // sıralanmış tam liste
var _vsStart   = 0;       // ilk görünen satır index'i
var _vsRowH    = window.matchMedia('(max-width:768px)').matches ? 44 : 36; // mobilde 44px (Apple HIG)
var _vsBuffer  = 15;      // ekstra render (üst+alt buffer)
var _vsRAF     = null;

function _vsGetVisible() {
  var wrap = document.getElementById('twrap');
  if (!wrap) return {start:0, count:100};
  // Birden fazla yöntemle yüksekliği dene
  var viewH = wrap.clientHeight || wrap.offsetHeight;
  if (!viewH || viewH < 100) {
    // twrap'ın parent'ından hesapla
    var parent = wrap.parentElement;
    viewH = parent ? (parent.clientHeight - 60) : (window.innerHeight - 250);
  }
  if (!viewH || viewH < 100) viewH = window.innerHeight - 200;
  var scrollY = wrap.scrollTop || 0;
  // Gerçek satır yüksekliğini ölç
  var firstRow = wrap.querySelector('tbody tr:not(.vs-pad)');
  if (firstRow && firstRow.offsetHeight > 10) _vsRowH = firstRow.offsetHeight;
  // En az 60 satır render et — scroll çalışmasa bile yeterli veri görünür
  var count = Math.max(60, Math.ceil(viewH / _vsRowH) + _vsBuffer * 2);
  var start = Math.max(0, Math.floor(scrollY / _vsRowH) - _vsBuffer);
  return {start: start, count: count};
}

function _vsRender() {
  var tbody = document.getElementById('tbody');
  if (!tbody) return;
  if (!_vsData.length) { tbody.innerHTML = ''; return; }

  var v      = _vsGetVisible();
  var end    = Math.min(_vsData.length, v.start + v.count);
  var topPad = v.start * _vsRowH;
  var botPad = Math.max(0, (_vsData.length - end)) * _vsRowH;

  // Padding row'ları ile toplam yüksekliği koru
  var rows = '';
  if (topPad > 0) {
    rows += '<tr class="vs-pad" style="height:' + topPad + 'px"><td colspan="22"></td></tr>';
  }
  for (var i = v.start; i < end; i++) {
    rows += _vsRowHtml(_vsData[i], i);
  }
  if (botPad > 0) {
    rows += '<tr class="vs-pad vs-sentinel" style="height:' + botPad + 'px"><td colspan="22"></td></tr>';
  }
  tbody.innerHTML = rows;
  if (typeof applyColOrder === 'function') applyColOrder();

  // Sentinel observer: botPad row görünürce daha fazla yükle
  _vsBindSentinel();
}

function _vsBindSentinel() {
  if (!window.IntersectionObserver) return;
  var sentinel = document.querySelector('.vs-sentinel');
  if (!sentinel || sentinel._vsObs) return;
  var obs = new IntersectionObserver(function(entries) {
    if (entries[0].isIntersecting) {
      obs.disconnect();
      sentinel._vsObs = null;
      if (_vsRAF) cancelAnimationFrame(_vsRAF);
      _vsRAF = requestAnimationFrame(_vsRender);
    }
  }, { threshold: 0.01 });
  obs.observe(sentinel);
  sentinel._vsObs = obs;
}

function _vsOnScroll() {
  if (_vsRAF) cancelAnimationFrame(_vsRAF);
  _vsRAF = requestAnimationFrame(_vsRender);
}

function _vsInit() {
  var wrap = document.getElementById('twrap');
  if (!wrap) return;
  if (!wrap._vsListener) {
    wrap.addEventListener('scroll', _vsOnScroll, {passive: true});
    wrap._vsListener = true;
  }
  // ResizeObserver: tablo boyutu değişince yeniden render
  if (window.ResizeObserver && !wrap._vsResizeObs) {
    wrap._vsResizeObs = new ResizeObserver(function() {
      if (_vsData && _vsData.length) _vsRender();
    });
    wrap._vsResizeObs.observe(wrap);
  }
  // Window resize — ekran boyutu değişince daha fazla satır göster
  if (!window._vsWinListener) {
    window.addEventListener('resize', function() {
      _vsRowH = window.matchMedia('(max-width:768px)').matches ? 44 : 36;
      if (_vsData && _vsData.length) { if (_vsRAF) cancelAnimationFrame(_vsRAF); _vsRAF = requestAnimationFrame(_vsRender); }
    }, {passive: true});
    window._vsWinListener = true;
  }
}
// ─────────────────────────────────────────────────



function isInAnyList(sym) {
  return _dfWatchlists.some(function(l) {
    return l.items && l.items.some(function(i) { return i.symbol === sym; });
  });
}

function _vsRowHtml(s, idx) {
  // Inline display style — scroll sonrası da korunur
  var cv = function(key) { return isColVisible(key) ? '' : 'display:none;'; };
  var isFav, favClick, favTitle;
  if (_dfUser) {
    isFav     = isInAnyList(s.symbol);
    favClick  = "showWlPicker(event,'" + escJS(s.symbol) + "','" + escJS(currentExchange) + "')";
    favTitle  = isFav ? 'Listede var — başka listeye ekle' : 'Listeye ekle';
  } else {
    isFav     = favSet.has(s.symbol);
    favClick  = "event.stopPropagation();toggleFav('" + escJS(s.symbol) + "')";
    favTitle  = isFav ? 'Favorilerden çıkar' : 'Favorilere ekle';
  }
  var _mcap = s.marketCapitalization;
  var _mcapTier = _mcap == null ? '' : _mcap >= 200000 ? ' mcap-mega' : _mcap >= 10000 ? ' mcap-large' : _mcap >= 2000 ? ' mcap-mid' : _mcap >= 300 ? ' mcap-small' : ' mcap-micro';
  return `<tr onclick="showDetail('${escJS(s.symbol)}')" tabindex="0" class="${selSym===s.symbol?'selrow':''}${_mcapTier}">
      <td class="nfav"><span class="fav-icon${isFav?' fav-on':''}" onclick="${favClick}" title="${esc(favTitle)}">★</span></td>
      <td data-col="symbol" style="display:table-cell;"><span class="row-num">${idx+1}</span><span class="sym-wrap"><span class="row-arrow">›</span><span class="sym">${esc(s.symbol)}</span></span></td>
      <td data-col="name" style="${cv('name')}font-size:11px;color:var(--text2);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(s.name)}">${esc(s.name)}</td>
      <td data-col="price" style="${cv('price')}">${s.currentPrice!=null?(s.currentPrice.toFixed(2)+' '+(EXCHANGE_META[currentExchange]||EXCHANGE_META.bist).currency):nil}</td>
      <td data-col="mcap" style="${cv('mcap')}">${fmc(s.marketCapitalization)}</td>
      <td data-col="pe" style="${cv('pe')}">${fv(s.peNormalizedAnnual,1)}</td>
      <td data-col="pb" style="${cv('pb')}">${fv(s.pbAnnual,2)}</td>
      <td data-col="ps" style="${cv('ps')}">${fv(s.psTTM,2)}</td>
      <td data-col="roe" style="${cv('roe')}">${fv(s.roeTTM,1,true)}</td>
      <td data-col="roa" style="${cv('roa')}">${fv(s.roaTTM,1,true)}</td>
      <td data-col="margin" style="${cv('margin')}">${fv(s.netProfitMarginTTM,1,true)}</td>
      <td data-col="revg" style="${cv('revg')}">${fv(s.revenueGrowthTTMYoy,1,true)}</td>
      <td data-col="epsg" style="${cv('epsg')}">${fv(s.epsGrowthTTMYoy,1,true)}</td>
      <td data-col="fscore" style="${cv('fscore')}">${s.piotroski !== null ? fScore(s.piotroski) : nil}</td>
      <td data-col="de" style="${cv('de')}">${fv(s['totalDebt/totalEquityAnnual'],1)}</td>
      <td data-col="cr" style="${cv('cr')}">${fv(s.currentRatioAnnual,2)}</td>
      <td data-col="div" style="${cv('div')}">${s.dividendYieldIndicatedAnnual!=null?`<span class="up">${s.dividendYieldIndicatedAnnual.toFixed(2)}%</span>`:nil}</td>
      <td data-col="peg" style="${cv('peg')}">${s.peg !== null ? fPeg(s.peg) : nil}</td>
      <td data-col="tech_rating" style="${cv('tech_rating')}">${s.techRating!=null?fTechRating(s.techRating):nil}</td>
      <td data-col="rsi" style="${cv('rsi')}">${s.rsi14!=null?fRsi(s.rsi14):nil}</td>
      <td data-col="chg1d" style="${cv('chg1d')}">${s.changePercent!=null?fPerf(s.changePercent):nil}</td>
      <td data-col="chg1w" style="${cv('chg1w')}">${s.perfW!=null?fPerf(s.perfW):nil}</td>
      <td data-col="perf3m" style="${cv('perf3m')}">${s.perf3m!=null?fPerf(s.perf3m):nil}</td>
      <td data-col="float_pct" style="${cv('float_pct')}">${s.floatPct!=null?fv(s.floatPct,1,true):nil}</td>
      <td data-col="sector" style="${cv('sector')}font-size:10px;color:var(--muted2)">${esc(s.sector)||'—'}</td>
      <td data-col="match" style="${cv('match')}">${_fMatch(s._match, s.symbol)}</td>
    </tr>`;
}function renderTable(){
  // Apply density class
  var _tbl = document.getElementById('hisse-table');
  if (_tbl) { _tbl.classList.remove('density-compact','density-normal','density-comfortable'); _tbl.classList.add('density-'+(_rowDensity||'compact')); }
  // Sort header güncelle
  document.querySelectorAll('thead th').forEach(function(th){
    var oc = th.getAttribute('onclick')||'';
    var match = oc.match(/colSort\('([^']+)'\)/);
    if(match){
      var on = match[1]===sortSt.field;
      th.classList.toggle('sorted', on);
      th.classList.toggle('asc', on && sortSt.dir==='asc');
      // Erişilebilirlik: sıralanabilir başlık → klavye + aria-sort
      th.setAttribute('role','columnheader');
      if(!th.hasAttribute('tabindex')) th.setAttribute('tabindex','0');
      th.setAttribute('aria-sort', on ? (sortSt.dir==='asc'?'ascending':'descending') : 'none');
    }
  });

  var base = filtered;
  if (_dfUser && _dfListFilter) {
    var syms = _dfListFilter.symbols;
    base = filtered.filter(function(s) { return syms.indexOf((s.symbol || '').replace('.IS','').toUpperCase()) !== -1; });
  } else if (!_dfUser && favFilterActive) {
    base = filtered.filter(function(s) { return favSet.has(s.symbol); });
  }
  _vsData = sorted(base);
  _vsStart = 0;
  var _rtWrap = document.getElementById('twrap');
  if (_rtWrap) _rtWrap.scrollTop = 0;
  _vsInit();
  _vsRender();
  updateStatsBar();
  setTimeout(applyColVisibility, 0);
  if (_scanMode === 'kolay') renderKolay();
}

// ═══════════════════════════════════════════
// KOLAY MOD — sade tarayıcı görünümü
// ═══════════════════════════════════════════
var _scanMode = 'kolay';
try { var _sm0 = localStorage.getItem('df_scan_mode'); if (_sm0 === 'pro' || _sm0 === 'kolay') _scanMode = _sm0; } catch(e) {}

function setScanMode(mode) {
  _scanMode = (mode === 'pro') ? 'pro' : 'kolay';
  try { localStorage.setItem('df_scan_mode', _scanMode); } catch(e) {}
  _applyScanMode();
  if (typeof _vsData !== 'undefined' && _vsData && _vsData.length) {
    if (_scanMode === 'kolay') renderKolay();
    else { try { renderTable(); } catch(e) {} }
  }
}

function _applyScanMode() {
  document.documentElement.setAttribute('data-scan-mode', _scanMode);
  var btns = document.querySelectorAll('.smt-btn');
  for (var i = 0; i < btns.length; i++) btns[i].classList.toggle('on', btns[i].getAttribute('data-mode') === _scanMode);
  var tw = document.getElementById('twrap');
  var kw = document.getElementById('kolay-wrap');
  var resultsVisible = tw && tw.style.display && tw.style.display !== 'none';
  if (kw) kw.style.display = (_scanMode === 'kolay' && resultsVisible) ? 'block' : 'none';
  if (_scanMode === 'kolay' && typeof renderKolaySide === 'function') renderKolaySide();
  if (_scanMode === 'kolay' && typeof renderKolayFilters === 'function') renderKolayFilters();
}

function renderKolay() {
  var tb = document.getElementById('kolay-tbody');
  if (!tb) return;
  var data = (typeof _vsData !== 'undefined' && _vsData) ? _vsData : [];
  var ex = currentExchange;
  var exMeta = EXCHANGE_META[ex] || EXCHANGE_META.bist;
  var curr = exMeta.currency || '';
  var sub = document.getElementById('kolay-sub');
  if (sub) sub.textContent = (exMeta.name || ex.toUpperCase()) + ' · ' + data.length + ' hisse';
  // Başlık: seçili filtre adı (Tümü ise "Tüm Hisseler")
  var titleEl = document.getElementById('kolay-title');
  if (titleEl) {
    var _kf = (_kolayFilterKey && _kolayFilterKey !== 'all')
      ? KOLAY_FILTERS.find(function(f){ return f.key === _kolayFilterKey; }) : null;
    titleEl.textContent = _kf ? _kf.name : 'Tüm Hisseler';
  }
  var f = (typeof _usdToLocalFactor === 'function') ? _usdToLocalFactor(ex) : null;
  function mcapStr(v) {
    if (!v) return '—';
    if (f && isFinite(f)) { var loc = v * f; return curr + (loc >= 1e6 ? (loc/1e6).toFixed(1)+'T' : loc >= 1e3 ? (loc/1e3).toFixed(0)+'B' : loc.toFixed(0)+'M'); }
    return fmc(v);
  }
  function peC(v) { if (v == null || v <= 0) return ''; return 'font-weight:600;color:' + (v < 15 ? 'var(--green)' : v < 25 ? 'var(--gold)' : 'var(--red)'); }
  function roeC(v) { if (v == null) return ''; return 'font-weight:600;color:' + (v > 15 ? 'var(--green)' : v > 8 ? 'var(--gold)' : 'var(--red)'); }
  var hasMatch = typeof computeMatch === 'function' && typeof _scoreFilters !== 'undefined' && Object.keys(_scoreFilters).length > 0;
  var cap = data.length > 500 ? 500 : data.length;
  var rows = '';
  var cards = '';
  for (var i = 0; i < cap; i++) {
    var s = data[i];
    var matchCell = hasMatch && s._match ? _fMatch(s._match, s.symbol) : '<span class="nil">—</span>';
    var price = s.currentPrice != null ? s.currentPrice.toFixed(2) + ' ' + curr : '—';
    var chg = s.changePercent != null ? fPerf(s.changePercent) : '—';
    rows += '<tr onclick="showDetail(\'' + escJS(s.symbol) + '\')" tabindex="0">' +
      '<td class="kt-hisse"><span class="kt-sym">' + esc(s.symbol) + '</span><span class="kt-name">' + esc(s.name || '') + '</span></td>' +
      '<td class="r kt-price">' + price + '</td>' +
      '<td class="r">' + chg + '</td>' +
      '<td class="r"><span style="' + peC(s.peNormalizedAnnual) + '">' + (s.peNormalizedAnnual != null && s.peNormalizedAnnual > 0 ? s.peNormalizedAnnual.toFixed(1) : '—') + '</span></td>' +
      '<td class="r"><span style="' + roeC(s.roeTTM) + '">' + (s.roeTTM != null ? s.roeTTM.toFixed(1) + '%' : '—') + '</span></td>' +
      '<td class="r">' + (s.rsi14 != null ? fRsi(s.rsi14) : '—') + '</td>' +
      '<td class="r kt-mcap">' + mcapStr(s.marketCapitalization) + '</td>' +
      '<td class="r kt-uyum">' + matchCell + '</td>' +
    '</tr>';
    cards += '<div class="kolay-card" onclick="showDetail(\'' + escJS(s.symbol) + '\')" tabindex="0">' +
      '<span class="kolay-card-sym">' + esc(s.symbol) + '</span>' +
      '<span class="kolay-card-price">' + price + '</span>' +
      '<span class="kolay-card-name">' + esc(s.name || '') + '</span>' +
      '<span class="kolay-card-chg">' + chg + '</span>' +
      (hasMatch && s._match ? '<div class="kolay-card-match">' + matchCell + '</div>' : '') +
    '</div>';
  }
  if (data.length > cap) {
    rows += '<tr class="kt-more"><td colspan="8">+ ' + (data.length - cap) + ' hisse daha — tümünü görmek için Pro moda geç</td></tr>';
    cards += '<div class="kolay-card kt-more" style="justify-content:center;color:var(--muted2);font-size:12px;grid-template-columns:1fr">+ ' + (data.length - cap) + ' hisse daha</div>';
  }
  tb.innerHTML = rows || '<tr><td colspan="8" style="padding:24px;text-align:center;color:var(--muted)">Sonuç yok</td></tr>';
  var cardsEl = document.getElementById('kolay-cards');
  if (cardsEl) cardsEl.innerHTML = cards || '<div style="padding:24px;text-align:center;color:var(--muted)">Sonuç yok</div>';
  _applyScanMode();
}
try { _applyScanMode(); } catch(e) {}

// ── Tarayıcıya girişte Kolay/Pro seçim ekranı ──
function openScanModeChoice() {
  var pv = document.getElementById('prescan-view'); if (pv) pv.style.display = 'none';
  ['empty','loading','errstate','twrap'].forEach(function(id){ var e = document.getElementById(id); if (e) e.style.display = 'none'; });
  var kw = document.getElementById('kolay-wrap'); if (kw) kw.style.display = 'none';
  var sb = document.getElementById('stats-bar'); if (sb) sb.classList.remove('visible');
  var ch = document.getElementById('scan-mode-choice'); if (ch) ch.style.display = 'flex';
}

function chooseScanMode(mode) {
  var ch = document.getElementById('scan-mode-choice'); if (ch) ch.style.display = 'none';
  setScanMode(mode);
  // Profesyonel → tarama yapılandırma ekranı (prescan: varlık/borsa/strateji/tara)
  if (mode === 'pro') { openPrescanView(); return; }
  // Kolay → varsayılan: BIST borsası + Tümü filtresi
  currentExchange = 'bist';
  _kolayFilterKey = 'all';
  document.querySelectorAll('.kfil').forEach(function(c){ c.classList.remove('on'); });
  var _tumu = document.querySelector('.kfil'); if (_tumu) _tumu.classList.add('on');
  document.querySelectorAll('.exbtn').forEach(function(b){ b.classList.toggle('on', b.dataset.exchange === 'bist'); });
  if (typeof renderKolaySide === 'function') renderKolaySide();
  _runDefaultScan();
}

// Temiz varsayılan tarama (tüm hisseler, filtresiz)
function _runDefaultScan() {
  // Tüm chip/inputları temizle
  document.querySelectorAll('#goat-chips .goat-chip.on, #presets .chip.on, #tech-presets .chip.on, #adv-goat-chips .goat-chip.on, #adv-presets .chip.on, #adv-tech-presets .chip.on').forEach(function(c){ c.classList.remove('on'); });
  document.querySelectorAll('.finps input, #hisse-hidden-filters input').forEach(function(i){ i.value = ''; });
  document.querySelectorAll('.qs-btn.active').forEach(function(b){ b.classList.remove('active'); });
  window._chipSpecial = null;
  if (typeof updateClrBtn === 'function') updateClrBtn();
  // _applyChips kanıtlanmış yol: selectAsset('hisse') yapar, özel filtreyi sıfırlar, temiz tarar
  if (typeof _applyChips === 'function') _applyChips(BASIC_CHIP_CFG);
  else { if (_activeAsset !== 'hisse' && typeof selectAsset === 'function') selectAsset('hisse'); runScan(); }
}

// Kolay moddaki 4 basit filtre (temel + teknik) + Tümü
var _kolayFilterKey = 'all';
var _kolayExpanded = false;        // borsa listesi genişletme
var _kolayFiltExpanded = false;    // filtre listesi genişletme
var _kolayAssetExpanded = false;   // varlık listesi genişletme

// Kolay filtreler (temel + teknik + goat) — basit isimlerle
var KOLAY_FILTERS = [
  { key: 'value',    name: 'Değer Odaklı' },
  { key: 'quality',  name: 'Kalite Odaklı' },
  { key: 'breakout', name: 'Yükseliş Eğilimi' },
  { key: 'oversold', name: 'Geri Çekilmiş' },
  { key: 'growth',   name: 'Büyüme Odaklı' },
  { key: 'dividend', name: 'Temettü Odaklı' },
  { key: 'momentum', name: 'Momentum Odaklı' },
  { key: 'nearHigh', name: 'Zirveye Yakın' },
  { key: 'buffett',  name: 'Buffett Lensi' },
  { key: 'graham',   name: 'Graham Lensi' },
  { key: 'lynch',    name: 'Lynch Lensi' },
];
var _KOLAY_FILT_VIS = 3; // (eski) — artık tüm filtreler gösteriliyor

// Bir Kolay filtre anahtarının açıklamasını (tooltip için) bulur.
function _kolayFilterInfo(key) {
  if (key === 'all') return { label: 'Tüm Hisseler', desc: 'Borsadaki tüm hisseleri filtresiz listeler.' };
  var src = (typeof GURUS !== 'undefined' && GURUS[key])
         || (typeof TECH_PRESETS !== 'undefined' && TECH_PRESETS[key])
         || (typeof PRESETS !== 'undefined' && PRESETS[key]) || null;
  return src ? { label: src.label, desc: src.desc || '' } : null;
}

function renderKolayFilters() {
  var c = document.getElementById('kolay-filters');
  if (!c) return;
  function chip(key, name) {
    var info = _kolayFilterInfo(key);
    var tip = info ? ' data-tip="' + esc(info.desc) + '" data-tipname="' + esc(info.label) + '"' : '';
    return '<button class="kfil' + (_kolayFilterKey === key ? ' on' : '') + '"' + tip +
      ' onclick="kolayFilter(\'' + key + '\',this)">' + name + '</button>';
  }
  var html = chip('all', 'Tümü');
  KOLAY_FILTERS.forEach(function(f) { html += chip(f.key, f.name); });
  c.innerHTML = html;
}

// Kolay filtre etiketleri için detaylı bilgi balonu (hover) — delegasyonla
(function() {
  var _ktip = null;
  function _show(el) {
    var name = el.getAttribute('data-tipname') || '';
    var desc = el.getAttribute('data-tip') || '';
    if (!desc) return;
    if (!_ktip) {
      _ktip = document.createElement('div');
      _ktip.className = 'kfil-tip';
      document.body.appendChild(_ktip);
    }
    _ktip.innerHTML = '<div class="kfil-tip-h">' + name + '</div><div class="kfil-tip-d">' + desc + '</div>';
    var r = el.getBoundingClientRect();
    _ktip.style.opacity = '0';
    _ktip.style.display = 'block';
    // ölç ve konumla — etiketin altında, ekran içinde
    var tw = _ktip.offsetWidth, th = _ktip.offsetHeight;
    var left = r.left + r.width / 2 - tw / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));
    var top = r.bottom + 8;
    if (top + th > window.innerHeight - 8) top = r.top - th - 8; // yer yoksa üste al
    _ktip.style.left = left + 'px';
    _ktip.style.top = top + 'px';
    _ktip.style.opacity = '1';
  }
  function _hide() { if (_ktip) { _ktip.style.opacity = '0'; _ktip.style.display = 'none'; } }
  var _TIP_SEL = '.kfil[data-tip], .hpx-spill[data-tip]';
  document.addEventListener('mouseover', function(e) {
    var el = e.target.closest && e.target.closest(_TIP_SEL);
    if (el) _show(el);
  });
  document.addEventListener('mouseout', function(e) {
    var el = e.target.closest && e.target.closest(_TIP_SEL);
    if (el && !(e.relatedTarget && el.contains(e.relatedTarget))) _hide();
  });
  // Dokunmatik (hover yok): tap ile balonu kısa süre göster — mevcut aksiyonu engellemez
  var _ktipTO = null;
  document.addEventListener('click', function(e) {
    if (!(window.matchMedia && window.matchMedia('(hover: none)').matches)) return;
    var el = e.target.closest && e.target.closest(_TIP_SEL);
    if (!el) return;
    _show(el);
    clearTimeout(_ktipTO);
    _ktipTO = setTimeout(_hide, 2600);
  });
})();

// Anasayfa strateji kartlarına bilgi balonu (data-tip) ekle — açıklamalar dict'lerden
function _initHomeStratTips() {
  document.querySelectorAll('#hpx-sg-goat .hpx-spill, #hpx-sg-fund .hpx-spill, #hpx-sg-tech .hpx-spill').forEach(function(el) {
    if (el.hasAttribute('data-tip')) return;
    var oc = el.getAttribute('onclick') || '';
    var m = oc.match(/apply(Strategy|Preset|Tech)AndGo\('([^']+)'\)/);
    if (!m) return;
    var dict = m[1] === 'Strategy' ? (typeof GURUS !== 'undefined' && GURUS)
             : m[1] === 'Preset'   ? (typeof PRESETS !== 'undefined' && PRESETS)
             :                       (typeof TECH_PRESETS !== 'undefined' && TECH_PRESETS);
    var d = dict && dict[m[2]];
    if (d && d.desc) { el.setAttribute('data-tip', d.desc); el.setAttribute('data-tipname', d.label || ''); }
  });
}
document.addEventListener('DOMContentLoaded', _initHomeStratTips);

// Bir Kolay filtre anahtarı için chip + filtre inputlarını hazırlar.
// Veriyi YENİDEN ÇEKMEZ — sadece state'i kurar ve özel (special) anahtarı döner.
// Böylece filtre tıklamaları mevcut veriye anında uygulanır, async yarış olmaz.
function _kolaySetupFilter(key) {
  // Önce tüm chip/inputları temizle (önceki seçim takılmasını önler)
  document.querySelectorAll('#goat-chips .goat-chip.on, #presets .chip.on, #tech-presets .chip.on, #adv-goat-chips .goat-chip.on, #adv-presets .chip.on, #adv-tech-presets .chip.on').forEach(function(c){ c.classList.remove('on'); });
  document.querySelectorAll('.finps input, #hisse-hidden-filters input').forEach(function(i){ i.value = ''; });
  document.querySelectorAll('.qs-btn.active').forEach(function(b){ b.classList.remove('active'); });
  var special = null;
  if (key && key !== 'all') {
    var chip = null, filters = null;
    if (typeof GURUS !== 'undefined' && GURUS[key]) {
      chip = document.querySelector('#goat-chips .goat-chip[data-goat="' + key + '"]');
      filters = GURUS[key].filters; special = GURUS[key].special || null;
    } else if (typeof TECH_PRESETS !== 'undefined' && TECH_PRESETS[key]) {
      chip = document.querySelector('#tech-presets .chip[data-tech="' + key + '"]');
      filters = TECH_PRESETS[key].filters;
    } else if (typeof PRESETS !== 'undefined' && PRESETS[key]) {
      chip = document.querySelector('#presets .chip[data-preset="' + key + '"]');
      filters = PRESETS[key].filters;
    }
    if (chip) chip.classList.add('on');
    if (filters) Object.keys(filters).forEach(function(k){ var el = document.getElementById(k); if (el) el.value = filters[k]; });
  }
  window._chipSpecial = special;
  if (typeof updateClrBtn === 'function') updateClrBtn();
  return special;
}

function kolayFilter(key, el) {
  _kolayFilterKey = key;
  renderKolayFilters(); // aktif durumu güncelle
  var special = _kolaySetupFilter(key);
  var hasData = (typeof allData !== 'undefined' && allData && allData.length);
  if (hasData) {
    // Veri zaten yüklü — anında, yarışsız yerel filtreleme
    if (typeof applyAndRender === 'function') applyAndRender(special);
  } else {
    // Henüz veri yok — bir kez tara; tarama bittiğinde kurulan filtre uygulanır
    if (_activeAsset !== 'hisse' && typeof selectAsset === 'function') selectAsset('hisse');
    runScan();
  }
}

// Kolay sol panel: Varlık + Borsa listesi
function renderKolaySide() {
  // ── Varlık listesi (ilk 3 + daha fazla) ──
  var aList = document.getElementById('kolay-asset-list');
  if (aList && typeof PSV_ASSETS !== 'undefined') {
    aList.innerHTML = PSV_ASSETS.map(function(a, i) {
      var hide = (i >= 3 && !_kolayAssetExpanded) ? ' style="display:none"' : '';
      if (a.active) return '<button class="ks-asset on"' + hide + '>' + a.label + '</button>';
      return '<div class="ks-soon"' + hide + '>' + a.label + ' <span>yakında</span></div>';
    }).join('');
    var aMore = document.getElementById('kolay-asset-more');
    if (aMore) { aMore.style.display = PSV_ASSETS.length > 3 ? '' : 'none'; aMore.textContent = _kolayAssetExpanded ? '− Daha Az' : '+ Daha Fazla'; }
  }
  // ── Borsa listesi (ana 6 + diğer borsalar) ──
  var list = document.getElementById('kolay-ex-list');
  if (!list || typeof EXCHANGE_META === 'undefined') return;
  var main = (typeof PSV_MAIN_EX !== 'undefined') ? PSV_MAIN_EX : ['bist','nasdaq','nyse','sp500','dax','lse'];
  var extra = Object.keys(EXCHANGE_META).filter(function(k){ return main.indexOf(k) === -1; });
  function exItem(key) {
    var m = EXCHANGE_META[key]; if (!m) return '';
    var iso = (typeof _isoFromFlag === 'function') ? _isoFromFlag(m.flag) : '';
    var flag = iso ? '<img class="ks-flag" src="https://flagcdn.com/w20/' + iso + '.png" alt="" loading="lazy">' : '<span class="ks-flag-e">' + m.flag + '</span>';
    var country = EXCHANGE_COUNTRY[key] ? '<span class="ks-ex-country">' + EXCHANGE_COUNTRY[key] + '</span>' : '';
    return '<button class="ks-ex' + (currentExchange === key ? ' on' : '') + '" onclick="kolaySelectExchange(\'' + key + '\')">' + flag + '<span class="ks-ex-name">' + m.name + '</span>' + country + '</button>';
  }
  list.innerHTML = main.map(exItem).join('') +
    '<div class="ks-ex-extra" id="kolay-ex-extra"' + (_kolayExpanded ? '' : ' style="display:none"') + '>' + extra.map(exItem).join('') + '</div>';
}

function kolayToggleMoreEx() {
  _kolayExpanded = !_kolayExpanded;
  var ex = document.getElementById('kolay-ex-extra'); if (ex) ex.style.display = _kolayExpanded ? 'block' : 'none';
  var btn = document.getElementById('kolay-ex-more'); if (btn) btn.textContent = _kolayExpanded ? '− Daha Az' : '+ Diğer Borsalar';
}
function kolayToggleMoreAssets() { _kolayAssetExpanded = !_kolayAssetExpanded; renderKolaySide(); }

function kolaySelectExchange(key) {
  if (typeof EXCHANGE_META === 'undefined' || !EXCHANGE_META[key]) return;
  currentExchange = key;
  document.querySelectorAll('.exbtn').forEach(function(b){ b.classList.toggle('on', b.dataset.exchange === key); });
  document.querySelectorAll('#adv-ex-grid .exbtn').forEach(function(b){ b.classList.toggle('on', b.dataset.exchange === key); });
  allData = []; filtered = []; selSym = null;
  if (typeof closeDetail === 'function') closeDetail();
  renderKolaySide();
  // Yeni borsada taze tara; mevcut filtreyi kurup tek taramayla uygula
  // (tarama bittiğinde kurulan filtre/özel anahtar otomatik uygulanır)
  _kolaySetupFilter(_kolayFilterKey);
  if (_activeAsset !== 'hisse' && typeof selectAsset === 'function') selectAsset('hisse');
  runScan();
}


// ═══════════════════════════════════════════
// DETAIL PANEL
// ═══════════════════════════════════════════

function buildProfile(s) {
  const profileEl = document.getElementById('dprofile');
  const metaEl = document.getElementById('dprofile-meta');
  const linksEl = document.getElementById('dprofile-links');
  if(!profileEl) return;

  const sym = s.symbol;
  const ex = s.exchangeId || currentExchange;
  const symClean = sym.replace('.IS','');

  const exMeta = EXCHANGE_META[ex] || EXCHANGE_META.bist;
  var metaParts = [];
  if(s.sector) metaParts.push(s.sector);
  metaParts.push(exMeta.flag + ' ' + exMeta.name);
  metaEl.textContent = metaParts.join('  ·  ');

  // Hemen Al + Detaylı Analiz butonları
  linksEl.innerHTML = [
    '<div class="dpl-action-row">',
      '<button class="dpl-buy" onclick="onHemenAl(\'' + escJS(sym) + '\',\'' + escJS(ex) + '\')" title="Broker\'da işlem aç">',
        'Hemen Al',
      '</button>',
      '<button class="dpl-analyze" onclick="openDetayliAnaliz(\'' + escJS(symClean) + '\',\'' + escJS(ex) + '\')">',
        'Detaylı Analiz',
      '</button>',
    '</div>'
  ].join('');

  profileEl.style.display = 'block';
  var adDetail = document.getElementById('ad-detail');
  if(adDetail) adDetail.style.display = 'flex';

}


function showDetail(sym){
  const s = allData.find(x=>x.symbol===sym);
  if(!s) return;
  selSym = sym;
  renderTable();

  document.getElementById('dsym').textContent = s.name || s.symbol;
  document.getElementById('dname').textContent = s.symbol;
  document.getElementById('dprice').textContent = s.currentPrice!=null?`${s.currentPrice.toFixed(2)} ${(EXCHANGE_META[currentExchange]||EXCHANGE_META.bist).currency}`:'—';
  
  if(s.changePercent!=null){
    const chg = s.currentPrice && s.previousClose ? s.currentPrice - s.previousClose : null;
    const cls = s.changePercent>=0?'up':'dn';
    const sign = s.changePercent>=0?'+':'';
    document.getElementById('dchg').innerHTML = `<span class="${cls}">${chg?sign+chg.toFixed(2)+' ₺ · ':''} ${sign}${s.changePercent.toFixed(2)}%</span>`;
  } else document.getElementById('dchg').innerHTML = '';
  

  // Şirket Profili
  buildProfile(s);

  const G = [
    {t:'Değerleme', rows:[
      ['F/K <tag>TTM</tag>', s.peNormalizedAnnual, v=>v.toFixed(1), 'dval-pe'],
      ['PD/DD <tag>FQ</tag>', s.pbAnnual, v=>v.toFixed(2), 'dval-pb'],
      ['F/S <tag>TTM</tag>', s.psTTM, v=>v.toFixed(2), 'dval-ps'],
      ['Piyasa Değeri', s.marketCapitalization, v=>fmcDual(v, s.exchangeId||currentExchange)],
      ['Sektör', s.sector, v=>esc(v)],
      ['52H Yüksek', s['52WeekHigh'], v=>`${v.toFixed(2)} ₺`],
      ['52H Düşük', s['52WeekLow'], v=>`${v.toFixed(2)} ₺`],
    ]},
    {t:'Karlılık', rows:[
      ['ROE <tag>FQ</tag>', s.roeTTM, v=>`<span class="${v>=0?'up':'dn'}">${v.toFixed(1)}%</span>`, 'dval-roe'],
      ['ROA <tag>FQ</tag>', s.roaTTM, v=>`<span class="${v>=0?'up':'dn'}">${v.toFixed(1)}%</span>`, 'dval-roa'],
      ['Net Kar Marjı <tag>TTM</tag>', s.netProfitMarginTTM, v=>`<span class="${v>=0?'up':'dn'}">${v.toFixed(1)}%</span>`, 'dval-nm'],
      ['Brüt Marj <tag>TTM</tag>', s.grossMarginTTM, v=>`<span class="${v>=0?'up':'dn'}">${v.toFixed(1)}%</span>`, 'dval-gm'],
    ]},
    {t:'Büyüme', rows:[
      ['Gelir Büy. <tag>YoY</tag>', s.revenueGrowthTTMYoy, v=>`<span class="${v>=0?'up':'dn'}">${v>=0?'+':''}${v.toFixed(1)}%</span>`],
      ['EPS Büy. <tag>YoY</tag>', s.epsGrowthTTMYoy, v=>`<span class="${v>=0?'up':'dn'}">${v>=0?'+':''}${v.toFixed(1)}%</span>`],
    ]},
    {t:'Temettü & Sağlık', rows:[
      ['Temettü <tag>yıllık</tag>', s.dividendYieldIndicatedAnnual, v=>`<span class="up">${v.toFixed(2)}%</span>`, 'dval-div'],
      ['Borç/Özkaynak <tag>FQ</tag>', s['totalDebt/totalEquityAnnual'], v=>v.toFixed(1), 'dval-de'],
      ['Cari Oran <tag>FQ</tag>', s.currentRatioAnnual, v=>v.toFixed(2), 'dval-cr'],
    ]},
  ];

  document.getElementById('dbody').innerHTML = G.map(g=>`
    <div class="dsection">
      <div class="dstitle">${g.t}</div>
      ${g.rows.map(([k,v,fmt,id])=>{
        const d = (v===null||v===undefined) ? nil : fmt(v);
        const idAttr = id ? ` id="${id}"` : '';
        return `<div class="drow"><span class="dkey">${k}</span><span class="dval"${idAttr}>${d}</span></div>`;
      }).join('')}
    </div>`).join('');

  document.getElementById('detail').classList.add('open');
  _updateDetailNavPos();
  // Panel transition bitmesini bekle (200ms)
  setTimeout(function(){ updateChart(sym); }, 260);

  document.getElementById('dextra-tabs').style.display = 'flex';
  _detailStock = s;
  switchXTab(document.querySelector('.dxtab[data-xtab="fundamentals"]'));
}

let lwChart = null;
let lwSeries = null;
let lwVolSeries = null;
let lwIndSeries = {};
let lwCandles = [];

// ── İndikatör hesaplama ──
function calcSMA(data, period) {
  return data.map((d, i) => {
    if (i < period - 1) return null;
    const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b.close, 0);
    return { time: d.time, value: sum / period };
  }).filter(Boolean);
}

function calcEMA(data, period) {
  const k = 2 / (period + 1);
  let ema = data[0].close;
  return data.map((d, i) => {
    if (i === 0) { ema = d.close; return { time: d.time, value: ema }; }
    ema = d.close * k + ema * (1 - k);
    return { time: d.time, value: ema };
  });
}

function calcBB(data, period = 20, mult = 2) {
  const upper = [], lower = [], mid = [];
  data.forEach((d, i) => {
    if (i < period - 1) return;
    const slice = data.slice(i - period + 1, i + 1).map(x => x.close);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const std = Math.sqrt(slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period);
    mid.push({ time: d.time, value: mean });
    upper.push({ time: d.time, value: mean + mult * std });
    lower.push({ time: d.time, value: mean - mult * std });
  });
  return { upper, mid, lower };
}


// ── Modal Lazy Render ────────────────────────────
var _modalsRendered = false;
function _ensureModals() {
  if (_modalsRendered) return;
  _modalsRendered = true;
  var im = document.getElementById('infoModal');
  var sm = document.getElementById('supportModal');
  if (im) im.addEventListener('click', function(e){ if(e.target===this) closeInfo(); });
  if (sm) sm.addEventListener('click', function(e){ if(e.target===this) closeSupport(); });
}
// ────────────────────────────────────────────────

// ── LightweightCharts lazy loader ──────────────────
var _lcLoading = false;
var _lcLoaded  = (typeof LightweightCharts !== "undefined");
var _lcQueue   = [];

function _loadLightweightCharts(cb) {
  if (_lcLoaded) { cb(); return; }
  _lcQueue.push(cb);
  if (_lcLoading) return;
  _lcLoading = true;
  var script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/lightweight-charts@4.1.3/dist/lightweight-charts.standalone.production.js';
  script.onload = function() {
    _lcLoaded = true; _lcLoading = false;
    _lcQueue.forEach(function(fn){ fn(); }); _lcQueue = [];
  };
  script.onerror = function() {
    _lcLoading = false;
    _lcQueue.forEach(function(fn){ fn(); }); _lcQueue = [];
  };
  document.head.appendChild(script);
}
// ────────────────────────────────────────────────────

function applyIndicators() {
  if (!lwCandles.length || !lwChart) return;

  // Temizle
  Object.values(lwIndSeries).forEach(s => { try { lwChart.removeSeries(s); } catch(e){} });
  lwIndSeries = {};
  if (lwVolSeries) { try { lwChart.removeSeries(lwVolSeries); } catch(e){} lwVolSeries = null; }

  const active = [...document.querySelectorAll('.itab.on')].map(t => t.dataset.ind);

  if (active.includes('MA20')) {
    const s = lwChart.addLineSeries({ color: '#3b82f6', lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
    s.setData(calcSMA(lwCandles, 20));
    lwIndSeries['MA20'] = s;
  }
  if (active.includes('MA50')) {
    const s = lwChart.addLineSeries({ color: '#f59e0b', lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
    s.setData(calcSMA(lwCandles, 50));
    lwIndSeries['MA50'] = s;
  }
  if (active.includes('EMA20')) {
    const s = lwChart.addLineSeries({ color: '#8b5cf6', lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
    s.setData(calcEMA(lwCandles, 20));
    lwIndSeries['EMA20'] = s;
  }
  if (active.includes('BB')) {
    const bb = calcBB(lwCandles);
    const su = lwChart.addLineSeries({ color: 'rgba(14,165,233,.5)', lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
    const sm = lwChart.addLineSeries({ color: 'rgba(14,165,233,.35)', lineWidth: 1, lineStyle: 1, priceLineVisible: false, lastValueVisible: false });
    const sl = lwChart.addLineSeries({ color: 'rgba(14,165,233,.5)', lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
    su.setData(bb.upper); sm.setData(bb.mid); sl.setData(bb.lower);
    lwIndSeries['BB_u'] = su; lwIndSeries['BB_m'] = sm; lwIndSeries['BB_l'] = sl;
  }
  if (active.includes('VOL')) {
    lwVolSeries = lwChart.addHistogramSeries({
      color: 'rgba(16,185,129,.35)',
      priceFormat: { type: 'volume' },
      priceScaleId: 'vol',
      scaleMargins: { top: 0.8, bottom: 0 },
    });
    const volData = lwCandles.map(c => ({
      time: c.time,
      value: c.volume || 0,
      color: c.close >= c.open ? 'rgba(16,185,129,.35)' : 'rgba(244,63,94,.3)'
    }));
    lwVolSeries.setData(volData);
  }
}


function updateChart(sym) {
  if (!sym) return;
  var container = document.getElementById('tv-chart-container');
  if (!container) return;

  var indTabs = document.getElementById('ind-tabs');
  if (indTabs) indTabs.style.display = '';

  var ctabEl = document.querySelector('.ctab.on');
  var interval = ctabEl ? (ctabEl.dataset.interval || 'D') : 'D';

  var exMeta = EXCHANGE_META[currentExchange] || EXCHANGE_META.bist;
  var suffix = encodeURIComponent(exMeta.symSuffix || '');

  var isDark = typeof _isDark === 'function' ? _isDark() : false;
  var bg      = isDark ? '#0e1828' : '#ffffff';
  var textClr = isDark ? '#7a8fb0' : '#3a4760';
  var gridClr = isDark ? '#1a2840' : '#e6ebf0';
  var grid2   = isDark ? '#2d4060' : '#c8d2dd';

  container.innerHTML = '<div id="uc-loading" style="display:flex;align-items:center;justify-content:center;height:100%;color:'+textClr+';font-size:12px;">Grafik yükleniyor…</div>';

  _loadLightweightCharts(function() {
    if (!window.LightweightCharts) {
      container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:'+textClr+';font-size:12px;">Grafik yüklenemedi</div>';
      return;
    }

    var url = '/api/scan?action=chart&symbol=' + encodeURIComponent(sym) + '&interval=' + interval + '&currency=TL&suffix=' + suffix;
    fetch(url)
      .then(function(r){ return r.json(); })
      .then(function(data) {
        if (!data || data.s !== 'ok' || !data.candles || !data.candles.length) {
          container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:'+textClr+';font-size:12px;">Veri bulunamadı</div>';
          return;
        }
        var seen = {};
        lwCandles = data.candles
          .map(function(c){ return {time:c.t, open:c.o, high:c.h, low:c.l, close:c.c, volume:c.v||0}; })
          .filter(function(c){ return c.open!=null && c.close!=null; })
          .sort(function(a,b){ return a.time - b.time; })
          .filter(function(c){ if(seen[c.time]) return false; seen[c.time]=1; return true; });

        container.innerHTML = '';
        if (lwChart) { try { lwChart.remove(); } catch(e){} lwChart=null; lwSeries=null; lwVolSeries=null; lwIndSeries={}; }
        lwChart = LightweightCharts.createChart(container, {
          autoSize: true,
          layout: { background: {color: bg}, textColor: textClr, fontSize: 11, fontFamily: 'Inter, sans-serif' },
          grid: { vertLines: {color: gridClr, style: 1}, horzLines: {color: gridClr, style: 1} },
          crosshair: { mode: LightweightCharts.CrosshairMode.Normal, vertLine: {color: grid2, labelBackgroundColor: textClr}, horzLine: {color: grid2, labelBackgroundColor: textClr} },
          rightPriceScale: { borderColor: gridClr, textColor: textClr },
          timeScale: { borderColor: gridClr, textColor: textClr, timeVisible: true, secondsVisible: false },
          handleScroll: true, handleScale: true,
        });
        lwSeries = lwChart.addCandlestickSeries({
          upColor: '#10b981', downColor: '#f43f5e',
          borderUpColor: '#10b981', borderDownColor: '#f43f5e',
          wickUpColor: '#10b981', wickDownColor: '#f43f5e',
        });
        lwSeries.setData(lwCandles);
        lwChart.timeScale().fitContent();
        applyIndicators();
      })
      .catch(function() {
        container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:'+textClr+';font-size:12px;">Grafik yüklenemedi</div>';
      });
  });
}



function closeDetail(){
  document.getElementById('detail').classList.remove('open');
  selSym = null;
  if(allData.length) renderTable();
}

function detailNav(dir) {
  if (!selSym || !filtered || !filtered.length) return;
  var sorted_data = sorted(filtered);
  var idx = sorted_data.findIndex(function(s){ return s.symbol === selSym; });
  if (idx === -1) return;
  var next = sorted_data[idx + dir];
  if (next) showDetail(next.symbol);
}

function _updateDetailNavPos() {
  var posEl = document.getElementById('dhead-pos');
  if (!posEl || !selSym || !filtered || !filtered.length) return;
  var sorted_data = sorted(filtered);
  var idx = sorted_data.findIndex(function(s){ return s.symbol === selSym; });
  posEl.textContent = (idx + 1) + ' / ' + sorted_data.length;
}

// ═══════════════════════════════════════════
// MODALS
// ═══════════════════════════════════════════
function openInfo() {
  document.getElementById('infoModal').classList.add('open');
}
function switchAssetTab(id, btn) {
  document.querySelectorAll('.ib-panel').forEach(function(p){ p.classList.remove('active'); });
  document.querySelectorAll('.ib-btn').forEach(function(b){
    b.classList.remove('active');
    if (!btn && b.getAttribute('onclick') && b.getAttribute('onclick').indexOf("'" + id + "'") !== -1) btn = b;
  });
  var panel = document.getElementById('asset-panel-' + id);
  if (panel) panel.classList.add('active');
  if (btn) btn.classList.add('active');
}
function closeInfo(){ document.getElementById('infoModal').classList.remove('open'); }
function openSupport(){ document.getElementById('supportModal').classList.add('open'); }
function closeSupport(){ document.getElementById('supportModal').classList.remove('open'); }

document.getElementById('infoModal').addEventListener('click', function(e){ if(e.target===this) closeInfo(); });
document.getElementById('supportModal').addEventListener('click', function(e){ if(e.target===this) closeSupport(); });
document.addEventListener('keydown', e=>{ if(e.key==='Escape'){ closeInfo(); closeSupport(); }});

function copyWallet(btn, addr){
  navigator.clipboard.writeText(addr).then(()=>{
    btn.textContent='✓ KOPYALANDI'; btn.classList.add('copied');
    setTimeout(()=>{ btn.textContent='KOPYALA'; btn.classList.remove('copied'); }, 2000);
  }).catch(()=>{
    const ta=document.createElement('textarea');
    ta.value=addr; ta.style.cssText='position:fixed;opacity:0';
    document.body.appendChild(ta); ta.select(); document.execCommand('copy');
    document.body.removeChild(ta);
    btn.textContent='✓ KOPYALANDI'; btn.classList.add('copied');
    setTimeout(()=>{ btn.textContent='KOPYALA'; btn.classList.remove('copied'); }, 2000);
  });
}

// ═══════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════
function showState(id){
  ['empty','loading','errstate','twrap','prescan-view'].forEach(function(s){
    var el = document.getElementById(s);
    if (!el) return;
    var show = s === id;
    el.style.display = show ? (s==='twrap'?'block': s==='prescan-view'?'':'flex') : 'none';
  });
  var scanHead = document.getElementById('df-scan-head');
  if (scanHead) scanHead.style.display = (id === 'prescan-view') ? '' : 'none';
  // Hide screener-layout when showing prescan (prescan-view floats on scan-page canvas)
  var screenerLayout = document.getElementById('screener-layout');
  if (screenerLayout) {
    screenerLayout.style.display = (id === 'prescan-view') ? 'none' : '';
  }
  // Toggle scan-page scroll mode for prescan (canvas needs to be scrollable)
  var scanPage = document.querySelector('.scan-page');
  if (scanPage) scanPage.classList.toggle('psv-active', id === 'prescan-view');
  const smEl = document.getElementById('scan-summary');
  if (smEl) smEl.style.display = id === 'twrap' ? 'flex' : 'none';
  const nsbEl = document.getElementById('new-scan-btn');
  if (nsbEl) nsbEl.style.display = id === 'twrap' ? 'inline-flex' : 'none';
  const afwEl = document.getElementById('add-filter-wrap');
  if (afwEl) afwEl.style.display = id === 'twrap' ? 'inline-flex' : 'none';
  if (id !== 'twrap') closeFilterDropdown();
  // Kolay görünümü twrap durumunu yansıtır
  if (typeof _applyScanMode === 'function') _applyScanMode();
  if (id === 'twrap' && _scanMode === 'kolay' && typeof renderKolay === 'function') renderKolay();
  // Loading/hata/boş durumda stats-bar da gizli — üst bar tek blok halinde değişir,
  // bayat değerler (önceki taramanın sayıları) loading sırasında görünmez
  if (id !== 'twrap') {
    const sbBar = document.getElementById('stats-bar');
    if (sbBar) sbBar.classList.remove('visible');
  }
}

function abortScan(){
  scanAborted = true;
  _scanRunning = false;
  document.getElementById('stopbtn').style.display = 'none';
  document.getElementById('scanbtn').disabled = false;
}

// ═══════════════════════════════════════════
// LİSTEYE EKLE (Watchlist Picker)
// ═══════════════════════════════════════════

function showWlPicker(evt, sym, ex) {
  evt.stopPropagation();
  var existing = document.getElementById('df-wl-picker');
  if (existing) { existing.remove(); return; }
  if (!_dfUser) { showToast('Listeye eklemek için giriş yapın'); return; }
  if (!_dfWatchlists.length) {
    fetch('/api/watchlists', { credentials: 'same-origin' })
      .then(function(r) { return r.json(); })
      .then(function(d) {
        _dfWatchlists = d.watchlists || [];
        _renderWlPicker(evt, sym, ex);
      }).catch(function() {});
    return;
  }
  _renderWlPicker(evt, sym, ex);
}

function _renderWlPicker(evt, sym, ex) {
  var rect = evt.target.getBoundingClientRect();
  var div = document.createElement('div');
  div.id = 'df-wl-picker';
  var left = Math.min(rect.left, window.innerWidth - 210);
  var top  = rect.bottom + 4;
  div.style.cssText = 'position:fixed;z-index:9999;background:var(--s1);border:1px solid var(--border);border-radius:8px;box-shadow:0 6px 20px rgba(0,0,0,.18);min-width:200px;max-width:240px;padding:6px 0;left:' + left + 'px;top:' + top + 'px;font-family:Inter,sans-serif';

  function sectionLabel(text) {
    var lbl = document.createElement('div');
    lbl.style.cssText = 'padding:4px 12px 2px;font-size:10px;font-weight:700;color:var(--text2);letter-spacing:.5px;text-transform:uppercase';
    lbl.textContent = text;
    div.appendChild(lbl);
  }

  function makeRow(icon, name, onclick) {
    var row = document.createElement('div');
    row.style.cssText = 'padding:7px 12px;cursor:pointer;font-size:12px;color:var(--text);display:flex;align-items:center;gap:8px;white-space:nowrap;overflow:hidden';
    row.innerHTML = '<span style="font-size:13px">' + esc(icon) + '</span><span style="flex:1;overflow:hidden;text-overflow:ellipsis">' + esc(name) + '</span>';
    row.onmouseenter = function() { row.style.background = 'var(--s2)'; };
    row.onmouseleave = function() { row.style.background = ''; };
    row.onclick = onclick;
    return row;
  }

  // ── Takip Listeleri ──
  if (_dfWatchlists.length) {
    sectionLabel('Takip Listeleri');
    _dfWatchlists.forEach(function(list) {
      div.appendChild(makeRow(list.icon || '⭐', list.name, function(e) {
        e.stopPropagation();
        div.remove(); document.removeEventListener('click', outsideHandler);
        addToWatchlistDirect(list.id, sym, ex);
      }));
    });
  }

  // ── Portföyler ──
  if (_dfPortfolios.length) {
    var sep = document.createElement('div');
    sep.style.cssText = 'height:1px;background:var(--border);margin:4px 0';
    div.appendChild(sep);
    sectionLabel('Portföyler');
    _dfPortfolios.forEach(function(pf) {
      var row = makeRow(pf.icon || '📊', pf.name, null);
      // Portföy satırına tıklayınca qty/cost formu açılır
      row.onclick = function(e) {
        e.stopPropagation();
        // Mevcut form varsa kaldır
        var existing = div.querySelector('.df-pf-form');
        if (existing && existing.dataset.pfid === pf.id) { existing.remove(); return; }
        if (existing) existing.remove();
        var form = document.createElement('div');
        form.className = 'df-pf-form';
        form.dataset.pfid = pf.id;
        form.style.cssText = 'padding:8px 12px;background:var(--s2);display:flex;flex-direction:column;gap:6px';
        form.innerHTML =
          '<div style="font-size:11px;color:var(--text2);font-weight:600">' + sym + ' → ' + pf.name + '</div>' +
          '<div style="display:flex;gap:6px">' +
            '<input id="df-pf-qty" type="number" placeholder="Adet" min="0.001" step="any" style="flex:1;width:0;background:var(--s1);border:1px solid var(--border);border-radius:5px;padding:5px 7px;font-size:11px;color:var(--text);outline:none">' +
            '<input id="df-pf-cost" type="number" placeholder="Maliyet" min="0" step="any" style="flex:1;width:0;background:var(--s1);border:1px solid var(--border);border-radius:5px;padding:5px 7px;font-size:11px;color:var(--text);outline:none">' +
          '</div>' +
          '<button style="background:var(--accent);color:#fff;border:none;border-radius:5px;padding:5px;font-size:11px;font-weight:700;cursor:pointer">+ Ekle</button>';
        form.querySelector('button').onclick = function(e) {
          e.stopPropagation();
          var qty  = parseFloat(form.querySelector('#df-pf-qty').value);
          var cost = parseFloat(form.querySelector('#df-pf-cost').value);
          if (isNaN(qty) || qty <= 0 || isNaN(cost) || cost < 0) { showToast('Adet ve maliyet girin'); return; }
          div.remove(); document.removeEventListener('click', outsideHandler);
          addToPortfolioDirect(pf.id, sym, ex, qty, cost);
        };
        row.insertAdjacentElement('afterend', form);
        setTimeout(function() { form.querySelector('#df-pf-qty').focus(); }, 50);
      };
      div.appendChild(row);
    });
  }

  if (!_dfWatchlists.length && !_dfPortfolios.length) {
    div.innerHTML = '<div style="padding:10px 14px;color:var(--text2);font-size:12px">Profil sayfasından liste oluşturun</div>';
  }

  document.body.appendChild(div);
  function outsideHandler(e) {
    if (!div.contains(e.target)) { div.remove(); document.removeEventListener('click', outsideHandler); }
  }
  setTimeout(function() { document.addEventListener('click', outsideHandler); }, 0);
}

function addToPortfolioDirect(pfId, sym, ex, qty, cost) {
  fetch('/api/portfolio/item', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ portfolioId: pfId, symbol: sym, exchange: ex || currentExchange, quantity: qty, avgCost: cost })
  }).then(function(r) { return r.json(); })
    .then(function(d) {
      if (d.error) { showToast('Hata: ' + d.error); return; }
      showToast('✓ ' + sym + ' portföye eklendi');
      if (d.portfolios) _dfPortfolios = d.portfolios;
    }).catch(function() { showToast('Bağlantı hatası'); });
}

function addToWatchlistDirect(listId, sym, ex) {
  fetch('/api/watchlists/item', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ listId: listId, symbol: sym, exchange: ex || currentExchange })
  }).then(function(r) { return r.json(); })
    .then(function(d) {
      if (d.error) { showToast('Hata: ' + d.error); return; }
      showToast('✓ ' + sym + ' listeye eklendi');
      if (d.watchlists) { _dfWatchlists = d.watchlists; renderTable(); }
    }).catch(function() { showToast('Bağlantı hatası'); });
}

// Boot
init();

// Kullanıcı oturum kontrolü
(function() {
  fetch('/api/auth/me', { credentials: 'same-origin' })
    .then(function(r) { return r.json(); })
    .then(function(d) {
      if (!d.user) return;
      _dfUser = d.user;
      _updateFavBtn();
      Promise.all([
        fetch('/api/watchlists', { credentials: 'same-origin' }).then(function(r){ return r.json(); }).then(function(wd){ _dfWatchlists = wd.watchlists || []; }).catch(function(){}),
        fetch('/api/portfolio',  { credentials: 'same-origin' }).then(function(r){ return r.json(); }).then(function(pd){ _dfPortfolios = pd.portfolios || []; }).catch(function(){})
      ]).then(function() {
        _updateFavBtn();
        if (allData.length) renderTable();
      });
      var btn = document.getElementById('profile-btn');
      if (!btn) return;
      btn.classList.add('logged-in');
      btn.title = d.user.name || d.user.email;
      var inner = document.getElementById('profile-btn-inner');
      if (inner) {
        if (d.user.picture) {
          inner.innerHTML = '<img class="pf-av" src="' + esc(safeUrl(d.user.picture)) + '" alt="">';
        } else {
          inner.textContent = (d.user.name || '?')[0].toUpperCase();
        }
      }
    })
    .catch(function() {});

  // ?wl= parametresi: watchlist'teki tüm hisseleri borsa farkı gözetmeksizin getir
  var wlId = new URLSearchParams(location.search).get('wl');
  if (wlId) {
    fetch('/api/watchlists', { credentials: 'same-origin' })
      .then(function(r) { return r.json(); })
      .then(function(d) {
        var list = (d.watchlists || []).find(function(l) { return l.id === wlId; });
        if (!list || !list.items || !list.items.length) return;

        var promises = list.items.map(function(item) {
          var sym = (item.symbol || '').toUpperCase();
          var ex  = (item.exchange || 'bist').toLowerCase();
          return fetch('/api/quote?sym=' + encodeURIComponent(sym) + '&ex=' + encodeURIComponent(ex), { credentials: 'same-origin' })
            .then(function(r) { return r.json(); })
            .then(function(q) {
              if (!q || q.error || q.close == null) return null;
              return {
                symbol:                       sym,
                name:                         q.name || q.description || sym,
                currentPrice:                 q.close || q.price || null,
                previousClose:                (q.close && q.changePct != null) ? q.close / (1 + q.changePct / 100) : null,
                changePercent:                q.changePct != null ? q.changePct : null,
                volume:                       q.volume  || null,
                exchangeId:                   ex,
                sector:                       q.sector  || null,
                peNormalizedAnnual:           q.pe      || null,
                pbAnnual:                     q.pb      || null,
                psTTM:                        q.ps      || null,
                peg:                          q.peg     || null,
                roeTTM:                       q.roe     || null,
                roaTTM:                       q.roa     || null,
                netProfitMarginTTM:           q.netMargin    || null,
                grossMarginTTM:               q.grossMargin  || null,
                dividendYieldIndicatedAnnual: q.dividendYield || null,
                'totalDebt/totalEquityAnnual': q.debtToEquity || null,
                currentRatioAnnual:           q.currentRatio || null,
                marketCapitalization:         null,
                piotroski:                    q.piotroski  || null,
                beta:                         q.beta       || null,
                high52:                       q.high52     || null,
                low52:                        q.low52      || null,
                perfW:                        q.perfW      || null,
                perf1M:                       q.perf1M     || null,
                perfY:                        q.perfY      || null,
                rsi14:                        null,
                techRating:                   null,
              };
            })
            .catch(function() { return null; });
        });

        Promise.all(promises).then(function(results) {
          var items = results.filter(Boolean);
          if (!items.length) return;
          allData  = items;
          filtered = items.slice();
          showState('twrap');
          renderTable();
          if (typeof updateStatsBar === 'function') updateStatsBar();
          document.getElementById('scann').textContent = items.length;
          showToast('★ ' + list.name + ' (' + items.length + ' hisse)');
        });
      })
      .catch(function() {});
  }
})();

// ── CHART TAB LISTENERS ──
document.getElementById('chart-tabs').addEventListener('click', e => {
  const itab = e.target.closest('.ctab');
  const ctab = e.target.closest('.ctab-cur');
  if(itab){
    document.querySelectorAll('#chart-tabs .ctab').forEach(t=>t.classList.remove('on'));
    itab.classList.add('on');
    if(selSym) updateChart(selSym);
  }
  if(ctab){
    document.querySelectorAll('.ctab-cur').forEach(t=>t.classList.remove('on'));
    ctab.classList.add('on');
    if(selSym) updateChart(selSym);
  }
});

document.getElementById('ind-tabs').addEventListener('click', e => {
  const itab = e.target.closest('.itab');
  if(!itab) return;
  itab.classList.toggle('on');
  applyIndicators();
});

// ══════════════════════════════════════════
// DETAY ALT SEKMELERİ
// ══════════════════════════════════════════

function switchXTab(el) {
  if (!el) return;
  document.querySelectorAll('.dxtab').forEach(t => t.classList.remove('on'));
  document.querySelectorAll('.dxpanel').forEach(p => p.classList.remove('on'));
  el.classList.add('on');
  const tab = el.dataset.xtab;
  const panel = document.getElementById('dxpanel-' + tab);
  if (panel) panel.classList.add('on');
  if (tab === 'news'   && selSym)       fetchNews(selSym);
  if (tab === 'sector' && _detailStock) {
    if (_detailStock.sectorRaw) {
      fetchSectorComps(_detailStock);
    } else {
      var sb = document.getElementById('sector-body');
      if (sb) sb.innerHTML = '<div class="dxloading" style="color:var(--muted2)">Bu hisse için sektör verisi mevcut değil.</div>';
    }
  }
}

// ── Sektör Karşılaştırması ────────────────────────────────────
async function fetchSectorComps(s) {
  var el = document.getElementById('sector-body');
  if (!el) return;
  el.innerHTML = '<div class="dxloading">Sektör verisi yükleniyor...</div>';
  try {
    var r = await fetch('/api/fundamentals?type=sector_avg&sector=' + encodeURIComponent(s.sectorRaw) + '&exchange=' + (s.exchangeId || 'bist'));
    var d = await r.json();
    if (d.error) throw new Error(d.error);
    var avg = d.avg || {};
    var rows = [
      ['F/K',          s.peNormalizedAnnual,              avg.pe,            v=>v.toFixed(1)],
      ['PD/DD',        s.pbAnnual,                        avg.pb,            v=>v.toFixed(2)],
      ['F/S',          s.psTTM,                           avg.ps,            v=>v.toFixed(2)],
      ['PEG',          s.peg,                             avg.peg,           v=>v.toFixed(2)],
      ['ROE %',        s.roeTTM,                          avg.roe,           v=>v.toFixed(1)+'%'],
      ['ROA %',        s.roaTTM,                          avg.roa,           v=>v.toFixed(1)+'%'],
      ['Net Marj %',   s.netProfitMarginTTM,              avg.netMargin,     v=>v.toFixed(1)+'%'],
      ['Brüt Marj %',  s.grossMarginTTM,                  avg.grossMargin,   v=>v.toFixed(1)+'%'],
      ['Gelir Büy. %', s.revenueGrowthTTMYoy,             avg.revenueGrowth, v=>(v>=0?'+':'')+v.toFixed(1)+'%'],
      ['Temettü %',    s.dividendYieldIndicatedAnnual,    avg.dividendYield, v=>v.toFixed(2)+'%'],
      ['Borç/Özk.',    s['totalDebt/totalEquityAnnual'],  avg.debtToEquity,  v=>v.toFixed(2)],
      ['Cari Oran',    s.currentRatioAnnual,              avg.currentRatio,  v=>v.toFixed(2)],
    ];
    var higherIsBetter = { 'ROE %':1,'ROA %':1,'Net Marj %':1,'Brüt Marj %':1,'Gelir Büy. %':1,'Temettü %':1,'Cari Oran':1 };
    var lowerIsBetter  = { 'F/K':1,'PD/DD':1,'F/S':1,'PEG':1,'Borç/Özk.':1 };
    var tbody = rows.map(function(row) {
      var label = row[0], sv = row[1], av = row[2], fmt = row[3];
      var svStr = sv != null ? fmt(sv) : '—';
      var avStr = av != null ? fmt(av) : '—';
      var color = '';
      if (sv != null && av != null) {
        var better = higherIsBetter[label] ? sv > av : lowerIsBetter[label] ? sv < av : null;
        color = better === true ? 'var(--green)' : better === false ? 'var(--red)' : '';
      }
      return '<tr>'
        + '<td style="color:var(--muted2)">' + label + '</td>'
        + '<td style="font-weight:700;color:' + (color||'var(--text)') + '">' + svStr + '</td>'
        + '<td style="color:var(--text2)">' + avStr + '</td>'
        + '</tr>';
    }).join('');
    el.innerHTML =
      '<div style="font-size:9px;color:var(--muted2);margin-bottom:8px;padding:0 4px">'
      + 'Sektör: <strong style="color:var(--text)">' + esc(s.sector||s.sectorRaw) + '</strong>'
      + ' &nbsp;·&nbsp; ' + (d.count||0) + ' şirket ortalaması'
      + '</div>'
      + '<table style="width:100%;border-collapse:collapse;font-size:11px;">'
      + '<thead><tr style="border-bottom:1px solid var(--border)">'
      + '<th style="text-align:left;padding:4px;color:var(--muted2);font-weight:600">Metrik</th>'
      + '<th style="text-align:right;padding:4px;color:var(--muted2);font-weight:600">Bu Hisse</th>'
      + '<th style="text-align:right;padding:4px;color:var(--muted2);font-weight:600">Sektör Ort.</th>'
      + '</tr></thead>'
      + '<tbody>' + tbody + '</tbody>'
      + '</table>';
  } catch(e) {
    console.error('[sector-comps]', e.message);
    var el2 = document.getElementById('sector-body');
    if(el2) el2.innerHTML = '<div class="dxerror">&#9888; Sektör verisi alınamadı.</div>';
  }
}

function selectExchange(el) {
  if(el.classList.contains('disabled')) return;
  document.querySelectorAll('.exbtn').forEach(b => b.classList.remove('on'));
  el.classList.add('on');
  currentExchange = el.dataset.exchange;
  document.querySelectorAll('#adv-ex-grid .exbtn').forEach(p => {
    p.classList.toggle('on', p.dataset.exchange === currentExchange);
  });
  // Veri sıfırla
  allData = []; filtered = []; selSym = null;
  closeDetail();
  showState('empty');
  const meta = EXCHANGE_META[currentExchange];
  if(meta) {
    // TL sekmesi sadece BIST'te görünür
    const tlTab = document.querySelector('.ctab-cur[data-currency="TL"]');
    const usdTab = document.querySelector('.ctab-cur[data-currency="USD"]');
    if(meta.currencyCode !== 'TRY') {
      if(tlTab) tlTab.style.display = 'none';
      if(usdTab) { usdTab.classList.add('on'); if(tlTab) tlTab.classList.remove('on'); }
    } else {
      if(tlTab) tlTab.style.display = '';
    }
  }
  // Otomatik tarama
  runScan();
  // Mobil: borsa değişince drawer'ı kapat
  if (window.innerWidth <= 768) { try { closeMobileDrawer(); } catch(e){} }
}

function updateStatsBar() {
  var bar = document.getElementById('stats-bar');
  bar.style.display = '';      // inline display:none'u temizle
  bar.classList.add('visible');
  // Toolbar'daki hisse-only butonları göster
  var tbFav = document.getElementById('tb-fav-btn');
  var tbCol = document.getElementById('tb-col-btn');
  var tbDens = document.getElementById('density-toggle');
  var tbExp = document.getElementById('tb-export-btn');
  var tbSaved = document.getElementById('saved-scans-wrap');
  if (tbFav) tbFav.style.display = '';
  if (tbCol) tbCol.style.display = '';
  if (tbDens) tbDens.style.display = 'flex';
  if (tbExp) tbExp.style.display = '';
  if (tbSaved) tbSaved.style.display = 'flex';
  var upCount = filtered.filter(function(s){ return s.changePercent > 0; }).length;
  var dnCount = filtered.filter(function(s){ return s.changePercent < 0; }).length;
  var ex = (typeof EXCHANGE_META !== 'undefined' ? EXCHANGE_META[currentExchange] : null) || {};
  var now = new Date();
  var hh = String(now.getHours()).padStart(2,'0');
  var mm = String(now.getMinutes()).padStart(2,'0');
  var ss = String(now.getSeconds()).padStart(2,'0');
  document.getElementById('sb-count').textContent = filtered.length;
  document.getElementById('sb-up').textContent = '▲ ' + upCount;
  document.getElementById('sb-dn').textContent = '▼ ' + dnCount;
  document.getElementById('sb-ex').textContent = ex.name || currentExchange.toUpperCase();
  document.getElementById('sb-time').textContent = hh + ':' + mm;
  var assetEl = document.getElementById('sb-asset');
  if (assetEl) assetEl.textContent = (_activeAsset === 'kripto') ? 'Kripto' : (_activeAsset === 'fon') ? 'Fon' : 'Hisse';
}

function updateTicker() {
  var track = document.getElementById('ticker-track');
  if (!track) return;
  var src;
  if (_activeAsset === 'fon') src = _fonTicker;
  else if (_activeAsset === 'kripto') src = _kriptoTicker;
  else src = (typeof filtered !== 'undefined') ? filtered : [];
  if (!src || !src.length) return;
  var top = src.slice(0, 20);
  var items = top.concat(top);

  if (_activeAsset === 'fon') {
    track.innerHTML = items.map(function(f) {
      var ret = f.ret1m != null ? f.ret1m : f.ret1y;
      var cls = ret > 0 ? 'up' : (ret < 0 ? 'dn' : '');
      var arrow = ret > 0 ? '▲' : (ret < 0 ? '▼' : '');
      var retStr = ret != null ? arrow + ' ' + Math.abs(ret).toFixed(1) + '%' : '—';
      return '<span class="ticker-item"><span class="ticker-sym">'+f.code+'</span>'
        +'<span class="ticker-px">₺'+(f.price||0).toFixed(2)+'</span>'
        +'<span class="ticker-chg '+cls+'">'+retStr+'</span></span>';
    }).join('');
  } else if (_activeAsset === 'kripto') {
    var fP = function(v){ if(!v) return '—'; if(v>=1000) return '$'+v.toLocaleString('en',{maximumFractionDigits:0}); if(v>=1) return '$'+v.toFixed(2); if(v>=0.01) return '$'+v.toFixed(4); return '$'+v.toFixed(6); };
    track.innerHTML = items.map(function(c) {
      var chg = c.change24h;
      var cls = chg > 0 ? 'up' : (chg < 0 ? 'dn' : '');
      var arrow = chg > 0 ? '▲' : (chg < 0 ? '▼' : '');
      var chgStr = chg != null ? arrow + ' ' + Math.abs(chg).toFixed(2) + '%' : '—';
      return '<span class="ticker-item"><span class="ticker-sym">'+((c.symbol||'').toUpperCase())+'</span>'
        +'<span class="ticker-px">'+fP(c.price)+'</span>'
        +'<span class="ticker-chg '+cls+'">'+chgStr+'</span></span>';
    }).join('');
  } else {
    track.innerHTML = items.map(function(s) {
      var chg = s.changePercent;
      var cls = chg > 0 ? 'up' : (chg < 0 ? 'dn' : '');
      var arrow = chg > 0 ? '▲' : (chg < 0 ? '▼' : '');
      var px = s.currentPrice != null ? s.currentPrice.toFixed(2) : '—';
      var chgStr = chg != null ? arrow + ' ' + Math.abs(chg).toFixed(2) + '%' : '—';
      return '<span class="ticker-item"><span class="ticker-sym">'+(s.symbol||s.name)+'</span>'
        +'<span class="ticker-px">'+px+'</span>'
        +'<span class="ticker-chg '+cls+'">'+chgStr+'</span></span>';
    }).join('');
  }
}

function showFooterModal(type) {
  var titles = {
    about:        'HAKKIMIZDA',
    mission:      'MİSYON & VİZYON',
    contact:      'İLETİŞİM',
    disclaimer:   'YASAL UYARI',
    privacy:      'GİZLİLİK POLİTİKASI',
    terms:        'KULLANIM KOŞULLARI',
    cookies:      'ÇEREZ POLİTİKASI',
    teknikanaliz: 'TEKNİK ANALİZ STRATEJİLERİ'
  };
  var contents = {
    about: `<p><strong style="color:var(--text)">DeepFin</strong>, Türkiye ve küresel piyasalarda yatırım yapan bireysel yatırımcılar için geliştirilmiş profesyonel bir hisse tarama ve finansal analiz platformudur.</p>
<p>Platform; BIST, NASDAQ, NYSE, S&P 500, DAX, LSE ve Nikkei borsalarındaki binlerce hisseyi gerçek zamanlı verilerle tarayarak, Warren Buffett, Benjamin Graham, Peter Lynch, Mark Minervini gibi efsanevi yatırımcıların stratejilerini otomatik olarak uygular.</p>
<p>DeepFin, karmaşık finansal analizleri herkesin kolayca kullanabileceği bir arayüze dönüştürmeyi hedefler. Kurumsal yatırımcıların kullandığı araçları bireysel yatırımcıya ulaştırmak temel amacımızdır.</p>
<p style="color:var(--muted2);font-size:11px;margin-top:16px;">Geliştirici iletişim için destek butonunu kullanabilirsiniz.</p>`,

    mission: `<p><strong style="color:var(--text)">Misyonumuz:</strong> Finansal piyasalardaki bilgi asimetrisini ortadan kaldırmak. Kurumsal yatırımcıların yıllardır kullandığı tarama ve analiz araçlarını, bireysel yatırımcıya ücretsiz ve erişilebilir biçimde sunmak.</p>
<p><strong style="color:var(--text)">Vizyonumuz:</strong> Türkiye'nin ve dünyanın en kapsamlı bireysel yatırımcı platformu olmak. Her yatırım kararının veriye dayalı, şeffaf ve bilinçli alınmasına katkı sağlamak.</p>
<p><strong style="color:var(--text)">Değerlerimiz:</strong></p>
<ul style="padding-left:16px;line-height:2;">
  <li>Şeffaflık — Veri kaynakları ve metodoloji açık</li>
  <li>Erişilebilirlik — Ücretsiz temel özellikler</li>
  <li>Doğruluk — Gerçek zamanlı, güvenilir veri</li>
  <li>Eğitim — Kullanıcıyı bilinçli yatırımcıya dönüştürme</li>
</ul>`,

    contact: `<p><strong style="color:var(--text)">İletişim</strong></p>
<p>Öneri, hata bildirimi veya iş birliği talepleriniz için:</p>
<div style="background:var(--s2);border:1px solid var(--border);border-radius:8px;padding:16px;margin:12px 0;line-height:2;">
  <div>📧 <strong style="color:var(--text)">E-posta:</strong> destek@deepfin.app</div>
  <div>🐦 <strong style="color:var(--text)">Twitter/X:</strong> @deepfinapp</div>
  <div>💬 <strong style="color:var(--text)">Discord:</strong> discord.gg/deepfin</div>
</div>
<p style="font-size:11px;color:var(--muted2);">Yanıt süresi genellikle 24–48 saattir. Platform içindeki "Destek Ol" butonu üzerinden de ulaşabilirsiniz.</p>`,

    disclaimer: `<p><strong style="color:var(--red)">⚠️ Önemli Yasal Uyarı</strong></p>
<p>DeepFin platformunda sunulan tüm bilgi, veri, analiz ve içerikler <strong style="color:var(--text)">yalnızca bilgilendirme amaçlıdır</strong> ve yatırım tavsiyesi niteliği taşımaz.</p>
<p>Platform üzerindeki hiçbir içerik; herhangi bir menkul kıymetin alım, satım veya elde tutulmasına yönelik tavsiye, öneri veya teşvik olarak yorumlanamaz.</p>
<p>Yatırım kararları kişisel mali durumunuza, risk toleransınıza ve yatırım hedeflerinize göre değişir. Her türlü yatırım kararından önce lisanslı bir yatırım danışmanına başvurmanız tavsiye edilir.</p>
<p>Geçmiş performans gelecekteki sonuçları garanti etmez. Tüm yatırımlar risk içerir ve yatırılan tutarın tamamı kaybedilebilir.</p>
<p style="font-size:11px;color:var(--muted2);margin-top:16px;">Veri sağlayıcılarının hizmet kesintileri veya veri hataları nedeniyle oluşabilecek zararlardan DeepFin sorumlu tutulamaz.</p>`,

    privacy: `<p><strong style="color:var(--text)">Gizlilik Politikası</strong></p>
<p>DeepFin olarak kullanıcı gizliliğine büyük önem veriyoruz.</p>
<p><strong style="color:var(--text)">Topladığımız veriler:</strong> Platform tamamen istemci taraflı çalışır. Kişisel veri toplamaz, üye kaydı gerektirmez. Kullanım istatistikleri (sayfa görüntüleme, anonim) analitik amaçlı toplanabilir.</p>
<p><strong style="color:var(--text)">Üçüncü taraf servisleri:</strong> Veriler çeşitli ulusal ve uluslararası finansal veri sağlayıcılarından çekilir. Bu servislerin kendi gizlilik politikaları geçerlidir.</p>
<p><strong style="color:var(--text)">Çerezler:</strong> Oturum ve tercih bilgilerini saklamak için minimal çerez kullanılabilir. Reklam amaçlı çerez kullanılmaz.</p>
<p style="font-size:11px;color:var(--muted2);margin-top:16px;">Son güncelleme: Ocak 2026</p>`,

    terms: `<p><strong style="color:var(--text)">Kullanım Koşulları</strong></p>
<p>DeepFin'i kullanarak aşağıdaki koşulları kabul etmiş sayılırsınız:</p>
<ul style="padding-left:16px;line-height:2.2;font-size:12px;">
  <li>Platform yalnızca kişisel, ticari olmayan amaçlarla kullanılabilir.</li>
  <li>Platform verilerini otomatik araçlarla toplamak (scraping) yasaktır.</li>
  <li>DeepFin içerikleri kaynak gösterilmeden kopyalanamaz veya dağıtılamaz.</li>
  <li>Platform üzerinden sunulan bilgiler yatırım tavsiyesi değildir.</li>
  <li>Servis kesintisi veya veri hataları nedeniyle oluşacak kayıplardan DeepFin sorumlu değildir.</li>
  <li>Koşullar önceden bildirimde bulunmaksızın değiştirilebilir.</li>
</ul>
<p style="font-size:11px;color:var(--muted2);margin-top:12px;">Son güncelleme: Ocak 2026</p>`,

    cookies: `<p><strong style="color:var(--text)">Çerez Politikası</strong></p>
<p>DeepFin minimal çerez kullanır. Reklam veya izleme amaçlı çerez kullanılmaz.</p>
<div style="background:var(--s2);border:1px solid var(--border);border-radius:8px;padding:16px;margin:12px 0;font-size:12px;line-height:2;">
  <div><strong style="color:var(--text)">Zorunlu Çerezler:</strong> Oturum yönetimi ve tercih kaydetme</div>
  <div><strong style="color:var(--text)">Analitik Çerezler:</strong> Anonim kullanım istatistikleri (opsiyonel)</div>
  <div><strong style="color:var(--text)">Reklam Çerezleri:</strong> Kullanılmaz ✓</div>
  <div><strong style="color:var(--text)">3. Taraf İzleme:</strong> Kullanılmaz ✓</div>
</div>
<p>Tarayıcı ayarlarından çerezleri devre dışı bırakabilirsiniz. Bu durumda bazı tercihler kaydedilemeyebilir.</p>
<p style="font-size:11px;color:var(--muted2);">Son güncelleme: Ocak 2026</p>`,

    teknikanaliz: `
<p style="color:var(--muted);font-size:11px;margin-bottom:16px;">26 teknik gösterge kullanılarak hesaplanan gerçek zamanlı sinyaller. Her preset farklı bir piyasa durumuna veya strateji felsefesine karşılık gelir.</p>

<div class="fbk-section">
  <div class="fbk-section-title">📈 Trend & Kırılım Presetleri</div>

  <div class="fbk-card">
    <div class="fbk-card-header"><span class="fbk-chip">Kırılım</span><span class="fbk-tag">Minervini SEPA</span></div>
    <p>52 haftalık zirvesine yakın, hacim destekli, teknik göstergelerin alım verdiği hisseler. Mark Minervini'nin SEPA (Specific Entry Point Analysis) kırılım koşuluna dayanır. Güçlü trendlerin başlangıç noktasını yakalar.</p>
    <div class="fbk-filters">zirveye %5 mesafe · günlük &gt; %1.5 · teknik skor &gt; 0.1</div>
  </div>

  <div class="fbk-card">
    <div class="fbk-card-header"><span class="fbk-chip">Zirveye Yakın</span><span class="fbk-tag">Trend Devam</span></div>
    <p>52 haftalık zirvesinin %5'i yakınında VE son 3 ayda en az %5 kazanmış hisseler. Güçlü trendin devam ettiğini gösteren, sürüş biter bitmez alım noktasını işaret eder.</p>
    <div class="fbk-filters">zirveye %5 mesafe · 3 ay getiri &gt; %5</div>
  </div>

  <div class="fbk-card">
    <div class="fbk-card-header"><span class="fbk-chip">Belirgin Trend</span><span class="fbk-tag">Minervini Template</span></div>
    <p>52 hafta düşüğünden %25+ yukarıda, 6 aylık getiri pozitif. Minervini'nin "Trend Template" kriterinin basitleştirilmiş versiyonu — sadece yapısal olarak güçlü hisseler taranır.</p>
    <div class="fbk-filters">52H düşüğünden %25+ · 6 ay getiri &gt; %10</div>
  </div>

  <div class="fbk-card">
    <div class="fbk-card-header"><span class="fbk-chip">Sağlıklı Çekilme</span><span class="fbk-tag">Trend İçi Fırsat</span></div>
    <p>Zirveden %5–15 geri çekilen ama 6 aylık trendi hâlâ güçlü olan hisseler. Güçlü bir trendde normal konsolidasyon sırasında alım fırsatı sunar. "Pullback in uptrend" stratejisi.</p>
    <div class="fbk-filters">zirveden %5–15 geride · 6 ay getiri &gt; %15</div>
  </div>
</div>

<div class="fbk-section">
  <div class="fbk-section-title">📊 Momentum Presetleri</div>

  <div class="fbk-card">
    <div class="fbk-card-header"><span class="fbk-chip">3 Aylık Lider</span><span class="fbk-tag">Jegadeesh-Titman</span></div>
    <p>Son 3 ayda %15+, 6 ayda %20+ kazanan hisseler. Nobel ödüllü Jegadeesh ve Titman'ın momentum anomalisine dayanır: geçen dönemin en iyi hisseleri gelecek dönemde de outperform eder (3–12 aylık pencerede).</p>
    <div class="fbk-filters">3 ay getiri &gt; %15 · 6 ay getiri &gt; %20</div>
  </div>

  <div class="fbk-card">
    <div class="fbk-card-header"><span class="fbk-chip">Güçlü Gün</span><span class="fbk-tag">Katalizör Tespiti</span></div>
    <p>Bugün %2+ yükselen, normalin üzerinde hacimle desteklenen hisseler. Haber, kazanç açıklaması veya sektör rotasyonu gibi bir katalizörün varlığına işaret eder. Gün içi fırsat taraması.</p>
    <div class="fbk-filters">günlük değişim &gt; %2 · hacim &gt; 0.5M lot</div>
  </div>

  <div class="fbk-card">
    <div class="fbk-card-header"><span class="fbk-chip">Kurumsal Hacim</span><span class="fbk-tag">Büyük Para Tespiti</span></div>
    <p>Normalinin en az 2 katı hacim eşliğinde fiyat artışı. Büyük kurumsal oyuncuların (fon, banka) pozisyon açtığının teknik sinyali. "Follow the smart money" yaklaşımı.</p>
    <div class="fbk-filters">göreli hacim &gt; 2× · günlük değişim &gt; 0</div>
  </div>
</div>

<div class="fbk-section">
  <div class="fbk-section-title">🔄 RSI & Osilatör Presetleri</div>

  <div class="fbk-card">
    <div class="fbk-card-header"><span class="fbk-chip">Dip Fırsatı</span><span class="fbk-tag">Kontrarian</span></div>
    <p>Sert düşen, dibine yakın VE RSI 35 altında gerçekten aşırı satılmış hisseler. Piyasa paniğini fırsata çeviren kontrarian yaklaşım. Dikkat: aşırı satım düzelene kadar devam edebilir.</p>
    <div class="fbk-filters">from_high &lt; -20% · RSI &lt; 35</div>
  </div>

  <div class="fbk-card">
    <div class="fbk-card-header"><span class="fbk-chip">RSI Toparlanması</span><span class="fbk-tag">Erken Dönüş</span></div>
    <p>RSI 30–50 bandında: aşırı satım bölgesinden çıkmış, henüz aşırı alım bölgesine girmemiş hisseler. Dipten toparlanmanın erken aşamasını yakalar. En dengeli RSI bölgesi.</p>
    <div class="fbk-filters">RSI 30–50 · 52H düşüğünden %3+ yukarıda</div>
  </div>

  <div class="fbk-card">
    <div class="fbk-card-header"><span class="fbk-chip">26 Gösterge AL</span><span class="fbk-tag">Teknik Konsensüs</span></div>
    <p>26 teknik göstergeyi (RSI, MACD, ADX, Stochastic, 15 farklı hareketli ortalama) birleştiren bileşik teknik skorun 0.5 üzeri olduğu hisseler. Teknik analizin toplu onayı.</p>
    <div class="fbk-filters">Teknik skor &gt; 0.5 (26 gösterge çoğunluğu AL)</div>
  </div>
</div>

<p style="font-size:11px;color:var(--muted2);margin-top:16px;padding-top:12px;border-top:1px solid var(--border);">⚠️ Teknik presetler geçmiş fiyat hareketlerine dayanır. Geleceği garanti etmez. Temel analiz ile birlikte kullanılması önerilir.</p>
`
  };

  document.getElementById('footer-modal-title').textContent = titles[type] || '';
  document.getElementById('footer-modal-body').innerHTML = contents[type] || '';
  document.getElementById('footerModal').classList.add('open');
}

function closeFooterModal() {
  document.getElementById('footerModal').classList.remove('open');
}
// Footer scroll reveal — kaldırıldı

// ── ADV EXCHANGE SYNC ──
function advSelectExchange(el) {
  document.querySelectorAll('#adv-ex-grid .exbtn').forEach(b => b.classList.remove('on'));
  el.classList.add('on');
  const exKey = el.dataset.exchange;
  const mainBtn = document.querySelector('#sb-panel-basic .exbtn[data-exchange="' + exKey + '"]');
  if (mainBtn) selectExchange(mainBtn);
}

// ── SIDEBAR TABS ──
function switchSbTab(tab) {
  if (tab === 'advanced') {
    const cur = document.querySelector('.exbtn.on');
    if (cur) {
      const exKey = cur.dataset.exchange;
      document.querySelectorAll('#adv-ex-grid .exbtn').forEach(p => {
        p.classList.toggle('on', p.dataset.exchange === exKey);
      });
    }
  }
  // Chip durumlarını terk edilen panelden hedef panele aynala — mevcut filtre her sekmede görünsün
  var src = tab === 'advanced' ? BASIC_CHIP_CFG : ADV_CHIP_CFG;
  var dst = tab === 'advanced' ? ADV_CHIP_CFG   : BASIC_CHIP_CFG;
  [['goatId','goat-chip','goat'],['presetsId','chip','preset'],['techId','chip','tech']].forEach(function(m) {
    var onKeys = {};
    document.querySelectorAll('#' + src[m[0]] + ' .' + m[1] + '.on').forEach(function(c){ onKeys[c.dataset[m[2]]] = 1; });
    document.querySelectorAll('#' + dst[m[0]] + ' .' + m[1]).forEach(function(c){
      c.classList.toggle('on', !!onKeys[c.dataset[m[2]]]);
    });
  });
  document.getElementById('sb-panel-basic').style.display    = tab === 'basic'    ? '' : 'none';
  document.getElementById('sb-panel-advanced').style.display = tab === 'advanced' ? '' : 'none';
  document.getElementById('sb-tab-basic').classList.toggle('active',    tab === 'basic');
  document.getElementById('sb-tab-advanced').classList.toggle('active', tab === 'advanced');
}

// ── HOMEPAGE / SCREENER NAV ──


// ═══════════════════════════════════════════
// PROFİL — index.html stub (profil ayrı sayfa)
// ═══════════════════════════════════════════
function showProfil(sym, ex) {
  var exKey = ex || currentExchange;
  var d = allData.find(function(x){
    var s = (x.symbol||'').replace('.IS','').toUpperCase();
    return s === sym.toUpperCase() || (x.symbol||'').toUpperCase() === sym.toUpperCase()+'.IS';
  });
  var url = '/analiz/profile.html?sym=' + encodeURIComponent(sym) + '&ex=' + encodeURIComponent(exKey) + '&from=screener';
  if(d) {
    // Veriyi URL'e sıkıştırarak geçir (küçük key mapping)
    var compact = {
      n:   d.name||'',
      sc:  d.sector||'',
      // Fiyat — allData'da currentPrice olarak saklanıyor
      cl:  d.currentPrice||d.close||d.price||0,
      ch:  d.change_abs||0,
      ca:  d.changePercent||d.change||0,
      // Değerleme — allData'da Normalized alan adları
      pe:  d.peNormalizedAnnual||d.pe_ratio||0,
      pb:  d.pbAnnual||d.price_book_ratio||0,
      ps:  d.psTTM||d.price_sales||0,
      // Karlılık
      roe: d.roeTTM||d.roe||0,
      roa: d.roaTTM||d.roa||0,
      nm:  d.netProfitMarginTTM||d.net_margin||0,
      gm:  d.grossMarginTTM||d.gross_margin||0,
      // Büyüme
      rg:  d.revenueGrowthTTMYoy||d.revenue_growth_ttm_yoy||0,
      eg:  d.epsGrowthTTMYoy||d.earnings_per_share_change_ttm_yoy||0,
      // Diğer finansal
      peg: d.peg||d.peg_ratio||0,
      fs:  d.piotroski||d.piotroski_f_score,
      cr:  d.currentRatioAnnual||d.current_ratio||0,
      de:  d['totalDebt/totalEquityAnnual']||d.debt_to_equity||0,
      dy:  d.dividendYieldIndicatedAnnual||d.dividend_yield_recent||0,
      // Piyasa
      mc:  d.marketCapitalization||d.market_cap_basic||0,
      av:  d.avgVol10d||d.average_volume_10d_calc||0,
      bt:  d.beta||0,
      // 52 hafta — allData'da 52WeekHigh (gerçek 52H verisi)
      wh:  d['52WeekHigh']||d['52_week_high']||0,
      wl:  d['52WeekLow']||d['52_week_low']||0,
      // Performans
      pw:  d.perfW||d.Perf_W||0,
      pm:  d.perf1m||d.Perf_1M||0,
      py:  d.perfY||d.Perf_Y||0,
      cf:  d.cash_f_operating_activities||0
    };
    try {
      url += '&d=' + encodeURIComponent(btoa(JSON.stringify(compact)));
    } catch(e) {}
  }
  window.location.href = url;
}

function openDetayliAnaliz(sym, ex) {
  showProfil(sym, ex || currentExchange);
}

// ═══════════════════════════════════════════
// ANALİZ SAYFASI
// ═══════════════════════════════════════════

var _analizEx = 'bist';
var _analizExFlags = {
  bist: {flag:'tr', label:'BIST'},
  nasdaq: {flag:'us', label:'NASDAQ'},
  sp500: {flag:'us', label:'S&P 500'},
  dax: {flag:'de', label:'DAX'},
  lse: {flag:'gb', label:'LSE'},
  nikkei: {flag:'jp', label:'Nikkei'}
};

function showAnaliz() {
  window.location.href = '/analiz/';
}

function hideAnalizPage() {}

function onHemenAl(sym, ex) {
  // Affiliate linki — ileride broker bağlantısı eklenecek
  // Şimdilik placeholder
  var msg = sym + ' için işlem sayfası yakında aktif olacak!\nBroker entegrasyonu için bizi takip edin.';
  // Basit toast göster
  showToast('🛒 ' + sym + ' — Broker entegrasyonu yakında!');
}

function showToast(msg) {
  var t = document.getElementById('df-toast');
  if(!t) {
    t = document.createElement('div');
    t.id = 'df-toast';
    t.className = 'df-toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  void t.offsetWidth; // reflow → yeniden gösterimde geçiş tetiklensin
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(function(){ t.classList.remove('show'); }, 3000);
}
function showHomepage() {
  _doShowHomepage();
}
function _doShowHomepage() {
  hideAnalizPage();
  var _pp=document.getElementById('profile-page'); if(_pp){_pp.style.display='none';_pp.classList.remove('on');}
  // New page system
  if (document.getElementById('page-home')) {
    showPage('page-home');
    clearFilters();
    if(window.location.pathname !== '/') history.pushState({page:'home'}, '', '/');
    if (typeof loadRecentScans === 'function') loadRecentScans();
    return;
  }
  // Legacy fallback
  var hp = document.getElementById('homepage'); if (hp) hp.style.display = 'flex';
  var sl = document.getElementById('screener-layout'); if (sl) sl.style.display = 'none';
  var nh = document.getElementById('nav-home'); if (nh) nh.classList.add('active');
  var nt = document.getElementById('nav-tarama'); if (nt) nt.classList.remove('active');
  var na = document.getElementById('nav-analiz'); if(na) na.classList.remove('active');
  var dnh = document.getElementById('dnav-home'); if(dnh) dnh.classList.add('active');
  var dnt = document.getElementById('dnav-tarama'); if(dnt) dnt.classList.remove('active');
  clearFilters();
  var _hb = document.getElementById('hamburger-btn'); if(_hb) _hb.style.display = 'none';
  if(window.location.pathname !== '/') history.pushState({page:'home'}, '', '/');
  if (typeof loadRecentScans === 'function') loadRecentScans();
}

// ── DISCLAIMER POPUP ──
let disclaimerAccepted = false;


function updateExchangeBadge() {}
// ── TARAMA SÜRESİ / PHASE STEPPER ──
let scanStartTime = null;
let scanEtaTimer  = null;
let _scanMeta     = { strategy: null, exchange: null, total: 0, matches: 0, elapsed: 0 };
var _psvScanFilterCount = 0;   // filter count captured in psvScan, drives minimum display time
var _pendingScanResult  = undefined; // undefined = error/unset; null/value = success special
const EXCHANGE_ETA = { bist:4, nasdaq:6, sp500:6, dax:5, lse:5, nikkei:5, nyse:6, moex:5, france:5, amsterdam:5, brussels:5, lisbon:5, dublin:5, oslo:5, milan:5, tsx:6, twse:5, b3:5, hkex:6, china:6, saudi:5, switzerland:5, australia:5, southafrica:5, sweden:5, india:5, uae:5 };

// Phase thresholds in percent
const STEPPER_PHASES = [0, 8, 65, 80, 92];

function _setStepperPhase(activeIdx) {
  var items = document.querySelectorAll('#scan-stepper .sstep-item');
  items.forEach(function(item, i) {
    item.classList.remove('active', 'done');
    if (i < activeIdx) item.classList.add('done');
    else if (i === activeIdx) item.classList.add('active');
  });
}

function startScanEta(exchange, minMs) {
  var etaSec = EXCHANGE_ETA[exchange] || 5;
  var minSec = (minMs || 0) / 1000;
  var total  = Math.max(etaSec, minSec);
  scanStartTime = Date.now();
  clearInterval(scanEtaTimer);
  _setStepperPhase(0);
  scanEtaTimer = setInterval(function() {
    const elapsed = (Date.now() - scanStartTime) / 1000;
    const pct = Math.min((elapsed / total) * 100, 95);
    var phase = 0;
    for (var i = STEPPER_PHASES.length - 1; i >= 0; i--) {
      if (pct >= STEPPER_PHASES[i]) { phase = i; break; }
    }
    _setStepperPhase(phase);
  }, 300);
}

function stopScanEta() {
  clearInterval(scanEtaTimer);
  var items = document.querySelectorAll('#scan-stepper .sstep-item');
  items.forEach(function(item) { item.classList.remove('active'); item.classList.add('done'); });
}

// "Neden bu sonuçlar?" — aktif reçeteyi düz cümleye çevirir (Faz 1: açıklanabilirlik)
function _recipeSentence(filters, total, matches) {
  var exMeta = (typeof EXCHANGE_META !== 'undefined') ? EXCHANGE_META[currentExchange] : null;
  var exName = (exMeta && exMeta.name) || (currentExchange || '').toUpperCase();
  var assetWord = (_activeAsset === 'kripto') ? 'kripto' : (_activeAsset === 'fon') ? 'fon' : 'hisse';
  if (!filters || !filters.length) {
    return 'Tüm <b>' + esc(exName) + '</b> ' + assetWord + 'leri listeleniyor — henüz filtre uygulanmadı.';
  }
  var crit = filters.map(function(f) { return f.label; }).filter(Boolean).map(esc).join(' + ');
  var n = (matches != null) ? matches.toLocaleString('tr-TR') : '—';
  return '<b>' + esc(exName) + '</b> evreninde <b>' + crit + '</b> kriterleriyle eşleşen <b>' + n + '</b> aday.';
}

function showScanSummary(total, matches) {
  const el = document.getElementById('scan-summary');
  if (!el) return;
  const elapsed = scanStartTime ? ((Date.now() - scanStartTime) / 1000).toFixed(1) : '—';
  const filters = _scanMeta.filters || [];
  var tagsHtml = filters.map(function(f) {
    var xBtn = (f.kind && f.key)
      ? '<span class="ssm-tag-x" onclick="removeScanFilter(\'' + f.kind + '\',\'' + f.key + '\')" title="Bu filtreyi kaldır">×</span>'
      : '';
    return '<span class="ssm-tag"' + (f.desc ? ' data-haspopup="1"' : '') + '>' + esc(f.label) + xBtn +
      (f.desc ? '<span class="ssm-tag-popup">' + esc(f.desc) + '</span>' : '') +
      '</span>';
  }).join('');

  // Faz 7: Sonuç metrikleri
  var metricsHtml = '';
  if (filters.length > 0 && matches > 0 && typeof filtered !== 'undefined') {
    var bestMatch = null;
    filtered.forEach(function(s) {
      if (s._match && (!bestMatch || s._match.score > bestMatch.score)) bestMatch = { sym: s.symbol, score: s._match.score, status: s._match.status };
    });
    var filteredOut = (total || 0) - (matches || 0);
    var metriks = [];
    if (bestMatch) metriks.push('<div class="ssm-metric"><span class="ssm-metric-lbl">En Yüksek Uyum</span><span class="ssm-metric-val match-score ms-'+bestMatch.status+'">'+bestMatch.score+'</span><span class="ssm-metric-sym">'+esc(bestMatch.sym)+'</span></div>');
    if (filteredOut > 0) metriks.push('<div class="ssm-metric"><span class="ssm-metric-lbl">Elenen</span><span class="ssm-metric-val ssm-metric-out">'+filteredOut.toLocaleString('tr-TR')+'</span></div>');
    metriks.push('<div class="ssm-metric"><span class="ssm-metric-lbl">Filtre Ailesi</span><span class="ssm-metric-val">'+filters.length+'</span></div>');
    if (metriks.length) metricsHtml = '<div class="ssm-metrics-row">'+metriks.join('')+'</div>';
  }

  el.innerHTML =
    '<div class="ssm-why"><span class="ssm-why-lbl">Neden bu sonuçlar?</span>' +
      '<span class="ssm-why-txt">' + _recipeSentence(filters, total, matches) + '</span></div>' +
    '<span class="ssm-left">' +
      (tagsHtml
        ? '<span class="ssm-flabel">Aktif filtre:</span>' + tagsHtml
        : '<span class="ssm-no-filter">Filtresiz</span>') +
    '</span>' +
    metricsHtml;
  // Taranan / Eşleşen — ayrı etiketli elemanlar
  var totItem = document.getElementById('sb-total-item');
  var totVal  = document.getElementById('sb-total');
  if (totItem && totVal) {
    totVal.textContent = (total || 0).toLocaleString('tr-TR');
    totItem.style.display = '';
  }
  var resItem = document.getElementById('sb-result-item');
  var resVal  = document.getElementById('sb-result');
  if (resItem && resVal) {
    resVal.textContent = (matches || 0).toLocaleString('tr-TR');
    resItem.style.display = '';
  }
  _recordRecentScan(filters, total, matches);
  var trustStrip = document.getElementById('trust-strip');
  if (trustStrip) trustStrip.style.display = '';
}

// Site-geneli "Son Taramalar"a kaydet — yalnızca deep-linklenebilir (kind+key'li)
// birincil filtresi olan BORSA taramaları (Pro hisse tarayıcı ile yeniden açılabilir)
function _recordRecentScan(filters, total, matches) {
  try {
    var asset = (_activeAsset === 'kripto') ? 'kripto' : (_activeAsset === 'fon') ? 'fon' : 'borsa';
    if (asset !== 'borsa') return;                 // şimdilik yalnız hisse taramaları
    if (!total || total < 1) return;
    // Yalnızca ANLAMLI filtreli tarama kaydet: eşleşen 1..total-1 arası olmalı.
    // matches>=total → filtre etkisiz (tüm hisseler eşleşmiş); matches<1 → boş/loading.
    var m = (matches != null ? matches : 0);
    if (m < 1 || m >= total) return;
    var primary = (filters || []).find(function(f) { return f.kind && f.key; });
    if (!primary) return;                          // filtresiz/özel filtre → deep-link yok
    var exMeta = (typeof EXCHANGE_META !== 'undefined' ? EXCHANGE_META[currentExchange] : null) || {};
    fetch('/api/recent-scans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: primary.kind, k: primary.key, label: primary.label,
        asset: asset, ex: currentExchange,
        exLabel: exMeta.name || (currentExchange || '').toUpperCase(),
        count: total, matched: (matches != null ? matches : 0)
      })
    }).catch(function() {});
  } catch (e) {}
}

// Homepage "Son Taramalar" — site-geneli son taramaları çek, Kolay-stili kart olarak göster
function loadRecentScans() {
  var sec = document.getElementById('hpx-recent');
  var grid = document.getElementById('hpx-recent-grid');
  if (!sec || !grid) return;
  fetch('/api/recent-scans').then(function(r) { return r.json(); }).then(function(d) {
    var scans = (d && d.scans) || [];
    if (!scans.length) { sec.style.display = 'none'; return; }
    grid.innerHTML = scans.map(function(s) {
      var assetLabel = s.asset === 'kripto' ? 'Kripto' : s.asset === 'fon' ? 'Fon' : 'Borsa';
      var url = '/?strateji=' + encodeURIComponent(s.k) + (s.ex ? '&ex=' + encodeURIComponent(s.ex) : '');
      var cnt = (parseInt(s.count, 10) || 0).toLocaleString('tr-TR');
      var foundHtml = (s.matched != null)
        ? '<span class="hrc-dot">·</span><span class="hrc-found">' + (parseInt(s.matched, 10) || 0).toLocaleString('tr-TR') + '</span><span>bulundu</span>'
        : '';
      return '<a class="hpx-rcard" href="' + url + '">' +
        '<div class="hrc-name">' + esc(s.label) + '</div>' +
        '<div class="hrc-meta"><span>' + esc(assetLabel) + '</span><span class="hrc-dot">·</span>' +
          '<span class="hrc-ex">' + esc(s.exLabel || '') + '</span><span class="hrc-dot">·</span>' +
          '<span class="hrc-count">' + cnt + '</span><span>tarandı</span>' + foundHtml + '</div>' +
        '</a>';
    }).join('');
    sec.style.display = '';
  }).catch(function() { sec.style.display = 'none'; });
}

// "Neden eşleşti": dokunmatik cihazda aktif-filtre etiketine dokununca lens
// kriterleri popup'ını aç (hover yok). × (filtre kaldır) hariç tutulur.
(function() {
  document.addEventListener('click', function(e) {
    if (!(window.matchMedia && window.matchMedia('(hover: none)').matches)) return;
    if (e.target.closest('.ssm-tag-x')) return; // × kendi işini yapsın
    var tag = e.target.closest('#scan-summary .ssm-tag[data-haspopup]');
    // açık olan diğer ipuçlarını kapat
    document.querySelectorAll('#scan-summary .ssm-tag.tip-open').forEach(function(t) {
      if (t !== tag) t.classList.remove('tip-open');
    });
    if (!tag) return;
    e.stopPropagation();
    tag.classList.toggle('tip-open');
    if (tag.classList.contains('tip-open')) {
      clearTimeout(tag._tipTO);
      tag._tipTO = setTimeout(function() { tag.classList.remove('tip-open'); }, 4500);
    }
  });
})();

// Özet barındaki × — filtreyi her iki paneldeki chip'lerden kaldırıp kalanlarla yeniden tarar
function removeScanFilter(kind, key) {
  if (_scanRunning || document.getElementById('quick-scan-pill')) return;
  var sel = kind === 'goat'   ? '.goat-chip[data-goat="' + key + '"]'
          : kind === 'preset' ? '.chip[data-preset="' + key + '"]'
          :                     '.chip[data-tech="' + key + '"]';
  document.querySelectorAll(sel).forEach(function(c){ c.classList.remove('on'); });
  // Prescan seçim setlerini de güncelle — "Yeni Tarama"ya dönünce tutarlı kalsın
  if (kind === 'goat')   _psvActiveGoats.delete(key);
  if (kind === 'preset') _psvActivePresets.delete(key);
  if (kind === 'tech')   _psvActiveTech.delete(key);
  _psvScanFilterCount = Math.max(0, _psvScanFilterCount - 1);
  var dict = kind === 'goat' ? GURUS : kind === 'preset' ? PRESETS : TECH_PRESETS;
  window._quickRescan = true;
  window._quickRescanLabel = '− ' + (dict[key] ? dict[key].label.split(' — ')[0].split(' (')[0] : key);
  _applyChips(BASIC_CHIP_CFG);
}

// ── HIZLI YENİDEN TARAMA PİLİ — tablo görünür kalır, ortada küçük durum göstergesi ──
function showQuickScanPill(label) {
  hideQuickScanPill();
  var tw = document.getElementById('twrap');
  if (tw) tw.classList.add('quick-rescan');
  var tb = document.getElementById('toolbar');
  if (tb) tb.classList.add('quick-rescan');
  var ov = document.createElement('div');
  ov.id = 'quick-scan-pill';
  ov.innerHTML = '<span class="qsp-spin"></span><span class="qsp-txt">Yeni filtreyle taranıyor…</span>' +
    (label ? '<span class="qsp-sub">' + esc(label) + '</span>' : '');
  document.body.appendChild(ov);
}

function hideQuickScanPill() {
  var ov = document.getElementById('quick-scan-pill');
  if (ov) ov.remove();
  var tw = document.getElementById('twrap');
  if (tw) tw.classList.remove('quick-rescan');
  var tb = document.getElementById('toolbar');
  if (tb) tb.classList.remove('quick-rescan');
}

// ── FİLTRE EKLE DROPDOWN — tablodan ayrılmadan chip seçimi ──
var FD_GROUPS = [
  { kind: 'goat',   title: 'Yatırımcı Lensleri', containerId: 'goat-chips',   attr: 'data-goat' },
  { kind: 'preset', title: 'Temel Stratejiler',      containerId: 'presets',      attr: 'data-preset' },
  { kind: 'tech',   title: 'Teknik Stratejiler',     containerId: 'tech-presets', attr: 'data-tech' }
];

function toggleFilterDropdown(e) {
  if (e) e.stopPropagation();
  var dd = document.getElementById('filter-dropdown');
  if (!dd) return;
  if (dd.style.display !== 'none') { closeFilterDropdown(); return; }
  _fdOpenGroup = null; // her açılışta 3 başlık kapalı görünsün
  renderFilterDropdown();
  dd.style.display = 'block';
  var btn = document.getElementById('add-filter-btn');
  if (btn) btn.classList.add('open');
  // Capture fazında dinle: akordeon/chip tıklaması renderFilterDropdown ile
  // innerHTML'i yeniden kurup tıklanan elemanı koparıyor; bubble fazında çalışan
  // dışarı-tıklama kontrolü kopmuş elemanı "dışarıda" sanıp paneli kapatırdı.
  // Capture rebuild'den ÖNCE çalışır → eleman hâlâ panelde → kapatmaz.
  setTimeout(function() { document.addEventListener('click', _fdOutsideClick, true); }, 0);
}

function _fdOutsideClick(e) {
  var dd = document.getElementById('filter-dropdown');
  if (dd && !dd.contains(e.target)) closeFilterDropdown();
}

function closeFilterDropdown() {
  var dd = document.getElementById('filter-dropdown');
  if (dd) dd.style.display = 'none';
  var btn = document.getElementById('add-filter-btn');
  if (btn) btn.classList.remove('open');
  document.removeEventListener('click', _fdOutsideClick, true);
}

// ── Araçlar menüsü (toolbar) ──
function _toolsOutsideClick(e) {
  if (e.target.closest && e.target.closest('.tb-tools-wrap')) return;
  closeToolsMenu();
}
function closeToolsMenu() {
  var m = document.getElementById('tb-tools-menu');
  if (m) m.style.display = 'none';
  var t = document.getElementById('tb-tools-toggle');
  if (t) t.classList.remove('open');
  document.removeEventListener('click', _toolsOutsideClick);
}
function toggleToolsMenu(e) {
  if (e) e.stopPropagation();
  var m = document.getElementById('tb-tools-menu');
  var t = document.getElementById('tb-tools-toggle');
  if (!m) return;
  if (m.style.display === 'block') { closeToolsMenu(); return; }
  m.style.display = 'block';
  if (t) t.classList.add('open');
  setTimeout(function(){ document.addEventListener('click', _toolsOutsideClick); }, 0);
}

// Akordeon: aynı anda yalnızca bir kategori açık. null = hepsi kapalı.
var _fdOpenGroup = null;

function fdToggleGroup(kind) {
  _fdOpenGroup = (_fdOpenGroup === kind) ? null : kind;
  renderFilterDropdown();
}

function renderFilterDropdown() {
  var dd = document.getElementById('filter-dropdown');
  if (!dd) return;
  var html = '<div class="fd-head"><span>Filtre Ekle</span><span class="fd-count" id="fd-count">' +
    _countChips(BASIC_CHIP_CFG) + '/4</span></div>';
  FD_GROUPS.forEach(function(g) {
    var dict = g.kind === 'goat' ? GURUS : g.kind === 'preset' ? PRESETS : TECH_PRESETS;
    var chips = document.querySelectorAll('#' + g.containerId + ' [' + g.attr + ']');
    if (!chips.length) return;
    var items = [], selCount = 0;
    chips.forEach(function(c) {
      var key = c.getAttribute(g.attr);
      var def = dict[key];
      // Goat chip'ler mini-card'a dönüştürülmüş olabilir — sadece isim span'ini al
      var nameEl = c.querySelector('.gcchip-name');
      var on = c.classList.contains('on');
      if (on) selCount++;
      items.push({
        key: key,
        label: (nameEl ? nameEl.textContent : c.textContent).trim(),
        desc: def && def.desc ? def.desc : '',
        on: on
      });
    });
    items.sort(function(a, b) { return a.label.localeCompare(b.label, 'tr'); });
    var isOpen = _fdOpenGroup === g.kind;
    html += '<button type="button" class="fd-acc' + (isOpen ? ' open' : '') + '" onclick="fdToggleGroup(\'' + g.kind + '\')">' +
      '<span class="fd-acc-title">' + g.title + '</span>' +
      '<span class="fd-acc-meta">' +
        (selCount ? '<span class="fd-acc-sel">' + selCount + '</span>' : '') +
        '<span class="fd-acc-n">' + items.length + '</span>' +
        '<span class="fd-acc-arr">▾</span>' +
      '</span></button>';
    html += '<div class="fd-chips"' + (isOpen ? '' : ' style="display:none"') + '>';
    items.forEach(function(it) {
      var tip = it.desc ? ' title="' + esc(it.desc) + '"' : '';
      html += '<span class="fd-chip' + (it.on ? ' on' : '') + '"' + tip +
        ' onclick="fdToggleChip(\'' + g.kind + '\',\'' + it.key + '\',this)">' + esc(it.label) + '</span>';
    });
    html += '</div>';
  });
  dd.innerHTML = html;
}

function fdToggleChip(kind, key, el) {
  // Tarama sürerken (min süre beklemesi dahil) çifte tetiklemeyi önle
  if (_scanRunning || document.getElementById('quick-scan-pill')) return;
  var wasOn = el.classList.contains('on');
  if (!wasOn && _countChips(BASIC_CHIP_CFG) >= 4) { showToast('En fazla 4 filtre seçilebilir'); return; }
  var sel = kind === 'goat'   ? '.goat-chip[data-goat="' + key + '"]'
          : kind === 'preset' ? '.chip[data-preset="' + key + '"]'
          :                     '.chip[data-tech="' + key + '"]';
  document.querySelectorAll(sel).forEach(function(c) { c.classList.toggle('on', !wasOn); });
  el.classList.toggle('on', !wasOn);
  // Prescan seçim setleri tutarlı kalsın — "Yeni Tarama"ya dönünce aynı seçimler görünür
  var set = kind === 'goat' ? _psvActiveGoats : kind === 'preset' ? _psvActivePresets : _psvActiveTech;
  if (wasOn) set.delete(key); else set.add(key);
  if (!wasOn) _track(kind, key);
  var cnt = document.getElementById('fd-count');
  if (cnt) cnt.textContent = _countChips(BASIC_CHIP_CFG) + '/4';
  _psvScanFilterCount = _countChips(BASIC_CHIP_CFG);
  window._quickRescan = true;
  window._quickRescanLabel = (wasOn ? '− ' : '+ ') + el.textContent.trim();
  _applyChips(BASIC_CHIP_CFG);
  renderFilterDropdown(); // akordeon başlık sayaçlarını (seçili/toplam) tazele, açık kategori korunur
}

// ── MOBILE DRAWER ──
// Drawer açıkken odağı içeride tut (a11y: focus-trap + Escape + odak geri yükleme)
var _drawerPrevFocus = null;
function _drawerFocusables(sidebar) {
  var sel = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  return Array.prototype.filter.call(sidebar.querySelectorAll(sel), function(el) {
    // görünürlük: position:fixed drawer'da offsetParent güvenilmez → boyut/rect ile bak
    return el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0;
  });
}
function _drawerKeydown(e) {
  var sidebar = document.querySelector('.sidebar');
  if (!sidebar || !sidebar.classList.contains('open')) return;
  if (e.key === 'Escape') { e.preventDefault(); closeMobileDrawer(); return; }
  if (e.key !== 'Tab') return;
  var f = _drawerFocusables(sidebar);
  if (!f.length) return;
  var first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  else if (!sidebar.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
}

function toggleMobileDrawer() {
  var sidebar = document.querySelector('.sidebar');
  var overlay = document.getElementById('drawer-overlay');
  var btn     = document.getElementById('hamburger-btn');
  if (!sidebar) return;

  var isOpen = sidebar.classList.contains('open');
  if (isOpen) {
    closeMobileDrawer();
  } else {
    sidebar.classList.add('open');
    if (overlay) overlay.classList.add('open');
    if (btn) { btn.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); }
    document.body.style.overflow = 'hidden';
    // a11y: modal dialog semantiği + focus-trap
    sidebar.setAttribute('role', 'dialog');
    sidebar.setAttribute('aria-modal', 'true');
    _drawerPrevFocus = document.activeElement;
    document.addEventListener('keydown', _drawerKeydown, true);
    setTimeout(function() {
      var f = _drawerFocusables(sidebar);
      if (f.length) f[0].focus();
      else { sidebar.setAttribute('tabindex', '-1'); sidebar.focus(); }
    }, 60);
  }
}

function closeMobileDrawer() {
  var sidebar = document.querySelector('.sidebar');
  var overlay = document.getElementById('drawer-overlay');
  var btn     = document.getElementById('hamburger-btn');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
  if (btn) { btn.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }
  document.body.style.overflow = '';
  // a11y: dialog semantiğini geri al, focus-trap'i kaldır, odağı geri yükle
  if (sidebar) {
    sidebar.setAttribute('role', 'complementary');
    sidebar.removeAttribute('aria-modal');
  }
  document.removeEventListener('keydown', _drawerKeydown, true);
  if (_drawerPrevFocus && typeof _drawerPrevFocus.focus === 'function') {
    _drawerPrevFocus.focus();
    _drawerPrevFocus = null;
  }
}
let disclaimerTimer = null;

function showDisclaimerModal() {
  if (localStorage.getItem('df_disclaimer_v2')) return; // zaten kabul edilmiş
  const modal = document.getElementById('disclaimerModal');
  if (!modal) return;
  modal.classList.add('open');
  // Countdown
  let secs = 5;
  const btn = document.getElementById('disclaimerBtn');
  const cdEl = document.getElementById('disclaimerCountdown');
  btn.disabled = true;
  btn.style.cursor = 'not-allowed';
  btn.style.background = 'var(--s3)';
  btn.style.color = 'var(--muted)';
  btn.style.borderColor = 'var(--border)';

  disclaimerTimer = setInterval(function() {
    secs--;
    if (secs > 0) {
      cdEl.textContent = '(' + secs + ')';
    } else {
      clearInterval(disclaimerTimer);
      cdEl.textContent = '';
      btn.disabled = false;
      btn.style.cursor = 'pointer';
      btn.style.background = 'var(--accent)';
      btn.style.color = '#fff';
      btn.style.borderColor = 'var(--accent)';
    }
  }, 1000);
}

function acceptDisclaimer() {
  disclaimerAccepted = true;
  localStorage.setItem('df_disclaimer_v2', '1');
  document.getElementById('disclaimerModal').classList.remove('open');
  clearInterval(disclaimerTimer);

}

function showScreener() {
  _doShowScreener();
}
function showScreenerOrPrescan() {
  if (document.getElementById('page-scan')) {
    showPage('page-scan');
    openPrescanView();
    return;
  }
  // Legacy fallback
  _doShowScreener(true);
  openScanModeChoice();
}
function _doShowScreener(keepSidebar) {
  hideAnalizPage();
  if (!keepSidebar) setTimeout(initSidebarState, 0);
  var _pp=document.getElementById('profile-page'); if(_pp){_pp.style.display='none';_pp.classList.remove('on');}
  var na = document.getElementById('nav-analiz'); if(na) na.classList.remove('active');
  // New page system
  if (document.getElementById('page-scan')) {
    showPage('page-scan');
    if (!_activeAsset) _updateOnboarding('hisse');
    if(window.location.pathname !== '/screener') history.pushState({page:'screener'}, '', '/screener');
    return;
  }
  // Legacy: Disclaimer kontrolü
  if (!disclaimerAccepted && !localStorage.getItem('df_disclaimer_v2')) {
    showDisclaimerModal();
    var hp0 = document.getElementById('homepage'); if(hp0) hp0.style.display = 'none';
    var sl0 = document.getElementById('screener-layout'); if(sl0) sl0.style.display = 'flex';
    var nh0 = document.getElementById('nav-home'); if(nh0) nh0.classList.remove('active');
    var nt0 = document.getElementById('nav-tarama'); if(nt0) nt0.classList.add('active');
    var dnh2=document.getElementById('dnav-home');if(dnh2)dnh2.classList.remove('active');
    var dnt2=document.getElementById('dnav-tarama');if(dnt2)dnt2.classList.add('active');
    var ts = document.querySelector('.tsearch');
    if(ts) ts.style.display = '';
    return;
  }
  var hp = document.getElementById('homepage'); if(hp) hp.style.display = 'none';
  var sl = document.getElementById('screener-layout'); if(sl) sl.style.display = 'flex';
  var nh = document.getElementById('nav-home'); if(nh) nh.classList.remove('active');
  var nt = document.getElementById('nav-tarama'); if(nt) nt.classList.add('active');
  var dnh3=document.getElementById('dnav-home');if(dnh3)dnh3.classList.remove('active');
  var dnt3=document.getElementById('dnav-tarama');if(dnt3)dnt3.classList.add('active');
  if (!_activeAsset) _updateOnboarding('hisse');
  var _hb2 = document.getElementById('hamburger-btn'); if(_hb2 && window.innerWidth <= 768) _hb2.style.display = 'flex';
  if(window.location.pathname !== '/screener') history.pushState({page:'screener'}, '', '/screener');
}

function selectExchangeAndGo(exKey) {
  showScreener();
  var btn = document.querySelector('.exbtn[data-exchange="' + exKey + '"]');
  if(btn) selectExchange(btn);
}

// Homepage "Borsalar" — ilk 5 + diğerleri aç/kapa
function hpToggleEx() {
  var ex = document.getElementById('hpx-ex-extra');
  var btn = document.getElementById('hpx-ex-more');
  if (!ex || !btn) return;
  var hidden = getComputedStyle(ex).display === 'none';
  ex.style.display = hidden ? 'grid' : 'none';
  btn.textContent = hidden ? '− Daha Az' : '+ Diğer Borsalar';
}

// Homepage "Popüler Stratejiler" tab switch
function hpStratTab(el, id) {
  var tabs = el.parentElement.querySelectorAll('.hpx-tab');
  for (var i = 0; i < tabs.length; i++) tabs[i].classList.remove('on');
  el.classList.add('on');
  ['goat', 'fund', 'tech'].forEach(function(x) {
    var g = document.getElementById('hpx-sg-' + x);
    if (g) g.style.display = (x === id) ? 'grid' : 'none';
  });
}

function _track(type, key) {
  fetch('/api/track', { method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({type: type, key: key}) }).catch(function(){});
}

function applyStrategyAndGo(goatKey) { _track('goat', goatKey); _homeStrategy('goat', goatKey); }
function applyPresetAndGo(presetKey) { _track('preset', presetKey); _homeStrategy('preset', presetKey); }
function applyTechAndGo(techKey)     { _track('tech', techKey);    _homeStrategy('tech', techKey); }

// Anasayfa hazır filtreleri — tarayıcıyı aç, sonra KANITLANMIŞ quickGoat/quickScan
// ile filtreyi DOĞRUDAN veri sözlüğünden uygula. Önceki sürüm chip render/timing
// yarışına ve yanlış selektöre (.tech-chip) takılıp bazen filtresiz tarıyordu
// (→ "607 bulundu" gibi tutarsız sonuçlar). Artık tek, filtreli tarama.
function _homeStrategy(kind, key) {
  showScreener();
  setTimeout(function() {
    if (kind === 'goat') quickGoat(key);
    else quickScan(key); // quickScan hem preset hem tech anahtarını işler
  }, 80);
}



// ── TOOLTIP: sadece th[data-tip] ──
(function(){
  var t=null;
  function el(){return t||(t=document.getElementById('df-tooltip'));}
  function pos(cx,cy){
    var d=el();if(!d)return;
    var w=d.offsetWidth||220,h=d.offsetHeight||60;
    var x=cx+14,y=cy+14;
    if(x+w>window.innerWidth-8)x=cx-w-10;
    if(y+h>window.innerHeight-8)y=cy-h-10;
    if(y<8)y=8;
    d.style.left=x+'px';d.style.top=y+'px';
  }
  document.addEventListener('mousemove',function(e){
    if(el()&&el().style.display!=='none')pos(e.clientX,e.clientY);
  });
  document.addEventListener('mouseover',function(e){
    var th=e.target.closest('th[data-tip]');
    if(!th){if(el())el().style.display='none';return;}
    var d=el();if(!d)return;
    d.innerHTML=th.getAttribute('data-tip');
    d.style.display='block';
    pos(e.clientX,e.clientY);
  });
  document.addEventListener('mouseout',function(e){
    if(e.target.closest('th[data-tip]')&&el())el().style.display='none';
  });
  // Dokunmatik (hover yok): başlığa tap → kolon açıklamasını kısa süre göster (sıralamayı engellemez)
  var _thTO=null;
  document.addEventListener('click',function(e){
    if(!(window.matchMedia&&window.matchMedia('(hover: none)').matches))return;
    var th=e.target.closest('th[data-tip]');if(!th)return;
    var d=el();if(!d)return;
    d.innerHTML=th.getAttribute('data-tip');d.style.display='block';
    var r=th.getBoundingClientRect();pos(r.left+r.width/2,r.bottom);
    clearTimeout(_thTO);_thTO=setTimeout(function(){if(el())el().style.display='none';},2600);
  });
})();

// Start on homepage
// analiz dropdown click-outside: analiz.js'de handle ediliyor

// ── Klavye Navigasyonu ────────────────────────────────────────
function _initKeyboardNav() {
  // Tüm chip'lere tabindex + role ekle (keyboard focus desteği)
  document.querySelectorAll('.chip,.goat-chip,.exbtn,.hpx-spill,.tlogo').forEach(function(el) {
    if (!el.hasAttribute('tabindex')) {
      el.setAttribute('tabindex', '0');
      if (!el.getAttribute('role')) el.setAttribute('role', 'button');
    }
  });

  document.addEventListener('keydown', function(e) {
    var el = e.target;
    var tag = el.tagName;
    var inInput = tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;

    // Bloomberg shortcut: '/' focuses symbol search
    if (e.key === '/' && !inInput && !e.ctrlKey && !e.metaKey) {
      var si = document.getElementById('sb-searchbox');
      if (si) { e.preventDefault(); si.focus(); si.select(); }
      return;
    }

    // '?' — keyboard shortcut help overlay
    if ((e.key === '?' || (e.key === '/' && e.shiftKey)) && !inInput) {
      e.preventDefault();
      _toggleShortcutHelp();
      return;
    }

    // Single-key nav shortcuts (only when not in input)
    if (!inInput && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // S → Screener/Tarayıcı
      if (e.key === 's' || e.key === 'S') {
        var sl = document.getElementById('screener-layout');
        var hp = document.getElementById('homepage');
        if (hp && hp.style.display !== 'none') { e.preventDefault(); showScreenerOrPrescan(); return; }
      }
      // H → Homepage/Anasayfa
      if (e.key === 'h' || e.key === 'H') {
        var hp2 = document.getElementById('homepage');
        if (hp2 && hp2.style.display === 'none') { e.preventDefault(); showHomepage(); return; }
      }
      // T → Toggle theme
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        toggleTheme();
        return;
      }
      // D → Close detail panel
      if (e.key === 'd' || e.key === 'D') {
        var det = document.getElementById('detail');
        if (det && det.classList.contains('open')) { e.preventDefault(); closeDetail(); return; }
      }
      // F → Focus on favori tab
      if (e.key === 'f' || e.key === 'F') {
        var favBtn = document.querySelector('.exbtn[data-exchange="fav"]');
        if (favBtn) { e.preventDefault(); favBtn.click(); return; }
      }
    }

    // Enter/Space ile chip/button aktivasyonu
    if (e.key === 'Enter' || e.key === ' ') {
      if (el.classList.contains('chip') || el.classList.contains('goat-chip') || el.classList.contains('exbtn') || el.classList.contains('hpx-spill') || el.classList.contains('tlogo') || (el.tagName === 'TH' && el.hasAttribute('onclick'))) {
        e.preventDefault();
        el.click();
        return;
      }
    }
    // Tablo satırları: ok tuşlarıyla navigasyon
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && tag === 'TR') {
      e.preventDefault();
      var tbody = el.closest('tbody');
      if (!tbody) return;
      var rows = Array.from(tbody.querySelectorAll('tr:not(.vs-pad)'));
      var idx = rows.indexOf(el);
      var next = e.key === 'ArrowDown' ? rows[idx + 1] : rows[idx - 1];
      if (next) { next.setAttribute('tabindex', '-1'); next.focus(); }
    }
    // Enter ile satır açma
    if (e.key === 'Enter' && tag === 'TR') {
      el.click();
    }
    // Escape: search temizle, detail kapat veya shortcut help kapat
    if (e.key === 'Escape') {
      var shm = document.getElementById('shortcut-help-modal');
      if (shm && shm.classList.contains('open')) { shm.classList.remove('open'); return; }
      var mdr = document.getElementById('match-drawer');
      if (mdr && mdr.classList.contains('open')) { closeMatchDrawer(); return; }
      var si = document.getElementById('sb-searchbox');
      if (si && si === document.activeElement) { si.value = ''; si.dispatchEvent(new Event('input')); si.blur(); return; }
      var det2 = document.getElementById('detail');
      if (det2 && det2.classList.contains('open')) { closeDetail(); return; }
    }
    // ← → detail panel navigation
    if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !inInput && !e.ctrlKey && !e.metaKey) {
      var det3 = document.getElementById('detail');
      if (det3 && det3.classList.contains('open')) {
        e.preventDefault();
        detailNav(e.key === 'ArrowRight' ? 1 : -1);
        return;
      }
    }
  });
}

// ── Saved Scan Templates ─────────────────────────────────────
function _getSavedScans() {
  try { return JSON.parse(localStorage.getItem('df_saved_scans') || '[]'); } catch(e){ return []; }
}
function _putSavedScans(arr) {
  try { localStorage.setItem('df_saved_scans', JSON.stringify(arr)); } catch(e){}
}
function saveCurrentScan() {
  // Collect current state
  var goats = [], presets = [], techs = [], inputs = {};
  document.querySelectorAll('#goat-chips .goat-chip.on').forEach(function(c){ if(c.dataset.goat) goats.push(c.dataset.goat); });
  document.querySelectorAll('#presets .chip.on').forEach(function(c){ if(c.dataset.preset) presets.push(c.dataset.preset); });
  document.querySelectorAll('#tech-presets .chip.on').forEach(function(c){ if(c.dataset.tech) techs.push(c.dataset.tech); });
  document.querySelectorAll('.finps input, #hisse-hidden-filters input').forEach(function(i){ if(i.value) inputs[i.id] = i.value; });
  var sf = document.getElementById('sector_filter'); if(sf && sf.value) inputs.sector_filter = sf.value;
  if (!goats.length && !presets.length && !techs.length && !Object.keys(inputs).length) {
    alert('Kaydedilecek filtre yok. Önce bir tarama çalıştır.'); return;
  }
  var name = prompt('Bu taramaya bir isim ver:', (_scanMeta && _scanMeta.strategy) || 'Özel Tarama');
  if (!name) return;
  var scans = _getSavedScans();
  scans.unshift({ id: Date.now(), name: name, exchange: currentExchange, goats: goats, presets: presets, techs: techs, inputs: inputs, ts: Date.now() });
  scans = scans.slice(0, 20);
  _putSavedScans(scans);
  // Visual feedback
  var btn = document.querySelector('.tb-save-btn');
  if (btn) { var orig = btn.textContent; btn.textContent = '✓ Kaydedildi'; setTimeout(function(){ btn.textContent = orig; }, 1500); }
}
function openSavedScans() {
  var modal = document.getElementById('saved-scans-modal');
  var list = document.getElementById('ssm-list');
  var empty = document.getElementById('ssm-empty');
  if (!modal) return;
  var scans = _getSavedScans();
  if (!scans.length) { list.innerHTML = ''; empty.style.display = ''; }
  else {
    empty.style.display = 'none';
    var ex_names = { bist:'BIST', nasdaq:'NASDAQ', nyse:'NYSE', sp500:'S&P500', dax:'DAX', lse:'LSE', nikkei:'NIKKEI', kucuk:'Küçük BIST' };
    list.innerHTML = scans.map(function(sc) {
      var tags = [].concat(
        sc.goats.map(function(k){ return '<span class="ssm-tag ssm-goat">'+(GURUS[k]?GURUS[k].label.split(' — ')[0].split(' (')[0]:k)+'</span>'; }),
        sc.presets.map(function(k){ return '<span class="ssm-tag ssm-preset">'+(PRESETS[k]?PRESETS[k].label:k)+'</span>'; }),
        sc.techs.map(function(k){ return '<span class="ssm-tag ssm-tech">'+(TECH_PRESETS[k]?TECH_PRESETS[k].label:k)+'</span>'; })
      ).join('');
      var date = new Date(sc.ts).toLocaleDateString('tr-TR', {day:'2-digit',month:'short'});
      return '<div class="ssm-item">'+
        '<div class="ssm-item-head">'+
          '<span class="ssm-item-name">'+esc(sc.name)+'</span>'+
          '<span class="ssm-item-ex">'+(ex_names[sc.exchange]||sc.exchange.toUpperCase())+'</span>'+
          '<span class="ssm-item-date">'+date+'</span>'+
          '<button class="ssm-del-btn" onclick="deleteSavedScan('+sc.id+',event)" title="Sil">✕</button>'+
        '</div>'+
        '<div class="ssm-item-tags">'+tags+'</div>'+
        '<button class="ssm-run-btn" onclick="runSavedScan('+sc.id+')">▶ Çalıştır</button>'+
        '</div>';
    }).join('');
  }
  modal.style.display = 'flex';
}
function closeSavedScans() {
  var m = document.getElementById('saved-scans-modal');
  if (m) m.style.display = 'none';
}
function deleteSavedScan(id, e) {
  if (e) e.stopPropagation();
  var scans = _getSavedScans().filter(function(sc){ return sc.id !== id; });
  _putSavedScans(scans);
  openSavedScans();
}
function runSavedScan(id) {
  var sc = _getSavedScans().find(function(s){ return s.id === id; });
  if (!sc) return;
  closeSavedScans();
  // Set exchange
  if (sc.exchange && sc.exchange !== currentExchange) {
    currentExchange = sc.exchange;
    document.querySelectorAll('.exbtn').forEach(function(b){ b.classList.toggle('on', b.dataset.exchange === sc.exchange); });
  }
  // Clear and restore chips
  document.querySelectorAll('#goat-chips .goat-chip.on, #presets .chip.on, #tech-presets .chip.on').forEach(function(c){ c.classList.remove('on'); });
  sc.goats.forEach(function(k){ var c=document.querySelector('#goat-chips .goat-chip[data-goat="'+k+'"]'); if(c) c.classList.add('on'); });
  sc.presets.forEach(function(k){ var c=document.querySelector('#presets .chip[data-preset="'+k+'"]'); if(c) c.classList.add('on'); });
  sc.techs.forEach(function(k){ var c=document.querySelector('#tech-presets .chip[data-tech="'+k+'"]'); if(c) c.classList.add('on'); });
  // Restore inputs
  document.querySelectorAll('.finps input, #hisse-hidden-filters input').forEach(function(i){ i.value = sc.inputs[i.id] || ''; });
  var sf = document.getElementById('sector_filter'); if(sf) sf.value = sc.inputs.sector_filter || '';
  _applyChips(BASIC_CHIP_CFG);
}

// ── Scan History ─────────────────────────────────────────────
function _saveScanHistory(resultCount) {
  if (!_scanMeta || !_scanMeta.exchange) return;
  var strategy = _scanMeta.strategy;
  if (!strategy && resultCount === 0) return;
  var entry = {
    ts: Date.now(),
    exchange: _scanMeta.exchange,
    strategy: strategy || 'Özel Filtre',
    count: resultCount,
    filters: (_scanMeta.filters || []).map(function(f){ return { kind: f.kind, key: f.key, label: f.label }; })
  };
  var hist = _getScanHistory();
  // Remove duplicate same strategy+exchange
  hist = hist.filter(function(h){ return !(h.exchange === entry.exchange && h.strategy === entry.strategy); });
  hist.unshift(entry);
  hist = hist.slice(0, 5);
  try { localStorage.setItem('df_scan_hist', JSON.stringify(hist)); } catch(e){}
}
function _getScanHistory() {
  try { return JSON.parse(localStorage.getItem('df_scan_hist') || '[]'); } catch(e){ return []; }
}
function _renderScanHistory() {
  var hist = _getScanHistory();
  if (!hist.length) return '';
  var ex_names = { bist:'BIST', nasdaq:'NASDAQ', nyse:'NYSE', sp500:'S&P500', dax:'DAX', lse:'LSE', nikkei:'NIKKEI', kucuk:'Küçük BIST' };
  var rows = hist.map(function(h, i) {
    var ago = Math.round((Date.now() - h.ts) / 60000);
    var agoTxt = ago < 60 ? ago + ' dk önce' : Math.round(ago/60) + ' sa önce';
    var filterHtml = h.filters && h.filters.length
      ? h.filters.map(function(f){ return '<span class="sh-tag sh-tag-'+f.kind+'">'+esc(f.label)+'</span>'; }).join('')
      : '<span class="sh-tag">Özel</span>';
    var canRerun = h.filters && h.filters.length;
    return '<div class="sh-item' + (canRerun ? ' sh-clickable' : '') + '" data-hidx="'+i+'" onclick="_shItemClick(this)">'
      +'<div class="sh-meta"><span class="sh-ex">'+(ex_names[h.exchange]||h.exchange.toUpperCase())+'</span><span class="sh-count">'+h.count+' sonuç</span><span class="sh-ago">'+agoTxt+'</span></div>'
      +'<div class="sh-tags">'+filterHtml+'</div>'
      +'</div>';
  }).join('');
  return '<div class="scan-history"><div class="sh-title">SON TARAMALAR</div>'+rows+'</div>';
}
function _shItemClick(el) {
  var idx = parseInt(el.dataset.hidx, 10);
  var hist = _getScanHistory();
  var h = hist[idx];
  if (!h || !h.filters || !h.filters.length) return;
  rerunScan(h);
}
function rerunScan(entry) {
  // Navigate to screener
  var hp = document.getElementById('homepage');
  if (hp && hp.style.display !== 'none') showScreener();
  var pv = document.getElementById('prescan-view');
  if (pv) pv.style.display = 'none';
  // Clear all chips
  document.querySelectorAll('#goat-chips .goat-chip.on, #presets .chip.on, #tech-presets .chip.on').forEach(function(c){ c.classList.remove('on'); });
  document.querySelectorAll('.finps input, #hisse-hidden-filters input').forEach(function(i){ i.value = ''; });
  // Re-apply filters
  (entry.filters || []).forEach(function(f) {
    if (f.kind === 'goat') {
      var chip = document.querySelector('#goat-chips .goat-chip[data-goat="'+f.key+'"]');
      if (chip) chip.classList.add('on');
    } else if (f.kind === 'preset') {
      var chip = document.querySelector('#presets .chip[data-preset="'+f.key+'"]');
      if (chip) chip.classList.add('on');
    } else if (f.kind === 'tech') {
      var chip = document.querySelector('#tech-presets .chip[data-tech="'+f.key+'"]');
      if (chip) chip.classList.add('on');
    }
  });
  _applyChips(BASIC_CHIP_CFG);
}

// ── Keyboard Shortcut Help Overlay ──
function _toggleShortcutHelp() {
  var m = document.getElementById('shortcut-help-modal');
  if (!m) {
    m = document.createElement('div');
    m.id = 'shortcut-help-modal';
    m.className = 'shortcut-help-modal';
    m.innerHTML =
      '<div class="shm-inner">'+
      '<div class="shm-head"><span class="shm-title">Klavye Kısayolları</span><button class="shm-close" onclick="document.getElementById(\'shortcut-help-modal\').classList.remove(\'open\')">✕</button></div>'+
      '<div class="shm-grid">'+
      '<div class="shm-section"><div class="shm-section-title">Navigasyon</div>'+
      '<div class="shm-row"><kbd>/</kbd><span>Sembol ara</span></div>'+
      '<div class="shm-row"><kbd>S</kbd><span>Tarayıcı\'ya git</span></div>'+
      '<div class="shm-row"><kbd>H</kbd><span>Anasayfaya git</span></div>'+
      '<div class="shm-row"><kbd>T</kbd><span>Tema değiştir</span></div>'+
      '</div>'+
      '<div class="shm-section"><div class="shm-section-title">Tablo & Detay</div>'+
      '<div class="shm-row"><kbd>↑</kbd><kbd>↓</kbd><span>Satır seç</span></div>'+
      '<div class="shm-row"><kbd>Enter</kbd><span>Detay aç</span></div>'+
      '<div class="shm-row"><kbd>←</kbd><kbd>→</kbd><span>Önceki / Sonraki</span></div>'+
      '<div class="shm-row"><kbd>D</kbd><span>Detay kapat</span></div>'+
      '<div class="shm-row"><kbd>F</kbd><span>Favoriler</span></div>'+
      '</div>'+
      '<div class="shm-section"><div class="shm-section-title">Genel</div>'+
      '<div class="shm-row"><kbd>Esc</kbd><span>Kapat / Temizle</span></div>'+
      '<div class="shm-row"><kbd>?</kbd><span>Bu yardım</span></div>'+
      '</div>'+
      '</div></div>';
    m.addEventListener('click', function(e){ if (e.target === m) m.classList.remove('open'); });
    document.body.appendChild(m);
  }
  m.classList.toggle('open');
}

// ── Favori Toplam Sayısı (Item 12 — birleştirme yardımcısı) ──
function _getFavTotalCount() {
  return (favSet ? favSet.size : 0) + (fonFavSet ? fonFavSet.size : 0) + (kriptoFavSet ? kriptoFavSet.size : 0);
}
function _updateFavBadge() {
  var badge = document.getElementById('fav-total-badge');
  if (!badge) return;
  var n = _getFavTotalCount();
  badge.textContent = n > 0 ? n : '';
  badge.style.display = n > 0 ? 'inline-flex' : 'none';
}

// ── FAZ 5: Makro Bant ──────────────────────────────────────────
var _macroData = null;
function _fmtPct(v, dec) { return v != null ? v.toFixed(dec != null ? dec : 1) + '%' : '—'; }
function _macroItem(lbl, val, cls) {
  return '<span class="mb-item' + (cls ? ' ' + cls : '') + '"><span class="mb-lbl">' + lbl + '</span><span class="mb-val">' + val + '</span></span>';
}
function renderMacroBand(d) {
  var el = document.getElementById('macro-band');
  if (!el) return;
  if (!d) { el.style.display = 'none'; return; }
  var html =
    _macroItem('Fed Faiz', _fmtPct(d.us_rate)) +
    _macroItem('ABD TÜFE', _fmtPct(d.us_cpi)) +
    _macroItem('VIX', d.vix != null ? d.vix.toFixed(1) : '—', d.vix > 25 ? 'mb-warn' : d.vix > 20 ? 'mb-caution' : '') +
    _macroItem('TCMB Faiz', _fmtPct(d.tr_rate)) +
    _macroItem('TR TÜFE', _fmtPct(d.tr_cpi)) +
    (d.source === 'fallback' || d._static ? '<span class="mb-stale" title="Statik veri · yakında güncellenir">~</span>' : '');
  el.innerHTML = html;
  el.style.display = 'flex';
}
function fetchMacroBand() {
  var el = document.getElementById('macro-band');
  if (!el) return;
  fetch('/api/macro').then(function(r) { return r.json(); }).then(function(d) {
    _macroData = d;
    renderMacroBand(d);
  }).catch(function() { /* sessiz hata — makro bant isteğe bağlı */ });
}

// ── URL ROUTING (History API) ─────────────────────────
window.addEventListener('popstate', function(e) {
  var path = window.location.pathname;
  if (path === '/screener') { showScreener(); }
  else if (path === '/' || path === '') { showHomepage(); }
});
// ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function(){
  _initTheme();
  _startIndicesTicker();
  _initWorker();
  _initKeyboardNav();
  if (typeof loadRecentScans === 'function') loadRecentScans();
  _initDensity();
  _updateFavBadge();
  _updateOnboarding(null); // Varsayılan: genel onboarding
  // Sidebar borsa chiplerine hover açıklaması
  document.querySelectorAll('.exbtn[data-exchange]').forEach(function(b){
    var t = EXCHANGE_TIPS[b.dataset.exchange];
    if (t) b.title = t;
  });
  // Canlı istatistikleri çek ve her 60s güncelle
  function _fmtStatNum(n) {
    if (!n || n === 0) return '—';
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.', ',') + 'M+';
    if (n >= 1000) return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '';
    return n.toString();
  }
  function _countUp(el, target) {
    if (!el || !target) return;
    var start = 0; var duration = 800; var startTime = null;
    function step(ts) {
      if (!startTime) startTime = ts;
      var prog = Math.min((ts - startTime) / duration, 1);
      var eased = 1 - Math.pow(1 - prog, 3);
      el.textContent = _fmtStatNum(Math.round(eased * target));
      if (prog < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  function fetchLiveStats() {
    fetch('/api/stats').then(function(r){ return r.json(); }).then(function(d){
      var eScans = document.getElementById('stat-scan-count');
      var eUsers = document.getElementById('stat-user-count');
      if (eScans && d.scans != null) _countUp(eScans, d.scans);
      if (eUsers && d.users != null) _countUp(eUsers, d.users);
    }).catch(function(){});
  }
  fetchLiveStats();
  setInterval(fetchLiveStats, 60000);
  fetchMacroBand();
  var _sp   = new URLSearchParams(window.location.search);
  var _p    = _sp.get('from');
  var _path = window.location.pathname;
  var _hasWl = !!_sp.get('wl');
  var _investor = _sp.get('investor');
  if (_p === 'profile' || _p === 'screener' || _p === 'analiz' || _path === '/screener' || _hasWl) {
    showScreener();
    if (!_investor && allData.length === 0 && !_hasWl) openScanModeChoice();
  } else {
    showHomepage();
  }
  if (_investor) {
    var _IMAP = {
      growth: function(){ var c=document.querySelector('[data-preset="growth"]');     if(c&&!c.classList.contains('on'))c.click(); },
      div:    function(){ var c=document.querySelector('[data-preset="dividend"]');   if(c&&!c.classList.contains('on'))c.click(); },
      value:  function(){ var c=document.querySelector('[data-preset="value"]');      if(c&&!c.classList.contains('on'))c.click(); },
      mom:    function(){ var c=document.querySelector('[data-tech="momentum3m"]');   if(c&&!c.classList.contains('on'))c.click(); },
      def:    function(){ var c=document.querySelector('[data-preset="quality"]');    if(c&&!c.classList.contains('on'))c.click(); },
      small:  function(){ var c=document.querySelector('[data-preset="lowdebt"]');    if(c&&!c.classList.contains('on'))c.click(); },
      spec:   function(){ var c=document.querySelector('[data-tech="breakout"]');     if(c&&!c.classList.contains('on'))c.click(); },
      tech:   function(){ var c=document.querySelector('[data-goat="ark"]');          if(c&&!c.classList.contains('on'))c.click(); },
      bal:    function(){ var c=document.querySelector('[data-preset="quality"]');    if(c&&!c.classList.contains('on'))c.click(); },
    };
    if (_IMAP[_investor]) {
      setTimeout(function() {
        // Ensure BIST is selected — use direct property set to avoid triggering runScan via selectExchange
        var bistBtn = document.querySelector('.exbtn[data-exchange="bist"]');
        if (bistBtn && !bistBtn.classList.contains('on')) {
          document.querySelectorAll('.exbtn').forEach(function(b){ b.classList.remove('on'); });
          bistBtn.classList.add('on');
          currentExchange = 'bist';
        }
        _IMAP[_investor]();
        runScan();
      }, 300);
    }
  }
  // Bilgi Bankası "stratejiyi dene" + Son Taramalar derin bağlantısı: ?strateji=KEY (&ex=BORSA)
  var _strat = _sp.get('strateji');
  if (_strat) {
    var _stratEx = (_sp.get('ex') || '').toLowerCase();
    setTimeout(function(){
      // İstenen borsayı seç (varsa) — runScan tetiklemeden doğrudan, strateji uygulanınca taranır
      if (_stratEx) {
        var exb = document.querySelector('.exbtn[data-exchange="' + _stratEx + '"]');
        if (exb && !exb.classList.contains('on')) {
          document.querySelectorAll('.exbtn').forEach(function(b){ b.classList.remove('on'); });
          exb.classList.add('on');
          currentExchange = _stratEx;
        }
      }
      if (typeof GURUS !== 'undefined' && GURUS[_strat] && typeof applyStrategyAndGo === 'function') applyStrategyAndGo(_strat);
      else if (typeof PRESETS !== 'undefined' && PRESETS[_strat] && typeof applyPresetAndGo === 'function') applyPresetAndGo(_strat);
      else if (typeof TECH_PRESETS !== 'undefined' && TECH_PRESETS[_strat] && typeof applyTechAndGo === 'function') applyTechAndGo(_strat);
    }, 200);
  }
  // Filtre & Strateji toplamı = tüm strateji/lens chip'leri + 34 filtre kriteri
  var total = document.querySelectorAll('[data-goat],[data-preset],[data-tech]').length + 34;
  var el = document.querySelector('[data-strat-count]');
  if(el) el.textContent = total + '+';
  upgradeGoatChips();
});


// ── Sidebar Collapse ──

function toggleSidebar() {
  if (window.innerWidth <= 768) { closeMobileDrawer(); return; }
  var sb         = document.getElementById('sidebar');
  var reopen     = document.getElementById('sb-reopen');
  var tickerWrap = document.getElementById('ticker-wrap');
  if (!sb) return;
  var collapsed = sb.classList.toggle('collapsed');
  if (reopen)     reopen.style.display = collapsed ? 'flex' : 'none';
  if (tickerWrap) tickerWrap.classList.toggle('sb-open', collapsed);
  try { localStorage.setItem('df_sb_collapsed', collapsed ? '1' : '0'); } catch(e) {}
}

function initSidebarState() {
  if (window.innerWidth <= 768) { closeMobileDrawer(); return; }
  // Varsayılan: sol filtre paneli GİZLİ (collapsed) — sonuçlara tam alan.
  // #sb-reopen sekmesiyle istendiğinde açılır (borsa/sektör/lens erişimi korunur).
  var sb         = document.getElementById('sidebar');
  var reopen     = document.getElementById('sb-reopen');
  var tickerWrap = document.getElementById('ticker-wrap');
  if (sb)         sb.classList.add('collapsed');
  if (reopen)     reopen.style.display = 'flex';
  if (tickerWrap) tickerWrap.classList.add('sb-open');
}
function collapseSidebar(instant) {
  if (window.innerWidth <= 768) return;
  var sb = document.getElementById('sidebar');
  var reopen = document.getElementById('sb-reopen');
  var tickerWrap = document.getElementById('ticker-wrap');
  if (!sb || sb.classList.contains('collapsed')) return;
  if (instant) {
    // Overlay arkasında görünmez kapanış: animasyonsuz
    sb.style.transition = 'none';
    setTimeout(function(){ sb.style.transition = ''; }, 50);
  }
  sb.classList.add('collapsed');
  if (reopen) reopen.style.display = 'flex';
  if (tickerWrap) tickerWrap.classList.add('sb-open');
  try { localStorage.setItem('df_sb_collapsed', '1'); } catch(e) {}
}
