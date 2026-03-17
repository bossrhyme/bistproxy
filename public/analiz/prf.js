
function openTradingView() {
  var ex = _prfEx || 'bist';
  var sym = _prfSym || '';
  var prefixes = {bist:'BIST',nasdaq:'NASDAQ',sp500:'NYSE',dax:'XETR',lse:'LSE',nikkei:'TSE'};
  var pfx = prefixes[ex] || 'BIST';
  window.open('https://www.tradingview.com/chart/?symbol='+pfx+'%3A'+sym, '_blank');
}

function loadTVWidget(sym, ex) {
  var container = document.getElementById('prf-tv-widget');
  if(!container) return;

  var exMeta = EXCHANGE_META[ex] || EXCHANGE_META.bist;
  var suffix = encodeURIComponent(exMeta.yahooSuffix || '');
  var url    = '/api/scan?action=chart&symbol=' + sym + '&interval=D&currency=TL&suffix=' + suffix;

  // Placeholder gizle, chart container oluştur
  var ph = document.getElementById('prf-tv-placeholder');
  if(ph) ph.style.display = 'none';
  container.innerHTML = '<div id="prf-chart-inner" style="width:100%;height:300px;background:#0d1117;"></div>';

  function _drawChart() {
    var chartEl = document.getElementById('prf-chart-inner');
    if(!chartEl || !window.LightweightCharts) {
      // LC yüklenmedi - hata göster
      if(chartEl) chartEl.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#64748b;font-size:12px;">Grafik kütüphanesi yüklenemedi</div>';
      return;
    }

    // Sabit width ile başlat, sonra gerçek width ile resize
    var _initW = chartEl.offsetWidth || chartEl.parentElement && chartEl.parentElement.offsetWidth || 600;
    var chart = LightweightCharts.createChart(chartEl, {
      width:  _initW > 50 ? _initW : 600,
      height: 300,
      layout:     { background:{ color:'#0d1117' }, textColor:'#6a8fa8' },
      grid:       { vertLines:{ color:'#1c2d40' }, horzLines:{ color:'#1c2d40' } },
      crosshair:  { mode: LightweightCharts.CrosshairMode.Normal },
      rightPriceScale: { borderColor:'#1c2d40' },
      timeScale:  { borderColor:'#1c2d40', timeVisible:true, secondsVisible:false },
      handleScroll: true, handleScale: true,
    });
    var series = chart.addCandlestickSeries({
      upColor:'#00c076', downColor:'#f6465d',
      borderUpColor:'#00c076', borderDownColor:'#f6465d',
      wickUpColor:'#00c076', wickDownColor:'#f6465d',
    });

    fetch(url)
      .then(function(r){ return r.json(); })
      .then(function(data){
        if(!data || data.s !== 'ok' || !data.candles || !data.candles.length){
          if(chartEl) chartEl.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#64748b;font-size:12px;">Grafik verisi bulunamadı</div>';
          return;
        }
        var candles = data.candles.map(function(c){
          return { time:c.t, open:c.o, high:c.h, low:c.l, close:c.c };
        }).filter(function(c){ return c.open != null && c.close != null; });
        if(!candles.length) return;
        console.log('[DeepFin] Chart data loaded:', candles.length, 'candles');
        series.setData(candles);
        chart.timeScale().fitContent();
        // Resize - birkaç kez dene
        function _tryResize(n) {
          var el = document.getElementById('prf-chart-inner');
          if(!el) return;
          var w = el.offsetWidth || el.parentElement && el.parentElement.offsetWidth || 600;
          if(w > 50) { chart.resize(w, 300); chart.timeScale().fitContent(); }
          else if(n > 0) setTimeout(function(){ _tryResize(n-1); }, 100);
        }
        setTimeout(function(){ _tryResize(5); }, 100);
      })
      .catch(function(e){
        console.error('Chart error:', e);
      });

    var ld = document.getElementById('prf-live-dot');
    if(ld) ld.style.display = 'flex';
    console.log('[DeepFin] Chart created. Container:', chartEl ? chartEl.offsetWidth+'x'+chartEl.offsetHeight : 'null');
  }

  // LC yüklü mü kontrol et, değilse bekle
  function _waitAndDraw(attempts) {
    if(window.LightweightCharts) {
      _drawChart();
    } else if(attempts > 0) {
      setTimeout(function(){ _waitAndDraw(attempts - 1); }, 100);
    }
  }
  _waitAndDraw(20); // max 2 saniye bekle
}

function _mkSparkline(containerId, color, trend) {
  // trend: 'up' | 'down' | 'flat'
  var container = document.getElementById(containerId);
  if(!container) return;
  var pts = trend === 'up'   ? 'M0,40 L50,34 L100,26 L150,18 L200,10 L250,5 L300,2'
           : trend === 'down' ? 'M0,5  L50,10 L100,18 L150,26 L200,32 L250,38 L300,42'
           :                    'M0,22 L50,20 L100,24 L150,18 L200,22 L250,20 L300,22';
  var fill = pts + ' L300,44 L0,44Z';
  var cRgb = color === '#00c076' ? '0,192,118' : color === '#f0b429' ? '240,180,41' : '59,130,246';
  container.innerHTML =
    '<svg class="sparkline-svg" viewBox="0 0 300 44" preserveAspectRatio="none">'+
    '<defs><linearGradient id="sg'+containerId+'" x1="0" y1="0" x2="0" y2="1">'+
    '<stop offset="0%" stop-color="'+color+'" stop-opacity=".3"/>'+
    '<stop offset="100%" stop-color="'+color+'" stop-opacity="0"/></linearGradient></defs>'+
    '<path d="'+fill+'" fill="url(#sg'+containerId+')"/>'+
    '<path d="'+pts+'" fill="none" stroke="'+color+'" stroke-width="1.5"/>'+
    '</svg>';
}

function _buildTrend(d) {
  if(!d) return;
  var n = function(v){ return (v!==null&&v!==undefined&&!isNaN(Number(v)))?Number(v):null; };
  var revGrowth = n(d.total_revenue_change_ttm_yoy) || n(d.revenue_growth_ttm_yoy);
  var earnGrowth = n(d.earnings_per_share_diluted_yoy_growth_ttm) || n(d.earnings_per_share_change_ttm_yoy);

  // Gelir büyümesi
  var revEl  = document.getElementById('prf-rev-val');
  var revChg = document.getElementById('prf-rev-chg');
  if(revEl && revGrowth !== null) {
    revEl.textContent  = (revGrowth >= 0 ? '+' : '') + revGrowth.toFixed(1) + '%';
    revEl.style.color  = revGrowth >= 0 ? 'var(--green)' : 'var(--red)';
    if(revChg) { revChg.textContent = 'YoY TTM'; revChg.style.color = revGrowth >= 0 ? 'var(--green)' : 'var(--red)'; }
    _mkSparkline('prf-rev-spark', '#3b82f6', revGrowth > 5 ? 'up' : revGrowth < -5 ? 'down' : 'flat');
  } else {
    if(revEl) revEl.textContent = '—';
    _mkSparkline('prf-rev-spark', '#3b82f6', 'flat');
  }

  // Kazanç büyümesi
  var earnEl  = document.getElementById('prf-earn-val');
  var earnChg = document.getElementById('prf-earn-chg');
  if(earnEl && earnGrowth !== null) {
    earnEl.textContent  = (earnGrowth >= 0 ? '+' : '') + earnGrowth.toFixed(1) + '%';
    earnEl.style.color  = earnGrowth >= 0 ? 'var(--green)' : 'var(--red)';
    if(earnChg) { earnChg.textContent = 'YoY TTM'; earnChg.style.color = earnGrowth >= 0 ? 'var(--green)' : 'var(--red)'; }
    _mkSparkline('prf-earn-spark', '#00c076', earnGrowth > 5 ? 'up' : earnGrowth < -5 ? 'down' : 'flat');
  } else {
    if(earnEl) earnEl.textContent = '—';
    _mkSparkline('prf-earn-spark', '#00c076', 'flat');
  }

  // Performans barları
  var perfEl = document.getElementById('prf-perf-bars');
  if(perfEl) {
    var perfs = [
      {l:'1H', v:n(d.Perf_W)  || n(d.perfW)},
      {l:'1A', v:n(d.Perf_1M) || n(d.perf1M)},
      {l:'1Y', v:n(d.Perf_Y)  || n(d.perfY)},
    ];
    perfEl.innerHTML = perfs.map(function(p){
      if(p.v === null) return '<div class="perf-bar-row"><span class="perf-bar-label">'+p.l+'</span><div class="perf-bar-track"><div class="perf-bar-fill" style="width:0%;background:var(--muted)"></div></div><span class="perf-bar-val" style="color:var(--muted)">—</span></div>';
      var pct = Math.min(Math.abs(p.v), 50);
      var w = (pct / 50 * 100).toFixed(1);
      var col = p.v >= 0 ? 'var(--green)' : 'var(--red)';
      var txt = (p.v >= 0 ? '+' : '') + p.v.toFixed(1) + '%';
      return '<div class="perf-bar-row">'+
        '<span class="perf-bar-label">'+p.l+'</span>'+
        '<div class="perf-bar-track"><div class="perf-bar-fill" style="width:'+w+'%;background:'+col+'"></div></div>'+
        '<span class="perf-bar-val" style="color:'+col+'">'+txt+'</span>'+
      '</div>';
    }).join('');
  }
}


