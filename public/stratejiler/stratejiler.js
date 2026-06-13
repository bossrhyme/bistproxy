// DeepFin — Strateji Getirileri Sayfası v1
// Bağımsız sayfa: veri çeker, filtreler, getiri tablosu üretir.
(function () {
'use strict';

// ── Borsa tanımları ───────────────────────────────────────────
var EX_META = {
  bist:   { name:'BIST',    flag:'🇹🇷', label:'BIST',    range:[0,800],  currency:'TRY', market:'turkey'   },
  nasdaq: { name:'NASDAQ',  flag:'🇺🇸', label:'NASDAQ',  range:[0,4500], currency:'USD', market:'america'  },
  sp500:  { name:'S&P 500', flag:'🇺🇸', label:'S&P 500', range:[0,503],  currency:'USD', market:'america'  },
  dax:    { name:'DAX',     flag:'🇩🇪', label:'DAX',     range:[0,500],  currency:'EUR', market:'germany'  },
  lse:    { name:'LSE',     flag:'🇬🇧', label:'LSE',     range:[0,2000], currency:'GBP', market:'uk'       },
};
var EX_KEYS = Object.keys(EX_META);

// ── Kolon setleri ─────────────────────────────────────────────
var COLS_BIST = [
  'name','description','close','change','volume','market_cap_basic',
  'price_earnings_ttm','price_book_fq','price_sales_current',
  'return_on_equity_fq','return_on_assets_fq',
  'net_margin','gross_margin',
  'total_revenue_change_ttm_yoy','earnings_per_share_change_ttm_yoy',
  'dividends_yield','debt_to_equity_fq','current_ratio_fq',
  'sector','High.1M','Low.1M','piotroski_f_score',
  'Recommend.All','Recommend.MA','Recommend.Other',
  'Perf.1M','Perf.3M','Perf.6M','Perf.Y','RSI',
  'price_52_week_high','price_52_week_low',
  'relative_volume_10d_calc','SMA50','SMA200','MACD.macd','MACD.signal',
  'ADX','ADX+DI','ADX-DI','BB.lower','Stoch.K','Stoch.D','beta_1_year'
];
var COLS_US = [
  'name','description','close','change','volume','market_cap_basic',
  'price_earnings_ttm','price_book_fq','price_sales_current',
  'return_on_equity_fq','return_on_assets_fq',
  'net_margin','gross_margin',
  'total_revenue_change_ttm_yoy','revenue_growth_ttm_yoy',
  'earnings_per_share_change_ttm_yoy','earnings_per_share_diluted_yoy_growth_ttm',
  'dividends_yield','dividends_yield_current',
  'debt_to_equity_fq','total_debt_to_equity','current_ratio_fq','current_ratio',
  'sector','High.1M','Low.1M','piotroski_f_score',
  'Recommend.All','Recommend.MA','Recommend.Other',
  'Perf.1M','Perf.3M','Perf.6M','Perf.Y','RSI',
  'price_52_week_high','price_52_week_low',
  'relative_volume_10d_calc','SMA50','SMA200','MACD.macd','MACD.signal',
  'ADX','ADX+DI','ADX-DI','BB.lower','Stoch.K','Stoch.D','beta_1_year'
];
var COLS_GLOBAL = COLS_US;
var COLS_BY_EX = { bist:COLS_BIST, nasdaq:COLS_US, sp500:COLS_US, dax:COLS_GLOBAL, lse:COLS_GLOBAL };

// ── Filtre kuralları (deepfin.js FILTER_RULES ile birebir aynı) ─
var FILTER_RULES = [
  ['peNormalizedAnnual',           'pe_min',     'pe_max',     1],
  ['pbAnnual',                     'pb_min',     'pb_max',     1],
  ['psTTM',                        'ps_min',     'ps_max',     1],
  ['roeTTM',                       'roe_min',    'roe_max',    1],
  ['roaTTM',                       'roa_min',    'roa_max',    1],
  ['netProfitMarginTTM',           'margin_min', 'margin_max', 1],
  ['grossMarginTTM',               'gross_min',  'gross_max',  1],
  ['revenueGrowthTTMYoy',          'revg_min',   'revg_max',   1],
  ['epsGrowthTTMYoy',              'earng_min',  'earng_max',  1],
  ['dividendYieldIndicatedAnnual', 'div_min',    'div_max',    1],
  ['totalDebt/totalEquityAnnual',  'de_min',     'de_max',     1],
  ['currentRatioAnnual',           'cr_min',     'cr_max',     1],
  ['piotroski',                    'piotroski_min','piotroski_max',1],
  ['peg',                          'peg_min',    'peg_max',    1],
  ['marketCapitalization',         'mc_min',     'mc_max',     1],
  ['changePercent',                'chg_min',    'chg_max',    1],
  ['fromHigh',                     'from_high_min','from_high_max',1],
  ['fromLow',                      'from_low_min',null,         1],
  ['techRating',                   'tech_rating_min','tech_rating_max',1],
  ['maRating',                     'ma_rating_min','ma_rating_max',1],
  ['oscRating',                    'osc_rating_min','osc_rating_max',1],
  ['perf1m',                       'perf1m_min', 'perf1m_max', 1],
  ['perf3m',                       'perf3m_min', 'perf3m_max', 1],
  ['perf6m',                       'perf6m_min', 'perf6m_max', 1],
  ['perfY',                        'perfy_min',  'perfy_max',  1],
  ['rsi14',                        'rsi_min',    'rsi_max',    1],
  ['relVol',                       'rel_vol_min','rel_vol_max',1],
  ['beta',                         'beta_min',   'beta_max',   1],
  ['adx',                          'adx_min',    'adx_max',    1],
  ['adxDiDiff',                    'adx_di_diff_min',null,     1],
  ['pctAboveSma200',               'above_sma200_min','above_sma200_max',1],
  ['smaTrend',                     'sma_trend_min','sma_trend_max',1],
  ['macd',                         'macd_min',   'macd_max',   1],
  ['macdHist',                     'macd_hist_min','macd_hist_max',1],
  ['bbDist',                       'bb_dist_min','bb_dist_max',1],
  ['stochK',                       'stoch_k_min','stoch_k_max',1],
  ['stochKD',                      'stoch_kd_min',null,        1],
  ['currentPrice',                 'price_min',  'price_max',  1],
];
var TECH_NULL_SKIP = ['techRating','maRating','oscRating','perf1m','perf3m','perf6m','perfY','rsi14',
  'fromHigh','fromLow','relVol','beta','adx','adxDiDiff','pctAboveSma200','smaTrend',
  'macd','macdHist','bbDist','stochK','stochKD'];

// ── Presetler ─────────────────────────────────────────────────
var PRESETS = {
  value:    { label:'Değer Hisseleri',     filters:{pe_max:15, pb_max:2, div_min:2} },
  growth:   { label:'Büyüme Hisseleri',    filters:{earng_min:20, revg_min:15, roe_min:15} },
  dividend: { label:'Temettü Hisseleri',   filters:{div_min:4, de_max:80, cr_min:1.2} },
  quality:  { label:'Kaliteli Şirketler',  filters:{roe_min:20, margin_min:15, gross_min:35, de_max:80, cr_min:1.5} },
  lowdebt:  { label:'Az Borçlu Şirketler', filters:{de_max:30, cr_min:2} },
  momentum: { label:'Momentum Hisseleri',  filters:{revg_min:20, earng_min:20} },
  smallcap: { label:'Küçük Şirketler',     filters:{mc_max:500, roe_min:15, earng_min:15} },
  megacap:  { label:'Dev Şirketler',       filters:{mc_min:10000, roe_min:12, div_min:1} },
};
var TECH_PRESETS = {
  breakout:     { label:'Breakout',        filters:{from_high_min:-5, chg_min:1.5, vol_min:0.5, tech_rating_min:0.1} },
  oversold:     { label:'Aşırı Satış',     filters:{from_high_max:-20, chg_min:0, rsi_max:35} },
  nearHigh:     { label:'52H Zirve',       filters:{from_high_min:-5, perf3m_min:5} },
  pullback:     { label:'Düzeltme',        filters:{from_high_min:-15, from_high_max:-5, perf6m_min:15} },
  strongDay:    { label:'Günlük Hareket',  filters:{chg_min:2, vol_min:0.5} },
  highVolume:   { label:'Akıllı Para',     filters:{rel_vol_min:2, chg_min:0} },
  techBuy:      { label:'Güçlü Sinyal',    filters:{tech_rating_min:0.5} },
  momentum3m:   { label:'3A Momentum',     filters:{perf3m_min:15, perf6m_min:20} },
  trendFollow:  { label:'Trend Takibi',    filters:{from_low_min:25, perf6m_min:10} },
  rsiBounce:    { label:'Toparlanıyor',    filters:{rsi_min:30, rsi_max:50, from_low_min:3} },
  goldenCross:  { label:'Golden Cross',    filters:{above_sma200_min:0, sma_trend_min:0.5} },
  macdReversal: { label:'MACD Dönüşü',    filters:{macd_hist_min:0, macd_max:0} },
  adxTrend:     { label:'Güçlü Trend',     filters:{adx_min:25, adx_di_diff_min:0} },
  bbBounce:     { label:'Bollinger Dibi',  filters:{bb_dist_max:3, rsi_max:40} },
  stochReversal:{ label:'Stokastik Dönüş', filters:{stoch_k_max:25, stoch_kd_min:0} },
  maConfirm:    { label:'Ortalama Onayı',  filters:{ma_rating_min:0.5} },
  oscConfirm:   { label:'Osilatör Onayı',  filters:{osc_rating_min:0.1} },
  lowBeta:      { label:'Defansif',        filters:{beta_max:0.8, div_min:1} },
  ytdLeader:    { label:'1A Momentum',     filters:{perf1m_min:10, perf3m_min:10} },
};
var GURUS = {
  ackman:   { label:'Bill Ackman',             filters:{roe_min:15, margin_min:10, de_max:80, cr_min:1.2, pe_max:20} },
  ark:      { label:'Cathie Wood / ARK',       filters:{revg_min:30, cr_min:1} },
  buffett:  { label:'Warren Buffett',          filters:{pe_min:5, pe_max:25, roe_min:20, margin_min:20, gross_min:40, de_max:50, cr_min:1.5} },
  einhorn:  { label:'David Einhorn',           filters:{pe_max:15, de_max:50, cr_min:1.5, margin_min:8, roe_min:10} },
  fisher:   { label:'Philip Fisher',          filters:{revg_min:15, earng_min:15, gross_min:35, margin_min:12, de_max:60} },
  graham:   { label:'Benjamin Graham',        filters:{pe_max:15, pb_max:1.5, de_max:50, cr_min:2, div_min:1} },
  greenblatt:{ label:'Joel Greenblatt',       filters:{roe_min:25, pe_max:12} },
  icahn:    { label:'Carl Icahn',              filters:{pb_max:1.5, pe_max:12, de_max:60, cr_min:1.5, div_min:1} },
  klarman:  { label:'Seth Klarman',            filters:{pe_max:10, pb_max:1.2, de_max:40, cr_min:2, margin_min:5} },
  lynch:    { label:'Peter Lynch',             filters:{pe_min:5, pe_max:35, earng_min:20, de_max:80, cr_min:1}, special:'peg' },
  minervini:{ label:'Mark Minervini',          filters:{earng_min:25, roe_min:17, margin_min:10, de_max:100, cr_min:1} },
  munger:   { label:'Charlie Munger',          filters:{gross_min:50, roe_min:20, de_max:30, margin_min:20, cr_min:1.5} },
  oneil:    { label:"William O'Neil",          filters:{earng_min:25, revg_min:25, roe_min:17, de_max:100, cr_min:1} },
  oshaughnessy:{ label:"O'Shaughnessy",        filters:{ps_max:1.5, earng_min:5, perf6m_min:15} },
  piotroski:{ label:'Piotroski F-Score',       filters:{pb_max:1, roe_min:3, cr_min:1}, special:'piotroski' },
  schloss:  { label:'Walter Schloss',          filters:{pb_max:1, pe_max:12, de_max:100, div_min:2, cr_min:1.5} },
  soros:    { label:'George Soros',            filters:{perf3m_min:10, perf6m_min:20, tech_rating_min:0.3} },
  neff:     { label:'John Neff',               filters:{pe_max:12, earng_min:7, revg_min:7, div_min:2, margin_min:8} },
  zweig:    { label:'Martin Zweig',            filters:{earng_min:20, revg_min:15, pe_max:30, de_max:50} },
  dreman:   { label:'David Dreman',            filters:{pe_max:12, pb_max:1.5, earng_min:5} },
  kfisher:  { label:'Kenneth Fisher',          filters:{ps_max:1.5, margin_min:5, de_max:40, earng_min:15} },
  smith:    { label:'Terry Smith',             filters:{roe_min:15, gross_min:40, margin_min:15, de_max:50} },
  netnet:   { label:'Graham Net-Net',          filters:{pb_max:0.67, cr_min:2, de_max:80, margin_min:1} },
  carlisle: { label:"Tobias Carlisle",         filters:{pe_max:10, cr_min:1} },
};
var INVESTOR_PROFILES = [
  { key:'growth', label:'Büyüme Avcısı',       icon:'🚀', goat:[],        preset:['growth','momentum'],        tech:['breakout'] },
  { key:'div',    label:'Temettü Koleksiyoneri',icon:'💰', goat:[],        preset:['dividend','lowdebt'],       tech:[] },
  { key:'value',  label:'Değer Dedektifi',      icon:'🔍', goat:['buffett'],preset:['value','lowdebt'],         tech:[] },
  { key:'mom',    label:'Momentum Sörfçüsü',   icon:'🏄', goat:[],        preset:['momentum'],                 tech:['momentum3m','breakout'] },
  { key:'def',    label:'Savunma Kalesi',       icon:'🛡️', goat:[],        preset:['quality','lowdebt'],        tech:[] },
  { key:'small',  label:'Küçük Değer Keşifçisi',icon:'🔭', goat:[],        preset:['value','growth'],           tech:[] },
  { key:'spec',   label:'Spekülatif Akıncı',    icon:'⚡', goat:[],        preset:[],                           tech:['breakout','techBuy','highVolume'] },
  { key:'tech',   label:'Teknoloji Vizyoneri',  icon:'🤖', goat:[],        preset:[],                           tech:['breakout','techBuy','trendFollow'] },
  { key:'bal',    label:'Çevik Dengeleyici',    icon:'⚖️', goat:[],        preset:['quality','dividend'],       tech:[] },
];

// ── Durum ─────────────────────────────────────────────────────
var allData       = [];
var currentEx     = 'bist';
var fxRates       = { TRY:38, EUR:1/1.08, GBP:1/1.27, JPY:1/153, KRW:1/1350 };
var showAllGroups = false;

// ── Veri çekimi ───────────────────────────────────────────────
function loadRates() {
  return fetch('/api/rates').then(function(r){ return r.json(); }).then(function(d) {
    var r = d && d.rates;
    if (r) fxRates = r;
  }).catch(function(){});
}

function buildPayload(ex) {
  var cols = COLS_BY_EX[ex] || COLS_US;
  var range = (EX_META[ex] && EX_META[ex].range) || [0, 3000];
  return { columns: cols, range: range, sort:{ sortBy:'market_cap_basic', sortOrder:'desc' }, ignore_unknown_fields:true };
}

function parseRows(tvRows, ex) {
  var cols_arr = COLS_BY_EX[ex] || COLS_US;
  var results = [];
  for (var i = 0; i < tvRows.length; i++) {
    var row = tvRows[i];
    var d = row.d || [];
    function g(name) {
      var idx = cols_arr.indexOf(name);
      if (idx === -1) return null;
      var v = d[idx];
      return (v === undefined || v === null || v !== v) ? null : v;
    }
    var close  = g('close');
    var change = g('change');
    var volume = g('volume');
    var mcap   = g('market_cap_basic');
    var pe     = g('price_earnings_ttm');
    var pb     = g('price_book_fq');
    var ps     = g('price_sales_current');
    var roe    = g('return_on_equity_fq') !== null ? g('return_on_equity_fq') : g('return_on_equity');
    var roa    = g('return_on_assets_fq') !== null ? g('return_on_assets_fq') : g('return_on_assets');
    var nm     = g('net_margin');
    var gm     = g('gross_margin');
    var revG   = g('total_revenue_change_ttm_yoy') !== null ? g('total_revenue_change_ttm_yoy') : (g('revenue_growth_ttm_yoy') !== null ? g('revenue_growth_ttm_yoy') : g('earnings_per_share_diluted_yoy_growth_ttm'));
    var epsG   = g('earnings_per_share_change_ttm_yoy') !== null ? g('earnings_per_share_change_ttm_yoy') : (g('earnings_per_share_diluted_yoy_growth_ttm') !== null ? g('earnings_per_share_diluted_yoy_growth_ttm') : g('revenue_growth_ttm_yoy'));
    var divY   = g('dividends_yield') !== null ? g('dividends_yield') : g('dividends_yield_current');
    var de     = g('debt_to_equity_fq') !== null ? g('debt_to_equity_fq') : g('total_debt_to_equity');
    var cr     = g('current_ratio_fq') !== null ? g('current_ratio_fq') : g('current_ratio');
    var high52w = g('price_52_week_high') || g('High.1M');
    var low52w  = g('price_52_week_low')  || g('Low.1M');
    var techR  = g('Recommend.All');
    var maR    = g('Recommend.MA');
    var oscR   = g('Recommend.Other');
    var p1m    = g('Perf.1M');
    var p3m    = g('Perf.3M');
    var p6m    = g('Perf.6M');
    var pY     = g('Perf.Y');
    var rsi    = g('RSI');
    var relVol = g('relative_volume_10d_calc');
    var sma50  = g('SMA50');
    var sma200 = g('SMA200');
    var macdV  = g('MACD.macd');
    var macdS  = g('MACD.signal');
    var adx    = g('ADX');
    var adxP   = g('ADX+DI');
    var adxM   = g('ADX-DI');
    var bbL    = g('BB.lower');
    var stochK = g('Stoch.K');
    var stochD = g('Stoch.D');
    var beta   = g('beta_1_year');
    var pio    = g('piotroski_f_score');

    var sym = (row.s || '').replace(/^[A-Z0-9]+:/, '');
    if (!close || close === 0) continue;

    var mcapUSD = null;
    if (mcap !== null) {
      var v = mcap;
      if (ex === 'bist')   v = v / (fxRates.TRY || 38);
      else if (ex === 'dax') v = v * (fxRates.EUR || 0.93);
      else if (ex === 'lse') v = v * (fxRates.GBP || 0.79) / 100;
      mcapUSD = v / 1e6;
    }

    results.push({
      symbol: sym,
      currentPrice: close,
      changePercent: change,
      volume: volume,
      marketCapitalization: mcapUSD,
      peNormalizedAnnual: pe,
      pbAnnual: pb,
      psTTM: ps,
      roeTTM: roe,
      roaTTM: roa,
      netProfitMarginTTM: nm,
      grossMarginTTM: gm,
      revenueGrowthTTMYoy: revG,
      epsGrowthTTMYoy: epsG,
      dividendYieldIndicatedAnnual: divY,
      'totalDebt/totalEquityAnnual': de,
      currentRatioAnnual: cr,
      piotroski: pio !== null ? Math.round(pio) : null,
      fromHigh: (high52w && close && high52w > 0) ? ((close - high52w) / high52w * 100) : null,
      fromLow:  (low52w  && close && low52w  > 0) ? ((close - low52w)  / low52w  * 100) : null,
      techRating: techR,
      maRating: maR,
      oscRating: oscR,
      perf1m: p1m,
      perf3m: p3m,
      perf6m: p6m,
      perfY: pY,
      rsi14: rsi,
      relVol: relVol,
      beta: beta,
      adx: adx,
      adxDiDiff: (adxP !== null && adxM !== null) ? (adxP - adxM) : null,
      pctAboveSma200: (sma200 && close && sma200 > 0) ? ((close - sma200) / sma200 * 100) : null,
      smaTrend: (sma50 !== null && sma200 && sma200 > 0) ? ((sma50 - sma200) / sma200 * 100) : null,
      macd: macdV,
      macdHist: (macdV !== null && macdS !== null) ? (macdV - macdS) : null,
      bbDist: (bbL && close && bbL > 0) ? ((close - bbL) / bbL * 100) : null,
      stochK: stochK,
      stochKD: (stochK !== null && stochD !== null) ? (stochK - stochD) : null,
      peg: (pe && epsG && epsG > 0) ? (pe / epsG) : null,
    });
  }
  return results;
}

function loadData(ex) {
  var exm = EX_META[ex];
  var stateEl = document.getElementById('pg-state');
  var progBar  = document.getElementById('pg-prog-bar');
  stateEl.style.display = 'flex';
  progBar.style.width = '20%';

  var ratesP = loadRates();

  ratesP.then(function() {
    progBar.style.width = '40%';
    return fetch('/api/scan?exchange=' + ex, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPayload(ex))
    });
  }).then(function(res) {
    progBar.style.width = '75%';
    return res.json();
  }).then(function(json) {
    var rows = (json && json.data) ? json.data : (Array.isArray(json) ? json : []);
    if (!rows.length) throw new Error('Veri boş döndü');
    allData = parseRows(rows, ex);
    progBar.style.width = '100%';
    setTimeout(function() {
      stateEl.style.display = 'none';
      renderAll();
    }, 300);
  }).catch(function(e) {
    stateEl.innerHTML = '<div class="pg-err">⚠ Veri yüklenemedi: ' + e.message + '</div>' +
      '<button class="pg-retry" onclick="loadData(currentEx)">Tekrar Dene</button>';
  });
}

