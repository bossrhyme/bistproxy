
// ── STATE ──
var _ex = 'bist';
var _chosen = null;   // listeden seçilen sembol — null iken gidiş YOK
var _searchTimer = null;
var _disclaimerTimer = null;

// ── BIST LOCAL LIST ──
var BIST = [
  {s:'THYAO',n:'Türk Hava Yolları'},{s:'GARAN',n:'Garanti BBVA'},{s:'AKBNK',n:'Akbank'},
  {s:'EREGL',n:'Ereğli Demir Çelik'},{s:'KCHOL',n:'Koç Holding'},{s:'SAHOL',n:'Sabancı Holding'},
  {s:'SISE',n:'Şişe ve Cam'},{s:'ASELS',n:'Aselsan'},{s:'FROTO',n:'Ford Otosan'},
  {s:'TOASO',n:'Tofaş Otomobil'},{s:'YKBNK',n:'Yapı Kredi Bankası'},{s:'PGSUS',n:'Pegasus'},
  {s:'BIMAS',n:'BİM Mağazalar'},{s:'TUPRS',n:'Tüpraş'},{s:'PETKM',n:'Petkim'},
  {s:'ARCLK',n:'Arçelik'},{s:'KRDMD',n:'Kardemir'},{s:'TTKOM',n:'Türk Telekom'},
  {s:'TCELL',n:'Turkcell'},{s:'ULKER',n:'Ülker Bisküvi'},{s:'VESTL',n:'Vestel'},
  {s:'MGROS',n:'Migros'},{s:'DOHOL',n:'Doğan Holding'},{s:'KOZAL',n:'Koza Altın'},
  {s:'ISCTR',n:'İş Bankası'},{s:'VAKBN',n:'Vakıfbank'},{s:'HALKB',n:'Halkbank'},
  {s:'ALARK',n:'Alarko Holding'},{s:'CCOLA',n:'Coca-Cola İçecek'},{s:'LOGO',n:'Logo Yazılım'},
  {s:'AEFES',n:'Anadolu Efes'},{s:'BRISA',n:'Brisa Bridgestone'},{s:'EKGYO',n:'Emlak Konut GYO'},
  {s:'ENKAI',n:'Enka İnşaat'},{s:'AKSEN',n:'Aksen Enerji'},{s:'KOZAA',n:'Koza Anadolu Metal'},
  {s:'ANACM',n:'Anadolu Cam'},{s:'TRKCM',n:'Trakya Cam'},{s:'SOKM',n:'Şok Marketler'},
  {s:'ODAS',n:'Odaş Elektrik'},{s:'TAVHL',n:'TAV Havalimanları'},{s:'SASA',n:'Sasa Polyester'},
  {s:'TKFEN',n:'Tekfen Holding'},{s:'ENJSA',n:'Enerjisa Enerji'},{s:'MAVI',n:'Mavi Giyim'},
  {s:'OTKAR',n:'Otokar'},{s:'DOAS',n:'Doğuş Otomotiv'},{s:'SELEC',n:'Selçuk Ecza'},
  {s:'TATGD',n:'Tat Gıda'},{s:'TRGYO',n:'Torunlar GYO'},{s:'AKCNS',n:'Akçansa'},
  {s:'CIMSA',n:'Çimsa'},{s:'BUCIM',n:'Bursa Çimento'},{s:'ZOREN',n:'Zorlu Enerji'},
  {s:'ISGYO',n:'İş GYO'},{s:'AKGRT',n:'Aksigorta'},{s:'ANSGR',n:'Anadolu Sigorta'},
  {s:'ANHYT',n:'Anadolu Hayat'},{s:'SKBNK',n:'Şekerbank'},{s:'DEVA',n:'Deva Holding'},
  {s:'ECILC',n:'Eczacıbaşı İlaç'},{s:'PRKME',n:'Park Elektrik'},{s:'SARKY',n:'Sarkuysan'},
  {s:'CLEBI',n:'Çelebi Hava Servisi'},{s:'INDES',n:'İndeks Bilgisayar'},{s:'GESAN',n:'Gedik Seramik'},
  {s:'VESBE',n:'Vestel Beyaz Eşya'},{s:'BANVT',n:'Banvit'},{s:'HLGYO',n:'Halk GYO'},
  {s:'ZRGYO',n:'Ziraat GYO'},{s:'VKGYO',n:'Vakıf GYO'},{s:'ISFIN',n:'İş Finansal Kiralama'},
  {s:'AGHOL',n:'AG Anadolu Grubu'},{s:'JANTS',n:'Jantsa'},{s:'KATMR',n:'Katmerciler'},
  {s:'NETAS',n:'Netaş Telekomünikasyon'},{s:'BFREN',n:'Bosch Fren'},{s:'KERVT',n:'Kerevitaş'},
  {s:'FENER',n:'Fenerbahçe'},{s:'GSRAY',n:'Galatasaray'},{s:'TKNSA',n:'Teknosa'},
  {s:'AFYON',n:'Afyon Çimento'},{s:'KONYA',n:'Konya Çimento'},{s:'ARMDA',n:'Armada'},
  {s:'ASUZU',n:'Anadolu Isuzu'},{s:'BIZIM',n:'Bizim Toptan'},{s:'BURCE',n:'Burçelik'},
  {s:'CWENE',n:'CW Enerji'},{s:'DAGI',n:'Dagi Giyim'},{s:'DYOBY',n:'DYO Boya'},
  {s:'EGPRO',n:'EG Pro Enerji'},{s:'EGEEN',n:'Ege Endüstri'},{s:'GUBRF',n:'Gübre Fabrikaları'},
  {s:'HEKTS',n:'Hektaş'},{s:'ISGYO',n:'İş GYO'},{s:'KARTN',n:'Kartonsan'},
  {s:'KARSN',n:'Karsan Otomotiv'},{s:'LINK',n:'Link Bilgisayar'},{s:'ORGE',n:'Orge Enerji'},
  {s:'PRKAB',n:'Türk Prysmian Kablo'},{s:'POLHO',n:'Polisan Holding'},{s:'SMART',n:'Smart Güneş'},
  {s:'TKFEN',n:'Tekfen Holding'},{s:'TEZOL',n:'Tezol Tekstil'},{s:'USAK',n:'Uşak Seramik'},
  {s:'YATAS',n:'Yataş'},{s:'YUNSA',n:'Yünsa'},{s:'ADEL',n:'Adel Kalemcilik'},
  {s:'BAGFS',n:'Bagfaş Gübre'},{s:'BOSSA',n:'Bossa'},{s:'CANTE',n:'Çan Tekstil'},
  {s:'ERBOS',n:'Erbosan'},{s:'GSDHO',n:'GSD Holding'},{s:'KLNMA',n:'Kalınma Bank'},
  {s:'MNDRS',n:'Menderes Tekstil'},{s:'NTHOL',n:'Net Holding'},{s:'PENGD',n:'Penguen Gıda'},
  {s:'TATGD',n:'Tat Gıda'},{s:'ISDMR',n:'İskenderun Demir Çelik'},{s:'TURSG',n:'Türkiye Sigorta'}
];