// ── Sektör Ortalaması Yükle ───────────────────────────────────────────────
function loadSectorAvg(sector, ex) {
  if (!sector || _sectorAvg !== null) { _renderSectorComparison(); return; }
  fetch('/api/fundamentals?symbol=_&exchange=' + encodeURIComponent(ex) + '&type=sector_avg&sector=' + encodeURIComponent(sector))
    .then(function(r) { return r.json(); })
    .then(function(data) {
      _sectorAvg = data.avg || {};
      _sectorAvg._count = data.count || 0;
      _renderSectorComparison();
    })
    .catch(function() { _sectorAvg = {}; });
}

function _renderSectorComparison() {
  var d   = _prfData;
  var avg = _sectorAvg;
  if (!d || !avg) return;
  var el = document.getElementById('prf-sector-cmp');
  if (!el) return;

  // Tüm değerleri % birimine normalize et
  // _prfData: roe/roa/margin oran (0.505), TV avg: ham % (50.5)
  var s = {
    pe:    d.pe_ratio,
    pb:    d.price_book_ratio,
    ps:    d.price_sales,
    roe:   d.roe   != null ? d.roe   * 100 : null,
    roa:   d.roa   != null ? d.roa   * 100 : null,
    nm:    d.net_margin   != null ? d.net_margin   * 100 : null,
    gm:    d.gross_margin != null ? d.gross_margin * 100 : null,
    de:    d.debt_to_equity,
    cr:    d.current_ratio,
    div:   d.dividend_yield_recent != null ? d.dividend_yield_recent * 100 : null,
  };
  var a = {
    pe:  avg.pe,
    pb:  avg.pb,
    ps:  avg.ps,
    roe: avg.roe,
    roa: avg.roa,
    nm:  avg.netMargin,
    gm:  avg.grossMargin,
    de:  avg.debtToEquity,
    cr:  avg.currentRatio,
    div: avg.dividendYield,
  };

  function row(label, sv, av, fmt, higherBetter) {
    if (sv == null && av == null) return '';
    var fv  = function(v) { return v != null ? fmt(v) : '—'; };
    var diff = (sv != null && av != null && av !== 0) ? (sv - av) / Math.abs(av) * 100 : null;
    var good = diff != null && (higherBetter ? diff > 5  : diff < -5);
    var bad  = diff != null && (higherBetter ? diff < -5 : diff > 5);
    var badgeCls = good ? 'sc-g' : bad ? 'sc-b' : 'sc-n';
    var badgeTxt = diff != null ? (diff > 0 ? '+' : '') + diff.toFixed(0) + '%' : '—';
    return '<tr>' +
      '<td class="sc-lbl">'+ label +'</td>' +
      '<td class="sc-val">'+ fv(sv) +'</td>' +
      '<td class="sc-val sc-muted">'+ fv(av) +'</td>' +
      '<td><span class="sc-badge '+ badgeCls +'">'+ badgeTxt +'</span></td>' +
    '</tr>';
  }

  var x1  = function(v) { return v.toFixed(1)+'x'; };
  var x2  = function(v) { return v.toFixed(2)+'x'; };
  var pct = function(v) { return v.toFixed(1)+'%'; };
  var dec = function(v) { return v.toFixed(2); };

  var rows = [
    row('F/K',       s.pe,  a.pe,  x1,  false),
    row('PD/DD',     s.pb,  a.pb,  x2,  false),
    row('F/S',       s.ps,  a.ps,  x2,  false),
    row('ROE',       s.roe, a.roe, pct, true),
    row('ROA',       s.roa, a.roa, pct, true),
    row('Net Marj',  s.nm,  a.nm,  pct, true),
    row('Brüt Marj', s.gm,  a.gm,  pct, true),
    row('B/Ö',       s.de,  a.de,  dec, false),
    row('Cari Oran', s.cr,  a.cr,  dec, true),
    row('Temettü',   s.div, a.div, pct, true),
  ].filter(Boolean).join('');

  if (!rows) {
    el.innerHTML = '<p style="color:var(--muted);font-size:12px;padding:12px 0;">Veri yok.</p>';
    return;
  }

  var cnt = avg._count || 0;
  el.innerHTML =
    '<p class="sc-meta">'+ (d.sector||'') + (cnt ? ' &middot; '+ cnt +' şirket' : '') +'</p>'+
    '<table class="sc-tbl">'+
      '<colgroup><col/><col/><col/><col/></colgroup>'+
      '<thead><tr>'+
        '<th>Gösterge</th>'+
        '<th>Hisse</th>'+
        '<th>Sektör</th>'+
        '<th>Fark</th>'+
      '</tr></thead>'+
      '<tbody>'+ rows +'</tbody>'+
    '</table>';
}