// ── Filtre + istatistik ───────────────────────────────────────
var _ruleMap = null;
function getRuleMap() {
  if (_ruleMap) return _ruleMap;
  _ruleMap = {};
  FILTER_RULES.forEach(function(r) {
    if (r[1]) _ruleMap[r[1]] = { field: r[0], isMin: true  };
    if (r[2]) _ruleMap[r[2]] = { field: r[0], isMin: false };
  });
  return _ruleMap;
}

function match(s, filters, special) {
  var map = getRuleMap();
  for (var key in filters) {
    var v = filters[key];
    if (key === 'vol_min' || key === 'vol_max') {
      if (s.volume === null || s.volume === undefined) return false;
      var volM = s.volume / 1e6;
      if (key === 'vol_min' && volM < v) return false;
      if (key === 'vol_max' && volM > v) return false;
      continue;
    }
    var rule = map[key]; if (!rule) continue;
    var raw = s[rule.field];
    if (raw === null || raw === undefined) {
      if (TECH_NULL_SKIP.indexOf(rule.field) !== -1) continue;
      return false;
    }
    if (rule.isMin  && raw < v) return false;
    if (!rule.isMin && raw > v) return false;
  }
  if (special === 'peg'      && !(s.peg !== null && s.peg > 0 && s.peg < 1.5)) return false;
  if (special === 'piotroski'&& !(s.piotroski !== null && s.piotroski >= 7))    return false;
  return true;
}