// Türkçe normalize — önce karakter replace, sonra toUpperCase (locale-bağımsız)
function norm(s) {
  return (s || '')
    .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
    .replace(/ü/g, 'u').replace(/Ü/g, 'U')
    .replace(/ş/g, 's').replace(/Ş/g, 'S')
    .replace(/ı/g, 'i').replace(/İ/g, 'I')
    .replace(/ö/g, 'o').replace(/Ö/g, 'O')
    .replace(/ç/g, 'c').replace(/Ç/g, 'C')
    .toUpperCase();
}

// TV exchange mapping
var TV_EX = {bist:'BIST', nasdaq:'NASDAQ', sp500:'', dax:'XETR', lse:'LSE', nikkei:'TSE'};
var TV_MARKET = {sp500:'america', nasdaq:'america'};

// ── DROPDOWN ──
function showDd(items) {
  var dd = document.getElementById('dd-list');
  var card = document.getElementById('search-card');
  dd.innerHTML = '';
  if (!items.length) { dd.classList.remove('open'); card.classList.remove('open'); return; }
  items.forEach(function(item) {
    var div = document.createElement('div');
    div.className = 'dd-item';
    div.innerHTML = '<span class="dd-sym">' + esc(item.s) + '</span>'
      + '<span class="dd-name">' + esc(item.n) + '</span>';
    div.addEventListener('mousedown', function(e) {
      e.preventDefault();
      pickItem(item.s, item.n);
    });
    dd.appendChild(div);
  });
  dd.classList.add('open');
  card.classList.add('open');
}

