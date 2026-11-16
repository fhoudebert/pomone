import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { classeurModele, ecrireClasseur, genererSite, lireClasseur, type Anomalie } from '../../core/src/index';

const AIDE = `Pomone — du classeur du verger aux pages HTML

  pomone build <classeur> [-o dossier] [--unique] [--rapport] [--sans-ebauches] [--sans-logo]
      Produit les pages HTML (dossier « site » par défaut ; --unique : un seul verger.html).
  pomone convert <classeur> [-o fichier.xlsx]
      Convertit un classeur « ébauche » au format Pomone v1.
  pomone check <classeur>
      Affiche le rapport d'anomalies.
  pomone modele [-o fichier.xlsx]
      Crée un classeur vierge au format Pomone v1.

Formats lus : .xlsx, .xls, .ods`;

function afficher(rapport: Anomalie[]): void {
  for (const a of rapport) console.error(`[${a.niveau}] ${a.code} : ${a.message}`);
  const n = (k: string) => rapport.filter((a) => a.niveau === k).length;
  console.error(`${n('erreur')} erreur(s), ${n('avertissement')} avertissement(s), ${n('info')} information(s).`);
}

const args = process.argv.slice(2);
const commande = args[0];
const entree = args[1];
const option = (nom: string): string | undefined => { const i = args.indexOf(nom); return i >= 0 ? args[i + 1] : undefined; };

if (commande === 'modele') {
  const sortie = option('-o') ?? 'modele-pomone-v1.xlsx';
  writeFileSync(sortie, classeurModele());
  console.error(`Classeur vierge écrit : ${sortie}`);
  process.exit(0);
}
if (!commande || !entree || !['build', 'convert', 'check'].includes(commande)) {
  console.log(AIDE);
  process.exit(commande ? 2 : 0);
}

const { verger, rapport, format } = lireClasseur(new Uint8Array(readFileSync(entree)));
console.error(`Classeur lu au format ${format} : ${verger.allees.length} allées, ${verger.emplacements.length} emplacements, ${verger.cultivars.length} cultivars.`);

if (commande === 'check') {
  afficher(rapport);
} else if (commande === 'convert') {
  const sortie = option('-o') ?? entree.replace(/(\.[^.]+)?$/, '-v1.xlsx');
  writeFileSync(sortie, ecrireClasseur(verger));
  afficher(rapport);
  console.error(`Classeur Pomone v1 écrit : ${sortie}`);
} else {
  const dossier = option('-o') ?? 'site';
  const fichiers = genererSite(verger, {
    unique: args.includes('--unique'), masquerEbauches: args.includes('--sans-ebauches'), sansLogo: args.includes('--sans-logo'),
    rapport: args.includes('--rapport') ? rapport : undefined, date: new Date().toISOString().slice(0, 10),
  });
  for (const f of fichiers) {
    const chemin = join(dossier, f.chemin);
    mkdirSync(dirname(chemin), { recursive: true });
    writeFileSync(chemin, f.contenu);
  }
  const n = (k: string) => rapport.filter((a) => a.niveau === k).length;
  console.error(`${fichiers.length} page(s) écrite(s) dans ${dossier}/ — ${n('erreur')} erreur(s), ${n('avertissement')} avertissement(s) (pomone check pour le détail).`);
}
process.exitCode = rapport.some((a) => a.niveau === 'erreur') ? 1 : 0;
