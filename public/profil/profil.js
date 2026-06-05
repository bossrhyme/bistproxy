// DeepFin — Profil Sayfası
(function() {
'use strict';

var _user         = null;
var _lists        = [];
var _activeListId = null;
var _portfolio    = [];
var _authMode     = 'login';
var _acEl         = null;
var _acTimer      = null;
var _acActive     = null; // { input, onSelect }

// ── Başlat ───────────────────────────────────
async function init() {
  try {
    var r = await fetch('/api/auth/me');
    var d = await r.json();
    if (d.user) {
      _user = d.user;
      showUser();
      await Promise.all([loadWatchlists(), loadPortfolio()]);
    } else {
      showLogin();
    }
  } catch(e) { showLogin(); }
}

function showLogin() {
  document.getElementById('pf-loading').style.display = 'none';
  document.getElementById('pf-login').style.display   = 'block';
}

function showUser() {
  document.getElementById('pf-loading').style.display = 'none';
  document.getElementById('pf-user').style.display    = 'block';
  document.getElementById('pf-name').textContent      = _user.name || _user.email;
  document.getElementById('pf-email').textContent     = _user.email;
  var nameInp = document.getElementById('pf-name-input');
  if (nameInp) nameInp.value = _user.name || '';
  var wrap = document.getElementById('pf-avatar-wrap');
  if (_user.picture) {
    wrap.innerHTML = '<img src="' + _user.picture + '" alt="avatar" onerror="this.style.display=\'none\'">';
  } else {
    var ini = document.getElementById('pf-initials');
    if (ini) ini.textContent = (_user.name || _user.email || '?')[0].toUpperCase();
  }
}

// ── Watchlistler ──────────────────────────────
async function loadWatchlists() {
  try {
    var r = await fetch('/api/watchlists');
    if (!r.ok) return;
    var d = await r.json();
    _lists = d.watchlists || [];
    if (_lists.length && !_activeListId) _activeListId = _lists[0].id;
    renderTabs();
    renderListPanel();
  } catch(e) {}
}

function renderTabs() {
  var tabs = document.getElementById('pf-list-tabs');
  tabs.innerHTML = _lists.map(function(l) {
    return '<button class="pf-list-tab' + (l.id === _activeListId ? ' active' : '') +
      '" onclick="switchList(\'' + l.id + '\')">' + esc(l.icon || '⭐') + ' ' + esc(l.name) + '</button>';
  }).join('') + '<button class="pf-new-list-btn" onclick="openModal()">+ Yeni</button>';
}

window.switchList = function(id) {
  _activeListId = id; renderTabs(); renderListPanel();
};

function exOpts() {
  return ['bist:BIST','nasdaq:NASDAQ','sp500:S&P 500','nyse:NYSE','dax:DAX','lse:LSE','nikkei:Nikkei']
    .map(function(s) { var p = s.split(':'); return '<option value="' + p[0] + '">' + p[1] + '</option>'; }).join('');
}

function renderListPanel() {
  var list  = _lists.find(function(l) { return l.id === _activeListId; });
  var panel = document.getElementById('pf-list-panel');
  if (!list) { panel.innerHTML = '<div class="pf-empty">Liste bulunamadı.</div>'; return; }

  var items    = list.items || [];
  var canDel   = _lists.length > 1;
  var scanUrl  = '/?wl=' + encodeURIComponent(list.id);

  var rows = items.map(function(item) {
    var sym = esc(item.symbol);
    return '<tr>' +
      '<td><span class="pf-sym">' + sym + '</span></td>' +
      '<td><span class="pf-ex-badge">' + esc(item.exchange) + '</span></td>' +
      '<td class="pf-price-cell" id="wlp-' + sym + '">—</td>' +
      '<td class="pf-chg-cell"   id="wlc-' + sym + '">—</td>' +
      '<td style="color:var(--muted2);font-size:11px;">' + formatDate(item.addedAt) + '</td>' +
      '<td><input class="pf-note-input" value="' + esc(item.note || '') +
        '" placeholder="Not..." onblur="saveNote(\'' + list.id + '\',\'' + sym + '\',this.value)"></td>' +
      '<td><button class="pf-remove-btn" onclick="removeItem(\'' + list.id + '\',\'' + sym + '\')" title="Çıkar">×</button></td>' +
    '</tr>';
  }).join('');

  panel.innerHTML =
    '<div class="pf-list-header">' +
      '<input class="pf-list-name-input" value="' + esc(list.name) +
        '" onblur="renameList(\'' + list.id + '\',this.value)" maxlength="40">' +
      '<a href="' + scanUrl + '" class="pf-scan-btn">↗ Tara</a>' +
      (canDel ? '<button class="pf-list-del-btn" onclick="deleteList(\'' + list.id + '\')">Sil</button>' : '') +
    '</div>' +
    '<table class="pf-stock-table"><thead><tr>' +
      '<th>Sembol</th><th>Borsa</th><th>Fiyat</th><th>Değ%</th><th>Ekleme</th><th>Not</th><th></th>' +
    '</tr></thead><tbody>' +
      (rows || '<tr><td colspan="7"><div class="pf-empty">Liste boş — aşağıdan hisse ekle.</div></td></tr>') +
    '</tbody></table>' +
    '<div class="pf-add-form">' +
      '<button class="pf-add-btn" onclick="openSymPicker()">🔍 Hisse Ekle</button>' +
    '</div>';

  if (items.length) fetchWatchlistPrices(items);
}

// ── Fiyat çekme ───────────────────────────────
async function fetchPrice(symbol, exchange) {
  try {
    var r, d;
    if (exchange === 'bist') {
      r = await fetch('/api/bist-quote?symbol=' + encodeURIComponent(symbol));
      if (!r.ok) return null;
      d = await r.json();
      return d.price != null ? { price: d.price, changePct: d.change_pct } : null;
    } else {
      r = await fetch('/api/quote?sym=' + encodeURIComponent(symbol) + '&ex=' + encodeURIComponent(exchange));
      if (!r.ok) return null;
      d = await r.json();
      return d.price != null ? { price: d.price, changePct: d.changePct } : null;
    }
  } catch(e) { return null; }
}

async function batchFetch(items, onResult) {
  var chunks = [];
  for (var i = 0; i < items.length; i += 4) chunks.push(items.slice(i, i + 4));
  for (var ci = 0; ci < chunks.length; ci++) {
    await Promise.all(chunks[ci].map(function(item) {
      return fetchPrice(item.symbol, item.exchange).then(function(data) { if (data) onResult(item, data); });
    }));
  }
}

async function fetchWatchlistPrices(items) {
  await batchFetch(items, function(item, data) {
    var sym = esc(item.symbol);
    var pe = document.getElementById('wlp-' + sym);
    var ce = document.getElementById('wlc-' + sym);
    if (pe) pe.textContent = fmtPrice(data.price);
    if (ce) {
      ce.textContent = fmtChg(data.changePct);
      ce.className   = 'pf-chg-cell ' + (data.changePct >= 0 ? 'pf-up' : 'pf-dn');
    }
  });
}

// ── Autocomplete (portföy için) ───────────────
function getACEl() {
  if (!_acEl) {
    _acEl = document.createElement('div');
    _acEl.className = 'pf-ac-dropdown';
    _acEl.style.display = 'none';
    document.body.appendChild(_acEl);
  }
  return _acEl;
}

window.onSymInput = function(input, exId, onSelectFn) {
  _acActive = { input: input, exId: exId, onSelect: onSelectFn };
  clearTimeout(_acTimer);
  var q = (input.value || '').trim();
  if (q.length < 1) { clearAC(); return; }
  _acTimer = setTimeout(function() {
    var ex = (document.getElementById(exId) || {}).value || 'bist';
    fetch('/api/symbol-search?q=' + encodeURIComponent(q) + '&exchange=' + ex)
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (!_acActive || _acActive.input !== input) return;
        showACDropdown(d.symbols || [], input);
      }).catch(function() {});
  }, 280);
};