function hideDd() {
  document.getElementById('dd-list').classList.remove('open');
  document.getElementById('search-card').classList.remove('open');
}

function esc(s) {
  return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// Kullanıcı listeden bir item seçti
function pickItem(sym, name) {
  _chosen = sym;
  document.getElementById('sym-input').value = sym + (name ? '  —  ' + name : '');
  hideDd();
  navigate(sym);
}

// ── NAVIGATE ──
function navigate(sym) {
  var dest = 'profile.html?sym=' + encodeURIComponent(sym)
    + '&ex=' + encodeURIComponent(_ex) + '&from=analiz';
  _showDisclaimer(function() { window.location.href = dest; });
}

// ── SEARCH INPUT ──
function onSearchInput() {
  _chosen = null;   // her yazışta seçim sıfırla
  var q = document.getElementById('sym-input').value.trim();
  if (!q) { hideDd(); return; }

  if (_ex === 'bist') {
    var qn = norm(q);
    // 1) Anlık lokal sonuç — gecikme yok
    var localRes = BIST.filter(function(x) {
      return norm(x.s).indexOf(qn) === 0 || norm(x.n).indexOf(qn) !== -1;
    }).slice(0, 10);
    showDd(localRes.length ? localRes : [{s:'...', n:'Aranıyor...'}]);
    // 2) TV API ile tüm BIST'i tara, lokal ile merge et
    clearTimeout(_searchTimer);
    _searchTimer = setTimeout(function() { tvSearchMerge(q, localRes); }, 350);
  } else {
    clearTimeout(_searchTimer);
    showDd([{s:'...', n:'Aranıyor...'}]);
    _searchTimer = setTimeout(function() { tvSearch(q); }, 350);
  }
}

// BIST hybrid: lokal + TV API merge
function tvSearchMerge(q, localRes) {
  var url = 'https://symbol-search.tradingview.com/symbol_search/v3/'
    + '?text=' + encodeURIComponent(q) + '&type=stock&exchange=BIST&lang=en&domain=production';
  var localSyms = {};
  localRes.forEach(function(x) { localSyms[x.s] = true; });
  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var tvList = (data.symbols || data || [])
        .filter(function(x) { return x.symbol && !localSyms[x.s]; })
        .map(function(x) { return {s: x.symbol, n: x.description || x.symbol}; });
      var merged = localRes.concat(tvList).slice(0, 10);
      if (merged.length) showDd(merged);
      else hideDd();
    })
    .catch(function() { if (!localRes.length) hideDd(); });
}

function tvSearch(q) {
  var ex = TV_EX[_ex] || '';
  var market = (TV_MARKET && TV_MARKET[_ex]) || '';
  var url = 'https://symbol-search.tradingview.com/symbol_search/v3/'
    + '?text=' + encodeURIComponent(q) + '&type=stock'
    + (ex ? '&exchange=' + ex : '')
    + (market ? '&market=' + market : '')
    + '&lang=en&domain=production';
  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var list = (data.symbols || data || [])
        .filter(function(x) { return x.symbol; })
        .slice(0, 10)
        .map(function(x) { return {s: x.symbol, n: x.description || x.symbol}; });
      if (list.length) showDd(list); else hideDd();
    })
    .catch(function() { hideDd(); });
}

// ── KEYBOARD ──
function onSearchKey(e) {
  var dd = document.getElementById('dd-list');
  var items = dd.querySelectorAll('.dd-item');
  var active = dd.querySelector('.dd-item.active');
  var idx = -1;
  items.forEach(function(el, i) { if (el === active) idx = i; });

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    var next = idx < items.length - 1 ? idx + 1 : 0;
    items.forEach(function(el) { el.classList.remove('active'); });
    if (items[next]) items[next].classList.add('active');
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    var prev = idx > 0 ? idx - 1 : items.length - 1;
    items.forEach(function(el) { el.classList.remove('active'); });
    if (items[prev]) items[prev].classList.add('active');
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (active && active.dataset && !active.querySelector('.dd-sym').textContent.startsWith('...')) {
      active.dispatchEvent(new MouseEvent('mousedown'));
    } else if (!active && dd.classList.contains('open')) {
      // İlk öğeyi seç
      var first = dd.querySelector('.dd-item');
      if (first && !first.querySelector('.dd-sym').textContent.startsWith('...')) {
        first.dispatchEvent(new MouseEvent('mousedown'));
      }
    }
    // Seçim yoksa hiçbir şey yapma
  } else if (e.key === 'Escape') {
    hideDd();
  }
}

