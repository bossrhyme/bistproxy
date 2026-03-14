// DeepFin Filter Worker
// Filter ve sort işlemlerini main thread'den ayırır

self.onmessage = function(e) {
  var data = e.data;
  var type = data.type;

  if (type === 'FILTER_SORT') {
    var result = filterAndSort(data.allData, data.filters, data.sortSt, data.favSet, data.favFilterActive);
    self.postMessage({ type: 'RESULT', filtered: result });
  }
};

function filterAndSort(allData, filters, sortSt, favSet, favFilterActive) {
  // 1. Filtrele
  var filtered = allData.filter(function(s) {
    // Fav filtresi
    if (favFilterActive && !favSet[s.symbol]) return false;

    // Sayısal filtreler
    for (var i = 0; i < filters.length; i++) {
      var f = filters[i];
      var val = s[f.field];
      if (val === null || val === undefined) {
        if (f.min !== null || f.max !== null) return false;
        continue;
      }
      var v = val * (f.mult || 1);
      if (f.min !== null && v < f.min) return false;
      if (f.max !== null && v > f.max) return false;
    }

    // Sektör filtresi
    if (filters._sector && s.sector !== filters._sector) return false;

    // Arama
    if (filters._search) {
      var q = filters._search.toLowerCase();
      var sym = (s.symbol || '').toLowerCase();
      var name = (s.name || '').toLowerCase();
      if (sym.indexOf(q) === -1 && name.indexOf(q) === -1) return false;
    }

    return true;
  });

  // 2. Sırala
  if (sortSt && sortSt.field) {
    var field = sortSt.field;
    var dir   = sortSt.dir === 'asc' ? 1 : -1;
    filtered.sort(function(a, b) {
      var av = a[field], bv = b[field];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      return dir * (av > bv ? 1 : av < bv ? -1 : 0);
    });
  }

  return filtered;
}