function showACDropdown(symbols, input) {
  var el = getACEl();
  if (!symbols.length) { el.style.display = 'none'; return; }
  var rect = input.getBoundingClientRect();
  el.style.cssText = 'display:block;left:' + rect.left + 'px;top:' + (rect.bottom + 2) + 'px;width:' + Math.max(200, rect.width) + 'px;';
  el.innerHTML = symbols.map(function(s) {
    return '<div class="pf-ac-item" onmousedown="pickAC(\'' + esc(s.s) + '\',\'' + esc(s.ex || '') + '\')">' +
      '<span class="pf-ac-sym">' + esc(s.s) + '</span>' +
      '<span class="pf-ac-name">' + esc(s.n) + '</span></div>';
  }).join('');
}

window.pickAC = function(sym, ex) {
  if (_acActive) {
    _acActive.input.value = sym;
    if (_acActive.onSelect) _acActive.onSelect(sym, ex);
  }
  clearAC();
};
window.clearAC = function() {
  var el = getACEl(); el.style.display = 'none'; _acActive = null;
};
window.delayHideAC = function() { setTimeout(clearAC, 180); };
document.addEventListener('click', function(e) {
  if (_acEl && !_acEl.contains(e.target)) clearAC();
});

// ── Watchlist CRUD ────────────────────────────
window.addItem = async function() {
  var sym = (document.getElementById('pf-add-sym').value || '').trim().toUpperCase();
  var ex  = document.getElementById('pf-add-ex').value;
  if (!sym) return; clearAC();
  var btn = document.getElementById('pf-add-btn'); btn.disabled = true;
  try {
    var r = await fetch('/api/watchlists/item', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ listId: _activeListId, symbol: sym, exchange: ex }) });
    var d = await r.json();
    if (d.watchlists) { _lists = d.watchlists; document.getElementById('pf-add-sym').value = ''; renderTabs(); renderListPanel(); toast('✓ ' + sym + ' eklendi'); }
  } catch(e) { toast('Hata oluştu'); }
  btn.disabled = false;
};

