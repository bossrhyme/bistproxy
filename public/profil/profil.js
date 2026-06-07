// DeepFin — Profil Sayfası v13
(function() {
'use strict';

var _user         = null;
var _lists        = [];
var _activeListId = null;
var _authMode     = 'login';
var _acEl         = null;
var _acTimer      = null;
var _acActive     = null;

// ── Investor types ────────────────────────────
var INV_TYPES = {
  growth: {name:'Büyüme Avcısı',      color:'#f59e0b', desc:'Yüksek büyüme potansiyeli olan şirketleri hedefler.',      preset:'growth'},
  div:    {name:'Temettü Koleksiyoneri',color:'#10b981',desc:'Düzenli ve güvenilir temettü veren şirketleri tercih eder.',preset:'dividend'},
  value:  {name:'Değer Dedektifi',     color:'#6366f1', desc:'Piyasanın altında değerlenen şirketleri arar.',             preset:'value'},
  mom:    {name:'Momentum Sörfçüsü',   color:'#f97316', desc:'Yükselen trendleri yakalar ve momentum hisselerine odaklanır.',preset:'mom'},
  def:    {name:'Savunma Kalesi',      color:'#14b8a6', desc:'Düşük riskli, istikrarlı ve güçlü şirketleri tercih eder.',  preset:'def'},
  small:  {name:'Küçük Değer Keşifçisi',color:'#8b5cf6',desc:'Henüz keşfedilmemiş küçük şirketleri hedefler.',           preset:'small'},
  spec:   {name:'Spekülatif Akıncı',   color:'#ef4444', desc:'Yüksek riskli, yüksek ödüllü fırsatları agresif takip eder.',preset:'spec'},
  tech:   {name:'Teknoloji Vizyoneri', color:'#0ea5e9', desc:'İnovasyon ve teknoloji odaklı şirketlere odaklanır.',        preset:'tech'},
  bal:    {name:'Çevik Dengeleyici',   color:'#64748b', desc:'Dengeli ve çeşitlendirilmiş portföy stratejisi izler.',      preset:'bal'},
};

// ── Rank tiers ────────────────────────────────
var RANKS = [
  {tier:1, name:'Çaylak Asker',      color:'#6b7280'},
  {tier:2, name:'Nefer',             color:'#78716c'},
  {tier:3, name:'Onbaşı',            color:'#0ea5e9'},
  {tier:4, name:'Çavuş',             color:'#22c55e'},
  {tier:5, name:'Teğmen',            color:'#f59e0b'},
  {tier:6, name:'Yüzbaşı',           color:'#a855f7'},
  {tier:7, name:'Binbaşı',           color:'#f97316'},
  {tier:8, name:'Albay',             color:'#ef4444'},
  {tier:9, name:'General',           color:'#eab308'},
  {tier:10,name:'Spartan Efsanesi',  color:'#fbbf24'},
];

function getLevel(points) { return Math.min(50, Math.floor((points||0) / 1000) + 1); }
function getTier(level)   { return Math.min(10, Math.ceil(level / 5)); }
function getRank(level)   { return RANKS[getTier(level) - 1]; }

function getWarriorSVG(tier, color) {
  var roman = ['I','II','III','IV','V','VI','VII','VIII','IX','X'][tier-1] || 'I';
  var hasPl  = tier >= 3;  // plume
  var hasStar = tier >= 6; // side stars
  var hasDStar= tier >= 8; // outer stars
  var hasCrown= tier === 10;
  var c = color;
  return '<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">' +
    '<circle cx="40" cy="40" r="39" fill="#0f172a"/>' +
    '<circle cx="40" cy="40" r="37" fill="none" stroke="' + c + '" stroke-width="2" opacity="0.5"/>' +
    // plume
    (hasPl ? '<rect x="38" y="7" width="4" height="12" fill="' + c + '" rx="2" opacity="0.9"/>' : '') +
    // crown
    (hasCrown ? '<path d="M29 18 L34 13 L40 16 L46 13 L51 18" fill="none" stroke="' + c + '" stroke-width="2.5" stroke-linejoin="round"/>' : '') +
    // helmet dome
    '<path d="M40 18 C27 18 18 27 18 38 C18 44 21 49 24 53 L24 57 L56 57 L56 53 C59 49 62 44 62 38 C62 27 53 18 40 18 Z" fill="' + c + '" opacity="0.9"/>' +
    // cheek guards
    '<rect x="18" y="42" width="7" height="12" rx="2" fill="' + c + '" opacity="0.7"/>' +
    '<rect x="55" y="42" width="7" height="12" rx="2" fill="' + c + '" opacity="0.7"/>' +
    // face opening
    '<rect x="26" y="32" width="28" height="22" rx="3" fill="#0f172a"/>' +
    // eye slits
    '<rect x="27" y="36" width="10" height="3.5" rx="1.75" fill="' + c + '" opacity="0.85"/>' +
    '<rect x="43" y="36" width="10" height="3.5" rx="1.75" fill="' + c + '" opacity="0.85"/>' +
    // nose guard
    '<rect x="38.5" y="39" width="3" height="10" rx="1.5" fill="' + c + '" opacity="0.4"/>' +
    // tier label
    '<text x="40" y="74" font-family="monospace" font-size="8" fill="' + c + '" text-anchor="middle" font-weight="bold" opacity="0.9">' + roman + '</text>' +
    // side decorations
    (hasStar ? '<circle cx="22" cy="62" r="2.5" fill="' + c + '" opacity="0.7"/><circle cx="58" cy="62" r="2.5" fill="' + c + '" opacity="0.7"/>' : '') +
    (hasDStar ? '<circle cx="15" cy="58" r="2" fill="' + c + '" opacity="0.5"/><circle cx="65" cy="58" r="2" fill="' + c + '" opacity="0.5"/>' : '') +
    '</svg>';
}

// ── Investor type metadata ────────────────────
var INV_META = {
  growth: { emoji:'🚀', risk:'Yüksek',      vade:'1–5 yıl',   tags:['Gelir büyümesi','EPS artışı','PEG oranı','Pazar payı'] },
  div:    { emoji:'💰', risk:'Düşük-Orta',   vade:'5+ yıl',    tags:['Temettü verimi','Ödeme oranı','Temettü büyümesi','Nakit akışı'] },
  value:  { emoji:'🔍', risk:'Orta',         vade:'3–7 yıl',   tags:['F/K oranı','PD/DD','EV/EBITDA','İç değer'] },
  mom:    { emoji:'🏄', risk:'Yüksek',       vade:'1–12 ay',   tags:['RSI','52H yakınlık','Göreceli güç','Hacim artışı'] },
  def:    { emoji:'🛡️', risk:'Düşük',        vade:'5+ yıl',    tags:['Düşük beta','Borç/özsermaye','Temettü istikrarı','Savunma sektörü'] },
  small:  { emoji:'🔭', risk:'Yüksek',       vade:'2–5 yıl',   tags:['Küçük ölçek','Keşfedilmemiş','Büyüme potansiyeli','Düşük analist takibi'] },
  spec:   { emoji:'⚡', risk:'Çok Yüksek',   vade:'Günler–Aylar', tags:['Hacim patlaması','Kırılım','Yüksek volatilite','Katalizör'] },
  tech:   { emoji:'🤖', risk:'Yüksek',       vade:'2–5 yıl',   tags:['Ar-Ge harcaması','Gelir büyümesi','TAM büyüklüğü','Yazılım marjı'] },
  bal:    { emoji:'⚖️', risk:'Orta',         vade:'5+ yıl',    tags:['Çeşitlendirme','Sharpe oranı','Korelasyon','Risk/getiri dengesi'] },
};

function renderInvestorSidebar() {
  var sb = document.getElementById('pf-inv-sidebar');
  if (!sb) return;
  var current = _user && _user.investorType;

  var html = '<div class="pf-inv-sb-title">Yatırımcı Profilleri</div>';

  if (_user) {
    html += '<button class="pf-inv-sb-change-btn" onclick="startQuizForExistingUser()">Kimliğini Güncelle</button>';
  }

  Object.keys(INV_TYPES).forEach(function(key) {
    var inv  = INV_TYPES[key];
    var meta = INV_META[key];
    var isMe = current === key;
    var borderStyle = isMe ? 'border-color:' + inv.color + ';' : '';
    var bgStyle     = isMe ? 'background:' + inv.color + '12;' : '';
    html +=
      '<div class="pf-inv-sb-item' + (isMe ? ' pf-inv-sb-me' : '') + '" style="' + borderStyle + bgStyle + '">' +
        '<div class="pf-inv-sb-head">' +
          '<span class="pf-inv-sb-emoji">' + meta.emoji + '</span>' +
          '<div style="flex:1;min-width:0;">' +
            '<div class="pf-inv-sb-name">' +
              '<span style="color:' + inv.color + '">' + inv.name + '</span>' +
              (isMe ? '<span class="pf-inv-sb-me-badge" style="background:' + inv.color + '">SEN</span>' : '') +
            '</div>' +
            '<div class="pf-inv-sb-desc">' + inv.desc + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="pf-inv-sb-meta">' +
          '<span class="pf-inv-sb-chip">⏱ ' + meta.vade + '</span>' +
          '<span class="pf-inv-sb-chip">⚠ ' + meta.risk + '</span>' +
        '</div>' +
        '<div class="pf-inv-sb-tags">' +
          meta.tags.map(function(t){ return '<span class="pf-inv-sb-tag">' + t + '</span>'; }).join('') +
        '</div>' +
      '</div>';
  });

  if (!current) {
    html += '<div class="pf-inv-sb-scrollhint">Quiz yaparak tipini belirle 👆</div>';
  }
  sb.innerHTML = html;
}

// ── Quiz ──────────────────────────────────────
var QUIZ = [
  { q: 'Yatırım hedefin nedir?', opts: [
    {t:'Sermayemi hızla büyütmek istiyorum', score:{growth:3, tech:2, spec:1}},
    {t:'Düzenli temettü geliri almak istiyorum', score:{div:3, def:1}},
    {t:'Düşük değerlenmiş şirketler bulmak istiyorum', score:{value:3, small:2}},
    {t:'Piyasa trendlerini takip etmek istiyorum', score:{mom:3, spec:2}},
    {t:'İstikrarlı ve dengeli büyüme istiyorum', score:{bal:3, def:2}},
  ]},
  { q: 'Risk toleransın ne kadar?', opts: [
    {t:'Çok yüksek — büyük dalgalanmalar sorun değil', score:{spec:3, mom:2}},
    {t:'Yüksek — kısa vadeli kayıpları kaldırabilirim', score:{growth:3, tech:2, small:1}},
    {t:'Orta — makul dalgalanmalara katlanırım', score:{bal:3, value:1, small:2}},
    {t:'Düşük — istikrar tercih ederim', score:{div:3, def:3, value:1}},
  ]},
  { q: 'Tercih ettiğin yatırım ufku nedir?', opts: [
    {t:'Kısa vadeli (1 yıldan az)', score:{spec:3, mom:3}},
    {t:'Orta vadeli (1–3 yıl)', score:{growth:2, tech:2, small:2, mom:1}},
    {t:'Uzun vadeli (3–7 yıl)', score:{value:3, bal:2, growth:1}},
    {t:'Çok uzun vadeli (7+ yıl)', score:{div:3, def:3, value:2}},
  ]},
  { q: 'Hangi tür şirketlere yatırım yapmayı seversin?', opts: [
    {t:'Yüksek büyüme potansiyeli olan teknoloji şirketleri', score:{tech:3, growth:2}},
    {t:'Köklü, kârlı ve temettü veren şirketler', score:{div:3, def:2, value:1}},
    {t:'Küçük, henüz keşfedilmemiş şirketler', score:{small:3, spec:2, value:1}},
    {t:'Güçlü momentum gösteren trend hisseler', score:{mom:3, growth:1}},
    {t:'Farklı sektörlerden dengeli sepet', score:{bal:3, def:1}},
  ]},
  { q: 'Piyasayı nasıl analiz edersin?', opts: [
    {t:'Teknik analiz — grafik, destek-direnç, hacim', score:{mom:3, spec:3}},
    {t:'Temel analiz — F/K, PD/DD, karlılık oranları', score:{value:3, div:2, def:1}},
    {t:'Makroekonomik veriler — faiz, döviz, enflasyon', score:{bal:3, def:2}},
    {t:'Büyüme metrikleri — gelir artışı, pazar payı', score:{growth:3, tech:3, small:1}},
  ]},
];

var _tempReg  = null; // {email, username, password}
var _quizAns  = [];   // answer index per question
var _quizQ    = 0;    // current question index (0-4)

function calcInvestorType(answers) {
  var scores = {};
  Object.keys(INV_TYPES).forEach(function(k){ scores[k] = 0; });
  answers.forEach(function(aIdx, qIdx) {
    var sc = QUIZ[qIdx].opts[aIdx].score;
    Object.keys(sc).forEach(function(k){ scores[k] = (scores[k]||0) + sc[k]; });
  });
  var best = 'bal', bestVal = -1;
  Object.keys(scores).forEach(function(k){ if (scores[k] > bestVal){ bestVal = scores[k]; best = k; }});
  return best;
}

function showQuiz() {
  _quizAns = [];
  _quizQ   = 0;
  // Restore quiz body HTML in case showQuizResult() had replaced it
  var body = document.getElementById('quiz-body');
  if (body) body.innerHTML = '<div class="quiz-q" id="quiz-q-text"></div><div class="quiz-opts" id="quiz-opts"></div>';
  // Show header/footer
  var hdr = document.getElementById('quiz-header'); if (hdr) hdr.style.display = '';
  var ftr = document.getElementById('quiz-footer'); if (ftr) ftr.style.display = '';
  renderQuizQ();
  // Section swap: hide other sections, show quiz section
  ['pf-loading','pf-login','pf-user'].forEach(function(id){
    var el = document.getElementById(id); if (el) el.style.display = 'none';
  });
  var qs = document.getElementById('pf-quiz-section');
  if (qs) qs.style.display = 'block';
}

window.startQuizForExistingUser = function() {
  _tempReg = null;
  showQuiz();
};

function renderQuizQ() {
  var q    = QUIZ[_quizQ];
  var pct  = Math.round((_quizQ / QUIZ.length) * 100);
  document.getElementById('quiz-step').textContent    = (_quizQ + 1) + ' / ' + QUIZ.length;
  document.getElementById('quiz-prog').style.width    = (pct + 20) + '%';
  document.getElementById('quiz-q-text').textContent  = q.q;
  document.getElementById('quiz-back').disabled       = false;
  document.getElementById('quiz-next').disabled       = _quizAns[_quizQ] == null;
  document.getElementById('quiz-next').textContent    = _quizQ === QUIZ.length - 1 ? 'Bitir ✓' : 'Sonraki →';
  document.getElementById('quiz-header').style.display = '';
  document.getElementById('quiz-footer').style.display = '';

  var optsEl = document.getElementById('quiz-opts');
  optsEl.innerHTML = '';
  q.opts.forEach(function(opt, i) {
    var btn = document.createElement('button');
    btn.className = 'quiz-opt' + (_quizAns[_quizQ] === i ? ' selected' : '');
    btn.textContent = opt.t;
    btn.onclick = function() {
      _quizAns[_quizQ] = i;
      optsEl.querySelectorAll('.quiz-opt').forEach(function(b,j){ b.classList.toggle('selected', j===i); });
      document.getElementById('quiz-next').disabled = false;
    };
    optsEl.appendChild(btn);
  });
}

window.quizNext = function() {
  if (_quizAns[_quizQ] == null) return;
  if (_quizQ < QUIZ.length - 1) {
    _quizQ++;
    renderQuizQ();
  } else {
    showQuizResult();
  }
};

window.quizBack = function() {
  if (_quizQ > 0) {
    _quizQ--;
    renderQuizQ();
  } else {
    // İlk soruda geri → profil sayfasına dön
    var qs = document.getElementById('pf-quiz-section');
    if (qs) qs.style.display = 'none';
    if (_tempReg) {
      document.getElementById('pf-login').style.display = 'block';
    } else {
      document.getElementById('pf-user').style.display = 'block';
    }
  }
};

function showQuizResult() {
  var type  = calcInvestorType(_quizAns);
  var inv   = INV_TYPES[type];
  document.getElementById('quiz-header').style.display = 'none';
  document.getElementById('quiz-footer').style.display = 'none';
  var body  = document.getElementById('quiz-body');
  body.innerHTML =
    '<div class="quiz-result">' +
    '<div class="quiz-result-icon">⚔️</div>' +
    '<div class="quiz-result-title">Yatırımcı Tipin:</div>' +
    '<div class="quiz-result-badge" style="border-color:' + inv.color + ';color:' + inv.color + '">' +
      '<span style="width:10px;height:10px;border-radius:50%;background:' + inv.color + ';display:inline-block;"></span>' + inv.name +
    '</div>' +
    '<div class="quiz-result-desc">' + inv.desc + '</div>' +
    '<button class="quiz-finish-btn" id="quiz-finish-btn" onclick="finishQuiz(\'' + type + '\')">' + (_tempReg ? 'Hesabımı Oluştur →' : 'Kaydet ve Profile Dön →') + '</button>' +
    '</div>';
}

window.finishQuiz = async function(type) {
  var btn   = document.getElementById('quiz-finish-btn');
  var errEl = document.getElementById('pf-auth-err');
  if (btn) { btn.disabled = true; btn.textContent = 'Kaydediliyor...'; }

  function hideQuizSection() {
    var qs = document.getElementById('pf-quiz-section');
    if (qs) qs.style.display = 'none';
  }

  // Existing user updating investor type
  if (!_tempReg && _user) {
    try {
      var r = await fetch('/api/auth/set-investor-type', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ investorType: type })
      });
      var d = await r.json();
      if (d.ok) {
        _user.investorType = type;
        hideQuizSection();
        document.getElementById('pf-user').style.display = 'block';
        renderIdentity();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        toast('⚔ ' + INV_TYPES[type].name + ' — yatırımcı tipin güncellendi!');
      } else {
        hideQuizSection();
        document.getElementById('pf-user').style.display = 'block';
        toast(d.error || 'Güncelleme başarısız.');
      }
    } catch(e) {
      hideQuizSection();
      document.getElementById('pf-user').style.display = 'block';
      toast('Bağlantı hatası.');
    }
    return;
  }

  // New registration flow
  try {
    var body = { email: _tempReg.email, password: _tempReg.password, username: _tempReg.username, name: _tempReg.name || '', dob: _tempReg.dob || '', investorType: type };
    var r2 = await fetch('/api/auth/register', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    var d2 = await r2.json();
    if (d2.user) {
      _user = d2.user;
      hideQuizSection();
      showUser();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      await Promise.all([loadWatchlists(), loadPortfolio()]);
      toast('⚔ Hoş geldin ' + (d2.user.username || d2.user.name) + '! Yatırımcı kimliğin hazır.');
    } else {
      hideQuizSection();
      document.getElementById('pf-login').style.display = 'block';
      if (errEl) errEl.textContent = d2.error || 'Kayıt başarısız.';
      if (btn) { btn.disabled = false; btn.textContent = 'Hesabımı Oluştur →'; }
    }
  } catch(e) {
    hideQuizSection();
    document.getElementById('pf-login').style.display = 'block';
    if (errEl) errEl.textContent = 'Bağlantı hatası.';
    if (btn) { btn.disabled = false; btn.textContent = 'Hesabımı Oluştur →'; }
  }
};