// ── BUTTON ──
function onSearchBtn() {
  if (_chosen) {
    navigate(_chosen);
  } else {
    // Dropdown açıksa ilk öğeyi seç
    var dd = document.getElementById('dd-list');
    var first = dd.querySelector('.dd-item');
    if (dd.classList.contains('open') && first
        && !first.querySelector('.dd-sym').textContent.startsWith('...')) {
      first.dispatchEvent(new MouseEvent('mousedown'));
    } else if (!dd.classList.contains('open')) {
      // Dropdown kapalı → arama başlat
      onSearchInput();
    }
    // Seçim zorunlu — hiçbir şey yapma
  }
}

// ── EXCHANGE ──
function setEx(el) {
  document.querySelectorAll('.ex-chip').forEach(function(c) { c.classList.remove('on'); });
  el.classList.add('on');
  _ex = el.dataset.ex;
  var flag = document.getElementById('ex-flag');
  var label = document.getElementById('ex-label');
  if (flag) flag.src = 'https://flagcdn.com/' + el.dataset.flag + '.svg';
  if (label) label.textContent = el.dataset.label;
  _chosen = null;
  document.getElementById('sym-input').value = '';
  hideDd();
}

function cycleEx() {
  var chips = Array.from(document.querySelectorAll('.ex-chip'));
  var idx = chips.findIndex(function(c) { return c.classList.contains('on'); });
  setEx(chips[(idx + 1) % chips.length]);
}

// ── POPULAR CHIPS ──
function goSym(sym, ex) {
  var chip = document.querySelector('.ex-chip[data-ex="' + ex + '"]');
  if (chip) setEx(chip);
  _chosen = sym;
  navigate(sym);
}

// ── DISCLAIMER ──
function _showDisclaimer(onAccept) {
  if (localStorage.getItem('df_disclaimer_v2')) { if (onAccept) onAccept(); return; }
  var modal = document.getElementById('disclaimerModal');
  if (!modal) { document.addEventListener('DOMContentLoaded', function(){ _showDisclaimer(onAccept); }); return; }
  modal.classList.add('open');
  var btn = document.getElementById('disclaimerBtn');
  var cd  = document.getElementById('disclaimerCountdown');
  var secs = 5;
  btn.disabled = true; btn.style.cursor = 'not-allowed';
  btn.style.cssText += ';background:#1a1a1a;border:1px solid #333;color:#555;';
  if (_disclaimerTimer) clearInterval(_disclaimerTimer);
  _disclaimerTimer = setInterval(function() {
    secs--;
    if (cd) cd.textContent = '(' + secs + ')';
    if (secs <= 0) {
      clearInterval(_disclaimerTimer);
      btn.disabled = false; btn.style.cursor = 'pointer';
      btn.style.cssText += ';background:#3b82f6;border-color:transparent;color:#fff;';
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

// ── INIT ──
function openInfo(){ var m=document.getElementById('infoModal'); if(m) m.classList.add('open'); }
function closeInfo(){ var m=document.getElementById('infoModal'); if(m) m.classList.remove('open'); }
function openSupport(){ var m=document.getElementById('supportModal'); if(m) m.classList.add('open'); }
function closeSupport(){ var m=document.getElementById('supportModal'); if(m) m.classList.remove('open'); }
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

document.addEventListener('DOMContentLoaded', function() {
  // Dışarı tıklayınca dropdown kapat
  document.addEventListener('click', function(e) {
    if (!e.target.closest('#search-wrap')) hideDd();
  });

  // URL'de sym varsa direkt git
  var params = new URLSearchParams(window.location.search);
  var sym = params.get('sym'), ex = params.get('ex');
  if (sym) {
    if (ex) { var chip = document.querySelector('.ex-chip[data-ex="' + ex + '"]'); if (chip) setEx(chip); }
    goSym(sym, ex || 'bist');
    return;
  }
  _showDisclaimer(null);
});