function matchList(filters, special) {
  return allData.filter(function(s){ return match(s, filters, special); });
}

function stats(filters, special) {
  var n=0, s1=0,c1=0, s3=0,c3=0, s6=0,c6=0;
  allData.forEach(function(s) {
    if (!match(s, filters, special)) return;
    n++;
    if (s.perf1m !== null) { s1 += s.perf1m; c1++; }
    if (s.perf3m !== null) { s3 += s.perf3m; c3++; }
    if (s.perf6m !== null) { s6 += s.perf6m; c6++; }
  });
  return { n:n, p1:c1?s1/c1:null, p3:c3?s3/c3:null, p6:c6?s6/c6:null };
}

function profileFilters(p) {
  var f = {}, sp = null;
  p.goat.forEach(function(k){ var g = GURUS[k]; if(g){ Object.assign(f, g.filters); if(g.special) sp=g.special; } });
  p.preset.forEach(function(k){ var p = PRESETS[k]; if(p) Object.assign(f, p.filters); });
  p.tech.forEach(function(k){ var t = TECH_PRESETS[k]; if(t) Object.assign(f, t.filters); });
  return { f:f, sp:sp };
}

// ── Kriterleri okunabilir metne çevir ─────────────────────────
function fmtMc(v) {
  if (v >= 1000) return '$' + (v % 1000 === 0 ? (v / 1000) : (v / 1000).toFixed(1)) + ' Mr';
  return '$' + v + 'M';
}
var FILTER_LABELS = {
  pe_min:  function(v){ return 'F/K > ' + v; },
  pe_max:  function(v){ return 'F/K < ' + v; },
  pb_min:  function(v){ return 'PD/DD > ' + v; },
  pb_max:  function(v){ return 'PD/DD < ' + v; },
  ps_min:  function(v){ return 'PD/Satış > ' + v; },
  ps_max:  function(v){ return 'PD/Satış < ' + v; },
  roe_min: function(v){ return 'Özkaynak kârlılığı (ROE) > %' + v; },
  roe_max: function(v){ return 'ROE < %' + v; },
  roa_min: function(v){ return 'Aktif kârlılığı (ROA) > %' + v; },
  margin_min: function(v){ return 'Net kâr marjı > %' + v; },
  margin_max: function(v){ return 'Net kâr marjı < %' + v; },
  gross_min:  function(v){ return 'Brüt kâr marjı > %' + v; },
  revg_min: function(v){ return 'Gelir büyümesi > %' + v; },
  revg_max: function(v){ return 'Gelir büyümesi < %' + v; },
  earng_min: function(v){ return 'Kâr (EPS) büyümesi > %' + v; },
  earng_max: function(v){ return 'Kâr (EPS) büyümesi < %' + v; },
  div_min: function(v){ return 'Temettü verimi > %' + v; },
  div_max: function(v){ return 'Temettü verimi < %' + v; },
  de_min:  function(v){ return 'Borç/Özsermaye > %' + v; },
  de_max:  function(v){ return 'Borç/Özsermaye < %' + v; },
  cr_min:  function(v){ return 'Cari oran > ' + v; },
  cr_max:  function(v){ return 'Cari oran < ' + v; },
  piotroski_min: function(v){ return 'Piotroski F-Skoru ≥ ' + v; },
  peg_min: function(v){ return 'PEG > ' + v; },
  peg_max: function(v){ return 'PEG < ' + v; },
  mc_min:  function(v){ return 'Piyasa değeri > ' + fmtMc(v); },
  mc_max:  function(v){ return 'Piyasa değeri < ' + fmtMc(v); },
  chg_min: function(v){ return 'Günlük değişim > %' + v; },
  chg_max: function(v){ return 'Günlük değişim < %' + v; },
  from_high_min: function(v){ return '52H zirvesine yakın (en çok %' + Math.abs(v) + ' altında)'; },
  from_high_max: function(v){ return '52H zirvesinden en az %' + Math.abs(v) + ' uzak'; },
  from_low_min:  function(v){ return '52H dibinden en az %' + v + ' yukarıda'; },
  tech_rating_min: function(v){ return 'Teknik skor > ' + v + ' (al sinyali)'; },
  ma_rating_min:   function(v){ return 'Hareketli ortalama skoru > ' + v; },
  osc_rating_min:  function(v){ return 'Osilatör skoru > ' + v; },
  perf1m_min: function(v){ return '1 aylık getiri > %' + v; },
  perf3m_min: function(v){ return '3 aylık getiri > %' + v; },
  perf6m_min: function(v){ return '6 aylık getiri > %' + v; },
  perfy_min:  function(v){ return 'Yıllık getiri > %' + v; },
  rsi_min: function(v){ return 'RSI > ' + v; },
  rsi_max: function(v){ return 'RSI < ' + v; },
  rel_vol_min: function(v){ return 'Göreli hacim > ' + v + 'x normal'; },
  vol_min: function(v){ return 'Hacim > ' + v + 'M lot'; },
  beta_min: function(v){ return 'Beta > ' + v; },
  beta_max: function(v){ return 'Beta < ' + v + ' (düşük oynaklık)'; },
  adx_min: function(v){ return 'ADX > ' + v + ' (güçlü trend)'; },
  adx_di_diff_min: function(){ return '+DI > −DI (alıcı baskın)'; },
  above_sma200_min: function(){ return 'Fiyat 200 günlük ortalamanın üzerinde'; },
  sma_trend_min: function(){ return 'SMA50 > SMA200 (yükseliş trendi)'; },
  macd_min: function(v){ return 'MACD > ' + v; },
  macd_max: function(v){ return 'MACD < ' + v; },
  macd_hist_min: function(){ return 'MACD sinyal çizgisini yukarı kesmiş'; },
  bb_dist_max: function(v){ return 'Bollinger alt bandına yakın (< %' + v + ')'; },
  stoch_k_max: function(v){ return 'Stokastik %K < ' + v + ' (aşırı satım)'; },
  stoch_kd_min: function(){ return '%K > %D (yukarı kesişim)'; },
};
function fmtCriteria(filters, special) {
  var out = [];
  for (var k in filters) {
    var fn = FILTER_LABELS[k];
    out.push(fn ? fn(filters[k]) : (k + ': ' + filters[k]));
  }
  if (special === 'peg')       out.push('PEG < 1.5 (büyümeye göre ucuz)');
  if (special === 'piotroski') out.push('Piotroski F-Skoru ≥ 7 (sağlam bilanço)');
  return out;
}

