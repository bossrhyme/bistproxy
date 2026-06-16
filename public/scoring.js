// ── DeepFin Uyum Puanı — Faz 3 Scoring Engine ──────────────────
// Seçili filtreler ile her hissenin ne kadar örtüştüğünü 0-100 arası puanlar.
// Hard filtreleri geçen hisseler arasında derece farkını gösterir.

var SCORE_CFG = {
  PASS    : 0.60,   // eşik noktasındaki normalize skor
  kNear   : 0.50,   // robustSigma çarpanı — "yakın" band genişliği
  kExcel  : 1.50,   // robustSigma çarpanı — "mükemmel" band genişliği
  fallback: 0.15,   // IQR hesaplanamadığında hedef değerin ±%15'i
  minN    : 25,     // IQR için minimum satır sayısı
  bands   : { high: 80, watch: 65, ok: 50 }
};

// FILTER_RULES'dan filtre_anahtarı → stock_alanı eşlemesi (lazy)
var _sfMap = null;
function _ensureSfMap() {
  if (_sfMap) return;
  _sfMap = {};
  if (typeof FILTER_RULES === 'undefined') return;
  FILTER_RULES.forEach(function(rule) {
    var field = rule[0], minKey = rule[1], maxKey = rule[2];
    if (minKey) _sfMap[minKey] = field;
    if (maxKey) _sfMap[maxKey] = field;
  });
}

// IQR tabanlı robustSigma önbelleği
// allData yüklendikten hemen sonra bir kez çağrılır
var _iqrCache = {};
function buildIqrCache(rows) {
  _ensureSfMap();
  _iqrCache = {};
  if (!rows || !rows.length) return;
  // İlgili tüm benzersiz field'ları topla
  var fields = [];
  var map = _sfMap || {};
  Object.keys(map).forEach(function(k) {
    var f = map[k];
    if (fields.indexOf(f) === -1) fields.push(f);
  });
  fields.forEach(function(f) {
    var vals = [];
    for (var i = 0; i < rows.length; i++) {
      var v = rows[i][f];
      if (v != null && isFinite(v)) vals.push(v);
    }
    if (vals.length < SCORE_CFG.minN) { _iqrCache[f] = null; return; }
    vals.sort(function(a, b) { return a - b; });
    var n = vals.length;
    var q1 = vals[Math.floor(n * 0.25)];
    var q3 = vals[Math.floor(n * 0.75)];
    _iqrCache[f] = Math.abs(q3 - q1) / 1.349;  // robustSigma
  });
}

// Tek kriter için normalize skor (0.0–1.0)
// op 'min': değer ≥ target → iyi | 'max': değer ≤ target → iyi
function _scoreOne(val, field, op, target) {
  if (val == null || !isFinite(val)) return null;
  var sigma = _iqrCache[field];
  if (!sigma || !isFinite(sigma)) sigma = Math.abs(target) * SCORE_CFG.fallback || 1;
  var near  = sigma * SCORE_CFG.kNear  || 0.001;
  var excel = sigma * SCORE_CFG.kExcel || 0.001;
  var P = SCORE_CFG.PASS;

  if (op === 'min') {
    if (val >= target) {
      return Math.min(1.0, P + (1 - P) * Math.min(1, (val - target) / excel));
    }
    var floor = target - near;
    if (val >= floor) return P * Math.max(0, (val - floor) / near);
    return 0;
  } else {
    // op === 'max': küçük değer daha iyi
    if (val <= target) {
      return Math.min(1.0, P + (1 - P) * Math.min(1, (target - val) / excel));
    }
    var ceil = target + near;
    if (val <= ceil) return P * Math.max(0, (ceil - val) / near);
    return 0;
  }
}

// Bir hissenin tüm aktif filtrelere karşı Uyum Puanı'nı hesapla
// filters: { pe_max:15, roe_min:20, ... }  (_scoreFilters'den gelir)
// Döner: { score:0-100, status:'high'|'watch'|'ok'|'low', n:kriter_sayısı, details:[...] } | null
function computeMatch(stock, filters) {
  _ensureSfMap();
  if (!filters || !stock) return null;
  var keys = Object.keys(filters);
  if (!keys.length) return null;

  var total = 0, count = 0;
  var details = [];
  keys.forEach(function(key) {
    var field = _sfMap[key];
    if (!field) return;
    var target = filters[key];
    if (target == null) return;
    var op = key.endsWith('_min') ? 'min' : key.endsWith('_max') ? 'max' : null;
    if (!op) return;
    var val = stock[field];
    var s = _scoreOne(val, field, op, target);
    var crit_status = s === null ? 'miss' : s >= SCORE_CFG.PASS ? 'pass' : s > 0 ? 'near' : 'fail';
    details.push({ key: key, field: field, op: op, target: target, val: val, s: s, status: crit_status });
    if (s !== null) { total += s; count++; }
  });

  if (!count) return null;
  var pct = Math.round((total / count) * 100);
  var b = SCORE_CFG.bands;
  var status = pct >= b.high ? 'high' : pct >= b.watch ? 'watch' : pct >= b.ok ? 'ok' : 'low';
  return { score: pct, status: status, n: count, details: details };
}
