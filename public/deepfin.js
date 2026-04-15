// ═══════════════════════════════════════════════════════════════
// DeepFin — Varlık Navigasyon Sistemi
// ═══════════════════════════════════════════════════════════════

// ── Chip seçim fonksiyonları ──────────────────────────────────
function chipRadio(el) {
  var c = el.closest('.chips') || el.parentElement;
  c.querySelectorAll('.chip').forEach(function(x){ x.classList.remove('on'); });
  el.classList.add('on');
}
function chipToggle(el) { el.classList.toggle('on'); }

// ── Durum ─────────────────────────────────────────────────────
var _activeAsset = null;
var _fonTicker   = [];
var _kriptoTicker= [];
var _fonData     = [];
var _kriptoData  = [];
var _fonMeta     = {};
var _kriptoMeta  = {};

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
      {icon:'📌', label:'Varlık Seç',    desc:'Hisse senedi, yatırım fonu veya kripto para seç'},
      {icon:'🎛', label:'Filtrele',      desc:'Strateji, kategori veya özel filtreni uygula'},
      {icon:'▶',  label:'Tara',          desc:'Saniyeler içinde tüm piyasa taranır'},
      {icon:'🔎', label:'İncele',        desc:'Sonuçlara tıkla — metrikler ve detaylı analiz'}
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
    big: 'FON', sub: '800+ Türk yatırım fonu tek ekranda · TEFAS canlı veri.',
    steps: [
      {icon:'📋', label:'Fon Türü',          desc:'Yatırım, Hisse, Para Piyasası kategorisini seç'},
      {icon:'📊', label:'Filtrele',          desc:'YTD%, 1Y%, Büyüklük, Yatırımcı sayısına göre'},
      {icon:'▶',  label:'Fon Tara',          desc:'TEFAS\'tan 800+ fon gerçek zamanlı taranır'},
      {icon:'⭐', label:'Favorile & Sırala', desc:'Sütun başlığına tıkla, favorile, kaydet'}
    ]
  },
  kripto: {
    big: 'KRİPTO', sub: 'CoinGecko + TradingView verisiyle coin tara.',
    steps: [
      {icon:'🌐', label:'Kategori Seç', desc:'DeFi, Layer 1, GameFi veya tüm coinler'},
      {icon:'📈', label:'Preset Seç',   desc:'Momentum, RSI Dip, ATH Yakın hazır stratejiler'},
      {icon:'▶',  label:'Kripto Tara',  desc:'CoinGecko + TradingView verisi çekilir'},
      {icon:'🔎', label:'Coin İncele',  desc:'Fiyat, RSI, ATH%, TradingView rating\'i gör'}
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
  cont.innerHTML = '<div class="onb-title">Nasıl Kullanılır?</div><div class="onb-steps">' + stepsHtml + '</div>';
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
  panel.querySelectorAll('.chip').forEach(function(c){ c.classList.remove('on'); });
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
  // Toolbar'ı göster, sayacı güncelle, stats-bar'ı gizle (fon/kripto için)
  var toolbar = document.getElementById('toolbar');
  if (toolbar) toolbar.style.display = '';
  var statsBar = document.getElementById('stats-bar');
  if (statsBar) statsBar.style.display = 'none';
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
  ra.innerHTML = '<div style="padding:24px;text-align:center;color:var(--muted2);font-size:12px">' + msg + '</div>';
}

// ─────────────────────────────────────────────────────────────
// FON TARAMA
// ─────────────────────────────────────────────────────────────
function runFonScan() {
  var btn = document.querySelector('#sbp-fon .sbp-scan-btn');
  if (btn) { btn.textContent = '⏳ Taranıyor...'; btn.disabled = true; }
  _showLoading('⏳ TEFAS verisi yükleniyor...');

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
        throw new Error('TEFAS geçici hata — lütfen birkaç saniye bekleyip tekrar deneyin');
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
      var ra=document.getElementById('result-area');
      if(ra) ra.innerHTML='<div style="padding:20px;text-align:center;color:var(--red);font-size:12px">Hata: '+e.message+'</div>';
    })
    .finally(function(){ if(btn){btn.textContent='▶ Fon Tara';btn.disabled=false;} });
}

function _renderFon(funds, meta) {
  if (!funds.length) {
    var ra=document.getElementById('result-area');
    if(ra) ra.innerHTML='<div style="padding:30px;text-align:center;color:var(--muted2);font-size:12px">Eşleşen fon bulunamadı.</div>';
    return;
  }
  var fR=function(v){
    if(v==null) return '<span style="color:var(--muted2)">—</span>';
    return '<span style="color:'+(v>=0?'var(--green)':'var(--red)')+'">'+(v>=0?'+':'')+v.toFixed(1)+'%</span>';
  };
  var fPay=function(v){ if(!v||v<=0) return '—'; if(v>=1e9) return (v/1e9).toFixed(1)+'B'; if(v>=1e6) return (v/1e6).toFixed(0)+'M'; if(v>=1e3) return (v/1e3).toFixed(0)+'K'; return v; };
  var CAT_LABEL = { YAT:'Hisse', BOR:'Borçl.', PMI:'Para Piy.', KAR:'Karma', ALT:'Altın', DÖV:'Döviz', SRB:'Serbest', GGF:'G.Giriş' };
  var catBadge = function(cat) {
    if(!cat) return '';
    var code = (cat.match(/\(([^)]+)\)/) || [])[1] || cat;
    var label = CAT_LABEL[code] || code.slice(0,6);
    return '<span style="font-size:9px;padding:1px 4px;border-radius:3px;background:var(--s3);color:var(--muted2);margin-left:4px">'+label+'</span>';
  };
  var truncName = function(n){ return n && n.length > 42 ? n.slice(0,42)+'...' : (n||''); };
  var rows=funds.map(function(f,i){
    var ver=f.verified?'<sup style="color:var(--green);font-size:8px">✓</sup>':'';
    var isFav=fonFavSet.has(f.code);
    return '<tr>'
      +'<td class="nfav" onclick="event.stopPropagation();toggleFonFav(\''+f.code+'\')" title="'+(isFav?'Favorilerden çıkar':'Favorilere ekle')+'"><span class="fav-icon'+(isFav?' fav-on':'')+'">★</span></td>'
      +'<td style="padding:7px 6px;white-space:nowrap">'
        +'<span class="row-num">'+(i+1)+'</span>'
        +'<span class="sym-wrap"><span class="row-arrow">›</span><span class="sym">'+f.code+'</span>'+ver+catBadge(f.category)+'</span>'
        +'<div class="tsub" title="'+f.name+'">'+truncName(f.name)+'</div>'
      +'</td>'
      +'<td class="tn">₺'+(f.price||0).toFixed(4)+'</td>'
      +'<td class="tn">'+fR(f.ret7d)+'</td>'
      +'<td class="tn">'+fR(f.retYtd)+'</td>'
      +'<td class="tn">'+fR(f.ret1m)+'</td>'
      +'<td class="tn">'+fR(f.ret3m)+'</td>'
      +'<td class="tn">'+fR(f.ret1y)+'</td>'
      +'<td class="tn">'+(f.sharpe!=null?f.sharpe.toFixed(2):'—')+'</td>'
      +'<td class="tn muted">₺'+(f.totalValueM||0).toFixed(0)+'M</td>'
      +'<td class="tn muted">'+(f.investors?f.investors.toLocaleString('tr-TR'):'—')+'</td>'
      +'<td class="tn muted">'+fPay(f.paycount)+'</td>'
      +'</tr>';
  }).join('');
  var hdr='<div class="res-hdr"><b>TEFAS Fon</b><span class="res-cnt">'+funds.length+' fon</span></div>';
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
  var tbl='<table><thead><tr><th style="width:28px"></th><th>Fon</th>'+thSort+'</tr></thead><tbody>'+rows+'</tbody></table>';
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
  _renderFon(_sortAsset(_fonData, sortSt.field, sortSt.dir), _fonMeta);
}

// ─────────────────────────────────────────────────────────────
// KRİPTO TARAMA
// ─────────────────────────────────────────────────────────────
function runKriptoScan() {
  var btn=document.querySelector('#sbp-kripto .sbp-scan-btn');
  if(btn){btn.textContent='⏳ Taranıyor...';btn.disabled=true;}
  _showLoading('⏳ CoinGecko · TradingView · DeFiLlama verisi yükleniyor...');

  var params=new URLSearchParams({limit:'200',sort:'market_cap_desc'});
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
    })
    .catch(function(e){
      var ra=document.getElementById('result-area');
      if(ra) ra.innerHTML='<div style="padding:20px;text-align:center;color:var(--red);font-size:12px">Hata: '+e.message+'</div>';
    })
    .finally(function(){if(btn){btn.textContent='▶ Kripto Tara';btn.disabled=false;}});
}

function _renderKripto(coins, meta) {
  if(!coins.length){
    var ra=document.getElementById('result-area');
    if(ra) ra.innerHTML='<div style="padding:30px;text-align:center;color:var(--muted2);font-size:12px">Eşleşen coin bulunamadı.</div>';
    return;
  }
  var fP=function(v){if(!v)return'—';if(v>=1000)return'$'+v.toLocaleString('en',{maximumFractionDigits:0});if(v>=1)return'$'+v.toFixed(2);if(v>=0.01)return'$'+v.toFixed(4);return'$'+v.toFixed(6);};
  var fM=function(v){if(!v)return'—';if(v>=1e9)return'$'+(v/1e9).toFixed(1)+'B';if(v>=1e6)return'$'+(v/1e6).toFixed(0)+'M';return'$'+v.toFixed(0);};
  var fC=function(v){if(v==null)return'<span style="color:var(--muted2)">—</span>';return'<span style="color:'+(v>=0?'var(--green)':'var(--red)')+'">'+(v>=0?'+':'')+v.toFixed(1)+'%</span>';};
  var tvBadge=function(r){var map={STRONG_BUY:['var(--green)','G.AL'],BUY:['var(--green)','AL'],NEUTRAL:['var(--muted2)','NÖT'],SELL:['var(--red)','SAT'],STRONG_SELL:['var(--red)','G.SAT']};if(!r||!map[r])return'<span style="color:var(--muted2)">—</span>';return'<span style="color:'+map[r][0]+';font-size:9px;font-weight:700">'+map[r][1]+'</span>';};
  var fTvl=function(tvl,mcTvl){
    if(!tvl) return '<span style="color:var(--muted2)">—</span>';
    var tvlTxt=tvl>=1e9?'$'+(tvl/1e9).toFixed(1)+'B':tvl>=1e6?'$'+(tvl/1e6).toFixed(0)+'M':'$'+tvl.toFixed(0);
    var ratioTxt=mcTvl!=null?'<div style="font-size:9px;color:var(--muted2)">'+mcTvl.toFixed(1)+'x</div>':'';
    return tvlTxt+ratioTxt;
  };
  var note=(meta.sources&&meta.sources.note)||'';
  var truncName = function(n){ return n && n.length > 30 ? n.slice(0,30)+'...' : (n||''); };
  var hasTvl = coins.some(function(c){ return c.tvl != null; });
  var rows=coins.map(function(c,i){
    var ver=c.verified?'<sup style="color:var(--green);font-size:8px">✓</sup>':'';
    var img=c.image?'<img src="'+c.image+'" width="14" height="14" style="border-radius:50%;vertical-align:middle;margin-right:3px" onerror="this.remove()">':'';
    var isFav=kriptoFavSet.has(c.symbol);
    return '<tr>'
      +'<td class="nfav" onclick="event.stopPropagation();toggleKriptoFav(\''+c.symbol+'\')" title="'+(isFav?'Favorilerden çıkar':'Favorilere ekle')+'"><span class="fav-icon'+(isFav?' fav-on':'')+'">★</span></td>'
      +'<td style="padding:7px 6px;white-space:nowrap">'
        +'<span class="row-num">'+(c.rank||i+1)+'</span>'
        +'<span class="sym-wrap"><span class="row-arrow">›</span>'+img+'<span class="sym">'+(c.symbol||'').toUpperCase()+'</span>'+ver+'</span>'
        +'<div class="tsub">'+truncName(c.name)+'</div>'
      +'</td>'
      +'<td class="tn">'+fP(c.price)+'</td>'
      +'<td class="tn">'+fC(c.change24h)+'</td>'
      +'<td class="tn">'+fC(c.change7d)+'</td>'
      +'<td class="tn">'+fC(c.change30d)+'</td>'
      +'<td class="tn muted">'+fM(c.mcap)+'</td>'
      +'<td class="tn muted">'+fM(c.volume24h)+'</td>'
      +'<td class="tn muted">'+(c.rsi14!=null?c.rsi14.toFixed(0):'—')+'</td>'
      +'<td class="tn">'+fC(c.athChange)+'</td>'
      +(hasTvl?'<td class="tn muted">'+fTvl(c.tvl,c.mcTvl)+'</td>':'')
      +'<td class="tn">'+tvBadge(c.tvRating)+'</td>'
      +'</tr>';
  }).join('');
  var srcLabel = hasTvl ? 'CoinGecko · TradingView · DeFiLlama' : 'CoinGecko · TradingView';
  var hdr='<div class="res-hdr"><b>₿ Kripto</b><span class="res-cnt">'+coins.length+' coin</span>'+(note?'<span class="res-ok">'+note+'</span>':'')+'<span class="res-src">'+srcLabel+'</span></div>';
  var kCols=[
    {k:'price',l:'Fiyat'},{k:'change24h',l:'24s%'},{k:'change7d',l:'7G%'},{k:'change30d',l:'30G%'},
    {k:'mcap',l:'Piy.Değ.'},{k:'volume24h',l:'Hacim'},{k:'rsi14',l:'RSI'},{k:'athChange',l:'ATH%'}
  ];
  if(hasTvl) kCols.push({k:'tvl',l:'TVL'});
  var kThSort=kCols.map(function(c){
    var active=sortSt.field===c.k;
    var arrow=active?(sortSt.dir==='desc'?' ↓':' ↑'):'';
    return '<th class="right'+(active?' sorted':'')+'" style="cursor:pointer" onclick="_kriptoSort(\''+c.k+'\')">'
      +c.l+arrow+'</th>';
  }).join('');
  var tbl='<table><thead><tr><th style="width:28px"></th><th>Coin</th>'+kThSort+'<th class="right">TV</th></tr></thead><tbody>'+rows+'</tbody></table>';
  _showResultArea(hdr, tbl, coins.length);
}



