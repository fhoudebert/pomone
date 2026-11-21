/**
 * Haies : rangs posés sur un côté des allées. Le classeur est construit ici, en mémoire ;
 * le verger d'exemple n'a pas de haie.
 */
import * as X from 'xlsx';
import { describe, expect, it } from 'vitest';
import { disposer, ecrireClasseur, estHaie, genererSite, lireClasseur } from '../src/index';
import { lireExemple } from './exemple';

const ECART = 6;

function classeurAvecHaies(): Uint8Array {
  const wb = X.utils.book_new();
  const feuille = (nom: string, lignes: unknown[][]) => X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(lignes), nom);
  feuille('verger', [['cle', 'valeur'], ['nom', 'Verger à haies'], ['nord_deg', 0], ['ecart_allees_m', ECART]]);
  feuille('allees', [
    ['id', 'numero', 'nom', 'espacement_defaut_m', 'type', 'cote', 'distance_m'],
    ['A1', 1, 'Pommiers', 5, null, null, null],
    ['A2', 2, 'Poiriers', 5, 'allée', null, null],
    ['HN', null, 'Petits fruits', 2, 'Haie', 'haut', null],
    ['HN2', null, 'Haie double', 2, 'haie', 'haut', 3],
    ['HS', null, 'Haie du sud', 2, 'haie', 'bas', null],
    ['HO', null, 'Framboisiers', 2, 'haie', 'gauche', 8],
    ['HE', null, 'Haie de l’est', 2, 'haie', 'droite', null],
  ]);
  const p = (id: string, allee: string, position: string, cultivar: string, strate = 'arbre') => [id, allee, position, cultivar, 'planté', strate];
  feuille('emplacements', [
    ['id', 'allee', 'position', 'cultivar', 'statut', 'strate'],
    p('A1-1', 'A1', '1', 'pommier'), p('A1-2', 'A1', '2', 'pommier'), p('A1-3', 'A1', '3', 'pommier'),
    p('A2-1', 'A2', '1', 'poirier'), p('A2-2', 'A2', '2', 'poirier'),
    p('HN-1', 'HN', '1', 'cassis', 'petit fruit'), p('HN-2', 'HN', '2', 'cassis', 'petit fruit'), p('HN-3', 'HN', '3', 'cassis', 'petit fruit'),
    p('HO-1', 'HO', '1', 'framboise', 'petit fruit'), p('HO-2', 'HO', '2', 'framboise', 'petit fruit'),
    p('HE-1', 'HE', '1', 'cassis', 'petit fruit'),
  ]);
  feuille('cultivars', [
    ['id', 'nom_latin', 'cultivar', 'nom_vernaculaire', 'espece'],
    ['pommier', 'Malus domestica', 'Melrose', 'Pommier', 'pommier'], ['poirier', 'Pyrus communis', 'Conférence', 'Poirier', 'poirier'],
    ['cassis', 'Ribes nigrum', 'Noir de Bourgogne', 'Cassissier', 'cassissier'], ['framboise', 'Rubus idaeus', 'Heritage', 'Framboisier', 'framboisier'],
  ]);
  return new Uint8Array(X.write(wb, { type: 'array', bookType: 'xlsx' }));
}

