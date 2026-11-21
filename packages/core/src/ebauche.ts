import type * as XLSX from 'xlsx';
import { especeParCle, devinerEspece } from './especes';
import { analyserNom, rapprocher } from './noms';
import { cle, jetons, lireChamp, nettoyer, nombre, plat, slug } from './normaliser';
import { type Allee, type Anomalie, type Cultivar, type Emplacement, type Idee, type Verger, champ } from './types';

type Grille = unknown[][];
const txt = (v: unknown): string => (v === null || v === undefined ? '' : String(v).replace(/ /g, ' ').trim());

/** Identifiant de cultivar : espèce + cultivar, ou à défaut l'épithète latine (noyer-nigra, sorbier-domestica). */
export const idCultivar = (espece: string, cultivar: string, latin: string): string =>
  slug(`${espece} ${cultivar || latin.split(' ').slice(1).join(' ') || 'type'}`);

export const ESPACEMENT_PROVISOIRE = 5;
export const ECART_ALLEES_PROVISOIRE = 6;

/** Le classeur « ébauche » : une feuille « allées » en colonnes appariées + des feuilles de fiches. */
export function estEbauche(noms: string[]): boolean {
  return noms.some((n) => plat(n) === 'allees') && !noms.some((n) => plat(n) === 'emplacements');
}

interface FicheLue { nom: string; espece: string; latin: string; cultivar: string; colonnes: Map<string, string>; feuille: string }

/** Lit tous les tableaux d'une feuille de fiches (plusieurs tableaux peuvent être côte à côte). */
function lireFiches(nomFeuille: string, g: Grille, idees: { feuille: string; texte: string }[]): FicheLue[] {
  const especeFeuille = devinerEspece(nomFeuille)?.cle ?? '';
  const iEntete = g.findIndex((l) => l.some((c) => /^(cultivar|variete)$/.test(plat(txt(c)))));
  if (iEntete < 0) return [];
  const entete = g[iEntete]!.map(txt);
  const debuts = entete.map((c, i) => (/^(cultivar|variete)$/.test(plat(c)) ? i : -1)).filter((i) => i >= 0);
  const fiches = new Map<string, FicheLue>();
  let horsTableau = false;
  for (const ligne of g.slice(iEntete + 1)) {
    const cellules = ligne.map(txt);
    const remplies = cellules.filter(Boolean).length;
    if (!remplies) continue;
    // Une ligne où seule la première cellule est remplie est une note libre sous le tableau.
    if (horsTableau || (remplies === 1 && cellules[debuts[0]!] && entete.filter(Boolean).length > 2)) {
      if (plat(cellules[debuts[0]!] ?? '') !== 'candidats') idees.push({ feuille: nomFeuille, texte: nettoyer(cellules.find(Boolean)!) });
      horsTableau = true;
      continue;
    }
    debuts.forEach((d, n) => {
      const fin = debuts[n + 1] ?? entete.length;
      const nom = cellules[d];
      if (!nom) return;
      const a = analyserNom(nom);
      const espece = a.espece || especeFeuille;
      const k = `${espece}|${cle(a.cultivar || nom)}`;
      const f = fiches.get(k) ?? { nom, espece, latin: a.latin, cultivar: a.cultivar || nettoyer(nom), colonnes: new Map(), feuille: nomFeuille };
      for (let c = d + 1; c < fin; c++) if (entete[c] && cellules[c]) f.colonnes.set(entete[c]!, cellules[c]!);
      fiches.set(k, f);
    });
  }
  return [...fiches.values()];
}