function _kriptoSort(field) {
  if (sortSt.field === field) sortSt.dir = sortSt.dir === 'desc' ? 'asc' : 'desc';
  else { sortSt.field = field; sortSt.dir = 'desc'; }
  var sf = document.getElementById('sortf');
  var sd = document.getElementById('sortd');
  if (sf) sf.value = field;
  if (sd) sd.value = sortSt.dir;
  _renderKripto(_sortAsset(_kriptoData, sortSt.field, sortSt.dir), _kriptoMeta);
}

var _tvCurrentSym = null;

// ═══════════════════════════════════════════
// BIST SYMBOLS — Full list (150+ hisse)
// Finnhub uses SYMBOL.IS format for BIST
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
  bist:   { name: 'BIST',    currency: '₺', currencyCode: 'TRY', flag: '🇹🇷', yahooSuffix: '.IS', filters: [] },
  nasdaq: { name: 'NASDAQ',  currency: '$',  currencyCode: 'USD', flag: '🇺🇸', yahooSuffix: '',    filters: [{ left: 'exchange', operation: 'equal', right: 'NASDAQ' }] },
  sp500:  { name: 'S&P 500', currency: '$',  currencyCode: 'USD', flag: '🇺🇸', yahooSuffix: '',    filters: [] },
  dax:    { name: 'DAX',     currency: '€',  currencyCode: 'EUR', flag: '🇩🇪', yahooSuffix: '.DE', filters: [] },
  lse:    { name: 'LSE',     currency: '£',  currencyCode: 'GBP', flag: '🇬🇧', yahooSuffix: '.L',  filters: [] },
  nikkei: { name: 'Nikkei',  currency: '¥',  currencyCode: 'JPY', flag: '🇯🇵', yahooSuffix: '.T',  filters: [] },
  nyse:   { name: 'NYSE',   currency: '$',  currencyCode: 'USD', flag: '🇺🇸', yahooSuffix: '',    filters: [{ left: 'exchange', operation: 'equal', right: 'NYSE' }] },
};

let allData = [];
let filtered = [];
let searchQ = '';
let selSym = null;
let sortSt = {field:'marketCapitalization', dir:'desc'};
let fxRates = {TRY:44.1, EUR:1.163, GBP:1.333, JPY:0.00633};
let scanAborted = false;

// ═══════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════


// ═══════════════════════════════════════════
// FAVORİLER
// ═══════════════════════════════════════════
var favSet = new Set(JSON.parse(localStorage.getItem('df_favs') || '[]'));
var favFilterActive = false;
var fonFavSet = new Set(JSON.parse(localStorage.getItem('df_fon_favs') || '[]'));
var kriptoFavSet = new Set(JSON.parse(localStorage.getItem('df_kripto_favs') || '[]'));

function saveFavs() { localStorage.setItem('df_favs', JSON.stringify([...favSet])); }
function saveFonFavs() { localStorage.setItem('df_fon_favs', JSON.stringify([...fonFavSet])); }
function saveKriptoFavs() { localStorage.setItem('df_kripto_favs', JSON.stringify([...kriptoFavSet])); }

function toggleFonFav(code) {
  if (fonFavSet.has(code)) { fonFavSet.delete(code); showToast('✕ ' + code + ' favorilerden çıkarıldı'); }
  else { fonFavSet.add(code); showToast('★ ' + code + ' favorilere eklendi'); }
  saveFonFavs();
  _renderFon(_sortAsset(_fonData, sortSt.field, sortSt.dir), _fonMeta);
}
function toggleKriptoFav(sym) {
  if (kriptoFavSet.has(sym)) { kriptoFavSet.delete(sym); showToast('✕ ' + sym + ' favorilerden çıkarıldı'); }
  else { kriptoFavSet.add(sym); showToast('★ ' + sym + ' favorilere eklendi'); }
  saveKriptoFavs();
  _renderKripto(_sortAsset(_kriptoData, sortSt.field, sortSt.dir), _kriptoMeta);
}

function toggleFav(sym) {
  if (favSet.has(sym)) { favSet.delete(sym); showToast('✕ ' + sym + ' favorilerden çıkarıldı'); }
  else { favSet.add(sym); showToast('★ ' + sym + ' favorilere eklendi'); }
  saveFavs(); renderTable(); _updateFavBtn();
}

function _updateFavBtn() {
  var label = favFilterActive ? '★ Favoriler (' + favSet.size + ')' : '☆ Favoriler';
  ['fav-filter-btn', 'tb-fav-btn'].forEach(function(id) {
    var btn = document.getElementById(id);
    if (!btn) return;
    btn.classList.toggle('on', favFilterActive);
    btn.textContent = label;
  });
}

function toggleFavFilter() {
  favFilterActive = !favFilterActive;
  _updateFavBtn(); renderTable();
}

// ═══════════════════════════════════════════
// KOLON SEÇİCİ
// ═══════════════════════════════════════════
const COL_DEFS = [
  {key:'name', label:'ŞİRKET ADI', def:true},
  {key:'price', label:'FİYAT', def:true},
  {key:'mcap', label:'P.Değeri', def:true},
  {key:'pe', label:'F/K', def:true},
  {key:'pb', label:'PD/DD', def:true},
  {key:'ps', label:'F/S', def:true},
  {key:'roe', label:'ROE%', def:true},
  {key:'roa', label:'ROA%', def:true},
  {key:'margin', label:'MARJ%', def:true},
  {key:'revg', label:'GELİR↑%', def:true},
  {key:'epsg', label:'K.BÜY%', def:true},
  {key:'fscore', label:'F-Score', def:true},
  {key:'de', label:'B/Ö', def:true},
  {key:'cr', label:'CARİ', def:true},
  {key:'div', label:'TEMETTÜ%', def:true},
  {key:'peg', label:'PEG', def:true},
  {key:'tech_rating', label:'TV Rating', def:true},
  {key:'rsi', label:'RSI', def:true},
  {key:'perf3m', label:'3A Geti%', def:true},
  {key:'sector', label:'SEKTÖR', def:true},
];
var _colVisible = null;

function loadColPrefs() {
  if (_colVisible) return;
  try {
    var saved = localStorage.getItem('df_cols_v3');
    if (saved) { _colVisible = {}; JSON.parse(saved).forEach(function(k){ _colVisible[k]=true; }); return; }
  } catch(e) {}
  // Varsayılan: tüm sütunlar görünür
  _colVisible = {};
  COL_DEFS.forEach(function(d){ _colVisible[d.key]=true; });
}

function saveColPrefs() {
  localStorage.setItem('df_cols_v3', JSON.stringify(Object.keys(_colVisible).filter(function(k){ return _colVisible[k]; })));
}

function isColVisible(key) { loadColPrefs(); return !!_colVisible[key]; }