function _buildFinancials(d) {
  if(!d) return;
  var n  = function(v,def){ var x=Number(v); return isNaN(x)?def:x; };
  var pct = function(v){ return v!==0?(v*100).toFixed(1)+'%':'—'; };
  var cur = (EXCHANGE_META[_prfEx]||{}).currency || '₺';

  // Özet grid
  var cells = [
    {l:'F/K (TTM)',       v: n(d.pe_ratio,0) ? n(d.pe_ratio,0).toFixed(1)+'x' : '—', cls: n(d.pe_ratio,0)<15&&n(d.pe_ratio,0)>0 ? 'good' : n(d.pe_ratio,0)<25 ? 'mid' : 'bad'},
    {l:'PD/DD',           v: n(d.price_book_ratio,0) ? n(d.price_book_ratio,0).toFixed(2)+'x' : '—', cls: n(d.price_book_ratio,0)<2&&n(d.price_book_ratio,0)>0 ? 'good' : n(d.price_book_ratio,0)<4 ? 'mid' : 'bad'},
    {l:'F/S (TTM)',       v: n(d.price_sales,0) ? n(d.price_sales,0).toFixed(2)+'x' : '—', cls: n(d.price_sales,0)<1&&n(d.price_sales,0)>0 ? 'good' : 'mid'},
    {l:'ROE (TTM)',       v: d.roe ? pct(d.roe) : '—', cls: n(d.roe,0)*100>15 ? 'good' : n(d.roe,0)*100>8 ? 'mid' : 'bad'},
    {l:'ROA (TTM)',       v: d.roa ? pct(d.roa) : '—', cls: n(d.roa,0)*100>8 ? 'good' : n(d.roa,0)*100>3 ? 'mid' : 'bad'},
    {l:'Net Marj',        v: d.net_margin ? pct(d.net_margin) : '—', cls: n(d.net_margin,0)*100>12 ? 'good' : n(d.net_margin,0)*100>5 ? 'mid' : 'bad'},
  ];
  var finSum = document.getElementById('prf-fin-summary');
  if(finSum) finSum.innerHTML = cells.map(function(c){
    return '<div class="fin-cell"><div class="fin-cell-label">'+c.l+'</div><div class="fin-cell-val '+c.cls+'">'+c.v+'</div></div>';
  }).join('');

  // Kârlılık gauge'ları
  var gauges = [
    {l:'Brüt Marj',  v: n(d.gross_margin,0)*100, max:60, color:'#3b82f6'},
    {l:'Net Marj',   v: n(d.net_margin,0)*100,   max:30, color:'#00c076'},
    {l:'ROE',        v: n(d.roe,0)*100,           max:50, color:'#f0b429'},
    {l:'ROA',        v: n(d.roa,0)*100,           max:20, color:'#00c076'},
  ];
  var finGauge = document.getElementById('prf-fin-gauges');
  if(finGauge) finGauge.innerHTML = gauges.map(function(g){
    var w = g.v > 0 ? Math.min(g.v/g.max*100,100).toFixed(1) : 0;
    var show = g.v !== 0 ? (g.v >= 0 ? '+' : '') + g.v.toFixed(1) + '%' : '—';
    return '<div class="fin-gauge-wrap">'+
      '<div class="fin-gauge-label"><span>'+g.l+'</span><span style="color:'+(g.v>0?g.color:'var(--muted)')+'">'+show+'</span></div>'+
      '<div class="fin-gauge-bar"><div class="fin-gauge-fill" style="width:'+w+'%;background:'+g.color+'"></div></div>'+
    '</div>';
  }).join('');

  // Borç & Likidite
  var debtCards = [
    {l:'Borç / Özsermaye', v: d.debt_to_equity ? n(d.debt_to_equity,0).toFixed(2) : '—', sub: n(d.debt_to_equity,0)<0.5?'✓ Düşük risk':n(d.debt_to_equity,0)<1?'Orta':'Yüksek', cls: n(d.debt_to_equity,0)<0.5 ? 'good' : n(d.debt_to_equity,0)<1 ? 'mid' : 'bad'},
    {l:'Cari Oran',        v: d.current_ratio  ? n(d.current_ratio,0).toFixed(2)+'x' : '—', sub: n(d.current_ratio,0)>2?'✓ Güçlü likidite':n(d.current_ratio,0)>1?'Yeterli':'Zayıf likidite', cls: n(d.current_ratio,0)>2 ? 'good' : n(d.current_ratio,0)>1 ? 'mid' : 'bad'},
    {l:'Temettü Verimi',   v: d.dividend_yield_recent ? (n(d.dividend_yield_recent,0)*100).toFixed(2)+'%' : '—', sub: 'Güncel veri', cls: n(d.dividend_yield_recent,0)*100>3 ? 'good' : n(d.dividend_yield_recent,0)*100>1 ? 'mid' : ''},
    {l:'PEG Oranı',        v: d.peg_ratio ? n(d.peg_ratio,0).toFixed(2) : '—', sub: n(d.peg_ratio,0)>0&&n(d.peg_ratio,0)<1?'✓ Cazip büyüme':'<1 = cazip', cls: n(d.peg_ratio,0)>0&&n(d.peg_ratio,0)<1 ? 'good' : n(d.peg_ratio,0)<2 ? 'mid' : 'bad'},
  ];
  var finDebt = document.getElementById('prf-fin-debt');
  if(finDebt) finDebt.innerHTML = debtCards.map(function(c){
    return '<div class="fin-debt-card">'+
      '<div class="fin-debt-label">'+c.l+'</div>'+
      '<div class="fin-debt-val '+c.cls+'">'+c.v+'</div>'+
      '<div class="fin-debt-sub">'+c.sub+'</div>'+
    '</div>';
  }).join('');
}


function goAnaliz() {
  window.location.href = '/analiz/';
}

function goHome() { window.location.href = '/'; }

function goScreener() {
  window.location.href = '/?from=profile';
}
function closeProfil() {
  var from = new URLSearchParams(window.location.search).get('from');
  if (from === 'analiz') {
    window.location.href = '/analiz/';
  } else {
    // from=screener veya bilinmeyen → screener'a dön
    window.location.href = '/?from=profile';
  }
}
function onHemenAl(sym, ex) { showToast('🛒 ' + sym + ' — Broker entegrasyonu yakında!'); }
function showToast(msg) {
  var t = document.getElementById('df-toast');
  if(!t) { t = document.createElement('div'); t.id='df-toast';
    t.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1a1a1a;border:1px solid #2a2a2a;color:#ededed;font-size:12px;padding:10px 20px;border-radius:8px;z-index:9999;opacity:0;transition:opacity .2s;white-space:nowrap;font-family:Inter,sans-serif;';
    document.body.appendChild(t); }
  t.textContent=msg; t.style.opacity='1';
  clearTimeout(t._t); t._t=setTimeout(function(){t.style.opacity='0';},3000);
}



var EXCHANGE_META = {
  bist:   { name: 'BIST',    currency: '₺', currencyCode: 'TRY', yahooSuffix: '.IS', flag: '🇹🇷', tvUrl: 'https://scanner.tradingview.com/turkey/scan',  filters: [] },
  nasdaq: { name: 'NASDAQ',  currency: '$',  currencyCode: 'USD', yahooSuffix: '',    flag: '🇺🇸', tvUrl: 'https://scanner.tradingview.com/america/scan', filters: [{ left: 'exchange', operation: 'equal', right: 'NASDAQ' }] },
  sp500:  { name: 'S&P 500', currency: '$',  currencyCode: 'USD', yahooSuffix: '',    flag: '🇺🇸', tvUrl: 'https://scanner.tradingview.com/america/scan', filters: [] },
  dax:    { name: 'DAX',     currency: '€',  currencyCode: 'EUR', yahooSuffix: '.DE', flag: '🇩🇪', tvUrl: 'https://scanner.tradingview.com/germany/scan', filters: [] },
  lse:    { name: 'LSE',     currency: '£',  currencyCode: 'GBP', yahooSuffix: '.L',  flag: '🇬🇧', tvUrl: 'https://scanner.tradingview.com/uk/scan',      filters: [] },
  nikkei: { name: 'Nikkei',  currency: '¥',  currencyCode: 'JPY', yahooSuffix: '.T',  flag: '🇯🇵', tvUrl: 'https://scanner.tradingview.com/japan/scan',   filters: [] },
};

var allData = [];
var currentExchange = 'bist';
var _prfSym = '';
var _prfEx  = '';
var _prfData = null;
var _prfAiDone = false;
var _sectorAvg = null;
var _urlParams = new URLSearchParams(window.location.search);

function _fmtN(v) {
  if(!v || isNaN(v)) return '—';
  if(Math.abs(v)>=1e12) return (v/1e12).toFixed(1)+'T';
  if(Math.abs(v)>=1e9)  return (v/1e9).toFixed(1)+'B';
  if(Math.abs(v)>=1e6)  return (v/1e6).toFixed(1)+'M';
  return parseFloat(v).toFixed(2);
}

function _setScore(id, val, cls) {
  var el = document.getElementById(id);
  if(el){ el.textContent=val; el.className='prf-score-val '+(cls||''); }
}

function showProfil(sym, ex) {
  _prfSym = sym;
  _prfEx  = ex || 'bist';
  _fundCache = {}; // yeni hisse için cache temizle

  var exMeta = EXCHANGE_META[_prfEx] || {};
  var bcEx = document.getElementById('prf-bc-ex');
  var bcSym = document.getElementById('prf-bc-sym');
  if(bcEx)  bcEx.textContent  = (exMeta.name || _prfEx).toUpperCase();
  if(bcSym) bcSym.textContent = sym.toUpperCase();

  document.getElementById('prf-sym-tag').textContent = sym;
  document.getElementById('prf-ex-tag').textContent  = (exMeta.name || _prfEx).toUpperCase();
  // TV logo CDN: BIST için TUPRS → BIST:TUPRS → logo slug
  var _logoEl = document.getElementById('prf-logo');
  if(_logoEl) {
    // TradingView logo CDN - birden fazla format denenir
    var _tvPfxMap = { bist:'BIST', nasdaq:'NASDAQ', sp500:'NYSE', dax:'XETR', lse:'LSE', nikkei:'TSE' };
    var _tvPfx = _tvPfxMap[_prfEx] || 'BIST';
    var _symLow = sym.toLowerCase();
    // TV logo URL formatları (öncelik sırasıyla):
    // 1. exchange/symbol--big.svg  2. symbol--big.svg  3. Clearbit domain
    var _logoUrls = [
      'https://s3-symbol-logo.tradingview.com/' + _tvPfx.toLowerCase() + '/' + _symLow + '--big.svg',
      'https://s3-symbol-logo.tradingview.com/' + _symLow + '--big.svg',
    ];
    var _logoTry = 0;
    var _img = document.createElement('img');
    _img.alt = sym;
    _img.style.cssText = 'width:40px;height:40px;object-fit:contain;';
    _img.onerror = function() {
      _logoTry++;
      if (_logoTry < _logoUrls.length) {
        _img.src = _logoUrls[_logoTry];
      } else {
        // Fallback: renkli harf avatar
        _logoEl.innerHTML = '';
        _logoEl.textContent = sym.substring(0, 2).toUpperCase();
        _logoEl.style.cssText = 'display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;';
      }
    };
    _img.onload = function() {
      _logoEl.style.background = 'transparent';
      _logoEl.style.border = 'none';
    };
    _img.src = _logoUrls[0];
    _logoEl.innerHTML = '';
    _logoEl.appendChild(_img);
  }
  document.getElementById('prf-fullname').textContent = sym;

  var buyBtn = document.getElementById('prf-buy-btn');
  if(buyBtn) buyBtn.onclick = function(){ onHemenAl(sym, _prfEx); };

  _prfData = allData.find(function(x){
    var s = (x.symbol||'').replace('.IS','').toUpperCase();
    return s === sym.toUpperCase() || (x.symbol||'').toUpperCase() === sym.toUpperCase()+'.IS';
  });

  _buildPrfHero();
  _buildPrfMetrics();
  _buildPrfPiotroski();
  _buildPrfGuru();
  _buildPrfSide();
  _buildTrend(_prfData);
  _buildFinancials(_prfData);
  prfTab('overview', document.querySelector('.prf-tab'));
  _prfAiDone = false;
  // RAF: browser layout tamamlandıktan sonra chart çiz
  requestAnimationFrame(function() {
    setTimeout(function() { loadTVWidget(sym, ex); }, 50);
  });
}

