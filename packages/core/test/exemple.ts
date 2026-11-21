/**
 * Le classeur d'exemple, en un seul endroit pour les tests unitaires et les essais en navigateur.
 * Les tests tirent identifiants et effectifs du classeur lui-même : modifier le verger ne les casse pas.
 */
import { readFileSync } from 'node:fs';
import { estActif, lireClasseur, trierEmplacements, type Cultivar, type Emplacement, type Lecture } from '../src/index';

export const EXEMPLE = 'exemples/verger-arboretum.xlsx';

export const lireExemple = (): Lecture => lireClasseur(new Uint8Array(readFileSync(EXEMPLE)));

/** Plantes actives (plantées ou à planter), dans l'ordre des allées puis des positions. */
export function actifs(l: Lecture): Emplacement[] {
  return l.verger.allees.flatMap((a) => trierEmplacements(l.verger.emplacements.filter((e) => e.allee === a.id && estActif(e.statut))));
}

/** Premier arbre planté dont le cultivar a une fiche renseignée. */
export function arbreAvecFiche(l: Lecture): { e: Emplacement; c: Cultivar } {
  for (const e of actifs(l)) {
    const c = l.verger.cultivars.find((x) => x.id === e.cultivar);
    if (c && e.statut === 'planté' && c.cultivar.v && c.fiche.length) return { e, c };
  }
  throw new Error(`${EXEMPLE} : aucun arbre planté avec une fiche`);
}