function applyColVisibility() {
  loadColPrefs();
  COL_DEFS.forEach(function(d) {
    var vis = isColVisible(d.key);
    document.querySelectorAll('[data-col="'+d.key+'"]').forEach(function(el){ el.style.display = vis ? '' : 'none'; });
  });
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
      return '<a href="'+(n.url||'#')+'" target="_blank" rel="noopener" class="dnews-item">'
        + '<div class="dnews-meta"><span class="dnews-src">'+(n.source||'')+'</span><span class="dnews-date">'+dt+'</span></div>'
        + '<div class="dnews-title">'+(n.headline||n.title||'')+'</div></a>';
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
// TRADINGVIEW SCANNER — tek istekte tüm BIST
// ═══════════════════════════════════════════
async function runScan(){
  closeMobileDrawer();
  // Disclaimer kontrolü
  if (!disclaimerAccepted && !localStorage.getItem('df_disclaimer_v2')) {
    showDisclaimerModal();
    return;
  }
  // Döviz kurları güncelleme (USD bazlı)
  try {
    const rateRes = await fetch('/api/rates');
    if(rateRes.ok) {
      const r = await rateRes.json();
      // /api/rates direkt {TRY, EUR, GBP, JPY} döner (USD bazlı)
      if(r.TRY) fxRates.TRY = r.TRY;
      if(r.EUR) fxRates.EUR = 1 / r.EUR;
      if(r.GBP) fxRates.GBP = 1 / r.GBP;
      if(r.JPY) fxRates.JPY = 1 / r.JPY;
    }
  } catch(e) { /* fallback kurlar kullanılır */ }
  const btn = document.getElementById('scanbtn');
  btn.disabled = true;
  scanAborted = false;
  document.getElementById('stopbtn').style.display = 'none';
  allData = [];
  filtered = [];
  selSym = null;
  closeDetail();
  showState('loading');
  document.getElementById('toolbar').style.display = 'none';
  document.getElementById('prog').style.width = '30%';
  document.getElementById('loadtxt').textContent = 'Taranıyor...';
  const exMeta = EXCHANGE_META[currentExchange] || EXCHANGE_META.bist;
  document.getElementById('loadsub').textContent = `${exMeta.flag} ${exMeta.name} hisseleri alınıyor...`;
  startScanEta(currentExchange);

  // Field isimleri borsa bazlı farklı — exchange'e göre doğru set
  const isBIST = (currentExchange === 'bist');
  // TradingView field isimleri — konsoldan teyit edildi ✓
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
    'Perf.3M','Perf.6M','Perf.Y','RSI'
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
    'Perf.3M','Perf.6M','Perf.Y','RSI'
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
    'Perf.3M','Perf.6M','Perf.Y','RSI'
  ];
  const COLUMNS_BY_EXCHANGE = {
    bist:   COLS_BIST,
    nasdaq: COLS_US,
    sp500:  COLS_US,
    dax:    COLS_GLOBAL,
    lse:    COLS_GLOBAL,
    nikkei: COLS_GLOBAL,
    nyse:   COLS_US
  };
  const payload = {
    columns: COLUMNS_BY_EXCHANGE[currentExchange] || COLUMNS_BY_EXCHANGE.default,
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
  // Proxy üzerinden — kaynak gizli
  const res = await fetch('/api/scan?exchange=' + currentExchange, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    document.getElementById('prog').style.width = '70%';

    const text = await res.text();
    if(!res.ok) throw new Error(`Proxy hatası: HTTP ${res.status} — ${text.slice(0,200)}`);

    let json;
    try { json = JSON.parse(text); } catch(e) { throw new Error('Parse hatası: ' + text.slice(0,200)); }

    // Eğer body string olarak geldiyse (eski proxy formatı) içini parse et
    if(json.body && typeof json.body === 'string') {
      try { json = JSON.parse(json.body); } catch(e) { throw new Error('Body parse hatası: ' + json.body.slice(0,200)); }
    }

    if(json.error) {
      // Hatalı field varsa otomatik kaldır ve tekrar dene
      const badField = json.error.match(/"([^"]+)"/)?.[1];
      if (badField) {
        const cols = payload.columns;
        const idx = cols.indexOf(badField);
        if (idx > -1) {
          cols.splice(idx, 1);
          // Tekrar dene
          const exCfg2 = EXCHANGE_META[currentExchange] || EXCHANGE_META.bist;
          if (exCfg2.filters.length > 0) payload.filter = exCfg2.filters;
          const res2 = await fetch('/api/scan?exchange=' + currentExchange, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
          const text2 = await res2.text();
          const json2 = JSON.parse(text2);
          if (json2.error) throw new Error('API (retry): ' + json2.error);
          Object.assign(json, json2);
        } else {
          throw new Error('API: ' + json.error);
        }
      } else {
        throw new Error('API: ' + json.error);
      }
    }
    if(!json.data || json.data.length === 0) {
      const msg = json.totalCount > 0
        ? `API yanıt verdi (${json.totalCount} hisse) ama data boş — filtre sorunu`
        : 'Veri yok — ' + JSON.stringify(json).slice(0,150);
      throw new Error(msg);
    }

    document.getElementById('prog').style.width = '100%';

    // Parse TradingView response — index bazlı, sıra garantili
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
      const rsi14      = g('RSI');

      // TradingView sembol formatı: "BIST:THYAO" → "THYAO"
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
          return SECTOR_TR[sector] || sector;
        })(),
        '52WeekHigh': high1m || null,
        '52WeekLow': low1m || null,
        piotroski: g('piotroski_f_score') !== null ? Math.round(g('piotroski_f_score')) : null,
        fromHigh: (high1m && close && high1m > 0) ? ((close - high1m) / high1m * 100) : null,
        fromLow:  (low1m  && close && low1m  > 0) ? ((close - low1m)  / low1m  * 100) : null,
        techRating: techRating !== null ? techRating : null,
        maRating:   maRating   !== null ? maRating   : null,
        oscRating:  oscRating  !== null ? oscRating  : null,
        perf3m:     perf3m     !== null ? perf3m     : null,
        perf6m:     perf6m     !== null ? perf6m     : null,
        perfY:      perfY      !== null ? perfY      : null,
        rsi14:      rsi14      !== null ? rsi14      : null,
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
    const _exm = EXCHANGE_META[currentExchange]||EXCHANGE_META.bist;

    updateExchangeBadge();
    applyAndRender();

  } catch(err) {
    showState('errstate');
    document.getElementById('errmsg').textContent = err.message || 'Bilinmeyen hata';
  } finally {
    btn.disabled = false;
    stopScanEta();
    document.getElementById('stopbtn').style.display = 'none';
  }
}

// ═══════════════════════════════════════════
// PRESETS — Temel Analiz Hazır Filtreler
// ═══════════════════════════════════════════
const PRESETS = {
  // Klasik değer yatırımı: F/K<15, PD/DD<2, temettü ödeyen
  value:    { label: 'Değer Hisseleri',    desc: 'Değer yatırımcısı için asıl mesele şirketin gerçek değeri ile piyasa fiyatı arasındaki açığı bulmaktır. Kazancına göre ucuz, borsa değeri defter değerine yakın ve temettü ödeyen şirketler aranır. Piyasa bu farkı er ya da geç kapatır — sabır şart.', filters: {pe_max:15, pb_max:2, div_min:2} },
  // Büyüme: kazanç+gelir ivmesi, güçlü özkaynak getirisi
  growth:   { label: 'Büyüme Hisseleri',   desc: 'Büyüme yatırımcısı için bugünkü fiyat değil yarınki büyüklük önemlidir. Hem satışları hem karları hızla artan, özkaynaklarını verimli kullanan şirketler aranır. Kısa vadede pahalı görünebilir ama büyüme sürdüğü sürece fiyat da onu takip eder.', filters: {earng_min:20, revg_min:15, roe_min:15} },
  // Temettü: yüksek verim, sürdürülebilir ödeme kapasitesi
  dividend: { label: 'Temettü Hisseleri',  desc: 'Temettü yatırımcısı için hisse fiyatının dalgalanması değil, düzenli nakit akışı önemlidir. Yüksek temettü dağıtan, borcu makul, ödeme kapasitesi güçlü şirketler aranır. Hisse değer kazanmasa bile temettü geliri başlı başına bir getiridir.', filters: {div_min:4, de_max:80, cr_min:1.2} },
  // Kalite: Buffett/Munger "wonderful company at fair price"
  quality:  { label: 'Kaliteli Şirketler', desc: 'Kalite yatırımcısı için hangi piyasada olursa olsun ayakta kalan şirket önemlidir. Özkaynak getirisi yüksek, hem brüt hem net marjı güçlü, borcu az şirketler aranır. Kriz dönemlerinde bu tür şirketler en az hasar görür.', filters: {roe_min:20, margin_min:15, gross_min:35, de_max:80, cr_min:1.5} },
  // Az borçlu: Buffett "borçsuz şirket" prensibi
  lowdebt:  { label: 'Az Borçlu Şirketler', desc: 'Borç düşmanı yatırımcı için ekonomi kötüye gittiğinde en başta borçlu şirketler çöker. Toplam borcu özkaynaklarının küçük bir kısmı olan, elinde bol nakit bulunduran şirketler aranır. Faiz baskısı yok, kriz dayanımı yüksek.', filters: {de_max:30, cr_min:2} },
  // Momentum: güçlü ivme, hem büyüme hem fiyat güç
  momentum: { label: 'Momentum Hisseleri', desc: 'Momentum yatırımcısı için hem satışları hem karları aynı anda hızlanan şirket nadir ve değerlidir. İkisi birlikte artıyorsa şirket gerçekten ivme kazanıyor demektir. Piyasa bunu fark edince fiyat da bunu yansıtmaya başlar.', filters: {revg_min:20, earng_min:20} }
};