function _buildPrfHero() {
  var d = _prfData;
  if(!d) return;
  var exMeta = EXCHANGE_META[_prfEx] || EXCHANGE_META.bist;
  var cur = exMeta.currency || '₺';

  var price = d.close || d.price || 0;
  var chgPct = d.change_abs || 0;
  document.getElementById('prf-price').textContent = price
    ? cur+' '+price.toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})
    : '—';
  var chgEl = document.getElementById('prf-chg');
  if(chgPct) {
    var sign = chgPct >= 0 ? '+' : '';
    chgEl.textContent = sign+(d.change||0).toFixed(2)+' ('+sign+chgPct.toFixed(2)+'%)';
    chgEl.className = 'prf-chg '+(chgPct>=0?'up':'dn');
  }

  var pe = d.pe_ratio, peg = d.peg_ratio, roe = d.roe, fs = d.piotroski_f_score, mc = d.market_cap_basic;
  _setScore('prf-sc-fscore', fs!==undefined&&fs!==null ? fs+'/9' : '—', fs>=7?'g':fs>=4?'m':'b');
  _setScore('prf-sc-peg', peg ? peg.toFixed(2) : '—', peg&&peg<1?'g':peg&&peg<2?'m':'b');
  _setScore('prf-sc-fk',  pe  ? pe.toFixed(1)+'x' : '—', pe&&pe<15?'g':pe&&pe<25?'m':'b');
  _setScore('prf-sc-roe', roe ? (roe*100).toFixed(1)+'%' : '—', roe&&roe*100>15?'g':roe&&roe*100>8?'m':'b');
  _setScore('prf-sc-mc',  mc  ? _fmtN(mc*1e6) : '—', '');

  if(d.sector) document.getElementById('prf-sector-tag').textContent = d.sector;
  if(d.name)   document.getElementById('prf-fullname').textContent   = d.name;
}

function _buildPrfMetrics() {
  var d = _prfData;
  if(!d) return;
  var metrics = [
    {l:'F/K (TTM)',      v:d.pe_ratio,             fmt:function(v){return v.toFixed(1)+'x';},  cls:function(v){return v>0&&v<15?'g':v<25?'m':'b';}, sub:'Piyasa/Kazanç'},
    {l:'PD/DD',          v:d.price_book_ratio,      fmt:function(v){return v.toFixed(2)+'x';},  cls:function(v){return v>0&&v<2?'g':v<4?'m':'b';},  sub:'Defter değeri'},
    {l:'ROE',            v:d.roe,                   fmt:function(v){return (v*100).toFixed(1)+'%';}, cls:function(v){return v*100>15?'g':v*100>8?'m':'b';}, sub:'Özsermaye getirisi'},
    {l:'ROA',            v:d.roa,                   fmt:function(v){return (v*100).toFixed(1)+'%';}, cls:function(v){return v*100>8?'g':v*100>3?'m':'b';},  sub:'Varlık getirisi'},
    {l:'Net Marj',       v:d.net_margin,            fmt:function(v){return (v*100).toFixed(1)+'%';}, cls:function(v){return v*100>12?'g':v*100>5?'m':'b';}, sub:'Kar/gelir oranı'},
    {l:'Brüt Marj',      v:d.gross_margin,          fmt:function(v){return (v*100).toFixed(1)+'%';}, cls:function(v){return v*100>40?'g':v*100>20?'m':'b';},sub:'Ham kârlılık'},
    {l:'PEG',            v:d.peg_ratio,             fmt:function(v){return v.toFixed(2);},       cls:function(v){return v>0&&v<1?'g':v<2?'m':'b';},  sub:'Büyümeye göre F/K'},
    {l:'F-Score',        v:d.piotroski_f_score,     fmt:function(v){return v+'/9';},              cls:function(v){return v>=7?'g':v>=4?'m':'b';},     sub:'Finansal sağlık'},
    {l:'Cari Oran',      v:d.current_ratio,         fmt:function(v){return v.toFixed(2)+'x';},  cls:function(v){return v>2?'g':v>1?'m':'b';},        sub:'Dönen/kısa borç'},
    {l:'Borç/Öz',        v:d.debt_to_equity,        fmt:function(v){return v.toFixed(2);},       cls:function(v){return v<0.5?'g':v<1?'m':'b';},     sub:'Finansal kaldıraç'},
    {l:'Temettü Verimi', v:d.dividend_yield_recent, fmt:function(v){return (v*100).toFixed(2)+'%';}, cls:function(v){return v*100>3?'g':v*100>1?'m':'b';}, sub:'Yıllık temettü'},
    {l:'Haftalık Değ.',  v:d.Perf_W,                fmt:function(v){return (v>=0?'+':'')+v.toFixed(2)+'%';}, cls:function(v){return v>0?'g':'b';}, sub:'7 günlük performans'},
  ];
  document.getElementById('prf-metrics').innerHTML = metrics.map(function(m){
    var ok = m.v!==null && m.v!==undefined && !isNaN(m.v) && m.v!==0;
    return '<div class="prf-mcell"><div class="prf-mlabel">'+m.l+'</div><div class="prf-mval '+(ok?m.cls(m.v):'')+'">'+(ok?m.fmt(m.v):'—')+'</div><div class="prf-msub">'+m.sub+'</div></div>';
  }).join('');
}

function _buildPrfPiotroski() {
  var d = _prfData;
  var score = d ? d.piotroski_f_score : null;
  if(score===null||score===undefined) { document.getElementById('prf-fscore-num').textContent='—'; return; }
  document.getElementById('prf-fscore-num').textContent = score;
  document.getElementById('prf-fscore-label').textContent = score>=8?'Güçlü Bilanço':score>=5?'Orta Güç':'Zayıf';
  var groups = [
    {title:'Karlılık', items:[
      {t:'Pozitif ROA',             p:d.roa>0},
      {t:'Pozitif Nakit Akışı',     p:d.cash_f_operating_activities>0},
      {t:'Artan ROA (YoY)',         p:score>=5},
      {t:'Nakit Akışı > Net Gelir', p:score>=6},
    ]},
    {title:'Kaldıraç & Likidite', items:[
      {t:'Azalan Uzun Vadeli Borç', p:d.debt_to_equity<1},
      {t:'Artan Cari Oran',         p:d.current_ratio>1.5},
      {t:'Hisse Dilüsyonu Yok',     p:score>=7},
    ]},
    {title:'Verimlilik', items:[
      {t:'Artan Brüt Marj',         p:d.gross_margin>0.2},
      {t:'Artan Varlık Devir Hızı', p:score>=8},
    ]},
  ];
  document.getElementById('prf-fgrid').innerHTML = groups.map(function(g){
    return '<div class="prf-fgroup"><div class="prf-fgroup-title">'+g.title+'</div>'+
      g.items.map(function(i){return '<div class="prf-fitem"><div class="prf-fdot '+(i.p?'p':'f')+'"></div>'+i.t+'</div>';}).join('')+'</div>';
  }).join('');
}

