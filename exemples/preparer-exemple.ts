/**
 * Fabrique exemples/verger-pomone-v1.xlsx à partir du classeur « ébauche », en appliquant
 * les corrections décidées au cadrage (15/11/2026). À relancer : npm run exemple:preparer
 * Les valeurs préfixées ~ sont des ébauches à valider dans le classeur.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { ecrireClasseur, lireClasseur, champ, idCultivar, type Cultivar } from '../packages/core/src/index';

const { verger: v } = lireClasseur(new Uint8Array(readFileSync('exemples/verger-pomone-ebauche.xlsx')));

v.nom = "Verger de l'arboretum";
v.lieu = 'Saint-Jean-le-Blanc (Loiret)';
v.auteur = 'François Houdebert';
v.nordDeg = 10; // allées à N 10° E, mesuré sur le plan de récolement du 28/10/2020
for (const a of v.allees) a.espacementDefaut = champ('5', true); // aucune mesure avant travaux

// Graphies alignées entre plan et fiches.
const GRAPHIES: Record<string, string> = {
  'Doyenné de Comice': 'Doyenné du Comice', 'Duchesse Angoulême': "Duchesse d'Angoulême", 'Bonne Louise Avranches': "Bonne Louise d'Avranches",
  'Coeur de Boeuf': 'Cœur de Bœuf', 'Bigarreau Hatif de Burlat': 'Bigarreau Hâtif de Burlat', 'Bigareau Jaune de Buchner': 'Bigarreau Jaune de Buchner',
  'Bigarreau Coeur de Pigeon': 'Bigarreau Cœur de Pigeon', 'Claude de Chambourcy': 'Reine Claude de Chambourcy',
  'Anglaise Hâtive': 'Anglaise Hâtive',
};
const parNom = (nom: string): Cultivar | undefined => v.cultivars.find((c) => c.cultivar.v === nom);
for (const [avant, apres] of Object.entries(GRAPHIES)) { const c = parNom(avant); if (c) c.cultivar = champ(apres); }
// Correction proposée, non confirmée : reste en ébauche.
const solli = v.cultivars.find((c) => /sioll/i.test(c.cultivar.v));
if (solli) solli.cultivar = champ('Violette de Solliès', true);

for (const c of v.cultivars) {
  // Bigarreaux = Prunus avium (confirmé) ; les autres noms latins proposés restent des ébauches.
  if (c.espece === 'cerisier' && /bigarreau/i.test(c.cultivar.v)) c.nomLatin = champ('Prunus avium');
  if (c.espece === 'kaki') c.nomVernaculaire = champ('Kaki', true);
  if (c.espece === 'noyer' && /nigra/.test(c.nomLatin.v)) c.nomVernaculaire = champ('Noyer noir', true);
  if (c.espece === 'sorbier' && /domestica/.test(c.nomLatin.v)) c.nomVernaculaire = champ('Cormier', true);
}

// Le cognassier sans nom de cultivar de l'allée 4 est le « Type sauvage » des fiches.
const sauvage = parNom('Type sauvage'), sansNom = v.cultivars.find((c) => c.espece === 'cognassier' && !c.cultivar.v);
if (sauvage && sansNom) {
  for (const e of v.emplacements) if (e.cultivar === sansNom.id) e.cultivar = sauvage.id;
  v.cultivars = v.cultivars.filter((c) => c !== sansNom);
  sauvage.nomLatin = champ('Cydonia oblonga');
}

// Cellules vides qui correspondent à un arbre du plan de 2020 : cultivar proposé, à confirmer.
const AU_PLAN: Record<string, string> = { 'A2-007': 'Mirabelle de Nancy', 'A5-006': "Bonne Louise d'Avranches", 'A5-007': 'Marguerite Marillat' };
for (const [id, nom] of Object.entries(AU_PLAN)) {
  const e = v.emplacements.find((x) => x.id === id), c = parNom(nom);
  if (e && c && !e.cultivar) { e.cultivar = c.id; e.remarque = champ(`${nom} à cet endroit sur le plan de 2020 : à confirmer`, true); }
}

// Identifiants de cultivar recalculés d'après les noms corrigés.
for (const c of v.cultivars) {
  const id = idCultivar(c.espece, c.cultivar.v, c.nomLatin.v);
  for (const e of v.emplacements) if (e.cultivar === c.id) e.cultivar = id;
  c.id = id;
}

// Espèces à venir, notées comme idées générales (sans allée).
for (const sujet of ['Amélanchier', 'Ragouminier (Prunus tomentosa)', 'Asiminier', 'Feijoa', 'Framboisiers', 'Cassissiers', 'Groseilliers'])
  v.idees.push({ allee: '', type: 'évolution', sujet, emplacement: '', priorite: '', remarque: 'Espèce à venir' });
v.idees.push({ allee: '', type: 'plante intercalaire', sujet: 'Aromatiques au pied des arbres', emplacement: '', priorite: '', remarque: '' });

writeFileSync('exemples/verger-pomone-v1.xlsx', ecrireClasseur(v));
console.log(`exemples/verger-pomone-v1.xlsx : ${v.allees.length} allées, ${v.emplacements.length} emplacements, ${v.cultivars.length} cultivars`);
