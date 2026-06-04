// DeepFin — Profil Sayfası
(function() {
'use strict';

var _user = null;
var _lists = [];
var _activeListId = null;

// ── Başlat ───────────────────────────────────────────────────
async function init() {
  try {
    var r = await fetch('/api/auth/me');
    var d = await r.json();
    if (d.user) {
      _user = d.user;
      showUser();
      await loadWatchlists();
    } else {
      showLogin();
    }
  } catch(e) {
    showLogin();
  }
}

function showLogin() {
  document.getElementById('pf-loading').style.display = 'none';
  document.getElementById('pf-login').style.display = 'block';
}

function showUser() {
  document.getElementById('pf-loading').style.display = 'none';
  document.getElementById('pf-user').style.display = 'block';
  document.getElementById('pf-name').textContent = _user.name || _user.email;
  document.getElementById('pf-email').textContent = _user.email;
  var wrap = document.getElementById('pf-avatar-wrap');
  if (_user.picture) {
    wrap.innerHTML = '<img src="' + _user.picture + '" alt="avatar" onerror="this.style.display=\'none\'">';
  } else {
    document.getElementById('pf-initials').textContent = (_user.name || _user.email || '?')[0].toUpperCase();
  }
}

// ── Watchlistler ─────────────────────────────────────────────
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
    return '<button class="pf-list-tab' + (l.id === _activeListId ? ' active' : '') + '" onclick="switchList(\'' + l.id + '\')">' + esc(l.icon || '⭐') + ' ' + esc(l.name) + '</button>';
  }).join('') + '<button class="pf-new-list-btn" onclick="openModal()">+ Yeni Liste</button>';
}

function switchList(id) {
  _activeListId = id;
  renderTabs();
  renderListPanel();
}

function renderListPanel() {
  var list = _lists.find(function(l) { return l.id === _activeListId; });
  var panel = document.getElementById('pf-list-panel');
  if (!list) { panel.innerHTML = '<div class="pf-empty">Liste bulunamadı.</div>'; return; }

  var items = list.items || [];
  var rows = items.map(function(item, idx) {
    return '<tr>' +
      '<td><span class="pf-sym">' + esc(item.symbol) + '</span></td>' +
      '<td><span class="pf-ex-badge">' + esc(item.exchange) + '</span></td>' +
      '<td style="color:var(--muted2);font-size:11px;">' + formatDate(item.addedAt) + '</td>' +
      '<td><input class="pf-note-input" value="' + esc(item.note || '') + '" placeholder="Not ekle..." onblur="saveNote(\'' + list.id + '\',\'' + esc(item.symbol) + '\',this.value)"></td>' +
      '<td><button class="pf-remove-btn" onclick="removeItem(\'' + list.id + '\',\'' + esc(item.symbol) + '\')" title="Listeden çıkar">×</button></td>' +
    '</tr>';
  }).join('');

  var canDelete = _lists.length > 1;
  var scanUrl = '/?wl=' + encodeURIComponent(list.id);

  panel.innerHTML =
    '<div class="pf-list-header">' +
      '<input class="pf-list-name-input" value="' + esc(list.name) + '" onblur="renameList(\'' + list.id + '\',this.value)" maxlength="40">' +
      '<a href="' + scanUrl + '" class="pf-scan-btn">↗ Bu Listeyle Tara</a>' +
      (canDelete ? '<button class="pf-list-del-btn" onclick="deleteList(\'' + list.id + '\')">Sil</button>' : '') +
    '</div>' +
    '<table class="pf-stock-table">' +
      '<thead><tr><th>Sembol</th><th>Borsa</th><th>Ekleme</th><th>Not</th><th></th></tr></thead>' +
      '<tbody>' + (rows || '<tr><td colspan="5"><div class="pf-empty">Liste boş — aşağıdan hisse ekle.</div></td></tr>') + '</tbody>' +
    '</table>' +
    '<div class="pf-add-form">' +
      '<input type="text" id="pf-add-sym" placeholder="Sembol (örn. THYAO)" style="text-transform:uppercase" maxlength="20" onkeydown="if(event.key===\'Enter\')addItem()">' +
      '<select id="pf-add-ex">' +
        '<option value="bist">BIST</option>' +
        '<option value="nasdaq">NASDAQ</option>' +
        '<option value="sp500">S&P 500</option>' +
        '<option value="nyse">NYSE</option>' +
        '<option value="dax">DAX</option>' +
        '<option value="lse">LSE</option>' +
        '<option value="nikkei">Nikkei</option>' +
      '</select>' +
      '<button class="pf-add-btn" id="pf-add-btn" onclick="addItem()">+ Ekle</button>' +
    '</div>';
}