function _buildPrfGuru() {
  var d = _prfData;
  if(!d) { document.getElementById('prf-ggrid').innerHTML='<div style="color:var(--muted);font-size:12px;padding:10px">Tarama yapıp Detaylı Analiz&#39;e tıklayın</div>'; return; }
  var pe=d.pe_ratio, pb=d.price_book_ratio, roe=(d.roe||0)*100, nm=(d.net_margin||0)*100;
  var cr=d.current_ratio, de=d.debt_to_equity, peg=d.peg_ratio, dy=(d.dividend_yield_recent||0)*100, fs=d.piotroski_f_score||0;
  var gurus = [
    {emoji:'🎯', name:'Warren Buffett', sub:'Değer Yatırımı', crits:[
      {t:'F/K < 20 → '+(pe?pe.toFixed(1)+'x':'—'),  p:pe&&pe>0&&pe<20},
      {t:'ROE > 15% → '+roe.toFixed(1)+'%',           p:roe>15},
      {t:'Net Marj > 10% → '+nm.toFixed(1)+'%',       p:nm>10},
      {t:'Cari Oran > 1.2 → '+(cr?cr.toFixed(2):'—'),p:cr&&cr>1.2},
      {t:'Borç/Öz < 0.8 → '+(de?de.toFixed(2):'—'), p:de!==undefined&&de<0.8},
    ]},
    {emoji:'📈', name:'Peter Lynch – PEG', sub:'Büyüme + Değer', crits:[
      {t:'PEG < 1 → '+(peg?peg.toFixed(2):'—'),      p:peg&&peg>0&&peg<1},
      {t:'F/K < 30 → '+(pe?pe.toFixed(1)+'x':'—'),   p:pe&&pe>0&&pe<30},
      {t:'ROE > 12% → '+roe.toFixed(1)+'%',            p:roe>12},
    ]},
    {emoji:'📚', name:'Benjamin Graham', sub:'Derin Değer', crits:[
      {t:'F/K < 15 → '+(pe?pe.toFixed(1)+'x':'—'),   p:pe&&pe>0&&pe<15},
      {t:'PD/DD < 1.5 → '+(pb?pb.toFixed(2)+'x':'—'),p:pb&&pb<1.5},
      {t:'Cari > 2 → '+(cr?cr.toFixed(2)+'x':'—'),   p:cr&&cr>2},
      {t:'Temettü > 1% → '+dy.toFixed(1)+'%',          p:dy>1},
    ]},
    {emoji:'⚡', name:'Piotroski F-Score', sub:'Finansal Sağlık', crits:[
      {t:'Karlılık 4/4', p:fs>=6},
      {t:'Kaldıraç 3/3', p:fs>=8},
      {t:'Verimlilik 2/2',p:fs>=7},
    ]},
  ];
  document.getElementById('prf-ggrid').innerHTML = gurus.map(function(g){
    var passed=g.crits.filter(function(c){return c.p;}).length, total=g.crits.length, pct=passed/total;
    var cls=pct>=0.8?'pass':pct>=0.5?'partial':'fail';
    return '<div class="prf-gcard '+cls+'">'+
      '<div class="prf-gtop"><span style="font-size:18px">'+g.emoji+'</span>'+
      '<div><div style="font-size:12px;font-weight:700;color:var(--text)">'+g.name+'</div>'+
      '<div style="font-size:10px;color:var(--text2)">'+g.sub+'</div></div>'+
      '<span class="prf-gscore '+cls+'">'+passed+'/'+total+(pct>=0.8?' ✓':pct>=0.5?' ~':' ✗')+'</span></div>'+
      g.crits.map(function(c){return '<div class="prf-gcrit"><div class="prf-cdot" style="background:'+(c.p?'var(--green)':'var(--red)')+'"></div>'+c.t+'</div>';}).join('')+'</div>';
  }).join('');
}

function _buildPrfSide() {
  var d = _prfData || {};
  var exMeta = EXCHANGE_META[_prfEx] || EXCHANGE_META.bist;
  var cur = exMeta.currency || '₺';
  var stats = [
    {k:'52H Yüksek',    v: d['52_week_high'] ? cur+' '+d['52_week_high'].toFixed(2) : '—'},
    {k:'52H Düşük',     v: d['52_week_low']  ? cur+' '+d['52_week_low'].toFixed(2)  : '—'},
    {k:'Beta',          v: d.beta ? d.beta.toFixed(2) : '—'},
    {k:'Piyasa Değeri', v: d.market_cap_basic ? _fmtN(d.market_cap_basic*1e6) : '—'},
    {k:'Ort. Hacim',    v: d.average_volume_10d_calc ? _fmtN(d.average_volume_10d_calc) : '—'},
    {k:'Temettü',       v: d.dividend_yield_recent ? (d.dividend_yield_recent*100).toFixed(2)+'%' : '—', cls:'g'},
    {k:'Haftalık',      v: d.Perf_W ? (d.Perf_W>=0?'+':'')+d.Perf_W.toFixed(2)+'%' : '—', cls:d.Perf_W>=0?'g':'r'},
    {k:'Aylık',         v: d.Perf_1M ? (d.Perf_1M>=0?'+':'')+d.Perf_1M.toFixed(2)+'%' : '—', cls:d.Perf_1M>=0?'g':'r'},
  ];
  document.getElementById('prf-price-stats').innerHTML = stats.map(function(s){
    return '<div class="prf-qstat"><span class="prf-qkey">'+s.k+'</span><span class="prf-qval '+(s.cls||'')+'">'+s.v+'</span></div>';
  }).join('');

  // Benzer hisseler
  var similar = allData.filter(function(x){ return d.sector && x.sector===d.sector && x.symbol!==d.symbol; }).slice(0,5);
  document.getElementById('prf-similar').innerHTML = similar.length ? similar.map(function(s){
    var sym2=s.symbol.replace('.IS',''), chg=s.change_abs||0;
    return '<div class="prf-sim-item" onclick="showProfil(\''+sym2+'\',\''+_prfEx+'\')">'+
      '<span class="prf-sim-sym">'+sym2+'</span>'+
      '<span class="prf-sim-name">'+((s.name||'').substring(0,22))+'</span>'+
      '<span class="prf-sim-chg" style="color:'+(chg>=0?'var(--green)':'var(--red)')+'">'+
      (chg>=0?'+':'')+chg.toFixed(2)+'%</span></div>';
  }).join('') : '<div style="font-size:11px;color:var(--muted)">Önce tarama yapın</div>';
}

function prfTab(id, el) {
  document.querySelectorAll('.prf-tab').forEach(function(t){t.classList.remove('on');});
  document.querySelectorAll('.prf-panel').forEach(function(p){p.classList.remove('on');});
  if(el) el.classList.add('on');
  var panel = document.getElementById('prf-panel-'+id);
  if(panel) panel.classList.add('on');
  if(id==='ai' && !_prfAiDone) _startPrfAI();
}

function _startPrfAI() {
  _prfAiDone = true;
  var d = _prfData, sym = _prfSym;
  var loading = document.getElementById('prf-ai-loading');
  var content = document.getElementById('prf-ai-content');
  var textEl  = document.getElementById('prf-ai-text');
  if(!d) {
    if(loading) loading.style.display='none';
    if(content) content.style.display='block';
    if(textEl) textEl.innerHTML='Screener verisi bulunamadı. Önce tarama yapın.';
    return;
  }
  setTimeout(function(){
    if(loading) loading.style.display='none';
    if(content) content.style.display='block';
    document.getElementById('prf-ai-title').textContent = sym+' — DeepFin AI';
    var pe=d.pe_ratio, roe=(d.roe||0)*100, nm=(d.net_margin||0)*100, fs=d.piotroski_f_score, peg=d.peg_ratio, de=d.debt_to_equity;
    var pos=[], neg=[];
    if(pe&&pe<15&&pe>0) pos.push('F/K ('+pe.toFixed(1)+'x) değerli görünüyor');
    if(roe>15) pos.push('ROE %'+roe.toFixed(1)+' güçlü özsermaye getirisi');
    if(nm>10) pos.push('Net marj %'+nm.toFixed(1)+' sağlıklı');
    if(fs>=7) pos.push('F-Score '+fs+'/9 — finansal sağlık güçlü');
    if(peg&&peg<1&&peg>0) pos.push('PEG '+peg.toFixed(2)+' — büyümeye göre ucuz');
    if(pe&&pe>30) neg.push('F/K ('+pe.toFixed(1)+'x) yüksek, primli');
    if(roe<8) neg.push('ROE %'+roe.toFixed(1)+' — özsermaye verimliliği düşük');
    if(fs&&fs<4) neg.push('F-Score '+fs+'/9 — finansal tablo zayıf');
    if(de&&de>2) neg.push('Borç/Öz '+de.toFixed(2)+' — yüksek borç');
    textEl.innerHTML =
      (pos.length?'<div style="margin-bottom:10px"><span style="color:var(--green);font-weight:700">💚 Güçlü Yönler:</span><br>'+pos.map(function(p){return '• '+p;}).join('<br>')+'</div>':'')+
      (neg.length?'<div><span style="color:var(--red);font-weight:700">🔴 Dikkat:</span><br>'+neg.map(function(n){return '• '+n;}).join('<br>')+'</div>':'')+
      (!pos.length&&!neg.length?'Veri yetersiz — tarama yapıp tekrar deneyin.':'')+
      '<br><div style="margin-top:8px;color:var(--muted2);font-size:10px">🔄 Claude API entegrasyonu yakında</div>';
  }, 800);
}