// ── Başlat ───────────────────────────────────
async function init() {
  try {
    var r = await fetch('/api/auth/me');
    var d = await r.json();
    if (d.user) {
      _user = d.user;
      showUser();
      await Promise.all([loadWatchlists(), loadPortfolio()]);
      // Daily checkin — fire and forget
      fetch('/api/auth/daily-checkin', {method:'POST'})
        .then(function(rr){ return rr.json(); })
        .then(function(dd) {
          if (dd.ok && !dd.alreadyChecked && dd.pointsAdded > 0) {
            _user.points = dd.points;
            _user.loginStreak = dd.streak;
            renderIdentity();
            toast('+100 XP — ' + dd.streak + ' günlük giriş serisi!');
          }
        }).catch(function(){});
    } else {
      showLogin();
    }
  } catch(e) { showLogin(); }
}

function showLogin() {
  document.getElementById('pf-loading').style.display = 'none';
  document.getElementById('pf-login').style.display   = 'block';
}

function renderIdentity() {
  if (!_user) return;
  var pts    = _user.points || 0;
  var level  = getLevel(pts);
  var tier   = getTier(level);
  var rank   = getRank(level);
  var xpInLevel = pts - (level - 1) * 1000;
  var xpPct  = Math.min(100, Math.round(xpInLevel / 10));

  // Avatar SVG
  var wrap = document.getElementById('pf-warrior-svg');
  if (wrap) wrap.innerHTML = getWarriorSVG(tier, rank.color);

  // Rank label
  var rl = document.getElementById('pf-rank-label');
  if (rl) { rl.textContent = rank.name; rl.style.color = rank.color; }

  // Name / username
  var dn = document.getElementById('pf-display-name');
  if (dn) dn.textContent = _user.name || _user.username || _user.email;
  var un = document.getElementById('pf-username-text');
  if (un) un.textContent = _user.username || _user.name || _user.email.split('@')[0];
  var em = document.getElementById('pf-email-text');
  if (em) em.textContent = _user.email;

  // Investor badge
  var bw = document.getElementById('pf-inv-badge-wrap');
  if (bw) {
    if (_user.investorType && INV_TYPES[_user.investorType]) {
      var inv = INV_TYPES[_user.investorType];
      bw.innerHTML = '<div class="pf-inv-badge" style="border-color:' + inv.color + ';color:' + inv.color + '">' +
        '<span class="pf-inv-badge-icon" style="background:' + inv.color + '"></span>' + inv.name + '</div>';
    } else {
      bw.innerHTML =
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">' +
        '<span style="font-size:11px;color:var(--muted2);">Yatırımcı tipi belirlenmedi</span>' +
        '<button onclick="startQuizForExistingUser()" style="background:#6366f1;color:#fff;border:none;border-radius:6px;' +
          'padding:4px 12px;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;">🧬 Quiz\'e Başla</button>' +
        '</div>';
    }
  }

  // XP bar
  var lvEl = document.getElementById('pf-level-num');
  if (lvEl) { lvEl.textContent = 'Sv.' + level; lvEl.style.color = rank.color; }
  var xpFill = document.getElementById('pf-xp-fill');
  if (xpFill) { xpFill.style.width = xpPct + '%'; xpFill.style.background = rank.color; }
  var xpLabel = document.getElementById('pf-xp-label');
  if (xpLabel) xpLabel.textContent = xpInLevel + ' / 1000 XP';

  // Meta
  var pv = document.getElementById('pf-points-val');
  if (pv) pv.textContent = pts.toLocaleString('tr-TR');
  var sv = document.getElementById('pf-streak-val');
  if (sv) sv.textContent = _user.loginStreak || 0;

  // Tara button
  var taraBtn = document.getElementById('pf-tara-btn');
  if (taraBtn) taraBtn.disabled = !_user.investorType;

  // Settings name input
  var nameInp = document.getElementById('pf-name-input');
  if (nameInp) nameInp.value = _user.name || '';

  // Identity card personalization by investor type
  var identityCard = document.getElementById('pf-identity');
  var identityDec  = document.getElementById('pf-identity-dec');
  if (identityCard) {
    if (_user.investorType && INV_TYPES[_user.investorType]) {
      var iType = _user.investorType;
      var iInv  = INV_TYPES[iType];
      var iMeta = INV_META[iType];
      identityCard.style.border     = '1px solid ' + iInv.color + '40';
      identityCard.style.borderLeft = '3px solid ' + iInv.color;
      identityCard.style.background = 'linear-gradient(130deg,' + iInv.color + '12 0%,var(--s1) 55%)';
      if (identityDec) { identityDec.textContent = iMeta.emoji; }
    } else {
      identityCard.style.border     = '';
      identityCard.style.borderLeft = '';
      identityCard.style.background = '';
      if (identityDec) identityDec.textContent = '';
    }
  }

  renderInvestorSidebar();
}