window.removeItem = async function(listId, symbol) {
  try {
    var r = await fetch('/api/watchlists/item', { method:'DELETE', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ listId: listId, symbol: symbol }) });
    var d = await r.json();
    if (d.watchlists) { _lists = d.watchlists; renderTabs(); renderListPanel(); toast('✕ ' + symbol + ' çıkarıldı'); }
  } catch(e) {}
};

window.saveNote = async function(listId, symbol, note) {
  var list = _lists.find(function(l) { return l.id === listId; });
  if (!list) return;
  var item = list.items.find(function(i) { return i.symbol === symbol; });
  if (!item || item.note === note) return;
  item.note = note;
  try { await fetch('/api/watchlists', { method:'PUT', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ id: listId, items: list.items }) }); } catch(e) {}
};

window.renameList = async function(listId, name) {
  name = (name || '').trim();
  if (!name) return;
  var list = _lists.find(function(l) { return l.id === listId; });
  if (!list || list.name === name) return;
  try {
    var r = await fetch('/api/watchlists', { method:'PUT', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ id: listId, name: name }) });
    var d = await r.json();
    if (d.watchlists) { _lists = d.watchlists; renderTabs(); }
  } catch(e) {}
};

window.deleteList = async function(listId) {
  if (!confirm('Bu listeyi silmek istediğine emin misin?')) return;
  try {
    var r = await fetch('/api/watchlists', { method:'DELETE', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ id: listId }) });
    var d = await r.json();
    if (d.watchlists) { _lists = d.watchlists; _activeListId = _lists[0] ? _lists[0].id : null; renderTabs(); renderListPanel(); toast('Liste silindi'); }
  } catch(e) {}
};

// ── Yeni Liste Modal ───────────────────────────
window.openModal  = function() { document.getElementById('pf-modal-bg').style.display='flex'; document.getElementById('pf-modal-input').value=''; document.getElementById('pf-modal-input').focus(); };
window.closeModal = function() { document.getElementById('pf-modal-bg').style.display='none'; };

// ── Hisse Picker Modal ────────────────────────
var _spTimer = null;

window.openSymPicker = function() {
  var bg = document.getElementById('pf-sym-picker-bg');
  bg.style.display = 'flex';
  var inp = document.getElementById('pf-sym-search');
  inp.value = '';
  document.getElementById('pf-sym-results').innerHTML = '<div class="pf-empty">Aramak için yazmaya başlayın…</div>';
  setTimeout(function() { inp.focus(); }, 50);
};

window.closeSymPicker = function() {
  document.getElementById('pf-sym-picker-bg').style.display = 'none';
  clearTimeout(_spTimer);
};