// Teknik Analiz Presetleri
// Teknik Analiz Presetleri
// Teknik Analiz Presetleri
const TECH_PRESETS = {

  // ── GELİŞTİRİLMİŞ (mevcut 6) ──────────────────────────────────────────

  breakout: {
    label: 'Kırılım',
    desc: 'Kırılım takipçisi için uzun süre dar bir aralıkta sıkışan ve ardından güçlü bir hareketle o aralığı kıran hisse ilgi çeker. Hacimin de artması bu kırılımın sahte olmadığının işareti. Trendin tam başlangıç noktasını yakalamak için.',
    filters: { from_high_max: -5, chg_min: 1.5, vol_min: 0.5, tech_rating_min: 0.1 }
  },

  oversold: {
    label: 'Dip Fırsatı',
    desc: 'Dip avcısı için herkes satarken almak cesaret ister ama fırsat da getirir. Sert bir düşüşün ardından teknik göstergeler aşırı satılmış bölgesine giren hisseler aranır. Temel değerleri hâlâ sağlamsa toparlanma potansiyeli taşır.',
    filters: { from_high_max: -20, chg_min: 0, rsi_max: 35 }
  },

  nearHigh: {
    label: 'Zirveye Yakın',
    desc: 'Trend takipçisi için zirvesine yakın olmak genellikle trendin devam ettiğinin işareti. Son bir ayın en yüksek fiyatına çok yakın, orta vadede de kazanmış hisseler aranır. Güçlü trendde olan hisseyi yakalamak isteyenler için.',
    filters: { from_high_max: -3, perf3m_min: 5 }
  },

  pullback: {
    label: 'Sağlıklı Çekilme',
    desc: 'Düzeltme avcısı için güçlü bir trendin içindeki kısa süreli geri çekilme, hem trend güçlü hem fiyat daha makul anlamına gelir. Zirveden sınırlı geri çekilmiş, yıllık dibinden ise uzaklaşmış hisseler aranır. Trende daha iyi fiyattan girmek için.',
    filters: { from_high_max: -10, from_low_min: 10, perf6m_min: 10 }
  },

  strongDay: {
    label: 'Güçlü Gün',
    desc: 'Bugün kayda değer yükselen ve bunu normalin üzerinde hacimle destekleyen hisseler. Hacimli yükseliş rastgele değil, arkasında bir katalizör olduğuna işaret eder.',
    filters: { chg_min: 2, vol_min: 0.5 }
  },

  highVolume: {
    label: 'Kurumsal Hacim',
    desc: 'Çok yüksek hacimle işlem görürken fiyatı da yükselen hisseler. Bu ölçekte hacim genellikle büyük kurumsal alıcıların devrede olduğunu gösterir.',
    filters: { vol_min: 5, chg_min: 0 }
  },

  // ── YENİ ──────────────────────────────────────────────────────────────

  techBuy: {
    label: '26 İndikatör AL',
    desc: 'RSI, MACD, ADX, Stochastic ve hareketli ortalamalar dahil yirmi altı teknik göstergenin çoğunluğu alım sinyali veren hisseler. Tek indikatör değil, teknik tablonun tamamı aynı yönü gösteriyor.',
    filters: { tech_rating_min: 0.5 }
  },

  momentum3m: {
    label: '3 Aylık Lider',
    desc: 'Son üç ve altı ayda piyasanın önünde giden hisseler. Her iki zaman diliminde de güçlü olan momentum kısa vadeli değil, orta vadede de geçerli demektir.',
    filters: { perf3m_min: 15, perf6m_min: 20 }
  },

  trendFollow: {
    label: 'Güçlü Trendde',
    desc: 'Yıllık en düşük seviyesinden önemli ölçüde yükseliş yapmış ve bu kazancını koruyan hisseler. Dip geride kaldı, trend yukarı ve güçlü.',
    filters: { from_low_min: 25, perf6m_min: 10 }
  },

  rsiBounce: {
    label: 'RSI Toparlanması',
    desc: 'Aşırı satılmış bölgeden çıkmış ama henüz pahalı bölgeye girmemiş hisseler. Yıllık dibinden biraz yukarıda — toparlanma başlamış, ivme henüz erken aşamada.',
    filters: { rsi_min: 30, rsi_max: 50, from_low_min: 3 }
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
    desc: 'Özkaynak getirisi ve net marjı yüksek, borcu makul ve nakit yeterli, üstelik kazancına göre makul fiyatlı şirketler. Kaliteli ama piyasanın henüz fark etmediği, katalizör bekleyen profil.',
    filters: {roe_min:15, margin_min:10, de_max:80, cr_min:1.2, pe_max:20}
  },
  ark: {
    label: 'Cathie Wood / ARK',
    desc: 'Satışları çok hızlı büyüyen, karları da artan ve kısa vadeli borçlarını karşılayacak nakit bulunduran şirketler. Yüksek büyüme öncelikli, kâr etmeye başlamış olması yeterli.',
    filters: {revg_min:30, earng_min:20, cr_min:1}
  },
  buffett: {
    label: 'Warren Buffett',
    desc: 'Ne aşırı ucuz ne aşırı pahalı — kazancının makul bir katında satılıyor. Hem brüt hem net marjı yüksek, özkaynak getirisi güçlü, borcu sınırlı ve nakit dengeli. Altı kriter aynı anda.',
    filters: {pe_min:5, pe_max:25, roe_min:20, margin_min:20, gross_min:40, de_max:50, cr_min:1.5}
  },
  einhorn: {
    label: 'David Einhorn — Deep Value',
    desc: 'Kazancına göre ucuz, borcu düşük, kısa vadeli nakit yeterli ve net marjı pozitif olan şirketler. Kârlı ama piyasanın gözden kaçırdığı — fiyatın er ya da geç düzeleceği varsayımı.',
    filters: {pe_max:15, de_max:50, cr_min:1.5, margin_min:8, roe_min:10}
  },
  fisher: {
    label: 'Philip Fisher — Scuttlebutt',
    desc: 'Satışları ve karları birlikte büyüyen, hem brüt hem net marjı güçlü, borcu kontrollü şirketler. İstikrarlı büyüme ile güçlü karlılığın aynı anda bulunması şart.',
    filters: {revg_min:15, earng_min:15, gross_min:35, margin_min:12, de_max:60}
  },
  graham: {
    label: 'Benjamin Graham',
    desc: 'Beş güvenlik filtresi aynı anda: fiyat kazancının on katından ucuz, borsa değeri defter değerine yakın, borç düşük, kısa vadeli nakit iki kat güçlü ve temettü ödeyen. Hepsini birden geçen hisse azdır — en muhafazakâr filtre.',
    filters: {pe_max:10, pb_max:1.5, de_max:50, cr_min:2, div_min:1}
  },
  greenblatt: {
    label: 'Joel Greenblatt — Magic Formula',
    desc: 'Özkaynak getirisi çok yüksek — şirket gerçekten iyi. Kazancına göre de makul fiyatlı — pahalı değil. İki kriter birlikte sağlandığında yüksek kaliteyi ucuza almak mümkün.',
    filters: {roe_min:25, pe_max:15, de_max:80, cr_min:1}
  },
  icahn: {
    label: 'Carl Icahn — Activist Value',
    desc: 'Borsa değeri defter değerine yakın, kazancına göre ucuz, borcu düşük, nakit güçlü ve temettü ödeyen şirketler. Nakit zengini ama düşük değerlenen — aktivist baskıyla değer açığa çıkar.',
    filters: {pb_max:1.5, pe_max:12, de_max:60, cr_min:1.5, div_min:1}
  },
  klarman: {
    label: 'Seth Klarman — Margin of Safety',
    desc: 'Kazancına ve varlıklarına göre çok ucuz, borcu minimal, nakit çok güçlü ve net marjı pozitif şirketler. Beş kriterin hepsi aynı anda — en katı güvenlik marjı filtresi.',
    filters: {pe_max:10, pb_max:1.2, de_max:40, cr_min:2, margin_min:5}
  },
  lynch: {
    label: 'Peter Lynch — GARP',
    desc: 'Karları hızla büyüyen ama büyümesine kıyasla fiyatı hâlâ ucuz olan şirketler. Büyüme hızı fiyat/kazanç oranını geçiyor — yani büyümesine göre ucuz. Borcu makul, nakit yeterli.',
    filters: {pe_min:5, pe_max:35, earng_min:15, de_max:80, cr_min:1},
    special: 'peg'
  },
  minervini: {
    label: 'Mark Minervini — SEPA',
    desc: 'Karları çok hızlı büyüyen, özkaynak getirisi ve net marjı güçlü, borcu kontrollü şirketler. Temel tablo güçlü olmalı — teknik kırılım bunun üzerine geldiğinde sinyal tamamlanır.',
    filters: {earng_min:25, roe_min:17, margin_min:10, de_max:100, cr_min:1}
  },
  munger: {
    label: 'Charlie Munger — Quality Compounder',
    desc: 'Brüt ve net marjı çok yüksek, özkaynak getirisi güçlü, neredeyse borçsuz ve nakit dengeli şirketler. Dört kalite kriteri çok katı tutulmuş — en güçlü iş modellerini süzer.',
    filters: {gross_min:50, roe_min:20, de_max:30, margin_min:20, cr_min:1.5}
  },
  oneil: {
    label: "William O'Neil — CAN SLIM",
    desc: 'Karları ve satışları hızla büyüyen, özkaynak getirisi güçlü, borcu kontrollü şirketler. Temel tablonun güçlü olması şart — teknik kırılım ve kurumsal alım buna eklenir.',
    filters: {earng_min:25, revg_min:15, roe_min:17, de_max:100, cr_min:1}
  },
  oshaughnessy: {
    label: "O'Shaughnessy — What Works on Wall St.",
    desc: 'Yıllık satışlarına göre ucuz, temettü ödeyen, satışları büyüyen ve özkaynak getirisi pozitif şirketler. Dört farklı kriterin birlikte sağlanması uzun vadede güvenilir getiri veriyor.',
    filters: {ps_max:1.5, div_min:1, revg_min:10, roe_min:10}
  },
  piotroski: {
    label: 'Piotroski F-Score',
    desc: 'Dokuz soruluk bilanço testi: karlılık artıyor mu, nakit güçleniyor mu, borç azalıyor mu, verimlilik yükseliyor mu? Yüksek puan alan şirketlerin bilanço kalitesi hissiyat değil sayılarla kanıtlanmış.',
    filters: {roe_min:3, cr_min:1, de_max:120},
    special: 'piotroski'
  },
  schloss: {
    label: 'Walter Schloss — Deep Value',
    desc: 'Borsa değeri varlık değerinin altında, kazancına göre ucuz, borcu çok az, nakit güçlü ve temettü ödeyen şirketler. Beş kriter birlikte en derin değer filtresini oluşturuyor.',
    filters: {pb_max:1, pe_max:12, de_max:30, div_min:1, cr_min:1.5}
  },
  citadel: {
    label: 'Citadel — Wellington',
    desc: 'Özkaynak getirisi ve net marjı yüksek, borcu makul, nakit yeterli ve karları büyüyen şirketler. Büyük kurumsal hisse seçim standartlarını karşılayan kalite profili.',
    filters: {roe_min:15, margin_min:12, de_max:70, cr_min:1.2, earng_min:10}
  },
  deshaw: {
    label: 'D.E. Shaw — Oculus',
    desc: 'Karları ve satışları birlikte hızla büyüyen, özkaynak getirisi ve net marjı yüksek, nakit dengesi sağlam şirketler. Büyüme, verimlilik ve momentum aynı anda güçlü — algoritmanın aradığı kombinasyon.',
    filters: {earng_min:20, roe_min:18, margin_min:15, revg_min:15, cr_min:1}
  },
  millennium: {
    label: 'Millennium Management',
    desc: 'Özkaynak getirisi ve net marjı pozitif, borcu sınırlı, nakit güçlü ve karları istikrarlı büyüyen şirketler. Risk odaklı seçim: borç düşük tutulurken karlılık ve büyüme birlikte aranıyor.',
    filters: {roe_min:12, margin_min:10, de_max:60, cr_min:1.5, earng_min:8}
  }

};

function tblScroll(px){
  var w = document.getElementById('twrap');
  if(w) w.scrollBy({left:px, behavior:'smooth'});
}

// ── UNİFİED CHİP SİSTEMİ — tüm gruplardan toplam max 3 seçim ──

// Tüm seçili chip'lerin filtrelerini merge edip uygula
function applyAllChips() {
  // Goat/preset chip'leri hisse için — aktif değilse hisseyi seç
  if (_activeAsset !== 'hisse') selectAsset('hisse');

  var merged = {};
  var specials = [];

  // GOAT chip'leri
  document.querySelectorAll('.goat-chip.on').forEach(function(c) {
    var g = GURUS[c.dataset.goat];
    if (!g) return;
    if (g.special) specials.push(g.special);
    Object.keys(g.filters).forEach(function(k) {
      var v = g.filters[k];
      if (!(k in merged)) { merged[k] = v; return; }
      if (k.endsWith('_min')) merged[k] = Math.max(merged[k], v);
      if (k.endsWith('_max')) merged[k] = Math.min(merged[k], v);
    });
  });

  // Temel analiz preset'leri
  document.querySelectorAll('#presets .chip.on').forEach(function(c) {
    var p = PRESETS[c.dataset.preset];
    if (!p) return;
    Object.keys(p.filters).forEach(function(k) {
      var v = p.filters[k];
      if (!(k in merged)) { merged[k] = v; return; }
      if (k.endsWith('_min')) merged[k] = Math.max(merged[k], v);
      if (k.endsWith('_max')) merged[k] = Math.min(merged[k], v);
    });
  });

  // Teknik analiz preset'leri
  document.querySelectorAll('#tech-presets .chip.on').forEach(function(c) {
    var p = TECH_PRESETS[c.dataset.tech];
    if (!p) return;
    Object.keys(p.filters).forEach(function(k) {
      var v = p.filters[k];
      if (!(k in merged)) { merged[k] = v; return; }
      if (k.endsWith('_min')) merged[k] = Math.max(merged[k], v);
      if (k.endsWith('_max')) merged[k] = Math.min(merged[k], v);
    });
  });

  // Inputları temizle ve merged değerleri uygula
  document.querySelectorAll('.finps input').forEach(function(i){ i.value = ''; });
  Object.keys(merged).forEach(function(k) {
    var el = document.getElementById(k); if (el) el.value = merged[k];
  });

  // Açıklama metinleri — tüm aktif chip'lerden
  var allInfos = [];
  document.querySelectorAll('.goat-chip.on').forEach(function(c) {
    var g = GURUS[c.dataset.goat];
    if (g) allInfos.push({ label: g.label, desc: g.desc, infoId: c.closest('[id]') ? c.closest('[id]').id === 'goat-chips' ? 'goat-info' : 'goat-fund-info' : 'goat-info' });
  });
  document.querySelectorAll('#presets .chip.on').forEach(function(c) {
    var p = PRESETS[c.dataset.preset];
    if (p) allInfos.push({ label: c.textContent, desc: p.desc, infoId: 'preset-info' });
  });
  document.querySelectorAll('#tech-presets .chip.on').forEach(function(c) {
    var p = TECH_PRESETS[c.dataset.tech];
    if (p) allInfos.push({ label: p.label, desc: p.desc, infoId: 'tech-preset-info' });
  });

  // Tüm info div'leri gizle
  ['goat-info','goat-fund-info','preset-info','tech-preset-info'].forEach(function(id){
    var el = document.getElementById(id); if (el) el.style.display = 'none'; el && (el.innerHTML = '');
  });

  // Bilgileri gruplarına göre dağıt
  var byGroup = {};
  allInfos.forEach(function(info) {
    if (!byGroup[info.infoId]) byGroup[info.infoId] = [];
    byGroup[info.infoId].push('<strong>' + info.label + ':</strong> ' + info.desc);
  });
  Object.keys(byGroup).forEach(function(id) {
    var el = document.getElementById(id);
    if (el) { el.innerHTML = byGroup[id].join('<br><br>'); el.style.display = 'block'; }
  });

  updateClrBtn();
  var special = specials.length > 0 ? specials[0] : null;
  if (allData.length > 0) {
    applyAndRender(special);
  } else {
    // Veri yoksa tara ve bitince filtrele
    runScan();
  }
}

// Toplam seçili chip sayısı
function countSelectedChips() {
  return document.querySelectorAll('.goat-chip.on, #presets .chip.on, #tech-presets .chip.on').length;
}

// GOAT chip'leri
document.getElementById('goat-chips').addEventListener('click', function(e) {
  var chip = e.target.closest('.goat-chip'); if (!chip) return;
  var wasOn = chip.classList.contains('on');
  if (!wasOn && countSelectedChips() >= 5) return;
  chip.classList.toggle('on');
  applyAllChips();
  if (window.innerWidth <= 768) setTimeout(closeMobileDrawer, 200);
});
document.getElementById('goat-fund-chips').addEventListener('click', function(e) {
  var chip = e.target.closest('.goat-chip'); if (!chip) return;
  var wasOn = chip.classList.contains('on');
  if (!wasOn && countSelectedChips() >= 5) return;
  chip.classList.toggle('on');
  applyAllChips();
  if (window.innerWidth <= 768) setTimeout(closeMobileDrawer, 200);
});

