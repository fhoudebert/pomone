import { especeParCle } from '../especes';
import { compterEbauches, estActif, trierEmplacements } from '../lecture';
import { rapprocher } from '../noms';
import { nombre, plat } from '../normaliser';
import type { Allee, Anomalie, Champ, Cultivar, Emplacement, Verger } from '../types';
import { LOGO } from './logo';
import { LETTRES, dessinerPlan, esc } from './plan';
import { SCRIPT } from './script';
import { STYLE } from './style';

export interface OptionsSite {
  /** Un seul fichier verger.html au lieu d'un dossier de pages. */
  unique?: boolean;
  /** Ne pas publier les valeurs en ébauche (préfixe ~). */
  masquerEbauches?: boolean;
  /** Joindre la page des anomalies d'import. */
  rapport?: Anomalie[];
  /** Ne pas embarquer le logo Pomone (CC BY-NC-SA 3.0), par exemple pour un usage commercial. */
  sansLogo?: boolean;
  /** Date affichée en pied de page (AAAA-MM-JJ). */
  date?: string;
}

export interface FichierSite { chemin: string; contenu: string }

const fichier = (id: string): string => id.replace(/[^A-Za-z0-9_-]/g, '_');

class Site {
  cv: Map<string, Cultivar>;
  al: Map<string, Allee>;
  constructor(readonly v: Verger, readonly o: OptionsSite) {
    this.cv = new Map(v.cultivars.map((c) => [c.id, c]));
    this.al = new Map(v.allees.map((a) => [a.id, a]));
  }

  // --- Champs et noms -------------------------------------------------------------------
  vu(c: Champ | null | undefined): string { return !c || !c.v || (c.ebauche && this.o.masquerEbauches) ? '' : c.v; }
  ch(c: Champ | null | undefined): string {
    const t = this.vu(c);
    return !t ? '' : c!.ebauche ? `<em class="ebauche" title="Ébauche à valider">${esc(t)}</em>` : esc(t);
  }
  nom(c: Cultivar | undefined, e?: Emplacement): string {
    if (!c) return e?.statut === 'à planter' ? 'À planter' : 'Sans nom';
    const vern = this.vu(c.nomVernaculaire), cult = this.vu(c.cultivar);
    const lat = this.vu(c.nomLatin);
    return cult ? (vern ? `${vern} '${cult}'` : cult) : vern ? (lat ? `${vern} (${lat})` : vern) : lat || c.id;
  }
  latin(c: Cultivar): string {
    const l = this.vu(c.nomLatin), cult = this.vu(c.cultivar);
    if (!l) return '';
    return `<i${c.nomLatin.ebauche ? ' class="ebauche" title="Ébauche à valider"' : ''}>${esc(l)}</i>${cult ? ` '${esc(cult)}'` : ''}`;
  }
  mode(e: Emplacement, c: Cultivar | undefined): Champ | null {
    const m = this.vu(e.multiplication) ? e.multiplication : c && this.vu(c.multiplication) ? c.multiplication : null;
    return m;
  }
  modeTexte(m: Champ | null): string {
    if (!m) return '';
    const connu = m.v in LETTRES;
    return `<span class="court">${this.ch(connu ? m : { v: `autre (${m.v})`, ebauche: m.ebauche })}</span>`;
  }

  // --- Liens : relatifs en dossier, ancres en fichier unique -----------------------------
  lien(p: string, quoi: 'plan' | 'allee' | 'cultivar' | 'catalogue' | 'rapport' | 'arbre', id = ''): string {
    if (this.o.unique) return quoi === 'arbre' ? `#${encodeURIComponent(id)}` : quoi === 'plan' ? '#plan' : id ? `#${quoi}-${fichier(id)}` : `#${quoi}`;
    switch (quoi) {
      case 'plan': return `${p}index.html`;
      case 'arbre': return `${p}index.html#${encodeURIComponent(id)}`;
      case 'allee': return `${p}allees/${fichier(id)}.html`;
      case 'cultivar': return `${p}cultivars/${fichier(id)}.html`;
      default: return `${p}${quoi}.html`;
    }
  }

