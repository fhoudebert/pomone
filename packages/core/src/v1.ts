import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import type * as XLSX from 'xlsx';
import { devinerEspece, especeParCle } from './especes';
import { ecrireChamp, lireChamp, nombre, plat, slug } from './normaliser';
import { type Anomalie, type Cultivar, type Verger, COTES, DISTANCE_HAIE, MODES_MULTIPLICATION, STATUTS, STRATES, TYPES_IDEE, TYPES_RANG, champ } from './types';
import { ECART_ALLEES_PROVISOIRE, ESPACEMENT_PROVISOIRE, idCultivar } from './ebauche';

type Ligne = Record<string, unknown>;
const txt = (v: unknown): string => (v === null || v === undefined ? '' : String(v).replace(/ /g, ' ').trim());
const cleCol = (s: string): string => plat(s).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

export const FEUILLES = ['verger', 'allees', 'emplacements', 'cultivars', 'idees', 'decorations'] as const;
const COLONNES_SUGGEREES = ['Floraison', 'Récolte', 'Pollinisateurs recommandés', 'Sensibilité maladies', 'Usage conseillé'];
const AIDE = [
  'Classeur Pomone v1 — une feuille par sujet, noms de feuilles et de colonnes à conserver.',
  '',
  'Ébauche : une valeur qui commence par ~ est une proposition à valider. Elle apparaît en italique couleur ici et dans les pages. Pour valider, retirer le ~.',
  'verger : nord_deg = azimut des allées en degrés depuis le nord (sens horaire) ; ecart_allees_m = distance entre deux allées.',
  'allees : une ligne par allée, dans l\'ordre du plan. espacement_defaut_m = distance entre deux arbres quand elle n\'est pas saisie.',
  `allees : type = allée (par défaut) ou haie. Une haie se place sur un côté (cote = ${COTES.join(', ')}) ; distance_m = distance au bout des allées (haut, bas) ou à l'allée voisine (gauche, droite), ${DISTANCE_HAIE} m par défaut.`,
  'emplacements : une ligne par plante. id attribué une fois, jamais réutilisé (A5-007). position : 1, 2… et 1.1 pour insérer entre 1 et 2 (colonne au format texte).',
  `emplacements.statut : ${STATUTS.join(', ')}. Une plante « à planter » peut rester sans cultivar.`,
  `emplacements.strate : ${STRATES.join(', ')}.`,
  'Remplacer un arbre : passer l\'ancienne ligne en « remplacé » et ajouter une ligne à la même position, avec un nouvel id et remplace = ancien id.',
  'cultivars : cultivar sans guillemets (Melrose). Toute colonne ajoutée à droite est affichée dans la fiche.',
  `multiplication : ${MODES_MULTIPLICATION.join(', ')}.`,
  `idees.type : ${TYPES_IDEE.join(', ')}. Laisser allee vide pour une idée qui concerne tout le verger.`,
  'decorations : x_m vers la droite, y_m vers le bas, en mètres depuis le coin haut gauche de la première allée. Types : point_eau, mare, ruche, composteur, banc, abri, chemin, haie, cloture, texte.',
  'Cette feuille « aide » n\'est pas lue par Pomone.',
];
/** « Haie », « haies », vide → forme de la liste ; une autre valeur est gardée telle quelle pour le rapport. */
const typeRang = (t: string): string => (!t || /^allees?$/.test(plat(t)) ? 'allée' : /^haies?$/.test(plat(t)) ? 'haie' : t);
const liste = (v: readonly string[]): string => `"${v.join(',')}"`;
/** Listes déroulantes proposées (sans blocage : une ébauche « ~bouture » reste admise). */
const LISTES: Record<number, [string, string][]> = {
  2: [['E', liste(TYPES_RANG)], ['F', liste(COTES)]],
  3: [['E', liste(STATUTS)], ['F', liste(STRATES)], ['K', liste(MODES_MULTIPLICATION)]],
  4: [['F', liste(MODES_MULTIPLICATION)]],
  5: [['B', liste(TYPES_IDEE)]],
};
const COL_CULTIVARS = ['id', 'nom_latin', 'cultivar', 'nom_vernaculaire', 'espece', 'multiplication', 'description'];

