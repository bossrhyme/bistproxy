const https = require('https');

// ── Yardımcı: HTTPS isteği ────────────────────────────────────────────
function makeReq(hostname, path, method, headers, body) {
  return new Promise((resolve, reject) => {
    const opts = { hostname, path, method, headers: { ...headers } };
    if (body) opts.headers['Content-Length'] = Buffer.byteLength(body);
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// ── Vercel KV Cache ──────────────────────────────────────────────────
function kvEnabled() {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}
async function kvGet(key) {
  try {
    const r = await makeReq(
      new URL(process.env.KV_REST_API_URL).hostname,
      '/get/' + encodeURIComponent(key), 'GET',
      { Authorization: 'Bearer ' + process.env.KV_REST_API_TOKEN }
    );
    const j = JSON.parse(r.body);
    return j.result ? JSON.parse(j.result) : null;
  } catch(e) { return null; }
}
async function kvSet(key, value, ttl) {
  try {
    const u = new URL(process.env.KV_REST_API_URL);
    await makeReq(
      u.hostname,
      '/set/' + encodeURIComponent(key) + '?ex=' + ttl,
      'POST',
      { Authorization: 'Bearer ' + process.env.KV_REST_API_TOKEN, 'Content-Type': 'application/json' },
      JSON.stringify(value)
    );
  } catch(e) {}
}

// ── 1. Birincil Kaynak: CoinGecko /coins/markets ─────────────────────
// Demo key: ücretsiz, 30 req/dk
// Endpoint: https://api.coingecko.com/api/v3/coins/markets
async function fetchCoinGecko(params) {
  const {
    vsCurrency = 'usd',
    category = '',       // defi, layer-1, meme-token, ai-big-data, gaming vb.
    order = 'market_cap_desc',
    perPage = 100,
    page = 1,
    priceChangePerc = '1h,24h,7d,30d',
    sparkline = false
  } = params;

  const apiKey = process.env.COINGECKO_API_KEY || '';
  const qs = new URLSearchParams({
    vs_currency: vsCurrency,
    order,
    per_page: perPage,
    page,
    price_change_percentage: priceChangePerc,
    sparkline,
    locale: 'en',
    ...(category ? { category } : {})
  });

  const path = '/api/v3/coins/markets?' + qs.toString();
  const headers = {
    'Accept': 'application/json',
    'User-Agent': 'DeepFin/1.0',
    ...(apiKey ? { 'x-cg-demo-api-key': apiKey } : {})
  };

  const r = await makeReq('api.coingecko.com', path, 'GET', headers);
  if (r.status === 429) throw new Error('CoinGecko rate limit — 30s bekle');
  if (r.status !== 200) throw new Error('CoinGecko HTTP ' + r.status);
  return JSON.parse(r.body);
}

// ── 2. İkincil Kaynak: TradingView Crypto Scanner ───────────────────
// /crypto/scan — mevcut altyapıyla aynı yöntem
async function fetchTVCrypto(limit = 50) {
  const payload = JSON.stringify({
    filter: [
      { left: 'market_cap_basic', operation: 'nempty' },
      { left: 'volume', operation: 'greater', right: 100000 }
    ],
    options: { lang: 'en' },
    symbols: { query: { types: ['crypto'] } },
    columns: [
      'base_currency', 'name', 'close', 'change', 'change_abs',
      'volume', 'market_cap_basic', 'Perf.1M', 'Perf.W', 'RSI',
      'Volatility.D', 'Recommend.All'
    ],
    sort: { sortBy: 'market_cap_basic', sortOrder: 'desc' },
    range: [0, limit]
  });

  const r = await makeReq(
    'scanner.tradingview.com',
    '/crypto/scan',
    'POST',
    {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0',
      'Origin': 'https://www.tradingview.com',
      'Referer': 'https://www.tradingview.com/'
    },
    payload
  );

  if (r.status !== 200) return null;
  return JSON.parse(r.body);
}

// ── Veri birleştirme: CoinGecko + TradingView ─────────────────────────
function mergeData(cgList, tvData) {
  // TV verisi sembol→row map
  const tvMap = {};
  if (tvData?.data) {
    const cols = tvData.columns || [
      'base_currency', 'name', 'close', 'change', 'change_abs',
      'volume', 'market_cap_basic', 'Perf.1M', 'Perf.W', 'RSI',
      'Volatility.D', 'Recommend.All'
    ];
    for (const row of tvData.data) {
      const sym = (row.s || '').replace(/^[A-Z0-9]+:/, '').toUpperCase();
      const obj = {};
      cols.forEach((col, i) => { obj[col] = row.d?.[i] ?? null; });
      tvMap[sym] = obj;
    }
  }

  return cgList.map(cg => {
    const sym = (cg.symbol || '').toUpperCase();
    const tv  = tvMap[sym + 'USDT'] || tvMap[sym + 'USD'] || tvMap[sym] || null;

    // Fiyat doğrulama: CoinGecko vs TradingView
    let priceVerified = false;
    let priceDiff = null;
    if (tv && tv.close && cg.current_price) {
      priceDiff = Math.abs((tv.close - cg.current_price) / cg.current_price * 100);
      priceVerified = priceDiff < 2; // %2 tolerans
    }

    return {
      // Temel bilgi (CoinGecko)
      id:             cg.id,
      symbol:         sym,
      name:           cg.name,
      image:          cg.image,
      rank:           cg.market_cap_rank,

      // Fiyat & Piyasa (CoinGecko — birincil)
      price:          cg.current_price,
      priceBtc:       cg.current_price / (cgList.find(c=>c.symbol==='btc')?.current_price || 1),
      mcap:           cg.market_cap,           // USD
      mcapRank:       cg.market_cap_rank,
      fdv:            cg.fully_diluted_valuation,
      volume24h:      cg.total_volume,         // USD
      high24h:        cg.high_24h,
      low24h:         cg.low_24h,

      // Arz
      circSupply:     cg.circulating_supply,
      totalSupply:    cg.total_supply,
      maxSupply:      cg.max_supply,
      supplyRatio:    cg.total_supply ? cg.circulating_supply / cg.total_supply : null,

      // Performans
      change1h:       cg.price_change_percentage_1h_in_currency,
      change24h:      cg.price_change_percentage_24h,
      change7d:       cg.price_change_percentage_7d_in_currency,
      change30d:      cg.price_change_percentage_30d_in_currency,

      // ATH/ATL
      ath:            cg.ath,
      athDate:        cg.ath_date,
      athChange:      cg.ath_change_percentage,
      atl:            cg.atl,
      atlChange:      cg.atl_change_percentage,

      // TV doğrulama verileri (ikincil)
      tvPrice:        tv?.close || null,
      rsi14:          tv?.RSI || null,
      volatilityD:    tv?.['Volatility.D'] || null,
      tvRating:       tv?.['Recommend.All'] || null,

      // Doğrulama durumu
      verified:       priceVerified,
      priceDiffPct:   priceDiff ? parseFloat(priceDiff.toFixed(2)) : null,
      verifyNote: priceVerified
        ? `CG+TV uyuşuyor (${priceDiff?.toFixed(2)}% fark)`
        : tv
          ? `TV farkı: ${priceDiff?.toFixed(2)}%`
          : 'Sadece CoinGecko verisi',

      sources: ['coingecko', ...(tv ? ['tradingview'] : [])]
    };
  });
}

// ── Filtre uygula ────────────────────────────────────────────────────
function applyFilters(coins, filters) {
  const {
    minMcapM, maxMcapM,
    minVol24hM, maxVol24hM,
    minChange24h, maxChange24h,
    minChange7d, maxChange7d,
    minChange30d, maxChange30d,
    minRsi, maxRsi,
    minSupplyRatio, maxSupplyRatio,
    maxAthChangePct  // ATH'dan ne kadar uzak (negatif = aşağı, örn. -70)
  } = filters;

  return coins.filter(c => {
    if (minMcapM    != null && (c.mcap / 1e6) < minMcapM)       return false;
    if (maxMcapM    != null && (c.mcap / 1e6) > maxMcapM)       return false;
    if (minVol24hM  != null && (c.volume24h / 1e6) < minVol24hM) return false;
    if (maxVol24hM  != null && (c.volume24h / 1e6) > maxVol24hM) return false;
    if (minChange24h != null && c.change24h < minChange24h)      return false;
    if (maxChange24h != null && c.change24h > maxChange24h)      return false;
    if (minChange7d  != null && c.change7d  < minChange7d)       return false;
    if (maxChange7d  != null && c.change7d  > maxChange7d)       return false;
    if (minChange30d != null && c.change30d < minChange30d)      return false;
    if (maxChange30d != null && c.change30d > maxChange30d)      return false;
    if (minRsi      != null && c.rsi14 != null && c.rsi14 < minRsi) return false;
    if (maxRsi      != null && c.rsi14 != null && c.rsi14 > maxRsi) return false;
    if (minSupplyRatio != null && c.supplyRatio < minSupplyRatio) return false;
    if (maxAthChangePct != null && c.athChange > maxAthChangePct) return false;
    return true;
  });
}

// ── Hazır strateji presetleri ────────────────────────────────────────
const PRESETS = {
  hacim_patlamasi: { minVol24hM: 50, minChange24h: 5 },
  rsi_dip:         { maxRsi: 35 },
  ath_yakini:      { maxAthChangePct: -10 },
  buyuk_kap:       { minMcapM: 10000 },
  kucuk_cap_gem:   { maxMcapM: 100, minVol24hM: 1 },
  momentum:        { minChange7d: 10, minChange30d: 20 },
  dusuk_arz:       { maxSupplyRatio: 0.5, minMcapM: 100 },
};

// ── Ana handler ──────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'https://deepfin.vercel.app',
  'https://bistproxy.vercel.app',
  'https://www.deepfin.com',
];

module.exports = async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = new URL(req.url, 'https://x');

  // Parametreler
  const category  = url.searchParams.get('category') || '';  // CoinGecko kategori filtresi
  const preset    = url.searchParams.get('preset')   || '';
  const sortBy    = url.searchParams.get('sort')     || 'market_cap_desc';
  const limit     = Math.min(parseInt(url.searchParams.get('limit') || '100'), 250);
  const page      = parseInt(url.searchParams.get('page') || '1');

  // Manuel filtreler
  const filters = {
    minMcapM:       url.searchParams.get('min_mcap')     ? parseFloat(url.searchParams.get('min_mcap'))     : null,
    maxMcapM:       url.searchParams.get('max_mcap')     ? parseFloat(url.searchParams.get('max_mcap'))     : null,
    minVol24hM:     url.searchParams.get('min_vol24h')   ? parseFloat(url.searchParams.get('min_vol24h'))   : null,
    minChange24h:   url.searchParams.get('min_chg24h')   ? parseFloat(url.searchParams.get('min_chg24h'))   : null,
    maxChange24h:   url.searchParams.get('max_chg24h')   ? parseFloat(url.searchParams.get('max_chg24h'))   : null,
    minChange7d:    url.searchParams.get('min_chg7d')    ? parseFloat(url.searchParams.get('min_chg7d'))    : null,
    minChange30d:   url.searchParams.get('min_chg30d')   ? parseFloat(url.searchParams.get('min_chg30d'))   : null,
    minRsi:         url.searchParams.get('min_rsi')      ? parseFloat(url.searchParams.get('min_rsi'))      : null,
    maxRsi:         url.searchParams.get('max_rsi')      ? parseFloat(url.searchParams.get('max_rsi'))      : null,
    maxAthChangePct:url.searchParams.get('max_ath_chg')  ? parseFloat(url.searchParams.get('max_ath_chg'))  : null,
    ...( PRESETS[preset] || {} )
  };

  // Cache key
  const cacheKey = `df_kripto_v1_${category}_${preset}_${sortBy}_${limit}_${page}_${JSON.stringify(filters)}`;
  if (kvEnabled()) {
    const cached = await kvGet(cacheKey);
    if (cached) {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('X-Cache', 'HIT');
      return res.status(200).end(JSON.stringify(cached));
    }
  }

  try {
    // 1. CoinGecko — birincil kaynak
    const cgData = await fetchCoinGecko({
      category,
      order: sortBy,
      perPage: limit,
      page,
      priceChangePerc: '1h,24h,7d,30d'
    });

    if (!cgData || !cgData.length) {
      return res.status(200).json({ coins: [], total: 0, sources: ['coingecko'] });
    }

    // 2. TradingView — ikincil kaynak (doğrulama için)
    const tvData = await fetchTVCrypto(limit);

    // 3. Birleştir
    let coins = mergeData(cgData, tvData);

    // 4. Filtrele
    coins = applyFilters(coins, filters);

    // 5. İstatistikler
    const verified   = coins.filter(c => c.verified).length;
    const tvCoverage = coins.filter(c => c.tvPrice).length;

    const result = {
      coins,
      total:       coins.length,
      verified,
      tvCoverage,
      preset:      preset || null,
      sources: {
        primary:   'coingecko',
        secondary: 'tradingview',
        note: `${verified}/${coins.length} coin CoinGecko+TradingView çapraz doğrulandı`
      },
      updatedAt: new Date().toISOString()
    };

    // 6. Cache (2 dakika — kripto hızlı değişiyor)
    if (kvEnabled()) await kvSet(cacheKey, result, 120);

    res.setHeader('Content-Type', 'application/json');
    return res.status(200).end(JSON.stringify(result));

  } catch(err) {
    console.error('kripto-scan error:', err.message);
    return res.status(500).json({ error: err.message, coins: [] });
  }
};