function showUser() {
  document.getElementById('pf-loading').style.display = 'none';
  document.getElementById('pf-user').style.display    = 'block';
  renderIdentity();
}

window.taraWithPreset = function() {
  if (!_user || !_user.investorType) return;
  var url = '/?from=screener&investor=' + encodeURIComponent(_user.investorType);
  window.location.href = url;
};

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
  }).join('') + '<button class="pf-new-list-btn" onclick="openModal(\'watchlist\')">+ Yeni</button>';
}

window.switchList = function(id) {
  _activeListId = id; renderTabs(); renderListPanel();
};

function renderListPanel() {
  var list  = _lists.find(function(l) { return l.id === _activeListId; });
  var panel = document.getElementById('pf-list-panel');
  if (!list) { panel.innerHTML = '<div class="pf-empty">Liste bulunamadı.</div>'; return; }

  var items    = list.items || [];
  var canDel   = _lists.length > 1;
  var scanUrl  = '/?from=screener&wl=' + encodeURIComponent(list.id);

  var rows = items.map(function(item) {
    var sym = esc(item.symbol);
    var ex  = esc(item.exchange || 'bist');
    var analiz = '/analiz/profile.html?sym=' + encodeURIComponent(item.symbol.replace('.IS','')) + '&ex=' + encodeURIComponent(item.exchange || 'bist');
    return '<tr style="cursor:pointer" onclick="window.location.href=\'' + analiz + '\'">' +
      '<td><span class="pf-sym">' + sym + '</span></td>' +
      '<td><span class="pf-ex-badge">' + ex + '</span></td>' +
      '<td class="pf-price-cell" id="wlp-' + sym + '">—</td>' +
      '<td class="pf-chg-cell"   id="wlc-' + sym + '">—</td>' +
      '<td style="color:var(--muted2);font-size:11px;">' + formatDate(item.addedAt) + '</td>' +
      '<td onclick="event.stopPropagation()"><input class="pf-note-input" value="' + esc(item.note || '') +
        '" placeholder="Not..." onblur="saveNote(\'' + list.id + '\',\'' + sym + '\',this.value)"></td>' +
      '<td onclick="event.stopPropagation()"><button class="pf-remove-btn" onclick="removeItem(\'' + list.id + '\',\'' + sym + '\')" title="Çıkar">×</button></td>' +
    '</tr>';
  }).join('');

  panel.innerHTML =
    '<div class="pf-list-header">' +
      '<input class="pf-list-name-input" value="' + esc(list.name) +
        '" onblur="renameList(\'' + list.id + '\',this.value)" maxlength="40">' +
      '<a href="' + scanUrl + '" class="pf-scan-btn">↗ Tara</a>' +
      (canDel ? '<button class="pf-list-del-btn" onclick="deleteList(\'' + list.id + '\')">Sil</button>' : '') +
    '</div>' +
    '<div class="pf-stock-table-wrap"><table class="pf-stock-table"><thead><tr>' +
      '<th>Sembol</th><th>Borsa</th><th>Fiyat</th><th>Değ%</th><th>Ekleme</th><th>Not</th><th></th>' +
    '</tr></thead><tbody>' +
      (rows || '<tr><td colspan="7"><div class="pf-empty">Liste boş — aşağıdan hisse ekle.</div></td></tr>') +
    '</tbody></table></div>' +
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

// ── Autocomplete ──────────────────────────────
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
window.clearAC = function() { var el = getACEl(); el.style.display = 'none'; _acActive = null; };
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
    if (d.watchlists) {
      _lists = d.watchlists; document.getElementById('pf-add-sym').value = ''; renderTabs(); renderListPanel(); toast('✓ ' + sym + ' eklendi');
      fetch('/api/track', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'wl',key:sym})}).catch(function(){});
    }
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

