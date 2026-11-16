import { especeParCle } from '../especes';
import { estActif, trierEmplacements } from '../lecture';
import { nombre, plat } from '../normaliser';
import type { Cultivar, Decoration, Emplacement, Verger } from '../types';

export const esc = (s: unknown): string => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export const LETTRES: Record<string, string> = { greffage: 'G', semis: 'S', bouture: 'B', marcotte: 'M', drageon: 'D' };

export interface Place { e: Emplacement; x: number; y: number; r: number }
export interface Disposition { places: Place[]; largeur: number; hauteur: number; ecart: number; xAllee: Map<string, number> }

const RAYONS: Record<string, number> = { arbuste: 1.1, 'petit fruit': 0.7, 'plante basse': 0.45 };

/**
 * Place les plantes actives en mètres, allées verticales : x = allée, y = cumul des
 * espacements depuis le haut. Origine (0, 0) en haut à gauche de la première allée.
 */
export function disposer(v: Verger, seuleAllee?: string): Disposition {
  const ecart = nombre(v.ecartAllees.v) ?? 6;
  const allees = v.allees.filter((a) => !seuleAllee || a.id === seuleAllee);
  const places: Place[] = [];
  const xAllee = new Map<string, number>();
  let hauteur = 0;
  allees.forEach((a, i) => {
    const x = (i + 0.5) * ecart;
    xAllee.set(a.id, x);
    const def = nombre(a.espacementDefaut.v) ?? 5;
    const rArbre = Math.min(0.36 * def, 0.42 * ecart, 2.4);
    let y = 0, prec: Emplacement | null = null;
    for (const e of trierEmplacements(v.emplacements.filter((p) => p.allee === a.id && estActif(p.statut)))) {
      const pas = nombre(e.espacement?.v) ?? def * (prec && (e.strate !== 'arbre' || prec.strate !== 'arbre') ? 0.5 : 1);
      y += prec ? pas : def / 2;
      places.push({ e, x, y, r: RAYONS[e.strate] ?? rArbre });
      prec = e;
    }
    hauteur = Math.max(hauteur, y + def / 2);
  });
  return { places, largeur: Math.max(1, allees.length) * ecart, hauteur: Math.max(hauteur, 5), ecart, xAllee };
}

/** Générateur pseudo-aléatoire déterministe : le même arbre a toujours la même silhouette. */
function alea(graine: string): () => number {
  let h = 2166136261;
  for (const c of graine) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

const n1 = (x: number): string => (Math.round(x * 10) / 10).toString();

function couronne(cx: number, cy: number, r: number, rnd: () => number): string {
  const n = 13;
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * 2 * Math.PI, rr = r * (0.86 + 0.22 * rnd());
    return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)] as const;
  });
  const mi = (a: readonly [number, number], b: readonly [number, number]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] as const;
  const m0 = mi(pts[n - 1]!, pts[0]!);
  let d = `M${n1(m0[0])} ${n1(m0[1])}`;
  for (let i = 0; i < n; i++) { const m = mi(pts[i]!, pts[(i + 1) % n]!); d += `Q${n1(pts[i]![0])} ${n1(pts[i]![1])} ${n1(m[0])} ${n1(m[1])}`; }
  return d + 'Z';
}

export interface OptionsPlan {
  allee?: string;
  echelle?: number;
  /** Étiquettes complètes à droite des arbres (page d'allée). */
  etiquettes?: boolean;
  lienAllee: (id: string) => string;
  nomDe: (c: Cultivar | undefined, e: Emplacement) => string;
  multiplicationDe: (e: Emplacement, c: Cultivar | undefined) => string;
  aAssociation: (c: Cultivar | undefined) => boolean;
}