  // --- Fiches -----------------------------------------------------------------------------
  lignes(paires: [string, string][]): string {
    const l = paires.filter(([, v]) => v);
    return l.length ? `<dl>${l.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join('')}</dl>` : '';
  }
  pollinisateurs(c: Cultivar): string {
    const col = c.fiche.find((f) => /pollinis/.test(plat(f.libelle)));
    if (!col || !this.vu(col.valeur)) return '';
    const plantes = this.v.cultivars.filter((x) => x.espece === c.espece && x.id !== c.id && this.v.emplacements.some((e) => e.cultivar === x.id && e.statut === 'planté'));
    const trouves = col.valeur.v.split(/,|;|\/| et /).map((n) => rapprocher(n, plantes, (x) => x.cultivar.v)?.cible).filter((x): x is Cultivar => !!x);
    if (!trouves.length) return '';
    return `<p>Pollinisateurs présents dans le verger : ${[...new Set(trouves)].map((x) => `<button type="button" class="voir" data-voir="${esc(`${x.id} ${c.id}`)}">${esc(this.vu(x.cultivar))}</button>`).join(' ')}</p>`;
  }
  ficheCultivar(c: Cultivar): string {
    return this.lignes([
      ['Multiplication', this.modeTexte(this.vu(c.multiplication) ? c.multiplication : null)],
      ['Description', this.ch(c.description)],
      ...c.fiche.map((f): [string, string] => [f.libelle, this.ch(f.valeur)]),
    ]);
  }
  ficheEmplacement(e: Emplacement, p: string): string {
    const c = this.cv.get(e.cultivar), a = this.al.get(e.allee);
    const histo = this.v.emplacements.filter((x) => x.id !== e.id && !estActif(x.statut) && ((x.allee === e.allee && x.position === e.position) || x.id === e.remplace));
    const esp = e.espacement && this.vu(e.espacement) ? e.espacement : a && estActif(e.statut) ? a.espacementDefaut : null;
    let h = `<article class="fiche"><h2>${esc(this.nom(c, e))}</h2>`;
    if (c) h += `<p class="latin">${this.latin(c)}</p>`;
    h += `<p class="lieu">Allée ${a ? `${a.numero} — ${esc(a.nom)}` : esc(e.allee)} · position ${esc(e.position)} · <span class="etat${e.statut === 'à planter' ? ' a-planter' : ''}">${esc(e.statut)}</span> · ${esc(e.id)}</p>`;
    h += this.lignes([
      ['Strate', esc(e.strate)],
      ['Multiplication', this.modeTexte(this.mode(e, c))],
      ['Porte-greffe', this.ch(e.porteGreffe)],
      ['Origine', this.ch(e.origine)],
      ['Plantation', esc(e.datePlantation)],
      ['Retrait', esc(e.dateRetrait)],
      ['Espacement depuis le précédent', esp && this.vu(esp) ? `<span class="court">${this.ch({ v: `${esp.v} m`, ebauche: esp.ebauche })}</span>${esp.ebauche ? ' <small>à vérifier</small>' : ''}` : ''],
      ['Remarque', this.ch(e.remarque)],
    ]);
    if (c) {
      const reste = this.lignes([['Description', this.ch(c.description)], ...c.fiche.map((f): [string, string] => [f.libelle, this.ch(f.valeur)])]);
      h += reste || '<p class="a-completer">Fiche à compléter par l’administrateur</p>';
      h += this.pollinisateurs(c);
      h += `<p><a href="${esc(this.lien(p, 'cultivar', c.id))}">Fiche de la variété</a></p>`;
    }
    if (histo.length)
      h += `<h3>Historique de l'emplacement</h3><ul>${histo.map((x) => `<li>${esc(this.nom(this.cv.get(x.cultivar), x))} — ${esc(x.statut)}${x.datePlantation ? `, planté ${esc(x.datePlantation)}` : ''}${x.dateRetrait ? `, retiré ${esc(x.dateRetrait)}` : ''}</li>`).join('')}</ul>`;
    return `${h}</article>`;
  }
  modeles(liste: Emplacement[], p: string): string {
    return liste.map((e) => `<template id="fiche-${esc(e.id)}">${this.ficheEmplacement(e, p)}</template>`).join('');
  }

