/**
 * Essai des pages produites dans un vrai navigateur : interactions, accessibilité (axe-core),
 * impression. Utilise le Chrome installé (CHROME_PATH pour un autre chemin) : npm run test:e2e
 */
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { AxeBuilder } from '@axe-core/playwright';
import { chromium, type Page } from 'playwright-core';
import { genererSite } from '../packages/core/src/index';
import { actifs, arbreAvecFiche, lireExemple } from '../packages/core/test/exemple';

const lecture = lireExemple();
const { verger, rapport } = lecture;
// Identifiants et effectifs tirés du classeur : les essais suivent les évolutions du verger.
const plantes = actifs(lecture);
const cv = new Map(verger.cultivars.map((c) => [c.id, c]));
const { e: arbre, c: variete } = arbreAvecFiche(lecture);
const parEspece = (espece: string) => plantes.filter((e) => cv.get(e.cultivar)?.espece === espece).length;
const especeLaPlusPlantee = [...new Set(verger.cultivars.map((c) => c.espece))].sort((a, b) => parEspece(b) - parEspece(a))[0]!;
const premierDe = (cultivar: string) => plantes.find((e) => e.cultivar === cultivar)!.id;
verger.decorations.push({ id: 'pe1', type: 'point_eau', x: -3, y: 4, largeur: null, hauteur: null, rayon: 1, points: [], libelle: 'Robinet' });
const dossier = mkdtempSync(join(tmpdir(), 'pomone-'));
const ecrire = (sous: string, o: Parameters<typeof genererSite>[1]) => {
  for (const f of genererSite(verger, o)) {
    const chemin = join(dossier, sous, f.chemin);
    mkdirSync(dirname(chemin), { recursive: true });
    writeFileSync(chemin, f.contenu);
  }
};
ecrire('site', { rapport });
ecrire('unique', { unique: true });
const url = (c: string) => { const [f, ancre] = c.split('#'); return pathToFileURL(join(dossier, f!)).href + (ancre ? `#${ancre}` : ''); };

const navigateur = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] } : { channel: 'chrome', args: ['--no-sandbox'] });
const erreurs: string[] = [];
let echecs = 0;