function decor(d: Decoration, k: number, X: (m: number) => number, Y: (m: number) => number): string {
  const x = X(d.x), y = Y(d.y), lib = d.libelle ? `<text class="decor-nom" x="${n1(x)}" y="${n1(y + (d.rayon ?? 0.8) * k + 11)}" text-anchor="middle">${esc(d.libelle)}</text>` : '';
  const pts = d.points.map(([px, py]) => `${n1(X(px))},${n1(Y(py))}`).join(' ');
  const L = (d.largeur ?? 1.5) * k, H = (d.hauteur ?? 1) * k, R = (d.rayon ?? 0.8) * k;
  let forme: string;
  switch (d.type) {
    case 'point_eau': forme = `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(R)}" fill="#bfe3f5" stroke="#2f7fb0" stroke-width="1.5"/><path d="M${n1(x)} ${n1(y - R * 0.55)}q${n1(R * 0.45)} ${n1(R * 0.6)} 0 ${n1(R * 0.95)}q${n1(-R * 0.45)} ${n1(-R * 0.35)} 0 ${n1(-R * 0.95)}z" fill="#2f7fb0"/>`; break;
    case 'mare': forme = `<ellipse cx="${n1(x)}" cy="${n1(y)}" rx="${n1(R * 1.15)}" ry="${n1(R)}" fill="#a9d6ee" stroke="#2f7fb0" stroke-width="1.5"/>`; break;
    case 'ruche': forme = `<rect x="${n1(x - 6)}" y="${n1(y - 6)}" width="12" height="12" rx="2" fill="#f2c94c" stroke="#8a6a1c"/><path d="M${n1(x - 6)} ${n1(y - 2)}h12M${n1(x - 6)} ${n1(y + 2)}h12" stroke="#8a6a1c"/>`; break;
    case 'composteur': case 'banc': case 'abri': forme = `<rect x="${n1(x)}" y="${n1(y)}" width="${n1(L)}" height="${n1(H)}" rx="2" fill="${d.type === 'composteur' ? '#8d6e4a' : '#c9b08a'}" stroke="#5d4630"/>`; break;
    case 'chemin': forme = `<polyline points="${pts}" fill="none" stroke="#d8c08a" stroke-width="${n1((d.largeur ?? 1.2) * k)}" stroke-linecap="round" stroke-linejoin="round"/>`; break;
    case 'haie': forme = `<polyline points="${pts}" fill="none" stroke="#4f7f3a" stroke-width="${n1((d.largeur ?? 1) * k)}" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1 ${n1(k * 0.9)}"/>`; break;
    case 'cloture': forme = `<polyline points="${pts}" fill="none" stroke="#6b5a45" stroke-width="1.5" stroke-dasharray="6 4"/>`; break;
    case 'texte': return `<text class="decor-texte" x="${n1(x)}" y="${n1(y)}" text-anchor="middle">${esc(d.libelle)}</text>`;
    default: forme = `<circle cx="${n1(x)}" cy="${n1(y)}" r="4" fill="#555"/>`;
  }
  const ligne = d.points.length > 0;
  const nom = ligne && d.libelle ? `<text class="decor-nom" x="${n1(X(d.points[0]![0]))}" y="${n1(Y(d.points[0]![1]) - 6)}">${esc(d.libelle)}</text>` : lib;
  return `<g class="decor" data-type="${esc(d.type)}"><title>${esc(d.libelle || d.type)}</title>${forme}${nom}</g>`;
}