window.onSymSearch = function(input) {
  clearTimeout(_spTimer);
  var q = input.value.trim();
  if (!q) {
    document.getElementById('pf-sym-results').innerHTML = '<div class="pf-empty">Aramak için yazmaya başlayın…</div>';
    return;
  }
  document.getElementById('pf-sym-results').innerHTML = '<div class="pf-empty pf-sp-loading">Aranıyor…</div>';
  _spTimer = setTimeout(function() {
    var ex = document.getElementById('pf-sym-ex').value;
    fetch('/api/symbol-search?q=' + encodeURIComponent(q) + '&exchange=' + ex)
      .then(function(r) { return r.json(); })
      .then(function(d) { renderSymResults(d.symbols || [], ex); })
      .catch(function() {
        document.getElementById('pf-sym-results').innerHTML = '<div class="pf-empty">Hata oluştu</div>';
      });
  }, 280);
};

function renderSymResults(symbols, ex) {
  var el = document.getElementById('pf-sym-results');
  if (!symbols.length) { el.innerHTML = '<div class="pf-empty">Sonuç bulunamadı</div>'; return; }
  el.innerHTML = symbols.map(function(s) {
    var symEx = s.ex || ex;
    return '<div class="pf-sp-row" onclick="addFromPicker(\'' + esc(s.s) + '\',\'' + esc(symEx) + '\')">' +
      '<span class="pf-sym">' + esc(s.s) + '</span>' +
      '<span class="pf-sp-name">' + esc(s.n || '') + '</span>' +
      '<span class="pf-ex-badge">' + esc(symEx) + '</span>' +
      '<span class="pf-sp-add">+ Ekle</span>' +
    '</div>';
  }).join('');
}

window.addFromPicker = async function(sym, ex) {
  closeSymPicker();
  try {
    var r = await fetch('/api/watchlists/item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listId: _activeListId, symbol: sym, exchange: ex })
    });
    var d = await r.json();
    if (d.watchlists) { _lists = d.watchlists; renderTabs(); renderListPanel(); toast('✓ ' + sym + ' eklendi'); }
    else if (d.error) toast('Hata: ' + d.error);
  } catch(e) { toast('Bağlantı hatası'); }
};

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') { closeModal(); closeSymPicker(); }
});

window.createList = async function() {
  var name = (document.getElementById('pf-modal-input').value || '').trim();
  if (!name) return; closeModal();
  try {
    var r = await fetch('/api/watchlists', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ name: name }) });
    var d = await r.json();
    if (d.watchlists) { _lists = d.watchlists; _activeListId = _lists[_lists.length-1].id; renderTabs(); renderListPanel(); toast('✓ "' + name + '" oluşturuldu'); }
  } catch(e) {}
};

// ── Portföy ───────────────────────────────────
async function loadPortfolio() {
  try {
    var r = await fetch('/api/portfolio');
    if (!r.ok) return;
    var d = await r.json();
    _portfolio = d.positions || [];
    renderPortfolio();
  } catch(e) {}
}

function renderPortfolio() {
  var body = document.getElementById('pf-pf-body');
  if (!body) return;
  if (!_portfolio.length) {
    body.innerHTML = '<tr><td colspan="8"><div class="pf-empty">Henüz pozisyon yok — aşağıdan ekle.</div></td></tr>';
    var te = document.getElementById('pf-pf-total'); if (te) { te.textContent = ''; te.classList.remove('has-data'); }
    return;
  }
  body.innerHTML = _portfolio.map(function(pos) {
    return '<tr>' +
      '<td><span class="pf-sym">' + esc(pos.symbol) + '</span></td>' +
      '<td><span class="pf-ex-badge">' + esc(pos.exchange) + '</span></td>' +
      '<td>' + pos.quantity.toLocaleString('tr-TR') + '</td>' +
      '<td>' + fmtPrice(pos.avgCost) + '</td>' +
      '<td id="pfp-' + pos.id + '">—</td>' +
      '<td id="pfv-' + pos.id + '">—</td>' +
      '<td id="pfpnl-' + pos.id + '">—</td>' +
      '<td><button class="pf-remove-btn" onclick="removePosition(\'' + pos.id + '\')" title="Çıkar">×</button></td>' +
    '</tr>';
  }).join('');
  fetchPortfolioPrices();
}

