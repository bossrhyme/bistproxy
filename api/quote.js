const https = require('https');

function makeRequest(hostname, path, method, headers, body, callback) {
  const options = { hostname, path, method, headers };
  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => callback(null, data, res.statusCode));
  });
  req.on('error', (err) => callback(err));
  if (body) req.write(body);
  req.end();
}

const EXCHANGE_META = {
  bist:   { symbolPrefix: 'BIST:',   tvPath: '/turkey/scan'   },
  nasdaq: { symbolPrefix: 'NASDAQ:', tvPath: '/america/scan'  },
  sp500:  { symbolPrefix: 'NYSE:',   tvPath: '/america/scan'  },
  dax:    { symbolPrefix: 'XETR:',   tvPath: '/germany/scan'  },
  lse:    { symbolPrefix: 'LSE:',    tvPath: '/uk/scan'       },
  nikkei: { symbolPrefix: 'TSE:',    tvPath: '/japan/scan'    },
};

const ALLOWED_ORIGINS = [
  'https://deepfin.vercel.app',
  'https://bistproxy.vercel.app',
  'https://www.deepfin.com',
];

module.exports = function(req, res) {
  const origin = req.headers.origin || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = new URL(req.url, 'http://localhost');
  // 'sym' veya 'symbol' her ikisini de kabul et
  const symbol   = (url.searchParams.get('sym') || url.searchParams.get('symbol') || '').toUpperCase();
  // 'ex' veya 'exchange' her ikisini de kabul et
  const exchange = (url.searchParams.get('ex') || url.searchParams.get('exchange') || 'bist').toLowerCase();

  if (!symbol) return res.status(400).json({ error: 'symbol gerekli' });

  // Haber isteği - şimdilik boş döndür
  const type = url.searchParams.get('type') || '';
  if (type === 'news') return res.status(200).json({ news: [] });

  const meta  = EXCHANGE_META[exchange] || EXCHANGE_META.bist;
  const tvSym = meta.symbolPrefix + symbol;

  const fields = [
    'name', 'description', 'close', 'change', 'change_abs', 'volume',
    'average_volume_10d_calc', 'market_cap_basic',
    'price_earnings_ttm', 'price_book_fq', 'price_sales_current',
    'return_on_equity_fq', 'return_on_assets_fq',
    'net_margin', 'gross_margin', 'dividends_yield',
    'debt_to_equity_fq', 'current_ratio_fq',
    'sector', 'High.1M', 'Low.1M', 'beta_1_year',
    '52_week_high', '52_week_low',
    'Perf.W', 'Perf.1M', 'Perf.Y',
    'Recommend.All', 'number_of_employees',
    'piotroski_f_score',
    'price_earnings_growth_ttm',
  ];

  const payload = JSON.stringify({
    symbols: { tickers: [tvSym], query: { types: [] } },
    columns: fields,
  });

  const headers = {
    'Content-Type':   'application/json',
    'Content-Length': Buffer.byteLength(payload),
    'User-Agent':     'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Origin':         'https://www.tradingview.com',
    'Referer':        'https://www.tradingview.com/',
    'Accept':         'application/json',
  };

  makeRequest('scanner.tradingview.com', '/scan', 'POST', headers, payload, (err, data, statusCode) => {
    if (err) return res.status(500).json({ error: 'Bağlantı hatası' });

    try {
      const parsed = JSON.parse(data);
      const row    = parsed.data?.[0]?.d || [];

      if (!row.length) return res.status(404).json({ error: 'Hisse bulunamadı' });

      const raw = {};
      fields.forEach((f, i) => { raw[f] = row[i] ?? null; });

      // profile.html'in beklediği alan isimlerine map et
      const result = {
        // Kimlik
        symbol:       symbol,
        exchange:     exchange,
        name:         raw.name,
        description:  raw.description,
        sector:       raw.sector,

        // Fiyat — 'price' olarak döndür (profile.html bunu bekliyor)
        price:        raw.close,
        close:        raw.close,
        change:       raw.change_abs,
        changePct:    raw.change,

        // Hacim & piyasa
        volume:       raw.volume,
        avgVolume:    raw.average_volume_10d_calc,
        marketCap:    raw.market_cap_basic != null ? raw.market_cap_basic * 1e6 : null,

        // Çarpanlar
        pe:           raw.price_earnings_ttm,
        pb:           raw.price_book_fq,
        ps:           raw.price_sales_current,

        // Karlılık (TV % olarak veriyor, bölme yapma — profile.html /100 yapıyor)
        roe:          raw.return_on_equity_fq,
        roa:          raw.return_on_assets_fq,
        netMargin:    raw.net_margin,
        grossMargin:  raw.gross_margin,

        // Finansal sağlık
        dividendYield: raw.dividends_yield,
        debtToEquity:  raw.debt_to_equity_fq,
        currentRatio:  raw.current_ratio_fq,
        beta:          raw['beta_1_year'],

        // 52 hafta (gerçek 52H varsa onu, yoksa 1M yüksek/düşük)
        high52: raw['52_week_high'] || raw['High.1M'],
        low52:  raw['52_week_low']  || raw['Low.1M'],

        // Performans
        perfW:  raw['Perf.W'],
        perf1M: raw['Perf.1M'],
        perfY:  raw['Perf.Y'],

        // Diğer
        peg:       raw['price_earnings_growth_ttm'],
        piotroski: raw['piotroski_f_score'],
        employees: raw['number_of_employees'],
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'public, max-age=60');
      return res.status(200).json(result);

    } catch(e) {
      return res.status(500).json({ error: 'Veri işlenemedi' });
    }
  });
};