/** Dessine le plan en SVG : allées verticales, couronnes vues de dessus, flèche du nord. */
export function dessinerPlan(v: Verger, o: OptionsPlan): string {
  const k = o.echelle ?? 13;
  const disp = disposer(v, o.allee);
  const cv = new Map(v.cultivars.map((c) => [c.id, c]));
  const allees = v.allees.filter((a) => !o.allee || a.id === o.allee);

  // Les décorations peuvent déborder de la zone des allées : le cadre s'agrandit.
  const decors = o.allee ? [] : v.decorations;
  const xs = [0, disp.largeur], ys = [0, disp.hauteur];
  for (const d of decors) {
    const m = Math.max(d.rayon ?? 1, d.largeur ?? 0, d.hauteur ?? 0) + 1;
    xs.push(d.x - m, d.x + m); ys.push(d.y - m, d.y + m);
    for (const [px, py] of d.points) { xs.push(px - 1, px + 1); ys.push(py - 1, py + 1); }
  }
  const minX = Math.min(...xs), minY = Math.min(...ys);
  const mg = 24, mgG = o.allee ? 24 : 82, haut = 72, bas = 44, droite = o.etiquettes ? 300 : 0;
  const X = (m: number) => mgG + (m - minX) * k, Y = (m: number) => haut + (m - minY) * k;
  const W = mg + mgG + (Math.max(...xs) - minX) * k + droite, H = haut + (Math.max(...ys) - minY) * k + bas;
  const yBas = Y(disp.hauteur);

  let s = `<svg class="plan${o.etiquettes ? ' avec-noms' : ''}" viewBox="0 0 ${n1(W)} ${n1(H)}" width="${n1(W)}" height="${n1(H)}" role="group" aria-label="Plan ${o.allee ? "de l'allée" : 'du verger'} ${esc(o.allee ? allees[0]?.nom : v.nom)}">`;
  s += `<rect width="${n1(W)}" height="${n1(H)}" rx="10" fill="#7fa650"/>`;
  allees.forEach((a, i) => {
    const x0 = X(i * disp.ecart);
    s += `<rect x="${n1(x0)}" y="${n1(Y(0))}" width="${n1(disp.ecart * k)}" height="${n1(yBas - Y(0))}" fill="${i % 2 ? '#93b563' : '#9cbd69'}"/>`;
  });
  for (let i = 0; i <= allees.length; i++)
    s += `<line x1="${n1(X(i * disp.ecart))}" y1="${n1(Y(0))}" x2="${n1(X(i * disp.ecart))}" y2="${n1(yBas)}" stroke="#b6975a" stroke-width="${n1(Math.max(3, k * 0.45))}"/>`;

  s += decors.filter((d) => d.type === 'chemin' || d.type === 'haie' || d.type === 'cloture' || d.type === 'mare').map((d) => decor(d, k, X, Y)).join('');

  // Plantes compagnes : un petit massif entre deux arbres quand la fiche mentionne des associations.
  disp.places.forEach((p, i) => {
    const suiv = disp.places[i + 1];
    if (!suiv || suiv.e.allee !== p.e.allee || p.e.strate !== 'arbre' || suiv.e.strate !== 'arbre' || !o.aAssociation(cv.get(p.e.cultivar))) return;
    const rnd = alea(`c${p.e.id}`), my = (p.y + p.r + suiv.y - suiv.r) / 2;
    s += `<path class="compagne" aria-hidden="true" d="${couronne(X(p.x), Y(my), Math.min(0.5, (suiv.y - suiv.r - p.y - p.r) / 2) * k, rnd)}" fill="${rnd() > 0.5 ? '#b9c765' : '#a8c7b0'}" stroke="#55703a" stroke-width="0.8"/>`;
  });

  for (const p of disp.places) {
    const c = cv.get(p.e.cultivar), esp = especeParCle(c?.espece ?? ''), x = X(p.x), y = Y(p.y), r = p.r * k;
    const nom = o.nomDe(c, p.e), mode = o.multiplicationDe(p.e, c);
    const etat = p.e.statut === 'à planter' ? ' a-planter' : c && !c.fiche.length && !c.description.v ? ' sans-fiche' : '';
    s += `<g class="plante${etat}" tabindex="0" role="button" data-fiche="${esc(p.e.id)}" data-espece="${esc(c?.espece ?? '')}" data-cultivar="${esc(p.e.cultivar)}" data-statut="${esc(p.e.statut)}" data-nom="${esc(plat(`${nom} ${c?.nomLatin.v ?? ''} ${p.e.id}`))}" aria-label="${esc(o.etiquettes ? `${p.e.position} ${nom}, ${p.e.statut}` : `${nom}, position ${p.e.position}, ${p.e.statut}`)}">`;
    s += `<title>${esc(nom)} — ${esc(p.e.id)}</title>`;
    if (p.e.statut === 'à planter') {
      s += `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(r * 0.85)}" fill="#fff" fill-opacity="0.25" stroke="#3d5a26" stroke-width="1.6" stroke-dasharray="5 4"/>`;
      s += `<path d="M${n1(x - 5)} ${n1(y)}h10M${n1(x)} ${n1(y - 5)}v10" stroke="#3d5a26" stroke-width="1.8"/>`;
    } else {
      const rnd = alea(p.e.id);
      s += `<path d="${couronne(x, y, r, rnd)}" fill="${esp.feuillage}" stroke="#2e4a1f" stroke-width="1.4"/>`;
      s += `<path d="${couronne(x - r * 0.12, y - r * 0.12, r * 0.55, rnd)}" fill="#fff" fill-opacity="0.13"/>`;
      const nf = p.e.strate === 'arbre' ? 8 : 4;
      for (let i = 0; i < nf; i++) {
        const a = rnd() * 6.283, d = r * (0.2 + 0.55 * rnd());
        s += `<circle cx="${n1(x + d * Math.cos(a))}" cy="${n1(y + d * Math.sin(a))}" r="${n1(Math.max(1.3, k * 0.13))}" fill="${esp.fruit}" stroke="#0003" stroke-width="0.4"/>`;
      }
    }
    if (o.etiquettes) s += `<text class="etiquette" x="${n1(x + Math.max(r, 16) + 12)}" y="${n1(y + 4)}"><tspan class="pos">${esc(p.e.position)}</tspan> ${esc(nom)}</text>`;
    else s += `<text class="nom" x="${n1(x)}" y="${n1(y + r + 9)}" text-anchor="middle">${esc(nom.slice(0, 22))}</text>`;
    s += '</g>';
    // Le badge est dessiné hors du bouton : son texte ne doit pas entrer dans le nom accessible.
    if (mode) {
      const bx = x + r * 0.72, by = y - r * 0.72;
      s += `<g class="badge" aria-hidden="true"><circle cx="${n1(bx)}" cy="${n1(by)}" r="7" fill="#fffdf5" stroke="#5a4a2a"/><text x="${n1(bx)}" y="${n1(by + 3.4)}" text-anchor="middle">${esc(LETTRES[mode] ?? '?')}</text></g>`;
    }
  }

  s += decors.filter((d) => !['chemin', 'haie', 'cloture', 'mare'].includes(d.type)).map((d) => decor(d, k, X, Y)).join('');

  // Pied de plan : « Allée : 1 2 3 », comme sur le schéma d'origine.
  if (!o.allee) {
    s += `<text class="pied" x="${n1(X(0) - 10)}" y="${n1(yBas + 28)}" text-anchor="end">Allée :</text>`;
    allees.forEach((a, i) => {
      s += `<a href="${esc(o.lienAllee(a.id))}"><title>${esc(a.nom)}</title><text class="pied numero" x="${n1(X((i + 0.5) * disp.ecart))}" y="${n1(yBas + 28)}" text-anchor="middle">${a.numero}</text></a>`;
    });
  }
  // Barre d'échelle et flèche du nord (allées d'azimut nordDeg : le nord est tourné d'autant vers la gauche).
  s += `<g class="echelle"><path d="M${n1(X(minX))} 44h${n1(5 * k)}M${n1(X(minX))} 39v10M${n1(X(minX) + 5 * k)} 39v10" stroke="#243816" stroke-width="1.5" fill="none"/><text x="${n1(X(minX) + 2.5 * k)}" y="35" text-anchor="middle">5 m</text></g>`;
  const nx = W - mg - 18;
  s += `<g class="nord" transform="translate(${n1(nx)} 42) rotate(${n1(-v.nordDeg)})"><title>Nord (allées orientées à ${n1(v.nordDeg)}° du nord)</title><path d="M0 -20L7 12L0 6L-7 12Z" fill="#243816"/><text y="-23" text-anchor="middle">N</text></g>`;
  return s + '</svg>';
}