// Temel analiz preset'leri
document.getElementById('presets').addEventListener('click', function(e) {
  var chip = e.target.closest('.chip'); if (!chip) return;
  if (!PRESETS[chip.dataset.preset]) return;
  var wasOn = chip.classList.contains('on');
  if (!wasOn && countSelectedChips() >= 5) return;
  chip.classList.toggle('on');
  applyAllChips();
  if (window.innerWidth <= 768) setTimeout(closeMobileDrawer, 200);
});

// Teknik analiz preset'leri
document.getElementById('tech-presets').addEventListener('click', function(e) {
  var chip = e.target.closest('.tech-chip'); if (!chip) return;
  if (!TECH_PRESETS[chip.dataset.tech]) return;
  var wasOn = chip.classList.contains('on');
  if (!wasOn && countSelectedChips() >= 5) return;
  chip.classList.toggle('on');
  applyAllChips();
  if (window.innerWidth <= 768) setTimeout(closeMobileDrawer, 200);
});

function updateClrBtn() {
  const btn = document.getElementById('clrbtn');
  const btnAdv = document.getElementById('clrbtn-adv');
  if(!btn) return;
  const hasChip = document.querySelector('.chip.on');
  const sectorSel = (document.getElementById('sector_filter') || {}).value || '';
  const hasInput = sectorSel !== '' || Array.from(document.querySelectorAll('.finps input')).some(i => i.value !== '');
  btn.style.display = (hasChip || hasInput) ? 'block' : 'none';
}

function clearFilters(resetChips=true){
  document.querySelectorAll('.finps input').forEach(i=>i.value='');
  const sf = document.getElementById('sector_filter'); if(sf) sf.value = '';
  const sfAdv = document.getElementById('sector_filter_adv'); if(sfAdv) sfAdv.value = '';
  if(resetChips) { document.querySelectorAll('.chip').forEach(c=>c.classList.remove('on')); ['goat-info','goat-fund-info','preset-info','tech-preset-info'].forEach(id=>{const el=document.getElementById(id);if(el){el.style.display='none';el.innerHTML='';}});}  
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

function applyAndRender(special){
  // Filter rules: [dataField, minInputId, maxInputId, multiplier]
  const rules = [
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
    ['fromHigh',                       null,         'from_high_max', 1],
    ['fromLow',                        'from_low_min', null,      1],
    ['techRating',                     'tech_rating_min', 'tech_rating_max', 1],
    ['perf3m',                         'perf3m_min', 'perf3m_max', 1],
    ['perf6m',                         'perf6m_min', 'perf6m_max', 1],
    ['perfY',                          'perfy_min',  'perfy_max',  1],
    ['rsi14',                          'rsi_min',    'rsi_max',    1],
    ['currentPrice',                   'price_min',  'price_max', 1],
  ];
  // Hacim ayrı — Milyon lot
  const volMin = getN('vol_min'), volMax = getN('vol_max');
  // Sektör filtresi
  const sectorFilter = (document.getElementById('sector_filter') || {}).value || '';

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
        // Teknik/performans alanları: veri yoksa bu filtreyi atla (eleme)
        const techFields = ['techRating','maRating','oscRating','perf3m','perf6m','perfY','rsi14'];
        if(techFields.indexOf(field) !== -1) continue;
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

  document.getElementById('toolbar').style.display = 'flex';
  document.getElementById('resn').textContent = filtered.length;
  document.getElementById('scann').textContent = allData.length;

  if (filtered.length === 0 && allData.length > 0) {
    showState('twrap');
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
    var activeChips = Array.from(document.querySelectorAll('.chip.on, .goat-chip.on')).map(c => c.textContent.trim());
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
        '<button onclick="clearFilters()" style="padding:9px 24px;background:var(--accent);color:#000;border:none;border-radius:7px;font-size:12px;font-weight:700;cursor:pointer;letter-spacing:.3px;">Tüm Filtreleri Temizle</button>' +
      '</div>';
    return;
  }
  // Önceki sıfır sonuç banner'ını gizle
  var zeroEl = document.getElementById('zero-results');
  if (zeroEl) zeroEl.style.display = 'none';

  showState('twrap');
  // Virtual scroll render
  _vsData = sorted(filtered);
  _vsStart = 0;
  var _wrap = document.getElementById('twrap');
  if (_wrap) _wrap.scrollTop = 0;
  _vsInit();
  _vsRender();
  updateStatsBar();
  updateTicker();
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
    const av = a[sortSt.field] ?? (sortSt.dir==='desc'?-Infinity:Infinity);
    const bv = b[sortSt.field] ?? (sortSt.dir==='desc'?-Infinity:Infinity);
    return sortSt.dir==='desc' ? bv-av : av-bv;
  });
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
  // TradingView market_cap_basic her zaman USD — milyon USD olarak saklıyoruz
  if(v>=1000000) return `$${(v/1000000).toFixed(2)}T`;
  if(v>=1000)    return `$${(v/1000).toFixed(1)}B`;
  return `$${v.toFixed(0)}M`;
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
var _vsRowH    = 36;      // satır yüksekliği (px) - CSS ile uyumlu
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
  if (!tbody || !_vsData.length) return;

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
      if (_vsData && _vsData.length) { if (_vsRAF) cancelAnimationFrame(_vsRAF); _vsRAF = requestAnimationFrame(_vsRender); }
    }, {passive: true});
    window._vsWinListener = true;
  }
}
// ─────────────────────────────────────────────────



function _vsRowHtml(s, idx) {
  // Inline display style — scroll sonrası da korunur
  var cv = function(key) { return isColVisible(key) ? '' : 'display:none;'; };
  var isFav = favSet.has(s.symbol);
  return `<tr onclick="showDetail('${s.symbol}')" class="${selSym===s.symbol?'selrow':''}">
      <td class="nfav" onclick="event.stopPropagation();toggleFav('${s.symbol}')" title="${isFav?'Favorilerden çıkar':'Favorilere ekle'}"><span class="fav-icon${isFav?' fav-on':''}">★</span></td>
      <td data-col="symbol" style="display:table-cell;"><span class="row-num">${idx+1}</span><span class="sym-wrap"><span class="row-arrow">›</span><span class="sym">${s.symbol}</span></span></td>
      <td data-col="name" style="${cv('name')}font-size:11px;color:var(--text2);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${s.name}">${s.name}</td>
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
      <td data-col="perf3m" style="${cv('perf3m')}">${s.perf3m!=null?fPerf(s.perf3m):nil}</td>
      <td data-col="sector" style="${cv('sector')}font-size:10px;color:var(--muted2)">${s.sector||'—'}</td>
    </tr>`;
}function renderTable(){
  // Sort header güncelle
  document.querySelectorAll('thead th').forEach(function(th){
    var oc = th.getAttribute('onclick')||'';
    var match = oc.match(/colSort\('([^']+)'\)/);
    if(match){
      th.classList.toggle('sorted', match[1]===sortSt.field);
      th.classList.toggle('asc', match[1]===sortSt.field && sortSt.dir==='asc');
    }
  });

  _vsData = sorted(favFilterActive ? filtered.filter(function(s){ return favSet.has(s.symbol); }) : filtered);
  _vsInit();
  _vsRender();
  setTimeout(applyColVisibility, 0);
}


// ═══════════════════════════════════════════
// DETAIL PANEL
// ═══════════════════════════════════════════