// ── Modal ────────────────────────────────────
var _modalMode = 'watchlist';
window.openModal = function(mode) {
  _modalMode = mode || 'watchlist';
  var titles = { watchlist: 'Yeni Takip Listesi', portfolio: 'Yeni Portföy' };
  document.getElementById('pf-modal-title').textContent = titles[_modalMode] || 'Yeni';
  document.getElementById('pf-modal-input').value = '';
  document.getElementById('pf-modal-bg').style.display = 'flex';
  document.getElementById('pf-modal-input').focus();
};
window.closeModal = function() { document.getElementById('pf-modal-bg').style.display = 'none'; };
window.createFromModal = async function() {
  var name = (document.getElementById('pf-modal-input').value || '').trim();
  if (!name) return; closeModal();
  if (_modalMode === 'portfolio') { await createPortfolio(name); return; }
  await createList(name);
};

// ── Hisse Picker ──────────────────────────────
var _spTimer = null;
var _spMode  = 'watchlist';

window.openSymPicker = function(mode) {
  _spMode = mode || 'watchlist';
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
  if (_spMode === 'portfolio') {
    document.getElementById('pf-pos-sym').value  = sym;
    document.getElementById('pf-pos-ex').value   = ex;
    var btn = document.getElementById('pf-pos-sym-btn');
    if (btn) { btn.textContent = '✓ ' + sym + ' (' + ex.toUpperCase() + ')'; btn.classList.add('selected'); }
    var addBtn = document.getElementById('pf-pos-add-btn');
    if (addBtn) addBtn.disabled = false;
    setTimeout(function() { var q = document.getElementById('pf-pos-qty'); if (q) q.focus(); }, 50);
    return;
  }
  try {
    var r = await fetch('/api/watchlists/item', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
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

async function createList(name) {
  try {
    var r = await fetch('/api/watchlists', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ name: name }) });
    var d = await r.json();
    if (d.watchlists) { _lists = d.watchlists; _activeListId = _lists[_lists.length-1].id; renderTabs(); renderListPanel(); toast('✓ "' + name + '" oluşturuldu'); }
  } catch(e) {}
}

