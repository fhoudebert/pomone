import { plat } from './normaliser';

/**
 * Espèces connues de Pomone : uniquement des valeurs par défaut (nom latin, mode de
 * multiplication, couleurs). Tout est modifiable dans le classeur ; une espèce inconnue
 * fonctionne aussi, avec l'apparence « autre ».
 */
export interface Espece {
  cle: string; vernaculaire: string; latin: string; motif: RegExp;
  strate: string; multiplication: string; feuillage: string; fruit: string;
}

const e = (cle: string, vernaculaire: string, latin: string, motif: RegExp, strate: string, multiplication: string, feuillage: string, fruit: string): Espece =>
  ({ cle, vernaculaire, latin, motif, strate, multiplication, feuillage, fruit });

// L'ordre compte : le premier motif reconnu l'emporte.
export const ESPECES: Espece[] = [
  e('ragouminier', 'Ragouminier', 'Prunus tomentosa', /tomentosa|ragoumin/, 'arbuste', 'semis', '#7fae5c', '#d1343f'),
  e('griottier', 'Cerisier acide', 'Prunus cerasus', /prunus cerasus|griott|montmorency/, 'arbre', 'greffage', '#4b8a3f', '#d0213a'),
  e('cerisier', 'Cerisier', 'Prunus avium', /prunus avium|\bceris|bigar+eau/, 'arbre', 'greffage', '#3f7f3a', '#b3142f'),
  e('prunier', 'Prunier', 'Prunus domestica', /prunus domestica|\bprun|reine claude|quetsche|mirabelle/, 'arbre', 'greffage', '#6b9150', '#6d3f9c'),
  e('pommier', 'Pommier', 'Malus domestica', /\bmalus\b|\bpomm/, 'arbre', 'greffage', '#5f9a3a', '#d9342b'),
  e('poirier', 'Poirier', 'Pyrus communis', /\bpyrus\b|\bpoir/, 'arbre', 'greffage', '#86a843', '#d6c13a'),
  e('cognassier', 'Cognassier', 'Cydonia oblonga', /cydonia|cognass|\bcoing/, 'arbre', 'marcotte', '#a3a43c', '#e8b90e'),
  e('kaki', 'Plaqueminier', 'Diospyros kaki', /diospyros|\bkaki|plaquemin/, 'arbre', 'greffage', '#7f9c5a', '#f08024'),
  e('noyer', 'Noyer', 'Juglans regia', /juglans|\bnoyer|\bnoix/, 'arbre', 'semis', '#5c7d3c', '#8a6a3b'),
  e('figuier', 'Figuier', 'Ficus carica', /\bficus|\bfigu/, 'arbre', 'bouture', '#4d8f6a', '#6b3f7a'),
  e('grenadier', 'Grenadier', 'Punica granatum', /punica|grenad/, 'arbuste', 'bouture', '#6fa35a', '#c8372d'),
  e('sorbier', 'Sorbier', 'Sorbus', /sorbus|sorbier|cormier/, 'arbre', 'semis', '#86a86a', '#e2622b'),
  e('amelanchier', 'Amélanchier', 'Amelanchier', /amelanch/, 'arbuste', 'semis', '#79a56b', '#5a3c8a'),
  e('asiminier', 'Asiminier', 'Asimina triloba', /asimin/, 'arbre', 'semis', '#6c9a4c', '#c9c24a'),
  e('feijoa', 'Feijoa', 'Acca sellowiana', /feijoa|\bacca\b/, 'arbuste', 'bouture', '#7d9f8a', '#7aa33c'),
  e('framboisier', 'Framboisier', 'Rubus idaeus', /rubus|frambois/, 'petit fruit', 'drageon', '#8fb46a', '#d6336c'),
  e('cassissier', 'Cassissier', 'Ribes nigrum', /ribes nigrum|cassis/, 'petit fruit', 'bouture', '#7aa45a', '#2d1f3d'),
  e('groseillier', 'Groseillier', 'Ribes rubrum', /\bribes|groseill/, 'petit fruit', 'bouture', '#8ab563', '#e03131'),
  e('aromatique', 'Aromatique', '', /aromat|lavande|thym|romarin|sauge|menthe|sarriette|hysope|melisse|ciboulette/, 'plante basse', 'bouture', '#9bb7a0', '#8f7fc4'),
];

export const ESPECE_AUTRE: Espece = e('autre', '', '', /$^/, 'arbre', '', '#6d9d55', '#c0392b');

export const especeParCle = (cle: string): Espece => ESPECES.find((x) => x.cle === cle) ?? { ...ESPECE_AUTRE, cle: cle || 'autre' };

export function devinerEspece(texte: string): Espece | null {
  const t = plat(texte);
  return ESPECES.find((x) => x.motif.test(t)) ?? null;
}

export const GENRES = new Set(['malus', 'pyrus', 'prunus', 'cydonia', 'diospyros', 'juglans', 'sorbus', 'ficus', 'punica', 'amelanchier', 'asimina', 'acca', 'rubus', 'ribes', 'crataegus', 'mespilus', 'corylus', 'castanea', 'morus', 'vitis', 'actinidia']);