// ── Render ────────────────────────────────────────────────────
var _rows = {};      // id → {icon,label,st,filters,special}
var _rowSeq = 0;

function pctClass(v) {
  if (v === null || v === undefined) return 'na';
  return v >= 0 ? 'pos' : 'neg';
}
function pctFmt(v) {
  if (v === null || v === undefined) return '—';
  return (v >= 0 ? '+' : '') + v.toFixed(1) + '%';
}

function rowHtml(it) {
  var st = it.st;
  var id = 'r' + (_rowSeq++);
  _rows[id] = it;
  return '<div class="sr-item">' +
    '<div class="sr-row' + (st.n === 0 ? ' sr-row-empty':'') + '" id="row_' + id + '"' +
        ' onclick="toggleRow(\'' + id + '\')"' +
        ' onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();toggleRow(\'' + id + '\');}"' +
        ' role="button" tabindex="0">' +
      '<span class="sr-icon"><span class="sr-caret">▸</span>' + it.icon + '</span>' +
      '<span class="sr-label">' + it.label + '</span>' +
      '<span class="sr-n">' + st.n + '</span>' +
      '<span class="sr-val ' + pctClass(st.p1) + '">' + pctFmt(st.p1) + '</span>' +
      '<span class="sr-val ' + pctClass(st.p3) + '">' + pctFmt(st.p3) + '</span>' +
      '<span class="sr-val ' + pctClass(st.p6) + '">' + pctFmt(st.p6) + '</span>' +
    '</div>' +
    '<div class="sr-detail" id="det_' + id + '" hidden></div>' +
  '</div>';
}