// ── Portföy ───────────────────────────────────
var _portfolios = [];
var _activePfId = null;

async function loadPortfolio() {
  try {
    var r = await fetch('/api/portfolio');
    if (!r.ok) return;
    var d = await r.json();
    _portfolios = d.portfolios || [];
    if (_portfolios.length && !_activePfId) _activePfId = _portfolios[0].id;
    renderPfTabs();
    renderPfPanel();
  } catch(e) {}
}

function renderPfTabs() {
  var tabs = document.getElementById('pf-pf-tabs');
  if (!tabs) return;
  tabs.innerHTML = _portfolios.map(function(pf) {
    return '<button class="pf-list-tab' + (pf.id === _activePfId ? ' active' : '') +
      '" onclick="switchPf(\'' + pf.id + '\')">' + esc(pf.icon || '📊') + ' ' + esc(pf.name) + '</button>';
  }).join('') + '<button class="pf-new-list-btn" onclick="openModal(\'portfolio\')">+ Yeni</button>';
}

window.switchPf = function(id) {
  _activePfId = id; renderPfTabs(); renderPfPanel();
};

function renderPfPanel() {
  var pf    = _portfolios.find(function(p) { return p.id === _activePfId; });
  var panel = document.getElementById('pf-pf-panel');
  if (!pf || !panel) return;

  var canDel    = _portfolios.length > 1;
  var positions = pf.positions || [];

  var rows = positions.map(function(pos) {
    var analiz = '/analiz/profile.html?sym=' + encodeURIComponent(pos.symbol.replace('.IS','')) + '&ex=' + encodeURIComponent(pos.exchange || 'bist');
    return '<tr style="cursor:pointer" onclick="window.location.href=\'' + analiz + '\'">' +
      '<td><span class="pf-sym">' + esc(pos.symbol) + '</span></td>' +
      '<td><span class="pf-ex-badge">' + esc(pos.exchange) + '</span></td>' +
      '<td>' + pos.quantity.toLocaleString('tr-TR') + '</td>' +
      '<td>' + fmtPrice(pos.avgCost) + '</td>' +
      '<td id="pfp-' + pos.id + '">—</td>' +
      '<td id="pfv-' + pos.id + '">—</td>' +
      '<td id="pfpnl-' + pos.id + '">—</td>' +
      '<td onclick="event.stopPropagation()"><button class="pf-remove-btn" onclick="removePosition(\'' + pf.id + '\',\'' + pos.id + '\')" title="Çıkar">×</button></td>' +
    '</tr>';
  }).join('');

  panel.innerHTML =
    '<div class="pf-list-header">' +
      '<input class="pf-list-name-input" value="' + esc(pf.name) +
        '" onblur="renamePf(\'' + pf.id + '\',this.value)" maxlength="40">' +
      '<div class="pf-pf-total" id="pf-pf-total"></div>' +
      (canDel ? '<button class="pf-list-del-btn" onclick="deletePf(\'' + pf.id + '\')">Sil</button>' : '') +
    '</div>' +
    '<div class="pf-stock-table-wrap"><table class="pf-stock-table"><thead><tr>' +
      '<th>Sembol</th><th>Borsa</th><th>Adet</th><th>Maliyet</th><th>Fiyat</th><th>Değer</th><th>K/Z</th><th></th>' +
    '</tr></thead><tbody>' +
      (rows || '<tr><td colspan="8"><div class="pf-empty">Henüz pozisyon yok — aşağıdan ekle.</div></td></tr>') +
    '</tbody></table></div>' +
    '<div class="pf-add-form" style="flex-wrap:wrap">' +
      '<button class="pf-sym-pick-btn" id="pf-pos-sym-btn" onclick="openSymPicker(\'portfolio\')">🔍 Hisse Seç</button>' +
      '<input type="number" id="pf-pos-qty"  placeholder="Adet"    min="0.001" step="any" style="width:80px">' +
      '<input type="number" id="pf-pos-cost" placeholder="Maliyet" min="0"     step="any" style="width:90px">' +
      '<button class="pf-add-btn" id="pf-pos-add-btn" onclick="addPosition()" disabled>+ Ekle</button>' +
      '<input type="hidden" id="pf-pos-sym">' +
      '<input type="hidden" id="pf-pos-ex" value="bist">' +
    '</div>';

  if (positions.length) fetchPortfolioPrices(pf);
}