async function etape(nom: string, f: () => Promise<void>): Promise<void> {
  try { await f(); console.log(`ok   ${nom}`); } catch (e) { echecs++; console.error(`ÉCHEC ${nom}\n${(e as Error).message}`); }
}
async function ouvrirPage(chemin: string, largeur = 1200): Promise<Page> {
  const p = await (await navigateur.newContext({ viewport: { width: largeur, height: 900 } })).newPage();
  p.on('pageerror', (e) => erreurs.push(`${chemin} : ${e}`));
  p.on('console', (m) => { if (m.type() === 'error') erreurs.push(`${chemin} : ${m.text()}`); });
  p.on('request', (r) => { if (!r.url().startsWith('file:') && !r.url().startsWith('data:')) erreurs.push(`${chemin} : requête réseau ${r.url()}`); });
  await p.goto(url(chemin));
  return p;
}
async function axe(p: Page, nom: string): Promise<void> {
  const r = await new AxeBuilder({ page: p }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  assert.deepEqual(r.violations.map((v) => `${v.id} (${v.nodes.length}) : ${v.help} — ${v.nodes[0]?.target}`), [], `accessibilité ${nom}`);
}

await etape('plan : fiche au clic, adresse stable, fermeture par Échap', async () => {
  const p = await ouvrirPage('site/index.html');
  await p.click(`[data-fiche="${arbre.id}"]`);
  assert.ok((await p.textContent('#panneau h2') ?? '').includes(variete.cultivar.v));
  assert.ok(p.url().endsWith(`#${arbre.id}`), p.url());
  await p.keyboard.press('Escape');
  assert.equal(await p.isVisible('#panneau'), false);
  assert.doesNotMatch(p.url(), /#/);
});
await etape('plan : parcours au clavier', async () => {
  const p = await ouvrirPage('site/index.html');
  await p.focus(`[data-fiche="${plantes[0]!.id}"]`);
  await p.keyboard.press('Enter');
  assert.equal(await p.isVisible('#panneau'), true);
  assert.equal(await p.evaluate(() => document.activeElement?.className), 'fermer');
  await p.keyboard.press('Escape');
  assert.equal(await p.evaluate(() => document.activeElement?.getAttribute('data-fiche')), plantes[0]!.id, 'le focus revient sur l’arbre');
});
await etape('plan : recherche, filtre par espèce, pollinisateurs', async () => {
  const p = await ouvrirPage('site/index.html');
  await p.fill('#recherche', arbre.id.toLowerCase());
  assert.deepEqual(await p.locator('.plante:not(.estompe)').evaluateAll((l) => l.map((x) => x.getAttribute('data-fiche'))), [arbre.id]);
  await p.fill('#recherche', '');
  await p.selectOption('#filtre-espece', especeLaPlusPlantee);
  assert.equal(await p.locator('.plante:not(.estompe)').count(), parEspece(especeLaPlusPlantee));
  await p.selectOption('#filtre-espece', '');
  // Premier arbre dont la fiche propose des pollinisateurs présents dans le verger.
  const avecPollinisateurs = await p.evaluate(() => [...document.querySelectorAll('template[id^="fiche-"]')]
    .find((t) => (t as HTMLTemplateElement).content.querySelector('button.voir'))?.id.slice('fiche-'.length));
  if (avecPollinisateurs) {
    await p.click(`[data-fiche="${avecPollinisateurs}"]`);
    const voir = (await p.getAttribute('#panneau button.voir', 'data-voir'))!.split(' ');
    await p.click('#panneau button.voir');
    const allumes = await p.locator('.plante:not(.estompe)').evaluateAll((l) => l.map((x) => x.getAttribute('data-cultivar')));
    assert.ok(allumes.length >= 2 && allumes.every((c) => voir.includes(c!)), allumes.join(', '));
  }
});
await etape('liens entre pages en file://', async () => {
  const p = await ouvrirPage(`site/cultivars/${variete.id}.html`);
  await p.click('main ul a');
  await p.waitForSelector('#panneau:not([hidden])');
  assert.ok(p.url().endsWith(`index.html#${premierDe(variete.id)}`), p.url());
  const derniere = verger.allees.at(-1)!;
  await p.goto(url('site/index.html'));
  await p.click(`svg.plan a >> nth=${verger.allees.length - 1}`);
  assert.ok((await p.textContent('h1') ?? '').startsWith(`Allée ${derniere.numero}`));
});
await etape('catalogue : tri par colonne', async () => {
  const p = await ouvrirPage('site/catalogue.html');
  const premier = () => p.locator('tbody tr >> nth=0').locator('td >> nth=1').textContent();
  await p.click('th >> nth=1');
  const a = await premier();
  await p.click('th >> nth=1');
  assert.notEqual(await premier(), a);
});
await etape('fichier unique : fiche par ancre, téléphone', async () => {
  const p = await ouvrirPage(`unique/verger.html#${plantes[2]!.id}`, 390);
  assert.equal(await p.isVisible('#panneau'), true);
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'pas de défilement horizontal de la page');
});
for (const [nom, chemin] of [['plan', 'site/index.html'], ...verger.allees.map((a) => [`allée ${a.numero}`, `site/allees/${a.id}.html`]), ['cultivar', `site/cultivars/${variete.id}.html`],
  ['catalogue', 'site/catalogue.html'], ['rapport', 'site/rapport.html'], ['fichier unique', 'unique/verger.html']] as const)
  await etape(`accessibilité : ${nom}`, async () => axe(await ouvrirPage(chemin), nom));
await etape('accessibilité : fiche ouverte', async () => {
  const p = await ouvrirPage(`site/index.html#${arbre.id}`);
  await axe(p, 'fiche');
});
await etape('impression : le plan tient sur une page A4 paysage', async () => {
  const p = await ouvrirPage('site/index.html');
  await p.emulateMedia({ media: 'print' });
  const pdf = await p.pdf({ preferCSSPageSize: true, printBackground: true });
  if (process.env.POMONE_PDF) writeFileSync(process.env.POMONE_PDF, pdf);
  const boite = await p.locator('svg.plan').boundingBox();
  assert.ok(boite && boite.height <= 720 && boite.width <= 1050, `plan imprimé ${boite?.width}×${boite?.height}`);
});
await etape('aucune erreur ni requête réseau', async () => assert.deepEqual(erreurs, []));

await navigateur.close();
console.log(echecs ? `${echecs} échec(s)` : 'Tous les essais passent.');
process.exit(echecs ? 1 : 0);