describe('haies', () => {
  const { verger, rapport } = lireClasseur(classeurAvecHaies());
  const rang = (id: string) => verger.allees.find((a) => a.id === id)!;
  const disp = disposer(verger);
  const place = (id: string) => disp.places.find((p) => p.e.id === id)!;
  const bande = (id: string) => disp.bandes.find((b) => b.haie.id === id)!;
  const [x1, x2] = [0.5 * ECART, 1.5 * ECART]; // axes des deux allées

  it('se déclarent dans la feuille allees : type, côté, distance', () => {
    expect(rapport.filter((a) => a.niveau !== 'info')).toEqual([]);
    expect(verger.allees.filter(estHaie).map((a) => [a.id, a.cote])).toEqual([['HN', 'haut'], ['HN2', 'haut'], ['HS', 'bas'], ['HO', 'gauche'], ['HE', 'droite']]);
    expect(rang('A1').type).toBe('allée');
    expect(rang('HO').distance?.v).toBe('8');
    expect(rang('HN').distance).toBeNull();
  });

  it('se placent à 10 m par défaut du bout des allées ou de l’allée voisine, empilées vers l’extérieur', () => {
    expect(bande('HN')).toMatchObject({ y1: -10, y2: -10, x1: 0, vide: false });
    expect(bande('HN2')).toMatchObject({ y1: -13, vide: true }); // 3 m au-delà de la première haie du haut
    expect(bande('HS').y1).toBe(disp.hauteur + 10);
    expect(bande('HO')).toMatchObject({ x1: x1 - 8, y1: 0 });
    expect(bande('HE').x1).toBe(x2 + 10);
  });

  it('suivent leurs plantes de gauche à droite (haut, bas) ou de haut en bas (côtés)', () => {
    expect(['HN-1', 'HN-2', 'HN-3'].map((id) => [place(id).x, place(id).y])).toEqual([[1, -10], [3, -10], [5, -10]]);
    expect(['HO-1', 'HO-2'].map((id) => [place(id).x, place(id).y])).toEqual([[x1 - 8, 1], [x1 - 8, 3]]);
    expect(place('A1-1')).toMatchObject({ x: x1, y: 2.5 }); // les allées ne bougent pas
  });

  it('couvrent toute la largeur des allées, et s’allongent si elles sont plus longues', () => {
    expect(bande('HS').x2).toBe(disp.largeur);
    expect(bande('HO').y2).toBe(disp.hauteur);
  });

  it('n’ont pas de numéro dans le pied du plan et sont nommées sur le plan', () => {
    const index = genererSite(verger)[0]!.contenu;
    expect(index.match(/class="pied numero"/g)).toHaveLength(2);
    expect(index.match(/<g class="haie( vide)?" data-haie=/g)).toHaveLength(5);
    expect(index).toContain('<g class="haie vide" data-haie="HS">');
    expect(index).toContain('>Haie double (vide)</text>'); // nom commençant par « Haie » : pas de « Haie — Haie »
    expect(index).toContain('>Haie — Petits fruits</text>');
  });

  it('ont leur groupe dans la liste, leur page et leur nom dans les fiches', () => {
    const pages = genererSite(verger);
    const index = pages[0]!.contenu, page = pages.find((f) => f.chemin === 'allees/HO.html')!.contenu;
    expect(index).toContain('<h2>Haies</h2>');
    expect(page).toContain('<h1>Haie — Framboisiers</h1>');
    expect(page).toMatch(/à gauche, à <span class="court">8 m<\/span> de l'allée voisine/);
    expect(index).toMatch(/Haie — Framboisiers · position 1/);
    expect(genererSite(verger).find((f) => f.chemin === 'allees/HN2.html')!.contenu).toContain('de la haie précédente');
  });

  it('survivent à un aller-retour par le classeur', () => {
    expect(lireClasseur(ecrireClasseur(verger)).verger.allees).toEqual(verger.allees);
  });

  it('signalent un type ou un côté hors liste', () => {
    const v = structuredClone(verger);
    v.allees[0]!.type = 'bordure';
    v.allees[1]!.cote = 'gauche';
    v.allees[2]!.cote = 'nord';
    const codes = lireClasseur(ecrireClasseur(v)).rapport.map((a) => a.code);
    expect(codes).toEqual(expect.arrayContaining(['type-rang', 'cote']));
    expect(codes.filter((c) => c === 'cote')).toHaveLength(1); // le côté d'une allée n'est pas écrit
  });

  it('sont absentes d’un classeur qui ne les déclare pas', () => {
    const { verger: v } = lireExemple();
    expect(v.allees.every((a) => a.type === 'allée')).toBe(true);
    expect(disposer(v).bandes).toEqual([]);
  });
});
