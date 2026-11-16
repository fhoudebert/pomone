import { GENRES, devinerEspece } from './especes';
import { capitaliser, jetons, levenshtein, nettoyer, plat } from './normaliser';

export interface NomAnalyse { latin: string; espece: string; cultivar: string }

const PREFIXES = /^(cerises?|cerisiers?|figues?|figuiers?|grenadiers?|grenades?|pommes?|pommiers?|poires?|poiriers?)\s+(?!d['e])/i;

/** Sépare « Malus domestica 'Melrose' », « Cerise belle magnifique », « figue noire de Bellone »… */
export function analyserNom(brut: string): NomAnalyse {
  let t = nettoyer(brut).replace(/\s*\(.*?\)\s*/g, ' ').trim();
  const espece = devinerEspece(t)?.cle ?? '';
  let latin = '';
  const m = /^([A-Z][a-z]+)(?:\s+([a-z×][a-z-]+))?(?:\s+|$)/.exec(t);
  if (m && GENRES.has(m[1]!.toLowerCase())) {
    latin = m[2] ? `${m[1]} ${m[2]}` : '';
    t = t.slice(m[0].length).trim();
  } else {
    t = t.replace(PREFIXES, '').trim();
  }
  return { latin, espece, cultivar: capitaliser(t) };
}

export interface Rapprochement<T> { cible: T; exact: boolean }

/**
 * Retrouve un nom parmi des candidats : clé identique, sinon jetons de l'un inclus dans
 * l'autre (« Bigarreau Noir de Meched » / « Noir de Meched »), sinon faute de frappe (≤ 2).
 */
export function rapprocher<T>(nom: string, candidats: T[], nomDe: (c: T) => string): Rapprochement<T> | null {
  const j = jetons(nom);
  if (!j.length) return null;
  const k = j.join(' ');
  const liste = candidats.map((c) => ({ c, j: jetons(nomDe(c)) })).filter((x) => x.j.length);
  const exact = liste.find((x) => x.j.join(' ') === k);
  if (exact) return { cible: exact.c, exact: true };
  const inclus = liste.filter((x) => x.j.every((m) => j.includes(m)) || j.every((m) => x.j.includes(m)));
  if (inclus.length === 1) return { cible: inclus[0]!.c, exact: false };
  let meilleur: { c: T; d: number } | null = null;
  for (const x of liste) {
    const autre = x.j.join(' ');
    const d = levenshtein(k, autre);
    if (d <= 2 && d < Math.min(k.length, autre.length) / 4 && (!meilleur || d < meilleur.d)) meilleur = { c: x.c, d };
  }
  return meilleur ? { cible: meilleur.c, exact: false } : null;
}

export const memeEcriture = (a: string, b: string): boolean => plat(nettoyer(a)) === plat(nettoyer(b)) && nettoyer(a) === nettoyer(b);
