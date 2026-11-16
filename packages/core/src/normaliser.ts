import { type Champ, champ } from './types';

/** Minuscules sans accents ni ligatures. */
export function plat(s: string): string {
  return s.replace(/[œŒ]/g, 'oe').replace(/[æÆ]/g, 'ae').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Harmonise les apostrophes : typographiques → droites, guillemets de cultivar orphelins retirés. */
export function nettoyer(s: string): string {
  return String(s ?? '')
    .replace(/[‘’ʼ`´]/g, "'")
    .replace(/ /g, ' ')
    .replace(/[®™]/g, '')
    .replace(/(^|[\s(])'+/g, '$1')
    .replace(/'+(?=[\s)]|$)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const MOTS_VIDES = new Set(['de', 'du', 'des', 'd', 'la', 'le', 'l', 'a', 'au']);

/** Clé de rapprochement : insensible aux accents, à la casse, aux apostrophes et aux mots de liaison. */
export function cle(s: string): string {
  return jetons(s).join(' ');
}

export function jetons(s: string): string[] {
  return plat(nettoyer(s).replace(/\(.*?\)/g, ' '))
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((m) => m && !MOTS_VIDES.has(m));
}

export function slug(s: string): string {
  return plat(nettoyer(s)).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function levenshtein(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0]![j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length]![b.length]!;
}

/** « ~texte » dans le classeur = ébauche à valider. */
export function lireChamp(brut: unknown): Champ {
  const s = String(brut ?? '').replace(/ /g, ' ').trim();
  return s.startsWith('~') ? champ(s.slice(1).trim(), true) : champ(s, false);
}

export const ecrireChamp = (c: Champ | null): string => (!c || !c.v ? '' : c.ebauche ? `~${c.v}` : c.v);

/** Compare deux positions « 1 », « 1.2 », « 1.10 » segment par segment, comme des entiers. */
export function comparerPositions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

export const positionValide = (p: string): boolean => /^\d+(\.\d+)*$/.test(p);

/** Met une majuscule aux mots d'un nom saisi tout en minuscules. */
export function capitaliser(s: string): string {
  if (s !== s.toLowerCase()) return s;
  return s.replace(/[^\s'-]+/g, (m, i: number) => (i > 0 && MOTS_VIDES.has(plat(m)) ? m : m.charAt(0).toUpperCase() + m.slice(1)));
}

export function nombre(brut: unknown): number | null {
  if (brut === null || brut === undefined || brut === '') return null;
  const n = typeof brut === 'number' ? brut : parseFloat(String(brut).replace('~', '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}