// ── CRUD ─────────────────────────────────────────────────────
window.addItem = async function() {
  var sym = (document.getElementById('pf-add-sym').value || '').trim().toUpperCase();
  var ex  = document.getElementById('pf-add-ex').value;
  if (!sym) return;
  var btn = document.getElementById('pf-add-btn');
  btn.disabled = true;
  try {
    var r = await fetch('/api/watchlists/item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listId: _activeListId, symbol: sym, exchange: ex })
    });
    var d = await r.json();
    if (d.watchlists) {
      _lists = d.watchlists;
      document.getElementById('pf-add-sym').value = '';
      renderTabs(); renderListPanel();
      toast('✓ ' + sym + ' eklendi');
    }
  } catch(e) { toast('Hata oluştu'); }
  btn.disabled = false;
};

window.removeItem = async function(listId, symbol) {
  try {
    var r = await fetch('/api/watchlists/item', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listId: listId, symbol: symbol })
    });
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
  try {
    await fetch('/api/watchlists', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: listId, items: list.items })
    });
  } catch(e) {}
};

window.renameList = async function(listId, name) {
  name = (name || '').trim();
  if (!name) return;
  var list = _lists.find(function(l) { return l.id === listId; });
  if (!list || list.name === name) return;
  try {
    var r = await fetch('/api/watchlists', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: listId, name: name })
    });
    var d = await r.json();
    if (d.watchlists) { _lists = d.watchlists; renderTabs(); }
  } catch(e) {}
};

window.deleteList = async function(listId) {
  if (!confirm('Bu listeyi silmek istediğine emin misin?')) return;
  try {
    var r = await fetch('/api/watchlists', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: listId })
    });
    var d = await r.json();
    if (d.watchlists) {
      _lists = d.watchlists;
      _activeListId = _lists[0] ? _lists[0].id : null;
      renderTabs(); renderListPanel();
      toast('Liste silindi');
    }
  } catch(e) {}
};

// ── Modal (yeni liste) ───────────────────────────────────────
window.openModal = function() {
  document.getElementById('pf-modal-bg').style.display = 'flex';
  document.getElementById('pf-modal-input').value = '';
  document.getElementById('pf-modal-input').focus();
};
window.closeModal = function() {
  document.getElementById('pf-modal-bg').style.display = 'none';
};
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeModal();
});

window.createList = async function() {
  var name = (document.getElementById('pf-modal-input').value || '').trim();
  if (!name) return;
  closeModal();
  try {
    var r = await fetch('/api/watchlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name })
    });
    var d = await r.json();
    if (d.watchlists) {
      _lists = d.watchlists;
      _activeListId = _lists[_lists.length - 1].id;
      renderTabs(); renderListPanel();
      toast('✓ "' + name + '" listesi oluşturuldu');
    }
  } catch(e) {}
};

// ── Helpers ──────────────────────────────────────────────────
function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function formatDate(ts) {
  if (!ts) return '—';
  var d = new Date(ts);
  return d.toLocaleDateString('tr-TR', { day:'2-digit', month:'short', year:'numeric' });
}
function toast(msg) {
  var el = document.getElementById('pf-toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(function() { el.classList.remove('show'); }, 2200);
}

window.switchList = switchList;

// ── Auth ─────────────────────────────────────
var _authMode = 'login';

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
  btn.disabled = true;
  btn.textContent = _authMode === 'login' ? 'Giriş yapılıyor...' : 'Kaydediliyor...';

  var endpoint = _authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
  var body = { email: email, password: password };
  if (_authMode === 'register' && name) body.name = name;

  try {
    var r = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    var d = await r.json();
    if (d.user) {
      _user = d.user;
      document.getElementById('pf-login').style.display = 'none';
      showUser();
      await loadWatchlists();
    } else {
      errEl.textContent = d.error || 'Hata oluştu.';
      btn.disabled = false;
      btn.textContent = _authMode === 'login' ? 'Giriş Yap' : 'Kayıt Ol';
    }
  } catch(err) {
    errEl.textContent = 'Bağlantı hatası. Tekrar deneyin.';
    btn.disabled = false;
    btn.textContent = _authMode === 'login' ? 'Giriş Yap' : 'Kayıt Ol';
  }
};

init();
})();