function detailHtml(it) {
  var crit = fmtCriteria(it.filters, it.special);
  var critHtml = '<div class="sr-crit-hd">🔎 Bu strateji neye göre tarıyor?</div>' +
    '<div class="sr-crit-chips">' +
      crit.map(function(c){ return '<span class="sr-crit-chip">' + c + '</span>'; }).join('') +
    '</div>';

  var list = matchList(it.filters, it.special).slice();
  list.sort(function(a,b){ return (b.perf3m===null?-1e9:b.perf3m) - (a.perf3m===null?-1e9:a.perf3m); });

  var stockHtml;
  if (!list.length) {
    stockHtml = '<div class="sr-stk-empty">Bu kriterlere uyan hisse bulunamadı.</div>';
  } else {
    var capped = list.slice(0, 60);
    var hint = list.length > 60 ? (' · en iyi 60 (3A getiriye göre)') : '';
    stockHtml = '<div class="sr-stk-hd">📋 Listedeki hisseler — ' + list.length + ' adet' + hint + '</div>' +
      '<div class="sr-stk-grid">' +
        '<div class="sr-stk-head"><span>Sembol</span><span>1A</span><span>3A</span><span>6A</span></div>' +
        capped.map(function(s){
          var href = '/analiz/profile.html?sym=' + encodeURIComponent(s.symbol) + '&ex=' + currentEx;
          return '<a class="sr-stk-row" href="' + href + '" title="' + s.symbol + ' analizini aç">' +
            '<span class="sr-sym">' + s.symbol + '</span>' +
            '<span class="sr-sval ' + pctClass(s.perf1m) + '">' + pctFmt(s.perf1m) + '</span>' +
            '<span class="sr-sval ' + pctClass(s.perf3m) + '">' + pctFmt(s.perf3m) + '</span>' +
            '<span class="sr-sval ' + pctClass(s.perf6m) + '">' + pctFmt(s.perf6m) + '</span>' +
          '</a>';
        }).join('') +
      '</div>';
  }
  return '<div class="sr-detail-inner">' + critHtml + stockHtml + '</div>';
}

