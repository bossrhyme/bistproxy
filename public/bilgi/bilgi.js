// ═══════════════════════════════════════════════════════════════
// DeepFin — Bilgi Bankası (içerik statik HTML'de; bu dosya yalnızca
// sekme/okuyucu geçişlerini yönetir — SEO için içerik DOM'da hazır)
// ═══════════════════════════════════════════════════════════════
(function(){
  var LABELS = {
    guides:    'Strateji Rehberleri',
    investors: 'Yatırımcı Lensleri',
    filters:   'Filtre Açıklamaları',
    columns:   'Kolon Açıklamaları',
    ref:       'Terimler & Göstergeler'
  };
  var sections = [].slice.call(document.querySelectorAll('.bk-sec'));
  var keys = sections.map(function(s){ return s.getAttribute('data-sec'); });
  var nav = document.getElementById('bk-nav');
  if (!nav || !sections.length) return;

  function resetGuides(){
    var list = document.getElementById('bk-guide-list');
    if (list) list.hidden = false;
    document.querySelectorAll('.bk-article').forEach(function(a){ a.hidden = true; });
  }
  function show(key){
    if (keys.indexOf(key) < 0) key = keys[0];
    sections.forEach(function(s){ s.hidden = s.getAttribute('data-sec') !== key; });
    [].slice.call(nav.children).forEach(function(b){ b.classList.toggle('on', b.getAttribute('data-sec') === key); });
  }
  function select(key){
    if (keys.indexOf(key) < 0) key = keys[0];
    resetGuides();
    show(key);
    try{ history.replaceState(null,'','#'+key); }catch(e){}
    window.scrollTo({ top:0, behavior:'smooth' });
  }
  window.bkSelect = select;

  // Yan menüyü oluştur
  nav.innerHTML = keys.map(function(k){
    return '<button class="bk-nav-btn" data-sec="'+k+'" type="button">'+(LABELS[k]||k)+'</button>';
  }).join('');
  [].slice.call(nav.children).forEach(function(b){
    b.addEventListener('click', function(){ select(b.getAttribute('data-sec')); });
  });

  // Rehber kartı → makale
  function openGuide(id){
    var list = document.getElementById('bk-guide-list');
    if (list) list.hidden = true;
    document.querySelectorAll('.bk-article').forEach(function(a){ a.hidden = (a.id !== 'art-'+id); });
    window.scrollTo({ top:0, behavior:'smooth' });
  }
  document.querySelectorAll('[data-guide]').forEach(function(c){
    c.addEventListener('click', function(){ openGuide(c.getAttribute('data-guide')); });
    c.addEventListener('keydown', function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); openGuide(c.getAttribute('data-guide')); } });
  });
  document.querySelectorAll('.bk-back').forEach(function(btn){ btn.addEventListener('click', resetGuides); });

  // Başlangıç durumu (hash varsa o sekme)
  var h = (location.hash||'').replace('#','');
  show(keys.indexOf(h) >= 0 ? h : 'guides');
})();