function askPrfAI() {
  var ans = document.getElementById('prf-ai-answer');
  ans.style.display='block';
  ans.innerHTML='<span style="color:var(--muted)">⏳ Claude API entegrasyonu yakında aktif olacak.</span>';
}

// ── Twelve Data: fiyat + şirket bilgisi ──
async function loadYahooData(sym, ex) {
  try {
    var exParam = '&ex='+encodeURIComponent(ex);
    var [qRes, nRes] = await Promise.all([
      fetch('/api/quote?sym='+encodeURIComponent(sym)+exParam),
      fetch('/api/quote?sym='+encodeURIComponent(sym)+exParam+'&type=news'),
    ]);
    var q = qRes.ok ? await qRes.json() : {};
    var n = nRes.ok ? await nRes.json() : {};
    if(q.error || !q.price) return;

    var cur = (EXCHANGE_META[ex]||{}).currency || '$';

    // TV verisini _prfData'ya merge et — screener verisi yoksa TV'den doldur
    if(!_prfData) _prfData = {};
    var d = _prfData;
    // Metrics — screener yoksa TV'den al
    if(!d.pe_ratio         && q.pe)          d.pe_ratio            = q.pe;
    if(!d.price_book_ratio && q.pb)          d.price_book_ratio    = q.pb;
    // TV ROE/ROA/margin % olarak geliyor (50.5), _prfData oran bekliyor (0.505)
    if(!d.roe            && q.roe)           d.roe                 = q.roe / 100;
    if(!d.roa            && q.roa)           d.roa                 = q.roa / 100;
    if(!d.net_margin     && q.netMargin)     d.net_margin          = q.netMargin / 100;
    if(!d.gross_margin   && q.grossMargin)   d.gross_margin        = q.grossMargin / 100;
    if(!d.peg_ratio      && q.peg)           d.peg_ratio           = q.peg;
    if(!d.current_ratio  && q.currentRatio)  d.current_ratio       = q.currentRatio;
    if(!d.debt_to_equity && q.debtToEquity)  d.debt_to_equity      = q.debtToEquity;
    if(!d.piotroski_f_score && q.piotroski) d.piotroski_f_score   = q.piotroski;
    // dividendYield TV'den % olarak geliyor (6.49 = %6.49)
    if(!d.dividend_yield_recent && q.dividendYield) d.dividend_yield_recent = q.dividendYield / 100;
    if(!d['52_week_high'] && q.high52)       d['52_week_high']     = q.high52;
    if(!d['52_week_low']  && q.low52)        d['52_week_low']      = q.low52;
    if(!d.beta            && q.beta)         d.beta                = q.beta;
    if(!d.price_sales     && q.ps)           d.price_sales         = q.ps;
    if(!d.revenue_growth  && q.revenueGrowth) d.revenue_growth     = q.revenueGrowth / 100;
    if(!d.market_cap_basic && q.marketCap)   d.market_cap_basic    = q.marketCap / 1e6;
    if(!d.average_volume_10d_calc && q.avgVolume) d.average_volume_10d_calc = q.avgVolume;
    if(!d.Perf_W  && q.perfW)  d.Perf_W  = q.perfW;
    if(!d.Perf_1M && q.perf1M) d.Perf_1M = q.perf1M;
    if(!d.Perf_Y  && q.perfY)  d.Perf_Y  = q.perfY;
    if(!d.sector  && q.sector)  d.sector  = q.sector;
    if(!d.name    && q.name)    d.name    = q.name;

    // Metrics'i yeniden çiz (TV verisiyle dolu)
    _buildPrfMetrics();
    _buildPrfHero();
    _buildPrfPiotroski();
    _buildPrfGuru();
    _buildPrfSide();
    _buildTrend(_prfData);
    _buildFinancials(_prfData);

    // Şirket adı + sektör
    if(q.name)   document.getElementById('prf-fullname').textContent   = q.name;
    if(q.sector) document.getElementById('prf-sector-tag').textContent = q.sector;

    // Sektör ortalamasını yükle
    _sectorAvg = null;
    loadSectorAvg(q.sector || d.sector, ex);

    // Canlı fiyat
    document.getElementById('prf-price').textContent =
      cur+' '+parseFloat(q.price).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2});
    var chgEl = document.getElementById('prf-chg');
    var cp = parseFloat(q.changePct)||0;
    chgEl.textContent = (cp>=0?'+':'')+cp.toFixed(2)+'%';
    chgEl.className = 'prf-chg '+(cp>=0?'up':'dn');

    // Açıklama
    if(q.description) document.getElementById('prf-desc').textContent = q.description;

    // Yan panel (artık merge edilmiş _prfData kullan)
    var st = [
      {k:'52H Yüksek',    v: d['52_week_high'] ? cur+' '+parseFloat(d['52_week_high']).toLocaleString('tr-TR',{minimumFractionDigits:2}) : '—'},
      {k:'52H Düşük',     v: d['52_week_low']  ? cur+' '+parseFloat(d['52_week_low']).toLocaleString('tr-TR',{minimumFractionDigits:2})  : '—'},
      {k:'Beta',          v: d.beta ? parseFloat(d.beta).toFixed(2) : '—'},
      {k:'Piyasa Değeri', v: d.market_cap_basic ? _fmtN(d.market_cap_basic*1e6) : (q.marketCap ? _fmtN(q.marketCap) : '—')},
      {k:'Ort. Hacim',    v: d.average_volume_10d_calc ? _fmtN(d.average_volume_10d_calc) : (q.avgVolume?_fmtN(q.avgVolume):'—')},
      {k:'Temettü',       v: d.dividend_yield_recent ? (d.dividend_yield_recent*100).toFixed(2)+'%' : '—', cls:'g'},
      {k:'Sektör',        v: q.sector || d.sector || '—'},
      {k:'Çalışan',       v: q.employees ? Number(q.employees).toLocaleString('tr-TR') : '—'},
    ];
    document.getElementById('prf-price-stats').innerHTML = st.map(function(s){
      return '<div class="prf-qstat"><span class="prf-qkey">'+s.k+'</span><span class="prf-qval '+(s.cls||'')+'">'+s.v+'</span></div>';
    }).join('');

    if(n.news && n.news.length) {
      document.getElementById('prf-news').innerHTML = n.news.slice(0,5).map(function(item){
        var date = item.datetime ? new Date(item.datetime).toLocaleDateString('tr-TR') : '';
        return '<div class="prf-news-item">'+
          '<div class="prf-news-src">'+(item.source||'Haber')+'</div>'+
          '<div class="prf-news-title" onclick="window.open(\''+item.url+'\',\'_blank\')">'+item.title+'</div>'+
          '<div class="prf-news-meta"><span>'+date+'</span></div></div>';
      }).join('');
    }
  } catch(e) { console.warn('Quote error:', e); }
}

