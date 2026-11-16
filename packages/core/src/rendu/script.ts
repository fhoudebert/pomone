/** Script embarqué dans les pages produites : aucune dépendance, aucun appel réseau. */
export const SCRIPT = String.raw`
(function () {
  var panneau = document.getElementById('panneau');
  var contenu = document.getElementById('panneau-contenu');
  var origine = null; // élément à qui rendre le focus à la fermeture de la fiche
  function tous(sel, racine) { return Array.prototype.slice.call((racine || document).querySelectorAll(sel)); }
  function plat(s) { return s.replace(/[œŒ]/g, 'oe').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function adresse() { try { return decodeURIComponent(location.hash.slice(1)); } catch (e) { return ''; } }
  // Dans un aperçu isolé (iframe sans origine), l'historique n'est pas modifiable : on s'en passe.
  function noter(h) { try { history.replaceState(null, '', h || location.pathname + location.search); } catch (e) {} }
  function fermer() {
    if (!panneau || panneau.hidden) return;
    panneau.hidden = true;
    tous('.plante.choisi').forEach(function (p) { p.classList.remove('choisi'); });
    if (document.getElementById('fiche-' + adresse())) noter('');
    if (origine && origine.focus) origine.focus({ preventScroll: true });
    origine = null;
  }
  function ouvrir(id, defiler) {
    var modele = document.getElementById('fiche-' + id);
    if (!modele || !panneau) return false;
    var actif = document.activeElement;
    if (!panneau.contains(actif)) origine = actif && actif.matches && actif.matches('[data-fiche]') ? actif : document.querySelector('.plante[data-fiche="' + id + '"]');
    contenu.innerHTML = '';
    contenu.appendChild(modele.content.cloneNode(true));
    panneau.hidden = false;
    tous('.plante.choisi').forEach(function (p) { p.classList.remove('choisi'); });
    tous('.plante').forEach(function (p) {
      if (p.getAttribute('data-fiche') === id) { p.classList.add('choisi'); if (defiler) p.scrollIntoView({ block: 'center', inline: 'center' }); }
    });
    noter('#' + encodeURIComponent(id));
    panneau.querySelector('.fermer').focus({ preventScroll: true });
    return true;
  }
  document.addEventListener('click', function (ev) {
    var t = ev.target.closest ? ev.target : ev.target.parentNode;
    var plante = t.closest('[data-fiche]');
    if (plante) { ouvrir(plante.getAttribute('data-fiche'), false); return; }
    if (t.closest('.fermer')) { fermer(); return; }
    var voir = t.closest('[data-voir]');
    if (voir) {
      var ids = voir.getAttribute('data-voir').split(' ');
      tous('.plante').forEach(function (p) { p.classList.toggle('estompe', ids.indexOf(p.getAttribute('data-cultivar')) < 0); });
      var premier = document.querySelector('.plante:not(.estompe)');
      if (premier) premier.scrollIntoView({ block: 'center', inline: 'center' });
      return;
    }
    var zoom = t.closest('[data-zoom]');
    if (zoom) {
      tous('svg.plan', zoom.closest('section') || document).forEach(function (svg) {
        var base = parseFloat(svg.getAttribute('data-l') || svg.getAttribute('width'));
        svg.setAttribute('data-l', base);
        var f = zoom.getAttribute('data-zoom') === '0' ? 1 : (parseFloat(svg.getAttribute('data-f') || '1') * (zoom.getAttribute('data-zoom') === '+' ? 1.25 : 0.8));
        f = Math.min(4, Math.max(0.4, f));
        svg.setAttribute('data-f', f);
        svg.style.width = (base * f) + 'px'; svg.style.height = 'auto';
      });
      return;
    }
    var th = t.closest('th[data-tri]');
    if (th) {
      var table = th.closest('table'), i = Array.prototype.indexOf.call(th.parentNode.children, th);
      var sens = th.getAttribute('data-sens') === '1' ? -1 : 1;
      th.setAttribute('data-sens', sens);
      var lignes = tous('tbody tr', table);
      lignes.sort(function (a, b) { return sens * plat(a.children[i].textContent).localeCompare(plat(b.children[i].textContent), 'fr', { numeric: true }); });
      lignes.forEach(function (l) { table.tBodies[0].appendChild(l); });
    }
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') fermer();
    if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches && ev.target.matches('[data-fiche]')) { ev.preventDefault(); ouvrir(ev.target.getAttribute('data-fiche'), false); }
  });
  function filtrer() {
    var q = plat((document.getElementById('recherche') || {}).value || '').trim();
    var esp = (document.getElementById('filtre-espece') || {}).value || '';
    var st = (document.getElementById('filtre-statut') || {}).value || '';
    tous('.plante').forEach(function (p) {
      var ok = (!q || p.getAttribute('data-nom').indexOf(q) >= 0) && (!esp || p.getAttribute('data-espece') === esp) && (!st || p.getAttribute('data-statut') === st);
      p.classList.toggle('estompe', !ok);
    });
  }
  ['recherche', 'filtre-espece', 'filtre-statut'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('input', filtrer);
  });
  [['voir-badges', 'sans-badges', true], ['voir-noms', 'montrer-noms', false]].forEach(function (r) {
    var el = document.getElementById(r[0]);
    if (!el) return;
    var appliquer = function () { tous('svg.plan').forEach(function (s) { s.classList.toggle(r[1], r[2] ? !el.checked : el.checked); }); };
    el.addEventListener('change', appliquer); appliquer();
  });
  function selonAdresse() {
    var id = adresse();
    if (id) ouvrir(id, true);
  }
  window.addEventListener('hashchange', selonAdresse);
  selonAdresse();
})();
`;