export function lireV1(X: typeof XLSX, wb: XLSX.WorkBook): { verger: Verger; rapport: Anomalie[] } {
  const rapport: Anomalie[] = [];
  const feuille = (nom: string): { lignes: Ligne[]; entetes: string[] } => {
    const n = wb.SheetNames.find((s) => cleCol(s) === nom);
    if (!n) {
      if (nom !== 'idees' && nom !== 'decorations') rapport.push({ niveau: 'erreur', code: 'feuille-absente', message: `Feuille « ${nom} » absente du classeur.` });
      return { lignes: [], entetes: [] };
    }
    const g: unknown[][] = X.utils.sheet_to_json(wb.Sheets[n]!, { header: 1, defval: null, raw: true });
    const entetes = (g[0] ?? []).map(txt);
    const lignes = g.slice(1).filter((l) => l.some((c) => txt(c))).map((l) => {
      const o: Ligne = {};
      entetes.forEach((e, i) => { if (e) o[cleCol(e)] = l[i]; });
      return o;
    });
    return { lignes, entetes };
  };

  const params = new Map(feuille('verger').lignes.map((l) => [cleCol(txt(l.cle)), txt(l.valeur)]));
  const cv = feuille('cultivars');
  const libres = cv.entetes.filter((e) => e && !COL_CULTIVARS.includes(cleCol(e)));
  const cultivars: Cultivar[] = cv.lignes.map((l) => {
    const latin = lireChamp(l.nom_latin), vern = lireChamp(l.nom_vernaculaire), nom = lireChamp(l.cultivar);
    const espece = txt(l.espece) ? slug(txt(l.espece)) : devinerEspece(`${latin.v} ${vern.v}`)?.cle ?? 'autre';
    return {
      id: txt(l.id) || idCultivar(espece, nom.v, latin.v), espece, nomLatin: latin, cultivar: nom, nomVernaculaire: vern,
      multiplication: lireChamp(txt(l.multiplication).toLowerCase()), description: lireChamp(l.description),
      fiche: libres.map((e) => ({ libelle: e, valeur: lireChamp(l[cleCol(e)]) })).filter((x) => x.valeur.v),
    };
  });
  const parId = new Map(cultivars.map((c) => [c.id, c]));

  const verger: Verger = {
    nom: params.get('nom') || 'Verger', lieu: params.get('lieu') ?? '', auteur: params.get('auteur') ?? '',
    nordDeg: nombre(params.get('nord_deg')) ?? 0,
    ecartAllees: params.get('ecart_allees_m') ? lireChamp(params.get('ecart_allees_m')) : champ(String(ECART_ALLEES_PROVISOIRE), true),
    allees: feuille('allees').lignes.map((l, i) => ({
      id: txt(l.id) || `A${i + 1}`, numero: nombre(l.numero) ?? i + 1, nom: txt(l.nom),
      espacementDefaut: txt(l.espacement_defaut_m) ? lireChamp(l.espacement_defaut_m) : champ(String(ESPACEMENT_PROVISOIRE), true),
      type: typeRang(txt(l.type)), cote: plat(txt(l.cote)),
      distance: txt(l.distance_m) ? lireChamp(l.distance_m) : null,
    })),
    emplacements: feuille('emplacements').lignes.map((l) => {
      const c = parId.get(txt(l.cultivar));
      return {
        id: txt(l.id), allee: txt(l.allee), position: txt(l.position), cultivar: txt(l.cultivar),
        statut: txt(l.statut).toLowerCase() || 'planté',
        strate: txt(l.strate).toLowerCase() || (c ? especeParCle(c.espece).strate : 'arbre'),
        espacement: txt(l.espacement_precedent_m) ? lireChamp(l.espacement_precedent_m) : null,
        datePlantation: txt(l.date_plantation), dateRetrait: txt(l.date_retrait), remplace: txt(l.remplace),
        multiplication: lireChamp(txt(l.multiplication).toLowerCase()), porteGreffe: lireChamp(l.porte_greffe),
        origine: lireChamp(l.origine), remarque: lireChamp(l.remarque),
      };
    }),
    cultivars,
    idees: feuille('idees').lignes.map((l) => ({
      allee: txt(l.allee), type: txt(l.type).toLowerCase(), sujet: txt(l.sujet), emplacement: txt(l.emplacement),
      priorite: txt(l.priorite), remarque: txt(l.remarque),
    })),
    decorations: feuille('decorations').lignes.map((l, i) => ({
      id: txt(l.id) || `D${i + 1}`, type: cleCol(txt(l.type)) || 'texte', x: nombre(l.x_m) ?? 0, y: nombre(l.y_m) ?? 0,
      largeur: nombre(l.largeur_m), hauteur: nombre(l.hauteur_m), rayon: nombre(l.rayon_m),
      points: txt(l.points).split(';').map((p) => p.split(',').map((n) => parseFloat(n))).filter((p): p is [number, number] => p.length === 2 && p.every(Number.isFinite)),
      libelle: txt(l.libelle),
    })),
  };
  return { verger, rapport };
}