function sectionHtml(title, items) {
  items.sort(function(a,b) {
    if(a.st.n===0 && b.st.n===0) return 0;
    if(a.st.n===0) return 1;
    if(b.st.n===0) return -1;
    return (b.st.p3===null?-1e9:b.st.p3) - (a.st.p3===null?-1e9:a.st.p3);
  });
  return '<div class="sr-section-hd">' + title + '</div>' +
    '<div class="sr-head-row"><span></span><span>Strateji</span><span>Hisse</span><span>1A</span><span>3A</span><span>6A</span></div>' +
    items.map(function(it){ return rowHtml(it); }).join('');
}

function renderAll() {
  var wrap = document.getElementById('sr-wrap');
  var exm  = EX_META[currentEx] || EX_META.bist;
  _rows = {}; _rowSeq = 0;

  var html = '<div class="sr-note">' +
    exm.flag + ' <b>' + exm.name + '</b> · ' + allData.length + ' hisse tarandı. ' +
    'Bugünkü filtreden geçen hisselerin son 1&nbsp;/&nbsp;3&nbsp;/&nbsp;6 aydaki eşit ağırlıklı ortalama getirisi. ' +
    'Bir stratejinin üstüne tıklayarak tarama kriterlerini ve listedeki hisseleri görebilirsin. ' +
    'Geçmişe dönük göstergedir; gelecek getiriyi garanti etmez.' +
  '</div>';

  // Yatırımcı stratejileri
  var profItems = INVESTOR_PROFILES.map(function(p) {
    var pf = profileFilters(p);
    return { icon:p.icon, label:p.label, st:stats(pf.f, pf.sp), filters:pf.f, special:pf.sp };
  });
  html += sectionHtml('🧬 Yatırımcı Stratejileri', profItems);

  // Reklam 1: stratejiler ile detay arası
  html += '<div class="ad-slot" id="ad-mid">' +
    '<span class="ad-label">Reklam</span>' +
    '<div class="ad-placeholder"></div>' +
  '</div>';

  if (showAllGroups) {
    var goatItems = Object.keys(GURUS).map(function(k) {
      var g = GURUS[k]; return { icon:'🐐', label:g.label, st:stats(g.filters, g.special||null), filters:g.filters, special:g.special||null };
    });
    html += sectionHtml('🏆 GOAT Stratejileri', goatItems);

    var presetItems = Object.keys(PRESETS).map(function(k) {
      var p = PRESETS[k]; return { icon:'📊', label:p.label, st:stats(p.filters, null), filters:p.filters, special:null };
    });
    html += sectionHtml('📐 Temel Filtreler', presetItems);

    var techItems = Object.keys(TECH_PRESETS).map(function(k) {
      var p = TECH_PRESETS[k]; return { icon:'📈', label:p.label, st:stats(p.filters, null), filters:p.filters, special:null };
    });
    html += sectionHtml('⚙️ Teknik Filtreler', techItems);

    html += '<button class="sr-toggle" onclick="toggleAll()">▲ Sadece Yatırımcı Stratejileri</button>';
  } else {
    var total = Object.keys(GURUS).length + Object.keys(PRESETS).length + Object.keys(TECH_PRESETS).length;
    html += '<button class="sr-toggle" onclick="toggleAll()">▼ Tüm Filtreler &amp; Stratejileri Göster (' + total + ')</button>';
  }

  // Reklam 2: sayfa altı
  html += '<div class="ad-slot" id="ad-bottom">' +
    '<span class="ad-label">Reklam</span>' +
    '<div class="ad-placeholder ad-placeholder-lg"></div>' +
  '</div>';

  wrap.innerHTML = html;
}

// ── Global fonksiyonlar (HTML onclick) ───────────────────────
window.setEx = function(key) {
  if (key === currentEx) return;
  currentEx = key;
  allData = [];
  document.querySelectorAll('.ex-tab').forEach(function(b){
    b.classList.toggle('on', b.dataset.ex === key);
  });
  document.getElementById('sr-wrap').innerHTML = '';
  loadData(key);
};
window.toggleAll = function() {
  showAllGroups = !showAllGroups;
  renderAll();
};
window.toggleRow = function(id) {
  var det = document.getElementById('det_' + id);
  var row = document.getElementById('row_' + id);
  if (!det || !row) return;
  if (!det.hasAttribute('hidden')) {
    det.setAttribute('hidden', '');
    det.innerHTML = '';
    row.classList.remove('sr-row-open');
    return;
  }
  var it = _rows[id];
  if (!it) return;
  det.innerHTML = detailHtml(it);
  det.removeAttribute('hidden');
  row.classList.add('sr-row-open');
};
window.currentEx = currentEx; // expose for error handler

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  loadData(currentEx);
});
})();