// ── Başlangıç ──
document.addEventListener('DOMContentLoaded', function() {
  var sym    = _urlParams.get('sym') || '';
  var ex     = _urlParams.get('ex')  || 'bist';
  var dParam = _urlParams.get('d')   || '';

  if(dParam) {
    try {
      var compact = JSON.parse(atob(dParam));
      var d = {
        symbol:sym,
        name:compact.n,
        sector:compact.sc,
        close:compact.cl, price:compact.cl, currentPrice:compact.cl,
        change_abs:compact.ch,
        change:compact.ca, changePercent:compact.ca,
        pe_ratio:compact.pe, peNormalizedAnnual:compact.pe,
        price_book_ratio:compact.pb, pbAnnual:compact.pb,
        price_sales:compact.ps, psTTM:compact.ps,
        roe:(compact.roe||0)/100, roeTTM:(compact.roe||0)/100,
        roa:(compact.roa||0)/100, roaTTM:(compact.roa||0)/100,
        net_margin:(compact.nm||0)/100, netProfitMarginTTM:(compact.nm||0)/100,
        gross_margin:(compact.gm||0)/100, grossMarginTTM:(compact.gm||0)/100,
        revenue_growth_ttm_yoy:compact.rg, revenueGrowthTTMYoy:compact.rg,
        earnings_per_share_change_ttm_yoy:compact.eg, epsGrowthTTMYoy:compact.eg,
        peg_ratio:compact.peg, peg:compact.peg,
        piotroski_f_score:compact.fs, piotroski:compact.fs,
        current_ratio:compact.cr, currentRatioAnnual:compact.cr,
        debt_to_equity:compact.de,
        dividend_yield_recent:(compact.dy||0)/100, dividendYieldIndicatedAnnual:(compact.dy||0)/100,
        Perf_W:compact.pw, Perf_1M:compact.pm, Perf_Y:compact.py,
        beta:compact.bt,
        market_cap_basic:compact.mc, marketCapitalization:compact.mc,
        average_volume_10d_calc:compact.av,
        '52_week_high':compact.wh, '52WeekHigh':compact.wh,
        '52_week_low':compact.wl, '52WeekLow':compact.wl,
        cash_f_operating_activities:compact.cf
      };
      allData = [d];
    } catch(e) { console.warn('Decode error:', e); }
  }

  if(sym) {
    document.title = 'DeepFin — ' + sym;
    showProfil(sym, ex);
    loadYahooData(sym, ex);
  }
});


// ── DISCLAIMER ──
var _disclaimerTimer = null;
function _showDisclaimer(onAccept) {
  if (localStorage.getItem('df_disclaimer_v2')) {
    if (onAccept) onAccept();
    return;
  }
  var modal = document.getElementById('disclaimerModal');
  if (!modal) { return; } // DOM henüz yok - DOMContentLoaded bekle
  modal.classList.add('open');
  var btn = document.getElementById('disclaimerBtn');
  var cd  = document.getElementById('disclaimerCountdown');
  var secs = 5;
  btn.disabled = true;
  btn.style.cssText = 'width:100%;padding:13px;border-radius:8px;font-size:13px;font-weight:700;cursor:not-allowed;transition:all .3s;background:#1a1a1a;border:1px solid #333;color:#555;';
  if (_disclaimerTimer) clearInterval(_disclaimerTimer);
  _disclaimerTimer = setInterval(function() {
    secs--;
    if (cd) cd.textContent = '(' + secs + ')';
    if (secs <= 0) {
      clearInterval(_disclaimerTimer);
      btn.disabled = false;
      btn.style.cssText = 'width:100%;padding:13px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;transition:all .3s;background:#3b82f6;border:1px solid transparent;color:#fff;';
      if (cd) cd.textContent = '';
    }
  }, 1000);
  btn.onclick = function() {
    localStorage.setItem('df_disclaimer_v2', '1');
    modal.classList.remove('open');
    clearInterval(_disclaimerTimer);
    if (onAccept) onAccept();
  };
}

document.addEventListener('DOMContentLoaded', function() {
  _showDisclaimer(null);
});


// ══════════════════════════════════════════════════════════════════════════
// YENİ PANELLER: Bilanço, Nakit Akışı, Haberler (Yahoo Finance + Finnhub)
// ══════════════════════════════════════════════════════════════════════════

var _fundCache = {}; // {type_period: data}

// Sayı formatla (Milyar/Milyon)
function _fmtFin(v, cur) {
  if (v == null || isNaN(v)) return '<span style="color:var(--muted2)">—</span>';
  var abs = Math.abs(v);
  var s = '';
  if (abs >= 1e12)      s = (v/1e12).toFixed(2) + ' T';
  else if (abs >= 1e9)  s = (v/1e9).toFixed(2) + ' B';
  else if (abs >= 1e6)  s = (v/1e6).toFixed(1) + ' M';
  else                  s = v.toLocaleString('tr-TR');
  var cls = v < 0 ? 'color:#f6465d' : 'color:#00c076';
  return '<span style="' + cls + '">' + (cur || '') + ' ' + s + '</span>';
}

