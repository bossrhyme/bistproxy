// DeepFin — header auth durumu: çıkış yapıldıysa Giriş/Kayıt, giriş yapıldıysa Profil
(function () {
  function apply(user) {
    var li = !!user;
    var out = document.querySelectorAll('.df-auth-out');
    var inn = document.querySelectorAll('.df-auth-in');
    for (var i = 0; i < out.length; i++) out[i].style.display = li ? 'none' : '';
    for (var j = 0; j < inn.length; j++) inn[j].style.display = li ? '' : 'none';
    if (li) {
      var name = (user.name || user.username || '').trim();
      var initial = name ? name.charAt(0).toUpperCase() : '';
      var avs = document.querySelectorAll('.df-auth-av');
      for (var k = 0; k < avs.length; k++) {
        if (user.picture) avs[k].innerHTML = '<img src="' + user.picture + '" alt="" style="width:18px;height:18px;border-radius:50%;object-fit:cover;display:block;">';
        else avs[k].textContent = initial;
      }
    }
  }
  // Varsayılan: çıkış yapılmış (Giriş/Kayıt görünür)
  apply(null);
  fetch('/api/auth/me', { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
    .then(function (r) { return r.json(); })
    .then(function (d) { apply(d && d.user); })
    .catch(function () {});
})();