/** Écrit un verger au format Pomone v1 (les ébauches reprennent leur préfixe ~). */
export function ecrireV1(X: typeof XLSX, v: Verger): Uint8Array {
  const wb = X.utils.book_new();
  const ajouter = (nom: string, lignes: unknown[][]) => {
    const ws = X.utils.aoa_to_sheet(lignes);
    ws['!cols'] = lignes[0]!.map((_, i) => ({ wch: Math.min(40, Math.max(10, ...lignes.map((l) => String(l[i] ?? '').length + 2))) }));
    X.utils.book_append_sheet(wb, ws, nom);
  };
  ajouter('verger', [['cle', 'valeur'], ['nom', v.nom], ['lieu', v.lieu], ['auteur', v.auteur], ['nord_deg', v.nordDeg], ['ecart_allees_m', ecrireChamp(v.ecartAllees)]]);
  ajouter('allees', [['id', 'numero', 'nom', 'espacement_defaut_m', 'type', 'cote', 'distance_m'],
    ...v.allees.map((a) => [a.id, a.numero, a.nom, ecrireChamp(a.espacementDefaut), a.type, a.type === 'haie' ? a.cote : '', ecrireChamp(a.distance)])]);
  ajouter('emplacements', [
    ['id', 'allee', 'position', 'cultivar', 'statut', 'strate', 'espacement_precedent_m', 'date_plantation', 'date_retrait', 'remplace', 'multiplication', 'porte_greffe', 'origine', 'remarque'],
    ...v.emplacements.map((e) => [e.id, e.allee, e.position, e.cultivar, e.statut, e.strate, ecrireChamp(e.espacement), e.datePlantation, e.dateRetrait, e.remplace,
      ecrireChamp(e.multiplication), ecrireChamp(e.porteGreffe), ecrireChamp(e.origine), ecrireChamp(e.remarque)]),
  ]);
  const libres = v.cultivars.length ? [...new Set(v.cultivars.flatMap((c) => c.fiche.map((f) => f.libelle)))] : COLONNES_SUGGEREES;
  ajouter('cultivars', [
    [...COL_CULTIVARS, ...libres],
    ...v.cultivars.map((c) => [c.id, ecrireChamp(c.nomLatin), ecrireChamp(c.cultivar), ecrireChamp(c.nomVernaculaire), c.espece, ecrireChamp(c.multiplication),
      ecrireChamp(c.description), ...libres.map((l) => ecrireChamp(c.fiche.find((f) => f.libelle === l)?.valeur ?? null))]),
  ]);
  ajouter('idees', [['allee', 'type', 'sujet', 'emplacement', 'priorite', 'remarque'], ...v.idees.map((i) => [i.allee, i.type, i.sujet, i.emplacement, i.priorite, i.remarque])]);
  ajouter('decorations', [['id', 'type', 'x_m', 'y_m', 'largeur_m', 'hauteur_m', 'rayon_m', 'points', 'libelle'],
    ...v.decorations.map((d) => [d.id, d.type, d.x, d.y, d.largeur, d.hauteur, d.rayon, d.points.map((p) => p.join(',')).join(' ; '), d.libelle])]);
  ajouter('aide', AIDE.map((l) => [l]));
  // La colonne « position » reste du texte : sinon le tableur transforme 1.10 en 1.1.
  const ws = wb.Sheets.emplacements!;
  v.emplacements.forEach((_, i) => { const c = ws[X.utils.encode_cell({ r: i + 1, c: 2 })]; if (c) { c.t = 's'; c.z = '@'; } });
  return marquerEbauches(new Uint8Array(X.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer));
}

/**
 * Ajoute au classeur la mise en forme conditionnelle « le texte commence par ~ » (italique,
 * couleur) et les listes déroulantes. SheetJS n'écrivant ni styles ni validations, le XML
 * est complété directement dans l'archive du classeur.
 */
function marquerEbauches(octets: Uint8Array): Uint8Array {
  try {
    const zip = unzipSync(octets);
    for (const chemin of Object.keys(zip)) {
      let xml: string;
      const feuille = /^xl\/worksheets\/sheet(\d+)\.xml$/.exec(chemin);
      if (feuille) {
        const listes = LISTES[Number(feuille[1])] ?? [];
        const dv = listes.map(([col, f]) => `<dataValidation type="list" allowBlank="1" showErrorMessage="0" sqref="${col}2:${col}5000"><formula1>${f}</formula1></dataValidation>`).join('');
        xml = strFromU8(zip[chemin]!).replace(/<\/sheetData>|<sheetData\/>/, (m) =>
          `${m}<conditionalFormatting sqref="A2:AZ5000"><cfRule type="beginsWith" dxfId="0" priority="1" operator="beginsWith" text="~"><formula>LEFT(A2,1)="~"</formula></cfRule></conditionalFormatting>${dv ? `<dataValidations count="${listes.length}">${dv}</dataValidations>` : ''}`);
      } else if (chemin === 'xl/styles.xml') {
        xml = strFromU8(zip[chemin]!).replace('<dxfs count="0"/>', '<dxfs count="1"><dxf><font><i/><color rgb="FFB4541A"/></font></dxf></dxfs>');
      } else continue;
      zip[chemin] = strToU8(xml);
    }
    return zipSync(zip);
  } catch {
    return octets; // classeur valide même sans le marquage
  }
}