async function fetchPortfolioPrices(pf) {
  var positions = pf.positions || [];
  var total = 0, totalCost = 0;
  await batchFetch(positions, function(pos, data) {
    var price = data.price;
    var value = price * pos.quantity;
    var cost  = pos.avgCost * pos.quantity;
    var pnl   = value - cost;
    var pct   = pos.avgCost > 0 ? (price / pos.avgCost - 1) * 100 : 0;
    total += value; totalCost += cost;
    var pe  = document.getElementById('pfp-'   + pos.id);
    var ve  = document.getElementById('pfv-'   + pos.id);
    var pe2 = document.getElementById('pfpnl-' + pos.id);
    if (pe)  pe.textContent = fmtPrice(price);
    if (ve)  ve.textContent = fmtPrice(value);
    if (pe2) pe2.innerHTML  = '<span class="' + (pnl >= 0 ? 'pf-up' : 'pf-dn') + '">' +
      (pnl >= 0 ? '+' : '') + fmtPrice(pnl) + ' (' + (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%)</span>';
  });
  var te = document.getElementById('pf-pf-total');
  if (te && total > 0) {
    var pnlTotal = total - totalCost;
    te.innerHTML = 'Toplam: <b>' + fmtPrice(total) + '</b>&nbsp;<span class="' + (pnlTotal >= 0 ? 'pf-up' : 'pf-dn') + '">' +
      '(' + (pnlTotal >= 0 ? '+' : '') + fmtPrice(pnlTotal) + ')</span>';
  }
}