  // --- Sections ---------------------------------------------------------------------------
  plan(p: string, allee?: string): string {
    return `<div class="cadre">${dessinerPlan(this.v, {
      allee, echelle: allee ? 22 : 13, etiquettes: !!allee,
      lienAllee: (id) => this.lien(p, 'allee', id),
      nomDe: (c, e) => this.nom(c, e),
      multiplicationDe: (e, c) => this.mode(e, c)?.v ?? '',
      aAssociation: (c) => !!c && c.fiche.some((f) => /associat|repuls|anti-malad/.test(plat(f.libelle)) && this.vu(f.valeur)),
    })}</div>`;
  }
  actifs(allee?: string): Emplacement[] { return this.v.emplacements.filter((e) => estActif(e.statut) && (!allee || e.allee === allee)); }

  sectionPlan(p: string): string {
    const especes = [...new Set(this.actifs().map((e) => this.cv.get(e.cultivar)?.espece).filter((x): x is string => !!x))].map(especeParCle);
    const statuts = [...new Set(this.actifs().map((e) => e.statut))];
    const nbEb = this.o.masquerEbauches ? 0 : compterEbauches(this.v);
    return `<h1>${esc(this.v.nom)}${this.v.lieu ? ` <small>— ${esc(this.v.lieu)}</small>` : ''}</h1>
<div class="outils">
<input type="search" id="recherche" placeholder="Rechercher un arbre…" aria-label="Rechercher un arbre par nom">
<select id="filtre-espece" aria-label="Filtrer par espèce"><option value="">Toutes les espèces</option>${especes.map((x) => `<option value="${esc(x.cle)}">${esc(x.vernaculaire || x.cle)}</option>`).join('')}</select>
${statuts.length > 1 ? `<select id="filtre-statut" aria-label="Filtrer par statut"><option value="">Tous les statuts</option>${statuts.map((x) => `<option>${esc(x)}</option>`).join('')}</select>` : ''}
<label><input type="checkbox" id="voir-badges" checked> Multiplication</label>
<label><input type="checkbox" id="voir-noms"> Noms</label>
<span><button type="button" data-zoom="-" aria-label="Réduire">−</button> <button type="button" data-zoom="0">100 %</button> <button type="button" data-zoom="+" aria-label="Agrandir">+</button></span>
</div>
${this.plan(p)}
<ul class="legende">${especes.map((x) => `<li><i style="background:${x.feuillage};box-shadow:inset 0 0 0 3px ${x.feuillage},inset 0 0 0 9px ${x.fruit}"></i>${esc(x.vernaculaire || x.cle)}</li>`).join('')}</ul>
<ul class="legende">${Object.entries(LETTRES).map(([m, l]) => `<li><b>${l}</b>${m}</li>`).join('')}<li>◌ arbre à planter</li>${nbEb ? '<li><em class="ebauche">italique</em> : ébauche</li>' : ''}</ul>
<h2>Allées</h2>
<ul class="cartes">${this.v.allees.map((a) => `<li><a href="${esc(this.lien(p, 'allee', a.id))}"><strong>Allée ${a.numero}</strong> — ${esc(a.nom)}</a><br><small>${this.actifs(a.id).filter((e) => e.statut === 'planté').length} plantés, ${this.actifs(a.id).filter((e) => e.statut === 'à planter').length} à planter</small></li>`).join('')}</ul>${this.ideesGenerales()}`;
  }

  ideesGenerales(): string {
    const l = this.v.idees.filter((i) => !i.allee);
    return l.length ? `<h2>Idées pour le verger</h2><ul>${l.map((i) => `<li>${esc(i.sujet)} <small>— ${esc([i.type, i.remarque].filter(Boolean).join(', '))}</small></li>`).join('')}</ul>` : '';
  }