async function fetchPortfolioPrices() {
  var total = 0, totalCost = 0;
  await batchFetch(_portfolio, function(pos, data) {
    var price = data.price;
    var value = price * pos.quantity;
    var cost  = pos.avgCost * pos.quantity;
    var pnl   = value - cost;
    var pct   = pos.avgCost > 0 ? (price / pos.avgCost - 1) * 100 : 0;
    total += value; totalCost += cost;
    var pe = document.getElementById('pfp-' + pos.id);
    var ve = document.getElementById('pfv-' + pos.id);
    var pe2= document.getElementById('pfpnl-' + pos.id);
    if (pe)  pe.textContent = fmtPrice(price);
    if (ve)  ve.textContent = fmtPrice(value);
    if (pe2) pe2.innerHTML  = '<span class="' + (pnl >= 0 ? 'pf-up' : 'pf-dn') + '">' +
      (pnl >= 0 ? '+' : '') + fmtPrice(pnl) + ' (' + (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%)</span>';
  });
  var te = document.getElementById('pf-pf-total');
  if (te && total > 0) {
    var pnlTotal = total - totalCost;
    te.innerHTML = 'Toplam: <b>' + fmtPrice(total) + '</b> <span class="' + (pnlTotal >= 0 ? 'pf-up' : 'pf-dn') + '">' +
      '(' + (pnlTotal >= 0 ? '+' : '') + fmtPrice(pnlTotal) + ')</span>';
    te.classList.add('has-data');
  }
}

window.addPosition = async function() {
  var sym  = (document.getElementById('pf-pos-sym').value  || '').trim().toUpperCase();
  var ex   =  document.getElementById('pf-pos-ex').value;
  var qty  = parseFloat(document.getElementById('pf-pos-qty').value);
  var cost = parseFloat(document.getElementById('pf-pos-cost').value);
  if (!sym || isNaN(qty) || qty <= 0 || isNaN(cost) || cost < 0) { toast('Tüm alanları doldurun'); return; }
  clearAC();
  var btn = document.getElementById('pf-pos-add-btn'); btn.disabled = true;
  try {
    var r = await fetch('/api/portfolio/item', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ symbol: sym, exchange: ex, quantity: qty, avgCost: cost }) });
    var d = await r.json();
    if (d.positions) {
      _portfolio = d.positions;
      document.getElementById('pf-pos-sym').value = '';
      document.getElementById('pf-pos-qty').value = '';
      document.getElementById('pf-pos-cost').value = '';
      renderPortfolio(); toast('✓ ' + sym + ' eklendi');
    }
  } catch(e) { toast('Hata oluştu'); }
  btn.disabled = false;
};

window.removePosition = async function(id) {
  if (!confirm('Bu pozisyonu silmek istediğine emin misin?')) return;
  try {
    var r = await fetch('/api/portfolio/item', { method:'DELETE', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ id: id }) });
    var d = await r.json();
    if (d.positions) { _portfolio = d.positions; renderPortfolio(); toast('Pozisyon silindi'); }
  } catch(e) {}
};

// ── Ayarlar ───────────────────────────────────
window.toggleSettings = function() {
  var body = document.getElementById('pf-settings-body');
  var chev = document.getElementById('pf-settings-chev');
  var open = body.style.display !== 'none';
  body.style.display  = open ? 'none' : 'block';
  if (chev) chev.textContent = open ? '▼' : '▲';
};

window.saveName = async function() {
  var name = (document.getElementById('pf-name-input').value || '').trim();
  if (!name) return;
  var btn = document.getElementById('pf-save-name-btn'); btn.disabled = true;
  try {
    var r = await fetch('/api/auth/update-profile', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ name: name }) });
    var d = await r.json();
    if (d.ok) { _user.name = d.name; document.getElementById('pf-name').textContent = d.name; toast('✓ İsim güncellendi'); }
    else toast(d.error || 'Hata oluştu');
  } catch(e) { toast('Hata oluştu'); }
  btn.disabled = false;
};

