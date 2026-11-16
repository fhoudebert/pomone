import { invoke, isTauri } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { classeurModele, ecrireClasseur, genererSite, lireClasseur, type Lecture } from '../../packages/core/src/index';
import './style.css';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const depot = $('depot'), champFichier = $<HTMLInputElement>('fichier'), message = $('message');
const optRapport = $<HTMLInputElement>('opt-rapport'), optEbauches = $<HTMLInputElement>('opt-ebauches');
const bureau = isTauri();

let lecture: Lecture | null = null;
let nomSource = 'verger';

const aujourdhui = (): string => new Date().toISOString().slice(0, 10);
const options = (unique: boolean) => ({
  unique, masquerEbauches: optEbauches.checked, sansLogo: $<HTMLInputElement>('opt-logo').checked, rapport: optRapport.checked ? lecture!.rapport : undefined, date: aujourdhui(),
});

function dire(texte: string, erreur = false): void {
  message.textContent = texte;
  message.classList.toggle('erreur', erreur);
}

function apercu(): void {
  if (!lecture) return;
  $<HTMLIFrameElement>('apercu').srcdoc = genererSite(lecture.verger, options(true))[0]!.contenu;
}

async function charger(f: File): Promise<void> {
  nomSource = f.name.replace(/\.[^.]+$/, '');
  lecture = lireClasseur(new Uint8Array(await f.arrayBuffer()));
  const { verger: v, rapport, format } = lecture;
  const n = (k: string) => rapport.filter((a) => a.niveau === k).length;
  const plantes = v.emplacements.filter((e) => e.statut === 'planté').length;
  const aPlanter = v.emplacements.filter((e) => e.statut === 'à planter').length;
  const resume = $('resume');
  resume.textContent = '';
  const p = document.createElement('p');
  p.textContent = `${f.name} — format ${format === 'ebauche' ? 'ébauche (converti à la volée)' : 'Pomone v1'} : ${v.allees.length} allées, ${plantes} plantés, ${aPlanter} à planter, ${v.cultivars.length} cultivars. `;
  const bilan = document.createElement('strong');
  bilan.textContent = `${n('erreur')} erreur(s), ${n('avertissement')} avertissement(s), ${n('info')} information(s).`;
  bilan.className = n('erreur') ? 'erreur' : n('avertissement') ? 'avertissement' : 'info';
  p.append(bilan);
  resume.append(p);

  const liste = $('anomalies');
  liste.textContent = '';
  const ordre = { erreur: 0, avertissement: 1, info: 2 };
  for (const a of [...rapport].sort((x, y) => ordre[x.niveau] - ordre[y.niveau])) {
    const li = document.createElement('li');
    li.className = a.niveau;
    li.textContent = `${a.niveau} — ${a.message}`;
    liste.append(li);
  }
  $<HTMLDetailsElement>('rapport').open = n('erreur') > 0;
  $('exporter-v1').hidden = false;
  $<HTMLButtonElement>('exporter-dossier').disabled = !bureau;
  $('exporter-dossier').title = bureau ? '' : "Disponible dans l'application de bureau";
  $('resultat').hidden = false;
  depot.classList.add('compact');
  dire('');
  apercu();
}

function telecharger(nom: string, contenu: BlobPart, type: string): void {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([contenu], { type }));
  a.download = nom;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function enregistrer(nom: string, octets: Uint8Array, type: string, extension: string, libelle: string): Promise<void> {
  if (!bureau) { telecharger(nom, octets as BlobPart, type); dire(`${nom} téléchargé.`); return; }
  const chemin = await save({ defaultPath: nom, filters: [{ name: libelle, extensions: [extension] }] });
  if (!chemin) return;
  await invoke('ecrire_fichier', { chemin, octets: Array.from(octets) });
  dire(`Enregistré : ${chemin}`);
}

async function action(f: () => Promise<void>): Promise<void> {
  try { await f(); } catch (e) { dire(String(e), true); }
}

$('exporter-dossier').addEventListener('click', () => action(async () => {
  const dossier = await open({ directory: true, title: "Dossier d'export du site" });
  if (typeof dossier !== 'string') return;
  const nb = await invoke<number>('ecrire_site', { dossier, fichiers: genererSite(lecture!.verger, options(false)) });
  dire(`${nb} pages écrites dans ${dossier} — ouvrir index.html.`);
}));
$('exporter-unique').addEventListener('click', () => action(() =>
  enregistrer('verger.html', new TextEncoder().encode(genererSite(lecture!.verger, options(true))[0]!.contenu), 'text/html', 'html', 'Page HTML')));
$('exporter-v1').addEventListener('click', () => action(() =>
  enregistrer(`${nomSource.replace(/-v1$/, '')}-v1.xlsx`, ecrireClasseur(lecture!.verger), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'xlsx', 'Classeur Pomone v1')));
$('modele').addEventListener('click', (e) => { e.stopPropagation(); void action(() =>
  enregistrer('modele-pomone-v1.xlsx', classeurModele(), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'xlsx', 'Classeur Pomone v1')); });
optRapport.addEventListener('change', apercu);
optEbauches.addEventListener('change', apercu);
$('opt-logo').addEventListener('change', apercu);

depot.addEventListener('click', () => champFichier.click());
depot.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); champFichier.click(); } });
champFichier.addEventListener('change', () => { const f = champFichier.files?.[0]; if (f) void action(() => charger(f)); champFichier.value = ''; });
for (const ev of ['dragenter', 'dragover'] as const) depot.addEventListener(ev, (e) => { e.preventDefault(); depot.classList.add('survol'); });
for (const ev of ['dragleave', 'drop'] as const) depot.addEventListener(ev, () => depot.classList.remove('survol'));
depot.addEventListener('drop', (e) => { e.preventDefault(); const f = e.dataTransfer?.files[0]; if (f) void action(() => charger(f)); });
// Un fichier lâché à côté de la zone ne doit pas remplacer l'application par son contenu.
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => e.preventDefault());