window.addPosition = async function() {
  var sym  = (document.getElementById('pf-pos-sym').value  || '').trim().toUpperCase();
  var ex   =  document.getElementById('pf-pos-ex').value;
  var qty  = parseFloat(document.getElementById('pf-pos-qty').value);
  var cost = parseFloat(document.getElementById('pf-pos-cost').value);
  if (!sym || !ex) { toast('Önce hisse seçin'); return; }
  if (isNaN(qty) || qty <= 0 || isNaN(cost) || cost < 0) { toast('Adet ve maliyet girin'); return; }
  var addBtn = document.getElementById('pf-pos-add-btn'); addBtn.disabled = true;
  try {
    var r = await fetch('/api/portfolio/item', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ portfolioId: _activePfId, symbol: sym, exchange: ex, quantity: qty, avgCost: cost }) });
    var d = await r.json();
    if (d.portfolios) {
      _portfolios = d.portfolios;
      var pickBtn = document.getElementById('pf-pos-sym-btn');
      if (pickBtn) { pickBtn.textContent = '🔍 Hisse Seç'; pickBtn.classList.remove('selected'); }
      renderPfTabs(); renderPfPanel(); toast('✓ ' + sym + ' eklendi');
    }
  } catch(e) { toast('Hata oluştu'); addBtn.disabled = false; }
};

window.removePosition = async function(pfId, posId) {
  if (!confirm('Bu pozisyonu silmek istediğine emin misin?')) return;
  try {
    var r = await fetch('/api/portfolio/item', { method:'DELETE', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ portfolioId: pfId, id: posId }) });
    var d = await r.json();
    if (d.portfolios) { _portfolios = d.portfolios; renderPfTabs(); renderPfPanel(); toast('Pozisyon silindi'); }
  } catch(e) {}
};

window.renamePf = async function(pfId, name) {
  name = (name || '').trim();
  var pf = _portfolios.find(function(p) { return p.id === pfId; });
  if (!pf || pf.name === name || !name) return;
  try {
    var r = await fetch('/api/portfolio', { method:'PUT', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ id: pfId, name: name }) });
    var d = await r.json();
    if (d.portfolios) { _portfolios = d.portfolios; renderPfTabs(); }
  } catch(e) {}
};

window.deletePf = async function(pfId) {
  if (!confirm('Bu portföyü silmek istediğine emin misin?')) return;
  try {
    var r = await fetch('/api/portfolio', { method:'DELETE', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ id: pfId }) });
    var d = await r.json();
    if (d.portfolios) {
      _portfolios = d.portfolios;
      _activePfId = _portfolios[0] ? _portfolios[0].id : null;
      renderPfTabs(); renderPfPanel(); toast('Portföy silindi');
    }
  } catch(e) {}
};