// Finansal tablo HTML oluştur
function _buildFinTable(rows, cols) {
  if (!cols || !cols.length) return '<div style="padding:20px;color:var(--muted2);font-size:12px;">Veri bulunamadı</div>';
  var cur = (EXCHANGE_META[_prfEx] || {}).currency || '$';
  var labels = {
    totalRevenue: 'Toplam Gelir', grossProfit: 'Brüt Kar', operatingIncome: 'Faaliyet Karı',
    netIncome: 'Net Kar', ebitda: 'EBITDA', eps: 'HBK',
    totalAssets: 'Toplam Varlık', totalLiab: 'Toplam Yükümlülük',
    totalStockholderEquity: 'Özkaynak', cash: 'Nakit', totalDebt: 'Uzun Vad. Borç', shortLongTermDebt: 'Kısa Vad. Borç',
    operatingCashflow: 'Faaliyet NK', capitalExpenditures: 'Sermaye Harcaması', freeCashflow: 'Serbest NK', dividendsPaid: 'Temettü Ödemesi',
  };
  var html = '<table style="width:100%;border-collapse:collapse;font-size:11px;">';
  html += '<thead><tr><th style="text-align:left;padding:8px 6px;color:var(--text2);border-bottom:1px solid var(--border);font-weight:600;">Kalem</th>';
  cols.forEach(function(c) {
    html += '<th style="text-align:right;padding:8px 6px;color:var(--text2);border-bottom:1px solid var(--border);font-weight:600;">' + (c.date || '') + '</th>';
  });
  html += '</tr></thead><tbody>';
  rows.forEach(function(key) {
    var label = labels[key] || key;
    html += '<tr><td style="padding:7px 6px;color:var(--text2);border-bottom:1px solid rgba(255,255,255,.04);">' + label + '</td>';
    cols.forEach(function(c) {
      html += '<td style="text-align:right;padding:7px 6px;border-bottom:1px solid rgba(255,255,255,.04);">' + _fmtFin(c[key], key === 'eps' ? cur : '') + '</td>';
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  return html;
}

// Dönem seç (annual/quarterly)
function setPeriod(type, period, el) {
  var prefix = type === 'balance' ? 'bal' : type === 'cashflow' ? 'cf' : 'inc';
  ['annual','quarterly'].forEach(function(p) {
    var btn = document.getElementById(prefix + '-' + p);
    if (!btn) return;
    btn.className = (p === period) ? 'prf-period-active' : 'prf-period-btn';
  });
  renderFundPanel(type, period);
}

// Veriyi render et
function renderFundPanel(type, period) {
  var cacheKey = type + '_' + period;
  var data = _fundCache[cacheKey];
  var containerId = type === 'balance' ? 'prf-balance-table' : type === 'cashflow' ? 'prf-cashflow-table' : 'prf-income-table';
  var el = document.getElementById(containerId);
  if (!el) return;

  if (!data) {
    el.innerHTML = '<div style="padding:20px;color:var(--muted2);font-size:12px;">Veri yükleniyor...</div>';
    loadFundData(type, period);
    return;
  }

  var cols = (period === 'quarterly' ? data.quarterly : data.annual) || [];
  if (!cols.length) {
    // Tablo boşsa metrics kartını göster
    var cachedMetrics = _fundCache['_metrics'];
    if (cachedMetrics) {
      el.innerHTML = _buildMetricsCard(cachedMetrics, type);
    } else {
      el.innerHTML = '<div style="padding:20px 0;color:var(--muted2);font-size:12px;">Detaylı tablo verisi bu hisse için mevcut değil.</div>';
    }
    return;
  }

  var rows = type === 'balance'
    ? ['totalAssets','totalLiab','totalStockholderEquity','cash','totalDebt','shortLongTermDebt']
    : type === 'cashflow'
    ? ['operatingCashflow','capitalExpenditures','freeCashflow','dividendsPaid']
    : ['totalRevenue','grossProfit','operatingIncome','netIncome','ebitda'];

  el.innerHTML = _buildFinTable(rows, cols);
}

// API'den veri çek
function loadFundData(type, period) {
  var sym = _prfSym;
  var ex  = _prfEx;
  if (!sym) return;

  var apiType = (type === 'income') ? 'financials' : type;
  fetch('/api/fundamentals?symbol=' + encodeURIComponent(sym) + '&exchange=' + encodeURIComponent(ex) + '&type=' + apiType)
    .then(function(r) { return r.json(); })
    .then(function(data) {
      _fundCache[type + '_annual']    = data;
      _fundCache[type + '_quarterly'] = data;
      renderFundPanel(type, period);
    })
    .catch(function(e) {
      var containerId = type === 'balance' ? 'prf-balance-table' : type === 'cashflow' ? 'prf-cashflow-table' : 'prf-income-table';
      var el = document.getElementById(containerId);
      if (el) el.innerHTML = '<div style="padding:20px;color:var(--muted2);font-size:12px;">Veri alınamadı: ' + e.message + '</div>';
    });
}

// Haberleri yükle ve göster
function loadNewsPanel() {
  var el = document.getElementById('prf-news-list');
  if (!el) return;

  fetch('/api/fundamentals?symbol=' + encodeURIComponent(_prfSym) + '&exchange=' + encodeURIComponent(_prfEx) + '&type=news')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var news = data.news || [];
      if (!news.length) {
        el.innerHTML = '<div style="padding:20px;color:var(--muted2);font-size:12px;">Haber bulunamadı.</div>';
        return;
      }
      el.innerHTML = news.map(function(n) {
        var date = n.datetime ? new Date(n.datetime).toLocaleDateString('tr-TR') : '';
        var img  = n.image ? '<img src="'+n.image+'" onerror="this.style.display=\'none\'" style="width:72px;height:52px;object-fit:cover;border-radius:5px;flex-shrink:0;">' : '';
        return '<div style="display:flex;gap:12px;padding:12px 0;border-bottom:1px solid var(--border);align-items:flex-start;">' +
          img +
          '<div style="flex:1;min-width:0;">' +
            '<div style="font-size:11px;color:var(--muted2);margin-bottom:4px;">' + (n.source||'') + ' &bull; ' + date + '</div>' +
            '<div onclick="window.open(\''+n.url+'\',\'_blank\')" style="font-size:12px;font-weight:600;color:var(--text);cursor:pointer;line-height:1.5;margin-bottom:4px;">' + n.title + '</div>' +
            (n.summary ? '<div style="font-size:11px;color:var(--text2);line-height:1.6;">' + n.summary + '</div>' : '') +
          '</div></div>';
      }).join('');
    })
    .catch(function(e) {
      el.innerHTML = '<div style="padding:20px;color:var(--muted2);font-size:12px;">Haberler alınamadı.</div>';
    });
}

// prfTab override — yeni paneller için lazy load
var _origPrfTab = prfTab;
prfTab = function(id, el) {
  _origPrfTab(id, el);
  if (id === 'financials') {
    loadFinancialsPanel();
    renderFundPanel('balance', 'annual');
    renderFundPanel('cashflow', 'annual');
  }
  if (id === 'news') loadNewsPanel();
};


// Finansallar paneli — Yahoo gelir tablosu
function _unusedOldFinPanel() {
  var el = document.getElementById('prf-fin-yahoo');
  if (!el) {
    // Container yoksa oluştur
    var sec = document.querySelector('#prf-panel-financials .prf-section');
    if (!sec) return;
    var div = document.createElement('div');
    div.id = 'prf-fin-yahoo';
    div.style.cssText = 'margin-top:16px;overflow-x:auto;';
    div.innerHTML = '<div style="padding:10px;color:var(--muted2);font-size:12px;">Yükleniyor...</div>';
    sec.appendChild(div);
    el = div;
  }

  if (_fundCache['financials_done']) return;

  fetch('/api/fundamentals?symbol=' + encodeURIComponent(_prfSym) + '&exchange=' + encodeURIComponent(_prfEx) + '&type=financials')
    .then(function(r){ return r.json(); })
    .then(function(data) {
      _fundCache['financials_done'] = true;
      var cols = data.annual || [];
      if (!cols.length) { el.innerHTML = ''; return; }
      var rows = ['totalRevenue','grossProfit','operatingIncome','netIncome','ebitda'];
      var title = '<div style="font-size:11px;font-weight:600;color:var(--text2);margin-bottom:8px;letter-spacing:.5px;text-transform:uppercase;">Yahoo Finance · Gelir Tablosu (Yıllık)</div>';
      el.innerHTML = title + _buildFinTable(rows, cols);
    })
    .catch(function(){ el.innerHTML = ''; });
}

function loadFinancialsPanel() { renderFundPanel('income', 'annual'); }

// ── Finnhub/TV metrics özet kartı ─────────────────────────────────────────
function _buildMetricsCard(m, type) {
  if (!m) return '<div style="padding:16px;color:var(--muted2);font-size:12px;">Veri yüklenemedi.</div>';
  var cur = (EXCHANGE_META[_prfEx] || {}).currency || '$';
  var f1  = function(v) { return v != null ? v.toFixed(1) : '—'; };
  var f2  = function(v) { return v != null ? v.toFixed(2) : '—'; };
  var fp  = function(v) { return v != null ? (v >= 0 ? '+' : '') + v.toFixed(1) + '%' : '—'; };
  var clr = function(v, inv) {
    if (v == null) return '#64748b';
    return (inv ? v <= 0 : v >= 0) ? '#00c076' : '#f6465d';
  };

  var rows;
  if (type === 'income') {
    rows = [
      ['Net Kar Marjı', m.netMargin   != null ? m.netMargin.toFixed(1)   + '%' : '—', clr(m.netMargin)],
      ['Brüt Marj',    m.grossMargin != null ? m.grossMargin.toFixed(1) + '%' : '—', clr(m.grossMargin)],
      ['ROE (TTM)',     m.roe         != null ? m.roe.toFixed(1)         + '%' : '—', clr(m.roe)],
      ['ROA (TTM)',     m.roa         != null ? m.roa.toFixed(1)         + '%' : '—', clr(m.roa)],
      ['Gelir Büyüme', fp(m.revenueGrowth), clr(m.revenueGrowth)],
      ['EPS Büyüme',   fp(m.epsGrowth),     clr(m.epsGrowth)],
    ];
  } else if (type === 'balance') {
    rows = [
      ['Cari Oran',       f2(m.currentRatio), m.currentRatio != null && m.currentRatio >= 1 ? '#00c076' : '#f6465d'],
      ['Borç/Özkaynak',   f2(m.debtToEquity), clr(m.debtToEquity, true)],
      ['PD/DD',           f2(m.pb),           '#94a3b8'],
      ['Temettü Verimi',  m.dividendYield != null ? m.dividendYield.toFixed(2) + '%' : '—', '#00c076'],
    ];
  } else {
    rows = [
      ['F/K',             f2(m.pe),   '#94a3b8'],
      ['F/S',             f2(m.ps),   '#94a3b8'],
      ['PEG',             m.peg != null ? f2(m.peg) : '—', '#94a3b8'],
      ['Temettü Verimi',  m.dividendYield != null ? m.dividendYield.toFixed(2) + '%' : '—', '#00c076'],
    ];
  }

  var html = '<div style="background:var(--s2);border:1px solid var(--border);border-radius:8px;overflow:hidden;margin-top:8px;">';
  html += '<div style="padding:8px 14px;background:rgba(30,39,51,.5);font-size:9px;color:var(--muted2);letter-spacing:.5px;text-transform:uppercase;font-weight:600;">';
  html += 'TradingView · Özet Metrikler</div>';
  rows.forEach(function(row) {
    html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 14px;border-top:1px solid rgba(255,255,255,.04);">';
    html += '<span style="font-size:11px;color:var(--text2);">' + row[0] + '</span>';
    html += '<span style="font-size:12px;font-weight:600;color:' + row[2] + ';">' + row[1] + '</span>';
    html += '</div>';
  });
  html += '</div>';
  return html;
}