window.changePassword = async function() {
  var cur   = document.getElementById('pf-pw-cur').value;
  var nw    = document.getElementById('pf-pw-new').value;
  var conf  = document.getElementById('pf-pw-conf').value;
  var errEl = document.getElementById('pf-pw-err');
  errEl.textContent = '';
  if (!cur || !nw || !conf)  { errEl.textContent = 'Tüm alanları doldurun.'; return; }
  if (nw.length < 8)         { errEl.textContent = 'Yeni şifre en az 8 karakter.'; return; }
  if (nw !== conf)           { errEl.textContent = 'Yeni şifreler eşleşmiyor.'; return; }
  var btn = document.getElementById('pf-pw-btn'); btn.disabled = true;
  try {
    var r = await fetch('/api/auth/change-password', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ currentPassword: cur, newPassword: nw }) });
    var d = await r.json();
    if (d.ok) {
      document.getElementById('pf-pw-cur').value = '';
      document.getElementById('pf-pw-new').value = '';
      document.getElementById('pf-pw-conf').value = '';
      toast('✓ Şifre güncellendi');
    } else errEl.textContent = d.error || 'Hata oluştu';
  } catch(e) { errEl.textContent = 'Hata oluştu'; }
  btn.disabled = false;
};

// ── Auth ──────────────────────────────────────
window.toggleAuthMode = function() {
  _authMode = _authMode === 'login' ? 'register' : 'login';
  var isReg = _authMode === 'register';
  document.getElementById('pf-auth-title').textContent    = isReg ? 'Hesap Oluştur' : 'Profiline giriş yap';
  document.getElementById('pf-auth-btn').textContent      = isReg ? 'Kayıt Ol' : 'Giriş Yap';
  document.getElementById('pf-auth-name').style.display   = isReg ? 'block' : 'none';
  document.getElementById('pf-switch-text').textContent   = isReg ? 'Zaten hesabın var mı?' : 'Hesabın yok mu?';
  document.getElementById('pf-switch-btn').textContent    = isReg ? 'Giriş Yap' : 'Kayıt Ol';
  document.getElementById('pf-auth-password').setAttribute('autocomplete', isReg ? 'new-password' : 'current-password');
  document.getElementById('pf-auth-err').textContent = '';
};

window.submitAuth = async function(e) {
  if (e) e.preventDefault();
  var email    = (document.getElementById('pf-auth-email').value    || '').trim();
  var password = (document.getElementById('pf-auth-password').value || '');
  var name     = (document.getElementById('pf-auth-name').value     || '').trim();
  var errEl    = document.getElementById('pf-auth-err');
  errEl.textContent = '';
  if (!email || !password) { errEl.textContent = 'E-posta ve şifre gerekli.'; return; }
  if (_authMode === 'register' && password.length < 8) { errEl.textContent = 'Şifre en az 8 karakter olmalı.'; return; }
  var btn = document.getElementById('pf-auth-btn');
  btn.disabled = true; btn.textContent = _authMode === 'login' ? 'Giriş yapılıyor...' : 'Kaydediliyor...';
  var body = { email: email, password: password };
  if (_authMode === 'register' && name) body.name = name;
  try {
    var r = await fetch(_authMode === 'login' ? '/api/auth/login' : '/api/auth/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    var d = await r.json();
    if (d.user) {
      _user = d.user;
      document.getElementById('pf-login').style.display = 'none';
      showUser();
      await Promise.all([loadWatchlists(), loadPortfolio()]);
    } else {
      errEl.textContent = d.error || 'Hata oluştu.';
      btn.disabled = false; btn.textContent = _authMode === 'login' ? 'Giriş Yap' : 'Kayıt Ol';
    }
  } catch(err) {
    errEl.textContent = 'Bağlantı hatası.';
    btn.disabled = false; btn.textContent = _authMode === 'login' ? 'Giriş Yap' : 'Kayıt Ol';
  }
};

// ── Helpers ───────────────────────────────────
function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function formatDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('tr-TR', { day:'2-digit', month:'short', year:'numeric' });
}
function fmtPrice(v) {
  if (v == null) return '—';
  return Number(v).toLocaleString('tr-TR', { minimumFractionDigits:2, maximumFractionDigits:2 });
}
function fmtChg(v) {
  if (v == null) return '—';
  return (v >= 0 ? '+' : '') + Number(v).toFixed(2) + '%';
}
function toast(msg) {
  var el = document.getElementById('pf-toast');
  el.textContent = msg; el.classList.add('show');
  setTimeout(function() { el.classList.remove('show'); }, 2200);
}

init();
})();