export function lireEbauche(X: typeof XLSX, wb: XLSX.WorkBook): { verger: Verger; rapport: Anomalie[] } {
  const rapport: Anomalie[] = [];
  const note = (niveau: Anomalie['niveau'], code: string, message: string) => rapport.push({ niveau, code, message });
  const grille = (n: string): Grille => X.utils.sheet_to_json(wb.Sheets[n]!, { header: 1, defval: null, raw: true });

  const nomAllees = wb.SheetNames.find((n) => plat(n) === 'allees')!;
  const notes: { feuille: string; texte: string }[] = [];
  const fiches = wb.SheetNames.filter((n) => n !== nomAllees).flatMap((n) => lireFiches(n, grille(n), notes));

  const cultivars = new Map<string, Cultivar>();
  const creer = (espece: string, nomCultivar: string, latin: string): Cultivar => {
    const esp = especeParCle(espece);
    const id = idCultivar(esp.cle, nomCultivar, latin);
    let c = cultivars.get(id);
    if (!c) {
      c = {
        id, espece: esp.cle,
        nomLatin: latin ? champ(latin) : champ(esp.latin, true),
        cultivar: champ(nomCultivar),
        nomVernaculaire: champ(esp.vernaculaire, true),
        multiplication: champ(esp.multiplication, true),
        description: champ(), fiche: [],
      };
      cultivars.set(id, c);
    } else if (latin && c.nomLatin.ebauche) c.nomLatin = champ(latin);
    return c;
  };
  for (const f of fiches) {
    const c = creer(f.espece, f.cultivar, f.latin);
    for (const [libelle, valeur] of f.colonnes) {
      const l = plat(libelle);
      if (l === 'description') c.description = lireChamp(valeur);
      else if (l === 'multiplication') c.multiplication = lireChamp(valeur.toLowerCase());
      else if (!c.fiche.some((x) => x.libelle === libelle)) c.fiche.push({ libelle, valeur: lireChamp(valeur) });
    }
  }
  const avecFiche = new Set(cultivars.keys());

  // Feuille « allées » : ligne 1 = titres d'allée (une colonne sur deux), ligne 2 = Cultivar / Espacement.
  const g = grille(nomAllees);
  const titres = (g[0] ?? []).map(txt);
  const allees: Allee[] = [];
  const emplacements: Emplacement[] = [];
  let numero = 0;
  titres.forEach((titre, col) => {
    if (!titre) return;
    numero++;
    const m = /^\s*(\d+)\s*-\s*(.*)$/.exec(titre);
    const nom = nettoyer(m ? m[2]! : titre).replace(/^./, (c) => c.toUpperCase());
    if (m && Number(m[1]) !== numero)
      note('avertissement', 'numero-allee', `Allée « ${titre.trim()} » : numéro ${m[1]} dans le classeur, renumérotée ${numero} d'après l'ordre des colonnes.`);
    const id = `A${numero}`;
    const especeAllee = devinerEspece(nom)?.cle ?? '';
    const cellules = g.slice(2).map((l) => ({ nom: txt(l[col]), esp: nombre(l[col + 1]) }));
    let fin = cellules.length;
    while (fin > 0 && !cellules[fin - 1]!.nom) fin--;
    const espAllee = cellules.find((c) => c.esp !== null)?.esp ?? null;
    if (espAllee === null) note('info', 'espacement', `Allée ${numero} : aucun espacement saisi, ${ESPACEMENT_PROVISOIRE} m proposés (à vérifier).`);
    allees.push({ id, numero, nom, espacementDefaut: champ(String(espAllee ?? ESPACEMENT_PROVISOIRE), true), type: 'allée', cote: '', distance: null });

    cellules.slice(0, fin).forEach((c, i) => {
      const base = {
        id: `${id}-${String(i + 1).padStart(3, '0')}`, allee: id, position: String(i + 1), strate: 'arbre', espacement: null,
        datePlantation: '', dateRetrait: '', remplace: '', multiplication: champ(), porteGreffe: champ(), origine: champ(), remarque: champ(),
      };
      if (!c.nom) { emplacements.push({ ...base, cultivar: '', statut: 'à planter' }); return; }
      const a = analyserNom(c.nom);
      const espece = a.espece || especeAllee;
      const candidats = [...cultivars.values()].filter((x) => avecFiche.has(x.id) && x.cultivar.v);
      const r = (a.cultivar && (rapprocher(a.cultivar, candidats.filter((x) => x.espece === espece), (x) => x.cultivar.v)
        ?? (espece ? null : rapprocher(a.cultivar, candidats, (x) => x.cultivar.v)))) || null;
      let cv: Cultivar;
      if (r) {
        cv = r.cible;
        if (a.latin && cv.nomLatin.ebauche) cv.nomLatin = champ(a.latin);
        if (!r.exact || nettoyer(c.nom) !== c.nom)
          note(r.exact ? 'info' : 'avertissement', r.exact ? 'apostrophes' : 'rapprochement',
            `${base.id} : « ${c.nom} » ${r.exact ? 'harmonisé en' : 'rapproché de la fiche'} « ${cv.cultivar.v} »${r.exact ? '' : ' — à vérifier'}.`);
        // La graphie la plus complète l'emporte (« Bigarreau Noir de Meched » plutôt que « Noir de Meched »).
        if (jetons(a.cultivar).length > jetons(cv.cultivar.v).length) cv.cultivar = champ(a.cultivar);
      } else {
        cv = creer(espece, a.cultivar, a.latin);
        if (!avecFiche.has(cv.id)) note('avertissement', 'sans-fiche', `${base.id} : « ${c.nom} » n'a pas de fiche ; une ébauche est proposée (à compléter).`);
      }
      emplacements.push({ ...base, cultivar: cv.id, statut: 'planté', strate: especeParCle(cv.espece).strate });
    });
  });

  const plantes = new Set(emplacements.map((e) => e.cultivar));
  for (const c of cultivars.values())
    if (!plantes.has(c.id)) note('info', 'fiche-sans-arbre', `Fiche « ${c.cultivar.v} » (${c.nomVernaculaire.v || c.espece}) : aucun emplacement dans les allées.`);

  // Les notes libres sous les tableaux (« candidats ») deviennent des idées de l'allée de la même espèce.
  const idees: Idee[] = notes.map((n) => {
    const esp = devinerEspece(n.feuille)?.cle;
    const compte = new Map<string, number>();
    for (const e of emplacements) if (cultivars.get(e.cultivar)?.espece === esp) compte.set(e.allee, (compte.get(e.allee) ?? 0) + 1);
    const allee = [...compte].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
    return { allee, type: 'évolution', sujet: n.texte, emplacement: '', priorite: '', remarque: `Note de la feuille « ${n.feuille} »` };
  });

  return {
    verger: {
      nom: 'Verger', lieu: '', auteur: '', nordDeg: 0, ecartAllees: champ(String(ECART_ALLEES_PROVISOIRE), true),
      allees, emplacements, cultivars: [...cultivars.values()], idees, decorations: [],
    },
    rapport,
  };
}