  sectionAllee(a: Allee, p: string): string {
    const liste = trierEmplacements(this.v.emplacements.filter((e) => e.allee === a.id));
    const idees = this.v.idees.filter((i) => i.allee === a.id);
    const esp = a.espacementDefaut;
    return `<h1>Allée ${a.numero} — ${esc(a.nom)}</h1>
<p>Espacement par défaut : <span class="court">${this.ch({ v: `${esp.v} m`, ebauche: esp.ebauche })}</span>${esp.ebauche && !this.o.masquerEbauches ? ' <small>(à vérifier)</small>' : ''}. Le haut du plan est le début de l'allée.</p>
${this.plan(p, a.id)}
<h2>Plantes de l'allée</h2>
<div class="table"><table><thead><tr><th data-tri>Position</th><th data-tri>Nom</th><th data-tri>Nom latin</th><th data-tri>Statut</th><th data-tri>Multiplication</th><th>Identifiant</th></tr></thead><tbody>
${liste.map((e) => { const c = this.cv.get(e.cultivar); return `<tr><td>${esc(e.position)}</td><td>${c ? `<a href="${esc(this.lien(p, 'cultivar', c.id))}">${esc(this.nom(c, e))}</a>` : esc(this.nom(c, e))}</td><td>${c ? this.latin(c) : ''}</td><td>${esc(e.statut)}</td><td>${this.modeTexte(this.mode(e, c))}</td><td>${estActif(e.statut) ? `<a href="${esc(this.lien(p, 'arbre', e.id))}">${esc(e.id)}</a>` : esc(e.id)}</td></tr>`; }).join('\n')}
</tbody></table></div>
<h2>Idées pour cette allée</h2>
${idees.length ? `<div class="table"><table><thead><tr><th data-tri>Type</th><th data-tri>Sujet</th><th>Emplacement</th><th data-tri>Priorité</th><th>Remarque</th></tr></thead><tbody>${idees.map((i) => `<tr><td>${esc(i.type)}</td><td>${esc(i.sujet)}</td><td>${esc(i.emplacement)}</td><td>${esc(i.priorite)}</td><td>${esc(i.remarque)}</td></tr>`).join('')}</tbody></table></div>` : '<p>Aucune idée notée (remplacements, évolutions, plantes intercalaires) : feuille « idees » du classeur.</p>'}`;
  }

  sectionCultivar(c: Cultivar, p: string): string {
    const places = this.v.emplacements.filter((e) => e.cultivar === c.id);
    return `<h1>${esc(this.nom(c))}</h1><p class="latin">${this.latin(c)}</p>
${this.ficheCultivar(c) || '<p class="a-completer">Fiche à compléter par l’administrateur</p>'}
<h2>Emplacements</h2>
${places.length ? `<ul>${places.map((e) => { const a = this.al.get(e.allee); return `<li>${estActif(e.statut) ? `<a href="${esc(this.lien(p, 'arbre', e.id))}">${esc(e.id)}</a>` : esc(e.id)} — <a href="${esc(this.lien(p, 'allee', e.allee))}">allée ${a?.numero ?? esc(e.allee)}</a>, position ${esc(e.position)} (${esc(e.statut)})</li>`; }).join('')}</ul>` : '<p>Variété non plantée dans le verger.</p>'}`;
  }

  sectionCatalogue(p: string): string {
    const tri = [...this.v.cultivars].sort((a, b) => plat(this.nom(a)).localeCompare(plat(this.nom(b)), 'fr'));
    return `<h1>Catalogue des variétés</h1><p>${tri.length} variétés, plantées ou non. Cliquer sur un en-tête pour trier.</p>
<div class="table"><table><thead><tr><th data-tri>Nom vernaculaire</th><th data-tri>Cultivar</th><th data-tri>Nom latin</th><th data-tri>Multiplication</th><th data-tri>Plantés</th></tr></thead><tbody>
${tri.map((c) => `<tr><td>${this.ch(c.nomVernaculaire)}</td><td><a href="${esc(this.lien(p, 'cultivar', c.id))}">${this.ch(c.cultivar) || '—'}</a></td><td>${this.vu(c.nomLatin) ? `<i>${this.ch(c.nomLatin)}</i>` : ''}</td><td>${this.modeTexte(this.vu(c.multiplication) ? c.multiplication : null)}</td><td>${this.v.emplacements.filter((e) => e.cultivar === c.id && e.statut === 'planté').length}</td></tr>`).join('\n')}
</tbody></table></div>`;
  }

  sectionRapport(r: Anomalie[]): string {
    const ordre = { erreur: 0, avertissement: 1, info: 2 };
    const tri = [...r].sort((a, b) => ordre[a.niveau] - ordre[b.niveau]);
    const n = (k: Anomalie['niveau']) => r.filter((x) => x.niveau === k).length;
    return `<h1>Rapport d'import</h1><p>${n('erreur')} erreur(s), ${n('avertissement')} avertissement(s), ${n('info')} information(s).</p>
<div class="table"><table><thead><tr><th data-tri>Niveau</th><th data-tri>Type</th><th>Message</th></tr></thead><tbody>
${tri.map((x) => `<tr><td class="niveau-${x.niveau}">${x.niveau}</td><td>${esc(x.code)}</td><td>${esc(x.message)}</td></tr>`).join('\n')}
</tbody></table></div>`;
  }

