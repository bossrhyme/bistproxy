
// ── STATE ──
var _ex = 'bist';
var _chosen = null;
var _searchTimer = null;
var _disclaimerTimer = null;
var _symCache   = {};   // {exchange: [{s,n},...]}
var _symLoading = {};   // {exchange: [callbacks]} — in-flight fetch takibi

// ── Türkçe normalize — locale-bağımsız ──
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

// ── Sembol listesini yükle — tek fetch, callback kuyruğu ──
function loadSymbolList(ex, onReady) {
  if (_symCache[ex]) { if (onReady) onReady(_symCache[ex]); return; }
  // Fetch zaten in-flight → callback'i kuyruğa ekle
  if (_symLoading[ex]) { if (onReady) _symLoading[ex].push(onReady); return; }
  _symLoading[ex] = onReady ? [onReady] : [];
  fetch('/api/symbol-list?exchange=' + encodeURIComponent(ex))
    .then(function(r) { return r.json(); })
    .then(function(data) {
      _symCache[ex] = data.symbols || [];
      var cbs = _symLoading[ex]; delete _symLoading[ex];
      cbs.forEach(function(cb) { cb(_symCache[ex]); });
    })
    .catch(function() {
      _symCache[ex] = [];
      var cbs = _symLoading[ex]; delete _symLoading[ex];
      cbs.forEach(function(cb) { cb([]); });
    });
}

// ── DROPDOWN ──
function showDd(items) {
  var dd   = document.getElementById('dd-list');
  var card = document.getElementById('search-card');
  dd.innerHTML = '';
  if (!items.length) { dd.classList.remove('open'); card.classList.remove('open'); return; }
  items.forEach(function(item) {
    var div = document.createElement('div');
    div.className = 'dd-item';
    div.innerHTML = '<span class="dd-sym">' + esc(item.s) + '</span>'
      + '<span class="dd-name">' + esc(item.n) + '</span>';
    div.addEventListener('mousedown', function(e) { e.preventDefault(); pickItem(item.s, item.n); });
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

// ── Listeden seçim ──
function pickItem(sym, name) {
  _chosen = sym;
  document.getElementById('sym-input').value = sym + (name ? '  —  ' + name : '');
  hideDd();
  navigate(sym);
}

// ── Navigate ──
function navigate(sym) {
  var dest = 'profile.html?sym=' + encodeURIComponent(sym)
    + '&ex=' + encodeURIComponent(_ex) + '&from=analiz';
  _showDisclaimer(function() { window.location.href = dest; });
}

// ── Arama — tüm hisseler anlık filtreleme ──
function onSearchInput() {
  _chosen = null;
  var q = document.getElementById('sym-input').value.trim();
  if (!q) { hideDd(); return; }
  var qn = norm(q);

  var list = _symCache[_ex];
  if (list) {
    _doSearch(list, qn);
  } else {
    showDd([{s:'...', n:'Yükleniyor...'}]);
    loadSymbolList(_ex, function(loaded) {
      // Callback gelince input'u tekrar oku — stale qn'i engelle
      var cur = norm(document.getElementById('sym-input').value.trim());
      if (cur) _doSearch(loaded, cur);
    });
  }
}

function _doSearch(list, qn) {
  if (!qn) { hideDd(); return; }
  var symStart = []; // sembol tam başından eşleşme — en önce
  var symAny   = []; // sembol içinde geçiyor
  var nameAny  = []; // şirket adında geçiyor
  for (var i = 0; i < list.length; i++) {
    var x  = list[i];
    var ns = norm(x.s);
    var nn = norm(x.n);
    if (ns.indexOf(qn) === 0)        symStart.push(x);
    else if (ns.indexOf(qn) !== -1)  symAny.push(x);
    else if (nn.indexOf(qn) !== -1)  nameAny.push(x);
    // Erken çıkış YOK — tüm liste taranır (559 item ~1ms)
  }
  var res = symStart.concat(symAny).concat(nameAny).slice(0, 10);
  if (res.length) showDd(res); else hideDd();
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
  // Exchange listeyi önceden yükle (kullanıcı yazmaya başlayınca hazır olsun)
  loadSymbolList(_ex);
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
  // Varsayılan exchange sembol listesini arka planda yükle
  loadSymbolList(_ex);

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
