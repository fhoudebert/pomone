import * as XLSX from 'xlsx';
import { estEbauche, lireEbauche } from './ebauche';
import { comparerPositions, positionValide } from './normaliser';
import { type Anomalie, type Lecture, type Verger, MODES_MULTIPLICATION, STATUTS, STRATES } from './types';
import { ecrireV1, lireV1 } from './v1';

/** Lit un classeur .xlsx, .xls ou .ods, au format Pomone v1 ou « ébauche ». Ne lève pas d'exception sur un classeur imparfait. */
export function lireClasseur(donnees: ArrayBuffer | Uint8Array): Lecture {
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(donnees, { type: 'array' });
  } catch (err) {
    return { format: 'pomone-v1', verger: vergerVide(), rapport: [{ niveau: 'erreur', code: 'illisible', message: `Classeur illisible : ${(err as Error).message}` }] };
  }
  const ebauche = estEbauche(wb.SheetNames);
  const { verger, rapport } = ebauche ? lireEbauche(XLSX, wb) : lireV1(XLSX, wb);
  rapport.push(...controler(verger));
  return { format: ebauche ? 'ebauche' : 'pomone-v1', verger, rapport };
}

export const ecrireClasseur = (v: Verger): Uint8Array => ecrireV1(XLSX, v);

/** Classeur vierge au format Pomone v1 : en-têtes, listes déroulantes, feuille d'aide. */
export const classeurModele = (): Uint8Array => ecrireV1(XLSX, { ...vergerVide(), nom: 'Mon verger', ecartAllees: { v: '6', ebauche: true } });

export const vergerVide = (): Verger => ({
  nom: 'Verger', lieu: '', auteur: '', nordDeg: 0, ecartAllees: { v: '6', ebauche: true }, allees: [], emplacements: [], cultivars: [], idees: [], decorations: [],
});

export const estActif = (statut: string): boolean => statut === 'planté' || statut === 'à planter';

/** Contrôles de cohérence communs aux deux formats. */
export function controler(v: Verger): Anomalie[] {
  const r: Anomalie[] = [];
  const note = (niveau: Anomalie['niveau'], code: string, message: string) => r.push({ niveau, code, message });
  const doublons = (ids: string[], quoi: string) => {
    const vus = new Set<string>();
    for (const id of ids) { if (vus.has(id)) note('erreur', 'doublon', `Identifiant ${quoi} en double : « ${id} ».`); vus.add(id); }
  };
  doublons(v.allees.map((a) => a.id), "d'allée");
  doublons(v.emplacements.map((e) => e.id), "d'emplacement");
  doublons(v.cultivars.map((c) => c.id), 'de cultivar');
  const allees = new Set(v.allees.map((a) => a.id)), cultivars = new Set(v.cultivars.map((c) => c.id)), places = new Set(v.emplacements.map((e) => e.id));
  const modes: readonly string[] = MODES_MULTIPLICATION, statuts: readonly string[] = STATUTS, strates: readonly string[] = STRATES;
  const occupes = new Map<string, string>();
  for (const e of v.emplacements) {
    if (!e.id) note('erreur', 'id-absent', `Un emplacement de l'allée « ${e.allee} » n'a pas d'identifiant.`);
    if (!allees.has(e.allee)) note('erreur', 'allee-inconnue', `${e.id} : allée « ${e.allee} » inconnue.`);
    if (!positionValide(e.position)) note('erreur', 'position', `${e.id} : position « ${e.position} » invalide (attendu : 1, 2, 1.1…).`);
    if (e.cultivar && !cultivars.has(e.cultivar)) note('erreur', 'cultivar-inconnu', `${e.id} : cultivar « ${e.cultivar} » absent de la feuille cultivars.`);
    if (!e.cultivar && e.statut !== 'à planter') note('avertissement', 'cultivar-absent', `${e.id} : aucun cultivar renseigné.`);
    if (!statuts.includes(e.statut)) note('avertissement', 'statut', `${e.id} : statut « ${e.statut} » hors liste (${STATUTS.join(', ')}).`);
    if (!strates.includes(e.strate)) note('avertissement', 'strate', `${e.id} : strate « ${e.strate} » hors liste (${STRATES.join(', ')}).`);
    if (e.multiplication.v && !modes.includes(e.multiplication.v)) note('avertissement', 'multiplication', `${e.id} : multiplication « ${e.multiplication.v} » hors liste, affichée « autre ».`);
    if (e.remplace && !places.has(e.remplace)) note('avertissement', 'remplace', `${e.id} : remplace « ${e.remplace} », emplacement inconnu.`);
    if (estActif(e.statut)) {
      const k = `${e.allee}|${e.position}`;
      if (occupes.has(k)) note('avertissement', 'position-double', `${e.id} et ${occupes.get(k)} occupent la même position ${e.position} de l'allée ${e.allee}.`);
      occupes.set(k, e.id);
    }
  }
  for (const c of v.cultivars)
    if (c.multiplication.v && !modes.includes(c.multiplication.v)) note('avertissement', 'multiplication', `Cultivar ${c.id} : multiplication « ${c.multiplication.v} » hors liste, affichée « autre ».`);
  for (const i of v.idees) if (i.allee && !allees.has(i.allee)) note('avertissement', 'idee-allee', `Idée « ${i.sujet} » : allée « ${i.allee} » inconnue.`);
  const nb = compterEbauches(v);
  if (nb) note('info', 'ebauches', `${nb} valeur(s) en ébauche (préfixe ~) restent à valider.`);
  return r;
}

export function compterEbauches(v: Verger): number {
  let n = v.ecartAllees.ebauche ? 1 : 0;
  for (const a of v.allees) if (a.espacementDefaut.ebauche) n++;
  for (const c of v.cultivars) n += [c.nomLatin, c.cultivar, c.nomVernaculaire, c.multiplication, c.description, ...c.fiche.map((f) => f.valeur)].filter((x) => x.ebauche && x.v).length;
  for (const e of v.emplacements) n += [e.espacement, e.multiplication, e.porteGreffe, e.origine, e.remarque].filter((x) => x && x.ebauche && x.v).length;
  return n;
}

export const trierEmplacements = <T extends { position: string }>(l: T[]): T[] => [...l].sort((a, b) => comparerPositions(a.position, b.position));