  // --- Gabarit ----------------------------------------------------------------------------
  page(titre: string, p: string, corps: string, courant: string): string {
    const nav: [string, string, string][] = [['plan', 'Plan', this.lien(p, 'plan')], ['catalogue', 'Catalogue', this.lien(p, 'catalogue')]];
    if (this.o.rapport) nav.push(['rapport', 'Rapport', this.lien(p, 'rapport')]);
    const logo = !this.o.sansLogo;
    const nb = v1Pluriel(nombre(String(this.v.nordDeg)) ?? 0);
    return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'">
<meta name="generator" content="Pomone">
<title>${esc(titre)}</title>${logo ? `<link rel="icon" href="${LOGO}">` : ''}<style>${STYLE}</style></head>
<body><header class="bandeau">${logo ? `<img src="${LOGO}" alt="">` : ''}<div class="titre">${esc(this.v.nom)}<small>${esc(this.v.lieu)}</small></div>
<nav aria-label="Pages">${nav.map(([k, l, h]) => `<a href="${esc(h)}"${k === courant ? ' aria-current="page"' : ''}>${l}</a>`).join('')}</nav></header>
<main>${corps}</main>
<aside id="panneau" hidden aria-label="Fiche"><button type="button" class="fermer" aria-label="Fermer la fiche">Fermer ✕</button><div id="panneau-contenu" aria-live="polite"></div></aside>
<footer>${esc(this.v.nom)}${this.v.auteur ? ` · ${esc(this.v.auteur)}` : ''} · allées orientées à ${nb} du nord${this.o.date ? ` · généré le ${esc(this.o.date)}` : ''} · réalisé avec Pomone${logo ? ' · logo : CC BY-NC-SA 3.0' : ''}</footer>
<script>${SCRIPT}</script></body></html>
`;
  }

  generer(): FichierSite[] {
    const v = this.v, actifs = this.actifs();
    if (this.o.unique) {
      const s = (id: string, corps: string) => `<section class="page" id="${id}">${corps}</section>`;
      const corps = [
        s('plan', this.sectionPlan('')),
        ...v.allees.map((a) => s(`allee-${fichier(a.id)}`, this.sectionAllee(a, '').replace(/<svg class="plan/, '<svg class="plan allee'))),
        s('catalogue', this.sectionCatalogue('')),
        ...v.cultivars.map((c) => s(`cultivar-${fichier(c.id)}`, this.sectionCultivar(c, ''))),
        ...(this.o.rapport ? [s('rapport', this.sectionRapport(this.o.rapport))] : []),
        this.modeles(actifs, ''),
      ].join('\n');
      return [{ chemin: 'verger.html', contenu: this.page(v.nom, '', corps, 'plan') }];
    }
    const f: FichierSite[] = [{ chemin: 'index.html', contenu: this.page(v.nom, '', this.sectionPlan('') + this.modeles(actifs, ''), 'plan') }];
    for (const a of v.allees)
      f.push({ chemin: `allees/${fichier(a.id)}.html`, contenu: this.page(`Allée ${a.numero} — ${v.nom}`, '../', this.sectionAllee(a, '../') + this.modeles(this.actifs(a.id), '../'), '') });
    for (const c of v.cultivars)
      f.push({ chemin: `cultivars/${fichier(c.id)}.html`, contenu: this.page(`${this.nom(c)} — ${v.nom}`, '../', this.sectionCultivar(c, '../'), '') });
    f.push({ chemin: 'catalogue.html', contenu: this.page(`Catalogue — ${v.nom}`, '', this.sectionCatalogue(''), 'catalogue') });
    if (this.o.rapport) f.push({ chemin: 'rapport.html', contenu: this.page(`Rapport — ${v.nom}`, '', this.sectionRapport(this.o.rapport), 'rapport') });
    return f;
  }
}

const v1Pluriel = (deg: number): string => `${Math.round(deg * 10) / 10}°`;

/** Produit les pages HTML autonomes du verger : un dossier, ou un fichier unique. */
export function genererSite(v: Verger, o: OptionsSite = {}): FichierSite[] {
  return new Site(v, o).generer();
}
