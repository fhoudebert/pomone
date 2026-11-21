/**
 * Lecteur du format d'origine (feuille « allées » en colonnes appariées, une feuille de fiches par
 * espèce). Le classeur est construit ici, en mémoire, avec les défauts rencontrés dans les vrais
 * fichiers : aucun test ne dépend d'un classeur d'origine présent dans le dépôt.
 */
import * as X from 'xlsx';
import { describe, expect, it } from 'vitest';
import { ecrireClasseur, lireClasseur } from '../src/index';

function classeurOrigine(): Uint8Array {
  const wb = X.utils.book_new();
  const feuille = (nom: string, lignes: unknown[][]) => X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(lignes), nom);
  feuille('allées', [
    ['1-Cerisiers', null, '2-pruniers', null, '2-poiriers', null, '4-pommiers', null, '5-noyers', null],
    ['Cultivar', 'Espacement', 'Cultivar', 'Espacement', 'Cultivar', 'Espacement', 'Cultivar', 'Espacement', 'Cultivar', 'Espacement'],
    ['Bigarreau Napoléon', 5, 'Reine Claude Verte', null, "Beurré Hardy'", null, 'Reinette Dorée de Virty', null, 'Juglans regia', null],
    ['Bigarreau Noir de Meched', null, null, null, 'Doyenne De Comice', null, "Malus domestica 'Melrose", null, 'Juglans nigra', null],
    [null, null, 'Mirabelle de Nancy', null, null, null, null, null, null, null],
  ]);
  feuille('poires', [
    ['Cultivar', 'Floraison', 'Pollinisateurs recommandés', 'multiplication', 'description'],
    ['Beurré Hardy', 'mi-saison', 'Doyenné du Comice', 'greffage', null],
    ['Doyenné du Comice', 'tardive', 'Beurré Hardy', 'greffage', null],
    [null, null, null, null, null],
    ['Candidats', null, null, null, null],
    ['Comtesse de Paris, floraison tardive contre le gel', null, null, null, null],
  ]);
  // Deux tableaux côte à côte, séparés par une colonne vide.
  feuille('Cerisiers', [
    ['Cultivar', 'Récolte', null, 'Cultivar', 'Porte-greffe'],
    ['Bigarreau Napoléon', 'juillet', null, 'Bigarreau Napoléon', 'merisier'],
    ['Noir de Meched', 'juin', null, null, null],
  ]);
  feuille('pommes', [['Cultivar', 'Récolte'], ['Reinette Dorée de Vitry', 'octobre'], ['Melrose', 'octobre']]);
  return new Uint8Array(X.write(wb, { type: 'array', bookType: 'xlsx' }));
}

describe("classeur au format d'origine", () => {
  const { verger, rapport, format } = lireClasseur(classeurOrigine());
  const codes = (code: string) => rapport.filter((a) => a.code === code).map((a) => a.message);
  const cultivarDe = (id: string) => verger.cultivars.find((c) => c.id === verger.emplacements.find((e) => e.id === id)?.cultivar);

  it('est reconnu et lu sans erreur', () => {
    expect(format).toBe('ebauche');
    expect(rapport.filter((a) => a.niveau === 'erreur')).toEqual([]);
  });
  it("renumérote les allées dans l'ordre des colonnes et le signale", () => {
    expect(verger.allees.map((a) => [a.id, a.nom])).toEqual([['A1', 'Cerisiers'], ['A2', 'Pruniers'], ['A3', 'Poiriers'], ['A4', 'Pommiers'], ['A5', 'Noyers']]);
    expect(codes('numero-allee')).toEqual([expect.stringContaining('renumérotée 3')]);
  });
  it("traite une cellule vide au milieu d'une allée comme un arbre à planter", () => {
    expect(verger.emplacements.find((e) => e.id === 'A2-002')).toMatchObject({ statut: 'à planter', cultivar: '' });
    expect(verger.emplacements.filter((e) => e.allee === 'A1')).toHaveLength(2); // pas de ligne vide en bout d'allée
  });
  it('harmonise les apostrophes et relie le plan aux fiches malgré les graphies', () => {
    expect(cultivarDe('A3-001')!.cultivar.v).toBe('Beurré Hardy');
    expect(cultivarDe('A3-002')!.fiche.find((f) => f.libelle === 'Floraison')!.valeur.v).toBe('tardive');
    expect(cultivarDe('A4-001')!.fiche.find((f) => f.libelle === 'Récolte')!.valeur.v).toBe('octobre');
    expect(codes('rapprochement').join(' ')).toContain('Virty');
    expect(cultivarDe('A4-002')).toMatchObject({ espece: 'pommier', cultivar: { v: 'Melrose' }, nomLatin: { v: 'Malus domestica', ebauche: false } });
  });
  it('fusionne deux tableaux placés côte à côte', () => {
    const c = cultivarDe('A1-001')!;
    expect(c.cultivar.v).toBe('Bigarreau Napoléon');
    expect(c.fiche.map((f) => [f.libelle, f.valeur.v])).toEqual([['Récolte', 'juillet'], ['Porte-greffe', 'merisier']]);
  });
  it('garde la graphie la plus complète entre le plan et la fiche', () => {
    expect(cultivarDe('A1-002')).toMatchObject({ cultivar: { v: 'Bigarreau Noir de Meched' }, fiche: [{ libelle: 'Récolte', valeur: { v: 'juin' } }] });
  });
  it("distingue deux espèces sans cultivar par l'épithète latine", () => {
    expect([cultivarDe('A5-001')!.id, cultivarDe('A5-002')!.id]).toEqual(['noyer-regia', 'noyer-nigra']);
  });
  it('propose des ébauches pour les arbres sans fiche et la multiplication', () => {
    expect(codes('sans-fiche').join(' ')).toContain('Reine Claude Verte');
    expect(cultivarDe('A2-001')!.multiplication).toEqual({ v: 'greffage', ebauche: true });
    expect(cultivarDe('A3-001')!.multiplication).toEqual({ v: 'greffage', ebauche: false });
    expect(verger.allees.every((a) => a.espacementDefaut.ebauche)).toBe(true);
  });
  it('fait des notes sous un tableau des idées pour l’allée de la même espèce', () => {
    expect(verger.idees).toEqual([expect.objectContaining({ allee: 'A3', sujet: 'Comtesse de Paris, floraison tardive contre le gel' })]);
  });
  it('se convertit au format Pomone v1 sans perte', () => {
    const v1 = lireClasseur(ecrireClasseur(verger));
    expect(v1.format).toBe('pomone-v1');
    expect(v1.rapport.filter((a) => a.niveau === 'erreur')).toEqual([]);
    expect(v1.verger.emplacements).toEqual(verger.emplacements);
    expect(v1.verger.cultivars).toEqual(verger.cultivars);
  });
});