async function createPortfolio(name) {
  try {
    var r = await fetch('/api/portfolio', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ name: name }) });
    var d = await r.json();
    if (d.portfolios) {
      _portfolios = d.portfolios;
      _activePfId = _portfolios[_portfolios.length-1].id;
      renderPfTabs(); renderPfPanel(); toast('✓ "' + name + '" oluşturuldu');
    }
  } catch(e) {}
}

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
    if (d.ok) {
      _user.name = d.name;
      var dn = document.getElementById('pf-display-name');
      if (dn) dn.textContent = d.name;
      toast('✓ İsim güncellendi');
    } else toast(d.error || 'Hata oluştu');
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
  if (nw.length < 6)         { errEl.textContent = 'Yeni şifre en az 6 karakter.'; return; }
  if (nw.length > 20)        { errEl.textContent = 'Yeni şifre en fazla 20 karakter olabilir.'; return; }
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
  document.getElementById('pf-auth-title').textContent        = isReg ? 'Hesap Oluştur' : 'Profiline giriş yap';
  document.getElementById('pf-auth-btn').textContent          = isReg ? 'Devam Et →' : 'Giriş Yap';
  document.getElementById('pf-auth-fullname').style.display   = isReg ? 'block' : 'none';
  document.getElementById('pf-auth-dob').style.display        = isReg ? 'block' : 'none';
  document.getElementById('pf-auth-username').style.display   = isReg ? 'block' : 'none';
  document.getElementById('pf-consent-block').style.display   = isReg ? 'block' : 'none';
  document.getElementById('pf-switch-text').textContent       = isReg ? 'Zaten hesabın var mı?' : 'Hesabın yok mu?';
  document.getElementById('pf-switch-btn').textContent        = isReg ? 'Giriş Yap' : 'Kayıt Ol';
  document.getElementById('pf-auth-password').setAttribute('autocomplete', isReg ? 'new-password' : 'current-password');
  document.getElementById('pf-remember-row').style.display = isReg ? 'none' : 'flex';
  document.getElementById('pf-auth-err').textContent = '';
  if (!isReg) document.getElementById('pf-consent-check').checked = false;
};

window.submitAuth = async function(e) {
  if (e) e.preventDefault();
  var email    = (document.getElementById('pf-auth-email').value    || '').trim();
  var password = (document.getElementById('pf-auth-password').value || '');
  var username = (document.getElementById('pf-auth-username').value || '').trim();
  var errEl    = document.getElementById('pf-auth-err');
  errEl.textContent = '';

  if (!email || !password) { errEl.textContent = 'E-posta ve şifre gerekli.'; return; }

  if (_authMode === 'register') {
    var fullname = (document.getElementById('pf-auth-fullname').value || '').trim();
    var dobRaw   = (document.getElementById('pf-auth-dob').value || '').trim();
    var consent  = document.getElementById('pf-consent-check').checked;

    if (!fullname || fullname.length < 2) {
      errEl.textContent = 'Ad Soyad en az 2 karakter olmalı.'; return;
    }
    if (!dobRaw) {
      errEl.textContent = 'Doğum tarihi gerekli.'; return;
    }
    var dobParsed = _parseDob(dobRaw);
    if (!dobParsed) {
      errEl.textContent = 'Geçerli bir doğum tarihi girin (GG/AA/YYYY).'; return;
    }
    if (password.length < 6) { errEl.textContent = 'Şifre en az 6 karakter olmalı.'; return; }
    if (password.length > 20) { errEl.textContent = 'Şifre en fazla 20 karakter olabilir.'; return; }
    if (!username || username.length < 3 || username.length > 20) {
      errEl.textContent = 'Kullanıcı adı 3-20 karakter olmalı.'; return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      errEl.textContent = 'Kullanıcı adı sadece harf, rakam ve alt çizgi içerebilir.'; return;
    }
    if (!consent) {
      errEl.textContent = 'Devam edebilmek için gizlilik metnini okuyup onaylamanız gerekiyor.'; return;
    }
    _tempReg = { email: email, password: password, username: username, name: fullname, dob: dobParsed };
    showQuiz();
    return;
  }

  var rememberMe = document.getElementById('pf-remember-check').checked;
  var btn = document.getElementById('pf-auth-btn');
  btn.disabled = true; btn.textContent = 'Giriş yapılıyor...';
  try {
    var r = await fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: password, rememberMe: rememberMe }) });
    var d = await r.json();
    if (d.user) {
      _user = d.user;
      document.getElementById('pf-login').style.display = 'none';
      showUser();
      await Promise.all([loadWatchlists(), loadPortfolio()]);
      // Daily checkin after login
      fetch('/api/auth/daily-checkin', {method:'POST'})
        .then(function(rr){ return rr.json(); })
        .then(function(dd) {
          if (dd.ok && !dd.alreadyChecked && dd.pointsAdded > 0) {
            _user.points = dd.points;
            _user.loginStreak = dd.streak;
            renderIdentity();
            toast('+100 XP — ' + dd.streak + ' günlük giriş serisi!');
          }
        }).catch(function(){});
    } else {
      errEl.textContent = d.error || 'Hata oluştu.';
      btn.disabled = false; btn.textContent = 'Giriş Yap';
    }
  } catch(err) {
    errEl.textContent = 'Bağlantı hatası.';
    btn.disabled = false; btn.textContent = 'Giriş Yap';
  }
};

// ── Helpers ───────────────────────────────────
function _parseDob(raw) {
  // Accepts GG/AA/YYYY or GG.AA.YYYY or GG-AA-YYYY
  var m = raw.match(/^(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{4})$/);
  if (!m) return null;
  var d = parseInt(m[1], 10), mo = parseInt(m[2], 10), y = parseInt(m[3], 10);
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 1900 || y > new Date().getFullYear()) return null;
  var dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return y + '-' + String(mo).padStart(2,'0') + '-' + String(d).padStart(2,'0');
}

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