function buildProfile(s) {
  const profileEl = document.getElementById('dprofile');
  const nameEl = document.getElementById('dprofile-name');
  const metaEl = document.getElementById('dprofile-meta');
  const linksEl = document.getElementById('dprofile-links');
  if(!profileEl) return;

  const sym = s.symbol;
  const ex = currentExchange;
  const isBist = ex === 'bist';
  const isUS = ex === 'nasdaq' || ex === 'sp500';
  const symClean = sym.replace('.IS','');

  // Şirket adı
  // Tam şirket adı — TradingView'dan gelen name field
  nameEl.textContent = s.name || sym;
  nameEl.title = s.name || sym;

  // Meta — sektör + borsa
  const exMeta = EXCHANGE_META[ex] || EXCHANGE_META.bist;
  var metaParts = [];
  if(s.sector) metaParts.push(s.sector);
  metaParts.push(exMeta.flag + ' ' + exMeta.name);
  metaEl.textContent = metaParts.join('  ·  ');

  // Hemen Al + Detaylı Analiz butonları
  linksEl.innerHTML = [
    '<div class="dpl-action-row">',
      '<button class="dpl-buy" onclick="onHemenAl(\'' + sym + '\',\'' + ex + '\')" title="Broker\'da işlem aç">',
        '🛒 Hemen Al',
      '</button>',
      '<button class="dpl-analyze" onclick="openDetayliAnaliz(\'' + symClean + '\',\'' + ex + '\')">',
        '📊 Detaylı Analiz',
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
  
  document.getElementById('dfresh').textContent = `↻ Finnhub · ${new Date().toLocaleTimeString('tr-TR')}`;
  document.getElementById('dsec').textContent = s.symbol + '.IS';

  // Şirket Profili
  buildProfile(s);

  const G = [
    {t:'Değerleme', rows:[
      ['F/K <tag>TTM</tag>', s.peNormalizedAnnual, v=>v.toFixed(1), 'dval-pe'],
      ['PD/DD <tag>FQ</tag>', s.pbAnnual, v=>v.toFixed(2), 'dval-pb'],
      ['F/S <tag>TTM</tag>', s.psTTM, v=>v.toFixed(2), 'dval-ps'],
      ['Piyasa Değeri', s.marketCapitalization, v=>fmc(v)],
      ['Sektör', s.sector, v=>v],
      ['1A Yüksek', s['52WeekHigh'], v=>`${v.toFixed(2)} ₺`],
      ['1A Düşük', s['52WeekLow'], v=>`${v.toFixed(2)} ₺`],
    ]},
    {t:'Kantitatif', rows:[
      ['Piotroski F-Score', s.piotroski, function(v) {
        var color = v>=8?'#00c076':v>=6?'#f0b429':'#f6465d';
        var label = v>=8?'Güçlü':v>=6?'Orta':'Zayıf';
        return '<span style="color:'+color+';font-weight:700">'+v+'/9</span> <span style="color:'+color+';font-size:9px">'+label+'</span>';
      }],
      ['PEG Oranı', s.peg, function(v) {
        var color = v<1?'#00c076':v<2?'#f0b429':'#f6465d';
        var label = v<1?'Ucuz':v<2?'Makul':'Pahalı';
        return '<span style="color:'+color+';font-weight:700">'+v.toFixed(2)+'</span> <span style="color:'+color+';font-size:9px">'+label+'</span>';
      }],
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
  // Panel transition bitmesini bekle (200ms)
  setTimeout(function(){ updateChart(sym); }, 260);

  // Insider & Short Interest — sadece US hisseleri için
  const isUS = ['nasdaq','sp500'].includes(currentExchange);
  document.getElementById('dextra-tabs').style.display = 'flex';
  var insTab = document.querySelector('.dxtab[data-xtab="insider"]');
  var shrTab = document.querySelector('.dxtab[data-xtab="short"]');
  if(insTab) insTab.style.display = isUS?'':'none';
  if(shrTab) shrTab.style.display = isUS?'':'none';
  switchXTab(document.querySelector('.dxtab[data-xtab="fundamentals"]'));
  if (isUS) { fetchInsider(sym); fetchShortInterest(sym); }

  // Yahoo Finance doğrulama — TV verisiyle karşılaştır
  fetchYahooVerify(sym, currentExchange);
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
  script.src = 'https://unpkg.com/lightweight-charts@4.1.3/dist/lightweight-charts.standalone.production.js';
  script.onload = function() {
    _lcLoaded = true; _lcLoading = false;
    _lcQueue.forEach(function(fn){ fn(); }); _lcQueue = [];
  };
  script.onerror = function() { _lcLoading = false; };
  document.head.appendChild(script);
}
// ────────────────────────────────────────────────────

function initChart(container) {
  if (lwChart) { lwChart.remove(); lwChart = null; lwSeries = null; lwVolSeries = null; lwIndSeries = {}; }
  lwChart = LightweightCharts.createChart(container, {
    width: (container.offsetWidth > 50 ? container.offsetWidth : (document.querySelector('.detail.open')?.offsetWidth - 20 || 340)),
    height: 260,
    layout: { background: { color: '#0d1117' }, textColor: '#6a8fa8' },
    grid: { vertLines: { color: '#1c2d40' }, horzLines: { color: '#1c2d40' } },
    crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
    rightPriceScale: { borderColor: '#1c2d40' },
    timeScale: { borderColor: '#1c2d40', timeVisible: true, secondsVisible: false },
    handleScroll: true, handleScale: true,
  });
  lwSeries = lwChart.addCandlestickSeries({
    upColor: '#0ff0b3', downColor: '#ff4d6d',
    borderUpColor: '#0ff0b3', borderDownColor: '#ff4d6d',
    wickUpColor: '#09c48a', wickDownColor: '#cc2244',
  });
  if (window._attachChartResizeObserver) window._attachChartResizeObserver(container);
}

function applyIndicators() {
  if (!lwCandles.length || !lwChart) return;

  // Temizle
  Object.values(lwIndSeries).forEach(s => { try { lwChart.removeSeries(s); } catch(e){} });
  lwIndSeries = {};
  if (lwVolSeries) { try { lwChart.removeSeries(lwVolSeries); } catch(e){} lwVolSeries = null; }

  const active = [...document.querySelectorAll('.itab.on')].map(t => t.dataset.ind);

  if (active.includes('MA20')) {
    const s = lwChart.addLineSeries({ color: '#f0c040', lineWidth: 1, priceLineVisible: false });
    s.setData(calcSMA(lwCandles, 20));
    lwIndSeries['MA20'] = s;
  }
  if (active.includes('MA50')) {
    const s = lwChart.addLineSeries({ color: '#38bdf8', lineWidth: 1, priceLineVisible: false });
    s.setData(calcSMA(lwCandles, 50));
    lwIndSeries['MA50'] = s;
  }
  if (active.includes('EMA20')) {
    const s = lwChart.addLineSeries({ color: '#a78bfa', lineWidth: 1, priceLineVisible: false });
    s.setData(calcEMA(lwCandles, 20));
    lwIndSeries['EMA20'] = s;
  }
  if (active.includes('BB')) {
    const bb = calcBB(lwCandles);
    const su = lwChart.addLineSeries({ color: 'rgba(56,189,248,.5)', lineWidth: 1, priceLineVisible: false });
    const sm = lwChart.addLineSeries({ color: 'rgba(56,189,248,.3)', lineWidth: 1, lineStyle: 1, priceLineVisible: false });
    const sl = lwChart.addLineSeries({ color: 'rgba(56,189,248,.5)', lineWidth: 1, priceLineVisible: false });
    su.setData(bb.upper); sm.setData(bb.mid); sl.setData(bb.lower);
    lwIndSeries['BB_u'] = su; lwIndSeries['BB_m'] = sm; lwIndSeries['BB_l'] = sl;
  }
  if (active.includes('VOL')) {
    lwVolSeries = lwChart.addHistogramSeries({
      color: 'rgba(15,240,179,.3)',
      priceFormat: { type: 'volume' },
      priceScaleId: 'vol',
      scaleMargins: { top: 0.8, bottom: 0 },
    });
    const volData = lwCandles.map(c => ({
      time: c.time,
      value: c.volume || 0,
      color: c.close >= c.open ? 'rgba(15,240,179,.3)' : 'rgba(255,77,109,.3)'
    }));
    lwVolSeries.setData(volData);
  }
}


function updateChart(sym) {
  if (!sym) return;
  if (!_lcLoaded) {
    _loadLightweightCharts(function() { updateChart(sym); });
    return;
  }
  var interval = (document.querySelector('.ctab.on') || {}).dataset && document.querySelector('.ctab.on').dataset.interval || '240';
  var currency = (document.querySelector('.ctab-cur.on') || {}).dataset && document.querySelector('.ctab-cur.on').dataset.currency || 'TL';
  var container = document.getElementById('tv-chart-container');
  if (!container) return;

  initChart(container);

  var suffix = encodeURIComponent((EXCHANGE_META[currentExchange]||EXCHANGE_META.bist).yahooSuffix);
  var url = PROXY_URL + '?action=chart&symbol=' + sym + '&interval=' + interval + '&currency=' + currency + '&suffix=' + suffix;

  fetch(url)
    .then(function(r){ return r.json(); })
    .then(function(data) {
      if (!data || data.s !== 'ok' || !data.candles || !data.candles.length) return;
      lwCandles = data.candles.map(function(c){ return { time:c.t, open:c.o, high:c.h, low:c.l, close:c.c, volume:c.v||0 }; });
      lwSeries.setData(lwCandles);
      lwChart.timeScale().fitContent();

      // Resize: birden fazla deneme - panel transition sonrası kesin boyut
      function _resizeChart(tries) {
        var cont = document.getElementById('tv-chart-container');
        if (!cont || !lwChart) return;
        var w = cont.offsetWidth;
        if (!w || w < 50) {
          var det = document.querySelector('.detail.open');
          w = det ? det.offsetWidth - 24 : 336;
        }
        if (w > 50) {
          lwChart.resize(w, 260);
          lwChart.timeScale().fitContent();
        } else if (tries > 0) {
          setTimeout(function(){ _resizeChart(tries - 1); }, 100);
        }
      }
      _resizeChart(5);
      applyIndicators();
    })
    .catch(function(e){ console.error('Chart error:', e); });
}

// ── Yahoo Finance Doğrulama ──────────────────────────────────────────────
function fetchYahooVerify(sym, ex) {
  var url = '/api/verify?symbol=' + encodeURIComponent(sym) + '&exchange=' + (ex || 'bist');

  fetch(url)
    .then(function(r){ return r.json(); })
    .then(function(data) {
      if(!data || !data.yahoo) return;
      var y = data.yahoo;
      var s = allData.find(function(x){ return x.symbol === sym; });
      if(!s) return;

      // TV → Yahoo karşılaştırma
      var pairs = [
        { key:'peNormalizedAnnual', yVal:y.pe,           dId:'dval-pe',    label:'F/K' },
        { key:'pbAnnual',           yVal:y.pb,           dId:'dval-pb',    label:'PD/DD' },
        { key:'psTTM',              yVal:y.ps,           dId:'dval-ps',    label:'F/S' },
        { key:'roeTTM',             yVal:y.roe,          dId:'dval-roe',   label:'ROE' },
        { key:'roaTTM',             yVal:y.roa,          dId:'dval-roa',   label:'ROA' },
        { key:'netProfitMarginTTM', yVal:y.netMargin,    dId:'dval-nm',    label:'Net Marj' },
        { key:'grossMarginTTM',     yVal:y.grossMargin,  dId:'dval-gm',    label:'Brüt Marj' },
        { key:'dividendYieldIndicatedAnnual', yVal:y.dividendYield, dId:'dval-div', label:'Temettü' },
        { key:'currentRatioAnnual', yVal:y.currentRatio, dId:'dval-cr',    label:'Cari Oran' },
        { key:'totalDebt/totalEquityAnnual',  yVal:y.debtToEquity,  dId:'dval-de',  label:'Borç/Özkaynak' },
      ];

      var mismatch = [];

      pairs.forEach(function(p) {
        var tvVal = s[p.key];
        var yhVal = p.yVal;

        if(tvVal == null || yhVal == null) return;

        // Fark yüzdesi
        var diff = Math.abs(tvVal - yhVal);
        var pct  = tvVal !== 0 ? (diff / Math.abs(tvVal)) * 100 : diff;

        // %15'ten fazla fark → uyarı
        if(pct > 15) {
          mismatch.push({
            label: p.label,
            tv:    tvVal,
            yh:    yhVal,
            pct:   pct.toFixed(0)
          });
        }

        // Yahoo değerini UI'a yaz (daha güvenilir kaynak)
        // dRow'larda dval-* ID'si kullan
        var el = document.getElementById(p.dId);
        if(el && yhVal != null) {
          var formatted = yhVal.toFixed(
            p.key === 'peNormalizedAnnual' || p.key === 'pbAnnual' || p.key === 'currentRatioAnnual' ||
            p.key === 'totalDebt/totalEquityAnnual' || p.key === 'psTTM' ? 2 : 1
          );
          var pctSuffix = ['roeTTM','roaTTM','netProfitMarginTTM','grossMarginTTM',
                           'dividendYieldIndicatedAnnual','revenueGrowthTTMYoy','epsGrowthTTMYoy'].includes(p.key);
          var isColored  = ['roeTTM','roaTTM','netProfitMarginTTM','grossMarginTTM'].includes(p.key);
          var colorClass = isColored ? (yhVal >= 0 ? 'up' : 'dn') : '';

          el.innerHTML = colorClass
            ? '<span class="'+colorClass+'">' + formatted + (pctSuffix ? '%' : '') + '</span>'
            : formatted + (pctSuffix ? '%' : '');

          if(pct > 15) {
            el.innerHTML += ' <span title="TV: '+tvVal.toFixed(2)+' | Yahoo: '+yhVal.toFixed(2)+
              ' (%'+Math.round(pct)+' fark)" style="cursor:help;color:#f0b429;font-size:9px;">⚠</span>';
          }
        }
      });

      // Eğer önemli farklar varsa detail header'ına badge ekle
      var badge = document.getElementById('dverify-badge');
      if(!badge) {
        badge = document.createElement('div');
        badge.id = 'dverify-badge';
        badge.style.cssText = 'font-size:9px;padding:2px 7px;border-radius:4px;font-weight:600;letter-spacing:.3px;cursor:help;';
        var dfresh = document.getElementById('dfresh');
        if(dfresh && dfresh.parentNode) dfresh.parentNode.insertBefore(badge, dfresh.nextSibling);
      }

      if(mismatch.length === 0) {
        badge.textContent = '✓ Doğrulandı';
        badge.style.background = 'rgba(0,192,118,.1)';
        badge.style.color = '#00c076';
        badge.title = 'Tüm oranlar anlık veriyle uyuşuyor';
      } else {
        badge.textContent = '⚠ ' + mismatch.length + ' oran farklı';
        badge.style.background = 'rgba(240,180,41,.1)';
        badge.style.color = '#f0b429';
        badge.title = mismatch.map(function(m){
          return m.label + ': Tarama='+parseFloat(m.tv).toFixed(2)+' Anlık='+parseFloat(m.yh).toFixed(2)+' (%'+m.pct+' fark)';
        }).join(' | ');
      }

      console.log('[DeepFin] Yahoo verify:', sym, mismatch.length === 0 ? '✅ uyumlu' : '⚠ '+mismatch.length+' fark', mismatch);
    })
    .catch(function(e){ console.warn('[DeepFin] Yahoo verify hatası:', e.message); });
}
// ─────────────────────────────────────────────────────────────────────────


function closeDetail(){
  document.getElementById('detail').classList.remove('open');
  selSym = null;
  // Chart'ı sıfırla ki bir sonraki hisse doğru yüklensin
  // chart temizleme updateChart'ta yapılıyor
  if(allData.length) renderTable();
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
  ['empty','loading','errstate','twrap'].forEach(s=>{
    const el = document.getElementById(s);
    el.style.display = s===id ? (s==='twrap'?'block':'flex') : 'none';
  });
}

function abortScan(){
  scanAborted = true;
  document.getElementById('stopbtn').style.display = 'none';
  document.getElementById('scanbtn').disabled = false;
}

// Boot
init();

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
// INSIDER TRADING & SHORT INTEREST
// ══════════════════════════════════════════

function switchXTab(el) {
  if (!el) return;
  document.querySelectorAll('.dxtab').forEach(t => t.classList.remove('on'));
  document.querySelectorAll('.dxpanel').forEach(p => p.classList.remove('on'));
  el.classList.add('on');
  const tab = el.dataset.xtab;
  const panel = document.getElementById('dxpanel-' + tab);
  if (panel) panel.classList.add('on');
}

// SEC EDGAR — Form 4 Insider Trading
async function fetchInsider(symbol) {
  const el = document.getElementById('insider-body');
  el.innerHTML = '<div class="dxloading">SEC EDGAR Form 4 yukleniyor...</div>';
  try {
    const r = await fetch(PROXY_URL + '?action=insider&symbol=' + symbol);
    const data = await r.json();
    if (data.error) throw new Error(data.error);
    const rows = data.results || [];
    if (rows.length === 0) {
      el.innerHTML = '<div class="dxloading">Form 4 verisi bulunamadi</div>';
      return;
    }
    const typeLabel = {
      'P': { label: 'ALIM',    cls: 'insider-buy'  },
      'S': { label: 'SATIM',   cls: 'insider-sell' },
      'A': { label: 'AWARD',   cls: 'insider-buy'  },
      'D': { label: 'DISPOSE', cls: 'insider-sell' },
      'M': { label: 'OPSIYON', cls: '' },
      'G': { label: 'HEDIYE',  cls: '' },
    };
    let tbody = '';
    rows.forEach(function(r) {
      const tl  = typeLabel[r.type] || { label: r.type, cls: '' };
      const val = r.value >= 1e6 ? '$' + (r.value/1e6).toFixed(1) + 'M'
                : r.value >= 1e3 ? '$' + (r.value/1e3).toFixed(0) + 'K'
                : '$' + r.value.toFixed(0);
      const sh  = r.shares >= 1e6 ? (r.shares/1e6).toFixed(1) + 'M'
                : r.shares >= 1e3 ? (r.shares/1e3).toFixed(0) + 'K'
                : String(r.shares.toFixed(0));
      tbody += '<tr>' +
        '<td style="color:var(--muted2)">' + r.date + '</td>' +
        '<td><div style="font-weight:600;color:var(--text)">' + r.owner + '</div>' +
        '<div style="font-size:8px;color:var(--muted2)">' + r.title + '</div></td>' +
        '<td class="' + tl.cls + '">' + tl.label + '</td>' +
        '<td style="font-family:\'JetBrains Mono\',monospace">' + sh + '</td>' +
        '<td style="font-family:\'JetBrains Mono\',monospace;font-weight:600">' + val + '</td>' +
        '</tr>';
    });
    const edgarLink = 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=' + data.cik + '&type=4&owner=include&count=40';
    el.innerHTML =
      '<div style="font-size:9px;color:var(--muted2);margin-bottom:6px;">' +
      'SEC EDGAR Form 4 &nbsp;&middot;&nbsp;' +
      '<a href="' + edgarLink + '" target="_blank" style="color:var(--accent);text-decoration:none;">EDGAR\'da gor &#8599;</a>' +
      '</div>' +
      '<table class="insider-table"><thead><tr>' +
      '<th>Tarih</th><th>Kisi / Unvan</th><th>Islem</th><th>Adet</th><th>Tutar</th>' +
      '</tr></thead><tbody>' + tbody + '</tbody></table>';
  } catch(e) {
    el.innerHTML = '<div class="dxerror">&#9888; ' + e.message + '</div>';
  }
}

async function fetchShortInterest(symbol) {
  const el = document.getElementById('short-body');
  el.innerHTML = '<div class="dxloading">Short interest yukleniyor...</div>';
  try {
    const r = await fetch(PROXY_URL + '?action=short&symbol=' + symbol);
    const data = await r.json();
    if (data.error) throw new Error(data.error);
    renderShortInterest(el, data, symbol);
  } catch(e) {
    const nasdaqUrl = 'https://www.nasdaq.com/market-activity/stocks/' + symbol.toLowerCase() + '/short-interest';
    const finvizUrl = 'https://finviz.com/quote.ashx?t=' + symbol;
    el.innerHTML =
      '<div style="text-align:center;padding:16px;">' +
      '<div style="font-size:28px;margin-bottom:8px;">&#128202;</div>' +
      '<div style="font-size:10px;color:var(--muted2);margin-bottom:12px;">Short interest verisi alinamadi</div>' +
      '<a href="' + nasdaqUrl + '" target="_blank" ' +
      'style="display:inline-block;background:var(--accent);color:#fff;padding:7px 16px;border-radius:5px;font-size:10px;text-decoration:none;font-weight:600;">' +
      symbol + ' &rarr; Nasdaq Short Interest &#8599;</a>' +
      '<div style="margin-top:8px;"><a href="' + finvizUrl + '" target="_blank" ' +
      'style="color:var(--accent);font-size:9px;text-decoration:none;">Finviz\'de gor &#8599;</a></div>' +
      '</div>';
  }
}

function renderShortInterest(el, d, symbol) {
  // Nasdaq API formatı — rows dizisi
  const rows = d.rows || [];
  if (rows.length === 0) {
    el.innerHTML = '<div class="dxloading">Veri bulunamadi</div>';
    return;
  }

  // En son satır = en güncel veri
  const latest = rows[0];
  // Nasdaq format: { settlementDate, shortInterest, avgDailyShareVolume, daysToCover, ... }
  const parseNum = function(s) {
    if (!s) return 0;
    return parseFloat(String(s).replace(/,/g, '')) || 0;
  };

  const settleDate  = latest.settlementDate || latest.date || '—';
  const shortVol    = parseNum(latest.shortInterest);
  const daysToCover = parseNum(latest.daysToCover);
  const avgVol      = parseNum(latest.avgDailyShareVolume);

  // Short % of float
  const floatNum = parseNum(d.floatShares);
  const shortPct = floatNum > 0 ? (shortVol / floatNum) * 100 : 0;
  const pct      = Math.min(shortPct, 100);
  const barColor = pct > 20 ? '#f6465d' : pct > 10 ? '#f0b429' : '#00c076';

  const fmtNum = function(n) {
    return n >= 1e9 ? (n/1e9).toFixed(2) + 'B'
         : n >= 1e6 ? (n/1e6).toFixed(1) + 'M'
         : n >= 1e3 ? (n/1e3).toFixed(0) + 'K'
         : String(Math.round(n));
  };

  // Tablo satırları (son 6 dönem)
  let tableRows = '';
  rows.slice(0, 6).forEach(function(r) {
    const si  = parseNum(r.shortInterest);
    const dtc = parseNum(r.daysToCover);
    const chg = parseNum(r.shortInterest) - parseNum((rows[rows.indexOf(r)+1] || {}).shortInterest);
    const chgColor = chg >= 0 ? '#f6465d' : '#00c076';
    const chgStr  = chg !== 0 ? (chg > 0 ? '+' : '') + fmtNum(chg) : '—';
    tableRows +=
      '<tr>' +
      '<td style="color:var(--muted2)">' + r.settlementDate + '</td>' +
      '<td style="font-weight:600;font-family:monospace">' + fmtNum(si) + '</td>' +
      '<td style="color:' + chgColor + ';font-family:monospace">' + chgStr + '</td>' +
      '<td style="color:' + (dtc > 5 ? '#f6465d' : dtc > 2 ? '#f0b429' : '#00c076') + '">' + dtc.toFixed(1) + 'g</td>' +
      '</tr>';
  });

  const nasdaqUrl = 'https://www.nasdaq.com/market-activity/stocks/' + symbol.toLowerCase() + '/short-interest';

  el.innerHTML =
    '<div style="font-size:9px;color:var(--muted2);margin-bottom:8px;">Son guncelleme: ' + settleDate + ' &middot; Kaynak: Nasdaq</div>' +
    '<div class="si-grid">' +
      '<div class="si-card">' +
        '<div class="si-card-title">SHORT INTEREST</div>' +
        '<div class="si-card-val">' + fmtNum(shortVol) + '</div>' +
        '<div class="si-card-sub">Aciga satilan hisse</div>' +
      '</div>' +
      '<div class="si-card">' +
        '<div class="si-card-title">DAYS TO COVER</div>' +
        '<div class="si-card-val" style="color:' + (daysToCover > 5 ? '#f6465d' : daysToCover > 2 ? '#f0b429' : '#00c076') + '">' + daysToCover.toFixed(1) + '</div>' +
        '<div class="si-card-sub">Ort. gunluk hacim: ' + fmtNum(avgVol) + '</div>' +
      '</div>' +
    '</div>' +
    (floatNum > 0 ?
      '<div class="si-bar-wrap" style="margin-bottom:8px;">' +
        '<div class="si-bar-label"><span>Float Yuzdesi</span>' +
          '<span style="font-weight:700;color:' + barColor + '">' + pct.toFixed(1) + '%</span>' +
        '</div>' +
        '<div class="si-bar-track"><div class="si-bar-fill" style="width:' + pct + '%;background:' + barColor + '"></div></div>' +
        '<div style="display:flex;justify-content:space-between;font-size:8px;color:var(--muted2);margin-top:3px;">' +
          '<span>Dusuk</span><span>10%</span><span>20%</span><span>Yuksek</span>' +
        '</div>' +
      '</div>' : '') +
    '<table class="insider-table">' +
      '<thead><tr><th>Tarih</th><th>Short Hacim</th><th>Degisim</th><th>DTC</th></tr></thead>' +
      '<tbody>' + tableRows + '</tbody>' +
    '</table>' +
    '<div style="margin-top:8px;text-align:center;">' +
      '<a href="' + nasdaqUrl + '" target="_blank" style="color:var(--accent);font-size:9px;text-decoration:none;">Tum gecmis &rarr; Nasdaq &#8599;</a>' +
    '</div>';
}

function selectExchange(el) {
  if(el.classList.contains('disabled')) return;
  document.querySelectorAll('.exbtn').forEach(b => b.classList.remove('on'));
  el.classList.add('on');
  currentExchange = el.dataset.exchange;
  // Adv panel grid sync
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
  if (tbFav) tbFav.style.display = '';
  if (tbCol) tbCol.style.display = '';
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
  document.getElementById('sb-time').textContent = hh + ':' + mm + ':' + ss;
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
<p style="font-size:11px;color:var(--muted2);margin-top:16px;">Veri sağlayıcıların (TradingView, Yahoo Finance vb.) hizmet kesintileri veya veri hataları nedeniyle oluşabilecek zararlardan DeepFin sorumlu tutulamaz.</p>`,

    privacy: `<p><strong style="color:var(--text)">Gizlilik Politikası</strong></p>
<p>DeepFin olarak kullanıcı gizliliğine büyük önem veriyoruz.</p>
<p><strong style="color:var(--text)">Topladığımız veriler:</strong> Platform tamamen istemci taraflı çalışır. Kişisel veri toplamaz, üye kaydı gerektirmez. Kullanım istatistikleri (sayfa görüntüleme, anonim) analitik amaçlı toplanabilir.</p>
<p><strong style="color:var(--text)">Üçüncü taraf servisleri:</strong> TradingView Scanner API, Yahoo Finance ve SEC EDGAR'dan veri çekilir. Bu servislerin kendi gizlilik politikaları geçerlidir.</p>
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
<p style="color:var(--muted);font-size:11px;margin-bottom:16px;">TradingView'in 26 teknik indikatörü kullanılarak hesaplanan gerçek zamanlı sinyaller. Her preset farklı bir piyasa durumuna veya strateji felsefesine karşılık gelir.</p>

<div class="fbk-section">
  <div class="fbk-section-title">📈 Trend & Kırılım Presetleri</div>

  <div class="fbk-card">
    <div class="fbk-card-header"><span class="fbk-chip">Kırılım</span><span class="fbk-tag">Minervini SEPA</span></div>
    <p>Zirvesine yakın, hacim destekli, 26 indikatör AL sinyali veren hisseler. Mark Minervini'nin SEPA (Specific Entry Point Analysis) kırılım koşuluna dayanır. Güçlü trendlerin başlangıç noktasını yakalar.</p>
    <div class="fbk-filters">from_high &gt; -5% · hacim &gt; 0.5M lot · TV Rating &gt; 0.1</div>
  </div>

  <div class="fbk-card">
    <div class="fbk-card-header"><span class="fbk-chip">Zirveye Yakın</span><span class="fbk-tag">Trend Devam</span></div>
    <p>1 aylık zirvesinin %3'ü yakınında VE son 3 ayda en az %5 kazanmış hisseler. Güçlü trendin devam ettiğini gösteren, sürüş biter bitmez alım noktasını işaret eder.</p>
    <div class="fbk-filters">from_high &gt; -3% · 3 ay getiri &gt; %5</div>
  </div>

  <div class="fbk-card">
    <div class="fbk-card-header"><span class="fbk-chip">Güçlü Trendde</span><span class="fbk-tag">Minervini Template</span></div>
    <p>52 hafta düşüğünden %25+ yukarıda, 6 aylık getiri pozitif. Minervini'nin "Trend Template" kriterinin basitleştirilmiş versiyonu — sadece yapısal olarak güçlü hisseler taranır.</p>
    <div class="fbk-filters">52H düşüğünden %25+ · 6 ay getiri &gt; %10</div>
  </div>

  <div class="fbk-card">
    <div class="fbk-card-header"><span class="fbk-chip">Sağlıklı Çekilme</span><span class="fbk-tag">Trend İçi Fırsat</span></div>
    <p>Zirveden %10–25 geri çekilen ama 6 aylık trendi hâlâ güçlü olan hisseler. Güçlü bir trendde normal konsolidasyon sırasında alım fırsatı sunar. "Pullback in uptrend" stratejisi.</p>
    <div class="fbk-filters">from_high: -10% ila -25% · 6 ay getiri &gt; %10</div>
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
    <p>Normalin çok üzerinde hacim eşliğinde fiyat artışı. Büyük kurumsal oyuncuların (fon, banka) pozisyon açtığının teknik sinyali. "Follow the smart money" yaklaşımı.</p>
    <div class="fbk-filters">hacim &gt; 5M lot · günlük değişim &gt; 0</div>
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
    <div class="fbk-card-header"><span class="fbk-chip">26 İndikatör AL</span><span class="fbk-tag">TradingView Consensus</span></div>
    <p>TradingView'in 26 teknik indikatörünü (RSI, MACD, ADX, Stochastic, 15 farklı hareketli ortalama) birleştiren "Recommend.All" skorunun 0.5 üzeri olduğu hisseler. Teknik analizin toplu onayı.</p>
    <div class="fbk-filters">TV Rating &gt; 0.5 (26 indikatör çoğunluğu AL)</div>
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
  // Update adv grid UI
  document.querySelectorAll('#adv-ex-grid .exbtn').forEach(b => b.classList.remove('on'));
  el.classList.add('on');
  // Sync with Başlangıç tab exchange buttons
  const exKey = el.dataset.exchange;
  const mainBtn = document.querySelector('#sb-panel-basic .exbtn[data-exchange="' + exKey + '"]');
  if (mainBtn) selectExchange(mainBtn);
}

// Keep adv pills in sync when main exchange changes
const _origSelectExchange = typeof selectExchange === 'function' ? selectExchange : null;

// ── SIDEBAR TABS ──
function switchSbTab(tab) {
  // Sync adv exchange pill to current exchange on tab switch
  if (tab === 'advanced') {
    const cur = document.querySelector('.exbtn.on');
    if (cur) {
      const exKey = cur.dataset.exchange;
      document.querySelectorAll('#adv-ex-grid .exbtn').forEach(p => {
        p.classList.toggle('on', p.dataset.exchange === exKey);
      });
    }
  }
  document.getElementById('sb-panel-basic').style.display    = tab === 'basic'    ? '' : 'none';
  document.getElementById('sb-panel-advanced').style.display = tab === 'advanced' ? '' : 'none';
  document.getElementById('sb-tab-basic').classList.toggle('active',    tab === 'basic');
  document.getElementById('sb-tab-advanced').classList.toggle('active', tab === 'advanced');
}


// ── SECTOR SYNC ──
function syncSectorAndFilter(source) {
  const basic = document.getElementById('sector_filter');
  const adv   = document.getElementById('sector_filter_adv');
  if (!basic || !adv) return;
  if (source === 'adv') { basic.value = adv.value; }
  else                  { adv.value = basic.value; }
  liveFilter();
}

// Patch basic sector select to also sync
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
      av:  d.average_volume_10d_calc||0,
      bt:  d.beta||0,
      // 52 hafta — allData'da 52WeekHigh
      wh:  d['52WeekHigh']||d['52_week_high']||0,
      wl:  d['52WeekLow']||d['52_week_low']||0,
      // Performans
      pw:  d.Perf_W||0,
      pm:  d.Perf_1M||0,
      py:  d.Perf_Y||0,
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
    t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1a1a1a;border:1px solid #2a2a2a;color:#ededed;font-size:12px;padding:10px 20px;border-radius:8px;z-index:9999;opacity:0;transition:opacity .2s;white-space:nowrap;font-family:DM Sans,sans-serif;';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(t._timer);
  t._timer = setTimeout(function(){ t.style.opacity = '0'; }, 3000);
}
function showHomepage() {
  _doShowHomepage();
}
function _doShowHomepage() {
  hideAnalizPage();
  var _pp=document.getElementById('profile-page'); if(_pp){_pp.style.display='none';_pp.classList.remove('on');}
  document.getElementById('homepage').style.display = 'flex';
  document.getElementById('screener-layout').style.display = 'none';
  document.getElementById('nav-home').classList.add('active');
  document.getElementById('nav-tarama').classList.remove('active');
  var na = document.getElementById('nav-analiz'); if(na) na.classList.remove('active');
  clearFilters();
  if(window.location.pathname !== '/') history.pushState({page:'home'}, '', '/');
}

// ── DISCLAIMER POPUP ──
let disclaimerAccepted = false;


function updateExchangeBadge() {}
// ── TARAMA SÜRESİ TAHMİNİ ──
let scanStartTime = null;
let scanEtaTimer  = null;
const EXCHANGE_ETA = { bist:4, nasdaq:6, sp500:6, dax:5, lse:5, nikkei:5, nyse:6 }; // saniye

function startScanEta(exchange) {
  const total = EXCHANGE_ETA[exchange] || 5;
  scanStartTime = Date.now();
  const etaEl  = document.getElementById('scan-eta');
  const txtEl  = document.getElementById('scan-eta-txt');
  const barEl  = document.getElementById('scan-eta-bar');
  if (!etaEl) return;
  etaEl.style.display = 'block';
  barEl.style.width = '0%';
  clearInterval(scanEtaTimer);
  scanEtaTimer = setInterval(function() {
    const elapsed = (Date.now() - scanStartTime) / 1000;
    const pct     = Math.min((elapsed / total) * 100, 95);
    const rem     = Math.max(Math.ceil(total - elapsed), 1);
    barEl.style.width = pct + '%';
    txtEl.textContent = elapsed < total
      ? 'Tahmini süre: ~' + rem + ' saniye'
      : 'Neredeyse hazır...';
    if (elapsed >= total * 1.5) clearInterval(scanEtaTimer);
  }, 300);
}

function stopScanEta() {
  clearInterval(scanEtaTimer);
  const etaEl = document.getElementById('scan-eta');
  const barEl = document.getElementById('scan-eta-bar');
  if (barEl) barEl.style.width = '100%';
  setTimeout(function() { if (etaEl) etaEl.style.display = 'none'; }, 400);
}

// ── MOBILE DRAWER ──
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
    if (btn) btn.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

function closeMobileDrawer() {
  var sidebar = document.querySelector('.sidebar');
  var overlay = document.getElementById('drawer-overlay');
  var btn     = document.getElementById('hamburger-btn');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
  if (btn)     btn.classList.remove('open');
  document.body.style.overflow = '';
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
  btn.style.background = '#1a1a1a';
  btn.style.color = '#555';
  btn.style.borderColor = '#333';

  disclaimerTimer = setInterval(function() {
    secs--;
    if (secs > 0) {
      cdEl.textContent = '(' + secs + ')';
    } else {
      clearInterval(disclaimerTimer);
      cdEl.textContent = '';
      btn.disabled = false;
      btn.style.cursor = 'pointer';
      btn.style.background = '#ededed';
      btn.style.color = '#000';
      btn.style.borderColor = '#ededed';
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
function _doShowScreener() {
  hideAnalizPage();
  setTimeout(initSidebarState, 0);
  var _pp=document.getElementById('profile-page'); if(_pp){_pp.style.display='none';_pp.classList.remove('on');}
  var na = document.getElementById('nav-analiz'); if(na) na.classList.remove('active');
  // Disclaimer kontrolü
  if (!disclaimerAccepted && !localStorage.getItem('df_disclaimer_v2')) {
    showDisclaimerModal();
    document.getElementById('homepage').style.display = 'none';
    document.getElementById('screener-layout').style.display = 'flex';
    document.getElementById('nav-home').classList.remove('active');
    document.getElementById('nav-tarama').classList.add('active');
    var ts = document.querySelector('.tsearch');
    if(ts) ts.style.display = '';
    return;
  }
  document.getElementById('homepage').style.display = 'none';
  document.getElementById('screener-layout').style.display = 'flex';
  document.getElementById('nav-home').classList.remove('active');
  document.getElementById('nav-tarama').classList.add('active');
  if (!_activeAsset) _updateOnboarding('hisse');
  if(window.location.pathname !== '/screener') history.pushState({page:'screener'}, '', '/screener');
}

function selectExchangeAndGo(exKey) {
  showScreener();
  var btn = document.querySelector('.exbtn[data-exchange="' + exKey + '"]');
  if(btn) selectExchange(btn);
}

function applyStrategyAndGo(goatKey) {
  // Önce temizle, sonra strateji seç
  clearFilters();
  showScreener();
  setTimeout(function(){
    var chip = document.querySelector('.goat-chip[data-goat="' + goatKey + '"]');
    if(chip) { chip.click(); }
    runScan();
  }, 100);
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
})();

// Start on homepage
// analiz dropdown click-outside: analiz.js'de handle ediliyor

// ── URL ROUTING (History API) ─────────────────────────
window.addEventListener('popstate', function(e) {
  var path = window.location.pathname;
  if (path === '/screener') { showScreener(); }
  else if (path === '/' || path === '') { showHomepage(); }
});
// ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function(){
  _initWorker();
  _updateOnboarding(null); // Varsayılan: genel onboarding
  // Tarama sayacını çek
  fetch('/api/stats').then(function(r){ return r.json(); }).then(function(d){
    var el = document.getElementById('stat-scan-count');
    if (!el || !d.scans) return;
    var n = d.scans;
    var fmt = n >= 1000 ? (Math.floor(n/1000) + '.000+') : (n + '+');
    el.textContent = fmt;
  }).catch(function(){});
  var _p = new URLSearchParams(window.location.search).get('from');
  var _path = window.location.pathname;
  if (_p === 'profile' || _p === 'screener' || _p === 'analiz' || _path === '/screener') {
    showScreener();
    if (allData.length === 0) runScan();
  } else {
    showHomepage();
  }
  var total = document.querySelectorAll('[data-goat],[data-preset],[data-tech]').length;
  var el = document.querySelector('[data-strat-count]');
  if(el) el.innerHTML = total + ' <span>strateji</span>';
});


// ── Sidebar Collapse ──

function toggleSidebar() {
  var sb  = document.getElementById('sidebar');
  var btn = document.getElementById('sb-toggle');
  if (!sb || !btn) return;
  var collapsed = sb.classList.toggle('collapsed');
  btn.classList.toggle('collapsed', collapsed);
  btn.textContent = collapsed ? '›' : '‹';
  btn.title = collapsed ? 'Strateji panelini aç' : 'Strateji panelini gizle';
  try { localStorage.setItem('df_sb_collapsed', collapsed ? '1' : '0'); } catch(e) {}
}

function initSidebarState() {
  try {
    if (localStorage.getItem('df_sb_collapsed') === '1') {
      var sb  = document.getElementById('sidebar');
      var btn = document.getElementById('sb-toggle');
      if (sb)  sb.classList.add('collapsed');
      if (btn) { btn.classList.add('collapsed'); btn.textContent = '›'; btn.title = 'Strateji panelini aç'; }
    }
  } catch(e) {}
}
